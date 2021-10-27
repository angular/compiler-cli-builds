
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  ConsoleLogger,
  LogLevel
} from "../../chunk-SKBLJA43.js";
import {
  FatalLinkerError,
  FileLinker,
  LinkerEnvironment,
  assert,
  isFatalLinkerError
} from "../../chunk-XR5J3AKU.js";
import "../../chunk-FOIIOIVJ.js";
import "../../chunk-HYTAZOQJ.js";
import {
  NodeJSFileSystem
} from "../../chunk-3IV7S3VF.js";
import {
  __objRest,
  __spreadProps,
  __spreadValues
} from "../../chunk-5VGHS4A4.js";

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
