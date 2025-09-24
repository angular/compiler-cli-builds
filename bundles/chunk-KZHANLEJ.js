
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  SourceFileLoader
} from "./chunk-HYJ2H3FU.js";
import {
  Context,
  ExpressionTranslatorVisitor
} from "./chunk-LS5RJ5CS.js";

// packages/compiler-cli/linker/src/fatal_linker_error.js
var FatalLinkerError = class extends Error {
  node;
  type = "FatalLinkerError";
  /**
   * Create a new FatalLinkerError.
   *
   * @param node The AST node where the error occurred.
   * @param message A description of the error.
   */
  constructor(node, message) {
    super(message);
    this.node = node;
  }
};
function isFatalLinkerError(e) {
  return e && e.type === "FatalLinkerError";
}

// packages/compiler-cli/linker/src/ast/utils.js
function assert(node, predicate, expected) {
  if (!predicate(node)) {
    throw new FatalLinkerError(node, `Unsupported syntax, expected ${expected}.`);
  }
}

// packages/compiler-cli/linker/src/ast/ast_value.js
import * as o from "@angular/compiler";
var AstObject = class _AstObject {
  expression;
  obj;
  host;
  /**
   * Create a new `AstObject` from the given `expression` and `host`.
   */
  static parse(expression, host) {
    const obj = host.parseObjectLiteral(expression);
    return new _AstObject(expression, obj, host);
  }
  constructor(expression, obj, host) {
    this.expression = expression;
    this.obj = obj;
    this.host = host;
  }
  /**
   * Returns true if the object has a property called `propertyName`.
   */
  has(propertyName) {
    return this.obj.has(propertyName);
  }
  /**
   * Returns the number value of the property called `propertyName`.
   *
   * Throws an error if there is no such property or the property is not a number.
   */
  getNumber(propertyName) {
    return this.host.parseNumericLiteral(this.getRequiredProperty(propertyName));
  }
  /**
   * Returns the string value of the property called `propertyName`.
   *
   * Throws an error if there is no such property or the property is not a string.
   */
  getString(propertyName) {
    return this.host.parseStringLiteral(this.getRequiredProperty(propertyName));
  }
  /**
   * Returns the boolean value of the property called `propertyName`.
   *
   * Throws an error if there is no such property or the property is not a boolean.
   */
  getBoolean(propertyName) {
    return this.host.parseBooleanLiteral(this.getRequiredProperty(propertyName));
  }
  /**
   * Returns the nested `AstObject` parsed from the property called `propertyName`.
   *
   * Throws an error if there is no such property or the property is not an object.
   */
  getObject(propertyName) {
    const expr = this.getRequiredProperty(propertyName);
    const obj = this.host.parseObjectLiteral(expr);
    return new _AstObject(expr, obj, this.host);
  }
  /**
   * Returns an array of `AstValue` objects parsed from the property called `propertyName`.
   *
   * Throws an error if there is no such property or the property is not an array.
   */
  getArray(propertyName) {
    const arr = this.host.parseArrayLiteral(this.getRequiredProperty(propertyName));
    return arr.map((entry) => new AstValue(entry, this.host));
  }
  /**
   * Returns a `WrappedNodeExpr` object that wraps the expression at the property called
   * `propertyName`.
   *
   * Throws an error if there is no such property.
   */
  getOpaque(propertyName) {
    return new o.WrappedNodeExpr(this.getRequiredProperty(propertyName));
  }
  /**
   * Returns the raw `TExpression` value of the property called `propertyName`.
   *
   * Throws an error if there is no such property.
   */
  getNode(propertyName) {
    return this.getRequiredProperty(propertyName);
  }
  /**
   * Returns an `AstValue` that wraps the value of the property called `propertyName`.
   *
   * Throws an error if there is no such property.
   */
  getValue(propertyName) {
    return new AstValue(this.getRequiredProperty(propertyName), this.host);
  }
  /**
   * Converts the AstObject to a raw JavaScript object, mapping each property value (as an
   * `AstValue`) to the generic type (`T`) via the `mapper` function.
   */
  toLiteral(mapper) {
    const result = {};
    for (const [key, expression] of this.obj) {
      result[key] = mapper(new AstValue(expression, this.host), key);
    }
    return result;
  }
  /**
   * Converts the AstObject to a JavaScript Map, mapping each property value (as an
   * `AstValue`) to the generic type (`T`) via the `mapper` function.
   */
  toMap(mapper) {
    const result = /* @__PURE__ */ new Map();
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
var AstValue = class _AstValue {
  expression;
  host;
  /** Type brand that ensures that the `T` type is respected for assignability. */
  \u0275typeBrand = null;
  constructor(expression, host) {
    this.expression = expression;
    this.host = host;
  }
  /**
   * Get the name of the symbol represented by the given expression node, or `null` if it is not a
   * symbol.
   */
  getSymbolName() {
    return this.host.getSymbolName(this.expression);
  }
  /**
   * Is this value a number?
   */
  isNumber() {
    return this.host.isNumericLiteral(this.expression);
  }
  /**
   * Parse the number from this value, or error if it is not a number.
   */
  getNumber() {
    return this.host.parseNumericLiteral(this.expression);
  }
  /**
   * Is this value a string?
   */
  isString() {
    return this.host.isStringLiteral(this.expression);
  }
  /**
   * Parse the string from this value, or error if it is not a string.
   */
  getString() {
    return this.host.parseStringLiteral(this.expression);
  }
  /**
   * Is this value a boolean?
   */
  isBoolean() {
    return this.host.isBooleanLiteral(this.expression);
  }
  /**
   * Parse the boolean from this value, or error if it is not a boolean.
   */
  getBoolean() {
    return this.host.parseBooleanLiteral(this.expression);
  }
  /**
   * Is this value an object literal?
   */
  isObject() {
    return this.host.isObjectLiteral(this.expression);
  }
  /**
   * Parse this value into an `AstObject`, or error if it is not an object literal.
   */
  getObject() {
    return AstObject.parse(this.expression, this.host);
  }
  /**
   * Is this value an array literal?
   */
  isArray() {
    return this.host.isArrayLiteral(this.expression);
  }
  /** Whether the value is explicitly set to `null`. */
  isNull() {
    return this.host.isNull(this.expression);
  }
  /**
   * Parse this value into an array of `AstValue` objects, or error if it is not an array literal.
   */
  getArray() {
    const arr = this.host.parseArrayLiteral(this.expression);
    return arr.map((entry) => new _AstValue(entry, this.host));
  }
  /**
   * Is this value a function expression?
   */
  isFunction() {
    return this.host.isFunctionExpression(this.expression);
  }
  /**
   * Extract the return value as an `AstValue` from this value as a function expression, or error if
   * it is not a function expression.
   */
  getFunctionReturnValue() {
    return new _AstValue(this.host.parseReturnValue(this.expression), this.host);
  }
  /**
   * Extract the parameters from this value as a function expression, or error if it is not a
   * function expression.
   */
  getFunctionParameters() {
    return this.host.parseParameters(this.expression).map((param) => new _AstValue(param, this.host));
  }
  isCallExpression() {
    return this.host.isCallExpression(this.expression);
  }
  getCallee() {
    return new _AstValue(this.host.parseCallee(this.expression), this.host);
  }
  getArguments() {
    const args = this.host.parseArguments(this.expression);
    return args.map((arg) => new _AstValue(arg, this.host));
  }
  /**
   * Return the `TExpression` of this value wrapped in a `WrappedNodeExpr`.
   */
  getOpaque() {
    return new o.WrappedNodeExpr(this.expression);
  }
  /**
   * Get the range of the location of this value in the original source.
   */
  getRange() {
    return this.host.getRange(this.expression);
  }
};

// packages/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope.js
import { ConstantPool } from "@angular/compiler";

// packages/compiler-cli/linker/src/linker_import_generator.js
var LinkerImportGenerator = class {
  factory;
  ngImport;
  constructor(factory, ngImport) {
    this.factory = factory;
    this.ngImport = ngImport;
  }
  addImport(request) {
    this.assertModuleName(request.exportModuleSpecifier);
    if (request.exportSymbolName === null) {
      return this.ngImport;
    }
    return this.factory.createPropertyAccess(this.ngImport, request.exportSymbolName);
  }
  assertModuleName(moduleName) {
    if (moduleName !== "@angular/core") {
      throw new FatalLinkerError(this.ngImport, `Unable to import from anything other than '@angular/core'`);
    }
  }
};

// packages/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope.js
var EmitScope = class {
  ngImport;
  translator;
  factory;
  constantPool = new ConstantPool();
  constructor(ngImport, translator, factory) {
    this.ngImport = ngImport;
    this.translator = translator;
    this.factory = factory;
  }
  /**
   * Translate the given Output AST definition expression into a generic `TExpression`.
   *
   * Use a `LinkerImportGenerator` to handle any imports in the definition.
   */
  translateDefinition(definition) {
    const expression = this.translator.translateExpression(definition.expression, new LinkerImportGenerator(this.factory, this.ngImport));
    if (definition.statements.length > 0) {
      const importGenerator = new LinkerImportGenerator(this.factory, this.ngImport);
      return this.wrapInIifeWithStatements(expression, definition.statements.map((statement) => this.translator.translateStatement(statement, importGenerator)));
    } else {
      return expression;
    }
  }
  /**
   * Return any constant statements that are shared between all uses of this `EmitScope`.
   */
  getConstantStatements() {
    const importGenerator = new LinkerImportGenerator(this.factory, this.ngImport);
    return this.constantPool.statements.map((statement) => this.translator.translateStatement(statement, importGenerator));
  }
  wrapInIifeWithStatements(expression, statements) {
    const returnStatement = this.factory.createReturnStatement(expression);
    const body = this.factory.createBlock([...statements, returnStatement]);
    const fn = this.factory.createFunctionExpression(
      /* name */
      null,
      /* args */
      [],
      body
    );
    return this.factory.createCallExpression(
      fn,
      /* args */
      [],
      /* pure */
      false
    );
  }
};

// packages/compiler-cli/linker/src/file_linker/emit_scopes/local_emit_scope.js
var LocalEmitScope = class extends EmitScope {
  /**
   * Translate the given Output AST definition expression into a generic `TExpression`.
   *
   * Merges the `ConstantPool` statements with the definition statements when generating the
   * definition expression. This means that `ConstantPool` statements will be emitted into an IIFE.
   */
  translateDefinition(definition) {
    return super.translateDefinition({
      expression: definition.expression,
      statements: [...this.constantPool.statements, ...definition.statements]
    });
  }
  /**
   * It is not valid to call this method, since there will be no shared constant statements - they
   * are already emitted in the IIFE alongside the translated definition.
   */
  getConstantStatements() {
    throw new Error("BUG - LocalEmitScope should not expose any constant statements");
  }
};

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector.js
import semver3 from "semver";

// packages/compiler-cli/linker/src/file_linker/get_source_file.js
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

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_class_metadata_async_linker_1.js
import { compileOpaqueAsyncClassMetadata } from "@angular/compiler";
var PartialClassMetadataAsyncLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const resolveMetadataKey = "resolveMetadata";
    const resolveMetadata = metaObj.getValue(resolveMetadataKey);
    if (!resolveMetadata.isFunction()) {
      throw new FatalLinkerError(resolveMetadata, `Unsupported \`${resolveMetadataKey}\` value. Expected a function.`);
    }
    const dependencyResolverFunction = metaObj.getOpaque("resolveDeferredDeps");
    const deferredSymbolNames = resolveMetadata.getFunctionParameters().map((p) => p.getSymbolName());
    const returnValue = resolveMetadata.getFunctionReturnValue().getObject();
    const metadata = {
      type: metaObj.getOpaque("type"),
      decorators: returnValue.getOpaque("decorators"),
      ctorParameters: returnValue.getOpaque("ctorParameters"),
      propDecorators: returnValue.getOpaque("propDecorators")
    };
    return {
      expression: compileOpaqueAsyncClassMetadata(metadata, dependencyResolverFunction, deferredSymbolNames),
      statements: []
    };
  }
};

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_class_metadata_linker_1.js
import { compileClassMetadata } from "@angular/compiler";
var PartialClassMetadataLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3ClassMetadata(metaObj);
    return {
      expression: compileClassMetadata(meta),
      statements: []
    };
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

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1.js
import { ChangeDetectionStrategy, compileComponentFromMetadata, DEFAULT_INTERPOLATION_CONFIG, InterpolationConfig, makeBindingParser as makeBindingParser2, parseTemplate, R3TargetBinder, R3TemplateDependencyKind, ViewEncapsulation } from "@angular/compiler";
import semver2 from "semver";

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1.js
import { compileDirectiveFromMetadata, makeBindingParser, ParseLocation, ParseSourceFile, ParseSourceSpan } from "@angular/compiler";

// packages/compiler-cli/linker/src/file_linker/partial_linkers/util.js
import { createMayBeForwardRefExpression, outputAst as o2 } from "@angular/compiler";
import semver from "semver";
var PLACEHOLDER_VERSION = "21.0.0-next.5+sha-0e8e7ba";
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
    return createMayBeForwardRefExpression(
      expr.getOpaque(),
      0
      /* ForwardRefHandling.None */
    );
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
  return createMayBeForwardRefExpression(
    wrapperFn.getFunctionReturnValue().getOpaque(),
    2
    /* ForwardRefHandling.Unwrapped */
  );
}
var STANDALONE_IS_DEFAULT_RANGE = new semver.Range(`>= 19.0.0 || ${PLACEHOLDER_VERSION}`, {
  includePrerelease: true
});
function getDefaultStandaloneValue(version) {
  return STANDALONE_IS_DEFAULT_RANGE.test(version);
}

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_directive_linker_1.js
var PartialDirectiveLinkerVersion1 = class {
  sourceUrl;
  code;
  constructor(sourceUrl, code) {
    this.sourceUrl = sourceUrl;
    this.code = code;
  }
  linkPartialDeclaration(constantPool, metaObj, version) {
    const meta = toR3DirectiveMeta(metaObj, this.code, this.sourceUrl, version);
    return compileDirectiveFromMetadata(meta, constantPool, makeBindingParser());
  }
};
function toR3DirectiveMeta(metaObj, code, sourceUrl, version) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  return {
    typeSourceSpan: createSourceSpan(typeExpr.getRange(), code, sourceUrl),
    type: wrapReference(typeExpr.getOpaque()),
    typeArgumentCount: 0,
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
    usesInheritance: metaObj.has("usesInheritance") ? metaObj.getBoolean("usesInheritance") : false,
    isStandalone: metaObj.has("isStandalone") ? metaObj.getBoolean("isStandalone") : getDefaultStandaloneValue(version),
    isSignal: metaObj.has("isSignal") ? metaObj.getBoolean("isSignal") : false,
    hostDirectives: metaObj.has("hostDirectives") ? toHostDirectivesMetadata(metaObj.getValue("hostDirectives")) : null
  };
}
function toInputMapping(value, key) {
  if (value.isObject()) {
    const obj = value.getObject();
    const transformValue = obj.getValue("transformFunction");
    return {
      classPropertyName: obj.getString("classPropertyName"),
      bindingPropertyName: obj.getString("publicName"),
      isSignal: obj.getBoolean("isSignal"),
      required: obj.getBoolean("isRequired"),
      transformFunction: transformValue.isNull() ? null : transformValue.getOpaque()
    };
  }
  return parseLegacyInputPartialOutput(key, value);
}
function parseLegacyInputPartialOutput(key, value) {
  if (value.isString()) {
    return {
      bindingPropertyName: value.getString(),
      classPropertyName: key,
      required: false,
      transformFunction: null,
      isSignal: false
    };
  }
  const values = value.getArray();
  if (values.length !== 2 && values.length !== 3) {
    throw new FatalLinkerError(value.expression, "Unsupported input, expected a string or an array containing two strings and an optional function");
  }
  return {
    bindingPropertyName: values[0].getString(),
    classPropertyName: values[1].getString(),
    transformFunction: values.length > 2 ? values[2].getOpaque() : null,
    required: false,
    isSignal: false
  };
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
    predicate = extractForwardRef(predicateExpr);
  }
  return {
    propertyName: obj.getString("propertyName"),
    first: obj.has("first") ? obj.getBoolean("first") : false,
    predicate,
    descendants: obj.has("descendants") ? obj.getBoolean("descendants") : false,
    emitDistinctChangesOnly: obj.has("emitDistinctChangesOnly") ? obj.getBoolean("emitDistinctChangesOnly") : true,
    read: obj.has("read") ? obj.getOpaque("read") : null,
    static: obj.has("static") ? obj.getBoolean("static") : false,
    isSignal: obj.has("isSignal") ? obj.getBoolean("isSignal") : false
  };
}
function toHostDirectivesMetadata(hostDirectives) {
  return hostDirectives.getArray().map((hostDirective) => {
    const hostObject = hostDirective.getObject();
    const type = extractForwardRef(hostObject.getValue("directive"));
    const meta = {
      directive: wrapReference(type.expression),
      isForwardReference: type.forwardRef !== 0,
      inputs: hostObject.has("inputs") ? getHostDirectiveBindingMapping(hostObject.getArray("inputs")) : null,
      outputs: hostObject.has("outputs") ? getHostDirectiveBindingMapping(hostObject.getArray("outputs")) : null
    };
    return meta;
  });
}
function getHostDirectiveBindingMapping(array) {
  let result = null;
  for (let i = 1; i < array.length; i += 2) {
    result = result || {};
    result[array[i - 1].getString()] = array[i].getString();
  }
  return result;
}
function createSourceSpan(range, code, sourceUrl) {
  const sourceFile = new ParseSourceFile(code, sourceUrl);
  const startLocation = new ParseLocation(sourceFile, range.startPos, range.startLine, range.startCol);
  return new ParseSourceSpan(startLocation, startLocation.moveBy(range.endPos - range.startPos));
}

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_component_linker_1.js
function makeDirectiveMetadata(directiveExpr, typeExpr, isComponentByDefault = null) {
  return {
    kind: R3TemplateDependencyKind.Directive,
    isComponent: isComponentByDefault || directiveExpr.has("kind") && directiveExpr.getString("kind") === "component",
    type: typeExpr,
    selector: directiveExpr.getString("selector"),
    inputs: directiveExpr.has("inputs") ? directiveExpr.getArray("inputs").map((input) => input.getString()) : [],
    outputs: directiveExpr.has("outputs") ? directiveExpr.getArray("outputs").map((input) => input.getString()) : [],
    exportAs: directiveExpr.has("exportAs") ? directiveExpr.getArray("exportAs").map((exportAs) => exportAs.getString()) : null
  };
}
var PartialComponentLinkerVersion1 = class {
  getSourceFile;
  sourceUrl;
  code;
  constructor(getSourceFile, sourceUrl, code) {
    this.getSourceFile = getSourceFile;
    this.sourceUrl = sourceUrl;
    this.code = code;
  }
  linkPartialDeclaration(constantPool, metaObj, version) {
    const meta = this.toR3ComponentMeta(metaObj, version);
    return compileComponentFromMetadata(meta, constantPool, makeBindingParser2());
  }
  /**
   * This function derives the `R3ComponentMetadata` from the provided AST object.
   */
  toR3ComponentMeta(metaObj, version) {
    const interpolation = parseInterpolationConfig(metaObj);
    const templateSource = metaObj.getValue("template");
    const isInline = metaObj.has("isInline") ? metaObj.getBoolean("isInline") : false;
    const templateInfo = this.getTemplateInfo(templateSource, isInline);
    const { major, minor } = new semver2.SemVer(version);
    const enableBlockSyntax = major >= 17 || version === PLACEHOLDER_VERSION;
    const enableLetSyntax = major > 18 || major === 18 && minor >= 1 || version === PLACEHOLDER_VERSION;
    const template = parseTemplate(templateInfo.code, templateInfo.sourceUrl, {
      escapedString: templateInfo.isEscaped,
      interpolationConfig: interpolation,
      range: templateInfo.range,
      enableI18nLegacyMessageIdFormat: false,
      preserveWhitespaces: metaObj.has("preserveWhitespaces") ? metaObj.getBoolean("preserveWhitespaces") : false,
      // We normalize line endings if the template is was inline.
      i18nNormalizeLineEndingsInICUs: isInline,
      enableBlockSyntax,
      enableLetSyntax,
      // TODO(crisbeto): figure out how this is enabled.
      enableSelectorless: false
    });
    if (template.errors !== null) {
      const errors = template.errors.map((err) => err.toString()).join("\n");
      throw new FatalLinkerError(templateSource.expression, `Errors found in the template:
${errors}`);
    }
    let declarationListEmitMode = 0;
    const extractDeclarationTypeExpr = (type) => {
      const { expression, forwardRef } = extractForwardRef(type);
      if (forwardRef === 2) {
        declarationListEmitMode = 1;
      }
      return expression;
    };
    let declarations = [];
    if (metaObj.has("components")) {
      declarations.push(...metaObj.getArray("components").map((dir) => {
        const dirExpr = dir.getObject();
        const typeExpr = extractDeclarationTypeExpr(dirExpr.getValue("type"));
        return makeDirectiveMetadata(
          dirExpr,
          typeExpr,
          /* isComponentByDefault */
          true
        );
      }));
    }
    if (metaObj.has("directives")) {
      declarations.push(...metaObj.getArray("directives").map((dir) => {
        const dirExpr = dir.getObject();
        const typeExpr = extractDeclarationTypeExpr(dirExpr.getValue("type"));
        return makeDirectiveMetadata(dirExpr, typeExpr);
      }));
    }
    if (metaObj.has("pipes")) {
      const pipes = metaObj.getObject("pipes").toMap((pipe) => pipe);
      for (const [name, type] of pipes) {
        const typeExpr = extractDeclarationTypeExpr(type);
        declarations.push({
          kind: R3TemplateDependencyKind.Pipe,
          name,
          type: typeExpr
        });
      }
    }
    const baseMeta = toR3DirectiveMeta(metaObj, this.code, this.sourceUrl, version);
    const deferBlockDependencies = this.createR3ComponentDeferMetadata(metaObj, template);
    let hasDirectiveDependencies = false;
    for (const depFn of deferBlockDependencies.blocks.values()) {
      if (depFn !== null) {
        hasDirectiveDependencies = true;
      }
    }
    if (metaObj.has("dependencies")) {
      for (const dep of metaObj.getArray("dependencies")) {
        const depObj = dep.getObject();
        const typeExpr = extractDeclarationTypeExpr(depObj.getValue("type"));
        switch (depObj.getString("kind")) {
          case "directive":
          case "component":
            hasDirectiveDependencies = true;
            declarations.push(makeDirectiveMetadata(depObj, typeExpr));
            break;
          case "pipe":
            const pipeObj = depObj;
            declarations.push({
              kind: R3TemplateDependencyKind.Pipe,
              name: pipeObj.getString("name"),
              type: typeExpr
            });
            break;
          case "ngmodule":
            hasDirectiveDependencies = true;
            declarations.push({
              kind: R3TemplateDependencyKind.NgModule,
              type: typeExpr
            });
            break;
          default:
            continue;
        }
      }
    }
    return {
      ...baseMeta,
      viewProviders: metaObj.has("viewProviders") ? metaObj.getOpaque("viewProviders") : null,
      template: {
        nodes: template.nodes,
        ngContentSelectors: template.ngContentSelectors
      },
      declarationListEmitMode,
      styles: metaObj.has("styles") ? metaObj.getArray("styles").map((entry) => entry.getString()) : [],
      defer: deferBlockDependencies,
      encapsulation: metaObj.has("encapsulation") ? parseEncapsulation(metaObj.getValue("encapsulation")) : ViewEncapsulation.Emulated,
      interpolation,
      changeDetection: metaObj.has("changeDetection") ? parseChangeDetectionStrategy(metaObj.getValue("changeDetection")) : ChangeDetectionStrategy.Default,
      animations: metaObj.has("animations") ? metaObj.getOpaque("animations") : null,
      relativeContextFilePath: this.sourceUrl,
      relativeTemplatePath: null,
      i18nUseExternalIds: false,
      declarations,
      hasDirectiveDependencies: !baseMeta.isStandalone || hasDirectiveDependencies
    };
  }
  /**
   * Update the range to remove the start and end chars, which should be quotes around the template.
   */
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
    const templateContents = sourceFile.sources.find((src) => src?.sourcePath === pos.file).contents;
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
  createR3ComponentDeferMetadata(metaObj, template) {
    const result = {
      mode: 0,
      blocks: /* @__PURE__ */ new Map()
    };
    if (template.nodes.length === 0) {
      return result;
    }
    const boundTarget = new R3TargetBinder(null).bind({ template: template.nodes });
    const deferredBlocks = boundTarget.getDeferBlocks();
    const dependencies = metaObj.has("deferBlockDependencies") ? metaObj.getArray("deferBlockDependencies") : null;
    for (let i = 0; i < deferredBlocks.length; i++) {
      const matchingDependencyFn = dependencies?.[i];
      if (matchingDependencyFn == null) {
        result.blocks.set(deferredBlocks[i], null);
      } else {
        result.blocks.set(deferredBlocks[i], matchingDependencyFn.isNull() ? null : matchingDependencyFn.getOpaque());
      }
    }
    return result;
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

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1.js
import { compileFactoryFunction, FactoryTarget } from "@angular/compiler";
var PartialFactoryLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3FactoryMeta(metaObj);
    return compileFactoryFunction(meta);
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

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_injectable_linker_1.js
import { compileInjectable, createMayBeForwardRefExpression as createMayBeForwardRefExpression2, outputAst as o3 } from "@angular/compiler";
var PartialInjectableLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3InjectableMeta(metaObj);
    return compileInjectable(
      meta,
      /* resolveForwardRefs */
      false
    );
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
    typeArgumentCount: 0,
    providedIn: metaObj.has("providedIn") ? extractForwardRef(metaObj.getValue("providedIn")) : createMayBeForwardRefExpression2(
      o3.literal(null),
      0
      /* ForwardRefHandling.None */
    )
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

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1.js
import { compileInjector } from "@angular/compiler";
var PartialInjectorLinkerVersion1 = class {
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3InjectorMeta(metaObj);
    return compileInjector(meta);
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
    providers: metaObj.has("providers") ? metaObj.getOpaque("providers") : null,
    imports: metaObj.has("imports") ? metaObj.getArray("imports").map((i) => i.getOpaque()) : []
  };
}

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_ng_module_linker_1.js
import { compileNgModule, R3NgModuleMetadataKind, R3SelectorScopeMode } from "@angular/compiler";
var PartialNgModuleLinkerVersion1 = class {
  emitInline;
  constructor(emitInline) {
    this.emitInline = emitInline;
  }
  linkPartialDeclaration(constantPool, metaObj) {
    const meta = toR3NgModuleMeta(metaObj, this.emitInline);
    return compileNgModule(meta);
  }
};
function toR3NgModuleMeta(metaObj, supportJit) {
  const wrappedType = metaObj.getOpaque("type");
  const meta = {
    kind: R3NgModuleMetadataKind.Global,
    type: wrapReference(wrappedType),
    bootstrap: [],
    declarations: [],
    publicDeclarationTypes: null,
    includeImportTypes: true,
    imports: [],
    exports: [],
    selectorScopeMode: supportJit ? R3SelectorScopeMode.Inline : R3SelectorScopeMode.Omit,
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

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_pipe_linker_1.js
import { compilePipeFromMetadata } from "@angular/compiler";
var PartialPipeLinkerVersion1 = class {
  constructor() {
  }
  linkPartialDeclaration(constantPool, metaObj, version) {
    const meta = toR3PipeMeta(metaObj, version);
    return compilePipeFromMetadata(meta);
  }
};
function toR3PipeMeta(metaObj, version) {
  const typeExpr = metaObj.getValue("type");
  const typeName = typeExpr.getSymbolName();
  if (typeName === null) {
    throw new FatalLinkerError(typeExpr.expression, "Unsupported type, its name could not be determined");
  }
  const pure = metaObj.has("pure") ? metaObj.getBoolean("pure") : true;
  const isStandalone = metaObj.has("isStandalone") ? metaObj.getBoolean("isStandalone") : getDefaultStandaloneValue(version);
  return {
    name: typeName,
    type: wrapReference(typeExpr.getOpaque()),
    typeArgumentCount: 0,
    deps: null,
    pipeName: metaObj.getString("name"),
    pure,
    isStandalone
  };
}

// packages/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker_selector.js
var \u0275\u0275ngDeclareDirective = "\u0275\u0275ngDeclareDirective";
var \u0275\u0275ngDeclareClassMetadata = "\u0275\u0275ngDeclareClassMetadata";
var \u0275\u0275ngDeclareComponent = "\u0275\u0275ngDeclareComponent";
var \u0275\u0275ngDeclareFactory = "\u0275\u0275ngDeclareFactory";
var \u0275\u0275ngDeclareInjectable = "\u0275\u0275ngDeclareInjectable";
var \u0275\u0275ngDeclareInjector = "\u0275\u0275ngDeclareInjector";
var \u0275\u0275ngDeclareNgModule = "\u0275\u0275ngDeclareNgModule";
var \u0275\u0275ngDeclarePipe = "\u0275\u0275ngDeclarePipe";
var \u0275\u0275ngDeclareClassMetadataAsync = "\u0275\u0275ngDeclareClassMetadataAsync";
var declarationFunctions = [
  \u0275\u0275ngDeclareDirective,
  \u0275\u0275ngDeclareClassMetadata,
  \u0275\u0275ngDeclareComponent,
  \u0275\u0275ngDeclareFactory,
  \u0275\u0275ngDeclareInjectable,
  \u0275\u0275ngDeclareInjector,
  \u0275\u0275ngDeclareNgModule,
  \u0275\u0275ngDeclarePipe,
  \u0275\u0275ngDeclareClassMetadataAsync
];
function createLinkerMap(environment, sourceUrl, code) {
  const linkers = /* @__PURE__ */ new Map();
  const LATEST_VERSION_RANGE = getRange("<=", PLACEHOLDER_VERSION);
  linkers.set(\u0275\u0275ngDeclareDirective, [
    { range: LATEST_VERSION_RANGE, linker: new PartialDirectiveLinkerVersion1(sourceUrl, code) }
  ]);
  linkers.set(\u0275\u0275ngDeclareClassMetadataAsync, [
    { range: LATEST_VERSION_RANGE, linker: new PartialClassMetadataAsyncLinkerVersion1() }
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
  linkers;
  logger;
  unknownDeclarationVersionHandling;
  constructor(linkers, logger, unknownDeclarationVersionHandling) {
    this.linkers = linkers;
    this.logger = logger;
    this.unknownDeclarationVersionHandling = unknownDeclarationVersionHandling;
  }
  /**
   * Returns true if there are `PartialLinker` classes that can handle functions with this name.
   */
  supportsDeclaration(functionName) {
    return this.linkers.has(functionName);
  }
  /**
   * Returns the `PartialLinker` that can handle functions with the given name and version.
   * Throws an error if there is none.
   */
  getLinker(functionName, minVersion, version) {
    if (!this.linkers.has(functionName)) {
      throw new Error(`Unknown partial declaration function ${functionName}.`);
    }
    const linkerRanges = this.linkers.get(functionName);
    if (version === PLACEHOLDER_VERSION) {
      return linkerRanges[linkerRanges.length - 1].linker;
    }
    const declarationRange = getRange(">=", minVersion);
    for (const { range: linkerRange, linker } of linkerRanges) {
      if (semver3.intersects(declarationRange, linkerRange)) {
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
  if (versionStr === "0.0.0" && PLACEHOLDER_VERSION === "0.0.0") {
    return new semver3.Range("*.*.*");
  }
  const version = new semver3.SemVer(versionStr);
  version.prerelease = [];
  return new semver3.Range(`${comparator}${version.format()}`);
}

// packages/compiler-cli/linker/src/file_linker/file_linker.js
var FileLinker = class {
  linkerEnvironment;
  linkerSelector;
  emitScopes = /* @__PURE__ */ new Map();
  constructor(linkerEnvironment, sourceUrl, code) {
    this.linkerEnvironment = linkerEnvironment;
    this.linkerSelector = new PartialLinkerSelector(createLinkerMap(this.linkerEnvironment, sourceUrl, code), this.linkerEnvironment.logger, this.linkerEnvironment.options.unknownDeclarationVersionHandling);
  }
  /**
   * Return true if the given callee name matches a partial declaration that can be linked.
   */
  isPartialDeclaration(calleeName) {
    return this.linkerSelector.supportsDeclaration(calleeName);
  }
  /**
   * Link the metadata extracted from the args of a call to a partial declaration function.
   *
   * The `declarationScope` is used to determine the scope and strategy of emission of the linked
   * definition and any shared constant statements.
   *
   * @param declarationFn the name of the function used to declare the partial declaration - e.g.
   *     `ɵɵngDeclareDirective`.
   * @param args the arguments passed to the declaration function, should be a single object that
   *     corresponds to the `R3DeclareDirectiveMetadata` or `R3DeclareComponentMetadata` interfaces.
   * @param declarationScope the scope that contains this call to the declaration function.
   */
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
    const definition = linker.linkPartialDeclaration(emitScope.constantPool, metaObj, version);
    return emitScope.translateDefinition(definition);
  }
  /**
   * Return all the shared constant statements and their associated constant scope references, so
   * that they can be inserted into the source code.
   */
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
      return new LocalEmitScope(ngImport, this.linkerEnvironment.translator, this.linkerEnvironment.factory);
    }
    if (!this.emitScopes.has(constantScope)) {
      this.emitScopes.set(constantScope, new EmitScope(ngImport, this.linkerEnvironment.translator, this.linkerEnvironment.factory));
    }
    return this.emitScopes.get(constantScope);
  }
};

// packages/compiler-cli/linker/src/file_linker/linker_options.js
var DEFAULT_LINKER_OPTIONS = {
  sourceMapping: true,
  linkerJitMode: false,
  unknownDeclarationVersionHandling: "error"
};

// packages/compiler-cli/linker/src/file_linker/translator.js
var Translator = class {
  factory;
  constructor(factory) {
    this.factory = factory;
  }
  /**
   * Translate the given output AST in the context of an expression.
   */
  translateExpression(expression, imports, options = {}) {
    return expression.visitExpression(new ExpressionTranslatorVisitor(this.factory, imports, null, options), new Context(false));
  }
  /**
   * Translate the given output AST in the context of a statement.
   */
  translateStatement(statement, imports, options = {}) {
    return statement.visitStatement(new ExpressionTranslatorVisitor(this.factory, imports, null, options), new Context(true));
  }
};

// packages/compiler-cli/linker/src/file_linker/linker_environment.js
var LinkerEnvironment = class _LinkerEnvironment {
  fileSystem;
  logger;
  host;
  factory;
  options;
  translator;
  sourceFileLoader;
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
    return new _LinkerEnvironment(fileSystem, logger, host, factory, {
      sourceMapping: options.sourceMapping ?? DEFAULT_LINKER_OPTIONS.sourceMapping,
      linkerJitMode: options.linkerJitMode ?? DEFAULT_LINKER_OPTIONS.linkerJitMode,
      unknownDeclarationVersionHandling: options.unknownDeclarationVersionHandling ?? DEFAULT_LINKER_OPTIONS.unknownDeclarationVersionHandling
    });
  }
};

// packages/compiler-cli/linker/src/file_linker/needs_linking.js
function needsLinking(path, source) {
  return declarationFunctions.some((fn) => source.includes(fn));
}

export {
  FatalLinkerError,
  isFatalLinkerError,
  assert,
  FileLinker,
  DEFAULT_LINKER_OPTIONS,
  LinkerEnvironment,
  needsLinking
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
