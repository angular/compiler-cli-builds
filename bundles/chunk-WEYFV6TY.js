
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  Context,
  ExpressionTranslatorVisitor
} from "./chunk-L35AQF75.js";
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
} from "./chunk-UTWH365F.js";

// packages/compiler-cli/src/ngtsc/diagnostics/src/error_code.js
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["DECORATOR_ARG_NOT_LITERAL"] = 1001] = "DECORATOR_ARG_NOT_LITERAL";
  ErrorCode2[ErrorCode2["DECORATOR_ARITY_WRONG"] = 1002] = "DECORATOR_ARITY_WRONG";
  ErrorCode2[ErrorCode2["DECORATOR_NOT_CALLED"] = 1003] = "DECORATOR_NOT_CALLED";
  ErrorCode2[ErrorCode2["DECORATOR_UNEXPECTED"] = 1005] = "DECORATOR_UNEXPECTED";
  ErrorCode2[ErrorCode2["DECORATOR_COLLISION"] = 1006] = "DECORATOR_COLLISION";
  ErrorCode2[ErrorCode2["VALUE_HAS_WRONG_TYPE"] = 1010] = "VALUE_HAS_WRONG_TYPE";
  ErrorCode2[ErrorCode2["VALUE_NOT_LITERAL"] = 1011] = "VALUE_NOT_LITERAL";
  ErrorCode2[ErrorCode2["DUPLICATE_DECORATED_PROPERTIES"] = 1012] = "DUPLICATE_DECORATED_PROPERTIES";
  ErrorCode2[ErrorCode2["INITIALIZER_API_WITH_DISALLOWED_DECORATOR"] = 1050] = "INITIALIZER_API_WITH_DISALLOWED_DECORATOR";
  ErrorCode2[ErrorCode2["INITIALIZER_API_DECORATOR_METADATA_COLLISION"] = 1051] = "INITIALIZER_API_DECORATOR_METADATA_COLLISION";
  ErrorCode2[ErrorCode2["INITIALIZER_API_NO_REQUIRED_FUNCTION"] = 1052] = "INITIALIZER_API_NO_REQUIRED_FUNCTION";
  ErrorCode2[ErrorCode2["INITIALIZER_API_DISALLOWED_MEMBER_VISIBILITY"] = 1053] = "INITIALIZER_API_DISALLOWED_MEMBER_VISIBILITY";
  ErrorCode2[ErrorCode2["DUPLICATE_BINDING_NAME"] = 1054] = "DUPLICATE_BINDING_NAME";
  ErrorCode2[ErrorCode2["INCORRECTLY_DECLARED_ON_STATIC_MEMBER"] = 1100] = "INCORRECTLY_DECLARED_ON_STATIC_MEMBER";
  ErrorCode2[ErrorCode2["COMPONENT_MISSING_TEMPLATE"] = 2001] = "COMPONENT_MISSING_TEMPLATE";
  ErrorCode2[ErrorCode2["PIPE_MISSING_NAME"] = 2002] = "PIPE_MISSING_NAME";
  ErrorCode2[ErrorCode2["PARAM_MISSING_TOKEN"] = 2003] = "PARAM_MISSING_TOKEN";
  ErrorCode2[ErrorCode2["DIRECTIVE_MISSING_SELECTOR"] = 2004] = "DIRECTIVE_MISSING_SELECTOR";
  ErrorCode2[ErrorCode2["UNDECORATED_PROVIDER"] = 2005] = "UNDECORATED_PROVIDER";
  ErrorCode2[ErrorCode2["DIRECTIVE_INHERITS_UNDECORATED_CTOR"] = 2006] = "DIRECTIVE_INHERITS_UNDECORATED_CTOR";
  ErrorCode2[ErrorCode2["UNDECORATED_CLASS_USING_ANGULAR_FEATURES"] = 2007] = "UNDECORATED_CLASS_USING_ANGULAR_FEATURES";
  ErrorCode2[ErrorCode2["COMPONENT_RESOURCE_NOT_FOUND"] = 2008] = "COMPONENT_RESOURCE_NOT_FOUND";
  ErrorCode2[ErrorCode2["COMPONENT_INVALID_SHADOW_DOM_SELECTOR"] = 2009] = "COMPONENT_INVALID_SHADOW_DOM_SELECTOR";
  ErrorCode2[ErrorCode2["COMPONENT_NOT_STANDALONE"] = 2010] = "COMPONENT_NOT_STANDALONE";
  ErrorCode2[ErrorCode2["COMPONENT_IMPORT_NOT_STANDALONE"] = 2011] = "COMPONENT_IMPORT_NOT_STANDALONE";
  ErrorCode2[ErrorCode2["COMPONENT_UNKNOWN_IMPORT"] = 2012] = "COMPONENT_UNKNOWN_IMPORT";
  ErrorCode2[ErrorCode2["HOST_DIRECTIVE_INVALID"] = 2013] = "HOST_DIRECTIVE_INVALID";
  ErrorCode2[ErrorCode2["HOST_DIRECTIVE_NOT_STANDALONE"] = 2014] = "HOST_DIRECTIVE_NOT_STANDALONE";
  ErrorCode2[ErrorCode2["HOST_DIRECTIVE_COMPONENT"] = 2015] = "HOST_DIRECTIVE_COMPONENT";
  ErrorCode2[ErrorCode2["INJECTABLE_INHERITS_INVALID_CONSTRUCTOR"] = 2016] = "INJECTABLE_INHERITS_INVALID_CONSTRUCTOR";
  ErrorCode2[ErrorCode2["HOST_DIRECTIVE_UNDEFINED_BINDING"] = 2017] = "HOST_DIRECTIVE_UNDEFINED_BINDING";
  ErrorCode2[ErrorCode2["HOST_DIRECTIVE_CONFLICTING_ALIAS"] = 2018] = "HOST_DIRECTIVE_CONFLICTING_ALIAS";
  ErrorCode2[ErrorCode2["HOST_DIRECTIVE_MISSING_REQUIRED_BINDING"] = 2019] = "HOST_DIRECTIVE_MISSING_REQUIRED_BINDING";
  ErrorCode2[ErrorCode2["CONFLICTING_INPUT_TRANSFORM"] = 2020] = "CONFLICTING_INPUT_TRANSFORM";
  ErrorCode2[ErrorCode2["COMPONENT_INVALID_STYLE_URLS"] = 2021] = "COMPONENT_INVALID_STYLE_URLS";
  ErrorCode2[ErrorCode2["COMPONENT_UNKNOWN_DEFERRED_IMPORT"] = 2022] = "COMPONENT_UNKNOWN_DEFERRED_IMPORT";
  ErrorCode2[ErrorCode2["NON_STANDALONE_NOT_ALLOWED"] = 2023] = "NON_STANDALONE_NOT_ALLOWED";
  ErrorCode2[ErrorCode2["MISSING_NAMED_TEMPLATE_DEPENDENCY"] = 2024] = "MISSING_NAMED_TEMPLATE_DEPENDENCY";
  ErrorCode2[ErrorCode2["INCORRECT_NAMED_TEMPLATE_DEPENDENCY_TYPE"] = 2025] = "INCORRECT_NAMED_TEMPLATE_DEPENDENCY_TYPE";
  ErrorCode2[ErrorCode2["UNSUPPORTED_SELECTORLESS_COMPONENT_FIELD"] = 2026] = "UNSUPPORTED_SELECTORLESS_COMPONENT_FIELD";
  ErrorCode2[ErrorCode2["COMPONENT_ANIMATIONS_CONFLICT"] = 2027] = "COMPONENT_ANIMATIONS_CONFLICT";
  ErrorCode2[ErrorCode2["SYMBOL_NOT_EXPORTED"] = 3001] = "SYMBOL_NOT_EXPORTED";
  ErrorCode2[ErrorCode2["IMPORT_CYCLE_DETECTED"] = 3003] = "IMPORT_CYCLE_DETECTED";
  ErrorCode2[ErrorCode2["IMPORT_GENERATION_FAILURE"] = 3004] = "IMPORT_GENERATION_FAILURE";
  ErrorCode2[ErrorCode2["CONFIG_FLAT_MODULE_NO_INDEX"] = 4001] = "CONFIG_FLAT_MODULE_NO_INDEX";
  ErrorCode2[ErrorCode2["CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK"] = 4002] = "CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK";
  ErrorCode2[ErrorCode2["CONFIG_EXTENDED_DIAGNOSTICS_IMPLIES_STRICT_TEMPLATES"] = 4003] = "CONFIG_EXTENDED_DIAGNOSTICS_IMPLIES_STRICT_TEMPLATES";
  ErrorCode2[ErrorCode2["CONFIG_EXTENDED_DIAGNOSTICS_UNKNOWN_CATEGORY_LABEL"] = 4004] = "CONFIG_EXTENDED_DIAGNOSTICS_UNKNOWN_CATEGORY_LABEL";
  ErrorCode2[ErrorCode2["CONFIG_EXTENDED_DIAGNOSTICS_UNKNOWN_CHECK"] = 4005] = "CONFIG_EXTENDED_DIAGNOSTICS_UNKNOWN_CHECK";
  ErrorCode2[ErrorCode2["CONFIG_EMIT_DECLARATION_ONLY_UNSUPPORTED"] = 4006] = "CONFIG_EMIT_DECLARATION_ONLY_UNSUPPORTED";
  ErrorCode2[ErrorCode2["HOST_BINDING_PARSE_ERROR"] = 5001] = "HOST_BINDING_PARSE_ERROR";
  ErrorCode2[ErrorCode2["TEMPLATE_PARSE_ERROR"] = 5002] = "TEMPLATE_PARSE_ERROR";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_DECLARATION"] = 6001] = "NGMODULE_INVALID_DECLARATION";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_IMPORT"] = 6002] = "NGMODULE_INVALID_IMPORT";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_EXPORT"] = 6003] = "NGMODULE_INVALID_EXPORT";
  ErrorCode2[ErrorCode2["NGMODULE_INVALID_REEXPORT"] = 6004] = "NGMODULE_INVALID_REEXPORT";
  ErrorCode2[ErrorCode2["NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC"] = 6005] = "NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC";
  ErrorCode2[ErrorCode2["NGMODULE_REEXPORT_NAME_COLLISION"] = 6006] = "NGMODULE_REEXPORT_NAME_COLLISION";
  ErrorCode2[ErrorCode2["NGMODULE_DECLARATION_NOT_UNIQUE"] = 6007] = "NGMODULE_DECLARATION_NOT_UNIQUE";
  ErrorCode2[ErrorCode2["NGMODULE_DECLARATION_IS_STANDALONE"] = 6008] = "NGMODULE_DECLARATION_IS_STANDALONE";
  ErrorCode2[ErrorCode2["NGMODULE_BOOTSTRAP_IS_STANDALONE"] = 6009] = "NGMODULE_BOOTSTRAP_IS_STANDALONE";
  ErrorCode2[ErrorCode2["WARN_NGMODULE_ID_UNNECESSARY"] = 6100] = "WARN_NGMODULE_ID_UNNECESSARY";
  ErrorCode2[ErrorCode2["SCHEMA_INVALID_ELEMENT"] = 8001] = "SCHEMA_INVALID_ELEMENT";
  ErrorCode2[ErrorCode2["SCHEMA_INVALID_ATTRIBUTE"] = 8002] = "SCHEMA_INVALID_ATTRIBUTE";
  ErrorCode2[ErrorCode2["MISSING_REFERENCE_TARGET"] = 8003] = "MISSING_REFERENCE_TARGET";
  ErrorCode2[ErrorCode2["MISSING_PIPE"] = 8004] = "MISSING_PIPE";
  ErrorCode2[ErrorCode2["WRITE_TO_READ_ONLY_VARIABLE"] = 8005] = "WRITE_TO_READ_ONLY_VARIABLE";
  ErrorCode2[ErrorCode2["DUPLICATE_VARIABLE_DECLARATION"] = 8006] = "DUPLICATE_VARIABLE_DECLARATION";
  ErrorCode2[ErrorCode2["SPLIT_TWO_WAY_BINDING"] = 8007] = "SPLIT_TWO_WAY_BINDING";
  ErrorCode2[ErrorCode2["MISSING_REQUIRED_INPUTS"] = 8008] = "MISSING_REQUIRED_INPUTS";
  ErrorCode2[ErrorCode2["ILLEGAL_FOR_LOOP_TRACK_ACCESS"] = 8009] = "ILLEGAL_FOR_LOOP_TRACK_ACCESS";
  ErrorCode2[ErrorCode2["INACCESSIBLE_DEFERRED_TRIGGER_ELEMENT"] = 8010] = "INACCESSIBLE_DEFERRED_TRIGGER_ELEMENT";
  ErrorCode2[ErrorCode2["CONTROL_FLOW_PREVENTING_CONTENT_PROJECTION"] = 8011] = "CONTROL_FLOW_PREVENTING_CONTENT_PROJECTION";
  ErrorCode2[ErrorCode2["DEFERRED_PIPE_USED_EAGERLY"] = 8012] = "DEFERRED_PIPE_USED_EAGERLY";
  ErrorCode2[ErrorCode2["DEFERRED_DIRECTIVE_USED_EAGERLY"] = 8013] = "DEFERRED_DIRECTIVE_USED_EAGERLY";
  ErrorCode2[ErrorCode2["DEFERRED_DEPENDENCY_IMPORTED_EAGERLY"] = 8014] = "DEFERRED_DEPENDENCY_IMPORTED_EAGERLY";
  ErrorCode2[ErrorCode2["ILLEGAL_LET_WRITE"] = 8015] = "ILLEGAL_LET_WRITE";
  ErrorCode2[ErrorCode2["LET_USED_BEFORE_DEFINITION"] = 8016] = "LET_USED_BEFORE_DEFINITION";
  ErrorCode2[ErrorCode2["CONFLICTING_LET_DECLARATION"] = 8017] = "CONFLICTING_LET_DECLARATION";
  ErrorCode2[ErrorCode2["UNCLAIMED_DIRECTIVE_BINDING"] = 8018] = "UNCLAIMED_DIRECTIVE_BINDING";
  ErrorCode2[ErrorCode2["DEFER_IMPLICIT_TRIGGER_MISSING_PLACEHOLDER"] = 8019] = "DEFER_IMPLICIT_TRIGGER_MISSING_PLACEHOLDER";
  ErrorCode2[ErrorCode2["DEFER_IMPLICIT_TRIGGER_INVALID_PLACEHOLDER"] = 8020] = "DEFER_IMPLICIT_TRIGGER_INVALID_PLACEHOLDER";
  ErrorCode2[ErrorCode2["DEFER_TRIGGER_MISCONFIGURATION"] = 8021] = "DEFER_TRIGGER_MISCONFIGURATION";
  ErrorCode2[ErrorCode2["FORM_FIELD_UNSUPPORTED_BINDING"] = 8022] = "FORM_FIELD_UNSUPPORTED_BINDING";
  ErrorCode2[ErrorCode2["MULTIPLE_MATCHING_COMPONENTS"] = 8023] = "MULTIPLE_MATCHING_COMPONENTS";
  ErrorCode2[ErrorCode2["CONFLICTING_HOST_DIRECTIVE_BINDING"] = 8024] = "CONFLICTING_HOST_DIRECTIVE_BINDING";
  ErrorCode2[ErrorCode2["INVALID_BANANA_IN_BOX"] = 8101] = "INVALID_BANANA_IN_BOX";
  ErrorCode2[ErrorCode2["NULLISH_COALESCING_NOT_NULLABLE"] = 8102] = "NULLISH_COALESCING_NOT_NULLABLE";
  ErrorCode2[ErrorCode2["MISSING_CONTROL_FLOW_DIRECTIVE"] = 8103] = "MISSING_CONTROL_FLOW_DIRECTIVE";
  ErrorCode2[ErrorCode2["TEXT_ATTRIBUTE_NOT_BINDING"] = 8104] = "TEXT_ATTRIBUTE_NOT_BINDING";
  ErrorCode2[ErrorCode2["MISSING_NGFOROF_LET"] = 8105] = "MISSING_NGFOROF_LET";
  ErrorCode2[ErrorCode2["SUFFIX_NOT_SUPPORTED"] = 8106] = "SUFFIX_NOT_SUPPORTED";
  ErrorCode2[ErrorCode2["OPTIONAL_CHAIN_NOT_NULLABLE"] = 8107] = "OPTIONAL_CHAIN_NOT_NULLABLE";
  ErrorCode2[ErrorCode2["SKIP_HYDRATION_NOT_STATIC"] = 8108] = "SKIP_HYDRATION_NOT_STATIC";
  ErrorCode2[ErrorCode2["INTERPOLATED_SIGNAL_NOT_INVOKED"] = 8109] = "INTERPOLATED_SIGNAL_NOT_INVOKED";
  ErrorCode2[ErrorCode2["UNSUPPORTED_INITIALIZER_API_USAGE"] = 8110] = "UNSUPPORTED_INITIALIZER_API_USAGE";
  ErrorCode2[ErrorCode2["UNINVOKED_FUNCTION_IN_EVENT_BINDING"] = 8111] = "UNINVOKED_FUNCTION_IN_EVENT_BINDING";
  ErrorCode2[ErrorCode2["UNUSED_LET_DECLARATION"] = 8112] = "UNUSED_LET_DECLARATION";
  ErrorCode2[ErrorCode2["UNUSED_STANDALONE_IMPORTS"] = 8113] = "UNUSED_STANDALONE_IMPORTS";
  ErrorCode2[ErrorCode2["UNPARENTHESIZED_NULLISH_COALESCING"] = 8114] = "UNPARENTHESIZED_NULLISH_COALESCING";
  ErrorCode2[ErrorCode2["UNINVOKED_TRACK_FUNCTION"] = 8115] = "UNINVOKED_TRACK_FUNCTION";
  ErrorCode2[ErrorCode2["MISSING_STRUCTURAL_DIRECTIVE"] = 8116] = "MISSING_STRUCTURAL_DIRECTIVE";
  ErrorCode2[ErrorCode2["UNINVOKED_FUNCTION_IN_TEXT_INTERPOLATION"] = 8117] = "UNINVOKED_FUNCTION_IN_TEXT_INTERPOLATION";
  ErrorCode2[ErrorCode2["FORBIDDEN_REQUIRED_INITIALIZER_INVOCATION"] = 8118] = "FORBIDDEN_REQUIRED_INITIALIZER_INVOCATION";
  ErrorCode2[ErrorCode2["INLINE_TCB_REQUIRED"] = 8900] = "INLINE_TCB_REQUIRED";
  ErrorCode2[ErrorCode2["INLINE_TYPE_CTOR_REQUIRED"] = 8901] = "INLINE_TYPE_CTOR_REQUIRED";
  ErrorCode2[ErrorCode2["INJECTABLE_DUPLICATE_PROV"] = 9001] = "INJECTABLE_DUPLICATE_PROV";
  ErrorCode2[ErrorCode2["SUGGEST_STRICT_TEMPLATES"] = 10001] = "SUGGEST_STRICT_TEMPLATES";
  ErrorCode2[ErrorCode2["SUGGEST_SUBOPTIMAL_TYPE_INFERENCE"] = 10002] = "SUGGEST_SUBOPTIMAL_TYPE_INFERENCE";
  ErrorCode2[ErrorCode2["LOCAL_COMPILATION_UNRESOLVED_CONST"] = 11001] = "LOCAL_COMPILATION_UNRESOLVED_CONST";
  ErrorCode2[ErrorCode2["LOCAL_COMPILATION_UNSUPPORTED_EXPRESSION"] = 11003] = "LOCAL_COMPILATION_UNSUPPORTED_EXPRESSION";
})(ErrorCode || (ErrorCode = {}));

// packages/compiler-cli/src/ngtsc/diagnostics/src/util.js
var ERROR_CODE_MATCHER = /(\u001b\[\d+m ?)TS-99(\d+: ?\u001b\[\d+m)/g;
function replaceTsWithNgInErrors(errors) {
  return errors.replace(ERROR_CODE_MATCHER, "$1NG$2");
}
function ngErrorCode(code) {
  return parseInt("-99" + code);
}

// packages/compiler-cli/src/ngtsc/diagnostics/src/error.js
import ts from "typescript";
var FatalDiagnosticError = class extends Error {
  code;
  node;
  diagnosticMessage;
  relatedInformation;
  constructor(code, node, diagnosticMessage, relatedInformation) {
    super(`FatalDiagnosticError: Code: ${code}, Message: ${ts.flattenDiagnosticMessageText(diagnosticMessage, "\n")}`);
    this.code = code;
    this.node = node;
    this.diagnosticMessage = diagnosticMessage;
    this.relatedInformation = relatedInformation;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  /**
   * @internal
   */
  _isFatalDiagnosticError = true;
  toDiagnostic() {
    return makeDiagnostic(this.code, this.node, this.diagnosticMessage, this.relatedInformation);
  }
};
function makeDiagnostic(code, node, messageText, relatedInformation, category = ts.DiagnosticCategory.Error) {
  node = ts.getOriginalNode(node);
  return {
    category,
    code: ngErrorCode(code),
    file: ts.getOriginalNode(node).getSourceFile(),
    start: node.getStart(void 0, false),
    length: node.getWidth(),
    messageText,
    relatedInformation
  };
}
function makeDiagnosticChain(messageText, next) {
  return {
    category: ts.DiagnosticCategory.Message,
    code: 0,
    messageText,
    next
  };
}
function makeRelatedInformation(node, messageText) {
  node = ts.getOriginalNode(node);
  return {
    category: ts.DiagnosticCategory.Message,
    code: 0,
    file: node.getSourceFile(),
    start: node.getStart(),
    length: node.getWidth(),
    messageText
  };
}
function addDiagnosticChain(messageText, add) {
  if (typeof messageText === "string") {
    return makeDiagnosticChain(messageText, add);
  }
  if (messageText.next === void 0) {
    messageText.next = add;
  } else {
    messageText.next.push(...add);
  }
  return messageText;
}
function isFatalDiagnosticError(err) {
  return err._isFatalDiagnosticError === true;
}
function isLocalCompilationDiagnostics(diagnostic) {
  return diagnostic.code === ngErrorCode(ErrorCode.LOCAL_COMPILATION_UNRESOLVED_CONST) || diagnostic.code === ngErrorCode(ErrorCode.LOCAL_COMPILATION_UNSUPPORTED_EXPRESSION);
}

// packages/compiler-cli/src/ngtsc/diagnostics/src/docs.js
var COMPILER_ERRORS_WITH_GUIDES = /* @__PURE__ */ new Set([
  ErrorCode.DECORATOR_ARG_NOT_LITERAL,
  ErrorCode.IMPORT_CYCLE_DETECTED,
  ErrorCode.PARAM_MISSING_TOKEN,
  ErrorCode.SCHEMA_INVALID_ELEMENT,
  ErrorCode.SCHEMA_INVALID_ATTRIBUTE,
  ErrorCode.MISSING_REFERENCE_TARGET,
  ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR,
  ErrorCode.WARN_NGMODULE_ID_UNNECESSARY
]);

// packages/compiler-cli/src/ngtsc/diagnostics/src/error_details_base_url.js
import { VERSION } from "@angular/compiler";
var DOC_PAGE_BASE_URL = (() => {
  const full = VERSION.full;
  const isPreRelease = full.includes("-next") || full.includes("-rc") || full === "22.0.0-next.7+sha-e453848";
  const prefix = isPreRelease ? "next" : `v${VERSION.major}`;
  return `https://${prefix}.angular.dev`;
})();
var ERROR_DETAILS_PAGE_BASE_URL = (() => {
  return `${DOC_PAGE_BASE_URL}/errors`;
})();

// packages/compiler-cli/src/ngtsc/diagnostics/src/extended_template_diagnostic_name.js
var ExtendedTemplateDiagnosticName;
(function(ExtendedTemplateDiagnosticName2) {
  ExtendedTemplateDiagnosticName2["INVALID_BANANA_IN_BOX"] = "invalidBananaInBox";
  ExtendedTemplateDiagnosticName2["NULLISH_COALESCING_NOT_NULLABLE"] = "nullishCoalescingNotNullable";
  ExtendedTemplateDiagnosticName2["OPTIONAL_CHAIN_NOT_NULLABLE"] = "optionalChainNotNullable";
  ExtendedTemplateDiagnosticName2["MISSING_CONTROL_FLOW_DIRECTIVE"] = "missingControlFlowDirective";
  ExtendedTemplateDiagnosticName2["MISSING_STRUCTURAL_DIRECTIVE"] = "missingStructuralDirective";
  ExtendedTemplateDiagnosticName2["TEXT_ATTRIBUTE_NOT_BINDING"] = "textAttributeNotBinding";
  ExtendedTemplateDiagnosticName2["UNINVOKED_FUNCTION_IN_EVENT_BINDING"] = "uninvokedFunctionInEventBinding";
  ExtendedTemplateDiagnosticName2["MISSING_NGFOROF_LET"] = "missingNgForOfLet";
  ExtendedTemplateDiagnosticName2["SUFFIX_NOT_SUPPORTED"] = "suffixNotSupported";
  ExtendedTemplateDiagnosticName2["SKIP_HYDRATION_NOT_STATIC"] = "skipHydrationNotStatic";
  ExtendedTemplateDiagnosticName2["INTERPOLATED_SIGNAL_NOT_INVOKED"] = "interpolatedSignalNotInvoked";
  ExtendedTemplateDiagnosticName2["CONTROL_FLOW_PREVENTING_CONTENT_PROJECTION"] = "controlFlowPreventingContentProjection";
  ExtendedTemplateDiagnosticName2["UNUSED_LET_DECLARATION"] = "unusedLetDeclaration";
  ExtendedTemplateDiagnosticName2["UNINVOKED_TRACK_FUNCTION"] = "uninvokedTrackFunction";
  ExtendedTemplateDiagnosticName2["UNUSED_STANDALONE_IMPORTS"] = "unusedStandaloneImports";
  ExtendedTemplateDiagnosticName2["UNPARENTHESIZED_NULLISH_COALESCING"] = "unparenthesizedNullishCoalescing";
  ExtendedTemplateDiagnosticName2["UNINVOKED_FUNCTION_IN_TEXT_INTERPOLATION"] = "uninvokedFunctionInTextInterpolation";
  ExtendedTemplateDiagnosticName2["DEFER_TRIGGER_MISCONFIGURATION"] = "deferTriggerMisconfiguration";
})(ExtendedTemplateDiagnosticName || (ExtendedTemplateDiagnosticName = {}));

// packages/compiler-cli/src/ngtsc/util/src/typescript.js
import ts2 from "typescript";
var TS = /\.tsx?$/i;
var D_TS = /\.d\.ts$/i;
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
function getTokenAtPosition(sf, pos) {
  return ts2.getTokenAtPosition(sf, pos);
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
  const { line, character } = ts2.getLineAndCharacterOfPosition(sf, node.pos);
  return `[${sf.fileName}: ${ts2.SyntaxKind[node.kind]} @ ${line}:${character}]`;
}
function resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache) {
  if (compilerHost.resolveModuleNames) {
    return compilerHost.resolveModuleNames(
      [moduleName],
      containingFile,
      void 0,
      // reusedNames
      void 0,
      // redirectedReference
      compilerOptions
    )[0];
  } else {
    return ts2.resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache !== null ? moduleResolutionCache : void 0).resolvedModule;
  }
}
function isAssignment(node) {
  return ts2.isBinaryExpression(node) && node.operatorToken.kind === ts2.SyntaxKind.EqualsToken;
}
function toUnredirectedSourceFile(sf) {
  const redirectInfo = sf.redirectInfo;
  if (redirectInfo === void 0) {
    return sf;
  }
  return redirectInfo.unredirected;
}

// packages/compiler-cli/src/ngtsc/imports/src/emitter.js
import { ExternalExpr, ExternalReference, WrappedNodeExpr } from "@angular/compiler";
import ts3 from "typescript";

// packages/compiler-cli/src/ngtsc/imports/src/find_export.js
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
  return foundExportName;
}

// packages/compiler-cli/src/ngtsc/imports/src/emitter.js
var ImportFlags;
(function(ImportFlags2) {
  ImportFlags2[ImportFlags2["None"] = 0] = "None";
  ImportFlags2[ImportFlags2["ForceNewImport"] = 1] = "ForceNewImport";
  ImportFlags2[ImportFlags2["NoAliasing"] = 2] = "NoAliasing";
  ImportFlags2[ImportFlags2["AllowTypeImports"] = 4] = "AllowTypeImports";
  ImportFlags2[ImportFlags2["AllowRelativeDtsImports"] = 8] = "AllowRelativeDtsImports";
  ImportFlags2[ImportFlags2["AllowAmbientReferences"] = 16] = "AllowAmbientReferences";
})(ImportFlags || (ImportFlags = {}));
var ReferenceEmitKind;
(function(ReferenceEmitKind2) {
  ReferenceEmitKind2[ReferenceEmitKind2["Success"] = 0] = "Success";
  ReferenceEmitKind2[ReferenceEmitKind2["Failed"] = 1] = "Failed";
})(ReferenceEmitKind || (ReferenceEmitKind = {}));
function assertSuccessfulReferenceEmit(result, origin, typeKind) {
  if (result.kind === ReferenceEmitKind.Success) {
    return;
  }
  const message = makeDiagnosticChain(`Unable to import ${typeKind} ${nodeNameForError(result.ref.node)}.`, [makeDiagnosticChain(result.reason)]);
  throw new FatalDiagnosticError(ErrorCode.IMPORT_GENERATION_FAILURE, origin, message, [
    makeRelatedInformation(result.ref.node, `The ${typeKind} is declared here.`)
  ]);
}
var ReferenceEmitter = class {
  strategies;
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
    return {
      kind: ReferenceEmitKind.Failed,
      ref,
      context,
      reason: `Unable to write a reference to ${nodeNameForError(ref.node)}.`
    };
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
        kind: ReferenceEmitKind.Success,
        expression: new WrappedNodeExpr(ref.node),
        importedFile: null
      };
    }
    if (ref.isAmbient && importFlags & ImportFlags.AllowAmbientReferences) {
      const identifier2 = identifierOfNode(ref.node);
      if (identifier2 !== null) {
        return {
          kind: ReferenceEmitKind.Success,
          expression: new WrappedNodeExpr(identifier2),
          importedFile: null
        };
      } else {
        return null;
      }
    }
    const identifier = ref.getIdentityIn(context);
    if (identifier !== null) {
      return {
        kind: ReferenceEmitKind.Success,
        expression: new WrappedNodeExpr(identifier),
        importedFile: null
      };
    } else {
      return null;
    }
  }
};
var AbsoluteModuleStrategy = class {
  program;
  checker;
  moduleResolver;
  reflectionHost;
  /**
   * A cache of the exports of specific modules, because resolving a module to its exports is a
   * costly operation.
   */
  moduleExportsCache = /* @__PURE__ */ new Map();
  constructor(program, checker, moduleResolver, reflectionHost) {
    this.program = program;
    this.checker = checker;
    this.moduleResolver = moduleResolver;
    this.reflectionHost = reflectionHost;
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
    if (exports.module === null) {
      return {
        kind: ReferenceEmitKind.Failed,
        ref,
        context,
        reason: `The module '${specifier}' could not be found.`
      };
    } else if (exports.exportMap === null || !exports.exportMap.has(ref.node)) {
      return {
        kind: ReferenceEmitKind.Failed,
        ref,
        context,
        reason: `The symbol is not exported from ${exports.module.fileName} (module '${specifier}').`
      };
    }
    const symbolName = exports.exportMap.get(ref.node);
    return {
      kind: ReferenceEmitKind.Success,
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
      return { module: null, exportMap: null };
    }
    const exports = this.reflectionHost.getExportsOfModule(entryPointFile);
    if (exports === null) {
      return { module: entryPointFile, exportMap: null };
    }
    const exportMap = /* @__PURE__ */ new Map();
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
  reflector;
  logicalFs;
  relativePathStrategy;
  constructor(reflector, logicalFs) {
    this.reflector = reflector;
    this.logicalFs = logicalFs;
    this.relativePathStrategy = new RelativePathStrategy(this.reflector);
  }
  emit(ref, context, importFlags) {
    const destSf = getSourceFile(ref.node);
    const destPath = this.logicalFs.logicalPathOfSf(destSf);
    if (destPath === null) {
      if (destSf.isDeclarationFile && importFlags & ImportFlags.AllowRelativeDtsImports) {
        return this.relativePathStrategy.emit(ref, context);
      }
      return {
        kind: ReferenceEmitKind.Failed,
        ref,
        context,
        reason: `The file ${destSf.fileName} is outside of the configured 'rootDir'.`
      };
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
      return {
        kind: ReferenceEmitKind.Failed,
        ref,
        context,
        reason: `The symbol is not exported from ${destSf.fileName}.`
      };
    }
    const moduleName = LogicalProjectPath.relativePathBetween(originPath, destPath);
    return {
      kind: ReferenceEmitKind.Success,
      expression: new ExternalExpr({ moduleName, name }),
      importedFile: destSf
    };
  }
};
var RelativePathStrategy = class {
  reflector;
  constructor(reflector) {
    this.reflector = reflector;
  }
  emit(ref, context) {
    const destSf = getSourceFile(ref.node);
    const relativePath = relative(dirname(absoluteFromSourceFile(context)), absoluteFromSourceFile(destSf));
    const moduleName = toRelativeImport(stripExtension(relativePath));
    const name = findExportedNameOfNode(ref.node, destSf, this.reflector);
    if (name === null) {
      return {
        kind: ReferenceEmitKind.Failed,
        ref,
        context,
        reason: `The symbol is not exported from ${destSf.fileName}.`
      };
    }
    return {
      kind: ReferenceEmitKind.Success,
      expression: new ExternalExpr({ moduleName, name }),
      importedFile: destSf
    };
  }
};
var UnifiedModulesStrategy = class {
  reflector;
  unifiedModulesHost;
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
      kind: ReferenceEmitKind.Success,
      expression: new ExternalExpr({ moduleName, name }),
      importedFile: destSf
    };
  }
};

// packages/compiler-cli/src/ngtsc/reflection/src/typescript.js
import ts7 from "typescript";

// packages/compiler-cli/src/ngtsc/reflection/src/host.js
import ts4 from "typescript";
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
var ClassMemberAccessLevel;
(function(ClassMemberAccessLevel2) {
  ClassMemberAccessLevel2[ClassMemberAccessLevel2["PublicWritable"] = 0] = "PublicWritable";
  ClassMemberAccessLevel2[ClassMemberAccessLevel2["PublicReadonly"] = 1] = "PublicReadonly";
  ClassMemberAccessLevel2[ClassMemberAccessLevel2["Protected"] = 2] = "Protected";
  ClassMemberAccessLevel2[ClassMemberAccessLevel2["Private"] = 3] = "Private";
  ClassMemberAccessLevel2[ClassMemberAccessLevel2["EcmaScriptPrivate"] = 4] = "EcmaScriptPrivate";
})(ClassMemberAccessLevel || (ClassMemberAccessLevel = {}));
var AmbientImport = {};

// packages/compiler-cli/src/ngtsc/reflection/src/type_to_value.js
import ts5 from "typescript";
function typeToValue(typeNode, checker, isLocalCompilation) {
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
    if (!isLocalCompilation || typeOnlyDecl && [
      ts5.SyntaxKind.TypeParameter,
      ts5.SyntaxKind.TypeAliasDeclaration,
      ts5.SyntaxKind.InterfaceDeclaration
    ].includes(typeOnlyDecl.kind)) {
      return noValueDeclaration(typeNode, typeOnlyDecl);
    }
  }
  const firstDecl = local.declarations && local.declarations[0];
  if (firstDecl !== void 0) {
    if (ts5.isImportClause(firstDecl) && firstDecl.name !== void 0) {
      if (firstDecl.phaseModifier === ts5.SyntaxKind.TypeKeyword) {
        return typeOnlyImport(typeNode, firstDecl);
      }
      if (!ts5.isImportDeclaration(firstDecl.parent)) {
        return unsupportedType(typeNode);
      }
      return {
        kind: 0,
        expression: firstDecl.name,
        defaultImportStatement: firstDecl.parent
      };
    } else if (ts5.isImportSpecifier(firstDecl)) {
      if (firstDecl.isTypeOnly) {
        return typeOnlyImport(typeNode, firstDecl);
      }
      if (firstDecl.parent.parent.phaseModifier === ts5.SyntaxKind.TypeKeyword) {
        return typeOnlyImport(typeNode, firstDecl.parent.parent);
      }
      const importedName = (firstDecl.propertyName || firstDecl.name).text;
      const [_localName, ...nestedPath] = symbols.symbolNames;
      const importDeclaration = firstDecl.parent.parent.parent;
      if (!ts5.isImportDeclaration(importDeclaration)) {
        return unsupportedType(typeNode);
      }
      const moduleName = extractModuleName(importDeclaration);
      return {
        kind: 1,
        valueDeclaration: decl.valueDeclaration ?? null,
        moduleName,
        importedName,
        nestedPath
      };
    } else if (ts5.isNamespaceImport(firstDecl)) {
      if (firstDecl.parent.phaseModifier === ts5.SyntaxKind.TypeKeyword) {
        return typeOnlyImport(typeNode, firstDecl.parent);
      }
      if (symbols.symbolNames.length === 1) {
        return namespaceImport(typeNode, firstDecl.parent);
      }
      const [_ns, importedName, ...nestedPath] = symbols.symbolNames;
      const importDeclaration = firstDecl.parent.parent;
      if (!ts5.isImportDeclaration(importDeclaration)) {
        return unsupportedType(typeNode);
      }
      const moduleName = extractModuleName(importDeclaration);
      return {
        kind: 1,
        valueDeclaration: decl.valueDeclaration ?? null,
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
function typeOnlyImport(typeNode, node) {
  return {
    kind: 2,
    reason: { kind: 2, typeNode, node }
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
    reason: {
      kind: 0
      /* ValueUnavailableKind.MISSING_TYPE */
    }
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
    return left !== null ? ts5.factory.createPropertyAccessExpression(left, node.right) : null;
  } else if (ts5.isIdentifier(node)) {
    const clone = ts5.setOriginalNode(ts5.factory.createIdentifier(node.text), node);
    clone.parent = node.parent;
    return clone;
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

// packages/compiler-cli/src/ngtsc/reflection/src/util.js
import ts6 from "typescript";
function isNamedClassDeclaration(node) {
  return ts6.isClassDeclaration(node) && isIdentifier(node.name);
}
function isIdentifier(node) {
  return node !== void 0 && ts6.isIdentifier(node);
}
function classMemberAccessLevelToString(level) {
  switch (level) {
    case ClassMemberAccessLevel.EcmaScriptPrivate:
      return "ES private";
    case ClassMemberAccessLevel.Private:
      return "private";
    case ClassMemberAccessLevel.Protected:
      return "protected";
    case ClassMemberAccessLevel.PublicReadonly:
      return "public readonly";
    case ClassMemberAccessLevel.PublicWritable:
    default:
      return "public";
  }
}

// packages/compiler-cli/src/ngtsc/reflection/src/typescript.js
var TypeScriptReflectionHost = class {
  checker;
  isLocalCompilation;
  skipPrivateValueDeclarationTypes;
  /**
   * @param skipPrivateValueDeclarationTypes Avoids using a value declaration that is considered private (using a ɵ-prefix),
   * instead using the first available declaration. This is needed for the {@link FormControl} API of
   * which the type declaration documents the type and the value declaration corresponds with an implementation detail.
   */
  constructor(checker, isLocalCompilation = false, skipPrivateValueDeclarationTypes = false) {
    this.checker = checker;
    this.isLocalCompilation = isLocalCompilation;
    this.skipPrivateValueDeclarationTypes = skipPrivateValueDeclarationTypes;
  }
  getDecoratorsOfDeclaration(declaration) {
    const decorators = ts7.canHaveDecorators(declaration) ? ts7.getDecorators(declaration) : void 0;
    return decorators !== void 0 && decorators.length ? decorators.map((decorator) => this._reflectDecorator(decorator)).filter((dec) => dec !== null) : null;
  }
  getMembersOfClass(clazz) {
    const tsClazz = castDeclarationToClassOrDie(clazz);
    return tsClazz.members.map((member) => {
      const result = reflectClassMember(member);
      if (result === null) {
        return null;
      }
      return {
        ...result,
        decorators: this.getDecoratorsOfDeclaration(member)
      };
    }).filter((member) => member !== null);
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
      const typeValueReference = typeToValue(typeNode, this.checker, this.isLocalCompilation);
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
    const map = /* @__PURE__ */ new Map();
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
    if (!ts7.isFunctionDeclaration(node) && !ts7.isMethodDeclaration(node) && !ts7.isFunctionExpression(node) && !ts7.isArrowFunction(node)) {
      return null;
    }
    let body = null;
    if (node.body !== void 0) {
      body = ts7.isBlock(node.body) ? Array.from(node.body.statements) : [ts7.factory.createReturnStatement(node.body)];
    }
    const type = this.checker.getTypeAtLocation(node);
    const signatures = this.checker.getSignaturesOfType(type, ts7.SignatureKind.Call);
    return {
      node,
      body,
      signatureCount: signatures.length,
      typeParameters: node.typeParameters === void 0 ? null : Array.from(node.typeParameters),
      parameters: node.parameters.map((param) => {
        const name = parameterName(param.name);
        const initializer = param.initializer || null;
        return { name, node: param, initializer, type: param.type || null };
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
  isStaticallyExported(decl) {
    let topLevel = decl;
    if (ts7.isVariableDeclaration(decl) && ts7.isVariableDeclarationList(decl.parent)) {
      topLevel = decl.parent.parent;
    }
    const modifiers = ts7.canHaveModifiers(topLevel) ? ts7.getModifiers(topLevel) : void 0;
    if (modifiers !== void 0 && modifiers.some((modifier) => modifier.kind === ts7.SyntaxKind.ExportKeyword)) {
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
    return {
      from: importDecl.moduleSpecifier.text,
      name: getExportedName(decl, id),
      node: importDecl
    };
  }
  /**
   * Try to get the import info for this identifier as though it is a namespaced import.
   *
   * For example, if the identifier is the `Directive` part of a qualified type chain like:
   *
   * ```ts
   * core.Directive
   * ```
   *
   * then it might be that `core` is a namespace import such as:
   *
   * ```ts
   * import * as core from 'tslib';
   * ```
   *
   * @param id the TypeScript identifier to find the import info for.
   * @returns The import info if this is a namespaced import or `null`.
   */
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
    if (!ts7.isImportDeclaration(importDeclaration) || !ts7.isStringLiteral(importDeclaration.moduleSpecifier)) {
      return null;
    }
    return {
      from: importDeclaration.moduleSpecifier.text,
      name: id.text,
      node: importDeclaration
    };
  }
  /**
   * Resolve a `ts.Symbol` to its declaration, keeping track of the `viaModule` along the way.
   */
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
    while (symbol.flags & ts7.SymbolFlags.Alias) {
      symbol = this.checker.getAliasedSymbol(symbol);
    }
    if (symbol.valueDeclaration !== void 0 && (!this.skipPrivateValueDeclarationTypes || !isPrivateSymbol(this.checker, symbol))) {
      return {
        node: symbol.valueDeclaration,
        viaModule: this._viaModule(symbol.valueDeclaration, originalId, importInfo)
      };
    } else if (symbol.declarations !== void 0 && symbol.declarations.length > 0) {
      return {
        node: symbol.declarations[0],
        viaModule: this._viaModule(symbol.declarations[0], originalId, importInfo)
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
  /**
   * Get the set of declarations declared in `file` which are exported.
   */
  getLocalExportedDeclarationsOfSourceFile(file) {
    const cacheSf = file;
    if (cacheSf[LocalExportedDeclarations] !== void 0) {
      return cacheSf[LocalExportedDeclarations];
    }
    const exportSet = /* @__PURE__ */ new Set();
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
  _viaModule(declaration, originalId, importInfo) {
    if (importInfo === null && originalId !== null && declaration.getSourceFile() !== originalId.getSourceFile()) {
      return AmbientImport;
    }
    return importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith(".") ? importInfo.from : null;
  }
};
var TypeEntityToDeclarationError = class extends Error {
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
function reflectTypeEntityToDeclaration(type, checker) {
  let realSymbol = checker.getSymbolAtLocation(type);
  if (realSymbol === void 0) {
    throw new TypeEntityToDeclarationError(`Cannot resolve type entity ${type.getText()} to symbol`);
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
    throw new TypeEntityToDeclarationError(`Cannot resolve type entity symbol to declaration`);
  }
  if (ts7.isQualifiedName(type)) {
    if (!ts7.isIdentifier(type.left)) {
      throw new TypeEntityToDeclarationError(`Cannot handle qualified name with non-identifier lhs`);
    }
    const symbol = checker.getSymbolAtLocation(type.left);
    if (symbol === void 0 || symbol.declarations === void 0 || symbol.declarations.length !== 1) {
      throw new TypeEntityToDeclarationError(`Cannot resolve qualified type entity lhs to symbol`);
    }
    const decl = symbol.declarations[0];
    if (ts7.isNamespaceImport(decl)) {
      const clause = decl.parent;
      const importDecl = clause.parent;
      if (!ts7.isStringLiteral(importDecl.moduleSpecifier)) {
        throw new TypeEntityToDeclarationError(`Module specifier is not a string`);
      }
      return { node, from: importDecl.moduleSpecifier.text };
    } else if (ts7.isModuleDeclaration(decl)) {
      return { node, from: null };
    } else {
      throw new TypeEntityToDeclarationError(`Unknown import type?`);
    }
  } else {
    return { node, from: null };
  }
}
function filterToMembersWithDecorator(members, name, module) {
  return members.filter((member) => !member.isStatic).map((member) => {
    if (member.decorators === null) {
      return null;
    }
    const decorators = member.decorators.filter((dec) => {
      if (dec.import !== null) {
        return dec.import.name === name && (module === void 0 || dec.import.from === module);
      } else {
        return dec.name === name && module === void 0;
      }
    });
    if (decorators.length === 0) {
      return null;
    }
    return { member, decorators };
  }).filter((value) => value !== null);
}
function extractModifiersOfMember(node) {
  const modifiers = ts7.getModifiers(node);
  let isStatic = false;
  let isReadonly = false;
  let accessLevel = ClassMemberAccessLevel.PublicWritable;
  if (modifiers !== void 0) {
    for (const modifier of modifiers) {
      switch (modifier.kind) {
        case ts7.SyntaxKind.StaticKeyword:
          isStatic = true;
          break;
        case ts7.SyntaxKind.PrivateKeyword:
          accessLevel = ClassMemberAccessLevel.Private;
          break;
        case ts7.SyntaxKind.ProtectedKeyword:
          accessLevel = ClassMemberAccessLevel.Protected;
          break;
        case ts7.SyntaxKind.ReadonlyKeyword:
          isReadonly = true;
          break;
      }
    }
  }
  if (isReadonly && accessLevel === ClassMemberAccessLevel.PublicWritable) {
    accessLevel = ClassMemberAccessLevel.PublicReadonly;
  }
  if (node.name !== void 0 && ts7.isPrivateIdentifier(node.name)) {
    accessLevel = ClassMemberAccessLevel.EcmaScriptPrivate;
  }
  return { accessLevel, isStatic };
}
function reflectClassMember(node) {
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
  } else if (ts7.isPrivateIdentifier(node.name)) {
    name = node.name.text;
    nameNode = node.name;
  } else {
    return null;
  }
  const { accessLevel, isStatic } = extractModifiersOfMember(node);
  return {
    node,
    implementation: node,
    kind,
    type: node.type || null,
    accessLevel,
    name,
    nameNode,
    value,
    isStatic
  };
}
function reflectObjectLiteral(node) {
  const map = /* @__PURE__ */ new Map();
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
function isPrivateSymbol(typeChecker, symbol) {
  if (symbol.valueDeclaration !== void 0) {
    const symbolType = typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    return symbolType?.symbol?.name.startsWith("\u0275") === true;
  }
  return false;
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
  let parent = node.parent;
  while (parent && !ts7.isSourceFile(parent)) {
    if (ts7.isImportDeclaration(parent)) {
      return parent;
    }
    parent = parent.parent;
  }
  return null;
}
function getExportedName(decl, originalId) {
  return ts7.isImportSpecifier(decl) ? (decl.propertyName !== void 0 ? decl.propertyName : decl.name).text : originalId.text;
}
var LocalExportedDeclarations = Symbol("LocalExportedDeclarations");

// packages/compiler-cli/src/ngtsc/imports/src/imported_symbols_tracker.js
import ts8 from "typescript";
var ImportedSymbolsTracker = class {
  fileToNamedImports = /* @__PURE__ */ new WeakMap();
  fileToNamespaceImports = /* @__PURE__ */ new WeakMap();
  /**
   * Checks if an identifier is a potential reference to a specific named import within the same
   * file.
   * @param node Identifier to be checked.
   * @param exportedName Name of the exported symbol that is being searched for.
   * @param moduleName Module from which the symbol should be imported.
   */
  isPotentialReferenceToNamedImport(node, exportedName, moduleName) {
    const sourceFile = node.getSourceFile();
    this.scanImports(sourceFile);
    const fileImports = this.fileToNamedImports.get(sourceFile);
    const moduleImports = fileImports.get(moduleName);
    const symbolImports = moduleImports?.get(exportedName);
    return symbolImports !== void 0 && symbolImports.has(node.text);
  }
  /**
   * Checks if an identifier is a potential reference to a specific namespace import within the same
   * file.
   * @param node Identifier to be checked.
   * @param moduleName Module from which the namespace is imported.
   */
  isPotentialReferenceToNamespaceImport(node, moduleName) {
    const sourceFile = node.getSourceFile();
    this.scanImports(sourceFile);
    const namespaces = this.fileToNamespaceImports.get(sourceFile);
    return namespaces.get(moduleName)?.has(node.text) ?? false;
  }
  /**
   * Checks if a file has a named imported of a certain symbol.
   * @param sourceFile File to be checked.
   * @param exportedName Name of the exported symbol that is being checked.
   * @param moduleName Module that exports the symbol.
   */
  hasNamedImport(sourceFile, exportedName, moduleName) {
    this.scanImports(sourceFile);
    const fileImports = this.fileToNamedImports.get(sourceFile);
    const moduleImports = fileImports.get(moduleName);
    return moduleImports !== void 0 && moduleImports.has(exportedName);
  }
  /**
   * Checks if a file has namespace imports of a certain symbol.
   * @param sourceFile File to be checked.
   * @param moduleName Module whose namespace import is being searched for.
   */
  hasNamespaceImport(sourceFile, moduleName) {
    this.scanImports(sourceFile);
    const namespaces = this.fileToNamespaceImports.get(sourceFile);
    return namespaces.has(moduleName);
  }
  /** Scans a `SourceFile` for import statements and caches them for later use. */
  scanImports(sourceFile) {
    if (this.fileToNamedImports.has(sourceFile) && this.fileToNamespaceImports.has(sourceFile)) {
      return;
    }
    const namedImports = /* @__PURE__ */ new Map();
    const namespaceImports = /* @__PURE__ */ new Map();
    this.fileToNamedImports.set(sourceFile, namedImports);
    this.fileToNamespaceImports.set(sourceFile, namespaceImports);
    for (const stmt of sourceFile.statements) {
      if (!ts8.isImportDeclaration(stmt) || !ts8.isStringLiteralLike(stmt.moduleSpecifier) || stmt.importClause?.namedBindings === void 0) {
        continue;
      }
      const moduleName = stmt.moduleSpecifier.text;
      if (ts8.isNamespaceImport(stmt.importClause.namedBindings)) {
        if (!namespaceImports.has(moduleName)) {
          namespaceImports.set(moduleName, /* @__PURE__ */ new Set());
        }
        namespaceImports.get(moduleName).add(stmt.importClause.namedBindings.name.text);
      } else {
        for (const element of stmt.importClause.namedBindings.elements) {
          const localName = element.name.text;
          const exportedName = element.propertyName === void 0 ? localName : element.propertyName.text;
          if (!namedImports.has(moduleName)) {
            namedImports.set(moduleName, /* @__PURE__ */ new Map());
          }
          const localNames = namedImports.get(moduleName);
          if (!localNames.has(exportedName)) {
            localNames.set(exportedName, /* @__PURE__ */ new Set());
          }
          localNames.get(exportedName)?.add(localName);
        }
      }
    }
  }
};

// packages/compiler-cli/src/ngtsc/imports/src/references.js
var Reference = class _Reference {
  node;
  /**
   * The compiler's best guess at an absolute module specifier which owns this `Reference`.
   *
   * This is usually determined by tracking the import statements which led the compiler to a given
   * node. If any of these imports are absolute, it's an indication that the node being imported
   * might come from that module.
   *
   * It is not _guaranteed_ that the node in question is exported from its `bestGuessOwningModule` -
   * that is mostly a convention that applies in certain package formats.
   *
   * If `bestGuessOwningModule` is `null`, then it's likely the node came from the current program.
   */
  bestGuessOwningModule;
  identifiers = [];
  /**
   * Indicates that the Reference was created synthetically, not as a result of natural value
   * resolution.
   *
   * This is used to avoid misinterpreting the Reference in certain contexts.
   */
  synthetic = false;
  _alias = null;
  isAmbient;
  key;
  constructor(node, bestGuessOwningModule = null) {
    this.node = node;
    if (bestGuessOwningModule === AmbientImport) {
      this.isAmbient = true;
      this.bestGuessOwningModule = null;
    } else {
      this.isAmbient = false;
      this.bestGuessOwningModule = bestGuessOwningModule;
    }
    const id = identifierOfNode(node);
    const sourceFile = getSourceFile(node);
    if (id !== null) {
      this.identifiers.push(id);
    }
    if (sourceFile) {
      this.key = `${sourceFile.fileName}#${node.getStart()}`;
    } else {
      const position = id && id.getSourceFile() ? id.getStart() : null;
      this.key = `${this.bestGuessOwningModule?.specifier}#${id?.text}#${position}`;
    }
  }
  /**
   * The best guess at which module specifier owns this particular reference, or `null` if there
   * isn't one.
   */
  get ownedByModuleGuess() {
    if (this.bestGuessOwningModule !== null) {
      return this.bestGuessOwningModule.specifier;
    } else {
      return null;
    }
  }
  /**
   * Whether this reference has a potential owning module or not.
   *
   * See `bestGuessOwningModule`.
   */
  get hasOwningModuleGuess() {
    return this.bestGuessOwningModule !== null;
  }
  /**
   * A name for the node, if one is available.
   *
   * This is only suited for debugging. Any actual references to this node should be made with
   * `ts.Identifier`s (see `getIdentityIn`).
   */
  get debugName() {
    const id = identifierOfNode(this.node);
    return id !== null ? id.text : null;
  }
  get alias() {
    return this._alias;
  }
  /**
   * Record a `ts.Identifier` by which it's valid to refer to this node, within the context of this
   * `Reference`.
   */
  addIdentifier(identifier) {
    this.identifiers.push(identifier);
  }
  /**
   * Get a `ts.Identifier` within this `Reference` that can be used to refer within the context of a
   * given `ts.SourceFile`, if any.
   */
  getIdentityIn(context) {
    return this.identifiers.find((id) => id.getSourceFile() === context) || null;
  }
  /**
   * Get a `ts.Identifier` for this `Reference` that exists within the given expression.
   *
   * This is very useful for producing `ts.Diagnostic`s that reference `Reference`s that were
   * extracted from some larger expression, as it can be used to pinpoint the `ts.Identifier` within
   * the expression from which the `Reference` originated.
   */
  getIdentityInExpression(expr) {
    const sf = expr.getSourceFile();
    return this.identifiers.find((id) => {
      if (id.getSourceFile() !== sf) {
        return false;
      }
      return id.pos >= expr.pos && id.end <= expr.end;
    }) || null;
  }
  /**
   * Given the 'container' expression from which this `Reference` was extracted, produce a
   * `ts.Expression` to use in a diagnostic which best indicates the position within the container
   * expression that generated the `Reference`.
   *
   * For example, given a `Reference` to the class 'Bar' and the containing expression:
   * `[Foo, Bar, Baz]`, this function would attempt to return the `ts.Identifier` for `Bar` within
   * the array. This could be used to produce a nice diagnostic context:
   *
   * ```text
   * [Foo, Bar, Baz]
   *       ~~~
   * ```
   *
   * If no specific node can be found, then the `fallback` expression is used, which defaults to the
   * entire containing expression.
   */
  getOriginForDiagnostics(container, fallback = container) {
    const id = this.getIdentityInExpression(container);
    return id !== null ? id : fallback;
  }
  cloneWithAlias(alias) {
    const ref = new _Reference(this.node, this.isAmbient ? AmbientImport : this.bestGuessOwningModule);
    ref.identifiers = [...this.identifiers];
    ref._alias = alias;
    return ref;
  }
  cloneWithNoIdentifiers() {
    const ref = new _Reference(this.node, this.isAmbient ? AmbientImport : this.bestGuessOwningModule);
    ref._alias = this._alias;
    ref.identifiers = [];
    return ref;
  }
};

// packages/compiler-cli/src/ngtsc/imports/src/alias.js
import { ExternalExpr as ExternalExpr2 } from "@angular/compiler";
var CHARS_TO_ESCAPE = /[^a-zA-Z0-9/_]/g;
var UnifiedModulesAliasingHost = class {
  unifiedModulesHost;
  constructor(unifiedModulesHost) {
    this.unifiedModulesHost = unifiedModulesHost;
  }
  /**
   * With a `UnifiedModulesHost`, aliases are chosen automatically without the need to look through
   * the exports present in a .d.ts file, so we can avoid cluttering the .d.ts files.
   */
  aliasExportsInDts = false;
  maybeAliasSymbolAs(ref, context, ngModuleName, isReExport) {
    if (!isReExport) {
      return null;
    }
    return this.aliasName(ref.node, context);
  }
  /**
   * Generates an `Expression` to import `decl` from `via`, assuming an export was added when `via`
   * was compiled per `maybeAliasSymbolAs` above.
   */
  getAliasIn(decl, via, isReExport) {
    if (!isReExport) {
      return null;
    }
    const moduleName = this.unifiedModulesHost.fileNameToModuleName(via.fileName, via.fileName);
    return new ExternalExpr2({ moduleName, name: this.aliasName(decl, via) });
  }
  /**
   * Generates an alias name based on the full module name of the file which declares the aliased
   * directive/pipe.
   */
  aliasName(decl, context) {
    const declModule = this.unifiedModulesHost.fileNameToModuleName(decl.getSourceFile().fileName, context.fileName);
    const replaced = declModule.replace(CHARS_TO_ESCAPE, "_").replace(/\//g, "$");
    return "\u0275ng$" + replaced + "$$" + decl.name.text;
  }
};
var PrivateExportAliasingHost = class {
  host;
  constructor(host) {
    this.host = host;
  }
  /**
   * Under private export aliasing, the `AbsoluteModuleStrategy` used for emitting references will
   * will select aliased exports that it finds in the .d.ts file for an NgModule's file. Thus,
   * emitting these exports in .d.ts is a requirement for the `PrivateExportAliasingHost` to
   * function correctly.
   */
  aliasExportsInDts = true;
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
  /**
   * A `PrivateExportAliasingHost` only generates re-exports and does not direct the compiler to
   * directly consume the aliases it creates.
   *
   * Instead, they're consumed indirectly: `AbsoluteModuleStrategy` `ReferenceEmitterStrategy` will
   * select these alias exports automatically when looking for an export of the directive/pipe from
   * the same path as the NgModule was imported.
   *
   * Thus, `getAliasIn` always returns `null`.
   */
  getAliasIn() {
    return null;
  }
};
var AliasStrategy = class {
  emit(ref, context, importMode) {
    if (importMode & ImportFlags.NoAliasing || ref.alias === null) {
      return null;
    }
    return {
      kind: ReferenceEmitKind.Success,
      expression: ref.alias,
      importedFile: "unknown"
    };
  }
};

// packages/compiler-cli/src/ngtsc/util/src/path.js
function relativePathBetween(from, to) {
  const relativePath = stripExtension(relative(dirname(resolve(from)), resolve(to)));
  return relativePath !== "" ? toRelativeImport(relativePath) : null;
}
function normalizeSeparators(path) {
  return path.replace(/\\/g, "/");
}
function getProjectRelativePath(fileName, rootDirs, compilerHost) {
  const filePath = compilerHost.getCanonicalFileName(fileName);
  for (const rootDir of rootDirs) {
    const rel = relative(compilerHost.getCanonicalFileName(rootDir), filePath);
    if (!rel.startsWith("..")) {
      return rel;
    }
  }
  return null;
}

// packages/compiler-cli/src/ngtsc/imports/src/core.js
var NoopImportRewriter = class {
  rewriteSymbol(symbol, specifier) {
    return symbol;
  }
  rewriteSpecifier(specifier, inContextOfFile) {
    return specifier;
  }
  rewriteNamespaceImportIdentifier(specifier) {
    return specifier;
  }
};
var CORE_SUPPORTED_SYMBOLS = /* @__PURE__ */ new Map([
  ["\u0275\u0275defineInjectable", "\u0275\u0275defineInjectable"],
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
var R3SymbolsImportRewriter = class {
  r3SymbolsPath;
  constructor(r3SymbolsPath) {
    this.r3SymbolsPath = r3SymbolsPath;
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
  rewriteNamespaceImportIdentifier(specifier) {
    return specifier;
  }
};
function validateAndRewriteCoreSymbol(name) {
  if (!CORE_SUPPORTED_SYMBOLS.has(name)) {
    throw new Error(`Importing unexpected symbol ${name} while compiling ${CORE_MODULE}`);
  }
  return CORE_SUPPORTED_SYMBOLS.get(name);
}

// packages/compiler-cli/src/ngtsc/imports/src/patch_alias_reference_resolution.js
import ts9 from "typescript";
var patchedReferencedAliasesSymbol = Symbol("patchedReferencedAliases");
function loadIsReferencedAliasDeclarationPatch(context) {
  if (!isTransformationContextWithEmitResolver(context)) {
    throwIncompatibleTransformationContextError();
  }
  const emitResolver = context.getEmitResolver();
  if (emitResolver === void 0) {
    return null;
  }
  const existingReferencedAliases = emitResolver[patchedReferencedAliasesSymbol];
  if (existingReferencedAliases !== void 0) {
    return existingReferencedAliases;
  }
  const originalIsReferencedAliasDeclaration = emitResolver.isReferencedAliasDeclaration;
  if (originalIsReferencedAliasDeclaration === void 0) {
    throwIncompatibleTransformationContextError();
  }
  const referencedAliases = /* @__PURE__ */ new Set();
  emitResolver.isReferencedAliasDeclaration = function(node, ...args) {
    if (isAliasImportDeclaration(node) && referencedAliases.has(node)) {
      return true;
    }
    return originalIsReferencedAliasDeclaration.call(emitResolver, node, ...args);
  };
  return emitResolver[patchedReferencedAliasesSymbol] = referencedAliases;
}
function isAliasImportDeclaration(node) {
  return ts9.isImportSpecifier(node) || ts9.isNamespaceImport(node) || ts9.isImportClause(node);
}
function isTransformationContextWithEmitResolver(context) {
  return context.getEmitResolver !== void 0;
}
function throwIncompatibleTransformationContextError() {
  throw Error("Angular compiler is incompatible with this version of the TypeScript compiler.\n\nIf you recently updated TypeScript and this issue surfaces now, consider downgrading.\n\nPlease report an issue on the Angular repositories when this issue surfaces and you are using a supposedly compatible TypeScript version.");
}

// packages/compiler-cli/src/ngtsc/imports/src/default.js
var DefaultImportDeclaration = Symbol("DefaultImportDeclaration");
function attachDefaultImportDeclaration(expr, importDecl) {
  expr[DefaultImportDeclaration] = importDecl;
}
function getDefaultImportDeclaration(expr) {
  return expr[DefaultImportDeclaration] ?? null;
}
var DefaultImportTracker = class {
  /**
   * A `Map` which tracks the `Set` of `ts.ImportClause`s for default imports that were used in
   * a given file name.
   */
  sourceFileToUsedImports = /* @__PURE__ */ new Map();
  recordUsedImport(importDecl) {
    if (importDecl.importClause) {
      const sf = getSourceFile(importDecl);
      if (!this.sourceFileToUsedImports.has(sf.fileName)) {
        this.sourceFileToUsedImports.set(sf.fileName, /* @__PURE__ */ new Set());
      }
      this.sourceFileToUsedImports.get(sf.fileName).add(importDecl.importClause);
    }
  }
  /**
   * Get a `ts.TransformerFactory` which will preserve default imports that were previously marked
   * as used.
   *
   * This transformer must run after any other transformers which call `recordUsedImport`.
   */
  importPreservingTransformer() {
    return (context) => {
      let clausesToPreserve = null;
      return (sourceFile) => {
        const clausesForFile = this.sourceFileToUsedImports.get(sourceFile.fileName);
        if (clausesForFile !== void 0) {
          for (const clause of clausesForFile) {
            if (clausesToPreserve === null) {
              clausesToPreserve = loadIsReferencedAliasDeclarationPatch(context);
            }
            clausesToPreserve?.add(clause);
          }
        }
        return sourceFile;
      };
    };
  }
};

// packages/compiler-cli/src/ngtsc/imports/src/deferred_symbol_tracker.js
import ts10 from "typescript";
var AssumeEager = "AssumeEager";
var DeferredSymbolTracker = class {
  typeChecker;
  onlyExplicitDeferDependencyImports;
  imports = /* @__PURE__ */ new Map();
  /**
   * Map of a component class -> all import declarations that bring symbols
   * used within `@Component.deferredImports` field.
   */
  explicitlyDeferredImports = /* @__PURE__ */ new Map();
  constructor(typeChecker, onlyExplicitDeferDependencyImports) {
    this.typeChecker = typeChecker;
    this.onlyExplicitDeferDependencyImports = onlyExplicitDeferDependencyImports;
  }
  /**
   * Given an import declaration node, extract the names of all imported symbols
   * and return them as a map where each symbol is a key and `AssumeEager` is a value.
   *
   * The logic recognizes the following import shapes:
   *
   * Case 1: `import {a, b as B} from 'a'`
   * Case 2: `import X from 'a'`
   * Case 3: `import * as x from 'a'`
   */
  extractImportedSymbols(importDecl) {
    const symbolMap = /* @__PURE__ */ new Map();
    if (importDecl.importClause === void 0) {
      throw new Error(`Provided import declaration doesn't have any symbols.`);
    }
    if (importDecl.importClause.phaseModifier === ts10.SyntaxKind.TypeKeyword) {
      return symbolMap;
    }
    if (importDecl.importClause.namedBindings !== void 0) {
      const bindings = importDecl.importClause.namedBindings;
      if (ts10.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (!element.isTypeOnly) {
            symbolMap.set(element.name.text, AssumeEager);
          }
        }
      } else {
        symbolMap.set(bindings.name.text, AssumeEager);
      }
    } else if (importDecl.importClause.name !== void 0) {
      symbolMap.set(importDecl.importClause.name.text, AssumeEager);
    } else {
      throw new Error("Unrecognized import structure.");
    }
    return symbolMap;
  }
  /**
   * Retrieves a list of import declarations that contain symbols used within
   * `@Component.deferredImports` of a specific component class, but those imports
   * can not be removed, since there are other symbols imported alongside deferred
   * components.
   */
  getNonRemovableDeferredImports(sourceFile, classDecl) {
    const affectedImports = [];
    const importDecls = this.explicitlyDeferredImports.get(classDecl) ?? [];
    for (const importDecl of importDecls) {
      if (importDecl.getSourceFile() === sourceFile && !this.canDefer(importDecl)) {
        affectedImports.push(importDecl);
      }
    }
    return affectedImports;
  }
  /**
   * Marks a given identifier and an associated import declaration as a candidate
   * for defer loading.
   */
  markAsDeferrableCandidate(identifier, importDecl, componentClassDecl, isExplicitlyDeferred) {
    if (this.onlyExplicitDeferDependencyImports && !isExplicitlyDeferred) {
      return;
    }
    if (isExplicitlyDeferred) {
      if (this.explicitlyDeferredImports.has(componentClassDecl)) {
        this.explicitlyDeferredImports.get(componentClassDecl).push(importDecl);
      } else {
        this.explicitlyDeferredImports.set(componentClassDecl, [importDecl]);
      }
    }
    let symbolMap = this.imports.get(importDecl);
    if (!symbolMap) {
      symbolMap = this.extractImportedSymbols(importDecl);
      this.imports.set(importDecl, symbolMap);
    }
    if (!symbolMap.has(identifier.text)) {
      throw new Error(`The '${identifier.text}' identifier doesn't belong to the provided import declaration.`);
    }
    if (symbolMap.get(identifier.text) === AssumeEager) {
      symbolMap.set(identifier.text, this.lookupIdentifiersInSourceFile(identifier.text, importDecl));
    }
    const identifiers = symbolMap.get(identifier.text);
    identifiers.delete(identifier);
  }
  /**
   * Whether all symbols from a given import declaration have no references
   * in a source file, thus it's safe to use dynamic imports.
   */
  canDefer(importDecl) {
    if (!this.imports.has(importDecl)) {
      return false;
    }
    const symbolsMap = this.imports.get(importDecl);
    for (const refs of symbolsMap.values()) {
      if (refs === AssumeEager || refs.size > 0) {
        return false;
      }
    }
    return true;
  }
  /**
   * Returns a set of import declarations that is safe to remove
   * from the current source file and generate dynamic imports instead.
   */
  getDeferrableImportDecls() {
    const deferrableDecls = /* @__PURE__ */ new Set();
    for (const [importDecl] of this.imports) {
      if (this.canDefer(importDecl)) {
        deferrableDecls.add(importDecl);
      }
    }
    return deferrableDecls;
  }
  lookupIdentifiersInSourceFile(name, importDecl) {
    const results = /* @__PURE__ */ new Set();
    const visit = (node) => {
      if (node === importDecl || ts10.isTypeNode(node)) {
        return;
      }
      if (ts10.isIdentifier(node) && node.text === name) {
        const sym = this.typeChecker.getSymbolAtLocation(node);
        if (sym === void 0) {
          return;
        }
        if (sym.declarations === void 0 || sym.declarations.length === 0) {
          return;
        }
        const importClause = sym.declarations[0];
        const decl = getContainingImportDeclaration(importClause);
        if (decl !== importDecl) {
          return;
        }
        results.add(node);
      }
      ts10.forEachChild(node, visit);
    };
    visit(importDecl.getSourceFile());
    return results;
  }
};

// packages/compiler-cli/src/ngtsc/imports/src/local_compilation_extra_imports_tracker.js
import ts11 from "typescript";
var LocalCompilationExtraImportsTracker = class {
  typeChecker;
  localImportsMap = /* @__PURE__ */ new Map();
  globalImportsSet = /* @__PURE__ */ new Set();
  /** Names of the files marked for extra import generation. */
  markedFilesSet = /* @__PURE__ */ new Set();
  constructor(typeChecker) {
    this.typeChecker = typeChecker;
  }
  /**
   * Marks the source file for extra imports generation.
   *
   * The extra imports are generated only for the files marked through this method. In other words,
   * the method {@link getImportsForFile} returns empty if the file is not marked. This allows the
   * consumers of this tool to avoid generating extra imports for unrelated files (e.g., non-Angular
   * files)
   */
  markFileForExtraImportGeneration(sf) {
    this.markedFilesSet.add(sf.fileName);
  }
  /**
   * Adds an extra import to be added to the generated file of a specific source file.
   */
  addImportForFile(sf, moduleName) {
    if (!this.localImportsMap.has(sf.fileName)) {
      this.localImportsMap.set(sf.fileName, /* @__PURE__ */ new Set());
    }
    this.localImportsMap.get(sf.fileName).add(moduleName);
  }
  /**
   * If the given node is an imported identifier, this method adds the module from which it is
   * imported as an extra import to the generated file of each source file in the compilation unit,
   * otherwise the method is noop.
   *
   * Adding an extra import to all files is not optimal though. There are rooms to optimize and a
   * add the import to a subset of files (e.g., exclude all the non Angular files as they don't need
   * any extra import). However for this first version of this feature we go by this mechanism for
   * simplicity. There will be on-going work to further optimize this method to add the extra import
   * to smallest possible candidate files instead of all files.
   */
  addGlobalImportFromIdentifier(node) {
    let identifier = null;
    if (ts11.isIdentifier(node)) {
      identifier = node;
    } else if (ts11.isPropertyAccessExpression(node) && ts11.isIdentifier(node.expression)) {
      identifier = node.expression;
    }
    if (identifier === null) {
      return;
    }
    const sym = this.typeChecker.getSymbolAtLocation(identifier);
    if (!sym?.declarations?.length) {
      return;
    }
    const importClause = sym.declarations[0];
    const decl = getContainingImportDeclaration(importClause);
    if (decl !== null) {
      this.globalImportsSet.add(removeQuotations(decl.moduleSpecifier.getText()));
    }
  }
  /**
   * Returns the list of all module names that the given file should include as its extra imports.
   */
  getImportsForFile(sf) {
    if (!this.markedFilesSet.has(sf.fileName)) {
      return [];
    }
    return [...this.globalImportsSet, ...this.localImportsMap.get(sf.fileName) ?? []];
  }
};
function removeQuotations(s) {
  return s.substring(1, s.length - 1).trim();
}

// packages/compiler-cli/src/ngtsc/imports/src/resolver.js
var ModuleResolver = class {
  program;
  compilerOptions;
  host;
  moduleResolutionCache;
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

// packages/compiler-cli/src/ngtsc/metadata/src/dts.js
import { ClassPropertyMapping, MatchSource } from "@angular/compiler";
import ts13 from "typescript";

// packages/compiler-cli/src/ngtsc/metadata/src/api.js
var MetaKind;
(function(MetaKind2) {
  MetaKind2[MetaKind2["Directive"] = 0] = "Directive";
  MetaKind2[MetaKind2["Pipe"] = 1] = "Pipe";
  MetaKind2[MetaKind2["NgModule"] = 2] = "NgModule";
})(MetaKind || (MetaKind = {}));

// packages/compiler-cli/src/ngtsc/metadata/src/util.js
import ts12 from "typescript";
function extractReferencesFromType(checker, def, bestGuessOwningModule) {
  if (!ts12.isTupleTypeNode(def)) {
    return { result: [], isIncomplete: false };
  }
  const result = [];
  let isIncomplete = false;
  for (const element of def.elements) {
    if (!ts12.isTypeQueryNode(element)) {
      throw new Error(`Expected TypeQueryNode: ${nodeDebugInfo(element)}`);
    }
    const ref = extraReferenceFromTypeQuery(checker, element, def, bestGuessOwningModule);
    if (ref === null) {
      isIncomplete = true;
    } else {
      result.push(ref);
    }
  }
  return { result, isIncomplete };
}
function extraReferenceFromTypeQuery(checker, typeNode, origin, bestGuessOwningModule) {
  const type = typeNode.exprName;
  let node;
  let from;
  try {
    const result = reflectTypeEntityToDeclaration(type, checker);
    node = result.node;
    from = result.from;
  } catch (e) {
    if (e instanceof TypeEntityToDeclarationError) {
      return null;
    }
    throw e;
  }
  if (!isNamedClassDeclaration(node)) {
    throw new Error(`Expected named ClassDeclaration: ${nodeDebugInfo(node)}`);
  }
  if (from !== null && !from.startsWith(".")) {
    return new Reference(node, {
      specifier: from,
      resolutionContext: origin.getSourceFile().fileName
    });
  }
  return new Reference(node, bestGuessOwningModule);
}
function readBooleanType(type) {
  if (!ts12.isLiteralTypeNode(type)) {
    return null;
  }
  switch (type.literal.kind) {
    case ts12.SyntaxKind.TrueKeyword:
      return true;
    case ts12.SyntaxKind.FalseKeyword:
      return false;
    default:
      return null;
  }
}
function readStringType(type) {
  if (!ts12.isLiteralTypeNode(type) || !ts12.isStringLiteral(type.literal)) {
    return null;
  }
  return type.literal.text;
}
function readMapType(type, valueTransform) {
  if (!ts12.isTypeLiteralNode(type)) {
    return {};
  }
  const obj = {};
  type.members.forEach((member) => {
    if (!ts12.isPropertySignature(member) || member.type === void 0 || member.name === void 0 || !ts12.isStringLiteral(member.name) && !ts12.isIdentifier(member.name)) {
      return;
    }
    const value = valueTransform(member.type);
    if (value !== null) {
      obj[member.name.text] = value;
    }
  });
  return obj;
}
function readStringArrayType(type) {
  if (!ts12.isTupleTypeNode(type)) {
    return [];
  }
  const res = [];
  type.elements.forEach((el) => {
    if (!ts12.isLiteralTypeNode(el) || !ts12.isStringLiteral(el.literal)) {
      return;
    }
    res.push(el.literal.text);
  });
  return res;
}
function extractDirectiveTypeCheckMeta(node, inputs, reflector) {
  const members = reflector.getMembersOfClass(node);
  const publicMethods = /* @__PURE__ */ new Set();
  const staticMembers = [];
  for (const member of members) {
    if (member.isStatic) {
      staticMembers.push(member);
    }
    if (member.kind === ClassMemberKind.Method && !member.isStatic && (member.accessLevel === ClassMemberAccessLevel.PublicReadonly || member.accessLevel === ClassMemberAccessLevel.PublicWritable)) {
      publicMethods.add(member.name);
    }
  }
  const ngTemplateGuards = staticMembers.map(extractTemplateGuard).filter((guard) => guard !== null);
  const hasNgTemplateContextGuard = staticMembers.some((member) => member.kind === ClassMemberKind.Method && member.name === "ngTemplateContextGuard");
  const coercedInputFields = new Set(staticMembers.map(extractCoercedInput).filter((inputName) => {
    if (inputName === null || inputs.getByClassPropertyName(inputName)?.isSignal) {
      return false;
    }
    return true;
  }));
  const restrictedInputFields = /* @__PURE__ */ new Set();
  const stringLiteralInputFields = /* @__PURE__ */ new Set();
  const undeclaredInputFields = /* @__PURE__ */ new Set();
  for (const { classPropertyName, transform } of inputs) {
    const field = members.find((member) => member.name === classPropertyName);
    if (field === void 0 || field.node === null) {
      undeclaredInputFields.add(classPropertyName);
      continue;
    }
    if (isRestricted(field.node)) {
      restrictedInputFields.add(classPropertyName);
    }
    if (field.nameNode !== null && ts12.isStringLiteral(field.nameNode)) {
      stringLiteralInputFields.add(classPropertyName);
    }
    if (transform !== null) {
      coercedInputFields.add(classPropertyName);
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
    publicMethods,
    isGeneric: arity !== null && arity > 0
  };
}
function isRestricted(node) {
  const modifiers = ts12.canHaveModifiers(node) ? ts12.getModifiers(node) : void 0;
  return modifiers !== void 0 && modifiers.some(({ kind }) => {
    return kind === ts12.SyntaxKind.PrivateKeyword || kind === ts12.SyntaxKind.ProtectedKeyword || kind === ts12.SyntaxKind.ReadonlyKeyword;
  });
}
function extractTemplateGuard(member) {
  if (!member.name.startsWith("ngTemplateGuard_")) {
    return null;
  }
  const inputName = afterUnderscore(member.name);
  if (member.kind === ClassMemberKind.Property) {
    let type = null;
    if (member.type !== null && ts12.isLiteralTypeNode(member.type) && ts12.isStringLiteral(member.type.literal)) {
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
  readers;
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
  return str.slice(pos + 1);
}
function hasInjectableFields(clazz, host) {
  const members = host.getMembersOfClass(clazz);
  return members.some(({ isStatic, name }) => isStatic && (name === "\u0275prov" || name === "\u0275fac"));
}
function isHostDirectiveMetaForGlobalMode(hostDirectiveMeta) {
  return hostDirectiveMeta.directive instanceof Reference;
}

// packages/compiler-cli/src/ngtsc/metadata/src/dts.js
var DtsMetadataReader = class {
  checker;
  reflector;
  constructor(checker, reflector) {
    this.checker = checker;
    this.reflector = reflector;
  }
  /**
   * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
   * file, or in a .ts file with a handwritten definition).
   *
   * @param ref `Reference` to the class of interest, with the context of how it was obtained.
   */
  getNgModuleMetadata(ref) {
    const clazz = ref.node;
    const ngModuleDef = this.reflector.getMembersOfClass(clazz).find((member) => member.name === "\u0275mod" && member.isStatic);
    if (ngModuleDef === void 0) {
      return null;
    } else if (
      // Validate that the shape of the ngModuleDef type is correct.
      ngModuleDef.type === null || !ts13.isTypeReferenceNode(ngModuleDef.type) || ngModuleDef.type.typeArguments === void 0 || ngModuleDef.type.typeArguments.length !== 4
    ) {
      return null;
    }
    const [_, declarationMetadata, importMetadata, exportMetadata] = ngModuleDef.type.typeArguments;
    const declarations = extractReferencesFromType(this.checker, declarationMetadata, ref.bestGuessOwningModule);
    const exports = extractReferencesFromType(this.checker, exportMetadata, ref.bestGuessOwningModule);
    const imports = extractReferencesFromType(this.checker, importMetadata, ref.bestGuessOwningModule);
    const isPoisoned = exports.isIncomplete;
    return {
      kind: MetaKind.NgModule,
      ref,
      declarations: declarations.result,
      isPoisoned,
      exports: exports.result,
      imports: imports.result,
      schemas: [],
      rawDeclarations: null,
      rawImports: null,
      rawExports: null,
      decorator: null,
      // NgModules declared outside the current compilation are assumed to contain providers, as it
      // would be a non-breaking change for a library to introduce providers at any point.
      mayDeclareProviders: true
    };
  }
  /**
   * Read directive (or component) metadata from a referenced class in a .d.ts file.
   */
  getDirectiveMetadata(ref) {
    const clazz = ref.node;
    const def = this.reflector.getMembersOfClass(clazz).find((field) => field.isStatic && (field.name === "\u0275cmp" || field.name === "\u0275dir"));
    if (def === void 0) {
      return null;
    } else if (def.type === null || !ts13.isTypeReferenceNode(def.type) || def.type.typeArguments === void 0 || def.type.typeArguments.length < 2) {
      return null;
    }
    const isComponent = def.name === "\u0275cmp";
    const ctorParams = this.reflector.getConstructorParameters(clazz);
    const isStructural = !isComponent && ctorParams !== null && ctorParams.some((param) => {
      return param.typeValueReference.kind === 1 && param.typeValueReference.moduleName === "@angular/core" && param.typeValueReference.importedName === "TemplateRef";
    });
    const ngContentSelectors = def.type.typeArguments.length > 6 ? readStringArrayType(def.type.typeArguments[6]) : null;
    const isStandalone = def.type.typeArguments.length > 7 && (readBooleanType(def.type.typeArguments[7]) ?? false);
    const inputs = ClassPropertyMapping.fromMappedObject(readInputsType(def.type.typeArguments[3]));
    const outputs = ClassPropertyMapping.fromMappedObject(readMapType(def.type.typeArguments[4], readStringType));
    const hostDirectives = def.type.typeArguments.length > 8 ? readHostDirectivesType(this.checker, def.type.typeArguments[8], ref.bestGuessOwningModule) : null;
    const isSignal = def.type.typeArguments.length > 9 && (readBooleanType(def.type.typeArguments[9]) ?? false);
    const isPoisoned = hostDirectives !== null && hostDirectives?.isIncomplete;
    return {
      kind: MetaKind.Directive,
      matchSource: MatchSource.Selector,
      ref,
      name: clazz.name.text,
      isComponent,
      selector: readStringType(def.type.typeArguments[1]),
      exportAs: readStringArrayType(def.type.typeArguments[2]),
      inputs,
      outputs,
      hostDirectives: hostDirectives?.result ?? null,
      queries: readStringArrayType(def.type.typeArguments[5]),
      ...extractDirectiveTypeCheckMeta(clazz, inputs, this.reflector),
      baseClass: readBaseClass(clazz, this.checker, this.reflector),
      isPoisoned,
      isStructural,
      animationTriggerNames: null,
      ngContentSelectors,
      isStandalone,
      isSignal,
      // We do not transfer information about inputs from class metadata
      // via `.d.ts` declarations. This is fine because this metadata is
      // currently only used for classes defined in source files. E.g. in migrations.
      inputFieldNamesFromMetadataArray: null,
      // Imports are tracked in metadata only for template type-checking purposes,
      // so standalone components from .d.ts files don't have any.
      imports: null,
      rawImports: null,
      deferredImports: null,
      // The same goes for schemas.
      schemas: null,
      decorator: null,
      // Assume that standalone components from .d.ts files may export providers.
      assumedToExportProviders: isComponent && isStandalone,
      // `preserveWhitespaces` isn't encoded in the .d.ts and is only
      // used to increase the accuracy of a diagnostic.
      preserveWhitespaces: false,
      isExplicitlyDeferred: false,
      // We don't need to know if imported components from .d.ts
      // files are selectorless for type-checking purposes.
      selectorlessEnabled: false,
      localReferencedSymbols: null
    };
  }
  /**
   * Read pipe metadata from a referenced class in a .d.ts file.
   */
  getPipeMetadata(ref) {
    const def = this.reflector.getMembersOfClass(ref.node).find((field) => field.isStatic && field.name === "\u0275pipe");
    if (def === void 0) {
      return null;
    } else if (def.type === null || !ts13.isTypeReferenceNode(def.type) || def.type.typeArguments === void 0 || def.type.typeArguments.length < 2) {
      return null;
    }
    const type = def.type.typeArguments[1];
    if (!ts13.isLiteralTypeNode(type) || !ts13.isStringLiteral(type.literal) && type.literal.kind !== ts13.SyntaxKind.NullKeyword) {
      return null;
    }
    const name = ts13.isStringLiteral(type.literal) ? type.literal.text : null;
    const isStandalone = def.type.typeArguments.length > 2 && (readBooleanType(def.type.typeArguments[2]) ?? false);
    return {
      kind: MetaKind.Pipe,
      ref,
      name,
      nameExpr: null,
      isStandalone,
      isPure: null,
      // The DTS has no idea about that
      decorator: null,
      isExplicitlyDeferred: false
    };
  }
};
function readInputsType(type) {
  const inputsMap = {};
  if (ts13.isTypeLiteralNode(type)) {
    for (const member of type.members) {
      if (!ts13.isPropertySignature(member) || member.type === void 0 || member.name === void 0 || !ts13.isStringLiteral(member.name) && !ts13.isIdentifier(member.name)) {
        continue;
      }
      const stringValue = readStringType(member.type);
      const classPropertyName = member.name.text;
      if (stringValue != null) {
        inputsMap[classPropertyName] = {
          bindingPropertyName: stringValue,
          classPropertyName,
          required: false,
          // Signal inputs were not supported pre v16- so those inputs are never signal based.
          isSignal: false,
          // Input transform are only tracked for locally-compiled directives. Directives coming
          // from the .d.ts already have them included through `ngAcceptInputType` class members,
          // or via the `InputSignal` type of the member.
          transform: null
        };
      } else {
        const config = readMapType(member.type, (innerValue) => {
          return readStringType(innerValue) ?? readBooleanType(innerValue);
        });
        inputsMap[classPropertyName] = {
          classPropertyName,
          bindingPropertyName: config.alias,
          required: config.required,
          isSignal: !!config.isSignal,
          // Input transform are only tracked for locally-compiled directives. Directives coming
          // from the .d.ts already have them included through `ngAcceptInputType` class members,
          // or via the `InputSignal` type of the member.
          transform: null
        };
      }
    }
  }
  return inputsMap;
}
function readBaseClass(clazz, checker, reflector) {
  if (!isNamedClassDeclaration(clazz)) {
    return reflector.hasBaseClass(clazz) ? "dynamic" : null;
  }
  if (clazz.heritageClauses !== void 0) {
    for (const clause of clazz.heritageClauses) {
      if (clause.token === ts13.SyntaxKind.ExtendsKeyword) {
        const baseExpr = clause.types[0].expression;
        let symbol = checker.getSymbolAtLocation(baseExpr);
        if (symbol === void 0) {
          return "dynamic";
        } else if (symbol.flags & ts13.SymbolFlags.Alias) {
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
function readHostDirectivesType(checker, type, bestGuessOwningModule) {
  if (!ts13.isTupleTypeNode(type) || type.elements.length === 0) {
    return null;
  }
  const result = [];
  let isIncomplete = false;
  for (const hostDirectiveType of type.elements) {
    const { directive, inputs, outputs } = readMapType(hostDirectiveType, (type2) => type2);
    if (directive) {
      if (!ts13.isTypeQueryNode(directive)) {
        throw new Error(`Expected TypeQueryNode: ${nodeDebugInfo(directive)}`);
      }
      const ref = extraReferenceFromTypeQuery(checker, directive, type, bestGuessOwningModule);
      if (ref === null) {
        isIncomplete = true;
        continue;
      }
      result.push({
        directive: ref,
        isForwardReference: false,
        inputs: readMapType(inputs, readStringType),
        outputs: readMapType(outputs, readStringType)
      });
    }
  }
  return result.length > 0 ? { result, isIncomplete } : null;
}

// packages/compiler-cli/src/ngtsc/metadata/src/inheritance.js
import { ClassPropertyMapping as ClassPropertyMapping2 } from "@angular/compiler";
function flattenInheritedDirectiveMetadata(reader, dir) {
  const topMeta = reader.getDirectiveMetadata(dir);
  if (topMeta === null) {
    return null;
  }
  if (topMeta.baseClass === null) {
    return topMeta;
  }
  const coercedInputFields = /* @__PURE__ */ new Set();
  const undeclaredInputFields = /* @__PURE__ */ new Set();
  const restrictedInputFields = /* @__PURE__ */ new Set();
  const stringLiteralInputFields = /* @__PURE__ */ new Set();
  const publicMethods = /* @__PURE__ */ new Set();
  let hostDirectives = null;
  let isDynamic = false;
  let inputs = ClassPropertyMapping2.empty();
  let outputs = ClassPropertyMapping2.empty();
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
    inputs = ClassPropertyMapping2.merge(inputs, meta.inputs);
    outputs = ClassPropertyMapping2.merge(outputs, meta.outputs);
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
    for (const name of meta.publicMethods) {
      publicMethods.add(name);
    }
    if (meta.hostDirectives !== null && meta.hostDirectives.length > 0) {
      hostDirectives ??= [];
      hostDirectives.push(...meta.hostDirectives);
    }
  };
  addMetadata(topMeta);
  return {
    ...topMeta,
    inputs,
    outputs,
    coercedInputFields,
    undeclaredInputFields,
    restrictedInputFields,
    stringLiteralInputFields,
    publicMethods,
    baseClass: isDynamic ? "dynamic" : null,
    isStructural,
    hostDirectives
  };
}

// packages/compiler-cli/src/ngtsc/metadata/src/registry.js
var LocalMetadataRegistry = class {
  directives = /* @__PURE__ */ new Map();
  ngModules = /* @__PURE__ */ new Map();
  pipes = /* @__PURE__ */ new Map();
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
  getKnown(kind) {
    switch (kind) {
      case MetaKind.Directive:
        return Array.from(this.directives.values()).map((v) => v.ref.node);
      case MetaKind.Pipe:
        return Array.from(this.pipes.values()).map((v) => v.ref.node);
      case MetaKind.NgModule:
        return Array.from(this.ngModules.values()).map((v) => v.ref.node);
    }
  }
};
var CompoundMetadataRegistry = class {
  registries;
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

// packages/compiler-cli/src/ngtsc/metadata/src/resource_registry.js
var ResourceRegistry = class {
  externalTemplateToComponentsMap = /* @__PURE__ */ new Map();
  componentToTemplateMap = /* @__PURE__ */ new Map();
  componentToStylesMap = /* @__PURE__ */ new Map();
  externalStyleToComponentsMap = /* @__PURE__ */ new Map();
  directiveToHostBindingsMap = /* @__PURE__ */ new Map();
  getComponentsWithTemplate(template) {
    if (!this.externalTemplateToComponentsMap.has(template)) {
      return /* @__PURE__ */ new Set();
    }
    return this.externalTemplateToComponentsMap.get(template);
  }
  registerResources(resources, directive) {
    if (resources.template !== null) {
      this.registerTemplate(resources.template, directive);
    }
    if (resources.styles !== null) {
      for (const style of resources.styles) {
        this.registerStyle(style, directive);
      }
    }
    if (resources.hostBindings !== null) {
      this.directiveToHostBindingsMap.set(directive, resources.hostBindings);
    }
  }
  registerTemplate(templateResource, component) {
    const { path } = templateResource;
    if (path !== null) {
      if (!this.externalTemplateToComponentsMap.has(path)) {
        this.externalTemplateToComponentsMap.set(path, /* @__PURE__ */ new Set());
      }
      this.externalTemplateToComponentsMap.get(path).add(component);
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
    const { path } = styleResource;
    if (!this.componentToStylesMap.has(component)) {
      this.componentToStylesMap.set(component, /* @__PURE__ */ new Set());
    }
    if (path !== null) {
      if (!this.externalStyleToComponentsMap.has(path)) {
        this.externalStyleToComponentsMap.set(path, /* @__PURE__ */ new Set());
      }
      this.externalStyleToComponentsMap.get(path).add(component);
    }
    this.componentToStylesMap.get(component).add(styleResource);
  }
  getStyles(component) {
    if (!this.componentToStylesMap.has(component)) {
      return /* @__PURE__ */ new Set();
    }
    return this.componentToStylesMap.get(component);
  }
  getComponentsWithStyle(styleUrl) {
    if (!this.externalStyleToComponentsMap.has(styleUrl)) {
      return /* @__PURE__ */ new Set();
    }
    return this.externalStyleToComponentsMap.get(styleUrl);
  }
  getHostBindings(directive) {
    return this.directiveToHostBindingsMap.get(directive) ?? null;
  }
};

// packages/compiler-cli/src/ngtsc/metadata/src/providers.js
var ExportedProviderStatusResolver = class {
  metaReader;
  /**
   * `ClassDeclaration`s that we are in the process of determining the provider status for.
   *
   * This is used to detect cycles in the import graph and avoid getting stuck in them.
   */
  calculating = /* @__PURE__ */ new Set();
  constructor(metaReader) {
    this.metaReader = metaReader;
  }
  /**
   * Determines whether `ref` may or may not export providers to NgModules which import it.
   *
   * NgModules export providers if any are declared, and standalone components export providers from
   * their `imports` array (if any).
   *
   * If `true`, then `ref` should be assumed to export providers. In practice, this could mean
   * either that `ref` is a local type that we _know_ exports providers, or it's imported from a
   * .d.ts library and is declared in a way where the compiler cannot prove that it doesn't.
   *
   * If `false`, then `ref` is guaranteed not to export providers.
   *
   * @param `ref` the class for which the provider status should be determined
   * @param `dependencyCallback` a callback that, if provided, will be called for every type
   *     which is used in the determination of provider status for `ref`
   * @returns `true` if `ref` should be assumed to export providers, or `false` if the compiler can
   *     prove that it does not
   */
  mayExportProviders(ref, dependencyCallback) {
    if (this.calculating.has(ref.node)) {
      return false;
    }
    this.calculating.add(ref.node);
    if (dependencyCallback !== void 0) {
      dependencyCallback(ref);
    }
    try {
      const dirMeta = this.metaReader.getDirectiveMetadata(ref);
      if (dirMeta !== null) {
        if (!dirMeta.isComponent || !dirMeta.isStandalone) {
          return false;
        }
        if (dirMeta.assumedToExportProviders) {
          return true;
        }
        return (dirMeta.imports ?? []).some((importRef) => this.mayExportProviders(importRef, dependencyCallback));
      }
      const pipeMeta = this.metaReader.getPipeMetadata(ref);
      if (pipeMeta !== null) {
        return false;
      }
      const ngModuleMeta = this.metaReader.getNgModuleMetadata(ref);
      if (ngModuleMeta !== null) {
        if (ngModuleMeta.mayDeclareProviders) {
          return true;
        }
        return ngModuleMeta.imports.some((importRef) => this.mayExportProviders(importRef, dependencyCallback));
      }
      return false;
    } finally {
      this.calculating.delete(ref.node);
    }
  }
};

// packages/compiler-cli/src/ngtsc/metadata/src/host_directives_resolver.js
import { ClassPropertyMapping as ClassPropertyMapping3, MatchSource as MatchSource2 } from "@angular/compiler";
var EMPTY_ARRAY = [];
var HostDirectivesResolver = class {
  metaReader;
  cache = /* @__PURE__ */ new Map();
  constructor(metaReader) {
    this.metaReader = metaReader;
  }
  /** Resolves all of the host directives that apply to a directive. */
  resolve(metadata) {
    if (this.cache.has(metadata.ref.node)) {
      return this.cache.get(metadata.ref.node);
    }
    const results = metadata.hostDirectives && metadata.hostDirectives.length > 0 ? this.walkHostDirectives(metadata.hostDirectives, []) : EMPTY_ARRAY;
    this.cache.set(metadata.ref.node, results);
    return results;
  }
  /**
   * Traverses all of the host directive chains and produces a flat array of
   * directive metadata representing the host directives that apply to the host.
   */
  walkHostDirectives(directives, results) {
    for (const current of directives) {
      if (!isHostDirectiveMetaForGlobalMode(current)) {
        throw new Error("Impossible state: resolving code path in local compilation mode");
      }
      const hostMeta = flattenInheritedDirectiveMetadata(this.metaReader, current.directive);
      if (hostMeta === null) {
        continue;
      }
      if (hostMeta.hostDirectives) {
        this.walkHostDirectives(hostMeta.hostDirectives, results);
      }
      results.push({
        ...hostMeta,
        matchSource: MatchSource2.HostDirective,
        inputs: ClassPropertyMapping3.fromMappedObject(this.filterMappings(hostMeta.inputs, current.inputs, resolveInput)),
        outputs: ClassPropertyMapping3.fromMappedObject(this.filterMappings(hostMeta.outputs, current.outputs, resolveOutput))
      });
    }
    return results;
  }
  /**
   * Filters the class property mappings so that only the allowed ones are present.
   * @param source Property mappings that should be filtered.
   * @param allowedProperties Property mappings that are allowed in the final results.
   * @param valueResolver Function used to resolve the value that is assigned to the final mapping.
   */
  filterMappings(source, allowedProperties, valueResolver) {
    const result = {};
    if (allowedProperties !== null) {
      for (const publicName in allowedProperties) {
        if (allowedProperties.hasOwnProperty(publicName)) {
          const bindings = source.getByBindingPropertyName(publicName);
          if (bindings !== null) {
            for (const binding of bindings) {
              result[binding.classPropertyName] = valueResolver(allowedProperties[publicName], binding);
            }
          }
        }
      }
    }
    return result;
  }
};
function resolveInput(bindingName, binding) {
  return {
    bindingPropertyName: bindingName,
    classPropertyName: binding.classPropertyName,
    required: binding.required,
    transform: binding.transform,
    isSignal: binding.isSignal
  };
}
function resolveOutput(bindingName) {
  return bindingName;
}

// packages/compiler-cli/src/ngtsc/translator/src/import_manager/import_manager.js
import ts18 from "typescript";

// packages/compiler-cli/src/ngtsc/translator/src/import_manager/check_unique_identifier_name.js
import ts14 from "typescript";
function createGenerateUniqueIdentifierHelper() {
  const generatedIdentifiers = /* @__PURE__ */ new Set();
  const isGeneratedIdentifier = (sf, identifierName) => generatedIdentifiers.has(`${sf.fileName}@@${identifierName}`);
  const markIdentifierAsGenerated = (sf, identifierName) => generatedIdentifiers.add(`${sf.fileName}@@${identifierName}`);
  return (sourceFile, symbolName) => {
    const sf = sourceFile;
    if (sf["identifiers"] === void 0) {
      throw new Error("Source file unexpectedly lacks map of parsed `identifiers`.");
    }
    const isUniqueIdentifier = (name2) => !sf["identifiers"].has(name2) && !isGeneratedIdentifier(sf, name2);
    if (isUniqueIdentifier(symbolName)) {
      markIdentifierAsGenerated(sf, symbolName);
      return null;
    }
    let name = null;
    let counter = 1;
    do {
      name = `${symbolName}_${counter++}`;
    } while (!isUniqueIdentifier(name));
    markIdentifierAsGenerated(sf, name);
    return ts14.factory.createUniqueName(name, ts14.GeneratedIdentifierFlags.Optimistic);
  };
}

// packages/compiler-cli/src/ngtsc/translator/src/import_manager/import_typescript_transform.js
import ts15 from "typescript";
function createTsTransformForImportManager(manager, extraStatementsForFiles) {
  return (ctx) => {
    const { affectedFiles, newImports, updatedImports, reusedOriginalAliasDeclarations, deletedImports } = manager.finalize();
    if (reusedOriginalAliasDeclarations.size > 0) {
      const referencedAliasDeclarations = loadIsReferencedAliasDeclarationPatch(ctx);
      if (referencedAliasDeclarations !== null) {
        reusedOriginalAliasDeclarations.forEach((aliasDecl) => referencedAliasDeclarations.add(aliasDecl));
      }
    }
    if (extraStatementsForFiles !== void 0) {
      for (const [fileName, statements] of extraStatementsForFiles.entries()) {
        if (statements.length > 0) {
          affectedFiles.add(fileName);
        }
      }
    }
    const visitStatement = (node) => {
      if (!ts15.isImportDeclaration(node)) {
        return node;
      }
      if (deletedImports.has(node)) {
        return void 0;
      }
      if (node.importClause === void 0 || !ts15.isImportClause(node.importClause)) {
        return node;
      }
      const clause = node.importClause;
      if (clause.namedBindings === void 0 || !ts15.isNamedImports(clause.namedBindings) || !updatedImports.has(clause.namedBindings)) {
        return node;
      }
      const newClause = ctx.factory.updateImportClause(clause, clause.phaseModifier, clause.name, updatedImports.get(clause.namedBindings));
      const newImport = ctx.factory.updateImportDeclaration(node, node.modifiers, newClause, node.moduleSpecifier, node.attributes);
      ts15.setOriginalNode(newImport, {
        importClause: newClause,
        kind: newImport.kind
      });
      return newImport;
    };
    return (sourceFile) => {
      if (!affectedFiles.has(sourceFile.fileName)) {
        return sourceFile;
      }
      sourceFile = ts15.visitEachChild(sourceFile, visitStatement, ctx);
      const extraStatements = extraStatementsForFiles?.get(sourceFile.fileName) ?? [];
      const existingImports = [];
      const body = [];
      for (const statement of sourceFile.statements) {
        if (isImportStatement(statement)) {
          existingImports.push(statement);
        } else {
          body.push(statement);
        }
      }
      return ctx.factory.updateSourceFile(sourceFile, [
        ...existingImports,
        ...newImports.get(sourceFile.fileName) ?? [],
        ...extraStatements,
        ...body
      ], sourceFile.isDeclarationFile, sourceFile.referencedFiles, sourceFile.typeReferenceDirectives, sourceFile.hasNoDefaultLib, sourceFile.libReferenceDirectives);
    };
  };
}
function isImportStatement(stmt) {
  return ts15.isImportDeclaration(stmt) || ts15.isImportEqualsDeclaration(stmt) || ts15.isNamespaceImport(stmt);
}

// packages/compiler-cli/src/ngtsc/translator/src/import_manager/reuse_generated_imports.js
import ts16 from "typescript";
function attemptToReuseGeneratedImports(tracker, request) {
  const requestHash = hashImportRequest(request);
  const existingExactImport = tracker.directReuseCache.get(requestHash);
  if (existingExactImport !== void 0) {
    return existingExactImport;
  }
  const potentialNamespaceImport = tracker.namespaceImportReuseCache.get(request.exportModuleSpecifier);
  if (potentialNamespaceImport === void 0) {
    return null;
  }
  if (request.exportSymbolName === null) {
    return potentialNamespaceImport;
  }
  return [potentialNamespaceImport, ts16.factory.createIdentifier(request.exportSymbolName)];
}
function captureGeneratedImport(request, tracker, referenceNode) {
  tracker.directReuseCache.set(hashImportRequest(request), referenceNode);
  if (request.exportSymbolName === null && !Array.isArray(referenceNode)) {
    tracker.namespaceImportReuseCache.set(request.exportModuleSpecifier, referenceNode);
  }
}
function hashImportRequest(req) {
  return `${req.requestedFile.fileName}:${req.exportModuleSpecifier}:${req.exportSymbolName}${req.unsafeAliasOverride ? ":" + req.unsafeAliasOverride : ""}`;
}

// packages/compiler-cli/src/ngtsc/translator/src/import_manager/reuse_source_file_imports.js
import ts17 from "typescript";
function attemptToReuseExistingSourceFileImports(tracker, sourceFile, request) {
  let candidateImportToBeUpdated = null;
  for (let i = sourceFile.statements.length - 1; i >= 0; i--) {
    const statement = sourceFile.statements[i];
    if (!ts17.isImportDeclaration(statement) || !ts17.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!statement.importClause || statement.importClause.phaseModifier === ts17.SyntaxKind.TypeKeyword) {
      continue;
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    if (moduleSpecifier !== request.exportModuleSpecifier) {
      continue;
    }
    if (statement.importClause.namedBindings) {
      const namedBindings = statement.importClause.namedBindings;
      if (ts17.isNamespaceImport(namedBindings)) {
        tracker.reusedAliasDeclarations.add(namedBindings);
        if (request.exportSymbolName === null) {
          return namedBindings.name;
        }
        return [namedBindings.name, ts17.factory.createIdentifier(request.exportSymbolName)];
      }
      if (ts17.isNamedImports(namedBindings) && request.exportSymbolName !== null) {
        const existingElement = namedBindings.elements.find((e) => {
          let nameMatches;
          if (request.unsafeAliasOverride) {
            nameMatches = e.propertyName?.text === request.exportSymbolName && e.name.text === request.unsafeAliasOverride;
          } else {
            nameMatches = e.propertyName ? e.propertyName.text === request.exportSymbolName : e.name.text === request.exportSymbolName;
          }
          return !e.isTypeOnly && nameMatches;
        });
        if (existingElement !== void 0) {
          tracker.reusedAliasDeclarations.add(existingElement);
          return existingElement.name;
        }
        candidateImportToBeUpdated = statement;
      }
    }
  }
  if (candidateImportToBeUpdated === null || request.exportSymbolName === null) {
    return null;
  }
  if (!tracker.updatedImports.has(candidateImportToBeUpdated)) {
    tracker.updatedImports.set(candidateImportToBeUpdated, []);
  }
  const symbolsToBeImported = tracker.updatedImports.get(candidateImportToBeUpdated);
  const propertyName = ts17.factory.createIdentifier(request.exportSymbolName);
  const fileUniqueAlias = request.unsafeAliasOverride ? ts17.factory.createIdentifier(request.unsafeAliasOverride) : tracker.generateUniqueIdentifier(sourceFile, request.exportSymbolName);
  symbolsToBeImported.push({
    propertyName,
    fileUniqueAlias
  });
  return fileUniqueAlias ?? propertyName;
}

// packages/compiler-cli/src/ngtsc/translator/src/import_manager/import_manager.js
var presetImportManagerForceNamespaceImports = {
  // Forcing namespace imports also means no-reuse.
  // Re-using would otherwise become more complicated and we don't
  // expect re-usable namespace imports.
  disableOriginalSourceFileReuse: true,
  forceGenerateNamespacesForNewImports: true
};
var ImportManager = class {
  /** List of new imports that will be inserted into given source files. */
  newImports = /* @__PURE__ */ new Map();
  /**
   * Keeps track of imports marked for removal. The root-level key is the file from which the
   * import should be removed, the inner map key is the name of the module from which the symbol
   * is being imported. The value of the inner map is a set of symbol names that should be removed.
   * Note! the inner map tracks the original names of the imported symbols, not their local aliases.
   */
  removedImports = /* @__PURE__ */ new Map();
  nextUniqueIndex = 0;
  config;
  reuseSourceFileImportsTracker;
  reuseGeneratedImportsTracker = {
    directReuseCache: /* @__PURE__ */ new Map(),
    namespaceImportReuseCache: /* @__PURE__ */ new Map()
  };
  constructor(config = {}) {
    this.config = {
      shouldUseSingleQuotes: config.shouldUseSingleQuotes ?? (() => false),
      rewriter: config.rewriter ?? null,
      disableOriginalSourceFileReuse: config.disableOriginalSourceFileReuse ?? false,
      forceGenerateNamespacesForNewImports: config.forceGenerateNamespacesForNewImports ?? false,
      namespaceImportPrefix: config.namespaceImportPrefix ?? "i",
      generateUniqueIdentifier: config.generateUniqueIdentifier ?? createGenerateUniqueIdentifierHelper()
    };
    this.reuseSourceFileImportsTracker = {
      generateUniqueIdentifier: this.config.generateUniqueIdentifier,
      reusedAliasDeclarations: /* @__PURE__ */ new Set(),
      updatedImports: /* @__PURE__ */ new Map()
    };
  }
  /** Adds a side-effect import for the given module. */
  addSideEffectImport(requestedFile, moduleSpecifier) {
    if (this.config.rewriter !== null) {
      moduleSpecifier = this.config.rewriter.rewriteSpecifier(moduleSpecifier, requestedFile.fileName);
    }
    this._getNewImportsTrackerForFile(requestedFile).sideEffectImports.add(moduleSpecifier);
  }
  addImport(request) {
    if (this.config.rewriter !== null) {
      if (request.exportSymbolName !== null) {
        request.exportSymbolName = this.config.rewriter.rewriteSymbol(request.exportSymbolName, request.exportModuleSpecifier);
      }
      request.exportModuleSpecifier = this.config.rewriter.rewriteSpecifier(request.exportModuleSpecifier, request.requestedFile.fileName);
    }
    if (request.exportSymbolName !== null && !request.asTypeReference) {
      this.removedImports.get(request.requestedFile)?.get(request.exportModuleSpecifier)?.delete(request.exportSymbolName);
    }
    const previousGeneratedImportRef = attemptToReuseGeneratedImports(this.reuseGeneratedImportsTracker, request);
    if (previousGeneratedImportRef !== null) {
      return createImportReference(!!request.asTypeReference, previousGeneratedImportRef);
    }
    const resultImportRef = this._generateNewImport(request);
    captureGeneratedImport(request, this.reuseGeneratedImportsTracker, resultImportRef);
    return createImportReference(!!request.asTypeReference, resultImportRef);
  }
  /**
   * Marks all imported symbols with a specific name for removal.
   * Call `addImport` to undo this operation.
   * @param requestedFile File from which to remove the imports.
   * @param exportSymbolName Declared name of the symbol being removed.
   * @param moduleSpecifier Module from which the symbol is being imported.
   */
  removeImport(requestedFile, exportSymbolName, moduleSpecifier) {
    let moduleMap = this.removedImports.get(requestedFile);
    if (!moduleMap) {
      moduleMap = /* @__PURE__ */ new Map();
      this.removedImports.set(requestedFile, moduleMap);
    }
    let removedSymbols = moduleMap.get(moduleSpecifier);
    if (!removedSymbols) {
      removedSymbols = /* @__PURE__ */ new Set();
      moduleMap.set(moduleSpecifier, removedSymbols);
    }
    removedSymbols.add(exportSymbolName);
  }
  _generateNewImport(request) {
    const { requestedFile: sourceFile } = request;
    const disableOriginalSourceFileReuse = this.config.disableOriginalSourceFileReuse;
    const forceGenerateNamespacesForNewImports = this.config.forceGenerateNamespacesForNewImports;
    if (!disableOriginalSourceFileReuse) {
      const reuseResult = attemptToReuseExistingSourceFileImports(this.reuseSourceFileImportsTracker, sourceFile, request);
      if (reuseResult !== null) {
        return reuseResult;
      }
    }
    const { namedImports, namespaceImports } = this._getNewImportsTrackerForFile(sourceFile);
    if (request.exportSymbolName === null || forceGenerateNamespacesForNewImports) {
      let namespaceImportName = `${this.config.namespaceImportPrefix}${this.nextUniqueIndex++}`;
      if (this.config.rewriter) {
        namespaceImportName = this.config.rewriter.rewriteNamespaceImportIdentifier(namespaceImportName, request.exportModuleSpecifier);
      }
      const namespaceImport2 = ts18.factory.createNamespaceImport(this.config.generateUniqueIdentifier(sourceFile, namespaceImportName) ?? ts18.factory.createIdentifier(namespaceImportName));
      namespaceImports.set(request.exportModuleSpecifier, namespaceImport2);
      captureGeneratedImport({ ...request, exportSymbolName: null }, this.reuseGeneratedImportsTracker, namespaceImport2.name);
      if (request.exportSymbolName !== null) {
        return [namespaceImport2.name, ts18.factory.createIdentifier(request.exportSymbolName)];
      }
      return namespaceImport2.name;
    }
    if (!namedImports.has(request.exportModuleSpecifier)) {
      namedImports.set(request.exportModuleSpecifier, []);
    }
    const exportSymbolName = ts18.factory.createIdentifier(request.exportSymbolName);
    const fileUniqueName = request.unsafeAliasOverride ? null : this.config.generateUniqueIdentifier(sourceFile, request.exportSymbolName);
    let needsAlias;
    let specifierName;
    if (request.unsafeAliasOverride) {
      needsAlias = true;
      specifierName = ts18.factory.createIdentifier(request.unsafeAliasOverride);
    } else if (fileUniqueName !== null) {
      needsAlias = true;
      specifierName = fileUniqueName;
    } else {
      needsAlias = false;
      specifierName = exportSymbolName;
    }
    namedImports.get(request.exportModuleSpecifier).push(ts18.factory.createImportSpecifier(false, needsAlias ? exportSymbolName : void 0, specifierName));
    return specifierName;
  }
  /**
   * Finalizes the import manager by computing all necessary import changes
   * and returning them.
   *
   * Changes are collected once at the end, after all imports are requested,
   * because this simplifies building up changes to existing imports that need
   * to be updated, and allows more trivial re-use of previous generated imports.
   */
  finalize() {
    const affectedFiles = /* @__PURE__ */ new Set();
    const updatedImportsResult = /* @__PURE__ */ new Map();
    const newImportsResult = /* @__PURE__ */ new Map();
    const deletedImports = /* @__PURE__ */ new Set();
    const importDeclarationsPerFile = /* @__PURE__ */ new Map();
    const addNewImport = (fileName, importDecl) => {
      affectedFiles.add(fileName);
      if (newImportsResult.has(fileName)) {
        newImportsResult.get(fileName).push(importDecl);
      } else {
        newImportsResult.set(fileName, [importDecl]);
      }
    };
    this.reuseSourceFileImportsTracker.updatedImports.forEach((expressions, importDecl) => {
      const sourceFile = importDecl.getSourceFile();
      const namedBindings = importDecl.importClause.namedBindings;
      const moduleName = importDecl.moduleSpecifier.text;
      const newElements = namedBindings.elements.concat(expressions.map(({ propertyName, fileUniqueAlias }) => ts18.factory.createImportSpecifier(false, fileUniqueAlias !== null ? propertyName : void 0, fileUniqueAlias ?? propertyName))).filter((specifier) => this._canAddSpecifier(sourceFile, moduleName, specifier));
      affectedFiles.add(sourceFile.fileName);
      if (newElements.length === 0) {
        deletedImports.add(importDecl);
      } else {
        updatedImportsResult.set(namedBindings, ts18.factory.updateNamedImports(namedBindings, newElements));
      }
    });
    this.removedImports.forEach((removeMap, sourceFile) => {
      if (removeMap.size === 0) {
        return;
      }
      let allImports = importDeclarationsPerFile.get(sourceFile);
      if (!allImports) {
        allImports = sourceFile.statements.filter(ts18.isImportDeclaration);
        importDeclarationsPerFile.set(sourceFile, allImports);
      }
      for (const node of allImports) {
        if (!node.importClause?.namedBindings || !ts18.isNamedImports(node.importClause.namedBindings) || this.reuseSourceFileImportsTracker.updatedImports.has(node) || deletedImports.has(node)) {
          continue;
        }
        const namedBindings = node.importClause.namedBindings;
        const moduleName = node.moduleSpecifier.text;
        const newImports = namedBindings.elements.filter((specifier) => this._canAddSpecifier(sourceFile, moduleName, specifier));
        if (newImports.length === 0) {
          affectedFiles.add(sourceFile.fileName);
          deletedImports.add(node);
        } else if (newImports.length !== namedBindings.elements.length) {
          affectedFiles.add(sourceFile.fileName);
          updatedImportsResult.set(namedBindings, ts18.factory.updateNamedImports(namedBindings, newImports));
        }
      }
    });
    this.newImports.forEach(({ namedImports, namespaceImports, sideEffectImports }, sourceFile) => {
      const useSingleQuotes = this.config.shouldUseSingleQuotes(sourceFile);
      const fileName = sourceFile.fileName;
      sideEffectImports.forEach((moduleName) => {
        addNewImport(fileName, ts18.factory.createImportDeclaration(void 0, void 0, ts18.factory.createStringLiteral(moduleName)));
      });
      namespaceImports.forEach((namespaceImport2, moduleName) => {
        const newImport = ts18.factory.createImportDeclaration(void 0, ts18.factory.createImportClause(void 0, void 0, namespaceImport2), ts18.factory.createStringLiteral(moduleName, useSingleQuotes));
        ts18.setOriginalNode(namespaceImport2.name, newImport);
        addNewImport(fileName, newImport);
      });
      namedImports.forEach((specifiers, moduleName) => {
        const filteredSpecifiers = specifiers.filter((specifier) => this._canAddSpecifier(sourceFile, moduleName, specifier));
        if (filteredSpecifiers.length > 0) {
          const newImport = ts18.factory.createImportDeclaration(void 0, ts18.factory.createImportClause(void 0, void 0, ts18.factory.createNamedImports(filteredSpecifiers)), ts18.factory.createStringLiteral(moduleName, useSingleQuotes));
          addNewImport(fileName, newImport);
        }
      });
    });
    return {
      affectedFiles,
      newImports: newImportsResult,
      updatedImports: updatedImportsResult,
      reusedOriginalAliasDeclarations: this.reuseSourceFileImportsTracker.reusedAliasDeclarations,
      deletedImports
    };
  }
  /**
   * Gets a TypeScript transform for the import manager.
   *
   * @param extraStatementsMap Additional set of statements to be inserted
   *   for given source files after their imports. E.g. top-level constants.
   */
  toTsTransform(extraStatementsMap) {
    return createTsTransformForImportManager(this, extraStatementsMap);
  }
  /**
   * Transforms a single file as a shorthand, using {@link toTsTransform}.
   *
   * @param extraStatementsMap Additional set of statements to be inserted
   *   for given source files after their imports. E.g. top-level constants.
   */
  transformTsFile(ctx, file, extraStatementsAfterImports) {
    const extraStatementsMap = extraStatementsAfterImports ? /* @__PURE__ */ new Map([[file.fileName, extraStatementsAfterImports]]) : void 0;
    return this.toTsTransform(extraStatementsMap)(ctx)(file);
  }
  _getNewImportsTrackerForFile(file) {
    if (!this.newImports.has(file)) {
      this.newImports.set(file, {
        namespaceImports: /* @__PURE__ */ new Map(),
        namedImports: /* @__PURE__ */ new Map(),
        sideEffectImports: /* @__PURE__ */ new Set()
      });
    }
    return this.newImports.get(file);
  }
  _canAddSpecifier(sourceFile, moduleSpecifier, specifier) {
    return !this.removedImports.get(sourceFile)?.get(moduleSpecifier)?.has((specifier.propertyName || specifier.name).text);
  }
};
function createImportReference(asTypeReference, ref) {
  if (asTypeReference) {
    return Array.isArray(ref) ? ts18.factory.createQualifiedName(ref[0], ref[1]) : ref;
  } else {
    return Array.isArray(ref) ? ts18.factory.createPropertyAccessExpression(ref[0], ref[1]) : ref;
  }
}

// packages/compiler-cli/src/ngtsc/translator/src/type_emitter.js
import ts19 from "typescript";
var INELIGIBLE = {};
function canEmitType(type, canEmit) {
  return canEmitTypeWorker(type);
  function canEmitTypeWorker(type2) {
    return visitNode(type2) !== INELIGIBLE;
  }
  function visitNode(node) {
    if (ts19.isImportTypeNode(node)) {
      return INELIGIBLE;
    }
    if (ts19.isTypeReferenceNode(node) && !canEmitTypeReference(node)) {
      return INELIGIBLE;
    } else {
      return ts19.forEachChild(node, visitNode);
    }
  }
  function canEmitTypeReference(type2) {
    if (!canEmit(type2)) {
      return false;
    }
    return type2.typeArguments === void 0 || type2.typeArguments.every(canEmitTypeWorker);
  }
}
var TypeEmitter = class {
  translator;
  constructor(translator) {
    this.translator = translator;
  }
  emitType(type) {
    const typeReferenceTransformer = (context) => {
      const visitNode = (node) => {
        if (ts19.isImportTypeNode(node)) {
          throw new Error("Unable to emit import type");
        }
        if (ts19.isTypeReferenceNode(node)) {
          return this.emitTypeReference(node);
        } else if (ts19.isLiteralExpression(node)) {
          let clone;
          if (ts19.isStringLiteral(node)) {
            clone = ts19.factory.createStringLiteral(node.text);
          } else if (ts19.isNumericLiteral(node)) {
            clone = ts19.factory.createNumericLiteral(node.text);
          } else if (ts19.isBigIntLiteral(node)) {
            clone = ts19.factory.createBigIntLiteral(node.text);
          } else if (ts19.isNoSubstitutionTemplateLiteral(node)) {
            clone = ts19.factory.createNoSubstitutionTemplateLiteral(node.text, node.rawText);
          } else if (ts19.isRegularExpressionLiteral(node)) {
            clone = ts19.factory.createRegularExpressionLiteral(node.text);
          } else {
            throw new Error(`Unsupported literal kind ${ts19.SyntaxKind[node.kind]}`);
          }
          ts19.setTextRange(clone, { pos: -1, end: -1 });
          return clone;
        } else {
          return ts19.visitEachChild(node, visitNode, context);
        }
      };
      return (node) => ts19.visitNode(node, visitNode, ts19.isTypeNode);
    };
    return ts19.transform(type, [typeReferenceTransformer]).transformed[0];
  }
  emitTypeReference(type) {
    const translatedType = this.translator(type);
    if (translatedType === null) {
      throw new Error("Unable to emit an unresolved reference");
    }
    let typeArguments = void 0;
    if (type.typeArguments !== void 0) {
      typeArguments = ts19.factory.createNodeArray(type.typeArguments.map((typeArg) => this.emitType(typeArg)));
    }
    return ts19.factory.updateTypeReferenceNode(type, translatedType.typeName, typeArguments);
  }
};

// packages/compiler-cli/src/ngtsc/translator/src/type_translator.js
import * as o from "@angular/compiler";
import ts21 from "typescript";

// packages/compiler-cli/src/ngtsc/translator/src/ts_util.js
import ts20 from "typescript";
function tsNumericExpression(value) {
  if (value < 0) {
    const operand = ts20.factory.createNumericLiteral(Math.abs(value));
    return ts20.factory.createPrefixUnaryExpression(ts20.SyntaxKind.MinusToken, operand);
  }
  return ts20.factory.createNumericLiteral(value);
}

// packages/compiler-cli/src/ngtsc/translator/src/type_translator.js
function translateType(type, contextFile, reflector, refEmitter, imports) {
  return type.visitType(new TypeTranslatorVisitor(imports, contextFile, reflector, refEmitter), new Context(false));
}
var TypeTranslatorVisitor = class {
  imports;
  contextFile;
  reflector;
  refEmitter;
  constructor(imports, contextFile, reflector, refEmitter) {
    this.imports = imports;
    this.contextFile = contextFile;
    this.reflector = reflector;
    this.refEmitter = refEmitter;
  }
  visitBuiltinType(type, context) {
    switch (type.name) {
      case o.BuiltinTypeName.Bool:
        return ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.BooleanKeyword);
      case o.BuiltinTypeName.Dynamic:
        return ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.AnyKeyword);
      case o.BuiltinTypeName.Int:
      case o.BuiltinTypeName.Number:
        return ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.NumberKeyword);
      case o.BuiltinTypeName.String:
        return ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.StringKeyword);
      case o.BuiltinTypeName.None:
        return ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.NeverKeyword);
      default:
        throw new Error(`Unsupported builtin type: ${o.BuiltinTypeName[type.name]}`);
    }
  }
  visitExpressionType(type, context) {
    const typeNode = this.translateExpression(type.value, context);
    if (type.typeParams === null) {
      return typeNode;
    }
    if (!ts21.isTypeReferenceNode(typeNode)) {
      throw new Error("An ExpressionType with type arguments must translate into a TypeReferenceNode");
    } else if (typeNode.typeArguments !== void 0) {
      throw new Error(`An ExpressionType with type arguments cannot have multiple levels of type arguments`);
    }
    const typeArgs = type.typeParams.map((param) => this.translateType(param, context));
    return ts21.factory.createTypeReferenceNode(typeNode.typeName, typeArgs);
  }
  visitArrayType(type, context) {
    return ts21.factory.createArrayTypeNode(this.translateType(type.of, context));
  }
  visitMapType(type, context) {
    const parameter = ts21.factory.createParameterDeclaration(void 0, void 0, "key", void 0, ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.StringKeyword));
    const typeArgs = type.valueType !== null ? this.translateType(type.valueType, context) : ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.UnknownKeyword);
    const indexSignature = ts21.factory.createIndexSignature(void 0, [parameter], typeArgs);
    return ts21.factory.createTypeLiteralNode([indexSignature]);
  }
  visitTransplantedType(ast, context) {
    const node = ast.type instanceof Reference ? ast.type.node : ast.type;
    if (!ts21.isTypeNode(node)) {
      throw new Error(`A TransplantedType must wrap a TypeNode`);
    }
    const viaModule = ast.type instanceof Reference ? ast.type.bestGuessOwningModule : null;
    const emitter = new TypeEmitter((typeRef) => this.translateTypeReference(typeRef, context, viaModule));
    return emitter.emitType(node);
  }
  visitReadVarExpr(ast, context) {
    if (ast.name === null) {
      throw new Error(`ReadVarExpr with no variable name in type`);
    }
    return ts21.factory.createTypeQueryNode(ts21.factory.createIdentifier(ast.name));
  }
  visitInvokeFunctionExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitTaggedTemplateLiteralExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitTemplateLiteralExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitTemplateLiteralElementExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitInstantiateExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitLiteralExpr(ast, context) {
    if (ast.value === null) {
      return ts21.factory.createLiteralTypeNode(ts21.factory.createNull());
    } else if (ast.value === void 0) {
      return ts21.factory.createKeywordTypeNode(ts21.SyntaxKind.UndefinedKeyword);
    } else if (typeof ast.value === "boolean") {
      return ts21.factory.createLiteralTypeNode(ast.value ? ts21.factory.createTrue() : ts21.factory.createFalse());
    } else if (typeof ast.value === "number") {
      return ts21.factory.createLiteralTypeNode(tsNumericExpression(ast.value));
    } else {
      return ts21.factory.createLiteralTypeNode(ts21.factory.createStringLiteral(ast.value));
    }
  }
  visitLocalizedString(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitExternalExpr(ast, context) {
    if (ast.value.moduleName === null || ast.value.name === null) {
      throw new Error(`Import unknown module or symbol`);
    }
    const typeName = this.imports.addImport({
      exportModuleSpecifier: ast.value.moduleName,
      exportSymbolName: ast.value.name,
      requestedFile: this.contextFile,
      asTypeReference: true
    });
    const typeArguments = ast.typeParams !== null ? ast.typeParams.map((type) => this.translateType(type, context)) : void 0;
    return ts21.factory.createTypeReferenceNode(typeName, typeArguments);
  }
  visitConditionalExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitDynamicImportExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitRegularExpressionLiteral(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitNotExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitFunctionExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitArrowFunctionExpr(ast, context) {
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
    return ts21.factory.createTupleTypeNode(values);
  }
  visitLiteralMapExpr(ast, context) {
    const entries = ast.entries.map((entry) => {
      if (entry instanceof o.LiteralMapSpreadAssignment) {
        throw new Error("Spread is not supported in this context");
      }
      const { key, quoted } = entry;
      const type = this.translateExpression(entry.value, context);
      return ts21.factory.createPropertySignature(
        /* modifiers */
        void 0,
        /* name */
        quoted ? ts21.factory.createStringLiteral(key) : key,
        /* questionToken */
        void 0,
        /* type */
        type
      );
    });
    return ts21.factory.createTypeLiteralNode(entries);
  }
  visitCommaExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitWrappedNodeExpr(ast, context) {
    const node = ast.node;
    if (ts21.isEntityName(node)) {
      return ts21.factory.createTypeReferenceNode(node);
    } else if (ts21.isTypeNode(node)) {
      return node;
    } else if (ts21.isLiteralExpression(node)) {
      return ts21.factory.createLiteralTypeNode(node);
    } else if (ts21.isTypeParameterDeclaration(node)) {
      return ts21.factory.createTypeReferenceNode(node.name);
    } else {
      throw new Error(`Unsupported WrappedNodeExpr in TypeTranslatorVisitor: ${ts21.SyntaxKind[node.kind]} in ${node.getSourceFile()?.fileName}`);
    }
  }
  visitTypeofExpr(ast, context) {
    const typeNode = this.translateExpression(ast.expr, context);
    if (!ts21.isTypeReferenceNode(typeNode)) {
      throw new Error(`The target of a typeof expression must be a type reference, but it was
          ${ts21.SyntaxKind[typeNode.kind]}`);
    }
    return ts21.factory.createTypeQueryNode(typeNode.typeName);
  }
  visitVoidExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitParenthesizedExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitSpreadElementExpr(ast, context) {
    const typeNode = this.translateExpression(ast.expression, context);
    return ts21.factory.createRestTypeNode(typeNode);
  }
  translateType(type, context) {
    const typeNode = type.visitType(this, context);
    if (!ts21.isTypeNode(typeNode)) {
      throw new Error(`A Type must translate to a TypeNode, but was ${ts21.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateExpression(expr, context) {
    const typeNode = expr.visitExpression(this, context);
    if (!ts21.isTypeNode(typeNode)) {
      throw new Error(`An Expression must translate to a TypeNode, but was ${ts21.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateTypeReference(type, context, viaModule) {
    const target = ts21.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
    const declaration = this.reflector.getDeclarationOfIdentifier(target);
    if (declaration === null) {
      throw new Error(`Unable to statically determine the declaration file of type node ${target.text}`);
    }
    let owningModule = viaModule;
    if (typeof declaration.viaModule === "string") {
      owningModule = {
        specifier: declaration.viaModule,
        resolutionContext: type.getSourceFile().fileName
      };
    }
    const reference = new Reference(declaration.node, declaration.viaModule === AmbientImport ? AmbientImport : owningModule);
    const emittedType = this.refEmitter.emit(reference, this.contextFile, ImportFlags.NoAliasing | ImportFlags.AllowTypeImports | ImportFlags.AllowAmbientReferences);
    assertSuccessfulReferenceEmit(emittedType, target, "type");
    const typeNode = this.translateExpression(emittedType.expression, context);
    if (!ts21.isTypeReferenceNode(typeNode)) {
      throw new Error(`Expected TypeReferenceNode for emitted reference, got ${ts21.SyntaxKind[typeNode.kind]}.`);
    }
    return typeNode;
  }
};

// packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.js
import ts22 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var TypeScriptAstFactory = class {
  annotateForClosureCompiler;
  externalSourceFiles = /* @__PURE__ */ new Map();
  UNARY_OPERATORS = (() => ({
    "+": ts22.SyntaxKind.PlusToken,
    "-": ts22.SyntaxKind.MinusToken,
    "!": ts22.SyntaxKind.ExclamationToken
  }))();
  BINARY_OPERATORS = (() => ({
    "&&": ts22.SyntaxKind.AmpersandAmpersandToken,
    ">": ts22.SyntaxKind.GreaterThanToken,
    ">=": ts22.SyntaxKind.GreaterThanEqualsToken,
    "&": ts22.SyntaxKind.AmpersandToken,
    "|": ts22.SyntaxKind.BarToken,
    "/": ts22.SyntaxKind.SlashToken,
    "==": ts22.SyntaxKind.EqualsEqualsToken,
    "===": ts22.SyntaxKind.EqualsEqualsEqualsToken,
    "<": ts22.SyntaxKind.LessThanToken,
    "<=": ts22.SyntaxKind.LessThanEqualsToken,
    "-": ts22.SyntaxKind.MinusToken,
    "%": ts22.SyntaxKind.PercentToken,
    "*": ts22.SyntaxKind.AsteriskToken,
    "**": ts22.SyntaxKind.AsteriskAsteriskToken,
    "!=": ts22.SyntaxKind.ExclamationEqualsToken,
    "!==": ts22.SyntaxKind.ExclamationEqualsEqualsToken,
    "||": ts22.SyntaxKind.BarBarToken,
    "+": ts22.SyntaxKind.PlusToken,
    "??": ts22.SyntaxKind.QuestionQuestionToken,
    "=": ts22.SyntaxKind.EqualsToken,
    "+=": ts22.SyntaxKind.PlusEqualsToken,
    "-=": ts22.SyntaxKind.MinusEqualsToken,
    "*=": ts22.SyntaxKind.AsteriskEqualsToken,
    "/=": ts22.SyntaxKind.SlashEqualsToken,
    "%=": ts22.SyntaxKind.PercentEqualsToken,
    "**=": ts22.SyntaxKind.AsteriskAsteriskEqualsToken,
    "&&=": ts22.SyntaxKind.AmpersandAmpersandEqualsToken,
    "||=": ts22.SyntaxKind.BarBarEqualsToken,
    "??=": ts22.SyntaxKind.QuestionQuestionEqualsToken,
    "in": ts22.SyntaxKind.InKeyword,
    "instanceof": ts22.SyntaxKind.InstanceOfKeyword
  }))();
  VAR_TYPES = (() => ({
    "const": ts22.NodeFlags.Const,
    "let": ts22.NodeFlags.Let,
    "var": ts22.NodeFlags.None
  }))();
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
  }
  attachComments = attachComments;
  createArrayLiteral = ts22.factory.createArrayLiteralExpression;
  createAssignment(target, operator, value) {
    return ts22.factory.createBinaryExpression(target, this.BINARY_OPERATORS[operator], value);
  }
  createBinaryExpression(leftOperand, operator, rightOperand) {
    return ts22.factory.createBinaryExpression(leftOperand, this.BINARY_OPERATORS[operator], rightOperand);
  }
  createBlock(body) {
    return ts22.factory.createBlock(body);
  }
  createCallExpression(callee, args, pure) {
    const call = ts22.factory.createCallExpression(callee, void 0, args);
    if (pure) {
      ts22.addSyntheticLeadingComment(
        call,
        ts22.SyntaxKind.MultiLineCommentTrivia,
        this.annotateForClosureCompiler ? PureAnnotation.CLOSURE : PureAnnotation.TERSER,
        /* trailing newline */
        false
      );
    }
    return call;
  }
  createConditional(condition, whenTrue, whenFalse) {
    return ts22.factory.createConditionalExpression(condition, void 0, whenTrue, void 0, whenFalse);
  }
  createElementAccess = ts22.factory.createElementAccessExpression;
  createExpressionStatement = ts22.factory.createExpressionStatement;
  createDynamicImport(url) {
    return ts22.factory.createCallExpression(
      ts22.factory.createToken(ts22.SyntaxKind.ImportKeyword),
      /* type */
      void 0,
      [typeof url === "string" ? ts22.factory.createStringLiteral(url) : url]
    );
  }
  createFunctionDeclaration(functionName, parameters, body) {
    if (!ts22.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts22.SyntaxKind[body.kind]}.`);
    }
    return ts22.factory.createFunctionDeclaration(void 0, void 0, functionName, void 0, parameters.map((param) => this.createParameter(param)), void 0, body);
  }
  createFunctionExpression(functionName, parameters, body) {
    if (!ts22.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts22.SyntaxKind[body.kind]}.`);
    }
    return ts22.factory.createFunctionExpression(void 0, void 0, functionName ?? void 0, void 0, parameters.map((param) => this.createParameter(param)), void 0, body);
  }
  createArrowFunctionExpression(parameters, body) {
    if (ts22.isStatement(body) && !ts22.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts22.SyntaxKind[body.kind]}.`);
    }
    return ts22.factory.createArrowFunction(void 0, void 0, parameters.map((param) => this.createParameter(param)), void 0, void 0, body);
  }
  createParameter(param) {
    return ts22.factory.createParameterDeclaration(void 0, void 0, param.name, void 0, param.type ?? void 0);
  }
  createIdentifier = ts22.factory.createIdentifier;
  createIfStatement(condition, thenStatement, elseStatement) {
    return ts22.factory.createIfStatement(condition, thenStatement, elseStatement ?? void 0);
  }
  createLiteral(value) {
    if (value === void 0) {
      return ts22.factory.createIdentifier("undefined");
    } else if (value === null) {
      return ts22.factory.createNull();
    } else if (typeof value === "boolean") {
      return value ? ts22.factory.createTrue() : ts22.factory.createFalse();
    } else if (typeof value === "number") {
      return tsNumericExpression(value);
    } else {
      return ts22.factory.createStringLiteral(value);
    }
  }
  createNewExpression(expression, args) {
    return ts22.factory.createNewExpression(expression, void 0, args);
  }
  createObjectLiteral(properties) {
    return ts22.factory.createObjectLiteralExpression(properties.map((prop) => {
      if (prop.kind === "spread") {
        return ts22.factory.createSpreadAssignment(prop.expression);
      }
      return ts22.factory.createPropertyAssignment(prop.quoted ? ts22.factory.createStringLiteral(prop.propertyName) : ts22.factory.createIdentifier(prop.propertyName), prop.value);
    }));
  }
  createParenthesizedExpression = ts22.factory.createParenthesizedExpression;
  createPropertyAccess = ts22.factory.createPropertyAccessExpression;
  createSpreadElement = ts22.factory.createSpreadElement;
  createReturnStatement(expression) {
    return ts22.factory.createReturnStatement(expression ?? void 0);
  }
  createTaggedTemplate(tag, template) {
    return ts22.factory.createTaggedTemplateExpression(tag, void 0, this.createTemplateLiteral(template));
  }
  createTemplateLiteral(template) {
    let templateLiteral;
    const length = template.elements.length;
    const head = template.elements[0];
    if (length === 1) {
      templateLiteral = ts22.factory.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
    } else {
      const spans = [];
      for (let i = 1; i < length - 1; i++) {
        const { cooked, raw, range } = template.elements[i];
        const middle = createTemplateMiddle(cooked, raw);
        if (range !== null) {
          this.setSourceMapRange(middle, range);
        }
        spans.push(ts22.factory.createTemplateSpan(template.expressions[i - 1], middle));
      }
      const resolvedExpression = template.expressions[length - 2];
      const templatePart = template.elements[length - 1];
      const templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
      if (templatePart.range !== null) {
        this.setSourceMapRange(templateTail, templatePart.range);
      }
      spans.push(ts22.factory.createTemplateSpan(resolvedExpression, templateTail));
      templateLiteral = ts22.factory.createTemplateExpression(ts22.factory.createTemplateHead(head.cooked, head.raw), spans);
    }
    if (head.range !== null) {
      this.setSourceMapRange(templateLiteral, head.range);
    }
    return templateLiteral;
  }
  createThrowStatement = ts22.factory.createThrowStatement;
  createTypeOfExpression = ts22.factory.createTypeOfExpression;
  createVoidExpression = ts22.factory.createVoidExpression;
  createUnaryExpression(operator, operand) {
    return ts22.factory.createPrefixUnaryExpression(this.UNARY_OPERATORS[operator], operand);
  }
  createVariableDeclaration(variableName, initializer, variableType, type) {
    return ts22.factory.createVariableStatement(void 0, ts22.factory.createVariableDeclarationList([
      ts22.factory.createVariableDeclaration(variableName, void 0, type ?? void 0, initializer ?? void 0)
    ], this.VAR_TYPES[variableType]));
  }
  createRegularExpressionLiteral(body, flags) {
    return ts22.factory.createRegularExpressionLiteral(`/${body}/${flags ?? ""}`);
  }
  setSourceMapRange(node, sourceMapRange) {
    if (sourceMapRange === null) {
      return node;
    }
    const url = sourceMapRange.url;
    if (!this.externalSourceFiles.has(url)) {
      this.externalSourceFiles.set(url, ts22.createSourceMapSource(url, sourceMapRange.content, (pos) => pos));
    }
    const source = this.externalSourceFiles.get(url);
    ts22.setSourceMapRange(node, {
      pos: sourceMapRange.start.offset,
      end: sourceMapRange.end.offset,
      source
    });
    return node;
  }
  createBuiltInType(type) {
    switch (type) {
      case "any":
        return ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.AnyKeyword);
      case "boolean":
        return ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.BooleanKeyword);
      case "number":
        return ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.NumberKeyword);
      case "string":
        return ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.StringKeyword);
      case "function":
        return ts22.factory.createTypeReferenceNode(ts22.factory.createIdentifier("Function"));
      case "never":
        return ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.NeverKeyword);
      case "unknown":
        return ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.UnknownKeyword);
    }
  }
  createExpressionType(expression, typeParams) {
    const typeName = getEntityTypeFromExpression(expression);
    return ts22.factory.createTypeReferenceNode(typeName, typeParams ?? void 0);
  }
  createArrayType(elementType) {
    return ts22.factory.createArrayTypeNode(elementType);
  }
  createMapType(valueType) {
    return ts22.factory.createTypeLiteralNode([
      ts22.factory.createIndexSignature(void 0, [
        ts22.factory.createParameterDeclaration(void 0, void 0, "key", void 0, ts22.factory.createKeywordTypeNode(ts22.SyntaxKind.StringKeyword))
      ], valueType)
    ]);
  }
  transplantType(type) {
    if (typeof type.kind === "number" && typeof type.getSourceFile === "function" && ts22.isTypeNode(type)) {
      return type;
    }
    throw new Error("Attempting to transplant a type node from a non-TypeScript AST: " + type);
  }
};
function createTemplateMiddle(cooked, raw) {
  const node = ts22.factory.createTemplateHead(cooked, raw);
  node.kind = ts22.SyntaxKind.TemplateMiddle;
  return node;
}
function createTemplateTail(cooked, raw) {
  const node = ts22.factory.createTemplateHead(cooked, raw);
  node.kind = ts22.SyntaxKind.TemplateTail;
  return node;
}
function attachComments(statement, leadingComments) {
  for (const comment of leadingComments) {
    const commentKind = comment.multiline ? ts22.SyntaxKind.MultiLineCommentTrivia : ts22.SyntaxKind.SingleLineCommentTrivia;
    if (comment.multiline) {
      ts22.addSyntheticLeadingComment(statement, commentKind, comment.toString(), comment.trailingNewline);
    } else {
      for (const line of comment.toString().split("\n")) {
        ts22.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
      }
    }
  }
}
function getEntityTypeFromExpression(expression) {
  if (ts22.isIdentifier(expression)) {
    return expression;
  }
  if (ts22.isPropertyAccessExpression(expression)) {
    const left = getEntityTypeFromExpression(expression.expression);
    if (!ts22.isIdentifier(expression.name)) {
      throw new Error(`Unsupported property access for type reference: ${expression.name.text}`);
    }
    return ts22.factory.createQualifiedName(left, expression.name);
  }
  throw new Error(`Unsupported expression for type reference: ${ts22.SyntaxKind[expression.kind]}`);
}

// packages/compiler-cli/src/ngtsc/translator/src/typescript_translator.js
function translateExpression(contextFile, expression, imports, options = {}) {
  return expression.visitExpression(new ExpressionTranslatorVisitor(new TypeScriptAstFactory(options.annotateForClosureCompiler === true), imports, contextFile, options), new Context(false));
}
function translateStatement(contextFile, statement, imports, options = {}) {
  return statement.visitStatement(new ExpressionTranslatorVisitor(new TypeScriptAstFactory(options.annotateForClosureCompiler === true), imports, contextFile, options), new Context(true));
}

// packages/compiler-cli/src/ngtsc/typecheck/src/comments.js
import { AbsoluteSourceSpan } from "@angular/compiler";
import ts23 from "typescript";
var parseSpanComment = /^(\d+),(\d+)$/;
function readSpanComment(node, sourceFile = node.getSourceFile()) {
  return ts23.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts23.SyntaxKind.MultiLineCommentTrivia) {
      return null;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    const match = commentText.match(parseSpanComment);
    if (match === null) {
      return null;
    }
    return new AbsoluteSourceSpan(+match[1], +match[2]);
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
  ExpressionIdentifier2["HOST_DIRECTIVE"] = "HOSTDIR";
  ExpressionIdentifier2["COMPONENT_COMPLETION"] = "COMPCOMP";
  ExpressionIdentifier2["EVENT_PARAMETER"] = "EP";
  ExpressionIdentifier2["VARIABLE_AS_EXPRESSION"] = "VAE";
})(ExpressionIdentifier || (ExpressionIdentifier = {}));
var IGNORE_FOR_DIAGNOSTICS_MARKER = `${CommentTriviaType.DIAGNOSTIC}:ignore`;
function hasIgnoreForDiagnosticsMarker(node, sourceFile) {
  return ts23.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts23.SyntaxKind.MultiLineCommentTrivia) {
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
    if (opts.withSpan instanceof AbsoluteSourceSpan) {
      withSpan = opts.withSpan;
    } else {
      withSpan = { start: opts.withSpan.start.offset, end: opts.withSpan.end.offset };
    }
  }
  return withSpan;
}
function findFirstMatchingNode(tcb, opts) {
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
  return tcb.forEachChild(visitor) ?? null;
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
  return ts23.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts23.SyntaxKind.MultiLineCommentTrivia) {
      return false;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    const prefix = `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${identifier}`;
    return commentText === prefix || commentText.startsWith(prefix + ":");
  }) || false;
}
function readDirectiveIdFromComment(sourceFile, node) {
  let id = null;
  ts23.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts23.SyntaxKind.MultiLineCommentTrivia) {
      return;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    const prefix = `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${ExpressionIdentifier.DIRECTIVE}:`;
    const hostPrefix = `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${ExpressionIdentifier.HOST_DIRECTIVE}:`;
    let matchedPrefix = null;
    if (commentText.startsWith(prefix)) {
      matchedPrefix = prefix;
    } else if (commentText.startsWith(hostPrefix)) {
      matchedPrefix = hostPrefix;
    }
    if (matchedPrefix !== null) {
      const idStr = commentText.substring(matchedPrefix.length);
      const parsed = parseInt(idStr, 10);
      if (!isNaN(parsed)) {
        id = parsed;
      }
    }
  });
  return id;
}

// packages/compiler-cli/src/ngtsc/typecheck/api/checker.js
var OptimizeFor;
(function(OptimizeFor2) {
  OptimizeFor2[OptimizeFor2["SingleFile"] = 0] = "SingleFile";
  OptimizeFor2[OptimizeFor2["WholeProgram"] = 1] = "WholeProgram";
})(OptimizeFor || (OptimizeFor = {}));

// packages/compiler-cli/src/ngtsc/typecheck/api/scope.js
var PotentialImportKind;
(function(PotentialImportKind2) {
  PotentialImportKind2[PotentialImportKind2["NgModule"] = 0] = "NgModule";
  PotentialImportKind2[PotentialImportKind2["Standalone"] = 1] = "Standalone";
})(PotentialImportKind || (PotentialImportKind = {}));
var PotentialImportMode;
(function(PotentialImportMode2) {
  PotentialImportMode2[PotentialImportMode2["Normal"] = 0] = "Normal";
  PotentialImportMode2[PotentialImportMode2["ForceDirect"] = 1] = "ForceDirect";
})(PotentialImportMode || (PotentialImportMode = {}));

// packages/compiler-cli/src/ngtsc/typecheck/api/symbols.js
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
  SymbolKind2[SymbolKind2["LetDeclaration"] = 11] = "LetDeclaration";
  SymbolKind2[SymbolKind2["SelectorlessComponent"] = 12] = "SelectorlessComponent";
  SymbolKind2[SymbolKind2["SelectorlessDirective"] = 13] = "SelectorlessDirective";
})(SymbolKind || (SymbolKind = {}));

// packages/compiler-cli/src/ngtsc/typecheck/api/oob.js
var OutOfBadDiagnosticCategory;
(function(OutOfBadDiagnosticCategory2) {
  OutOfBadDiagnosticCategory2[OutOfBadDiagnosticCategory2["Error"] = 0] = "Error";
  OutOfBadDiagnosticCategory2[OutOfBadDiagnosticCategory2["Warning"] = 1] = "Warning";
})(OutOfBadDiagnosticCategory || (OutOfBadDiagnosticCategory = {}));

// packages/compiler-cli/src/ngtsc/typecheck/api/completion.js
var CompletionKind;
(function(CompletionKind2) {
  CompletionKind2[CompletionKind2["Reference"] = 0] = "Reference";
  CompletionKind2[CompletionKind2["Variable"] = 1] = "Variable";
  CompletionKind2[CompletionKind2["LetDeclaration"] = 2] = "LetDeclaration";
})(CompletionKind || (CompletionKind = {}));

// packages/compiler-cli/src/ngtsc/typecheck/src/host_bindings.js
import { BindingType, CssSelector, makeBindingParser, TmplAstBoundAttribute, TmplAstBoundEvent, TmplAstHostElement, AbsoluteSourceSpan as AbsoluteSourceSpan2, ParseSpan, PropertyRead, ParsedEventType, Call, ThisReceiver, KeyedRead, LiteralPrimitive, RecursiveAstVisitor, ASTWithName, SafeCall, ImplicitReceiver } from "@angular/compiler";
import ts24 from "typescript";
var GUARD_COMMENT_TEXT = "hostBindingsBlockGuard";
function createHostElement(type, selector, nameSpan, hostObjectLiteralBindings, hostBindingDecorators, hostListenerDecorators) {
  const bindings = [];
  const listeners = [];
  let parser = null;
  for (const binding of hostObjectLiteralBindings) {
    parser ??= makeBindingParser();
    createNodeFromHostLiteralProperty(binding, parser, bindings, listeners);
  }
  for (const decorator of hostBindingDecorators) {
    createNodeFromBindingDecorator(decorator, bindings);
  }
  for (const decorator of hostListenerDecorators) {
    parser ??= makeBindingParser();
    createNodeFromListenerDecorator(decorator, parser, listeners);
  }
  if (bindings.length === 0 && listeners.length === 0) {
    return null;
  }
  const tagNames = [];
  if (selector !== null) {
    const parts = CssSelector.parse(selector);
    for (const part of parts) {
      if (part.element !== null) {
        tagNames.push(part.element);
      }
    }
  }
  if (tagNames.length === 0) {
    tagNames.push(`ng-${type}`);
  }
  return new TmplAstHostElement(tagNames, bindings, listeners, nameSpan);
}
function createHostBindingsBlockGuard() {
  return `(true /*${GUARD_COMMENT_TEXT}*/)`;
}
function isHostBindingsBlockGuard(node) {
  if (!ts24.isIfStatement(node)) {
    return false;
  }
  const expr = node.expression;
  if (!ts24.isParenthesizedExpression(expr) || expr.expression.kind !== ts24.SyntaxKind.TrueKeyword) {
    return false;
  }
  const text = expr.getSourceFile().text;
  return ts24.forEachTrailingCommentRange(text, expr.expression.getEnd(), (pos, end, kind) => kind === ts24.SyntaxKind.MultiLineCommentTrivia && text.substring(pos + 2, end - 2) === GUARD_COMMENT_TEXT) || false;
}
function createNodeFromHostLiteralProperty(binding, parser, bindings, listeners) {
  const { key, value, sourceSpan } = binding;
  if (key.kind !== "string" || value.kind !== "string") {
    return;
  }
  if (key.text.startsWith("[") && key.text.endsWith("]")) {
    const { attrName, type } = inferBoundAttribute(key.text.slice(1, -1));
    const ast = parser.parseBinding(value.text, true, value.sourceSpan, value.sourceSpan.start.offset);
    if (ast.errors.length > 0) {
      return;
    }
    fixupSpans(ast, value);
    bindings.push(new TmplAstBoundAttribute(attrName, type, 0, ast, null, sourceSpan, key.sourceSpan, value.sourceSpan, void 0));
  } else if (key.text.startsWith("(") && key.text.endsWith(")")) {
    const events = [];
    parser.parseEvent(key.text.slice(1, -1), value.text, false, sourceSpan, value.sourceSpan, [], events, key.sourceSpan);
    if (events.length === 0 || events[0].handler.errors.length > 0) {
      return;
    }
    fixupSpans(events[0].handler, value);
    listeners.push(TmplAstBoundEvent.fromParsedEvent(events[0]));
  }
}
function createNodeFromBindingDecorator(decorator, bindings) {
  const args = decorator.arguments;
  let nameNode;
  if (args.length === 0) {
    nameNode = decorator.memberName;
  } else if (args[0].kind === "string") {
    nameNode = args[0];
  } else {
    return;
  }
  if (nameNode.kind !== "string" && nameNode.kind !== "identifier") {
    return;
  }
  const span = new ParseSpan(-1, -1);
  const propertyStart = decorator.memberSpan.start.offset;
  const receiver = new ThisReceiver(span, new AbsoluteSourceSpan2(propertyStart, propertyStart));
  const nameSpan = new AbsoluteSourceSpan2(nameNode.sourceSpan.start.offset, nameNode.sourceSpan.end.offset);
  const read = decorator.memberName.kind === "string" ? new KeyedRead(span, nameSpan, receiver, new LiteralPrimitive(span, nameSpan, decorator.memberName.text)) : new PropertyRead(span, nameSpan, nameSpan, receiver, decorator.memberName.text);
  const { attrName, type } = inferBoundAttribute(nameNode.text);
  bindings.push(new TmplAstBoundAttribute(attrName, type, 0, read, null, decorator.decoratorSpan, nameNode.sourceSpan, decorator.decoratorSpan, void 0));
}
function createNodeFromListenerDecorator(decorator, parser, listeners) {
  if (decorator.eventName === null || decorator.eventName.kind !== "string") {
    return;
  }
  const dummySpan = new ParseSpan(-1, -1);
  const argNodes = [];
  const methodStart = decorator.memberSpan.start.offset;
  const methodReceiver = new ThisReceiver(dummySpan, new AbsoluteSourceSpan2(methodStart, methodStart));
  const nameSpan = new AbsoluteSourceSpan2(decorator.memberName.sourceSpan.start.offset, decorator.memberName.sourceSpan.end.offset);
  const receiver = decorator.memberName.kind === "string" ? new KeyedRead(dummySpan, nameSpan, methodReceiver, new LiteralPrimitive(dummySpan, nameSpan, decorator.memberName.text)) : new PropertyRead(dummySpan, nameSpan, nameSpan, methodReceiver, decorator.memberName.text);
  for (const arg of decorator.arguments) {
    if (arg.kind === "string") {
      const span = arg.sourceSpan;
      const ast = parser.parseBinding(arg.text, true, span, span.start.offset);
      fixupSpans(ast, arg);
      argNodes.push(ast);
    } else {
      const expressionSpan = new AbsoluteSourceSpan2(arg.sourceSpan.start.offset, arg.sourceSpan.end.offset);
      const anyRead = new PropertyRead(dummySpan, expressionSpan, expressionSpan, new ImplicitReceiver(dummySpan, expressionSpan), "$any");
      const anyCall = new Call(dummySpan, expressionSpan, anyRead, [new LiteralPrimitive(dummySpan, expressionSpan, 0)], expressionSpan);
      argNodes.push(anyCall);
    }
  }
  const callNode = new Call(dummySpan, nameSpan, receiver, argNodes, dummySpan);
  const eventNameNode = decorator.eventName;
  let type;
  let eventName;
  let phase;
  let target;
  if (eventNameNode.text.startsWith("@")) {
    const parsedName = parser.parseLegacyAnimationEventName(eventNameNode.text);
    type = ParsedEventType.LegacyAnimation;
    eventName = parsedName.eventName;
    phase = parsedName.phase;
    target = null;
  } else {
    const parsedName = parser.parseEventListenerName(eventNameNode.text);
    type = ParsedEventType.Regular;
    eventName = parsedName.eventName;
    target = parsedName.target;
    phase = null;
  }
  listeners.push(new TmplAstBoundEvent(eventName, type, callNode, target, phase, decorator.decoratorSpan, decorator.decoratorSpan, eventNameNode.sourceSpan));
}
function inferBoundAttribute(name) {
  const attrPrefix = "attr.";
  const classPrefix = "class.";
  const stylePrefix = "style.";
  const animationPrefix = "animate.";
  const legacyAnimationPrefix = "@";
  let attrName;
  let type;
  if (name.startsWith(attrPrefix)) {
    attrName = name.slice(attrPrefix.length);
    type = BindingType.Attribute;
  } else if (name.startsWith(classPrefix)) {
    attrName = name.slice(classPrefix.length);
    type = BindingType.Class;
  } else if (name.startsWith(stylePrefix)) {
    attrName = name.slice(stylePrefix.length);
    type = BindingType.Style;
  } else if (name.startsWith(animationPrefix)) {
    attrName = name;
    type = BindingType.Animation;
  } else if (name.startsWith(legacyAnimationPrefix)) {
    attrName = name.slice(legacyAnimationPrefix.length);
    type = BindingType.LegacyAnimation;
  } else {
    attrName = name;
    type = BindingType.Property;
  }
  return { attrName, type };
}
function fixupSpans(ast, node) {
  const escapeIndex = node.source.indexOf("\\", 1);
  if (escapeIndex > -1) {
    const start = node.sourceSpan.start.offset;
    const end = node.sourceSpan.end.offset;
    const newSpan = new ParseSpan(0, end - start);
    const newSourceSpan = new AbsoluteSourceSpan2(start, end);
    ast.visit(new ReplaceSpanVisitor(escapeIndex, newSpan, newSourceSpan));
  }
}
var ReplaceSpanVisitor = class extends RecursiveAstVisitor {
  afterIndex;
  overrideSpan;
  overrideSourceSpan;
  constructor(afterIndex, overrideSpan, overrideSourceSpan) {
    super();
    this.afterIndex = afterIndex;
    this.overrideSpan = overrideSpan;
    this.overrideSourceSpan = overrideSourceSpan;
  }
  visit(ast) {
    if (ast.span.start >= this.afterIndex || ast.span.end >= this.afterIndex) {
      ast.span = this.overrideSpan;
      ast.sourceSpan = this.overrideSourceSpan;
      if (ast instanceof ASTWithName) {
        ast.nameSpan = this.overrideSourceSpan;
      }
      if (ast instanceof Call || ast instanceof SafeCall) {
        ast.argumentSpan = this.overrideSourceSpan;
      }
    }
    super.visit(ast);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/context.js
var TcbGenericContextBehavior;
(function(TcbGenericContextBehavior2) {
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["UseEmitter"] = 0] = "UseEmitter";
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["CopyClassNodes"] = 1] = "CopyClassNodes";
  TcbGenericContextBehavior2[TcbGenericContextBehavior2["FallbackToAny"] = 2] = "FallbackToAny";
})(TcbGenericContextBehavior || (TcbGenericContextBehavior = {}));
var Context2 = class {
  env;
  domSchemaChecker;
  oobRecorder;
  id;
  boundTarget;
  pipes;
  schemas;
  hostIsStandalone;
  hostPreserveWhitespaces;
  nextId = 1;
  constructor(env, domSchemaChecker, oobRecorder, id, boundTarget, pipes, schemas, hostIsStandalone, hostPreserveWhitespaces) {
    this.env = env;
    this.domSchemaChecker = domSchemaChecker;
    this.oobRecorder = oobRecorder;
    this.id = id;
    this.boundTarget = boundTarget;
    this.pipes = pipes;
    this.schemas = schemas;
    this.hostIsStandalone = hostIsStandalone;
    this.hostPreserveWhitespaces = hostPreserveWhitespaces;
  }
  /**
   * Allocate a new variable name for use within the `Context`.
   *
   * Currently this uses a monotonically increasing counter, but in the future the variable name
   * might change depending on the type of data being stored.
   */
  allocateId() {
    return `_t${this.nextId++}`;
  }
  getPipeByName(name) {
    if (this.pipes === null || !this.pipes.has(name)) {
      return null;
    }
    return this.pipes.get(name);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/dom.js
import { DomElementSchemaRegistry } from "@angular/compiler";
import ts26 from "typescript";

// packages/compiler-cli/src/ngtsc/typecheck/diagnostics/src/diagnostic.js
import ts25 from "typescript";
function makeTemplateDiagnostic(id, mapping, span, category, code, messageText, relatedMessages, deprecatedDiagInfo) {
  if (mapping.type === "direct") {
    let relatedInformation = [];
    if (relatedMessages !== void 0) {
      for (const relatedMessage of relatedMessages) {
        relatedInformation.push({
          category: ts25.DiagnosticCategory.Message,
          code: 0,
          file: relatedMessage.sourceFile,
          start: relatedMessage.start,
          length: relatedMessage.end - relatedMessage.start,
          messageText: relatedMessage.text
        });
      }
    }
    if (deprecatedDiagInfo !== void 0) {
      relatedInformation.push(...deprecatedDiagInfo.relatedMessages ?? []);
    }
    return {
      source: "ngtsc",
      code,
      category,
      messageText,
      file: mapping.node.getSourceFile(),
      sourceFile: mapping.node.getSourceFile(),
      typeCheckId: id,
      start: span.start.offset,
      length: span.end.offset - span.start.offset,
      relatedInformation,
      reportsDeprecated: deprecatedDiagInfo?.reportsDeprecated
    };
  } else if (mapping.type === "indirect" || mapping.type === "external") {
    const componentSf = mapping.componentClass.getSourceFile();
    const componentName = mapping.componentClass.name.text;
    const fileName = mapping.type === "indirect" ? `${componentSf.fileName} (${componentName} template)` : mapping.templateUrl;
    let relatedInformation = [];
    if (relatedMessages !== void 0) {
      for (const relatedMessage of relatedMessages) {
        relatedInformation.push({
          category: ts25.DiagnosticCategory.Message,
          code: 0,
          file: relatedMessage.sourceFile,
          start: relatedMessage.start,
          length: relatedMessage.end - relatedMessage.start,
          messageText: relatedMessage.text
        });
      }
    }
    let sf;
    try {
      sf = getParsedTemplateSourceFile(fileName, mapping);
    } catch (e) {
      const failureChain = makeDiagnosticChain(`Failed to report an error in '${fileName}' at ${span.start.line + 1}:${span.start.col + 1}`, [makeDiagnosticChain(e?.stack ?? `${e}`)]);
      return {
        source: "ngtsc",
        category,
        code,
        messageText: addDiagnosticChain(messageText, [failureChain]),
        file: componentSf,
        sourceFile: componentSf,
        typeCheckId: id,
        // mapping.node represents either the 'template' or 'templateUrl' expression. getStart()
        // and getEnd() are used because they don't include surrounding whitespace.
        start: mapping.node.getStart(),
        length: mapping.node.getEnd() - mapping.node.getStart(),
        relatedInformation,
        reportsDeprecated: deprecatedDiagInfo?.reportsDeprecated
      };
    }
    let typeForMessage;
    if (category === ts25.DiagnosticCategory.Warning) {
      typeForMessage = "Warning";
    } else if (category === ts25.DiagnosticCategory.Suggestion) {
      typeForMessage = "Suggestion";
    } else if (category === ts25.DiagnosticCategory.Message) {
      typeForMessage = "Message";
    } else {
      typeForMessage = "Error";
    }
    if (deprecatedDiagInfo !== void 0) {
      relatedInformation.push(...deprecatedDiagInfo.relatedMessages ?? []);
    }
    relatedInformation.push({
      category: ts25.DiagnosticCategory.Message,
      code: 0,
      file: componentSf,
      // mapping.node represents either the 'template' or 'templateUrl' expression. getStart()
      // and getEnd() are used because they don't include surrounding whitespace.
      start: mapping.node.getStart(),
      length: mapping.node.getEnd() - mapping.node.getStart(),
      messageText: `${typeForMessage} occurs in the template of component ${componentName}.`
    });
    return {
      source: "ngtsc",
      category,
      code,
      messageText,
      file: sf,
      sourceFile: componentSf,
      typeCheckId: id,
      start: span.start.offset,
      length: span.end.offset - span.start.offset,
      // Show a secondary message indicating the component whose template contains the error.
      relatedInformation,
      reportsDeprecated: deprecatedDiagInfo?.reportsDeprecated
    };
  } else {
    throw new Error(`Unexpected source mapping type: ${mapping.type}`);
  }
}
var TemplateSourceFile = Symbol("TemplateSourceFile");
function getParsedTemplateSourceFile(fileName, mapping) {
  if (mapping[TemplateSourceFile] === void 0) {
    mapping[TemplateSourceFile] = parseTemplateAsSourceFile(fileName, mapping.template);
  }
  return mapping[TemplateSourceFile];
}
var parseTemplateAsSourceFileForTest = null;
function parseTemplateAsSourceFile(fileName, template) {
  if (parseTemplateAsSourceFileForTest !== null) {
    return parseTemplateAsSourceFileForTest(fileName, template);
  }
  return ts25.createSourceFile(
    fileName,
    template,
    ts25.ScriptTarget.Latest,
    /* setParentNodes */
    false,
    ts25.ScriptKind.JSX
  );
}

// packages/compiler-cli/src/ngtsc/typecheck/diagnostics/src/id.js
var TYPE_CHECK_ID_MAP = Symbol("TypeCheckId");
function getTypeCheckId(clazz) {
  const sf = clazz.getSourceFile();
  if (sf[TYPE_CHECK_ID_MAP] === void 0) {
    sf[TYPE_CHECK_ID_MAP] = /* @__PURE__ */ new Map();
  }
  if (sf[TYPE_CHECK_ID_MAP].get(clazz) === void 0) {
    sf[TYPE_CHECK_ID_MAP].set(clazz, `tcb${sf[TYPE_CHECK_ID_MAP].size + 1}`);
  }
  return sf[TYPE_CHECK_ID_MAP].get(clazz);
}

// packages/compiler-cli/src/ngtsc/typecheck/src/dom.js
var REGISTRY = new DomElementSchemaRegistry();
var REMOVE_XHTML_REGEX = /^:xhtml:/;
var RegistryDomSchemaChecker = class {
  resolver;
  _diagnostics = [];
  get diagnostics() {
    return this._diagnostics;
  }
  constructor(resolver) {
    this.resolver = resolver;
  }
  checkElement(id, tagName, sourceSpanForDiagnostics, schemas, hostIsStandalone) {
    const name = tagName.replace(REMOVE_XHTML_REGEX, "");
    if (!REGISTRY.hasElement(name, schemas)) {
      const mapping = this.resolver.getTemplateSourceMapping(id);
      const schemas2 = `'${hostIsStandalone ? "@Component" : "@NgModule"}.schemas'`;
      let errorMsg = `'${name}' is not a known element:
`;
      errorMsg += `1. If '${name}' is an Angular component, then verify that it is ${hostIsStandalone ? "included in the '@Component.imports' of this component" : "part of this module"}.
`;
      if (name.indexOf("-") > -1) {
        errorMsg += `2. If '${name}' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the ${schemas2} of this component to suppress this message.`;
      } else {
        errorMsg += `2. To allow any element add 'NO_ERRORS_SCHEMA' to the ${schemas2} of this component.`;
      }
      const diag = makeTemplateDiagnostic(id, mapping, sourceSpanForDiagnostics, ts26.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ELEMENT), errorMsg);
      this._diagnostics.push(diag);
    }
  }
  checkTemplateElementProperty(id, tagName, name, span, schemas, hostIsStandalone) {
    if (!REGISTRY.hasProperty(tagName, name, schemas)) {
      const mapping = this.resolver.getTemplateSourceMapping(id);
      const decorator = hostIsStandalone ? "@Component" : "@NgModule";
      const schemas2 = `'${decorator}.schemas'`;
      let errorMsg = `Can't bind to '${name}' since it isn't a known property of '${tagName}'.`;
      if (tagName.startsWith("ng-")) {
        errorMsg += `
1. If '${name}' is an Angular directive, then add 'CommonModule' to the '${decorator}.imports' of this component.
2. To allow any property add 'NO_ERRORS_SCHEMA' to the ${schemas2} of this component.`;
      } else if (tagName.indexOf("-") > -1) {
        errorMsg += `
1. If '${tagName}' is an Angular component and it has '${name}' input, then verify that it is ${hostIsStandalone ? "included in the '@Component.imports' of this component" : "part of this module"}.
2. If '${tagName}' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the ${schemas2} of this component to suppress this message.
3. To allow any property add 'NO_ERRORS_SCHEMA' to the ${schemas2} of this component.`;
      }
      const diag = makeTemplateDiagnostic(id, mapping, span, ts26.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMsg);
      this._diagnostics.push(diag);
    }
  }
  checkHostElementProperty(id, element, name, span, schemas) {
    for (const tagName of element.tagNames) {
      if (REGISTRY.hasProperty(tagName, name, schemas)) {
        continue;
      }
      const errorMessage = `Can't bind to '${name}' since it isn't a known property of '${tagName}'.`;
      const mapping = this.resolver.getHostBindingsMapping(id);
      const diag = makeTemplateDiagnostic(id, mapping, span, ts26.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMessage);
      this._diagnostics.push(diag);
      break;
    }
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/reference_emit_environment.js
import { ExpressionType } from "@angular/compiler";
import ts28 from "typescript";

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/codegen.js
import { AbsoluteSourceSpan as AbsoluteSourceSpan3 } from "@angular/compiler";
import ts27 from "typescript";
var TcbExpr = class {
  source;
  /** Text for the content containing the expression's location information. */
  spanComment = null;
  /** Text for the content containing the expression's identifier. */
  identifierComment = null;
  /**
   * Text of the comment instructing the type checker to
   * ignore diagnostics coming from this expression.
   */
  ignoreComment = null;
  constructor(source) {
    this.source = source;
  }
  /**
   * Converts the node's current state to a string.
   * @param ignoreComments Whether the comments associated with the expression should be skipped.
   */
  print(ignoreComments = false) {
    if (ignoreComments) {
      return this.source;
    }
    return this.source + this.formatComment(this.identifierComment) + this.formatComment(this.ignoreComment) + this.formatComment(this.spanComment);
  }
  /**
   * Adds a synthetic comment to the expression that represents the parse span of the provided node.
   * This comment can later be retrieved as trivia of a node to recover original source locations.
   * @param span Span from the parser containing the location information.
   */
  addParseSpanInfo(span) {
    let start;
    let end;
    if (span instanceof AbsoluteSourceSpan3) {
      start = span.start;
      end = span.end;
    } else {
      start = span.start.offset;
      end = span.end.offset;
    }
    this.spanComment = `${start},${end}`;
    return this;
  }
  /** Marks the expression to be ignored for diagnostics. */
  markIgnoreDiagnostics() {
    this.ignoreComment = `${CommentTriviaType.DIAGNOSTIC}:ignore`;
    return this;
  }
  /**
   * Wraps the expression in parenthesis such that inserted
   * span comments become attached to the proper node.
   */
  wrapForTypeChecker() {
    this.source = `(${this.print()})`;
    this.spanComment = this.identifierComment = this.ignoreComment = null;
    return this;
  }
  /**
   * Tags the expression with an identifier.
   * @param identifier Identifier to apply to the expression.
   */
  addExpressionIdentifier(identifier, id) {
    this.identifierComment = `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${identifier}${id !== void 0 ? `:${id}` : ""}`;
    return this;
  }
  /**
   * `toString` implementation meant to catch errors like accidentally
   * writing `foo ${expr} bar` instead of `foo ${expr.print()} bar`.
   */
  toString() {
    throw new Error("Assertion error: TcbExpr should not be converted to a string through concatenation. Use the `print` method instead.");
  }
  /** Format a comment string as a TypeScript comment. */
  formatComment(content) {
    return content === null || content.length === 0 ? "" : ` /*${content}*/`;
  }
};
function declareVariable(identifier, type) {
  type.addExpressionIdentifier(ExpressionIdentifier.VARIABLE_AS_EXPRESSION);
  return new TcbExpr(`var ${identifier.print()} = null! as ${type.print()}`);
}
function getStatementsBlock(expressions, singleLine = false) {
  let result = "";
  for (const expr of expressions) {
    result += `${expr.print()};${singleLine ? " " : "\n"}`;
  }
  return result;
}
function quoteAndEscape(value) {
  return JSON.stringify(value);
}
var tempPrinter = null;
function tempPrint(node, sourceFile) {
  tempPrinter ??= ts27.createPrinter();
  return tempPrinter.printNode(ts27.EmitHint.Unspecified, node, sourceFile);
}

// packages/compiler-cli/src/ngtsc/typecheck/src/reference_emit_environment.js
var ReferenceEmitEnvironment = class {
  importManager;
  refEmitter;
  reflector;
  contextFile;
  constructor(importManager, refEmitter, reflector, contextFile) {
    this.importManager = importManager;
    this.refEmitter = refEmitter;
    this.reflector = reflector;
    this.contextFile = contextFile;
  }
  canReferenceType(ref, flags = ImportFlags.NoAliasing | ImportFlags.AllowTypeImports | ImportFlags.AllowRelativeDtsImports) {
    const result = this.refEmitter.emit(ref, this.contextFile, flags);
    return result.kind === ReferenceEmitKind.Success;
  }
  /**
   * Generate a `ts.TypeNode` that references the given node as a type.
   *
   * This may involve importing the node into the file if it's not declared there already.
   */
  referenceType(ref, flags = ImportFlags.NoAliasing | ImportFlags.AllowTypeImports | ImportFlags.AllowRelativeDtsImports) {
    const ngExpr = this.refEmitter.emit(ref, this.contextFile, flags);
    assertSuccessfulReferenceEmit(ngExpr, this.contextFile, "symbol");
    return translateType(new ExpressionType(ngExpr.expression), this.contextFile, this.reflector, this.refEmitter, this.importManager);
  }
  /**
   * Generates a `TcbExpr` from a `TcbReferenceMetadata` object.
   */
  referenceTcbValue(ref) {
    if (ref.unexportedDiagnostic !== null || ref.isLocal || ref.moduleName === null) {
      if (ref.unexportedDiagnostic !== null) {
        throw new FatalDiagnosticError(ErrorCode.IMPORT_GENERATION_FAILURE, this.contextFile, makeDiagnosticChain(`Unable to import symbol ${ref.name}.`, [
          makeDiagnosticChain(ref.unexportedDiagnostic)
        ]));
      }
      return new TcbExpr(ref.name);
    }
    return this.referenceExternalSymbol(ref.moduleName, ref.name);
  }
  referenceExternalSymbol(moduleName, name) {
    const importResult = this.importManager.addImport({
      exportModuleSpecifier: moduleName,
      exportSymbolName: name,
      requestedFile: this.contextFile
    });
    if (ts28.isIdentifier(importResult)) {
      return new TcbExpr(importResult.text);
    } else if (ts28.isIdentifier(importResult.expression)) {
      return new TcbExpr(`${importResult.expression.text}.${importResult.name.text}`);
    }
    throw new Error("Unexpected value returned by import manager");
  }
  /**
   * Generates a `ts.TypeNode` representing a type that is being referenced from a different place
   * in the program. Any type references inside the transplanted type will be rewritten so that
   * they can be imported in the context file.
   */
  referenceTransplantedType(type) {
    return translateType(type, this.contextFile, this.reflector, this.refEmitter, this.importManager);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/type_constructor.js
import { R3Identifiers as R3Identifiers2 } from "@angular/compiler";

// packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.js
import { R3Identifiers } from "@angular/compiler";
import ts30 from "typescript";

// packages/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter.js
import ts29 from "typescript";
var TypeParameterEmitter = class {
  typeParameters;
  reflector;
  constructor(typeParameters, reflector) {
    this.typeParameters = typeParameters;
    this.reflector = reflector;
  }
  /**
   * Determines whether the type parameters can be emitted. If this returns true, then a call to
   * `emit` is known to succeed. Vice versa, if false is returned then `emit` should not be
   * called, as it would fail.
   */
  canEmit(canEmitReference) {
    if (this.typeParameters === void 0) {
      return true;
    }
    return this.typeParameters.every((typeParam) => {
      return this.canEmitType(typeParam.constraint, canEmitReference) && this.canEmitType(typeParam.default, canEmitReference);
    });
  }
  canEmitType(type, canEmitReference) {
    if (type === void 0) {
      return true;
    }
    return canEmitType(type, (typeReference) => {
      const reference = this.resolveTypeReference(typeReference);
      if (reference === null) {
        return false;
      }
      if (reference instanceof Reference) {
        return canEmitReference(reference);
      }
      return true;
    });
  }
  /**
   * Emits the type parameters using the provided emitter function for `Reference`s.
   */
  emit(emitReference) {
    if (this.typeParameters === void 0) {
      return void 0;
    }
    const emitter = new TypeEmitter((type) => this.translateTypeReference(type, emitReference));
    return this.typeParameters.map((typeParam) => {
      const constraint = typeParam.constraint !== void 0 ? emitter.emitType(typeParam.constraint) : void 0;
      const defaultType = typeParam.default !== void 0 ? emitter.emitType(typeParam.default) : void 0;
      return ts29.factory.updateTypeParameterDeclaration(typeParam, typeParam.modifiers, typeParam.name, constraint, defaultType);
    });
  }
  resolveTypeReference(type) {
    const target = ts29.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
    const declaration = this.reflector.getDeclarationOfIdentifier(target);
    if (declaration === null || declaration.node === null) {
      return null;
    }
    if (this.isLocalTypeParameter(declaration.node)) {
      return type;
    }
    let owningModule = null;
    if (typeof declaration.viaModule === "string") {
      owningModule = {
        specifier: declaration.viaModule,
        resolutionContext: type.getSourceFile().fileName
      };
    }
    return new Reference(declaration.node, declaration.viaModule === AmbientImport ? AmbientImport : owningModule);
  }
  translateTypeReference(type, emitReference) {
    const reference = this.resolveTypeReference(type);
    if (!(reference instanceof Reference)) {
      return reference;
    }
    const typeNode = emitReference(reference);
    if (typeNode === null) {
      return null;
    }
    if (!ts29.isTypeReferenceNode(typeNode)) {
      throw new Error(`Expected TypeReferenceNode for emitted reference, got ${ts29.SyntaxKind[typeNode.kind]}.`);
    }
    return typeNode;
  }
  isLocalTypeParameter(decl) {
    return this.typeParameters.some((param) => param === decl);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.js
var TCB_FILE_IMPORT_GRAPH_PREPARE_IDENTIFIERS = [
  // Imports may be added for signal input checking. We wouldn't want to change the
  // import graph for incremental compilations when suddenly a signal input is used,
  // or removed.
  R3Identifiers.InputSignalBrandWriteType
];
var TcbInliningRequirement;
(function(TcbInliningRequirement2) {
  TcbInliningRequirement2[TcbInliningRequirement2["MustInline"] = 0] = "MustInline";
  TcbInliningRequirement2[TcbInliningRequirement2["ShouldInlineForGenericBounds"] = 1] = "ShouldInlineForGenericBounds";
  TcbInliningRequirement2[TcbInliningRequirement2["None"] = 2] = "None";
})(TcbInliningRequirement || (TcbInliningRequirement = {}));
function requiresInlineTypeCheckBlock(ref, env, usedPipes, reflector) {
  if (!env.canReferenceType(ref)) {
    return TcbInliningRequirement.MustInline;
  } else if (!checkIfGenericTypeBoundsCanBeEmitted(ref.node, reflector, env)) {
    return TcbInliningRequirement.ShouldInlineForGenericBounds;
  } else if (usedPipes.some((pipeRef) => !env.canReferenceType(pipeRef))) {
    return TcbInliningRequirement.MustInline;
  } else {
    return TcbInliningRequirement.None;
  }
}
function getSourceMapping(shimSf, position, resolver, isDiagnosticRequest) {
  const node = getTokenAtPosition(shimSf, position);
  const sourceLocation = findSourceLocation(node, shimSf, isDiagnosticRequest);
  if (sourceLocation === null) {
    return null;
  }
  if (isInHostBindingTcb(node)) {
    const hostSourceMapping = resolver.getHostBindingsMapping(sourceLocation.id);
    const span2 = resolver.toHostParseSourceSpan(sourceLocation.id, sourceLocation.span);
    if (span2 === null) {
      return null;
    }
    return { sourceLocation, sourceMapping: hostSourceMapping, span: span2 };
  }
  const span = resolver.toTemplateParseSourceSpan(sourceLocation.id, sourceLocation.span);
  if (span === null) {
    return null;
  }
  return {
    sourceLocation,
    sourceMapping: resolver.getTemplateSourceMapping(sourceLocation.id),
    span
  };
}
function isInHostBindingTcb(node) {
  let current = node;
  while (current && !ts30.isFunctionDeclaration(current)) {
    if (isHostBindingsBlockGuard(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}
function findTypeCheckBlock(file, id, isDiagnosticRequest) {
  for (const stmt of file.statements) {
    if (ts30.isFunctionDeclaration(stmt) && getTypeCheckId2(stmt, file, isDiagnosticRequest) === id) {
      return stmt;
    }
  }
  return findNodeInFile(file, (node) => ts30.isFunctionDeclaration(node) && getTypeCheckId2(node, file, isDiagnosticRequest) === id);
}
function findSourceLocation(node, sourceFile, isDiagnosticsRequest) {
  while (node !== void 0 && !ts30.isFunctionDeclaration(node)) {
    if (hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticsRequest) {
      return null;
    }
    const span = readSpanComment(node, sourceFile);
    if (span !== null) {
      const id = getTypeCheckId2(node, sourceFile, isDiagnosticsRequest);
      if (id === null) {
        return null;
      }
      return { id, span };
    }
    node = node.parent;
  }
  return null;
}
function getTypeCheckId2(node, sourceFile, isDiagnosticRequest) {
  while (!ts30.isFunctionDeclaration(node)) {
    if (hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticRequest) {
      return null;
    }
    node = node.parent;
    if (node === void 0) {
      return null;
    }
  }
  const start = node.getFullStart();
  return ts30.forEachLeadingCommentRange(sourceFile.text, start, (pos, end, kind) => {
    if (kind !== ts30.SyntaxKind.MultiLineCommentTrivia) {
      return null;
    }
    const commentText = sourceFile.text.substring(pos + 2, end - 2);
    return commentText;
  }) || null;
}
function ensureTypeCheckFilePreparationImports(env) {
  for (const identifier of TCB_FILE_IMPORT_GRAPH_PREPARE_IDENTIFIERS) {
    env.importManager.addImport({
      exportModuleSpecifier: identifier.moduleName,
      exportSymbolName: identifier.name,
      requestedFile: env.contextFile
    });
  }
}
function checkIfGenericTypeBoundsCanBeEmitted(node, reflector, env) {
  const emitter = new TypeParameterEmitter(node.typeParameters, reflector);
  return emitter.canEmit((ref) => env.canReferenceType(ref));
}
function findNodeInFile(file, predicate) {
  const visit = (node) => {
    if (predicate(node)) {
      return node;
    }
    return ts30.forEachChild(node, visit) ?? null;
  };
  return ts30.forEachChild(file, visit) ?? null;
}
function generateTcbTypeParameters(typeParameters, sourceFile) {
  return typeParameters.map((p) => {
    const representation = tempPrint(p, sourceFile);
    return {
      name: p.name.text,
      representation,
      representationWithDefault: p.default ? representation : `${representation} = any`
    };
  });
}

// packages/compiler-cli/src/ngtsc/typecheck/src/type_constructor.js
function generateTypeCtorDeclarationFn(env, meta, nodeTypeRef, typeParams) {
  const typeArgs = generateGenericArgs(typeParams);
  const typeRefWithGenerics = `${nodeTypeRef.print()}${typeArgs}`;
  const initParam = constructTypeCtorParameter(env, meta, nodeTypeRef.print(), typeRefWithGenerics);
  const typeParameters = typeParametersWithDefaultTypes(typeParams);
  let source;
  if (meta.body) {
    const fnType = `${typeParameters}(${initParam}) => ${typeRefWithGenerics}`;
    source = `const ${meta.fnName}: ${fnType} = null!`;
  } else {
    source = `declare function ${meta.fnName}${typeParameters}(${initParam}): ${typeRefWithGenerics}`;
  }
  return new TcbExpr(source);
}
function generateInlineTypeCtor(env, node, meta) {
  const typeRef = node.name.text;
  const sourceFile = node.getSourceFile();
  const tcbTypeParams = node.typeParameters && node.typeParameters.length > 0 ? generateTcbTypeParameters(node.typeParameters, sourceFile) : void 0;
  const typeRefWithGenerics = `${typeRef}${generateGenericArgs(tcbTypeParams)}`;
  const initParam = constructTypeCtorParameter(env, meta, typeRef, typeRefWithGenerics);
  const body = `{ return null!; }`;
  const typeParams = typeParametersWithDefaultTypes(tcbTypeParams);
  return `static ${meta.fnName}${typeParams}(${initParam}): ${typeRefWithGenerics} ${body}`;
}
function constructTypeCtorParameter(env, meta, typeRef, typeRefWithGenerics) {
  let initType = null;
  const plainKeys = [];
  const coercedKeys = [];
  const signalInputKeys = [];
  for (const { classPropertyName, transformType, isSignal } of meta.fields.inputs) {
    if (isSignal) {
      signalInputKeys.push(quoteAndEscape(classPropertyName));
    } else if (!meta.coercedInputFields.has(classPropertyName)) {
      plainKeys.push(quoteAndEscape(classPropertyName));
    } else {
      const coercionType = transformType !== void 0 ? transformType : `typeof ${typeRef}.ngAcceptInputType_${classPropertyName}`;
      coercedKeys.push(`${classPropertyName}: ${coercionType}`);
    }
  }
  if (plainKeys.length > 0) {
    initType = `Pick<${typeRefWithGenerics}, ${plainKeys.join(" | ")}>`;
  }
  if (coercedKeys.length > 0) {
    let coercedLiteral = "{\n";
    for (const key of coercedKeys) {
      coercedLiteral += `${key};
`;
    }
    coercedLiteral += "}";
    initType = initType !== null ? `${initType} & ${coercedLiteral}` : coercedLiteral;
  }
  if (signalInputKeys.length > 0) {
    const keyTypeUnion = signalInputKeys.join(" | ");
    const unwrapRef = env.referenceExternalSymbol(R3Identifiers2.UnwrapDirectiveSignalInputs.moduleName, R3Identifiers2.UnwrapDirectiveSignalInputs.name);
    const unwrapExpr = `${unwrapRef.print()}<${typeRefWithGenerics}, ${keyTypeUnion}>`;
    initType = initType !== null ? `${initType} & ${unwrapExpr}` : unwrapExpr;
  }
  if (initType === null) {
    initType = "{}";
  }
  return `init: ${initType}`;
}
function generateGenericArgs(typeParameters) {
  if (typeParameters === void 0 || typeParameters.length === 0) {
    return "";
  }
  return `<${typeParameters.map((param) => param.name).join(", ")}>`;
}
function requiresInlineTypeCtor(node, host, env) {
  return !checkIfGenericTypeBoundsCanBeEmitted(node, host, env);
}
function typeParametersWithDefaultTypes(params) {
  if (params === void 0 || params.length === 0) {
    return "";
  }
  return `<${params.map((param) => param.representationWithDefault).join(", ")}>`;
}

// packages/compiler-cli/src/ngtsc/typecheck/src/environment.js
var Environment = class extends ReferenceEmitEnvironment {
  config;
  nextIds = {
    pipeInst: 1,
    typeCtor: 1
  };
  typeCtors = /* @__PURE__ */ new Map();
  typeCtorStatements = [];
  pipeInsts = /* @__PURE__ */ new Map();
  pipeInstStatements = [];
  constructor(config, importManager, refEmitter, reflector, contextFile) {
    super(importManager, refEmitter, reflector, contextFile);
    this.config = config;
  }
  /**
   * Get an expression referring to a type constructor for the given directive.
   *
   * Depending on the shape of the directive itself, this could be either a reference to a declared
   * type constructor, or to an inline type constructor.
   */
  typeCtorFor(dir) {
    if (this.typeCtors.has(dir.ref.key)) {
      return new TcbExpr(this.typeCtors.get(dir.ref.key));
    }
    if (dir.requiresInlineTypeCtor) {
      const typeCtorExpr = `${this.referenceTcbValue(dir.ref).print()}.ngTypeCtor`;
      this.typeCtors.set(dir.ref.key, typeCtorExpr);
      return new TcbExpr(typeCtorExpr);
    } else {
      const fnName = `_ctor${this.nextIds.typeCtor++}`;
      const nodeTypeRef = this.referenceTcbValue(dir.ref);
      const meta = {
        fnName,
        body: true,
        fields: {
          inputs: dir.inputs
          // TODO: support queries
        },
        coercedInputFields: dir.coercedInputFields
      };
      const typeParams = dir.typeParameters || void 0;
      const typeCtor = generateTypeCtorDeclarationFn(this, meta, nodeTypeRef, typeParams);
      this.typeCtorStatements.push(typeCtor);
      this.typeCtors.set(dir.ref.key, fnName);
      return new TcbExpr(fnName);
    }
  }
  /*
   * Get an expression referring to an instance of the given pipe.
   */
  pipeInst(pipe) {
    if (this.pipeInsts.has(pipe.ref.key)) {
      return new TcbExpr(this.pipeInsts.get(pipe.ref.key));
    }
    const pipeType = this.referenceTcbValue(pipe.ref);
    const pipeInstId = `_pipe${this.nextIds.pipeInst++}`;
    this.pipeInsts.set(pipe.ref.key, pipeInstId);
    this.pipeInstStatements.push(declareVariable(new TcbExpr(pipeInstId), pipeType));
    return new TcbExpr(pipeInstId);
  }
  getPreludeStatements() {
    return [...this.pipeInstStatements, ...this.typeCtorStatements];
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/scope.js
import { TmplAstBoundText, TmplAstComponent as TmplAstComponent2, TmplAstContent, TmplAstDeferredBlock, TmplAstDirective, TmplAstElement as TmplAstElement7, TmplAstForLoopBlock as TmplAstForLoopBlock2, TmplAstHostElement as TmplAstHostElement5, TmplAstIcu, TmplAstIfBlock as TmplAstIfBlock2, TmplAstIfBlockBranch, TmplAstLetDeclaration as TmplAstLetDeclaration2, TmplAstReference, TmplAstSwitchBlock as TmplAstSwitchBlock2, TmplAstTemplate as TmplAstTemplate5, TmplAstText as TmplAstText2, TmplAstVariable as TmplAstVariable2 } from "@angular/compiler";

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/base.js
var TcbOp = class {
  /**
   * Replacement value or operation used while this `TcbOp` is executing (i.e. to resolve circular
   * references during its execution).
   *
   * This is usually a `null!` expression (which asks TS to infer an appropriate type), but another
   * `TcbOp` can be returned in cases where additional code generation is necessary to deal with
   * circular references.
   */
  circularFallback() {
    return new TcbExpr("null!");
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/template.js
import { TmplAstBoundAttribute as TmplAstBoundAttribute2, TmplAstTemplate } from "@angular/compiler";

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/expression.js
import { Binary, BindingPipe, Call as Call3, ImplicitReceiver as ImplicitReceiver3, PropertyRead as PropertyRead3, R3Identifiers as R3Identifiers3, SafeCall as SafeCall2, SafePropertyRead as SafePropertyRead2, ThisReceiver as ThisReceiver3, TmplAstLetDeclaration } from "@angular/compiler";

// packages/compiler-cli/src/ngtsc/typecheck/src/expression.js
import { ASTWithSource, Call as Call2, ImplicitReceiver as ImplicitReceiver2, PropertyRead as PropertyRead2, SafeKeyedRead, SafePropertyRead, ThisReceiver as ThisReceiver2 } from "@angular/compiler";
function astToTcbExpr(ast, maybeResolve, config) {
  const translator = new TcbExprTranslator(maybeResolve, config);
  return translator.translate(ast);
}
var TcbExprTranslator = class {
  maybeResolve;
  config;
  constructor(maybeResolve, config) {
    this.maybeResolve = maybeResolve;
    this.config = config;
  }
  translate(ast) {
    if (ast instanceof ASTWithSource) {
      ast = ast.ast;
    }
    const resolved = this.maybeResolve(ast);
    if (resolved !== null) {
      return resolved;
    }
    return ast.visit(this);
  }
  visitUnary(ast) {
    const expr = this.translate(ast.expr);
    const node = new TcbExpr(`${ast.operator}${expr.print()}`);
    return node.wrapForTypeChecker().addParseSpanInfo(ast.sourceSpan);
  }
  visitBinary(ast) {
    const lhs = this.translate(ast.left);
    const rhs = this.translate(ast.right);
    lhs.wrapForTypeChecker();
    rhs.wrapForTypeChecker();
    const expression = `${lhs.print()} ${ast.operation} ${rhs.print()}`;
    const node = new TcbExpr(ast.operation === "??" || ast.operation === "**" ? `(${expression})` : expression);
    node.addParseSpanInfo(ast.sourceSpan);
    return node;
  }
  visitChain(ast) {
    const elements = ast.expressions.map((expr) => this.translate(expr).print());
    const node = new TcbExpr(elements.join(", "));
    node.wrapForTypeChecker();
    node.addParseSpanInfo(ast.sourceSpan);
    return node;
  }
  visitConditional(ast) {
    const condExpr = this.translate(ast.condition);
    const trueExpr = this.translate(ast.trueExp);
    const falseExpr = this.translate(ast.falseExp).wrapForTypeChecker();
    const node = new TcbExpr(`(${condExpr.print()} ? ${trueExpr.print()} : ${falseExpr.print()})`).addParseSpanInfo(ast.sourceSpan);
    return node;
  }
  visitImplicitReceiver(ast) {
    throw new Error("Method not implemented.");
  }
  visitThisReceiver(ast) {
    throw new Error("Method not implemented.");
  }
  visitRegularExpressionLiteral(ast, context) {
    const node = new TcbExpr(`/${ast.body}/${ast.flags ?? ""}`);
    node.wrapForTypeChecker();
    return node;
  }
  visitInterpolation(ast) {
    const exprs = ast.expressions.map((e) => {
      const node = this.translate(e);
      node.wrapForTypeChecker();
      return node.print();
    });
    return new TcbExpr(`"" + ${exprs.join(" + ")}`);
  }
  visitKeyedRead(ast) {
    const receiver = this.translate(ast.receiver).wrapForTypeChecker();
    const key = this.translate(ast.key);
    return new TcbExpr(`${receiver.print()}[${key.print()}]`).addParseSpanInfo(ast.sourceSpan);
  }
  visitLiteralArray(ast) {
    const elements = ast.expressions.map((expr) => this.translate(expr));
    let literal = `[${elements.map((el) => el.print()).join(", ")}]`;
    if (!this.config.strictLiteralTypes) {
      literal = `(${literal} as any)`;
    }
    return new TcbExpr(literal).addParseSpanInfo(ast.sourceSpan);
  }
  visitLiteralMap(ast) {
    const properties = ast.keys.map((key, idx) => {
      const value = this.translate(ast.values[idx]);
      if (key.kind === "property") {
        const keyNode = new TcbExpr(quoteAndEscape(key.key));
        keyNode.addParseSpanInfo(key.sourceSpan);
        return `${keyNode.print()}: ${value.print()}`;
      } else {
        return `...${value.print()}`;
      }
    });
    let literal = `{ ${properties.join(", ")} }`;
    if (!this.config.strictLiteralTypes) {
      literal = `${literal} as any`;
    }
    const expression = new TcbExpr(literal).addParseSpanInfo(ast.sourceSpan);
    expression.wrapForTypeChecker();
    return expression;
  }
  visitLiteralPrimitive(ast) {
    let node;
    if (ast.value === void 0) {
      node = new TcbExpr("undefined");
    } else if (ast.value === null) {
      node = new TcbExpr("null");
    } else if (typeof ast.value === "string") {
      node = new TcbExpr(quoteAndEscape(ast.value));
    } else if (typeof ast.value === "number") {
      if (Number.isNaN(ast.value)) {
        node = new TcbExpr("NaN");
      } else if (!Number.isFinite(ast.value)) {
        node = new TcbExpr(ast.value > 0 ? "Infinity" : "-Infinity");
      } else {
        node = new TcbExpr(ast.value.toString());
      }
    } else if (typeof ast.value === "boolean") {
      node = new TcbExpr(ast.value + "");
    } else {
      throw Error(`Unsupported AST value of type ${typeof ast.value}`);
    }
    node.addParseSpanInfo(ast.sourceSpan);
    return node;
  }
  visitNonNullAssert(ast) {
    const expr = this.translate(ast.expression).wrapForTypeChecker();
    return new TcbExpr(`${expr.print()}!`).addParseSpanInfo(ast.sourceSpan);
  }
  visitPipe(ast) {
    throw new Error("Method not implemented.");
  }
  visitPrefixNot(ast) {
    const expression = this.translate(ast.expression).wrapForTypeChecker();
    return new TcbExpr(`!${expression.print()}`).addParseSpanInfo(ast.sourceSpan);
  }
  visitTypeofExpression(ast) {
    const expression = this.translate(ast.expression).wrapForTypeChecker();
    return new TcbExpr(`typeof ${expression.print()}`).addParseSpanInfo(ast.sourceSpan);
  }
  visitVoidExpression(ast) {
    const expression = this.translate(ast.expression).wrapForTypeChecker();
    return new TcbExpr(`void ${expression.print()}`).addParseSpanInfo(ast.sourceSpan);
  }
  visitPropertyRead(ast) {
    const receiver = this.translate(ast.receiver).wrapForTypeChecker();
    return new TcbExpr(`${receiver.print()}.${ast.name}`).addParseSpanInfo(ast.nameSpan).wrapForTypeChecker().addParseSpanInfo(ast.sourceSpan);
  }
  visitSafePropertyRead(ast) {
    let node;
    const receiver = this.translate(ast.receiver).wrapForTypeChecker();
    const name = new TcbExpr(ast.name).addParseSpanInfo(ast.nameSpan);
    if (this.config.strictSafeNavigationTypes) {
      node = new TcbExpr(`${receiver.print()}?.${name.print()}`);
    } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      node = new TcbExpr(`(${receiver.print()} as any).${name.print()}`);
    } else {
      node = new TcbExpr(`(${receiver.print()}!.${name.print()} as any)`);
    }
    return node.addParseSpanInfo(ast.sourceSpan);
  }
  visitSafeKeyedRead(ast) {
    const receiver = this.translate(ast.receiver).wrapForTypeChecker();
    const key = this.translate(ast.key);
    let node;
    if (this.config.strictSafeNavigationTypes) {
      node = new TcbExpr(`${receiver.print()}?.[${key.print()}]`);
    } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      node = new TcbExpr(`(${receiver.print()} as any)[${key.print()}]`);
    } else {
      const elementAccess = new TcbExpr(`${receiver.print()}![${key.print()}]`).addParseSpanInfo(ast.sourceSpan);
      node = new TcbExpr(`(${elementAccess.print()} as any)`);
    }
    return node.addParseSpanInfo(ast.sourceSpan);
  }
  visitCall(ast) {
    const args = ast.args.map((expr2) => this.translate(expr2));
    const receiver = ast.receiver;
    let expr;
    if (receiver instanceof PropertyRead2) {
      const resolved = this.maybeResolve(receiver);
      if (resolved !== null) {
        expr = resolved;
      } else {
        const propertyReceiver = this.translate(receiver.receiver).wrapForTypeChecker();
        expr = new TcbExpr(`${propertyReceiver.print()}.${receiver.name}`).addParseSpanInfo(receiver.nameSpan);
      }
    } else {
      expr = this.translate(receiver);
    }
    let node;
    if (ast.receiver instanceof SafePropertyRead || ast.receiver instanceof SafeKeyedRead) {
      node = this.convertToSafeCall(ast, expr, args);
    } else {
      node = new TcbExpr(`${expr.print()}(${args.map((arg) => arg.print()).join(", ")})`);
    }
    return node.addParseSpanInfo(ast.sourceSpan);
  }
  visitSafeCall(ast) {
    const args = ast.args.map((expr2) => this.translate(expr2));
    const expr = this.translate(ast.receiver).wrapForTypeChecker();
    return this.convertToSafeCall(ast, expr, args).addParseSpanInfo(ast.sourceSpan);
  }
  visitTemplateLiteral(ast) {
    const length = ast.elements.length;
    const head = ast.elements[0];
    let result;
    if (length === 1) {
      result = `\`${this.escapeTemplateLiteral(head.text)}\``;
    } else {
      let parts = [`\`${this.escapeTemplateLiteral(head.text)}`];
      const tailIndex = length - 1;
      for (let i = 1; i < tailIndex; i++) {
        const expr = this.translate(ast.expressions[i - 1]);
        parts.push(`\${${expr.print()}}${this.escapeTemplateLiteral(ast.elements[i].text)}`);
      }
      const resolvedExpression = this.translate(ast.expressions[tailIndex - 1]);
      parts.push(`\${${resolvedExpression.print()}}${this.escapeTemplateLiteral(ast.elements[tailIndex].text)}\``);
      result = parts.join("");
    }
    return new TcbExpr(result);
  }
  visitTemplateLiteralElement() {
    throw new Error("Method not implemented");
  }
  visitTaggedTemplateLiteral(ast) {
    const tag = this.translate(ast.tag);
    const template = this.visitTemplateLiteral(ast.template);
    return new TcbExpr(`${tag.print()}${template.print()}`);
  }
  visitParenthesizedExpression(ast) {
    const expr = this.translate(ast.expression);
    return new TcbExpr(`(${expr.print()})`);
  }
  visitSpreadElement(ast) {
    const expression = this.translate(ast.expression);
    expression.wrapForTypeChecker();
    const node = new TcbExpr(`...${expression.print()}`);
    node.addParseSpanInfo(ast.sourceSpan);
    return node;
  }
  visitEmptyExpr(ast) {
    const node = new TcbExpr("undefined");
    node.addParseSpanInfo(ast.sourceSpan);
    return node;
  }
  visitArrowFunction(ast) {
    const params = ast.parameters.map((param) => new TcbExpr(param.name).markIgnoreDiagnostics().print()).join(", ");
    const body = astToTcbExpr(ast.body, (innerAst) => {
      if (!(innerAst instanceof PropertyRead2) || innerAst.receiver instanceof ThisReceiver2 || !(innerAst.receiver instanceof ImplicitReceiver2)) {
        return this.maybeResolve(innerAst);
      }
      const correspondingParam = ast.parameters.find((arg) => arg.name === innerAst.name);
      if (correspondingParam) {
        const node = new TcbExpr(innerAst.name);
        node.addParseSpanInfo(innerAst.sourceSpan);
        return node;
      }
      return this.maybeResolve(innerAst);
    }, this.config);
    return new TcbExpr(`${ast.parameters.length === 1 ? params : `(${params})`} => ${body.print()}`);
  }
  convertToSafeCall(ast, exprNode, argNodes) {
    const expr = exprNode.print();
    const args = argNodes.map((node) => node.print()).join(", ");
    if (this.config.strictSafeNavigationTypes) {
      return new TcbExpr(`(0 as any ? ${expr}!(${args}) : undefined)`);
    }
    if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      return new TcbExpr(`(${expr} as any)(${args})`);
    }
    return new TcbExpr(`(${expr}!(${args}) as any)`);
  }
  escapeTemplateLiteral(value) {
    return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "$\\{");
  }
};
var VeSafeLhsInferenceBugDetector = class _VeSafeLhsInferenceBugDetector {
  static SINGLETON = new _VeSafeLhsInferenceBugDetector();
  static veWillInferAnyFor(ast) {
    const visitor = _VeSafeLhsInferenceBugDetector.SINGLETON;
    return ast instanceof Call2 ? ast.visit(visitor) : ast.receiver.visit(visitor);
  }
  visitUnary(ast) {
    return ast.expr.visit(this);
  }
  visitBinary(ast) {
    return ast.left.visit(this) || ast.right.visit(this);
  }
  visitChain() {
    return false;
  }
  visitConditional(ast) {
    return ast.condition.visit(this) || ast.trueExp.visit(this) || ast.falseExp.visit(this);
  }
  visitCall() {
    return true;
  }
  visitSafeCall() {
    return false;
  }
  visitImplicitReceiver() {
    return false;
  }
  visitThisReceiver() {
    return false;
  }
  visitInterpolation(ast) {
    return ast.expressions.some((exp) => exp.visit(this));
  }
  visitKeyedRead() {
    return false;
  }
  visitLiteralArray() {
    return true;
  }
  visitLiteralMap() {
    return true;
  }
  visitLiteralPrimitive() {
    return false;
  }
  visitPipe() {
    return true;
  }
  visitPrefixNot(ast) {
    return ast.expression.visit(this);
  }
  visitTypeofExpression(ast) {
    return ast.expression.visit(this);
  }
  visitVoidExpression(ast) {
    return ast.expression.visit(this);
  }
  visitNonNullAssert(ast) {
    return ast.expression.visit(this);
  }
  visitPropertyRead() {
    return false;
  }
  visitSafePropertyRead() {
    return false;
  }
  visitSafeKeyedRead() {
    return false;
  }
  visitTemplateLiteral() {
    return false;
  }
  visitTemplateLiteralElement() {
    return false;
  }
  visitTaggedTemplateLiteral() {
    return false;
  }
  visitParenthesizedExpression(ast) {
    return ast.expression.visit(this);
  }
  visitRegularExpressionLiteral() {
    return false;
  }
  visitSpreadElement(ast) {
    return ast.expression.visit(this);
  }
  visitArrowFunction(ast, context) {
    return false;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/expression.js
function tcbExpression(ast, tcb, scope) {
  const translator = new TcbExpressionTranslator(tcb, scope);
  return translator.translate(ast);
}
function unwrapWritableSignal(expression, tcb) {
  const unwrapRef = tcb.env.referenceExternalSymbol(R3Identifiers3.unwrapWritableSignal.moduleName, R3Identifiers3.unwrapWritableSignal.name);
  return new TcbExpr(`${unwrapRef.print()}(${expression.print()})`);
}
var TcbExpressionOp = class extends TcbOp {
  tcb;
  scope;
  expression;
  constructor(tcb, scope, expression) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.expression = expression;
  }
  get optional() {
    return false;
  }
  execute() {
    const expr = tcbExpression(this.expression, this.tcb, this.scope);
    this.scope.addStatement(expr);
    return null;
  }
};
var TcbConditionOp = class extends TcbOp {
  tcb;
  scope;
  expression;
  constructor(tcb, scope, expression) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.expression = expression;
  }
  get optional() {
    return false;
  }
  execute() {
    const expr = tcbExpression(this.expression, this.tcb, this.scope);
    this.scope.addStatement(new TcbExpr(`if (${expr.print()}) {}`));
    return null;
  }
};
var TcbExpressionTranslator = class {
  tcb;
  scope;
  constructor(tcb, scope) {
    this.tcb = tcb;
    this.scope = scope;
  }
  translate(ast) {
    return astToTcbExpr(ast, (ast2) => this.resolve(ast2), this.tcb.env.config);
  }
  /**
   * Resolve an `AST` expression within the given scope.
   *
   * Some `AST` expressions refer to top-level concepts (references, variables, the component
   * context). This method assists in resolving those.
   */
  resolve(ast) {
    if (ast instanceof PropertyRead3 && ast.receiver instanceof ImplicitReceiver3) {
      const target = this.tcb.boundTarget.getExpressionTarget(ast);
      const targetExpression = target === null ? null : this.getTargetNodeExpression(target, ast);
      if (target instanceof TmplAstLetDeclaration && !this.isValidLetDeclarationAccess(target, ast)) {
        this.tcb.oobRecorder.letUsedBeforeDefinition(this.tcb.id, ast, target);
        if (targetExpression !== null) {
          return new TcbExpr(`${targetExpression.print()} as any`);
        }
      }
      return targetExpression;
    } else if (ast instanceof Binary && Binary.isAssignmentOperation(ast.operation) && ast.left instanceof PropertyRead3 && (ast.left.receiver instanceof ImplicitReceiver3 || ast.left.receiver instanceof ThisReceiver3)) {
      const read = ast.left;
      const target = this.tcb.boundTarget.getExpressionTarget(read);
      if (target === null) {
        return null;
      }
      const targetExpression = this.getTargetNodeExpression(target, read);
      const expr = this.translate(ast.right);
      const result = new TcbExpr(`(${targetExpression.print()} = ${expr.print()})`);
      result.addParseSpanInfo(read.sourceSpan);
      if (target instanceof TmplAstLetDeclaration) {
        result.markIgnoreDiagnostics();
        this.tcb.oobRecorder.illegalWriteToLetDeclaration(this.tcb.id, read, target);
      }
      return result;
    } else if (ast instanceof ImplicitReceiver3 || ast instanceof ThisReceiver3) {
      return new TcbExpr("this");
    } else if (ast instanceof BindingPipe) {
      const expr = this.translate(ast.exp);
      const pipeMeta = this.tcb.getPipeByName(ast.name);
      let pipe;
      if (pipeMeta === null) {
        this.tcb.oobRecorder.missingPipe(this.tcb.id, ast, this.tcb.hostIsStandalone);
        pipe = new TcbExpr("(0 as any)");
      } else if (pipeMeta.isExplicitlyDeferred && this.tcb.boundTarget.getEagerlyUsedPipes().includes(ast.name)) {
        this.tcb.oobRecorder.deferredPipeUsedEagerly(this.tcb.id, ast);
        pipe = new TcbExpr("(0 as any)");
      } else {
        pipe = this.tcb.env.pipeInst(pipeMeta);
      }
      const args = ast.args.map((arg) => this.translate(arg).print());
      let methodAccess = new TcbExpr(`${pipe.print()}.transform`).addParseSpanInfo(ast.nameSpan);
      if (!this.tcb.env.config.checkTypeOfPipes) {
        methodAccess = new TcbExpr(`(${methodAccess.print()} as any)`);
      }
      const result = new TcbExpr(`${methodAccess.print()}(${[expr.print(), ...args].join(", ")})`);
      return result.addParseSpanInfo(ast.sourceSpan);
    } else if ((ast instanceof Call3 || ast instanceof SafeCall2) && (ast.receiver instanceof PropertyRead3 || ast.receiver instanceof SafePropertyRead2)) {
      if (ast.receiver.receiver instanceof ImplicitReceiver3 && ast.receiver.name === "$any" && ast.args.length === 1) {
        const expr = this.translate(ast.args[0]);
        const result = new TcbExpr(`(${expr.print()} as any)`);
        result.addParseSpanInfo(ast.sourceSpan);
        return result;
      }
      const target = this.tcb.boundTarget.getExpressionTarget(ast);
      if (target === null) {
        return null;
      }
      const method = this.getTargetNodeExpression(target, ast);
      method.addParseSpanInfo(ast.receiver.nameSpan).wrapForTypeChecker();
      const args = ast.args.map((arg) => this.translate(arg).print());
      const node = new TcbExpr(`${method.print()}(${args.join(", ")})`);
      node.addParseSpanInfo(ast.sourceSpan);
      return node;
    } else {
      return null;
    }
  }
  getTargetNodeExpression(targetNode, expressionNode) {
    const expr = this.scope.resolve(targetNode);
    expr.addParseSpanInfo(expressionNode.sourceSpan);
    return expr;
  }
  isValidLetDeclarationAccess(target, ast) {
    const targetStart = target.sourceSpan.start.offset;
    const targetEnd = target.sourceSpan.end.offset;
    const astStart = ast.sourceSpan.start;
    return targetStart < astStart && astStart > targetEnd || !this.scope.isLocal(target);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/template.js
var TcbTemplateContextOp = class extends TcbOp {
  tcb;
  scope;
  constructor(tcb, scope) {
    super();
    this.tcb = tcb;
    this.scope = scope;
  }
  // The declaration of the context variable is only needed when the context is actually referenced.
  optional = true;
  execute() {
    const ctx = new TcbExpr(this.tcb.allocateId());
    this.scope.addStatement(declareVariable(ctx, new TcbExpr("any")));
    return ctx;
  }
};
var TcbTemplateBodyOp = class extends TcbOp {
  tcb;
  scope;
  template;
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
    let guard = null;
    const directiveGuards = [];
    this.addDirectiveGuards(directiveGuards, this.template, this.tcb.boundTarget.getDirectivesOfNode(this.template));
    for (const directive of this.template.directives) {
      this.addDirectiveGuards(directiveGuards, directive, this.tcb.boundTarget.getDirectivesOfNode(directive));
    }
    if (directiveGuards.length > 0) {
      guard = directiveGuards.reduce((expr, dirGuard) => new TcbExpr(`${expr.print()} && ${dirGuard.print()}`), directiveGuards.pop());
    }
    const tmplScope = this.scope.createChildScope(this.scope, this.template, this.template.children, guard);
    const statements = tmplScope.render();
    if (statements.length === 0) {
      return null;
    }
    let tmplBlock = `{
${getStatementsBlock(statements)}}`;
    if (guard !== null) {
      tmplBlock = `if (${guard.print()}) ${tmplBlock}`;
    }
    this.scope.addStatement(new TcbExpr(tmplBlock));
    return null;
  }
  addDirectiveGuards(guards, hostNode, directives) {
    if (directives === null || directives.length === 0) {
      return;
    }
    const isTemplate = hostNode instanceof TmplAstTemplate;
    for (const dir of directives) {
      const dirInstId = this.scope.resolve(hostNode, dir);
      const dirId = this.tcb.env.referenceTcbValue(dir.ref);
      dir.ngTemplateGuards.forEach((guard) => {
        const boundInput = hostNode.inputs.find((i) => i.name === guard.inputName) || (isTemplate ? hostNode.templateAttrs.find((input) => {
          return input instanceof TmplAstBoundAttribute2 && input.name === guard.inputName;
        }) : void 0);
        if (boundInput !== void 0) {
          const expr = tcbExpression(boundInput.value, this.tcb, this.scope);
          expr.markIgnoreDiagnostics();
          if (guard.type === "binding") {
            guards.push(expr);
          } else {
            const guardInvoke = new TcbExpr(`${dirId.print()}.ngTemplateGuard_${guard.inputName}(${dirInstId.print()}, ${expr.print()})`);
            guardInvoke.addParseSpanInfo(boundInput.value.sourceSpan);
            guards.push(guardInvoke);
          }
        }
      });
      if (dir.hasNgTemplateContextGuard) {
        if (this.tcb.env.config.applyTemplateContextGuards) {
          const ctx = this.scope.resolve(hostNode);
          const guardInvoke = new TcbExpr(`${dirId.print()}.ngTemplateContextGuard(${dirInstId.print()}, ${ctx.print()})`);
          guardInvoke.markIgnoreDiagnostics();
          guardInvoke.addParseSpanInfo(hostNode.sourceSpan);
          guards.push(guardInvoke);
        }
      }
    }
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/element.js
var TcbElementOp = class extends TcbOp {
  tcb;
  scope;
  element;
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
    const idNode = new TcbExpr(id);
    idNode.addParseSpanInfo(this.element.startSourceSpan || this.element.sourceSpan);
    const initializer = new TcbExpr(`document.createElement("${this.element.name}")`);
    initializer.addParseSpanInfo(this.element.startSourceSpan || this.element.sourceSpan);
    const stmt = new TcbExpr(`var ${idNode.print()} = ${initializer.print()}`);
    stmt.addParseSpanInfo(this.element.startSourceSpan || this.element.sourceSpan);
    this.scope.addStatement(stmt);
    return idNode;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/variables.js
var TcbBlockImplicitVariableOp = class extends TcbOp {
  tcb;
  scope;
  type;
  variable;
  constructor(tcb, scope, type, variable) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.type = type;
    this.variable = variable;
  }
  optional = true;
  execute() {
    const id = new TcbExpr(this.tcb.allocateId());
    id.addParseSpanInfo(this.variable.keySpan);
    const variable = declareVariable(id, this.type);
    variable.addParseSpanInfo(this.variable.sourceSpan);
    this.scope.addStatement(variable);
    return id;
  }
};
var TcbTemplateVariableOp = class extends TcbOp {
  tcb;
  scope;
  template;
  variable;
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
    const id = new TcbExpr(this.tcb.allocateId());
    const initializer = new TcbExpr(`${ctx.print()}.${this.variable.value || "$implicit"}`);
    id.addParseSpanInfo(this.variable.keySpan);
    if (this.variable.valueSpan !== void 0) {
      initializer.addParseSpanInfo(this.variable.valueSpan).wrapForTypeChecker();
    } else {
    }
    const variable = new TcbExpr(`var ${id.print()} = ${initializer.print()}`);
    variable.addParseSpanInfo(this.variable.sourceSpan);
    this.scope.addStatement(variable);
    return id;
  }
};
var TcbBlockVariableOp = class extends TcbOp {
  tcb;
  scope;
  initializer;
  variable;
  constructor(tcb, scope, initializer, variable) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.initializer = initializer;
    this.variable = variable;
  }
  get optional() {
    return false;
  }
  execute() {
    const id = new TcbExpr(this.tcb.allocateId());
    id.addParseSpanInfo(this.variable.keySpan);
    this.initializer.wrapForTypeChecker();
    const variable = new TcbExpr(`var ${id.print()} = ${this.initializer.print()}`);
    variable.addParseSpanInfo(this.variable.sourceSpan);
    this.scope.addStatement(variable);
    return id;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/completions.js
var TcbComponentContextCompletionOp = class extends TcbOp {
  scope;
  constructor(scope) {
    super();
    this.scope = scope;
  }
  optional = false;
  execute() {
    const ctx = new TcbExpr("this.");
    ctx.markIgnoreDiagnostics();
    ctx.addExpressionIdentifier(ExpressionIdentifier.COMPONENT_COMPLETION);
    this.scope.addStatement(ctx);
    return null;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/references.js
import { TmplAstElement, TmplAstTemplate as TmplAstTemplate2 } from "@angular/compiler";
var TcbReferenceOp = class extends TcbOp {
  tcb;
  scope;
  node;
  host;
  target;
  constructor(tcb, scope, node, host, target) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.host = host;
    this.target = target;
  }
  // The statement generated by this operation is only used to for the Type Checker
  // so it can map a reference variable in the template directly to a node in the TCB.
  optional = true;
  execute() {
    const id = new TcbExpr(this.tcb.allocateId());
    let initializer = this.target instanceof TmplAstTemplate2 || this.target instanceof TmplAstElement ? this.scope.resolve(this.target) : this.scope.resolve(this.host, this.target);
    if (this.target instanceof TmplAstElement && !this.tcb.env.config.checkTypeOfDomReferences || !this.tcb.env.config.checkTypeOfNonDomReferences) {
      initializer = new TcbExpr(`${initializer.print()} as any`);
    } else if (this.target instanceof TmplAstTemplate2) {
      const templateRef = this.tcb.env.referenceExternalSymbol("@angular/core", "TemplateRef");
      initializer = new TcbExpr(`(${initializer.print()} as any as ${templateRef.print()}<any>)`);
    }
    initializer.addParseSpanInfo(this.node.sourceSpan);
    id.addParseSpanInfo(this.node.keySpan);
    this.scope.addStatement(new TcbExpr(`var ${id.print()} = ${initializer.print()}`));
    return id;
  }
};
var TcbInvalidReferenceOp = class extends TcbOp {
  tcb;
  scope;
  constructor(tcb, scope) {
    super();
    this.tcb = tcb;
    this.scope = scope;
  }
  // The declaration of a missing reference is only needed when the reference is resolved.
  optional = true;
  execute() {
    const id = new TcbExpr(this.tcb.allocateId());
    this.scope.addStatement(new TcbExpr(`var ${id.print()} = any`));
    return id;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/if_block.js
var TcbIfOp = class extends TcbOp {
  tcb;
  scope;
  block;
  expressionScopes = /* @__PURE__ */ new Map();
  constructor(tcb, scope, block) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.block = block;
  }
  get optional() {
    return false;
  }
  execute() {
    const root = this.generateBranch(0);
    root && this.scope.addStatement(root);
    return null;
  }
  generateBranch(index) {
    const branch = this.block.branches[index];
    if (!branch) {
      return void 0;
    }
    if (branch.expression === null) {
      const branchScope = this.getBranchScope(this.scope, branch, index);
      return new TcbExpr(`{
${getStatementsBlock(branchScope.render())}}`);
    }
    const outerScope = this.scope.createChildScope(this.scope, branch, [], null);
    outerScope.render().forEach((stmt) => this.scope.addStatement(stmt));
    this.expressionScopes.set(branch, outerScope);
    let expression = tcbExpression(branch.expression, this.tcb, this.scope);
    if (branch.expressionAlias !== null) {
      expression = new TcbExpr(`(${expression.print()}) && ${outerScope.resolve(branch.expressionAlias).print()}`);
    }
    const bodyScope = this.getBranchScope(outerScope, branch, index);
    const ifStatement = `if (${expression.print()}) {
${getStatementsBlock(bodyScope.render())}}`;
    const elseBranch = this.generateBranch(index + 1);
    return new TcbExpr(ifStatement + (elseBranch ? " else " + elseBranch.print() : ""));
  }
  getBranchScope(parentScope, branch, index) {
    const checkBody = this.tcb.env.config.checkControlFlowBodies;
    return this.scope.createChildScope(parentScope, null, checkBody ? branch.children : [], checkBody ? this.generateBranchGuard(index) : null);
  }
  generateBranchGuard(index) {
    let guard = null;
    for (let i = 0; i <= index; i++) {
      const branch = this.block.branches[i];
      if (branch.expression === null) {
        continue;
      }
      if (!this.expressionScopes.has(branch)) {
        throw new Error(`Could not determine expression scope of branch at index ${i}`);
      }
      const expressionScope = this.expressionScopes.get(branch);
      let expression;
      expression = tcbExpression(branch.expression, this.tcb, expressionScope);
      if (branch.expressionAlias !== null) {
        expression = new TcbExpr(`(${expression.print()}) && ${expressionScope.resolve(branch.expressionAlias).print()}`);
      }
      expression.markIgnoreDiagnostics();
      const comparisonExpression = i === index ? expression : new TcbExpr(`!(${expression.print()})`);
      guard = guard === null ? comparisonExpression : new TcbExpr(`(${guard.print()}) && (${comparisonExpression.print()})`);
    }
    return guard;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/switch_block.js
var TcbSwitchOp = class extends TcbOp {
  tcb;
  scope;
  block;
  constructor(tcb, scope, block) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.block = block;
  }
  get optional() {
    return false;
  }
  execute() {
    const switchExpression = tcbExpression(this.block.expression, this.tcb, this.scope);
    const clauses = this.block.groups.flatMap((current) => {
      const checkBody = this.tcb.env.config.checkControlFlowBodies;
      const clauseScope = this.scope.createChildScope(this.scope, null, checkBody ? current.children : [], checkBody ? this.generateGuard(current, switchExpression) : null);
      const statements = [...clauseScope.render(), new TcbExpr("break")];
      return current.cases.map((switchCase, index) => {
        const statementsStr = getStatementsBlock(
          index === current.cases.length - 1 ? statements : [],
          true
          /* singleLine */
        );
        const source = switchCase.expression === null ? `default: ${statementsStr}` : `case ${tcbExpression(switchCase.expression, this.tcb, this.scope).print()}: ${statementsStr}`;
        return new TcbExpr(source);
      });
    });
    if (this.block.exhaustiveCheck) {
      let translateExpression2 = this.block.expression;
      if (this.block.exhaustiveCheck.expression) {
        translateExpression2 = this.block.exhaustiveCheck.expression;
      }
      const switchValue = tcbExpression(translateExpression2, this.tcb, this.scope);
      const exhaustiveId = this.tcb.allocateId();
      clauses.push(new TcbExpr(`default: const tcbExhaustive${exhaustiveId}: never = ${switchValue.print()};`));
    }
    this.scope.addStatement(new TcbExpr(`switch (${switchExpression.print()}) { ${clauses.map((c) => c.print()).join("\n")} }`));
    return null;
  }
  generateGuard(group, switchValue) {
    const hasDefault = group.cases.some((c) => c.expression === null);
    if (!hasDefault) {
      let guard2 = null;
      for (const switchCase of group.cases) {
        if (switchCase.expression !== null) {
          const expression = tcbExpression(switchCase.expression, this.tcb, this.scope);
          expression.markIgnoreDiagnostics();
          const comparison = new TcbExpr(`${switchValue.print()} === ${expression.print()}`);
          if (guard2 === null) {
            guard2 = comparison;
          } else {
            guard2 = new TcbExpr(`(${guard2.print()}) || (${comparison.print()})`);
          }
        }
      }
      return guard2;
    }
    let guard = null;
    for (const currentGroup of this.block.groups) {
      if (currentGroup === group) {
        continue;
      }
      for (const switchCase of currentGroup.cases) {
        if (switchCase.expression === null) {
          continue;
        }
        const expression = tcbExpression(switchCase.expression, this.tcb, this.scope);
        expression.markIgnoreDiagnostics();
        const comparison = new TcbExpr(`${switchValue.print()} !== ${expression.print()}`);
        if (guard === null) {
          guard = comparison;
        } else {
          guard = new TcbExpr(`(${guard.print()}) && (${comparison.print()})`);
        }
      }
    }
    return guard;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/for_block.js
import { ImplicitReceiver as ImplicitReceiver4, PropertyRead as PropertyRead4, ThisReceiver as ThisReceiver4, TmplAstVariable } from "@angular/compiler";
var TcbForOfOp = class extends TcbOp {
  tcb;
  scope;
  block;
  constructor(tcb, scope, block) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.block = block;
  }
  get optional() {
    return false;
  }
  execute() {
    const loopScope = this.scope.createChildScope(this.scope, this.block, this.tcb.env.config.checkControlFlowBodies ? this.block.children : [], null);
    const initializerId = loopScope.resolve(this.block.item);
    const initializer = new TcbExpr(`const ${initializerId.print()}`);
    initializer.addParseSpanInfo(this.block.item.keySpan);
    const expression = new TcbExpr(`${tcbExpression(this.block.expression, this.tcb, this.scope).print()}!`);
    const trackTranslator = new TcbForLoopTrackTranslator(this.tcb, loopScope, this.block);
    const trackExpression = trackTranslator.translate(this.block.trackBy);
    const block = getStatementsBlock([...loopScope.render(), trackExpression]);
    this.scope.addStatement(new TcbExpr(`for (${initializer.print()} of ${expression.print()}) {
${block} }`));
    return null;
  }
};
var TcbForLoopTrackTranslator = class extends TcbExpressionTranslator {
  block;
  allowedVariables;
  constructor(tcb, scope, block) {
    super(tcb, scope);
    this.block = block;
    this.allowedVariables = /* @__PURE__ */ new Set([block.item]);
    for (const variable of block.contextVariables) {
      if (variable.value === "$index") {
        this.allowedVariables.add(variable);
      }
    }
  }
  resolve(ast) {
    if (ast instanceof PropertyRead4 && (ast.receiver instanceof ImplicitReceiver4 || ast.receiver instanceof ThisReceiver4)) {
      const target = this.tcb.boundTarget.getExpressionTarget(ast);
      if (target !== null && (!(target instanceof TmplAstVariable) || !this.allowedVariables.has(target))) {
        this.tcb.oobRecorder.illegalForLoopTrackAccess(this.tcb.id, this.block, ast);
      }
    }
    return super.resolve(ast);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/let.js
var TcbLetDeclarationOp = class extends TcbOp {
  tcb;
  scope;
  node;
  constructor(tcb, scope, node) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
  }
  /**
   * `@let` declarations are mandatory, because their expressions
   * should be checked even if they aren't referenced anywhere.
   */
  optional = false;
  execute() {
    const id = new TcbExpr(this.tcb.allocateId()).addParseSpanInfo(this.node.nameSpan);
    const value = tcbExpression(this.node.value, this.tcb, this.scope).wrapForTypeChecker();
    const varStatement = new TcbExpr(`const ${id.print()} = ${value.print()}`);
    varStatement.addParseSpanInfo(this.node.sourceSpan);
    this.scope.addStatement(varStatement);
    return id;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/inputs.js
import { BindingType as BindingType4, R3Identifiers as R3Identifiers4 } from "@angular/compiler";

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/signal_forms.js
import { BindingType as BindingType2, Call as Call4, PropertyRead as PropertyRead5, SafeCall as SafeCall3, TmplAstElement as TmplAstElement2, TmplAstHostElement as TmplAstHostElement2 } from "@angular/compiler";
var formControlInputFields = [
  // Should be kept in sync with the `FormUiControl` bindings,
  // defined in `packages/forms/signals/src/api/control.ts`.
  "errors",
  "dirty",
  "disabled",
  "disabledReasons",
  "hidden",
  "invalid",
  "name",
  "pending",
  "readonly",
  "touched",
  "max",
  "maxLength",
  "min",
  "minLength",
  "pattern",
  "required"
];
var customFormControlBannedInputFields = /* @__PURE__ */ new Set([
  ...formControlInputFields,
  "value",
  "checked"
]);
var formControlOptionalFields = /* @__PURE__ */ new Set([
  // Should be kept in sync with the `FormUiControl` bindings,
  // defined in `packages/forms/signals/src/api/control.ts`.
  "max",
  "maxLength",
  "min",
  "minLength"
]);
var TcbNativeFieldOp = class extends TcbOp {
  tcb;
  scope;
  node;
  inputType;
  /** Bindings that aren't supported on signal form fields. */
  unsupportedBindingFields = /* @__PURE__ */ new Set([
    ...formControlInputFields,
    "value",
    "checked",
    "maxlength",
    "minlength"
  ]);
  get optional() {
    return false;
  }
  constructor(tcb, scope, node, inputType) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.inputType = inputType;
  }
  execute() {
    const inputs = this.node instanceof TmplAstHostElement2 ? this.node.bindings : this.node.inputs;
    const fieldBinding = inputs.find((input) => input.type === BindingType2.Property && input.name === "formField") ?? null;
    if (fieldBinding === null) {
      return null;
    }
    checkUnsupportedFieldBindings(this.node, this.unsupportedBindingFields, this.tcb);
    const rawExpectedType = this.getExpectedTypeFromDomNode(this.node);
    if (rawExpectedType === null) {
      const signal = extractFieldValueSignal(fieldBinding.value, this.tcb, this.scope);
      const id = new TcbExpr(this.tcb.allocateId());
      const unionType = new TcbExpr("{ (): string; set: (v: string) => void; } | { (): number | null; set: (v: number | null) => void; }");
      const assignment = new TcbExpr(`${id.print()} = ${signal.print()}`);
      assignment.addParseSpanInfo(fieldBinding.valueSpan ?? fieldBinding.sourceSpan);
      this.scope.addStatement(declareVariable(id, unionType));
      this.scope.addStatement(assignment);
    } else {
      const expectedType = new TcbExpr(rawExpectedType);
      const value = extractFieldValue(fieldBinding.value, this.tcb, this.scope);
      const id = new TcbExpr(this.tcb.allocateId());
      const assignment = new TcbExpr(`${id.print()} = ${value.print()}`);
      assignment.addParseSpanInfo(fieldBinding.valueSpan ?? fieldBinding.sourceSpan);
      this.scope.addStatement(declareVariable(id, expectedType));
      this.scope.addStatement(assignment);
    }
    return null;
  }
  getExpectedTypeFromDomNode(node) {
    if (node.name === "textarea" || node.name === "select") {
      return "string";
    }
    if (node.name !== "input") {
      return this.getUnsupportedType();
    }
    switch (this.inputType) {
      case "checkbox":
        return "boolean";
      case "radio":
        return "string";
      case "number":
      case "range":
      case "datetime-local":
        return "string | number | null";
      case "date":
      case "month":
      case "time":
      case "week":
        return "string | number | Date | null";
    }
    const hasDynamicType = this.inputType === null && this.node.inputs.some((input) => (input.type === BindingType2.Property || input.type === BindingType2.Attribute) && input.name === "type");
    if (hasDynamicType) {
      return "string | number | boolean | Date | null";
    }
    if (this.inputType === "text" || this.inputType === null) {
      return null;
    }
    return "string";
  }
  getUnsupportedType() {
    return "never";
  }
};
var TcbNativeRadioButtonFieldOp = class extends TcbNativeFieldOp {
  constructor(tcb, scope, node) {
    super(tcb, scope, node, "radio");
    this.unsupportedBindingFields.delete("value");
  }
  execute() {
    super.execute();
    const valueBinding = this.node.inputs.find((attr) => {
      return attr.type === BindingType2.Property && attr.name === "value";
    });
    if (valueBinding !== void 0) {
      const id = new TcbExpr(this.tcb.allocateId());
      const value = tcbExpression(valueBinding.value, this.tcb, this.scope);
      const assignment = new TcbExpr(`${id.print()} = ${value.print()}`);
      assignment.addParseSpanInfo(valueBinding.sourceSpan);
      this.scope.addStatement(declareVariable(id, new TcbExpr("string")));
      this.scope.addStatement(assignment);
    }
    return null;
  }
};
function expandBoundAttributesForField(directive, node, customFormControlType) {
  const fieldBinding = node.inputs.find((input) => input.type === BindingType2.Property && input.name === "formField");
  if (!fieldBinding) {
    return null;
  }
  let boundInputs = null;
  let primaryInput;
  if (customFormControlType === "value") {
    primaryInput = getSyntheticFieldBoundInput(directive, "value", "value", fieldBinding, customFormControlType);
  } else if (customFormControlType === "checkbox") {
    primaryInput = getSyntheticFieldBoundInput(directive, "checked", "value", fieldBinding, customFormControlType);
  } else {
    primaryInput = null;
  }
  if (primaryInput !== null) {
    boundInputs ??= [];
    boundInputs.push(primaryInput);
  }
  for (const name of formControlInputFields) {
    const input = getSyntheticFieldBoundInput(directive, name, name, fieldBinding, customFormControlType);
    if (input !== null) {
      boundInputs ??= [];
      boundInputs.push(input);
    }
  }
  return boundInputs;
}
function isFieldDirective(meta) {
  if (meta.name !== "FormField") {
    return false;
  }
  if (meta.ref.moduleName === "@angular/forms/signals") {
    return true;
  }
  return meta.hasNgFieldDirective;
}
function getSyntheticFieldBoundInput(dir, inputName, fieldPropertyName, fieldBinding, customFieldType) {
  const inputs = dir.inputs.getByBindingPropertyName(inputName);
  if (inputs === null || inputs.length === 0) {
    return null;
  }
  const { span, sourceSpan } = fieldBinding.value;
  const outerCall = new Call4(span, sourceSpan, fieldBinding.value, [], sourceSpan);
  const read = new PropertyRead5(span, sourceSpan, sourceSpan, outerCall, fieldPropertyName);
  const isTwoWayBinding = customFieldType === "value" && inputName === "value" || customFieldType === "checkbox" && inputName === "checked";
  let value;
  if (isTwoWayBinding) {
    value = read;
  } else if (formControlOptionalFields.has(fieldPropertyName)) {
    value = new SafeCall3(span, sourceSpan, read, [], sourceSpan);
  } else {
    value = new Call4(span, sourceSpan, read, [], sourceSpan);
  }
  return {
    value,
    sourceSpan: fieldBinding.sourceSpan,
    keySpan: fieldBinding.keySpan ?? null,
    inputs: inputs.map((input) => ({
      fieldName: input.classPropertyName,
      required: input.required,
      transformType: input.transformType,
      isSignal: input.isSignal,
      isTwoWayBinding
    }))
  };
}
function getCustomFieldDirectiveType(meta) {
  if (hasModelInput("value", meta)) {
    return "value";
  } else if (hasModelInput("checked", meta)) {
    return "checkbox";
  }
  return null;
}
function isNativeField(dir, node, allDirectiveMatches) {
  if (!isFieldDirective(dir)) {
    return false;
  }
  if (!(node instanceof TmplAstElement2) || node.name !== "input" && node.name !== "select" && node.name !== "textarea") {
    return false;
  }
  return allDirectiveMatches.every((meta) => {
    return getCustomFieldDirectiveType(meta) === null && !isControlValueAccessorLike(meta);
  });
}
function isControlValueAccessorLike(meta) {
  return meta.publicMethods.has("writeValue") && meta.publicMethods.has("registerOnChange") && meta.publicMethods.has("registerOnTouched");
}
function checkUnsupportedFieldBindings(node, unsupportedBindingFields, tcb) {
  const inputs = node instanceof TmplAstHostElement2 ? node.bindings : node.inputs;
  for (const input of inputs) {
    if (input.type === BindingType2.Property && unsupportedBindingFields.has(input.name)) {
      tcb.oobRecorder.formFieldUnsupportedBinding(tcb.id, input);
    } else if (input.type === BindingType2.Attribute && unsupportedBindingFields.has(input.name.toLowerCase())) {
      tcb.oobRecorder.formFieldUnsupportedBinding(tcb.id, input);
    }
  }
  if (!(node instanceof TmplAstHostElement2)) {
    for (const attr of node.attributes) {
      if (unsupportedBindingFields.has(attr.name.toLowerCase())) {
        tcb.oobRecorder.formFieldUnsupportedBinding(tcb.id, attr);
      }
    }
  }
}
function extractFieldValue(expression, tcb, scope) {
  const innerCall = new TcbExpr(tcbExpression(expression, tcb, scope).print() + "()");
  innerCall.markIgnoreDiagnostics();
  return new TcbExpr(`${innerCall.print()}.value()`);
}
function extractFieldValueSignal(expression, tcb, scope) {
  const innerCall = new TcbExpr(tcbExpression(expression, tcb, scope).print() + "()");
  innerCall.markIgnoreDiagnostics();
  return new TcbExpr(`${innerCall.print()}.value`);
}
function hasModelInput(name, meta) {
  return meta.inputs.hasBindingPropertyName(name) && meta.outputs.hasBindingPropertyName(name + "Change");
}
function isFormControl(allDirectiveMatches) {
  let result = false;
  for (const match of allDirectiveMatches) {
    if (match.inputs.hasBindingPropertyName("formField")) {
      if (!isFieldDirective(match)) {
        return false;
      }
      result = true;
    }
  }
  return result;
}

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/bindings.js
import { BindingType as BindingType3, LiteralArray, LiteralMap, TmplAstBoundAttribute as TmplAstBoundAttribute3, TmplAstElement as TmplAstElement3, TmplAstTemplate as TmplAstTemplate3 } from "@angular/compiler";
function getBoundAttributes(directive, node) {
  const boundInputs = [];
  const processAttribute = (attr) => {
    if (attr instanceof TmplAstBoundAttribute3 && attr.type !== BindingType3.Property && attr.type !== BindingType3.TwoWay) {
      return;
    }
    const inputs = directive.inputs.getByBindingPropertyName(attr.name);
    if (inputs !== null) {
      boundInputs.push({
        value: attr.value,
        sourceSpan: attr.sourceSpan,
        keySpan: attr.keySpan ?? null,
        inputs: inputs.map((input) => {
          return {
            fieldName: input.classPropertyName,
            required: input.required,
            transformType: input.transformType,
            isSignal: input.isSignal,
            isTwoWayBinding: attr instanceof TmplAstBoundAttribute3 && attr.type === BindingType3.TwoWay
          };
        })
      });
    }
  };
  if (node instanceof TmplAstTemplate3) {
    if (node.tagName === "ng-template") {
      node.inputs.forEach(processAttribute);
      node.attributes.forEach(processAttribute);
    }
    node.templateAttrs.forEach(processAttribute);
  } else {
    node.inputs.forEach(processAttribute);
    node.attributes.forEach(processAttribute);
  }
  return boundInputs;
}
function checkSplitTwoWayBinding(inputName, output, inputs, tcb) {
  const input = inputs.find((input2) => input2.name === inputName);
  if (input === void 0 || input.sourceSpan !== output.sourceSpan) {
    return false;
  }
  const inputConsumer = tcb.boundTarget.getConsumerOfBinding(input);
  const outputConsumer = tcb.boundTarget.getConsumerOfBinding(output);
  if (outputConsumer === null || inputConsumer.ref === void 0 || outputConsumer instanceof TmplAstTemplate3) {
    return false;
  }
  if (outputConsumer instanceof TmplAstElement3) {
    tcb.oobRecorder.splitTwoWayBinding(tcb.id, input, output, inputConsumer, outputConsumer);
    return true;
  } else if (outputConsumer.ref !== inputConsumer.ref) {
    tcb.oobRecorder.splitTwoWayBinding(tcb.id, input, output, inputConsumer, outputConsumer);
    return true;
  }
  return false;
}
function widenBinding(expr, tcb, originalValue) {
  if (!tcb.env.config.checkTypeOfInputBindings) {
    return new TcbExpr(`((${expr.print()}) as any)`);
  } else if (!tcb.env.config.strictNullInputBindings) {
    if (originalValue instanceof LiteralMap || originalValue instanceof LiteralArray) {
      return expr;
    } else {
      return new TcbExpr(`(${expr.print()})!`);
    }
  } else {
    return expr;
  }
}

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/inputs.js
function translateInput(value, tcb, scope) {
  if (typeof value === "string") {
    return new TcbExpr(quoteAndEscape(value));
  } else {
    return tcbExpression(value, tcb, scope);
  }
}
var TcbDirectiveInputsOp = class extends TcbOp {
  tcb;
  scope;
  node;
  dir;
  isFormControl;
  customFormControlType;
  constructor(tcb, scope, node, dir, isFormControl2 = false, customFormControlType) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
    this.isFormControl = isFormControl2;
    this.customFormControlType = customFormControlType;
  }
  get optional() {
    return false;
  }
  execute() {
    let dirId = null;
    const seenRequiredInputs = /* @__PURE__ */ new Set();
    const boundAttrs = getBoundAttributes(this.dir, this.node);
    if (this.customFormControlType !== null) {
      checkUnsupportedFieldBindings(this.node, customFormControlBannedInputFields, this.tcb);
    }
    if (this.customFormControlType !== null || this.isFormControl) {
      const additionalBindings = expandBoundAttributesForField(this.dir, this.node, this.customFormControlType);
      if (additionalBindings !== null) {
        boundAttrs.push(...additionalBindings);
      }
    }
    for (const attr of boundAttrs) {
      let assignment = widenBinding(translateInput(attr.value, this.tcb, this.scope), this.tcb, attr.value);
      assignment.wrapForTypeChecker();
      for (const { fieldName, required, transformType, isSignal, isTwoWayBinding } of attr.inputs) {
        let target;
        if (required) {
          seenRequiredInputs.add(fieldName);
        }
        if (this.dir.coercedInputFields.has(fieldName)) {
          let type;
          if (transformType !== void 0) {
            type = new TcbExpr(transformType);
          } else {
            const dirTypeRef = this.tcb.env.referenceTcbValue(this.dir.ref);
            type = new TcbExpr(`typeof ${dirTypeRef.print()}.ngAcceptInputType_${fieldName}`);
          }
          const id = new TcbExpr(this.tcb.allocateId());
          this.scope.addStatement(declareVariable(id, type));
          target = id;
        } else if (this.dir.undeclaredInputFields.has(fieldName)) {
          continue;
        } else if (!this.tcb.env.config.honorAccessModifiersForInputBindings && this.dir.restrictedInputFields.has(fieldName)) {
          if (dirId === null) {
            dirId = this.scope.resolve(this.node, this.dir);
          }
          const id = new TcbExpr(this.tcb.allocateId());
          const type = new TcbExpr(`(typeof ${dirId.print()})[${quoteAndEscape(fieldName)}]`);
          const temp = declareVariable(id, type);
          this.scope.addStatement(temp);
          target = id;
        } else {
          if (dirId === null) {
            dirId = this.scope.resolve(this.node, this.dir);
          }
          target = this.dir.stringLiteralInputFields.has(fieldName) ? new TcbExpr(`${dirId.print()}[${quoteAndEscape(fieldName)}]`) : new TcbExpr(`${dirId.print()}.${fieldName}`);
        }
        if (isSignal) {
          const inputSignalBrandWriteSymbol = this.tcb.env.referenceExternalSymbol(R3Identifiers4.InputSignalBrandWriteType.moduleName, R3Identifiers4.InputSignalBrandWriteType.name);
          target = new TcbExpr(`${target.print()}[${inputSignalBrandWriteSymbol.print()}]`);
        }
        if (attr.keySpan !== null) {
          target.addParseSpanInfo(attr.keySpan);
        }
        if (isTwoWayBinding && this.tcb.env.config.allowSignalsInTwoWayBindings) {
          assignment = unwrapWritableSignal(assignment, this.tcb);
        }
        assignment = new TcbExpr(`${target.print()} = ${assignment.print()}`);
      }
      assignment.addParseSpanInfo(attr.sourceSpan);
      if (!this.tcb.env.config.checkTypeOfAttributes && typeof attr.value === "string") {
        assignment.markIgnoreDiagnostics();
      }
      this.scope.addStatement(assignment);
    }
    this.checkRequiredInputs(seenRequiredInputs);
    return null;
  }
  checkRequiredInputs(seenRequiredInputs) {
    const missing = [];
    for (const input of this.dir.inputs) {
      if (input.required && !seenRequiredInputs.has(input.classPropertyName)) {
        missing.push(input.bindingPropertyName);
      }
    }
    if (missing.length > 0) {
      this.tcb.oobRecorder.missingRequiredInputs(this.tcb.id, this.node, this.dir.name, this.dir.isComponent, missing);
    }
  }
};
var TcbUnclaimedInputsOp = class extends TcbOp {
  tcb;
  scope;
  inputs;
  target;
  claimedInputs;
  constructor(tcb, scope, inputs, target, claimedInputs) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.inputs = inputs;
    this.target = target;
    this.claimedInputs = claimedInputs;
  }
  get optional() {
    return false;
  }
  execute() {
    let elId = null;
    for (const binding of this.inputs) {
      const isPropertyBinding = binding.type === BindingType4.Property || binding.type === BindingType4.TwoWay;
      if (isPropertyBinding && this.claimedInputs?.has(binding.name)) {
        continue;
      }
      const expr = widenBinding(tcbExpression(binding.value, this.tcb, this.scope), this.tcb, binding.value);
      if (this.tcb.env.config.checkTypeOfDomBindings && isPropertyBinding) {
        if (binding.name !== "style" && binding.name !== "class") {
          if (elId === null) {
            elId = this.scope.resolve(this.target);
          }
          const propertyName = REGISTRY.getMappedPropName(binding.name);
          const stmt = new TcbExpr(`${elId.print()}[${quoteAndEscape(propertyName)}] = ${expr.wrapForTypeChecker().print()}`).addParseSpanInfo(binding.sourceSpan);
          this.scope.addStatement(stmt);
        } else {
          this.scope.addStatement(expr);
        }
      } else {
        this.scope.addStatement(expr);
      }
    }
    return null;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/schema.js
import { BindingType as BindingType5, TmplAstComponent, TmplAstElement as TmplAstElement4 } from "@angular/compiler";

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/selectorless.js
function getComponentTagName(node) {
  return node.tagName || "ng-component";
}
var TcbComponentNodeOp = class extends TcbOp {
  tcb;
  scope;
  component;
  optional = true;
  constructor(tcb, scope, component) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.component = component;
  }
  execute() {
    const id = this.tcb.allocateId();
    const initializer = new TcbExpr(`document.createElement("${getComponentTagName(this.component)}")`);
    initializer.addParseSpanInfo(this.component.startSourceSpan || this.component.sourceSpan);
    this.scope.addStatement(new TcbExpr(`var ${id} = ${initializer.print()}`));
    return new TcbExpr(id);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/schema.js
var TcbDomSchemaCheckerOp = class extends TcbOp {
  tcb;
  element;
  checkElement;
  claimedInputs;
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
    const element = this.element;
    const isTemplateElement = element instanceof TmplAstElement4 || element instanceof TmplAstComponent;
    const bindings = isTemplateElement ? element.inputs : element.bindings;
    if (this.checkElement && isTemplateElement) {
      this.tcb.domSchemaChecker.checkElement(this.tcb.id, this.getTagName(element), element.startSourceSpan, this.tcb.schemas, this.tcb.hostIsStandalone);
    }
    for (const binding of bindings) {
      const isPropertyBinding = binding.type === BindingType5.Property || binding.type === BindingType5.TwoWay;
      if (isPropertyBinding && this.claimedInputs?.has(binding.name)) {
        continue;
      }
      if (isPropertyBinding && binding.name !== "style" && binding.name !== "class") {
        const propertyName = REGISTRY.getMappedPropName(binding.name);
        if (isTemplateElement) {
          this.tcb.domSchemaChecker.checkTemplateElementProperty(this.tcb.id, this.getTagName(element), propertyName, binding.sourceSpan, this.tcb.schemas, this.tcb.hostIsStandalone);
        } else {
          this.tcb.domSchemaChecker.checkHostElementProperty(this.tcb.id, element, propertyName, binding.keySpan, this.tcb.schemas);
        }
      }
    }
    return null;
  }
  getTagName(node) {
    return node instanceof TmplAstElement4 ? node.name : getComponentTagName(node);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/events.js
import { ImplicitReceiver as ImplicitReceiver5, ParsedEventType as ParsedEventType2, PropertyRead as PropertyRead6, TmplAstElement as TmplAstElement5 } from "@angular/compiler";
var EVENT_PARAMETER = "$event";
function tcbEventHandlerExpression(ast, tcb, scope) {
  const translator = new TcbEventHandlerTranslator(tcb, scope);
  return translator.translate(ast);
}
var TcbDirectiveOutputsOp = class extends TcbOp {
  tcb;
  scope;
  node;
  inputs;
  outputs;
  dir;
  constructor(tcb, scope, node, inputs, outputs, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.inputs = inputs;
    this.outputs = outputs;
    this.dir = dir;
  }
  get optional() {
    return false;
  }
  execute() {
    let dirId = null;
    const outputs = this.dir.outputs;
    for (const output of this.outputs) {
      if (output.type === ParsedEventType2.LegacyAnimation || !outputs.hasBindingPropertyName(output.name)) {
        continue;
      }
      if (this.tcb.env.config.checkTypeOfOutputEvents && this.inputs !== null && output.name.endsWith("Change")) {
        const inputName = output.name.slice(0, -6);
        checkSplitTwoWayBinding(inputName, output, this.inputs, this.tcb);
      }
      const field = outputs.getByBindingPropertyName(output.name)[0].classPropertyName;
      if (dirId === null) {
        dirId = this.scope.resolve(this.node, this.dir);
      }
      const outputField = new TcbExpr(`${dirId.print()}[${quoteAndEscape(field)}]`);
      outputField.addParseSpanInfo(output.keySpan);
      if (this.tcb.env.config.checkTypeOfOutputEvents) {
        const handler = tcbCreateEventHandler(
          output,
          this.tcb,
          this.scope,
          0
          /* EventParamType.Infer */
        );
        const call = new TcbExpr(`${outputField.print()}.subscribe(${handler.print()})`);
        call.addParseSpanInfo(output.sourceSpan);
        this.scope.addStatement(call);
      } else {
        this.scope.addStatement(outputField);
        const handler = tcbCreateEventHandler(
          output,
          this.tcb,
          this.scope,
          1
          /* EventParamType.Any */
        );
        this.scope.addStatement(handler);
      }
    }
    return null;
  }
};
var TcbUnclaimedOutputsOp = class extends TcbOp {
  tcb;
  scope;
  target;
  outputs;
  inputs;
  claimedOutputs;
  constructor(tcb, scope, target, outputs, inputs, claimedOutputs) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.target = target;
    this.outputs = outputs;
    this.inputs = inputs;
    this.claimedOutputs = claimedOutputs;
  }
  get optional() {
    return false;
  }
  execute() {
    let elId = null;
    for (const output of this.outputs) {
      if (this.claimedOutputs?.has(output.name)) {
        continue;
      }
      if (this.tcb.env.config.checkTypeOfOutputEvents && this.inputs !== null && output.name.endsWith("Change")) {
        const inputName = output.name.slice(0, -6);
        if (checkSplitTwoWayBinding(inputName, output, this.inputs, this.tcb)) {
          continue;
        }
      }
      if (output.type === ParsedEventType2.LegacyAnimation) {
        const eventType = this.tcb.env.config.checkTypeOfAnimationEvents ? this.tcb.env.referenceExternalSymbol("@angular/animations", "AnimationEvent").print() : 1;
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, eventType);
        this.scope.addStatement(handler);
      } else if (output.type === ParsedEventType2.Animation) {
        const eventType = this.tcb.env.referenceExternalSymbol("@angular/core", "AnimationCallbackEvent");
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, eventType.print());
        this.scope.addStatement(handler);
      } else if (this.tcb.env.config.checkTypeOfDomEvents) {
        let target;
        let domEventAssertion;
        if (output.target === "window" || output.target === "document") {
          target = new TcbExpr(output.target);
        } else if (elId === null) {
          target = elId = this.scope.resolve(this.target);
        } else {
          target = elId;
        }
        if (this.target instanceof TmplAstElement5 && this.target.isVoid && this.tcb.env.config.allowDomEventAssertion) {
          const assertUtil = this.tcb.env.referenceExternalSymbol("@angular/core", "\u0275assertType");
          domEventAssertion = new TcbExpr(`${assertUtil.print()}<typeof ${target.print()}>(${EVENT_PARAMETER}.target)`);
        }
        const propertyAccess = new TcbExpr(`${target.print()}.addEventListener`).addParseSpanInfo(output.keySpan);
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0, domEventAssertion);
        const call = new TcbExpr(`${propertyAccess.print()}(${quoteAndEscape(output.name)}, ${handler.print()})`);
        call.addParseSpanInfo(output.sourceSpan);
        this.scope.addStatement(call);
      } else {
        const handler = tcbCreateEventHandler(
          output,
          this.tcb,
          this.scope,
          1
          /* EventParamType.Any */
        );
        this.scope.addStatement(handler);
      }
    }
    return null;
  }
};
var TcbEventHandlerTranslator = class extends TcbExpressionTranslator {
  resolve(ast) {
    if (ast instanceof PropertyRead6 && ast.receiver instanceof ImplicitReceiver5 && ast.name === EVENT_PARAMETER) {
      return new TcbExpr(EVENT_PARAMETER).addParseSpanInfo(ast.nameSpan);
    }
    return super.resolve(ast);
  }
  isValidLetDeclarationAccess() {
    return true;
  }
};
function tcbCreateEventHandler(event, tcb, scope, eventType, assertionExpression) {
  const handler = tcbEventHandlerExpression(event.handler, tcb, scope);
  const statements = [];
  if (assertionExpression !== void 0) {
    statements.push(assertionExpression);
  }
  if (event.type === ParsedEventType2.TwoWay && tcb.env.config.checkTwoWayBoundEvents) {
    const target = tcb.allocateId();
    const initializer = tcb.env.config.allowSignalsInTwoWayBindings ? unwrapWritableSignal(handler, tcb) : handler;
    statements.push(new TcbExpr(`var ${target} = ${initializer.print()}`), new TcbExpr(`${target} = ${EVENT_PARAMETER}`));
  } else {
    statements.push(handler);
  }
  let eventParamType;
  if (eventType === 0) {
    eventParamType = void 0;
  } else if (eventType === 1) {
    eventParamType = "any";
  } else {
    eventParamType = eventType;
  }
  const guards = scope.guards();
  let body = `{
${getStatementsBlock(statements)} }`;
  if (guards !== null) {
    body = `{ if (${guards.print()}) ${body} }`;
  }
  const eventParam = new TcbExpr(`${EVENT_PARAMETER}${eventParamType === void 0 ? "" : ": " + eventParamType}`);
  eventParam.addExpressionIdentifier(ExpressionIdentifier.EVENT_PARAMETER);
  return new TcbExpr(`(${eventParam.print()}): any => ${body}`);
}

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/directive_type.js
import { MatchSource as MatchSource3, TmplAstHostElement as TmplAstHostElement3 } from "@angular/compiler";
var TcbDirectiveTypeOpBase = class extends TcbOp {
  tcb;
  scope;
  node;
  dir;
  directiveIndex;
  constructor(tcb, scope, node, dir, directiveIndex) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
    this.directiveIndex = directiveIndex;
  }
  get optional() {
    return true;
  }
  execute() {
    const rawType = this.tcb.env.referenceTcbValue(this.dir.ref);
    let type;
    let span;
    if (this.dir.isGeneric === false || this.dir.typeParameters === null || this.dir.typeParameters.length === 0) {
      type = rawType;
    } else {
      const typeArguments = Array(this.dir.typeParameters?.length ?? 0).fill("any").join(", ");
      type = new TcbExpr(`${rawType.print()}<${typeArguments}>`);
    }
    if (this.node instanceof TmplAstHostElement3) {
      span = this.node.sourceSpan;
    } else {
      span = this.node.startSourceSpan || this.node.sourceSpan;
    }
    const identifier = this.dir.matchSource === MatchSource3.HostDirective ? ExpressionIdentifier.HOST_DIRECTIVE : ExpressionIdentifier.DIRECTIVE;
    const id = new TcbExpr(this.tcb.allocateId()).addExpressionIdentifier(identifier, this.directiveIndex).addParseSpanInfo(span);
    this.scope.addStatement(declareVariable(id, type));
    return id;
  }
};
var TcbNonGenericDirectiveTypeOp = class extends TcbDirectiveTypeOpBase {
  /**
   * Creates a variable declaration for this op's directive of the argument type. Returns the id of
   * the newly created variable.
   */
  execute() {
    if (this.dir.isGeneric) {
      throw new Error(`Assertion Error: expected ${this.dir.ref.name} not to be generic.`);
    }
    return super.execute();
  }
};
var TcbGenericDirectiveTypeWithAnyParamsOp = class extends TcbDirectiveTypeOpBase {
  execute() {
    if (this.dir.typeParameters === null || this.dir.typeParameters.length === 0) {
      throw new Error(`Assertion Error: expected typeParameters when creating a declaration for ${this.dir.ref.name}`);
    }
    return super.execute();
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/directive_constructor.js
import { MatchSource as MatchSource4, TmplAstHostElement as TmplAstHostElement4 } from "@angular/compiler";
var TcbDirectiveCtorOp = class extends TcbOp {
  tcb;
  scope;
  node;
  dir;
  customFormControlType;
  directiveIndex;
  constructor(tcb, scope, node, dir, customFormControlType, directiveIndex) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.node = node;
    this.dir = dir;
    this.customFormControlType = customFormControlType;
    this.directiveIndex = directiveIndex;
  }
  get optional() {
    return true;
  }
  execute() {
    const genericInputs = /* @__PURE__ */ new Map();
    const id = new TcbExpr(this.tcb.allocateId());
    let boundAttrs;
    let span;
    if (this.node instanceof TmplAstHostElement4) {
      boundAttrs = [];
      span = this.node.sourceSpan;
    } else {
      span = this.node.startSourceSpan || this.node.sourceSpan;
      boundAttrs = getBoundAttributes(this.dir, this.node);
      if (this.customFormControlType !== null) {
        const additionalBindings = expandBoundAttributesForField(this.dir, this.node, this.customFormControlType);
        if (additionalBindings !== null) {
          boundAttrs.push(...additionalBindings);
        }
      }
    }
    const identifier = this.dir.matchSource === MatchSource4.HostDirective ? ExpressionIdentifier.HOST_DIRECTIVE : ExpressionIdentifier.DIRECTIVE;
    id.addExpressionIdentifier(identifier, this.directiveIndex).addParseSpanInfo(span);
    for (const attr of boundAttrs) {
      if (!this.tcb.env.config.checkTypeOfAttributes && typeof attr.value === "string") {
        continue;
      }
      for (const { fieldName, isTwoWayBinding } of attr.inputs) {
        if (genericInputs.has(fieldName)) {
          continue;
        }
        const expression = translateInput(attr.value, this.tcb, this.scope);
        genericInputs.set(fieldName, {
          type: "binding",
          field: fieldName,
          expression,
          originalExpression: attr.value,
          sourceSpan: attr.sourceSpan,
          isTwoWayBinding
        });
      }
    }
    for (const { classPropertyName } of this.dir.inputs) {
      if (!genericInputs.has(classPropertyName)) {
        genericInputs.set(classPropertyName, { type: "unset", field: classPropertyName });
      }
    }
    const typeCtor = tcbCallTypeCtor(this.dir, this.tcb, Array.from(genericInputs.values()));
    typeCtor.markIgnoreDiagnostics();
    this.scope.addStatement(new TcbExpr(`var ${id.print()} = ${typeCtor.print()}`));
    return id;
  }
  circularFallback() {
    return new TcbDirectiveCtorCircularFallbackOp(this.tcb, this.scope, this.dir);
  }
};
var TcbDirectiveCtorCircularFallbackOp = class extends TcbOp {
  tcb;
  scope;
  dir;
  constructor(tcb, scope, dir) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.dir = dir;
  }
  get optional() {
    return false;
  }
  execute() {
    const id = this.tcb.allocateId();
    const typeCtor = this.tcb.env.typeCtorFor(this.dir);
    this.scope.addStatement(new TcbExpr(`var ${id} = ${typeCtor.print()}(null!)`));
    return new TcbExpr(id);
  }
};
function tcbCallTypeCtor(dir, tcb, inputs) {
  const typeCtor = tcb.env.typeCtorFor(dir);
  let literal = "{ ";
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const propertyName = quoteAndEscape(input.field);
    const isLast = i === inputs.length - 1;
    if (input.type === "binding") {
      let expr = widenBinding(input.expression, tcb, input.originalExpression);
      if (input.isTwoWayBinding && tcb.env.config.allowSignalsInTwoWayBindings) {
        expr = unwrapWritableSignal(expr, tcb);
      }
      const assignment = new TcbExpr(`${propertyName}: ${expr.wrapForTypeChecker().print()}`);
      assignment.addParseSpanInfo(input.sourceSpan);
      literal += assignment.print();
    } else {
      literal += `${propertyName}: 0 as any`;
    }
    literal += `${isLast ? "" : ","} `;
  }
  literal += "}";
  return new TcbExpr(`${typeCtor.print()}(${literal})`);
}

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/content_projection.js
import { createCssSelectorFromNode, CssSelector as CssSelector2, SelectorMatcher, TmplAstElement as TmplAstElement6, TmplAstForLoopBlock, TmplAstIfBlock, TmplAstSwitchBlock, TmplAstTemplate as TmplAstTemplate4, TmplAstText } from "@angular/compiler";
var TcbControlFlowContentProjectionOp = class extends TcbOp {
  tcb;
  element;
  ngContentSelectors;
  componentName;
  category;
  constructor(tcb, element, ngContentSelectors, componentName) {
    super();
    this.tcb = tcb;
    this.element = element;
    this.ngContentSelectors = ngContentSelectors;
    this.componentName = componentName;
    this.category = tcb.env.config.controlFlowPreventingContentProjection === "error" ? OutOfBadDiagnosticCategory.Error : OutOfBadDiagnosticCategory.Warning;
  }
  optional = false;
  execute() {
    const controlFlowToCheck = this.findPotentialControlFlowNodes();
    if (controlFlowToCheck.length > 0) {
      const matcher = new SelectorMatcher();
      for (const selector of this.ngContentSelectors) {
        if (selector !== "*") {
          matcher.addSelectables(CssSelector2.parse(selector), selector);
        }
      }
      for (const root of controlFlowToCheck) {
        for (const child of root.children) {
          if (child instanceof TmplAstElement6 || child instanceof TmplAstTemplate4) {
            matcher.match(createCssSelectorFromNode(child), (_, originalSelector) => {
              this.tcb.oobRecorder.controlFlowPreventingContentProjection(this.tcb.id, this.category, child, this.componentName, originalSelector, root, this.tcb.hostPreserveWhitespaces);
            });
          }
        }
      }
    }
    return null;
  }
  findPotentialControlFlowNodes() {
    const result = [];
    for (const child of this.element.children) {
      if (child instanceof TmplAstForLoopBlock) {
        if (this.shouldCheck(child)) {
          result.push(child);
        }
        if (child.empty !== null && this.shouldCheck(child.empty)) {
          result.push(child.empty);
        }
      } else if (child instanceof TmplAstIfBlock) {
        for (const branch of child.branches) {
          if (this.shouldCheck(branch)) {
            result.push(branch);
          }
        }
      } else if (child instanceof TmplAstSwitchBlock) {
        for (const current of child.groups) {
          if (this.shouldCheck(current)) {
            result.push(current);
          }
        }
      }
    }
    return result;
  }
  shouldCheck(node) {
    if (node.children.length < 2) {
      return false;
    }
    let hasSeenRootNode = false;
    for (const child of node.children) {
      if (!(child instanceof TmplAstText) || this.tcb.hostPreserveWhitespaces || child.value.trim().length > 0) {
        if (hasSeenRootNode) {
          return true;
        }
        hasSeenRootNode = true;
      }
    }
    return false;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/intersection_observer.js
var TcbIntersectionObserverOp = class extends TcbOp {
  tcb;
  scope;
  options;
  constructor(tcb, scope, options) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.options = options;
  }
  optional = false;
  execute() {
    const options = tcbExpression(this.options, this.tcb, this.scope);
    this.scope.addStatement(new TcbExpr(`new IntersectionObserver(null!, ${options.print()})`));
    return null;
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/host.js
var TcbHostElementOp = class extends TcbOp {
  tcb;
  scope;
  element;
  optional = true;
  constructor(tcb, scope, element) {
    super();
    this.tcb = tcb;
    this.scope = scope;
    this.element = element;
  }
  execute() {
    const id = this.tcb.allocateId();
    let tagNames;
    if (this.element.tagNames.length === 1) {
      tagNames = `"${this.element.tagNames[0]}"`;
    } else {
      tagNames = `null! as ${this.element.tagNames.map((t) => `"${t}"`).join(" | ")}`;
    }
    const initializer = new TcbExpr(`document.createElement(${tagNames})`);
    initializer.addParseSpanInfo(this.element.sourceSpan);
    this.scope.addStatement(new TcbExpr(`var ${id} = ${initializer.print()}`));
    return new TcbExpr(id);
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/ops/scope.js
var Scope = class _Scope {
  tcb;
  parent;
  guard;
  /**
   * A queue of operations which need to be performed to generate the TCB code for this scope.
   *
   * This array can contain either a `TcbOp` which has yet to be executed, or a `TcbExpr|null`
   * representing the memoized result of executing the operation. As operations are executed, their
   * results are written into the `opQueue`, overwriting the original operation.
   *
   * If an operation is in the process of being executed, it is temporarily overwritten here with
   * `INFER_TYPE_FOR_CIRCULAR_OP_EXPR`. This way, if a cycle is encountered where an operation
   * depends transitively on its own result, the inner operation will infer the least narrow type
   * that fits instead. This has the same semantics as TypeScript itself when types are referenced
   * circularly.
   */
  opQueue = [];
  /**
   * A map of `TmplAstElement`s to the index of their `TcbElementOp` in the `opQueue`
   */
  elementOpMap = /* @__PURE__ */ new Map();
  /**
   * A map of `TmplAstHostElement`s to the index of their `TcbHostElementOp` in the `opQueue`
   */
  hostElementOpMap = /* @__PURE__ */ new Map();
  /**
   * A map of `TmplAstComponent`s to the index of their `TcbComponentNodeOp` in the `opQueue`
   */
  componentNodeOpMap = /* @__PURE__ */ new Map();
  /**
   * A map of maps which tracks the index of `TcbDirectiveCtorOp`s in the `opQueue` for each
   * directive on a `TmplAstElement` or `TmplAstTemplate` node.
   */
  directiveOpMap = /* @__PURE__ */ new Map();
  /**
   * A map of `TmplAstReference`s to the index of their `TcbReferenceOp` in the `opQueue`
   */
  referenceOpMap = /* @__PURE__ */ new Map();
  /**
   * Map of immediately nested <ng-template>s (within this `Scope`) represented by `TmplAstTemplate`
   * nodes to the index of their `TcbTemplateContextOp`s in the `opQueue`.
   */
  templateCtxOpMap = /* @__PURE__ */ new Map();
  /**
   * Map of variables declared on the template that created this `Scope` (represented by
   * `TmplAstVariable` nodes) to the index of their `TcbVariableOp`s in the `opQueue`, or to
   * pre-resolved variable identifiers.
   */
  varMap = /* @__PURE__ */ new Map();
  /**
   * A map of the names of `TmplAstLetDeclaration`s to the index of their op in the `opQueue`.
   *
   * Assumes that there won't be duplicated `@let` declarations within the same scope.
   */
  letDeclOpMap = /* @__PURE__ */ new Map();
  /**
   * Statements for this template.
   *
   * Executing the `TcbOp`s in the `opQueue` populates this array.
   */
  statements = [];
  /**
   * Gets names of the for loop context variables and their types.
   */
  static getForLoopContextVariableTypes() {
    return /* @__PURE__ */ new Map([
      ["$first", "boolean"],
      ["$last", "boolean"],
      ["$even", "boolean"],
      ["$odd", "boolean"],
      ["$index", "number"],
      ["$count", "number"]
    ]);
  }
  constructor(tcb, parent = null, guard = null) {
    this.tcb = tcb;
    this.parent = parent;
    this.guard = guard;
  }
  /**
   * Constructs a `Scope` given either a `TmplAstTemplate` or a list of `TmplAstNode`s.
   *
   * @param tcb the overall context of TCB generation.
   * @param parentScope the `Scope` of the parent template (if any) or `null` if this is the root
   * `Scope`.
   * @param scopedNode Node that provides the scope around the child nodes (e.g. a
   * `TmplAstTemplate` node exposing variables to its children).
   * @param children Child nodes that should be appended to the TCB.
   * @param guard an expression that is applied to this scope for type narrowing purposes.
   */
  static forNodes(tcb, parentScope, scopedNode, children, guard) {
    const scope = new _Scope(tcb, parentScope, guard);
    if (parentScope === null && tcb.env.config.enableTemplateTypeChecker) {
      scope.opQueue.push(new TcbComponentContextCompletionOp(scope));
    }
    if (scopedNode instanceof TmplAstTemplate5) {
      const varMap = /* @__PURE__ */ new Map();
      for (const v of scopedNode.variables) {
        if (!varMap.has(v.name)) {
          varMap.set(v.name, v);
        } else {
          const firstDecl = varMap.get(v.name);
          tcb.oobRecorder.duplicateTemplateVar(tcb.id, v, firstDecl);
        }
        _Scope.registerVariable(scope, v, new TcbTemplateVariableOp(tcb, scope, scopedNode, v));
      }
    } else if (scopedNode instanceof TmplAstIfBlockBranch) {
      const { expression, expressionAlias } = scopedNode;
      if (expression !== null && expressionAlias !== null) {
        _Scope.registerVariable(scope, expressionAlias, new TcbBlockVariableOp(tcb, scope, tcbExpression(expression, tcb, scope), expressionAlias));
      }
    } else if (scopedNode instanceof TmplAstForLoopBlock2) {
      const loopInitializer = new TcbExpr(tcb.allocateId());
      loopInitializer.addParseSpanInfo(scopedNode.item.sourceSpan);
      scope.varMap.set(scopedNode.item, loopInitializer);
      const forLoopContextVariableTypes = _Scope.getForLoopContextVariableTypes();
      for (const variable of scopedNode.contextVariables) {
        if (!forLoopContextVariableTypes.has(variable.value)) {
          throw new Error(`Unrecognized for loop context variable ${variable.name}`);
        }
        const type = new TcbExpr(forLoopContextVariableTypes.get(variable.value));
        _Scope.registerVariable(scope, variable, new TcbBlockImplicitVariableOp(tcb, scope, type, variable));
      }
    } else if (scopedNode instanceof TmplAstHostElement5) {
      scope.appendNode(scopedNode);
    }
    if (children !== null) {
      for (const node of children) {
        scope.appendNode(node);
      }
    }
    for (const variable of scope.varMap.keys()) {
      _Scope.checkConflictingLet(scope, variable);
    }
    for (const ref of scope.referenceOpMap.keys()) {
      _Scope.checkConflictingLet(scope, ref);
    }
    return scope;
  }
  /** Registers a local variable with a scope. */
  static registerVariable(scope, variable, op) {
    const opIndex = scope.opQueue.push(op) - 1;
    scope.varMap.set(variable, opIndex);
  }
  /**
   * Look up a `ts.Expression` representing the value of some operation in the current `Scope`,
   * including any parent scope(s). This method always returns a mutable clone of the
   * `ts.Expression` with the comments cleared.
   *
   * @param node a `TmplAstNode` of the operation in question. The lookup performed will depend on
   * the type of this node:
   *
   * Assuming `directive` is not present, then `resolve` will return:
   *
   * * `TmplAstElement` - retrieve the expression for the element DOM node
   * * `TmplAstTemplate` - retrieve the template context variable
   * * `TmplAstVariable` - retrieve a template let- variable
   * * `TmplAstLetDeclaration` - retrieve a template `@let` declaration
   * * `TmplAstReference` - retrieve variable created for the local ref
   *
   * @param directive if present, a directive type on a `TmplAstElement` or `TmplAstTemplate` to
   * look up instead of the default for an element or template node.
   */
  resolve(node, directive) {
    const res = this.resolveLocal(node, directive);
    if (res !== null) {
      return res;
    } else if (this.parent !== null) {
      return this.parent.resolve(node, directive);
    } else {
      throw new Error(`Could not resolve ${node} / ${directive}`);
    }
  }
  /**
   * Add a statement to this scope.
   */
  addStatement(stmt) {
    this.statements.push(stmt);
  }
  /**
   * Get the statements.
   */
  render() {
    for (let i = 0; i < this.opQueue.length; i++) {
      const skipOptional = !this.tcb.env.config.enableTemplateTypeChecker;
      this.executeOp(i, skipOptional);
    }
    return this.statements;
  }
  /**
   * Returns an expression of all template guards that apply to this scope, including those of
   * parent scopes. If no guards have been applied, null is returned.
   */
  guards() {
    let parentGuards = null;
    if (this.parent !== null) {
      parentGuards = this.parent.guards();
    }
    if (this.guard === null) {
      return parentGuards;
    } else if (parentGuards === null) {
      return typeof this.guard === "string" ? new TcbExpr(this.guard) : this.guard;
    } else {
      const guard = typeof this.guard === "string" ? this.guard : this.guard.print();
      return new TcbExpr(`(${parentGuards.print()}) && (${guard})`);
    }
  }
  /** Returns whether a template symbol is defined locally within the current scope. */
  isLocal(node) {
    if (node instanceof TmplAstVariable2) {
      return this.varMap.has(node);
    }
    if (node instanceof TmplAstLetDeclaration2) {
      return this.letDeclOpMap.has(node.name);
    }
    return this.referenceOpMap.has(node);
  }
  /**
   * Constructs a `Scope` given either a `TmplAstTemplate` or a list of `TmplAstNode`s.
   * This is identical to `Scope.forNodes` which we can't reference in some ops due to
   * circular dependencies.
   *.
   * @param parentScope the `Scope` of the parent template.
   * @param scopedNode Node that provides the scope around the child nodes (e.g. a
   * `TmplAstTemplate` node exposing variables to its children).
   * @param children Child nodes that should be appended to the TCB.
   * @param guard an expression that is applied to this scope for type narrowing purposes.
   */
  createChildScope(parentScope, scopedNode, children, guard) {
    return _Scope.forNodes(this.tcb, parentScope, scopedNode, children, guard);
  }
  resolveLocal(ref, directive) {
    if (ref instanceof TmplAstReference && this.referenceOpMap.has(ref)) {
      return this.resolveOp(this.referenceOpMap.get(ref));
    } else if (ref instanceof TmplAstLetDeclaration2 && this.letDeclOpMap.has(ref.name)) {
      return this.resolveOp(this.letDeclOpMap.get(ref.name).opIndex);
    } else if (ref instanceof TmplAstVariable2 && this.varMap.has(ref)) {
      const opIndexOrNode = this.varMap.get(ref);
      return typeof opIndexOrNode === "number" ? this.resolveOp(opIndexOrNode) : new TcbExpr(opIndexOrNode.print(
        true
        /* ignoreComments */
      ));
    } else if (ref instanceof TmplAstTemplate5 && directive === void 0 && this.templateCtxOpMap.has(ref)) {
      return this.resolveOp(this.templateCtxOpMap.get(ref));
    } else if ((ref instanceof TmplAstElement7 || ref instanceof TmplAstTemplate5 || ref instanceof TmplAstComponent2 || ref instanceof TmplAstDirective || ref instanceof TmplAstHostElement5) && directive !== void 0 && this.directiveOpMap.has(ref)) {
      const dirMap = this.directiveOpMap.get(ref);
      return dirMap.has(directive) ? this.resolveOp(dirMap.get(directive)) : null;
    } else if (ref instanceof TmplAstElement7 && this.elementOpMap.has(ref)) {
      return this.resolveOp(this.elementOpMap.get(ref));
    } else if (ref instanceof TmplAstComponent2 && this.componentNodeOpMap.has(ref)) {
      return this.resolveOp(this.componentNodeOpMap.get(ref));
    } else if (ref instanceof TmplAstHostElement5 && this.hostElementOpMap.has(ref)) {
      return this.resolveOp(this.hostElementOpMap.get(ref));
    } else {
      return null;
    }
  }
  /**
   * Like `executeOp`, but assert that the operation actually returned `TcbExpr`.
   */
  resolveOp(opIndex) {
    const res = this.executeOp(
      opIndex,
      /* skipOptional */
      false
    );
    if (res === null) {
      throw new Error(`Error resolving operation, got null`);
    }
    return res;
  }
  /**
   * Execute a particular `TcbOp` in the `opQueue`.
   *
   * This method replaces the operation in the `opQueue` with the result of execution (once done)
   * and also protects against a circular dependency from the operation to itself by temporarily
   * setting the operation's result to a special expression.
   */
  executeOp(opIndex, skipOptional) {
    const op = this.opQueue[opIndex];
    if (!(op instanceof TcbOp)) {
      return op === null ? null : new TcbExpr(op.print(
        true
        /* ignoreComments */
      ));
    }
    if (skipOptional && op.optional) {
      return null;
    }
    this.opQueue[opIndex] = op.circularFallback();
    let res = op.execute();
    if (res !== null) {
      res = new TcbExpr(res.print(
        true
        /* ignoreComments */
      ));
    }
    this.opQueue[opIndex] = res;
    return res;
  }
  appendNode(node) {
    if (node instanceof TmplAstElement7) {
      const opIndex = this.opQueue.push(new TcbElementOp(this.tcb, this, node)) - 1;
      this.elementOpMap.set(node, opIndex);
      if (this.tcb.env.config.controlFlowPreventingContentProjection !== "suppress") {
        this.appendContentProjectionCheckOp(node);
      }
      this.appendDirectivesAndInputsOfElementLikeNode(node);
      this.appendOutputsOfElementLikeNode(node, node.inputs, node.outputs);
      this.appendSelectorlessDirectives(node);
      this.appendChildren(node);
      this.checkAndAppendReferencesOfNode(node);
    } else if (node instanceof TmplAstTemplate5) {
      this.appendDirectivesAndInputsOfElementLikeNode(node);
      this.appendOutputsOfElementLikeNode(node, node.inputs, node.outputs);
      this.appendSelectorlessDirectives(node);
      const ctxIndex = this.opQueue.push(new TcbTemplateContextOp(this.tcb, this)) - 1;
      this.templateCtxOpMap.set(node, ctxIndex);
      if (this.tcb.env.config.checkTemplateBodies) {
        this.opQueue.push(new TcbTemplateBodyOp(this.tcb, this, node));
      } else if (this.tcb.env.config.alwaysCheckSchemaInTemplateBodies) {
        this.appendDeepSchemaChecks(node.children);
      }
      this.checkAndAppendReferencesOfNode(node);
    } else if (node instanceof TmplAstComponent2) {
      this.appendComponentNode(node);
    } else if (node instanceof TmplAstDeferredBlock) {
      this.appendDeferredBlock(node);
    } else if (node instanceof TmplAstIfBlock2) {
      this.opQueue.push(new TcbIfOp(this.tcb, this, node));
    } else if (node instanceof TmplAstSwitchBlock2) {
      this.opQueue.push(new TcbSwitchOp(this.tcb, this, node));
    } else if (node instanceof TmplAstForLoopBlock2) {
      this.opQueue.push(new TcbForOfOp(this.tcb, this, node));
      node.empty && this.tcb.env.config.checkControlFlowBodies && this.appendChildren(node.empty);
    } else if (node instanceof TmplAstBoundText) {
      this.opQueue.push(new TcbExpressionOp(this.tcb, this, node.value));
    } else if (node instanceof TmplAstIcu) {
      this.appendIcuExpressions(node);
    } else if (node instanceof TmplAstContent) {
      this.appendChildren(node);
    } else if (node instanceof TmplAstLetDeclaration2) {
      const opIndex = this.opQueue.push(new TcbLetDeclarationOp(this.tcb, this, node)) - 1;
      if (this.isLocal(node)) {
        this.tcb.oobRecorder.conflictingDeclaration(this.tcb.id, node);
      } else {
        this.letDeclOpMap.set(node.name, { opIndex, node });
      }
    } else if (node instanceof TmplAstHostElement5) {
      this.appendHostElement(node);
    }
  }
  appendChildren(node) {
    for (const child of node.children) {
      this.appendNode(child);
    }
  }
  checkAndAppendReferencesOfNode(node) {
    for (const ref of node.references) {
      const target = this.tcb.boundTarget.getReferenceTarget(ref);
      let ctxIndex;
      if (target === null) {
        this.tcb.oobRecorder.missingReferenceTarget(this.tcb.id, ref);
        ctxIndex = this.opQueue.push(new TcbInvalidReferenceOp(this.tcb, this)) - 1;
      } else if (target instanceof TmplAstTemplate5 || target instanceof TmplAstElement7) {
        ctxIndex = this.opQueue.push(new TcbReferenceOp(this.tcb, this, ref, node, target)) - 1;
      } else {
        ctxIndex = this.opQueue.push(new TcbReferenceOp(this.tcb, this, ref, node, target.directive)) - 1;
      }
      this.referenceOpMap.set(ref, ctxIndex);
    }
  }
  appendDirectivesAndInputsOfElementLikeNode(node) {
    const claimedInputs = /* @__PURE__ */ new Set();
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    if (directives === null || directives.length === 0) {
      if (node instanceof TmplAstElement7) {
        this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node.inputs, node, claimedInputs), new TcbDomSchemaCheckerOp(
          this.tcb,
          node,
          /* checkElement */
          true,
          claimedInputs
        ));
      }
      return;
    }
    this.reportConflictingBindings(node);
    if (node instanceof TmplAstElement7) {
      const isDeferred = this.tcb.boundTarget.isDeferred(node);
      if (!isDeferred && directives.some((dirMeta) => dirMeta.isExplicitlyDeferred)) {
        this.tcb.oobRecorder.deferredComponentUsedEagerly(this.tcb.id, node);
      }
    }
    if (node instanceof TmplAstElement7) {
      const matchedComponents = directives.filter((dir) => dir.isComponent);
      if (matchedComponents.length > 1) {
        this.tcb.oobRecorder.multipleMatchingComponents(this.tcb.id, node, matchedComponents.map((dir) => dir.name));
      }
    }
    const dirMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < directives.length; i++) {
      const dir = directives[i];
      this.appendDirectiveInputs(dir, node, dirMap, directives, i);
    }
    this.directiveOpMap.set(node, dirMap);
    if (node instanceof TmplAstElement7) {
      for (const dir of directives) {
        for (const propertyName of dir.inputs.propertyNames) {
          claimedInputs.add(propertyName);
        }
      }
      this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node.inputs, node, claimedInputs));
      const checkElement = directives.length === 0;
      this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, checkElement, claimedInputs));
    }
  }
  appendOutputsOfElementLikeNode(node, bindings, events) {
    const claimedOutputs = /* @__PURE__ */ new Set();
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    if (directives === null || directives.length === 0) {
      if (node instanceof TmplAstElement7) {
        this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, events, bindings, claimedOutputs));
      }
      return;
    }
    for (const dir of directives) {
      this.opQueue.push(new TcbDirectiveOutputsOp(this.tcb, this, node, bindings, events, dir));
    }
    if (node instanceof TmplAstElement7 || node instanceof TmplAstHostElement5) {
      for (const dir of directives) {
        for (const outputProperty of dir.outputs.propertyNames) {
          claimedOutputs.add(outputProperty);
        }
      }
      this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, events, bindings, claimedOutputs));
    }
  }
  appendInputsOfSelectorlessNode(node) {
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    const claimedInputs = /* @__PURE__ */ new Set();
    if (directives !== null && directives.length > 0) {
      const dirMap = /* @__PURE__ */ new Map();
      for (let i = 0; i < directives.length; i++) {
        const dir = directives[i];
        this.appendDirectiveInputs(dir, node, dirMap, directives, i);
        for (const propertyName of dir.inputs.propertyNames) {
          claimedInputs.add(propertyName);
        }
      }
      this.directiveOpMap.set(node, dirMap);
    }
    this.reportConflictingBindings(node);
    if (node instanceof TmplAstDirective) {
      for (const input of node.inputs) {
        if (!claimedInputs.has(input.name)) {
          this.tcb.oobRecorder.unclaimedDirectiveBinding(this.tcb.id, node, input);
        }
      }
      for (const attr of node.attributes) {
        if (!claimedInputs.has(attr.name)) {
          this.tcb.oobRecorder.unclaimedDirectiveBinding(this.tcb.id, node, attr);
        }
      }
    } else {
      const checkElement = node.tagName !== null;
      this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node.inputs, node, claimedInputs), new TcbDomSchemaCheckerOp(this.tcb, node, checkElement, claimedInputs));
    }
  }
  appendOutputsOfSelectorlessNode(node) {
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    const claimedOutputs = /* @__PURE__ */ new Set();
    if (directives !== null && directives.length > 0) {
      for (const dir of directives) {
        this.opQueue.push(new TcbDirectiveOutputsOp(this.tcb, this, node, node.inputs, node.outputs, dir));
        for (const outputProperty of dir.outputs.propertyNames) {
          claimedOutputs.add(outputProperty);
        }
      }
    }
    if (node instanceof TmplAstDirective) {
      for (const output of node.outputs) {
        if (!claimedOutputs.has(output.name)) {
          this.tcb.oobRecorder.unclaimedDirectiveBinding(this.tcb.id, node, output);
        }
      }
    } else {
      this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, node.outputs, node.inputs, claimedOutputs));
    }
  }
  appendDirectiveInputs(dir, node, dirMap, allDirectiveMatches, directiveIndex) {
    const nodeIsFormControl = isFormControl(allDirectiveMatches);
    const customFormControlType = nodeIsFormControl ? getCustomFieldDirectiveType(dir) : null;
    const directiveOp = this.getDirectiveOp(dir, node, customFormControlType, directiveIndex);
    const dirIndex = this.opQueue.push(directiveOp) - 1;
    dirMap.set(dir, dirIndex);
    if (isNativeField(dir, node, allDirectiveMatches)) {
      const inputType = node.name === "input" && node.attributes.find((attr) => attr.name === "type")?.value || null;
      this.opQueue.push(inputType === "radio" ? new TcbNativeRadioButtonFieldOp(this.tcb, this, node) : new TcbNativeFieldOp(this.tcb, this, node, inputType));
    }
    this.opQueue.push(new TcbDirectiveInputsOp(this.tcb, this, node, dir, nodeIsFormControl, customFormControlType));
  }
  getDirectiveOp(dir, node, customFieldType, directiveIndex) {
    if (!dir.isGeneric) {
      return new TcbNonGenericDirectiveTypeOp(this.tcb, this, node, dir, directiveIndex);
    } else if (!dir.requiresInlineTypeCtor || this.tcb.env.config.useInlineTypeConstructors) {
      return new TcbDirectiveCtorOp(this.tcb, this, node, dir, customFieldType, directiveIndex);
    }
    return new TcbGenericDirectiveTypeWithAnyParamsOp(this.tcb, this, node, dir, directiveIndex);
  }
  appendSelectorlessDirectives(node) {
    for (const directive of node.directives) {
      if (!this.tcb.boundTarget.referencedDirectiveExists(directive.name)) {
        this.tcb.oobRecorder.missingNamedTemplateDependency(this.tcb.id, directive);
        continue;
      }
      const directives = this.tcb.boundTarget.getDirectivesOfNode(directive);
      if (directives === null || directives.length === 0 || directives.some((dir) => dir.isComponent || !dir.isStandalone)) {
        this.tcb.oobRecorder.incorrectTemplateDependencyType(this.tcb.id, directive);
        continue;
      }
      this.appendInputsOfSelectorlessNode(directive);
      this.appendOutputsOfSelectorlessNode(directive);
      this.checkAndAppendReferencesOfNode(directive);
    }
  }
  appendDeepSchemaChecks(nodes) {
    for (const node of nodes) {
      if (!(node instanceof TmplAstElement7 || node instanceof TmplAstTemplate5)) {
        continue;
      }
      if (node instanceof TmplAstElement7) {
        const claimedInputs = /* @__PURE__ */ new Set();
        let directives = this.tcb.boundTarget.getDirectivesOfNode(node);
        for (const dirNode of node.directives) {
          const directiveResults = this.tcb.boundTarget.getDirectivesOfNode(dirNode);
          if (directiveResults !== null && directiveResults.length > 0) {
            directives ??= [];
            directives.push(...directiveResults);
          }
        }
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
      this.opQueue.push(new TcbExpressionOp(this.tcb, this, variable.value));
    }
    for (const placeholder of Object.values(node.placeholders)) {
      if (placeholder instanceof TmplAstBoundText) {
        this.opQueue.push(new TcbExpressionOp(this.tcb, this, placeholder.value));
      }
    }
  }
  appendContentProjectionCheckOp(root) {
    const meta = this.tcb.boundTarget.getDirectivesOfNode(root)?.find((meta2) => meta2.isComponent) || null;
    if (meta !== null && meta.ngContentSelectors !== null && meta.ngContentSelectors.length > 0) {
      const selectors = meta.ngContentSelectors;
      if (selectors.length > 1 || selectors.length === 1 && selectors[0] !== "*") {
        this.opQueue.push(new TcbControlFlowContentProjectionOp(this.tcb, root, selectors, meta.name));
      }
    }
  }
  appendComponentNode(node) {
    if (!this.tcb.boundTarget.referencedDirectiveExists(node.componentName)) {
      this.tcb.oobRecorder.missingNamedTemplateDependency(this.tcb.id, node);
      return;
    }
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    if (directives === null || directives.length === 0 || directives.every((dir) => !dir.isComponent || !dir.isStandalone)) {
      this.tcb.oobRecorder.incorrectTemplateDependencyType(this.tcb.id, node);
      return;
    }
    const opIndex = this.opQueue.push(new TcbComponentNodeOp(this.tcb, this, node)) - 1;
    this.componentNodeOpMap.set(node, opIndex);
    if (this.tcb.env.config.controlFlowPreventingContentProjection !== "suppress") {
      this.appendContentProjectionCheckOp(node);
    }
    this.appendInputsOfSelectorlessNode(node);
    this.appendOutputsOfSelectorlessNode(node);
    this.appendSelectorlessDirectives(node);
    this.appendChildren(node);
    this.checkAndAppendReferencesOfNode(node);
  }
  appendDeferredBlock(block) {
    this.appendDeferredTriggers(block, block.triggers);
    this.appendDeferredTriggers(block, block.prefetchTriggers);
    if (block.hydrateTriggers.when) {
      this.opQueue.push(new TcbConditionOp(this.tcb, this, block.hydrateTriggers.when.value));
    }
    this.appendChildren(block);
    if (block.placeholder !== null) {
      this.appendChildren(block.placeholder);
    }
    if (block.loading !== null) {
      this.appendChildren(block.loading);
    }
    if (block.error !== null) {
      this.appendChildren(block.error);
    }
  }
  appendDeferredTriggers(block, triggers) {
    if (triggers.when !== void 0) {
      this.opQueue.push(new TcbConditionOp(this.tcb, this, triggers.when.value));
    }
    if (triggers.viewport !== void 0 && triggers.viewport.options !== null) {
      this.opQueue.push(new TcbIntersectionObserverOp(this.tcb, this, triggers.viewport.options));
    }
    if (triggers.hover !== void 0) {
      this.validateReferenceBasedDeferredTrigger(block, triggers.hover);
    }
    if (triggers.interaction !== void 0) {
      this.validateReferenceBasedDeferredTrigger(block, triggers.interaction);
    }
    if (triggers.viewport !== void 0) {
      this.validateReferenceBasedDeferredTrigger(block, triggers.viewport);
    }
  }
  appendHostElement(node) {
    const opIndex = this.opQueue.push(new TcbHostElementOp(this.tcb, this, node)) - 1;
    const directives = this.tcb.boundTarget.getDirectivesOfNode(node);
    if (directives !== null && directives.length > 0) {
      const directiveOpMap = /* @__PURE__ */ new Map();
      for (const directive of directives) {
        const directiveOp = this.getDirectiveOp(directive, node, null);
        directiveOpMap.set(directive, this.opQueue.push(directiveOp) - 1);
      }
      this.directiveOpMap.set(node, directiveOpMap);
    }
    this.hostElementOpMap.set(node, opIndex);
    this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node.bindings, node, null), new TcbDomSchemaCheckerOp(this.tcb, node, false, null));
    this.appendOutputsOfElementLikeNode(node, null, node.listeners);
  }
  validateReferenceBasedDeferredTrigger(block, trigger) {
    if (trigger.reference === null) {
      if (block.placeholder === null) {
        this.tcb.oobRecorder.deferImplicitTriggerMissingPlaceholder(this.tcb.id, trigger);
        return;
      }
      let rootNode = null;
      for (const child of block.placeholder.children) {
        if (!this.tcb.hostPreserveWhitespaces && child instanceof TmplAstText2 && child.value.trim().length === 0) {
          continue;
        }
        if (rootNode === null) {
          rootNode = child;
        } else {
          rootNode = null;
          break;
        }
      }
      if (rootNode === null || !(rootNode instanceof TmplAstElement7)) {
        this.tcb.oobRecorder.deferImplicitTriggerInvalidPlaceholder(this.tcb.id, trigger);
      }
      return;
    }
    if (this.tcb.boundTarget.getDeferredTriggerTarget(block, trigger) === null) {
      this.tcb.oobRecorder.inaccessibleDeferredTriggerElement(this.tcb.id, trigger);
    }
  }
  /** Reports a diagnostic if there are any `@let` declarations that conflict with a node. */
  static checkConflictingLet(scope, node) {
    if (scope.letDeclOpMap.has(node.name)) {
      scope.tcb.oobRecorder.conflictingDeclaration(scope.tcb.id, scope.letDeclOpMap.get(node.name).node);
    }
  }
  reportConflictingBindings(node) {
    const conflictingBindings = this.tcb.boundTarget.getConflictingHostDirectiveBindings(node);
    if (conflictingBindings !== null) {
      for (const binding of conflictingBindings) {
        this.tcb.oobRecorder.conflictingHostDirectiveBinding(this.tcb.id, node, binding.directive.name, binding.kind, binding.classPropertyName, Array.from(binding.conflictingAliases));
      }
    }
  }
};

// packages/compiler-cli/src/ngtsc/typecheck/src/type_check_block.js
function generateTypeCheckBlock(env, component, name, meta, domSchemaChecker, oobRecorder) {
  const tcb = new Context2(env, domSchemaChecker, oobRecorder, meta.id, meta.boundTarget, meta.pipes, meta.schemas, meta.isStandalone, meta.preserveWhitespaces);
  const ctxRawType = env.referenceTcbValue(component.ref);
  const { typeParameters, typeArguments } = component;
  const typeParamsStr = !env.config.useContextGenericType || typeParameters === null || typeParameters.length === 0 ? "" : `<${typeParameters.map((p) => p.representation).join(", ")}>`;
  const typeArgsStr = typeArguments === null || typeArguments.length === 0 ? "" : `<${typeArguments.join(", ")}>`;
  const thisParamStr = `this: ${ctxRawType.print()}${typeArgsStr}`;
  const statements = [];
  if (tcb.boundTarget.target.template !== void 0) {
    const templateScope = Scope.forNodes(
      tcb,
      null,
      null,
      tcb.boundTarget.target.template,
      /* guard */
      null
    );
    statements.push(renderBlockStatements(env, templateScope, "true"));
  }
  if (tcb.boundTarget.target.host !== void 0) {
    const hostScope = Scope.forNodes(tcb, null, tcb.boundTarget.target.host.node, null, null);
    statements.push(renderBlockStatements(env, hostScope, createHostBindingsBlockGuard()));
  }
  const bodyStr = `{
${statements.join("\n")}
}`;
  const funcDeclStr = `function ${name}${typeParamsStr}(${thisParamStr}) ${bodyStr}`;
  return `/*${meta.id}*/
${funcDeclStr}`;
}
function renderBlockStatements(env, scope, wrapperExpression) {
  const scopeStatements = scope.render();
  const statements = getStatementsBlock([...env.getPreludeStatements(), ...scopeStatements]);
  return `if (${wrapperExpression}) {
${statements}
}`;
}

// packages/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder.js
import { AST, ASTWithName as ASTWithName2, ASTWithSource as ASTWithSource2, Binary as Binary2, BindingPipe as BindingPipe2, MatchSource as MatchSource5, PropertyRead as PropertyRead7, R3Identifiers as R3Identifiers5, SafePropertyRead as SafePropertyRead3, TmplAstBoundAttribute as TmplAstBoundAttribute4, TmplAstBoundEvent as TmplAstBoundEvent2, TmplAstComponent as TmplAstComponent3, TmplAstDirective as TmplAstDirective2, TmplAstElement as TmplAstElement8, TmplAstLetDeclaration as TmplAstLetDeclaration3, TmplAstReference as TmplAstReference2, TmplAstTemplate as TmplAstTemplate6, TmplAstTextAttribute, TmplAstVariable as TmplAstVariable3 } from "@angular/compiler";
import ts32 from "typescript";

// packages/compiler-cli/src/ngtsc/typecheck/src/ts_util.js
import ts31 from "typescript";
function isAccessExpression(node) {
  return ts31.isPropertyAccessExpression(node) || ts31.isElementAccessExpression(node);
}
function isDirectiveDeclaration(node) {
  const sourceFile = node.getSourceFile();
  return (ts31.isTypeNode(node) || ts31.isIdentifier(node)) && ts31.isVariableDeclaration(node.parent) && (hasExpressionIdentifier(sourceFile, node, ExpressionIdentifier.DIRECTIVE) || hasExpressionIdentifier(sourceFile, node, ExpressionIdentifier.HOST_DIRECTIVE));
}
function isSymbolAliasOf(firstSymbol, lastSymbol, typeChecker) {
  let currentSymbol = lastSymbol;
  const seenSymbol = /* @__PURE__ */ new Set();
  while (firstSymbol !== currentSymbol && currentSymbol !== void 0 && currentSymbol.flags & ts31.SymbolFlags.Alias) {
    if (seenSymbol.has(currentSymbol)) {
      break;
    }
    seenSymbol.add(currentSymbol);
    currentSymbol = typeChecker.getImmediateAliasedSymbol(currentSymbol);
    if (currentSymbol === firstSymbol) {
      return true;
    }
  }
  return false;
}

// packages/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder.js
var SymbolBuilder = class {
  tcbPath;
  tcbIsShim;
  typeCheckBlock;
  boundTarget;
  typeCheckingConfig;
  symbolCache = /* @__PURE__ */ new Map();
  constructor(tcbPath, tcbIsShim, typeCheckBlock, boundTarget, typeCheckingConfig) {
    this.tcbPath = tcbPath;
    this.tcbIsShim = tcbIsShim;
    this.typeCheckBlock = typeCheckBlock;
    this.boundTarget = boundTarget;
    this.typeCheckingConfig = typeCheckingConfig;
  }
  getSymbol(node) {
    if (this.symbolCache.has(node)) {
      return this.symbolCache.get(node);
    }
    let symbol = null;
    if (node instanceof TmplAstBoundAttribute4 || node instanceof TmplAstTextAttribute) {
      symbol = this.getSymbolOfInputBinding(node);
    } else if (node instanceof TmplAstBoundEvent2) {
      symbol = this.getSymbolOfBoundEvent(node);
    } else if (node instanceof TmplAstElement8) {
      symbol = this.getSymbolOfElement(node);
    } else if (node instanceof TmplAstComponent3) {
      symbol = this.getSymbolOfSelectorlessComponent(node);
    } else if (node instanceof TmplAstDirective2) {
      symbol = this.getSymbolOfSelectorlessDirective(node);
    } else if (node instanceof TmplAstTemplate6) {
      symbol = this.getSymbolOfAstTemplate(node);
    } else if (node instanceof TmplAstVariable3) {
      symbol = this.getSymbolOfVariable(node);
    } else if (node instanceof TmplAstLetDeclaration3) {
      symbol = this.getSymbolOfLetDeclaration(node);
    } else if (node instanceof TmplAstReference2) {
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
    const elementSourceSpan = element.startSourceSpan ?? element.sourceSpan;
    const node = findFirstMatchingNode(this.typeCheckBlock, {
      withSpan: elementSourceSpan,
      filter: ts32.isVariableDeclaration
    });
    if (node === null) {
      return null;
    }
    const tcbLocation = this.getTcbLocationForNode(node);
    const directives = this.getDirectivesOfNode(element);
    return {
      kind: SymbolKind.Element,
      tcbLocation,
      directives,
      templateNode: element
    };
  }
  getSymbolOfSelectorlessComponent(node) {
    const directives = this.getDirectivesOfNode(node);
    const primaryDirective = directives.find((dir) => dir.matchSource === MatchSource5.Selector && dir.isComponent) ?? null;
    if (primaryDirective === null) {
      return null;
    }
    return {
      tcbLocation: primaryDirective.tcbLocation,
      kind: SymbolKind.SelectorlessComponent,
      directives,
      templateNode: node
    };
  }
  getSymbolOfSelectorlessDirective(node) {
    const directives = this.getDirectivesOfNode(node);
    const primaryDirective = directives.find((dir) => dir.matchSource === MatchSource5.Selector && !dir.isComponent) ?? null;
    if (primaryDirective === null) {
      return null;
    }
    return {
      tcbLocation: primaryDirective.tcbLocation,
      kind: SymbolKind.SelectorlessDirective,
      directives,
      templateNode: node
    };
  }
  getDirectivesOfNode(templateNode) {
    const elementSourceSpan = templateNode.startSourceSpan ?? templateNode.sourceSpan;
    const boundDirectives = this.boundTarget.getDirectivesOfNode(templateNode) ?? [];
    let symbols = this.getDirectiveSymbolsForDirectives(boundDirectives, elementSourceSpan);
    if (!(templateNode instanceof TmplAstDirective2)) {
      const firstChild = templateNode.children.find((c) => c instanceof TmplAstElement8);
      if (firstChild !== void 0) {
        const isMicrosyntaxTemplate = templateNode instanceof TmplAstTemplate6 && sourceSpanEqual(firstChild.sourceSpan, templateNode.sourceSpan);
        if (isMicrosyntaxTemplate) {
          const firstChildDirectives = this.boundTarget.getDirectivesOfNode(firstChild);
          if (firstChildDirectives !== null) {
            const childSymbols = this.getDirectiveSymbolsForDirectives(firstChildDirectives, elementSourceSpan);
            for (const symbol of childSymbols) {
              if (!symbols.some((s) => s.ref.name === symbol.ref.name && s.ref.filePath === symbol.ref.filePath)) {
                symbols.push(symbol);
              }
            }
          }
        }
      }
    }
    return symbols;
  }
  getDirectiveSymbolsForDirectives(boundDirectives, span) {
    const nodes = findAllMatchingNodes(this.typeCheckBlock, {
      withSpan: span,
      filter: isDirectiveDeclaration
    });
    const hostDirectiveMap = /* @__PURE__ */ new Map();
    for (const d of boundDirectives) {
      if (d.hostDirectives) {
        for (const hd of d.hostDirectives) {
          if (isHostDirectiveMetaForGlobalMode(hd)) {
            const key = `${hd.directive.node.getSourceFile().fileName}#${hd.directive.node.name.text}`;
            hostDirectiveMap.set(key, hd);
          }
        }
      }
    }
    const symbols = [];
    const seenDirectives = /* @__PURE__ */ new Set();
    const sf = this.typeCheckBlock.getSourceFile();
    for (const node of nodes) {
      const id = readDirectiveIdFromComment(sf, node);
      if (id === null)
        continue;
      const meta = boundDirectives[id];
      if (!meta)
        continue;
      const ref = meta.getSymbolReference();
      const refKey = `${ref.filePath}#${ref.name}`;
      if (!seenDirectives.has(refKey)) {
        const ref2 = meta.getSymbolReference();
        const key = `${ref2.filePath}#${ref2.name}`;
        const hostMeta = hostDirectiveMap.get(key) || null;
        const directiveSymbol = hostMeta ? {
          tcbLocation: this.getTcbLocationForNode(node),
          ref: ref2,
          selector: meta.selector,
          isComponent: meta.isComponent,
          ngModule: meta.getNgModule(),
          kind: SymbolKind.Directive,
          isStructural: meta.isStructural,
          isInScope: true,
          tsCompletionEntryInfos: null,
          matchSource: MatchSource5.HostDirective,
          exposedInputs: hostMeta.inputs,
          exposedOutputs: hostMeta.outputs
        } : {
          tcbLocation: this.getTcbLocationForNode(node),
          ref: ref2,
          selector: meta.selector,
          isComponent: meta.isComponent,
          ngModule: meta.getNgModule(),
          kind: SymbolKind.Directive,
          isStructural: meta.isStructural,
          isInScope: true,
          tsCompletionEntryInfos: null,
          matchSource: MatchSource5.Selector
        };
        symbols.push(directiveSymbol);
        seenDirectives.add(refKey);
      }
    }
    return symbols;
  }
  getSymbolOfBoundEvent(eventBinding) {
    const consumer = this.boundTarget.getConsumerOfBinding(eventBinding);
    if (consumer === null) {
      return null;
    }
    let expectedAccess;
    if (consumer instanceof TmplAstTemplate6 || consumer instanceof TmplAstElement8) {
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
      if (ts32.isPropertyAccessExpression(n)) {
        return n.name.getText() === expectedAccess;
      } else {
        return ts32.isStringLiteral(n.argumentExpression) && n.argumentExpression.text === expectedAccess;
      }
    }
    const outputFieldAccesses = findAllMatchingNodes(this.typeCheckBlock, {
      withSpan: eventBinding.keySpan,
      filter
    });
    const bindings = [];
    for (const outputFieldAccess of outputFieldAccesses) {
      if (consumer instanceof TmplAstTemplate6 || consumer instanceof TmplAstElement8) {
        if (!ts32.isPropertyAccessExpression(outputFieldAccess)) {
          continue;
        }
        const addEventListener = outputFieldAccess.name;
        const target = this.getSymbol(consumer);
        if (target === null) {
          continue;
        }
        bindings.push({
          kind: SymbolKind.Binding,
          target,
          tcbLocation: this.getTcbLocationForNode(addEventListener),
          tcbTypeLocation: this.getTcbSpanForNode(addEventListener)
        });
      } else {
        if (!ts32.isElementAccessExpression(outputFieldAccess)) {
          continue;
        }
        const target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess, consumer);
        if (target === null) {
          continue;
        }
        bindings.push({
          kind: SymbolKind.Binding,
          target,
          tcbLocation: this.getTcbLocationForNode(outputFieldAccess),
          tcbTypeLocation: this.getTcbSpanForNode(outputFieldAccess)
        });
      }
    }
    if (bindings.length === 0) {
      return null;
    }
    return { kind: SymbolKind.Output, bindings };
  }
  getSymbolOfInputBinding(binding) {
    const consumer = this.boundTarget.getConsumerOfBinding(binding);
    if (consumer === null) {
      return null;
    }
    if (consumer instanceof TmplAstElement8 || consumer instanceof TmplAstTemplate6) {
      const host = this.getSymbol(consumer);
      return host !== null ? { kind: SymbolKind.DomBinding, host } : null;
    }
    if (!consumer.inputs.hasBindingPropertyName(binding.name)) {
      return null;
    }
    const nodes = findAllMatchingNodes(this.typeCheckBlock, {
      withSpan: binding.sourceSpan,
      filter: isAssignment
    });
    const bindings = [];
    for (const node of nodes) {
      if (!isAccessExpression(node.left)) {
        continue;
      }
      const signalInputAssignment = unwrapSignalInputWriteTAccessor(node.left);
      let fieldAccessExpr;
      let tcbLocation;
      if (signalInputAssignment !== null) {
        if (ts32.isIdentifier(signalInputAssignment.fieldExpr)) {
          continue;
        }
        fieldAccessExpr = signalInputAssignment.fieldExpr;
        tcbLocation = this.getTcbLocationForNode(fieldAccessExpr);
      } else {
        fieldAccessExpr = node.left;
        tcbLocation = this.getTcbLocationForNode(fieldAccessExpr);
      }
      const target = this.getDirectiveSymbolForAccessExpression(fieldAccessExpr, consumer);
      if (target === null) {
        continue;
      }
      if (!consumer.inputs.hasBindingPropertyName(binding.name)) {
        continue;
      }
      bindings.push({
        tcbLocation,
        tcbTypeLocation: this.getTcbSpanForNode(fieldAccessExpr),
        kind: SymbolKind.Binding,
        target
      });
    }
    if (bindings.length === 0) {
      return null;
    }
    return { kind: SymbolKind.Input, bindings };
  }
  getDirectiveSymbolForAccessExpression(fieldAccessExpr, meta) {
    return {
      ref: meta.getSymbolReference(),
      kind: SymbolKind.Directive,
      tcbLocation: this.getTcbLocationForNode(fieldAccessExpr.expression),
      isComponent: meta.isComponent,
      isStructural: meta.isStructural,
      selector: meta.selector,
      ngModule: meta.getNgModule(),
      matchSource: MatchSource5.Selector,
      isInScope: true,
      // TODO: this should always be in scope in this context, right?
      tsCompletionEntryInfos: null
    };
  }
  getSymbolOfVariable(variable) {
    const node = findFirstMatchingNode(this.typeCheckBlock, {
      withSpan: variable.sourceSpan,
      filter: ts32.isVariableDeclaration
    });
    if (node === null) {
      return null;
    }
    let initializerNode = null;
    if (ts32.isForOfStatement(node.parent.parent)) {
      initializerNode = node;
    } else if (node.initializer !== void 0) {
      initializerNode = node.initializer;
    }
    if (initializerNode === null) {
      return null;
    }
    return {
      kind: SymbolKind.Variable,
      declaration: variable,
      localVarLocation: this.getTcbLocationForNode(node.name),
      initializerLocation: this.getTcbLocationForNode(initializerNode)
    };
  }
  getSymbolOfReference(ref) {
    const target = this.boundTarget.getReferenceTarget(ref);
    if (target === null) {
      return null;
    }
    if (target instanceof TmplAstElement8 && !this.typeCheckingConfig.checkTypeOfDomReferences) {
      return null;
    }
    if (!(target instanceof TmplAstElement8) && !this.typeCheckingConfig.checkTypeOfNonDomReferences) {
      return null;
    }
    let node = findFirstMatchingNode(this.typeCheckBlock, {
      withSpan: ref.sourceSpan,
      filter: ts32.isVariableDeclaration
    });
    if (node === null || node.initializer === void 0) {
      return null;
    }
    let targetNode = node.initializer;
    if (ts32.isCallExpression(targetNode)) {
      return null;
    }
    if (ts32.isParenthesizedExpression(targetNode) && ts32.isAsExpression(targetNode.expression)) {
      targetNode = node.name;
    }
    const targetLocation = {
      tcbPath: this.tcbPath,
      isShimFile: this.tcbIsShim,
      positionInFile: this.getTcbPositionForNode(targetNode)
    };
    const referenceVarTcbLocation = {
      tcbPath: this.tcbPath,
      isShimFile: this.tcbIsShim,
      positionInFile: this.getTcbPositionForNode(node)
    };
    if (target instanceof TmplAstTemplate6 || target instanceof TmplAstElement8) {
      return {
        kind: SymbolKind.Reference,
        target,
        declaration: ref,
        targetLocation,
        referenceVarLocation: referenceVarTcbLocation
      };
    } else {
      const targetNode2 = target.directive.getReferenceTargetNode();
      if (targetNode2 === null) {
        return null;
      }
      return {
        kind: SymbolKind.Reference,
        declaration: ref,
        target: targetNode2,
        targetLocation,
        referenceVarLocation: referenceVarTcbLocation
      };
    }
  }
  getSymbolOfLetDeclaration(decl) {
    const node = findFirstMatchingNode(this.typeCheckBlock, {
      withSpan: decl.sourceSpan,
      filter: ts32.isVariableDeclaration
    });
    if (node === null || node.initializer === void 0) {
      return null;
    }
    return {
      kind: SymbolKind.LetDeclaration,
      declaration: decl,
      localVarLocation: this.getTcbLocationForNode(node.name),
      initializerLocation: this.getTcbLocationForNode(node.initializer)
    };
  }
  getSymbolOfPipe(expression) {
    const methodAccessId = findFirstMatchingNode(this.typeCheckBlock, {
      withSpan: expression.nameSpan,
      filter: ts32.isIdentifier
    });
    if (methodAccessId === null || !ts32.isPropertyAccessExpression(methodAccessId.parent)) {
      return null;
    }
    const methodAccess = methodAccessId.parent;
    const pipeVariableNode = methodAccess.expression;
    return {
      tcbLocation: this.getTcbLocationForNode(methodAccess),
      kind: SymbolKind.Pipe,
      classSymbol: {
        tcbLocation: this.getTcbLocationForNode(pipeVariableNode),
        isPipeClassSymbol: true
      }
    };
  }
  getSymbolOfTemplateExpression(expression) {
    if (expression instanceof ASTWithSource2) {
      expression = expression.ast;
    }
    const expressionTarget = this.boundTarget.getExpressionTarget(expression);
    if (expressionTarget !== null) {
      return this.getSymbol(expressionTarget);
    }
    let withSpan = expression.sourceSpan;
    if (expression instanceof Binary2 && Binary2.isAssignmentOperation(expression.operation) && expression.left instanceof PropertyRead7) {
      withSpan = expression.left.nameSpan;
    } else if (expression instanceof ASTWithName2 && !(expression instanceof SafePropertyRead3) && expression.constructor.name !== "MethodCall") {
      withSpan = expression.nameSpan;
    }
    let node = null;
    if (expression instanceof PropertyRead7 || expression instanceof SafePropertyRead3) {
      node = findFirstMatchingNode(this.typeCheckBlock, {
        withSpan,
        filter: ts32.isPropertyAccessExpression
      });
    }
    if (node === null) {
      node = findFirstMatchingNode(this.typeCheckBlock, { withSpan, filter: anyNodeFilter });
    }
    if (node === null && expression instanceof SafePropertyRead3) {
      const nameNode = findFirstMatchingNode(this.typeCheckBlock, {
        withSpan: expression.nameSpan,
        filter: anyNodeFilter
      });
      if (nameNode !== null) {
        node = nameNode;
        while (node.parent !== void 0 && (ts32.isParenthesizedExpression(node.parent) || ts32.isNonNullExpression(node.parent) || isAccessExpression(node.parent))) {
          node = node.parent;
        }
      }
    }
    if (node === null) {
      return null;
    }
    while (ts32.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    if (expression instanceof SafePropertyRead3 && ts32.isConditionalExpression(node)) {
      return {
        tcbLocation: this.getTcbLocationForNode(node.whenTrue),
        tcbTypeLocation: this.getTcbSpanForNode(node),
        kind: SymbolKind.Expression
      };
    } else {
      return {
        tcbLocation: this.getTcbLocationForNode(node),
        tcbTypeLocation: this.getTcbSpanForNode(node),
        kind: SymbolKind.Expression
      };
    }
  }
  getTcbSpanForNode(node) {
    while (ts32.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    return {
      tcbPath: this.tcbPath,
      isShimFile: this.tcbIsShim,
      positionInFile: node.getStart(),
      endInFile: node.getEnd()
    };
  }
  getTcbLocationForNode(node) {
    while (ts32.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    return {
      tcbPath: this.tcbPath,
      isShimFile: this.tcbIsShim,
      positionInFile: this.getTcbPositionForNode(node)
    };
  }
  getTcbPositionForNode(node) {
    if (ts32.isTypeReferenceNode(node)) {
      return this.getTcbPositionForNode(node.typeName);
    } else if (ts32.isQualifiedName(node)) {
      return node.right.getStart();
    } else if (ts32.isPropertyAccessExpression(node)) {
      return node.name.getStart();
    } else if (ts32.isElementAccessExpression(node)) {
      return node.argumentExpression.getStart();
    } else if (ts32.isCallExpression(node)) {
      return this.getTcbPositionForNode(node.expression);
    } else if (ts32.isAsExpression(node)) {
      return this.getTcbPositionForNode(node.expression);
    } else if (ts32.isNonNullExpression(node)) {
      return this.getTcbPositionForNode(node.expression);
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
function unwrapSignalInputWriteTAccessor(expr) {
  if (!ts32.isElementAccessExpression(expr) || !ts32.isPropertyAccessExpression(expr.argumentExpression)) {
    return null;
  }
  if (!ts32.isIdentifier(expr.argumentExpression.name) || expr.argumentExpression.name.text !== R3Identifiers5.InputSignalBrandWriteType.name) {
    return null;
  }
  if (!ts32.isPropertyAccessExpression(expr.expression) && !ts32.isElementAccessExpression(expr.expression) && !ts32.isIdentifier(expr.expression)) {
    throw new Error("Unexpected expression for signal input write type.");
  }
  return {
    fieldExpr: expr.expression,
    typeExpr: expr
  };
}

export {
  ErrorCode,
  COMPILER_ERRORS_WITH_GUIDES,
  replaceTsWithNgInErrors,
  ngErrorCode,
  FatalDiagnosticError,
  makeDiagnostic,
  makeDiagnosticChain,
  makeRelatedInformation,
  isFatalDiagnosticError,
  isLocalCompilationDiagnostics,
  DOC_PAGE_BASE_URL,
  ERROR_DETAILS_PAGE_BASE_URL,
  ExtendedTemplateDiagnosticName,
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
  toUnredirectedSourceFile,
  ImportFlags,
  ReferenceEmitKind,
  assertSuccessfulReferenceEmit,
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
  getProjectRelativePath,
  NoopImportRewriter,
  R3SymbolsImportRewriter,
  loadIsReferencedAliasDeclarationPatch,
  isAliasImportDeclaration,
  attachDefaultImportDeclaration,
  getDefaultImportDeclaration,
  DefaultImportTracker,
  ClassMemberKind,
  ClassMemberAccessLevel,
  AmbientImport,
  typeNodeToValueExpr,
  entityNameToValue,
  isNamedClassDeclaration,
  classMemberAccessLevelToString,
  TypeScriptReflectionHost,
  filterToMembersWithDecorator,
  reflectClassMember,
  reflectObjectLiteral,
  DeferredSymbolTracker,
  ImportedSymbolsTracker,
  LocalCompilationExtraImportsTracker,
  Reference,
  ModuleResolver,
  MetaKind,
  extractDirectiveTypeCheckMeta,
  CompoundMetadataReader,
  hasInjectableFields,
  isHostDirectiveMetaForGlobalMode,
  DtsMetadataReader,
  flattenInheritedDirectiveMetadata,
  LocalMetadataRegistry,
  CompoundMetadataRegistry,
  ResourceRegistry,
  ExportedProviderStatusResolver,
  HostDirectivesResolver,
  presetImportManagerForceNamespaceImports,
  ImportManager,
  translateType,
  translateExpression,
  translateStatement,
  ExpressionIdentifier,
  findFirstMatchingNode,
  findAllMatchingNodes,
  hasExpressionIdentifier,
  isDirectiveDeclaration,
  isSymbolAliasOf,
  OptimizeFor,
  CompletionKind,
  PotentialImportKind,
  PotentialImportMode,
  SymbolKind,
  OutOfBadDiagnosticCategory,
  makeTemplateDiagnostic,
  getTypeCheckId,
  TypeParameterEmitter,
  createHostElement,
  getStatementsBlock,
  tempPrint,
  TcbInliningRequirement,
  requiresInlineTypeCheckBlock,
  getSourceMapping,
  findTypeCheckBlock,
  ensureTypeCheckFilePreparationImports,
  generateTcbTypeParameters,
  generateInlineTypeCtor,
  requiresInlineTypeCtor,
  TcbGenericContextBehavior,
  RegistryDomSchemaChecker,
  ReferenceEmitEnvironment,
  Environment,
  generateTypeCheckBlock,
  SymbolBuilder
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
//# sourceMappingURL=chunk-WEYFV6TY.js.map
