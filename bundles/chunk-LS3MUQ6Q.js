
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  COMPILER_ERRORS_WITH_GUIDES,
  CompilationMode,
  ComponentDecoratorHandler,
  CompoundMetadataReader,
  CompoundMetadataRegistry,
  DirectiveDecoratorHandler,
  DtsMetadataReader,
  DtsTransformRegistry,
  ERROR_DETAILS_PAGE_BASE_URL,
  ErrorCode,
  InjectableClassRegistry,
  InjectableDecoratorHandler,
  LocalMetadataRegistry,
  NgModuleDecoratorHandler,
  NoopReferencesRegistry,
  PartialEvaluator,
  PipeDecoratorHandler,
  ResourceRegistry,
  SemanticDepGraphUpdater,
  TraitCompiler,
  aliasTransformFactory,
  declarationTransformFactory,
  flattenInheritedDirectiveMetadata,
  ivyTransformFactory,
  makeDiagnostic,
  makeRelatedInformation,
  ngErrorCode,
  replaceTsWithNgInErrors
} from "./chunk-GW5PWKBP.js";
import {
  getDownlevelDecoratorsTransform
} from "./chunk-PBA67OV4.js";
import {
  TypeScriptReflectionHost,
  isNamedClassDeclaration
} from "./chunk-S3QIIFH7.js";
import {
  AbsoluteModuleStrategy,
  AliasStrategy,
  DefaultImportTracker,
  ImportFlags,
  ImportManager,
  LocalIdentifierStrategy,
  LogicalProjectStrategy,
  ModuleResolver,
  NoopImportRewriter,
  PrivateExportAliasingHost,
  R3SymbolsImportRewriter,
  Reference,
  ReferenceEmitter,
  RelativePathStrategy,
  UnifiedModulesAliasingHost,
  UnifiedModulesStrategy,
  attachComments,
  getRootDirs,
  getSourceFileOrNull,
  getTokenAtPosition,
  identifierOfNode,
  isAssignment,
  isDtsPath,
  isNonDeclarationTsPath,
  isSymbolWithValueDeclaration,
  nodeNameForError,
  normalizeSeparators,
  relativePathBetween,
  toUnredirectedSourceFile,
  translateExpression,
  translateType
} from "./chunk-WYO7JO2T.js";
import {
  LogicalFileSystem,
  absoluteFrom,
  absoluteFromSourceFile,
  basename,
  dirname,
  getFileSystem,
  getSourceFileOrError,
  join,
  relative,
  resolve
} from "./chunk-EP5JHXG2.js";
import {
  ActivePerfRecorder,
  DelegatingPerfRecorder,
  PerfCheckpoint,
  PerfEvent,
  PerfPhase
} from "./chunk-GLCRIILX.js";
import {
  __spreadProps,
  __spreadValues
} from "./chunk-XA5IZLLC.js";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/schema.mjs
var METADATA_VERSION = 4;
function isModuleMetadata(value) {
  return value && value.__symbolic === "module";
}
function isClassMetadata(value) {
  return value && value.__symbolic === "class";
}
function isInterfaceMetadata(value) {
  return value && value.__symbolic === "interface";
}
function isMemberMetadata(value) {
  if (value) {
    switch (value.__symbolic) {
      case "constructor":
      case "method":
      case "property":
        return true;
    }
  }
  return false;
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
function isMetadataSymbolicBinaryExpression(value) {
  return value && value.__symbolic === "binary";
}
function isMetadataSymbolicIndexExpression(value) {
  return value && value.__symbolic === "index";
}
function isMetadataSymbolicCallExpression(value) {
  return value && (value.__symbolic === "call" || value.__symbolic === "new");
}
function isMetadataSymbolicPrefixExpression(value) {
  return value && value.__symbolic === "pre";
}
function isMetadataSymbolicIfExpression(value) {
  return value && value.__symbolic === "if";
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/collector.mjs
import ts3 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/evaluator.mjs
import ts from "typescript";
var spreadElementSyntaxKind = ts.SyntaxKind.SpreadElement || ts.SyntaxKind.SpreadElementExpression;
function isMethodCallOf(callExpression, memberName) {
  const expression = callExpression.expression;
  if (expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
    const propertyAccessExpression = expression;
    const name = propertyAccessExpression.name;
    if (name.kind == ts.SyntaxKind.Identifier) {
      return name.text === memberName;
    }
  }
  return false;
}
function isCallOf(callExpression, ident) {
  const expression = callExpression.expression;
  if (expression.kind === ts.SyntaxKind.Identifier) {
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
  return !ts.forEachChild(node, (node2) => !cb(node2));
}
function isPrimitive(value) {
  return Object(value) !== value;
}
function isDefined(obj) {
  return obj !== void 0;
}
function getSourceFileOfNode(node) {
  while (node && node.kind != ts.SyntaxKind.SourceFile) {
    node = node.parent;
  }
  return node;
}
function sourceInfo(node, sourceFile) {
  if (node) {
    sourceFile = sourceFile || getSourceFileOfNode(node);
    if (sourceFile) {
      return ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile));
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
    if (node && node.kind == ts.SyntaxKind.Identifier) {
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
        case ts.SyntaxKind.ObjectLiteralExpression:
          return everyNodeChild(node, (child) => {
            if (child.kind === ts.SyntaxKind.PropertyAssignment) {
              const propertyAssignment = child;
              return this.isFoldableWorker(propertyAssignment.initializer, folding);
            }
            return false;
          });
        case ts.SyntaxKind.ArrayLiteralExpression:
          return everyNodeChild(node, (child) => this.isFoldableWorker(child, folding));
        case ts.SyntaxKind.CallExpression:
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
        case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NumericLiteral:
        case ts.SyntaxKind.NullKeyword:
        case ts.SyntaxKind.TrueKeyword:
        case ts.SyntaxKind.FalseKeyword:
        case ts.SyntaxKind.TemplateHead:
        case ts.SyntaxKind.TemplateMiddle:
        case ts.SyntaxKind.TemplateTail:
          return true;
        case ts.SyntaxKind.ParenthesizedExpression:
          const parenthesizedExpression = node;
          return this.isFoldableWorker(parenthesizedExpression.expression, folding);
        case ts.SyntaxKind.BinaryExpression:
          const binaryExpression = node;
          switch (binaryExpression.operatorToken.kind) {
            case ts.SyntaxKind.PlusToken:
            case ts.SyntaxKind.MinusToken:
            case ts.SyntaxKind.AsteriskToken:
            case ts.SyntaxKind.SlashToken:
            case ts.SyntaxKind.PercentToken:
            case ts.SyntaxKind.AmpersandAmpersandToken:
            case ts.SyntaxKind.BarBarToken:
              return this.isFoldableWorker(binaryExpression.left, folding) && this.isFoldableWorker(binaryExpression.right, folding);
            default:
              return false;
          }
        case ts.SyntaxKind.PropertyAccessExpression:
          const propertyAccessExpression = node;
          return this.isFoldableWorker(propertyAccessExpression.expression, folding);
        case ts.SyntaxKind.ElementAccessExpression:
          const elementAccessExpression = node;
          return this.isFoldableWorker(elementAccessExpression.expression, folding) && this.isFoldableWorker(elementAccessExpression.argumentExpression, folding);
        case ts.SyntaxKind.Identifier:
          let identifier = node;
          let reference = this.symbols.resolve(identifier.text);
          if (reference !== void 0 && isPrimitive(reference)) {
            return true;
          }
          break;
        case ts.SyntaxKind.TemplateExpression:
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
      case ts.SyntaxKind.ObjectLiteralExpression:
        let obj = {};
        let quoted = [];
        ts.forEachChild(node, (child) => {
          switch (child.kind) {
            case ts.SyntaxKind.ShorthandPropertyAssignment:
            case ts.SyntaxKind.PropertyAssignment:
              const assignment = child;
              if (assignment.name.kind == ts.SyntaxKind.StringLiteral) {
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
      case ts.SyntaxKind.ArrayLiteralExpression:
        let arr = [];
        ts.forEachChild(node, (child) => {
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
      case ts.SyntaxKind.CallExpression:
        const callExpression = node;
        if (isCallOf(callExpression, "forwardRef") && arrayOrEmpty(callExpression.arguments).length === 1) {
          const firstArgument = callExpression.arguments[0];
          if (firstArgument.kind == ts.SyntaxKind.ArrowFunction) {
            const arrowFunction = firstArgument;
            return recordEntry(this.evaluateNode(arrowFunction.body), node);
          }
        }
        const args = arrayOrEmpty(callExpression.arguments).map((arg) => this.evaluateNode(arg));
        if (this.isFoldable(callExpression)) {
          if (isMethodCallOf(callExpression, "concat")) {
            const arrayValue = this.evaluateNode(callExpression.expression.expression);
            if (isFoldableError(arrayValue))
              return arrayValue;
            return arrayValue.concat(args[0]);
          }
        }
        if (isCallOf(callExpression, "CONST_EXPR") && arrayOrEmpty(callExpression.arguments).length === 1) {
          return recordEntry(args[0], node);
        }
        const expression = this.evaluateNode(callExpression.expression);
        if (isFoldableError(expression)) {
          return recordEntry(expression, node);
        }
        let result = { __symbolic: "call", expression };
        if (args && args.length) {
          result.arguments = args;
        }
        return recordEntry(result, node);
      case ts.SyntaxKind.NewExpression:
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
      case ts.SyntaxKind.PropertyAccessExpression: {
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
      case ts.SyntaxKind.ElementAccessExpression: {
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
      case ts.SyntaxKind.Identifier:
        const identifier = node;
        const name = identifier.text;
        return resolveName(name, preferReference);
      case ts.SyntaxKind.TypeReference:
        const typeReferenceNode = node;
        const typeNameNode = typeReferenceNode.typeName;
        const getReference = (node2) => {
          if (typeNameNode.kind === ts.SyntaxKind.QualifiedName) {
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
          const args2 = typeReferenceNode.typeArguments.map((element) => this.evaluateNode(element));
          typeReference.arguments = args2;
        }
        return recordEntry(typeReference, node);
      case ts.SyntaxKind.UnionType:
        const unionType = node;
        const references = unionType.types.filter((n) => n.kind !== ts.SyntaxKind.UndefinedKeyword && !(ts.isLiteralTypeNode(n) && n.literal.kind === ts.SyntaxKind.NullKeyword)).map((n) => this.evaluateNode(n));
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
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.TemplateHead:
      case ts.SyntaxKind.TemplateTail:
      case ts.SyntaxKind.TemplateMiddle:
        return node.text;
      case ts.SyntaxKind.NumericLiteral:
        return parseFloat(node.text);
      case ts.SyntaxKind.AnyKeyword:
        return recordEntry({ __symbolic: "reference", name: "any" }, node);
      case ts.SyntaxKind.StringKeyword:
        return recordEntry({ __symbolic: "reference", name: "string" }, node);
      case ts.SyntaxKind.NumberKeyword:
        return recordEntry({ __symbolic: "reference", name: "number" }, node);
      case ts.SyntaxKind.BooleanKeyword:
        return recordEntry({ __symbolic: "reference", name: "boolean" }, node);
      case ts.SyntaxKind.ArrayType:
        const arrayTypeNode = node;
        return recordEntry({
          __symbolic: "reference",
          name: "Array",
          arguments: [this.evaluateNode(arrayTypeNode.elementType)]
        }, node);
      case ts.SyntaxKind.NullKeyword:
        return null;
      case ts.SyntaxKind.TrueKeyword:
        return true;
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.ParenthesizedExpression:
        const parenthesizedExpression = node;
        return this.evaluateNode(parenthesizedExpression.expression);
      case ts.SyntaxKind.TypeAssertionExpression:
        const typeAssertion = node;
        return this.evaluateNode(typeAssertion.expression);
      case ts.SyntaxKind.PrefixUnaryExpression:
        const prefixUnaryExpression = node;
        const operand = this.evaluateNode(prefixUnaryExpression.operand);
        if (isDefined(operand) && isPrimitive(operand)) {
          switch (prefixUnaryExpression.operator) {
            case ts.SyntaxKind.PlusToken:
              return +operand;
            case ts.SyntaxKind.MinusToken:
              return -operand;
            case ts.SyntaxKind.TildeToken:
              return ~operand;
            case ts.SyntaxKind.ExclamationToken:
              return !operand;
          }
        }
        let operatorText;
        switch (prefixUnaryExpression.operator) {
          case ts.SyntaxKind.PlusToken:
            operatorText = "+";
            break;
          case ts.SyntaxKind.MinusToken:
            operatorText = "-";
            break;
          case ts.SyntaxKind.TildeToken:
            operatorText = "~";
            break;
          case ts.SyntaxKind.ExclamationToken:
            operatorText = "!";
            break;
          default:
            return void 0;
        }
        return recordEntry({ __symbolic: "pre", operator: operatorText, operand }, node);
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpression = node;
        const left = this.evaluateNode(binaryExpression.left);
        const right = this.evaluateNode(binaryExpression.right);
        if (isDefined(left) && isDefined(right)) {
          if (isPrimitive(left) && isPrimitive(right))
            switch (binaryExpression.operatorToken.kind) {
              case ts.SyntaxKind.BarBarToken:
                return left || right;
              case ts.SyntaxKind.AmpersandAmpersandToken:
                return left && right;
              case ts.SyntaxKind.AmpersandToken:
                return left & right;
              case ts.SyntaxKind.BarToken:
                return left | right;
              case ts.SyntaxKind.CaretToken:
                return left ^ right;
              case ts.SyntaxKind.EqualsEqualsToken:
                return left == right;
              case ts.SyntaxKind.ExclamationEqualsToken:
                return left != right;
              case ts.SyntaxKind.EqualsEqualsEqualsToken:
                return left === right;
              case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return left !== right;
              case ts.SyntaxKind.LessThanToken:
                return left < right;
              case ts.SyntaxKind.GreaterThanToken:
                return left > right;
              case ts.SyntaxKind.LessThanEqualsToken:
                return left <= right;
              case ts.SyntaxKind.GreaterThanEqualsToken:
                return left >= right;
              case ts.SyntaxKind.LessThanLessThanToken:
                return left << right;
              case ts.SyntaxKind.GreaterThanGreaterThanToken:
                return left >> right;
              case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                return left >>> right;
              case ts.SyntaxKind.PlusToken:
                return left + right;
              case ts.SyntaxKind.MinusToken:
                return left - right;
              case ts.SyntaxKind.AsteriskToken:
                return left * right;
              case ts.SyntaxKind.SlashToken:
                return left / right;
              case ts.SyntaxKind.PercentToken:
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
      case ts.SyntaxKind.ConditionalExpression:
        const conditionalExpression = node;
        const condition = this.evaluateNode(conditionalExpression.condition);
        const thenExpression = this.evaluateNode(conditionalExpression.whenTrue);
        const elseExpression = this.evaluateNode(conditionalExpression.whenFalse);
        if (isPrimitive(condition)) {
          return condition ? thenExpression : elseExpression;
        }
        return recordEntry({ __symbolic: "if", condition, thenExpression, elseExpression }, node);
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        return recordEntry(errorSymbol("Lambda not supported", node), node);
      case ts.SyntaxKind.TaggedTemplateExpression:
        return recordEntry(errorSymbol("Tagged template expressions are not supported in metadata", node), node);
      case ts.SyntaxKind.TemplateExpression:
        const templateExpression = node;
        if (this.isFoldable(node)) {
          return templateExpression.templateSpans.reduce((previous, current) => previous + this.evaluateNode(current.expression) + this.evaluateNode(current.literal), this.evaluateNode(templateExpression.head));
        } else {
          return templateExpression.templateSpans.reduce((previous, current) => {
            const expr = this.evaluateNode(current.expression);
            const literal = this.evaluateNode(current.literal);
            if (isFoldableError(expr))
              return expr;
            if (isFoldableError(literal))
              return literal;
            if (typeof previous === "string" && typeof expr === "string" && typeof literal === "string") {
              return previous + expr + literal;
            }
            let result2 = expr;
            if (previous !== "") {
              result2 = { __symbolic: "binop", operator: "+", left: previous, right: expr };
            }
            if (literal != "") {
              result2 = { __symbolic: "binop", operator: "+", left: result2, right: literal };
            }
            return result2;
          }, this.evaluateNode(templateExpression.head));
        }
      case ts.SyntaxKind.AsExpression:
        const asExpression = node;
        return this.evaluateNode(asExpression.expression);
      case ts.SyntaxKind.ClassExpression:
        return { __symbolic: "class" };
    }
    return recordEntry(errorSymbol("Expression form not supported", node), node);
  }
};
function isPropertyAssignment(node) {
  return node.kind == ts.SyntaxKind.PropertyAssignment;
}
var empty = ts.createNodeArray();
function arrayOrEmpty(v) {
  return v || empty;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/symbols.mjs
import ts2 from "typescript";
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
    const visit = (node) => {
      switch (node.kind) {
        case ts2.SyntaxKind.ImportEqualsDeclaration:
          const importEqualsDeclaration = node;
          if (importEqualsDeclaration.moduleReference.kind === ts2.SyntaxKind.ExternalModuleReference) {
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
        case ts2.SyntaxKind.ImportDeclaration:
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
              case ts2.SyntaxKind.NamedImports:
                for (const binding of bindings.elements) {
                  symbols.set(binding.name.text, {
                    __symbolic: "reference",
                    module: from,
                    name: binding.propertyName ? binding.propertyName.text : binding.name.text
                  });
                }
                break;
              case ts2.SyntaxKind.NamespaceImport:
                symbols.set(bindings.name.text, { __symbolic: "reference", module: from });
                break;
            }
          }
          break;
      }
      ts2.forEachChild(node, visit);
    };
    if (this.sourceFile) {
      ts2.forEachChild(this.sourceFile, visit);
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
var isStatic = (node) => ts3.getCombinedModifierFlags(node) & ts3.ModifierFlags.Static;
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
      if (functionDeclaration.name && functionDeclaration.name.kind == ts3.SyntaxKind.Identifier) {
        const nameNode = functionDeclaration.name;
        const functionName = nameNode.text;
        const functionBody = functionDeclaration.body;
        if (functionBody && functionBody.statements.length == 1) {
          const statement = functionBody.statements[0];
          if (statement.kind === ts3.SyntaxKind.ReturnStatement) {
            const returnStatement = statement;
            if (returnStatement.expression) {
              const func = {
                __symbolic: "function",
                parameters: namesOf(functionDeclaration.parameters),
                value: evaluator.evaluateNode(returnStatement.expression)
              };
              if (functionDeclaration.parameters.some((p) => p.initializer != null)) {
                func.defaults = functionDeclaration.parameters.map((p) => p.initializer && evaluator.evaluateNode(p.initializer));
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
          if (hc.token === ts3.SyntaxKind.ExtendsKeyword && hc.types) {
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
          case ts3.SyntaxKind.Constructor:
          case ts3.SyntaxKind.MethodDeclaration:
            isConstructor = member.kind === ts3.SyntaxKind.Constructor;
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
          case ts3.SyntaxKind.PropertyDeclaration:
          case ts3.SyntaxKind.GetAccessor:
          case ts3.SyntaxKind.SetAccessor:
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
    ts3.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts3.SyntaxKind.ExportDeclaration:
          const exportDeclaration = node;
          const { moduleSpecifier, exportClause } = exportDeclaration;
          if (!moduleSpecifier && exportClause && ts3.isNamedExports(exportClause)) {
            exportClause.elements.forEach((spec) => {
              const exportedAs = spec.name.text;
              const name = (spec.propertyName || spec.name).text;
              exportMap.set(name, exportedAs);
            });
          }
      }
    });
    const isExport = (node) => sourceFile.isDeclarationFile || ts3.getCombinedModifierFlags(node) & ts3.ModifierFlags.Export;
    const isExportedIdentifier = (identifier) => identifier && exportMap.has(identifier.text);
    const isExported3 = (node) => isExport(node) || isExportedIdentifier(node.name);
    const exportedIdentifierName = (identifier) => identifier && (exportMap.get(identifier.text) || identifier.text);
    const exportedName = (node) => exportedIdentifierName(node.name);
    ts3.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts3.SyntaxKind.ClassDeclaration:
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
        case ts3.SyntaxKind.InterfaceDeclaration:
          const interfaceDeclaration = node;
          if (interfaceDeclaration.name) {
            const interfaceName = interfaceDeclaration.name.text;
            locals.define(interfaceName, { __symbolic: "reference", name: "any" });
          }
          break;
        case ts3.SyntaxKind.FunctionDeclaration:
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
    ts3.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts3.SyntaxKind.ExportDeclaration:
          const exportDeclaration = node;
          const { moduleSpecifier, exportClause } = exportDeclaration;
          if (!moduleSpecifier) {
            if (exportClause && ts3.isNamedExports(exportClause)) {
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
          if (moduleSpecifier && moduleSpecifier.kind == ts3.SyntaxKind.StringLiteral) {
            const from = moduleSpecifier.text;
            const moduleExport = { from };
            if (exportClause && ts3.isNamedExports(exportClause)) {
              moduleExport.export = exportClause.elements.map((spec) => spec.propertyName ? { name: spec.propertyName.text, as: spec.name.text } : spec.name.text);
            }
            if (!exports)
              exports = [];
            exports.push(moduleExport);
          }
          break;
        case ts3.SyntaxKind.ClassDeclaration:
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
        case ts3.SyntaxKind.TypeAliasDeclaration:
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
        case ts3.SyntaxKind.InterfaceDeclaration:
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
        case ts3.SyntaxKind.FunctionDeclaration:
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
        case ts3.SyntaxKind.EnumDeclaration:
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
              if (member.name.kind == ts3.SyntaxKind.Identifier) {
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
        case ts3.SyntaxKind.VariableStatement:
          const variableStatement = node;
          for (const variableDeclaration of variableStatement.declarationList.declarations) {
            if (variableDeclaration.name.kind == ts3.SyntaxKind.Identifier) {
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
                  case ts3.SyntaxKind.Identifier:
                    const name = nameNode;
                    const varValue = errorSym("Destructuring not supported", name);
                    locals.define(name.text, varValue);
                    if (isExport(node)) {
                      if (!metadata)
                        metadata = {};
                      metadata[name.text] = varValue;
                    }
                    break;
                  case ts3.SyntaxKind.BindingElement:
                    const bindingElement = nameNode;
                    report(bindingElement.name);
                    break;
                  case ts3.SyntaxKind.ObjectBindingPattern:
                  case ts3.SyntaxKind.ArrayBindingPattern:
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
    if (name.kind == ts3.SyntaxKind.Identifier) {
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
  basename as basename3,
  dirname as dirname3,
  join as join3,
  normalize as normalize2
} from "path";
import ts5 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/metadata/bundler.mjs
import {
  basename as basename2,
  dirname as dirname2,
  join as join2,
  normalize,
  sep
} from "path";
import ts4 from "typescript";
var PRIVATE_NAME_CHARS = "abcdefghijklmnopqrstuvwxyz";
var MetadataBundler = class {
  constructor(root, importAs, host, privateSymbolPrefix) {
    this.root = root;
    this.importAs = importAs;
    this.host = host;
    this.symbolMap = new Map();
    this.metadataCache = new Map();
    this.exports = new Map();
    this.rootModule = `./${basename2(root)}`;
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
    const origins = Array.from(this.symbolMap.values()).filter((s) => s.referenced && !s.reexport).reduce((p, s) => {
      p[s.isPrivate ? s.privateName : s.name] = s.declaration.module;
      return p;
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
    const module = this.getMetadata(moduleName);
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
    if (module && module.metadata) {
      for (let key in module.metadata) {
        const data = module.metadata[key];
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
    if (module && module.exports) {
      let unnamedModuleExportsIdx = 0;
      for (const exportDeclaration of module.exports) {
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
    if (!module) {
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
        const [module, declaredName] = identifier.split(":");
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
        const module = declaration.module;
        if (declaration.name == "*") {
          exportAlls.add(declaration.module);
        } else {
          let entry = modules.get(module);
          if (!entry) {
            entry = [];
            modules.set(module, entry);
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
      const module = this.getMetadata(declaration.module);
      if (module) {
        const value = module.metadata[declaration.name];
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
      result.parameterDecorators = member.parameterDecorators && member.parameterDecorators.map((d) => d && d.map((p) => this.convertExpression(moduleName, p)));
      if (isConstructorMetadata(member)) {
        if (member.parameters) {
          result.parameters = member.parameters.map((p) => this.convertExpression(moduleName, p));
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
  convertError(module, value) {
    return {
      __symbolic: "error",
      message: value.message,
      line: value.line,
      character: value.character,
      context: value.context,
      module
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
  symbolOf(module, name) {
    const symbolKey = `${module}:${name}`;
    let symbol = this.symbolMap.get(symbolKey);
    if (!symbol) {
      symbol = { module, name };
      this.symbolMap.set(symbolKey, symbol);
    }
    return symbol;
  }
  canonicalSymbolOf(module, name) {
    this.exportAll(module);
    const symbol = this.symbolOf(module, name);
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
    const { resolvedModule } = ts4.resolveModuleName(fileName, containingFile, this.options, this.host);
    let sourceFile;
    if (resolvedModule) {
      let { resolvedFileName } = resolvedModule;
      if (resolvedModule.extension !== ".ts") {
        resolvedFileName = resolvedFileName.replace(/(\.d\.ts|\.js)$/, ".ts");
      }
      sourceFile = this.host.getSourceFile(resolvedFileName, ts4.ScriptTarget.Latest);
    } else {
      if (!this.host.fileExists(fileName + ".ts"))
        return void 0;
      sourceFile = this.host.getSourceFile(fileName + ".ts", ts4.ScriptTarget.Latest);
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
    let normalPath = normalize(join2(dirname2(from), importName));
    if (!normalPath.startsWith(".") && from.startsWith(".")) {
      normalPath = `.${sep}${normalPath}`;
    }
    return normalPath.replace(/\\/g, "/");
  }
  return importName;
}
function isPrimitive2(o) {
  return o === null || typeof o !== "function" && typeof o !== "object";
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
  const orderedExports = Array.from(exports).map(([module, entries]) => [module, entries.sort(compareEntries)]).sort(compareModules);
  for (const [module, entries] of orderedExports) {
    let symbols = entries.map((e) => `${e.name} as ${e.privateName}`);
    results.push(`export {${symbols}} from '${module}';`);
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
      const sf = ts5.createSourceFile(fileName, syntheticIndex.content, languageVersion, true);
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
        category: ts5.DiagnosticCategory.Error,
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
  const name = join3(dirname3(indexModule), ngOptions.flatModuleOutFile.replace(JS_EXT, ".ts"));
  const libraryIndex = `./${basename3(indexModule)}`;
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/api.mjs
var DEFAULT_ERROR_CODE = 100;
var UNKNOWN_ERROR_CODE = 500;
var SOURCE = "angular";
function isTsDiagnostic(diagnostic) {
  return diagnostic != null && diagnostic.source !== "angular";
}
function isNgDiagnostic(diagnostic) {
  return diagnostic != null && diagnostic.source === "angular";
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/util.mjs
import { syntaxError } from "@angular/compiler";
import {
  relative as relative2
} from "path";
import ts6 from "typescript";
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
    category: ts6.DiagnosticCategory.Message,
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
  const rel = relative2(prefix, fullPath);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/compiler_host.mjs
import { collectExternalReferences, syntaxError as syntaxError2, TypeScriptEmitter } from "@angular/compiler";
import fs from "fs";
import {
  basename as basename4,
  dirname as dirname4,
  join as join4,
  normalize as normalize3,
  relative as relative3,
  resolve as resolve2
} from "path";
import ts7 from "typescript";

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
      let maxMetadata = metadatas.reduce((p, c) => p.version > c.version ? p : c);
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
function createCompilerHost({ options, tsHost = ts7.createCompilerHost(options, true) }) {
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
    this.realpath = (p) => p;
    this.writeFile = this.context.writeFile.bind(this.context);
    this.moduleResolutionCache = ts7.createModuleResolutionCache(this.context.getCurrentDirectory(), this.context.getCanonicalFileName.bind(this.context));
    const basePath = this.options.basePath;
    this.rootDirs = (this.options.rootDirs || [this.options.basePath]).map((p) => resolve2(basePath, p));
    if (context.getDirectories) {
      this.getDirectories = (path7) => context.getDirectories(path7);
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
    const rm = ts7.resolveModuleName(moduleName, containingFile.replace(/\\/g, "/"), this.options, this, this.moduleResolutionCache).resolvedModule;
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
      moduleName = dotRelative(dirname4(containingFile), importedFile);
    } else if (importedFilePackageName) {
      moduleName = stripNodeModulesPrefix(importedFile);
      if (originalImportedFile.endsWith(".d.ts")) {
        try {
          const modulePath = importedFile.substring(0, importedFile.length - moduleName.length) + importedFilePackageName;
          const packageJson = JSON.parse(fs.readFileSync(modulePath + "/package.json", "utf8"));
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
      languageVersion = this.options.target || ts7.ScriptTarget.Latest;
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
    const sf = ts7.createSourceFile(genFile.genFileUrl, sourceText, this.options.target || ts7.ScriptTarget.Latest);
    if (this.options.module === ts7.ModuleKind.AMD || this.options.module === ts7.ModuleKind.UMD) {
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
          summary.sourceFile = ts7.createSourceFile(fileName, summary.text, this.options.target || ts7.ScriptTarget.Latest);
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
    return relative3(this.getCurrentDirectory(), filePath);
  }
  hasBundleIndex(filePath) {
    const checkBundleIndex = (directory) => {
      let result = this.flatModuleIndexCache.get(directory);
      if (result == null) {
        if (basename4(directory) == "node_module") {
          result = false;
        } else {
          try {
            const packageFile = join4(directory, "package.json");
            if (this.originalFileExists(packageFile)) {
              result = false;
              const packageContent = JSON.parse(assert(this.context.readFile(packageFile)));
              if (packageContent.typings) {
                const typings = normalize3(join4(directory, packageContent.typings));
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
              const parent = dirname4(directory);
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
    return checkBundleIndex(dirname4(filePath));
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
  const rPath = relative3(from, to).replace(/\\/g, "/");
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/program.mjs
import { HtmlParser, MessageBundle } from "@angular/compiler";
import ts42 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/i18n.mjs
import { Xliff, Xliff2, Xmb } from "@angular/compiler";
import {
  relative as relative4,
  resolve as resolve3,
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
function i18nExtract(formatName, outFile, host, options, bundle, pathResolve = resolve3) {
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
    sourcePath = basePath ? relative4(basePath, sourcePath) : sourcePath;
    return sourcePath.split(sep2).join("/");
  };
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/typescript_support.mjs
import ts8 from "typescript";

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
var tsVersion = ts8.version;
function checkVersion(version, minVersion, maxVersion) {
  if (compareVersions(version, minVersion) < 0 || compareVersions(version, maxVersion) >= 0) {
    throw new Error(`The Angular Compiler requires TypeScript >=${minVersion} and <${maxVersion} but ${version} was found instead.`);
  }
}
function verifySupportedTypeScriptVersion() {
  checkVersion(tsVersion, MIN_TS_VERSION, MAX_TS_VERSION);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/compiler.mjs
import ts40 from "typescript";

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
import ts9 from "typescript";
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
        if (!ts9.isImportDeclaration(stmt) && !ts9.isExportDeclaration(stmt) || stmt.moduleSpecifier === void 0) {
          continue;
        }
        if (ts9.isImportDeclaration(stmt) && stmt.importClause !== void 0 && stmt.importClause.isTypeOnly) {
          continue;
        }
        const symbol = this.checker.getSymbolAtLocation(stmt.moduleSpecifier);
        if (symbol === void 0 || symbol.valueDeclaration === void 0) {
          continue;
        }
        const moduleFile = symbol.valueDeclaration;
        if (ts9.isSourceFile(moduleFile) && isLocalFile(moduleFile)) {
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
import ts10 from "typescript";
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
    const genFile = ts10.createSourceFile(this.flatIndexPath, contents, ts10.ScriptTarget.ES2015, true, ts10.ScriptKind.TS);
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
import ts11 from "typescript";
function checkForPrivateExports(entryPoint, checker, refGraph) {
  const diagnostics = [];
  const topLevelExports = new Set();
  const moduleSymbol = checker.getSymbolAtLocation(entryPoint);
  if (moduleSymbol === void 0) {
    throw new Error(`Internal error: failed to get symbol for entrypoint`);
  }
  const exportedSymbols = checker.getExportsOfModule(moduleSymbol);
  exportedSymbols.forEach((symbol) => {
    if (symbol.flags & ts11.SymbolFlags.Alias) {
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
          category: ts11.DiagnosticCategory.Error,
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
  if ((ts11.isClassDeclaration(decl) || ts11.isVariableDeclaration(decl) || ts11.isFunctionDeclaration(decl)) && decl.name !== void 0 && ts11.isIdentifier(decl.name)) {
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
    case ts11.SyntaxKind.ClassDeclaration:
      return "class";
    case ts11.SyntaxKind.FunctionDeclaration:
      return "function";
    case ts11.SyntaxKind.VariableDeclaration:
      return "variable";
    case ts11.SyntaxKind.EnumDeclaration:
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
import ts15 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/shims/src/adapter.mjs
import ts12 from "typescript";

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
      const inputFile = this.delegate.getSourceFile(baseFileName, ts12.ScriptTarget.Latest);
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
import ts13 from "typescript";
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
    const symbolNames = sf.statements.filter(ts13.isClassDeclaration).filter((decl) => isExported(decl) && decl.decorators !== void 0 && decl.name !== void 0).map((decl) => decl.name.text);
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
    const genFile = ts13.createSourceFile(genFilePath, sourceText, sf.languageVersion, true, ts13.ScriptKind.TS);
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
  return decl.modifiers !== void 0 && decl.modifiers.some((mod) => mod.kind == ts13.SyntaxKind.ExportKeyword);
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
    if (ts13.isImportDeclaration(stmt) && ts13.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === "@angular/core") {
      const rewrittenModuleSpecifier = importRewriter.rewriteSpecifier("@angular/core", sourceFilePath);
      if (rewrittenModuleSpecifier !== stmt.moduleSpecifier.text) {
        transformedStatements.push(ts13.updateImportDeclaration(stmt, stmt.decorators, stmt.modifiers, stmt.importClause, ts13.createStringLiteral(rewrittenModuleSpecifier)));
        if (stmt.importClause !== void 0 && stmt.importClause.namedBindings !== void 0 && ts13.isNamespaceImport(stmt.importClause.namedBindings)) {
          coreImportIdentifiers.add(stmt.importClause.namedBindings.name.text);
        }
      } else {
        transformedStatements.push(stmt);
      }
    } else if (ts13.isVariableStatement(stmt) && stmt.declarationList.declarations.length === 1) {
      const decl = stmt.declarationList.declarations[0];
      if (ts13.isIdentifier(decl.name)) {
        if (decl.name.text === "\u0275NonEmptyModule") {
          nonEmptyExport = stmt;
          continue;
        }
        const match = STRIP_NG_FACTORY.exec(decl.name.text);
        const module = match ? moduleSymbols.get(match[1]) : null;
        if (module) {
          const moduleIsTreeShakable = !module.hasId;
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
  if (!transformedStatements.some(ts13.isVariableStatement) && nonEmptyExport !== null) {
    transformedStatements.push(nonEmptyExport);
  }
  file = ts13.updateSourceFileNode(file, transformedStatements);
  if (coreImportIdentifiers.size > 0) {
    const visit = (node) => {
      node = ts13.visitEachChild(node, (child) => visit(child), context);
      if (ts13.isPropertyAccessExpression(node) && ts13.isIdentifier(node.expression) && coreImportIdentifiers.has(node.expression.text)) {
        const rewrittenSymbol = importRewriter.rewriteSymbol(node.name.text, "@angular/core");
        if (rewrittenSymbol !== node.name.text) {
          const updated = ts13.updatePropertyAccess(node, node.expression, ts13.createIdentifier(rewrittenSymbol));
          node = updated;
        }
      }
      return node;
    };
    file = visit(file);
  }
  return file;
}
function getFileoverviewComment(sourceFile) {
  const text = sourceFile.getFullText();
  const trivia = text.substring(0, sourceFile.getStart());
  const leadingComments = ts13.getLeadingCommentRanges(trivia, 0);
  if (!leadingComments || leadingComments.length === 0) {
    return null;
  }
  const comment = leadingComments[0];
  if (comment.kind !== ts13.SyntaxKind.MultiLineCommentTrivia) {
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
  const noSideEffects = ts13.createPropertyAccess(ts13.createIdentifier("i0"), "\u0275noSideEffects");
  return ts13.createCall(noSideEffects, [], [
    ts13.createFunctionExpression([], void 0, void 0, [], [], void 0, ts13.createBlock([
      ts13.createReturn(expr)
    ]))
  ]);
}
function updateInitializers(stmt, update) {
  return ts13.updateVariableStatement(stmt, stmt.modifiers, ts13.updateVariableDeclarationList(stmt.declarationList, stmt.declarationList.declarations.map((decl) => ts13.updateVariableDeclaration(decl, decl.name, decl.type, update(decl.initializer)))));
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
import ts14 from "typescript";
var SummaryGenerator = class {
  constructor() {
    this.shouldEmit = true;
    this.extensionPrefix = "ngsummary";
  }
  generateShimForFile(sf, genFilePath) {
    const symbolNames = [];
    for (const stmt of sf.statements) {
      if (ts14.isClassDeclaration(stmt)) {
        if (!isExported2(stmt) || stmt.decorators === void 0 || stmt.name === void 0) {
          continue;
        }
        symbolNames.push(stmt.name.text);
      } else if (ts14.isExportDeclaration(stmt)) {
        if (stmt.exportClause === void 0 || stmt.moduleSpecifier !== void 0 || !ts14.isNamedExports(stmt.exportClause)) {
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
    const genFile = ts14.createSourceFile(genFilePath, sourceText, sf.languageVersion, true, ts14.ScriptKind.TS);
    if (sf.moduleName !== void 0) {
      genFile.moduleName = generatedModuleName(sf.moduleName, sf.fileName, ".ngsummary");
    }
    return genFile;
  }
};
function isExported2(decl) {
  return decl.modifiers !== void 0 && decl.modifiers.some((mod) => mod.kind == ts14.SyntaxKind.ExportKeyword);
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
      const sf = ts15.createSourceFile(filePath, newText, ts15.ScriptTarget.Latest, true);
      if (originalFile !== null) {
        sf[NgOriginalFile] = originalFile;
      }
      this.sfMap.set(filePath, sf);
    }
    const host = new UpdatedProgramHost(this.sfMap, this.originalProgram, this.originalHost, this.shimExtensionPrefixes);
    const oldProgram = this.program;
    retagAllTsFiles(oldProgram);
    this.program = ts15.createProgram({
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
var PatchedProgramIncrementalBuildStrategy = class {
  getIncrementalState(program) {
    const state = program[SYM_INCREMENTAL_STATE];
    if (state === void 0) {
      return null;
    }
    return state;
  }
  setIncrementalState(state, program) {
    program[SYM_INCREMENTAL_STATE] = state;
  }
  toNextBuildStrategy() {
    return this;
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
import { ParseSourceFile } from "@angular/compiler";

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
    const componentFile = new ParseSourceFile(declaration.getSourceFile().getFullText(), declaration.getSourceFile().fileName);
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
import ts16 from "typescript";
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
    const failedLookup = ts16.resolveModuleName(url + RESOURCE_MARKER, fromFile, this.options, this.lookupResolutionHost);
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
import { ExternalExpr } from "@angular/compiler";
import ts17 from "typescript";
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
      if (!ts17.isClassDeclaration(ref.node)) {
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
        if (exportRef.alias && exportRef.alias instanceof ExternalExpr) {
          reexports.push({
            fromModule: exportRef.alias.value.moduleName,
            symbolName: exportRef.alias.value.name,
            asAlias: exportName
          });
        } else {
          const expr = this.refEmitter.emit(exportRef.cloneWithNoIdentifiers(), sourceFile).expression;
          if (!(expr instanceof ExternalExpr) || expr.value.moduleName === null || expr.value.name === null) {
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
function reexportCollision(module, refA, refB) {
  const childMessageText = `This directive/pipe is part of the exports of '${module.name.text}' and shares the same name as another exported directive/pipe.`;
  return makeDiagnostic(ErrorCode.NGMODULE_REEXPORT_NAME_COLLISION, module.name, `
    There was a name collision between two classes named '${refA.node.name.text}', which are both part of the exports of '${module.name.text}'.

    Angular generates re-exports of an NgModule's exported directives/pipes from the module's source file in certain cases, using the declared name of the class. If two classes of the same name are exported, this automatic naming does not work.

    To fix this problem please re-export one or both classes directly from this file.
  `.trim(), [
    makeRelatedInformation(refA.node.name, childMessageText),
    makeRelatedInformation(refB.node.name, childMessageText)
  ]);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/scope/src/typecheck.mjs
import { CssSelector, SelectorMatcher } from "@angular/compiler";
import ts18 from "typescript";
var TypeCheckScopeRegistry = class {
  constructor(scopeReader, metaReader) {
    this.scopeReader = scopeReader;
    this.metaReader = metaReader;
    this.flattenedDirectiveMetaCache = new Map();
    this.scopeCache = new Map();
  }
  getTypeCheckScope(node) {
    const matcher = new SelectorMatcher();
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
        matcher.addSelectables(CssSelector.parse(meta.selector), extMeta);
        directives.push(extMeta);
      }
    }
    for (const { name, ref } of scope.compilation.pipes) {
      if (!ts18.isClassDeclaration(ref.node)) {
        throw new Error(`Unexpected non-class declaration ${ts18.SyntaxKind[ref.node.kind]} for pipe ${ref.debugName}`);
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/switch/src/switch.mjs
import ts19 from "typescript";
var IVY_SWITCH_PRE_SUFFIX = "__PRE_R3__";
var IVY_SWITCH_POST_SUFFIX = "__POST_R3__";
function ivySwitchTransform(_) {
  return flipIvySwitchInFile;
}
function flipIvySwitchInFile(sf) {
  let newStatements = void 0;
  for (let i = 0; i < sf.statements.length; i++) {
    const statement = sf.statements[i];
    if (!ts19.isVariableStatement(statement) || !hasIvySwitches(statement)) {
      continue;
    }
    if (newStatements === void 0) {
      newStatements = [...sf.statements];
    }
    newStatements[i] = flipIvySwitchesInVariableStatement(statement, sf.statements);
  }
  if (newStatements !== void 0) {
    return ts19.updateSourceFileNode(sf, newStatements);
  }
  return sf;
}
function findPostSwitchIdentifier(statements, name) {
  for (const stmt of statements) {
    if (ts19.isVariableStatement(stmt)) {
      const decl = stmt.declarationList.declarations.find((decl2) => ts19.isIdentifier(decl2.name) && decl2.name.text === name);
      if (decl !== void 0) {
        return decl.name;
      }
    } else if (ts19.isFunctionDeclaration(stmt) || ts19.isClassDeclaration(stmt)) {
      if (stmt.name !== void 0 && ts19.isIdentifier(stmt.name) && stmt.name.text === name) {
        return stmt.name;
      }
    }
  }
  return null;
}
function flipIvySwitchesInVariableStatement(stmt, statements) {
  const newDeclarations = [...stmt.declarationList.declarations];
  for (let i = 0; i < newDeclarations.length; i++) {
    const decl = newDeclarations[i];
    if (decl.initializer === void 0 || !ts19.isIdentifier(decl.initializer)) {
      continue;
    }
    if (!decl.initializer.text.endsWith(IVY_SWITCH_PRE_SUFFIX)) {
      continue;
    }
    const postSwitchName = decl.initializer.text.replace(IVY_SWITCH_PRE_SUFFIX, IVY_SWITCH_POST_SUFFIX);
    const newIdentifier = findPostSwitchIdentifier(statements, postSwitchName);
    if (newIdentifier === null) {
      throw new Error(`Unable to find identifier ${postSwitchName} in ${stmt.getSourceFile().fileName} for the Ivy switch.`);
    }
    newDeclarations[i] = ts19.updateVariableDeclaration(decl, decl.name, decl.type, newIdentifier);
  }
  const newDeclList = ts19.updateVariableDeclarationList(stmt.declarationList, newDeclarations);
  const newStmt = ts19.updateVariableStatement(stmt, stmt.modifiers, newDeclList);
  return newStmt;
}
function hasIvySwitches(stmt) {
  return stmt.declarationList.declarations.some((decl) => decl.initializer !== void 0 && ts19.isIdentifier(decl.initializer) && decl.initializer.text.endsWith(IVY_SWITCH_PRE_SUFFIX));
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/checker.mjs
import { CssSelector as CssSelector2, DomElementSchemaRegistry as DomElementSchemaRegistry2 } from "@angular/compiler";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/diagnostics/src/diagnostic.mjs
import ts20 from "typescript";
function makeTemplateDiagnostic(templateId, mapping, span, category, code, messageText, relatedMessages) {
  if (mapping.type === "direct") {
    let relatedInformation = void 0;
    if (relatedMessages !== void 0) {
      relatedInformation = [];
      for (const relatedMessage of relatedMessages) {
        relatedInformation.push({
          category: ts20.DiagnosticCategory.Message,
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
    const sf = ts20.createSourceFile(fileName, mapping.template, ts20.ScriptTarget.Latest, false, ts20.ScriptKind.JSX);
    let relatedInformation = [];
    if (relatedMessages !== void 0) {
      for (const relatedMessage of relatedMessages) {
        relatedInformation.push({
          category: ts20.DiagnosticCategory.Message,
          code: 0,
          file: relatedMessage.sourceFile,
          start: relatedMessage.start,
          length: relatedMessage.end - relatedMessage.start,
          messageText: relatedMessage.text
        });
      }
    }
    relatedInformation.push({
      category: ts20.DiagnosticCategory.Message,
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
import ts22 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/comments.mjs
import { AbsoluteSourceSpan as AbsoluteSourceSpan2 } from "@angular/compiler";
import ts21 from "typescript";
var parseSpanComment = /^(\d+),(\d+)$/;
function readSpanComment(node, sourceFile = node.getSourceFile()) {
  return ts21.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts21.SyntaxKind.MultiLineCommentTrivia) {
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
  ts21.addSyntheticTrailingComment(node, ts21.SyntaxKind.MultiLineCommentTrivia, `${CommentTriviaType.EXPRESSION_TYPE_IDENTIFIER}:${identifier}`, false);
}
var IGNORE_FOR_DIAGNOSTICS_MARKER = `${CommentTriviaType.DIAGNOSTIC}:ignore`;
function markIgnoreDiagnostics(node) {
  ts21.addSyntheticTrailingComment(node, ts21.SyntaxKind.MultiLineCommentTrivia, IGNORE_FOR_DIAGNOSTICS_MARKER, false);
}
function hasIgnoreForDiagnosticsMarker(node, sourceFile) {
  return ts21.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts21.SyntaxKind.MultiLineCommentTrivia) {
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
  return ts21.forEachTrailingCommentRange(sourceFile.text, node.getEnd(), (pos, end, kind) => {
    if (kind !== ts21.SyntaxKind.MultiLineCommentTrivia) {
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
      filter: ts22.isPropertyAccessExpression,
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
        filter: ts22.isIdentifier,
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
        filter: ts22.isPropertyAccessExpression,
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
        filter: ts22.isPropertyAccessExpression,
        withSpan: expr.nameSpan
      });
    } else if (expr instanceof SafePropertyRead) {
      const ternaryExpr = findFirstMatchingNode(this.tcb, {
        filter: ts22.isParenthesizedExpression,
        withSpan: expr.sourceSpan
      });
      if (ternaryExpr === null || !ts22.isConditionalExpression(ternaryExpr.expression)) {
        return null;
      }
      const whenTrue = ternaryExpr.expression.whenTrue;
      if (ts22.isPropertyAccessExpression(whenTrue)) {
        tsExpr = whenTrue;
      } else if (ts22.isCallExpression(whenTrue) && ts22.isPropertyAccessExpression(whenTrue.expression)) {
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
        filter: ts22.isParenthesizedExpression,
        withSpan: expr.sourceSpan
      });
      if (strNode !== null && ts22.isStringLiteral(strNode.expression)) {
        tsExpr = strNode.expression;
      }
    } else {
      tsExpr = findFirstMatchingNode(this.tcb, {
        filter: (n) => ts22.isStringLiteral(n) || ts22.isNumericLiteral(n),
        withSpan: expr.sourceSpan
      });
    }
    if (tsExpr === null) {
      return null;
    }
    let positionInShimFile = tsExpr.getEnd();
    if (ts22.isStringLiteral(tsExpr)) {
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
import ts36 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/dom.mjs
import { DomElementSchemaRegistry } from "@angular/compiler";
import ts23 from "typescript";
var REGISTRY = new DomElementSchemaRegistry();
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
      const diag = makeTemplateDiagnostic(id, mapping, element.startSourceSpan, ts23.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ELEMENT), errorMsg);
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
      const diag = makeTemplateDiagnostic(id, mapping, span, ts23.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMsg);
      this._diagnostics.push(diag);
    }
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/environment.mjs
import { ExpressionType, ExternalExpr as ExternalExpr2 } from "@angular/compiler";
import ts29 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/ts_util.mjs
import ts24 from "typescript";
var SAFE_TO_CAST_WITHOUT_PARENS = new Set([
  ts24.SyntaxKind.ParenthesizedExpression,
  ts24.SyntaxKind.Identifier,
  ts24.SyntaxKind.CallExpression,
  ts24.SyntaxKind.NonNullExpression,
  ts24.SyntaxKind.ElementAccessExpression,
  ts24.SyntaxKind.PropertyAccessExpression,
  ts24.SyntaxKind.ArrayLiteralExpression,
  ts24.SyntaxKind.ObjectLiteralExpression,
  ts24.SyntaxKind.StringLiteral,
  ts24.SyntaxKind.NumericLiteral,
  ts24.SyntaxKind.TrueKeyword,
  ts24.SyntaxKind.FalseKeyword,
  ts24.SyntaxKind.NullKeyword,
  ts24.SyntaxKind.UndefinedKeyword
]);
function tsCastToAny(expr) {
  if (!SAFE_TO_CAST_WITHOUT_PARENS.has(expr.kind)) {
    expr = ts24.createParen(expr);
  }
  return ts24.createParen(ts24.createAsExpression(expr, ts24.createKeywordTypeNode(ts24.SyntaxKind.AnyKeyword)));
}
function tsCreateElement(tagName) {
  const createElement = ts24.createPropertyAccess(ts24.createIdentifier("document"), "createElement");
  return ts24.createCall(createElement, void 0, [ts24.createLiteral(tagName)]);
}
function tsDeclareVariable(id, type) {
  const decl = ts24.createVariableDeclaration(id, type, ts24.createNonNullExpression(ts24.createNull()));
  return ts24.createVariableStatement(void 0, [decl]);
}
function tsCreateTypeQueryForCoercedInput(typeName, coercedInputName) {
  return ts24.createTypeQueryNode(ts24.createQualifiedName(typeName, `ngAcceptInputType_${coercedInputName}`));
}
function tsCreateVariable(id, initializer) {
  const decl = ts24.createVariableDeclaration(id, void 0, initializer);
  return ts24.createVariableStatement(void 0, [decl]);
}
function tsCallMethod(receiver, methodName, args = []) {
  const methodAccess = ts24.createPropertyAccess(receiver, methodName);
  return ts24.createCall(methodAccess, void 0, args);
}
function checkIfClassIsExported(node) {
  if (node.modifiers !== void 0 && node.modifiers.some((mod) => mod.kind === ts24.SyntaxKind.ExportKeyword)) {
    return true;
  } else if (node.parent !== void 0 && ts24.isSourceFile(node.parent) && checkIfFileHasExport(node.parent, node.name.text)) {
    return true;
  }
  return false;
}
function checkIfFileHasExport(sf, name) {
  for (const stmt of sf.statements) {
    if (ts24.isExportDeclaration(stmt) && stmt.exportClause !== void 0 && ts24.isNamedExports(stmt.exportClause)) {
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
  return ts24.isPropertyAccessExpression(node) || ts24.isElementAccessExpression(node);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_constructor.mjs
import ts28 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/tcb_util.mjs
import ts27 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_parameter_emitter.mjs
import ts26 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_emitter.mjs
import ts25 from "typescript";
var INELIGIBLE = {};
function canEmitType(type, resolver) {
  return canEmitTypeWorker(type);
  function canEmitTypeWorker(type2) {
    return visitNode(type2) !== INELIGIBLE;
  }
  function visitNode(node) {
    if (ts25.isImportTypeNode(node)) {
      return INELIGIBLE;
    }
    if (ts25.isTypeReferenceNode(node) && !canEmitTypeReference(node)) {
      return INELIGIBLE;
    } else {
      return ts25.forEachChild(node, visitNode);
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
        if (ts25.isImportTypeNode(node)) {
          throw new Error("Unable to emit import type");
        }
        if (ts25.isTypeReferenceNode(node)) {
          return this.emitTypeReference(node);
        } else if (ts25.isLiteralExpression(node)) {
          const clone = ts25.getMutableClone(node);
          ts25.setTextRange(clone, { pos: -1, end: -1 });
          return clone;
        } else {
          return ts25.visitEachChild(node, visitNode, context);
        }
      };
      return (node) => ts25.visitNode(node, visitNode);
    };
    return ts25.transform(type, [typeReferenceTransformer]).transformed[0];
  }
  emitTypeReference(type) {
    const reference = this.resolver(type);
    if (reference === null) {
      throw new Error("Unable to emit an unresolved reference");
    }
    let typeArguments = void 0;
    if (type.typeArguments !== void 0) {
      typeArguments = ts25.createNodeArray(type.typeArguments.map((typeArg) => this.emitType(typeArg)));
    }
    let typeName = type.typeName;
    if (reference instanceof Reference) {
      const emittedType = this.emitReference(reference);
      if (!ts25.isTypeReferenceNode(emittedType)) {
        throw new Error(`Expected TypeReferenceNode for emitted reference, got ${ts25.SyntaxKind[emittedType.kind]}`);
      }
      typeName = emittedType.typeName;
    }
    return ts25.updateTypeReferenceNode(type, typeName, typeArguments);
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
      return ts26.updateTypeParameterDeclaration(typeParam, typeParam.name, constraint, defaultType);
    });
  }
  resolveTypeReference(type) {
    const target = ts26.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
    const declaration = this.reflector.getDeclarationOfIdentifier(target);
    if (declaration === null || declaration.node === null) {
      return null;
    }
    if (this.isLocalTypeParameter(declaration.node)) {
      return type;
    }
    let owningModule = null;
    if (declaration.viaModule !== null) {
      owningModule = {
        specifier: declaration.viaModule,
        resolutionContext: type.getSourceFile().fileName
      };
    }
    if (!this.isTopLevelExport(declaration.node)) {
      return null;
    }
    return new Reference(declaration.node, owningModule);
  }
  isTopLevelExport(decl) {
    if (decl.parent === void 0 || !ts26.isSourceFile(decl.parent)) {
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
    if (ts27.isFunctionDeclaration(stmt) && getTemplateId2(stmt, file, isDiagnosticRequest) === id) {
      return stmt;
    }
  }
  return null;
}
function findSourceLocation(node, sourceFile, isDiagnosticsRequest) {
  while (node !== void 0 && !ts27.isFunctionDeclaration(node)) {
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
  while (!ts27.isFunctionDeclaration(node)) {
    if (hasIgnoreForDiagnosticsMarker(node, sourceFile) && isDiagnosticRequest) {
      return null;
    }
    node = node.parent;
    if (node === void 0) {
      return null;
    }
  }
  const start = node.getFullStart();
  return ts27.forEachLeadingCommentRange(sourceFile.text, start, (pos, end, kind) => {
    if (kind !== ts27.SyntaxKind.MultiLineCommentTrivia) {
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
  const rawType = ts28.createTypeReferenceNode(nodeTypeRef, rawTypeArgs);
  const initParam = constructTypeCtorParameter(node, meta, rawType);
  const typeParameters = typeParametersWithDefaultTypes(typeParams);
  if (meta.body) {
    const fnType = ts28.createFunctionTypeNode(typeParameters, [initParam], rawType);
    const decl = ts28.createVariableDeclaration(meta.fnName, fnType, ts28.createNonNullExpression(ts28.createNull()));
    const declList = ts28.createVariableDeclarationList([decl], ts28.NodeFlags.Const);
    return ts28.createVariableStatement(void 0, declList);
  } else {
    return ts28.createFunctionDeclaration(void 0, [ts28.createModifier(ts28.SyntaxKind.DeclareKeyword)], void 0, meta.fnName, typeParameters, [initParam], rawType, void 0);
  }
}
function generateInlineTypeCtor(node, meta) {
  const rawTypeArgs = node.typeParameters !== void 0 ? generateGenericArgs(node.typeParameters) : void 0;
  const rawType = ts28.createTypeReferenceNode(node.name, rawTypeArgs);
  const initParam = constructTypeCtorParameter(node, meta, rawType);
  let body = void 0;
  if (meta.body) {
    body = ts28.createBlock([
      ts28.createReturn(ts28.createNonNullExpression(ts28.createNull()))
    ]);
  }
  return ts28.createMethod(void 0, [ts28.createModifier(ts28.SyntaxKind.StaticKeyword)], void 0, meta.fnName, void 0, typeParametersWithDefaultTypes(node.typeParameters), [initParam], rawType, body);
}
function constructTypeCtorParameter(node, meta, rawType) {
  let initType = null;
  const keys = meta.fields.inputs;
  const plainKeys = [];
  const coercedKeys = [];
  for (const key of keys) {
    if (!meta.coercedInputFields.has(key)) {
      plainKeys.push(ts28.createLiteralTypeNode(ts28.createStringLiteral(key)));
    } else {
      coercedKeys.push(ts28.createPropertySignature(void 0, key, void 0, tsCreateTypeQueryForCoercedInput(rawType.typeName, key), void 0));
    }
  }
  if (plainKeys.length > 0) {
    const keyTypeUnion = ts28.createUnionTypeNode(plainKeys);
    initType = ts28.createTypeReferenceNode("Pick", [rawType, keyTypeUnion]);
  }
  if (coercedKeys.length > 0) {
    const coercedLiteral = ts28.createTypeLiteralNode(coercedKeys);
    initType = initType !== null ? ts28.createIntersectionTypeNode([initType, coercedLiteral]) : coercedLiteral;
  }
  if (initType === null) {
    initType = ts28.createTypeLiteralNode([]);
  }
  return ts28.createParameter(void 0, void 0, void 0, "init", void 0, initType, void 0);
}
function generateGenericArgs(params) {
  return params.map((param) => ts28.createTypeReferenceNode(param.name, void 0));
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
      return ts28.updateTypeParameterDeclaration(param, param.name, param.constraint, ts28.createKeywordTypeNode(ts28.SyntaxKind.AnyKeyword));
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
      const typeCtorExpr = ts29.createPropertyAccess(ref, "ngTypeCtor");
      this.typeCtors.set(node, typeCtorExpr);
      return typeCtorExpr;
    } else {
      const fnName = `_ctor${this.nextIds.typeCtor++}`;
      const nodeTypeRef = this.referenceType(dirRef);
      if (!ts29.isTypeReferenceNode(nodeTypeRef)) {
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
      const fnId = ts29.createIdentifier(fnName);
      this.typeCtors.set(node, fnId);
      return fnId;
    }
  }
  pipeInst(ref) {
    if (this.pipeInsts.has(ref.node)) {
      return this.pipeInsts.get(ref.node);
    }
    const pipeType = this.referenceType(ref);
    const pipeInstId = ts29.createIdentifier(`_pipe${this.nextIds.pipeInst++}`);
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
    const external = new ExternalExpr2({ moduleName, name });
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
import ts30 from "typescript";
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
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, ref.valueSpan || ref.sourceSpan, ts30.DiagnosticCategory.Error, ngErrorCode(ErrorCode.MISSING_REFERENCE_TARGET), errorMsg));
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
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, sourceSpan, ts30.DiagnosticCategory.Error, ngErrorCode(ErrorCode.MISSING_PIPE), errorMsg));
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
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, sourceSpan, ts30.DiagnosticCategory.Error, ngErrorCode(ErrorCode.WRITE_TO_READ_ONLY_VARIABLE), errorMsg, [{
      text: `The variable ${assignment.name} is declared here.`,
      start: ((_a = target.valueSpan) == null ? void 0 : _a.start.offset) || target.sourceSpan.start.offset,
      end: ((_b = target.valueSpan) == null ? void 0 : _b.end.offset) || target.sourceSpan.end.offset,
      sourceFile: mapping.node.getSourceFile()
    }]));
  }
  duplicateTemplateVar(templateId, variable, firstDecl) {
    const mapping = this.resolver.getSourceMapping(templateId);
    const errorMsg = `Cannot redeclare variable '${variable.name}' as it was previously declared elsewhere for the same template.`;
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, variable.sourceSpan, ts30.DiagnosticCategory.Error, ngErrorCode(ErrorCode.DUPLICATE_VARIABLE_DECLARATION), errorMsg, [{
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
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, diagnosticVar.keySpan, ts30.DiagnosticCategory.Suggestion, ngErrorCode(ErrorCode.SUGGEST_SUBOPTIMAL_TYPE_INFERENCE), message));
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
    this._diagnostics.push(makeTemplateDiagnostic(templateId, mapping, input.keySpan, ts30.DiagnosticCategory.Error, ngErrorCode(ErrorCode.SPLIT_TWO_WAY_BINDING), errorMsg, relatedMessages));
  }
};
function makeInlineDiagnostic(templateId, code, node, messageText, relatedInformation) {
  return __spreadProps(__spreadValues({}, makeDiagnostic(code, node, messageText, relatedInformation)), {
    componentFile: node.getSourceFile(),
    templateId
  });
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/shim.mjs
import ts31 from "typescript";
var TypeCheckShimGenerator = class {
  constructor() {
    this.extensionPrefix = "ngtypecheck";
    this.shouldEmit = false;
  }
  generateShimForFile(sf, genFilePath, priorShimSf) {
    if (priorShimSf !== null) {
      return priorShimSf;
    }
    return ts31.createSourceFile(genFilePath, "export const USED_FOR_NG_TYPE_CHECKING = true;", ts31.ScriptTarget.Latest, true, ts31.ScriptKind.TS);
  }
  static shimFor(fileName) {
    return absoluteFrom(fileName.replace(/\.tsx?$/, ".ngtypecheck.ts"));
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_block.mjs
import { BindingPipe, Call as Call2, DYNAMIC_TYPE, ImplicitReceiver as ImplicitReceiver4, PropertyRead as PropertyRead2, PropertyWrite as PropertyWrite2, SafePropertyRead as SafePropertyRead3, ThisReceiver, TmplAstBoundAttribute, TmplAstBoundText, TmplAstElement as TmplAstElement3, TmplAstIcu, TmplAstReference as TmplAstReference3, TmplAstTemplate as TmplAstTemplate2, TmplAstTextAttribute as TmplAstTextAttribute2, TmplAstVariable as TmplAstVariable2 } from "@angular/compiler";
import ts34 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/diagnostics.mjs
import { AbsoluteSourceSpan as AbsoluteSourceSpan3 } from "@angular/compiler";
import ts32 from "typescript";
function wrapForDiagnostics(expr) {
  return ts32.createParen(expr);
}
function wrapForTypeChecker(expr) {
  return ts32.createParen(expr);
}
function addParseSpanInfo(node, span) {
  let commentText;
  if (span instanceof AbsoluteSourceSpan3) {
    commentText = `${span.start},${span.end}`;
  } else {
    commentText = `${span.start.offset},${span.end.offset}`;
  }
  ts32.addSyntheticTrailingComment(node, ts32.SyntaxKind.MultiLineCommentTrivia, commentText, false);
}
function addTemplateId(tcb, id) {
  ts32.addSyntheticLeadingComment(tcb, ts32.SyntaxKind.MultiLineCommentTrivia, id, true);
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
import ts33 from "typescript";
var NULL_AS_ANY = ts33.createAsExpression(ts33.createNull(), ts33.createKeywordTypeNode(ts33.SyntaxKind.AnyKeyword));
var UNDEFINED = ts33.createIdentifier("undefined");
var UNARY_OPS = new Map([
  ["+", ts33.SyntaxKind.PlusToken],
  ["-", ts33.SyntaxKind.MinusToken]
]);
var BINARY_OPS = new Map([
  ["+", ts33.SyntaxKind.PlusToken],
  ["-", ts33.SyntaxKind.MinusToken],
  ["<", ts33.SyntaxKind.LessThanToken],
  [">", ts33.SyntaxKind.GreaterThanToken],
  ["<=", ts33.SyntaxKind.LessThanEqualsToken],
  [">=", ts33.SyntaxKind.GreaterThanEqualsToken],
  ["==", ts33.SyntaxKind.EqualsEqualsToken],
  ["===", ts33.SyntaxKind.EqualsEqualsEqualsToken],
  ["*", ts33.SyntaxKind.AsteriskToken],
  ["/", ts33.SyntaxKind.SlashToken],
  ["%", ts33.SyntaxKind.PercentToken],
  ["!=", ts33.SyntaxKind.ExclamationEqualsToken],
  ["!==", ts33.SyntaxKind.ExclamationEqualsEqualsToken],
  ["||", ts33.SyntaxKind.BarBarToken],
  ["&&", ts33.SyntaxKind.AmpersandAmpersandToken],
  ["&", ts33.SyntaxKind.AmpersandToken],
  ["|", ts33.SyntaxKind.BarToken],
  ["??", ts33.SyntaxKind.QuestionQuestionToken]
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
      const res = ts33.factory.createIdentifier("undefined");
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
    const node = wrapForDiagnostics(ts33.createPrefix(op, expr));
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
    const node = ts33.createBinary(lhs, op, rhs);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitChain(ast) {
    const elements = ast.expressions.map((expr) => this.translate(expr));
    const node = wrapForDiagnostics(ts33.createCommaList(elements));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitConditional(ast) {
    const condExpr = this.translate(ast.condition);
    const trueExpr = this.translate(ast.trueExp);
    const falseExpr = wrapForTypeChecker(this.translate(ast.falseExp));
    const node = ts33.createParen(ts33.createConditional(condExpr, trueExpr, falseExpr));
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
    return ast.expressions.reduce((lhs, ast2) => ts33.createBinary(lhs, ts33.SyntaxKind.PlusToken, wrapForTypeChecker(this.translate(ast2))), ts33.createLiteral(""));
  }
  visitKeyedRead(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const key = this.translate(ast.key);
    const node = ts33.createElementAccess(receiver, key);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitKeyedWrite(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const left = ts33.createElementAccess(receiver, this.translate(ast.key));
    const right = wrapForTypeChecker(this.translate(ast.value));
    const node = wrapForDiagnostics(ts33.createBinary(left, ts33.SyntaxKind.EqualsToken, right));
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitLiteralArray(ast) {
    const elements = ast.expressions.map((expr) => this.translate(expr));
    const literal = ts33.createArrayLiteral(elements);
    const node = this.config.strictLiteralTypes ? literal : tsCastToAny(literal);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitLiteralMap(ast) {
    const properties = ast.keys.map(({ key }, idx) => {
      const value = this.translate(ast.values[idx]);
      return ts33.createPropertyAssignment(ts33.createStringLiteral(key), value);
    });
    const literal = ts33.createObjectLiteral(properties, true);
    const node = this.config.strictLiteralTypes ? literal : tsCastToAny(literal);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitLiteralPrimitive(ast) {
    let node;
    if (ast.value === void 0) {
      node = ts33.createIdentifier("undefined");
    } else if (ast.value === null) {
      node = ts33.createNull();
    } else {
      node = ts33.createLiteral(ast.value);
    }
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitNonNullAssert(ast) {
    const expr = wrapForDiagnostics(this.translate(ast.expression));
    const node = ts33.createNonNullExpression(expr);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitPipe(ast) {
    throw new Error("Method not implemented.");
  }
  visitPrefixNot(ast) {
    const expression = wrapForDiagnostics(this.translate(ast.expression));
    const node = ts33.createLogicalNot(expression);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitPropertyRead(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const name = ts33.createPropertyAccess(receiver, ast.name);
    addParseSpanInfo(name, ast.nameSpan);
    const node = wrapForDiagnostics(name);
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitPropertyWrite(ast) {
    const receiver = wrapForDiagnostics(this.translate(ast.receiver));
    const left = ts33.createPropertyAccess(receiver, ast.name);
    addParseSpanInfo(left, ast.nameSpan);
    const leftWithPath = wrapForDiagnostics(left);
    addParseSpanInfo(leftWithPath, ast.sourceSpan);
    const right = wrapForTypeChecker(this.translate(ast.value));
    const node = wrapForDiagnostics(ts33.createBinary(leftWithPath, ts33.SyntaxKind.EqualsToken, right));
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
      const expr = ts33.createPropertyAccess(ts33.createNonNullExpression(receiver), ast.name);
      addParseSpanInfo(expr, ast.nameSpan);
      node = ts33.createParen(ts33.createConditional(NULL_AS_ANY, expr, UNDEFINED));
    } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      node = ts33.createPropertyAccess(tsCastToAny(receiver), ast.name);
    } else {
      const expr = ts33.createPropertyAccess(ts33.createNonNullExpression(receiver), ast.name);
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
      const expr = ts33.createElementAccess(ts33.createNonNullExpression(receiver), key);
      addParseSpanInfo(expr, ast.sourceSpan);
      node = ts33.createParen(ts33.createConditional(NULL_AS_ANY, expr, UNDEFINED));
    } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
      node = ts33.createElementAccess(tsCastToAny(receiver), key);
    } else {
      const expr = ts33.createElementAccess(ts33.createNonNullExpression(receiver), key);
      addParseSpanInfo(expr, ast.sourceSpan);
      node = tsCastToAny(expr);
    }
    addParseSpanInfo(node, ast.sourceSpan);
    return node;
  }
  visitCall(ast) {
    const args = ast.args.map((expr2) => this.translate(expr2));
    const expr = wrapForDiagnostics(this.translate(ast.receiver));
    let node;
    if (ast.receiver instanceof SafePropertyRead2 || ast.receiver instanceof SafeKeyedRead) {
      if (this.config.strictSafeNavigationTypes) {
        const call = ts33.createCall(ts33.createNonNullExpression(expr), void 0, args);
        node = ts33.createParen(ts33.createConditional(NULL_AS_ANY, call, UNDEFINED));
      } else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
        node = ts33.createCall(tsCastToAny(expr), void 0, args);
      } else {
        node = tsCastToAny(ts33.createCall(ts33.createNonNullExpression(expr), void 0, args));
      }
    } else {
      node = ts33.createCall(expr, void 0, args);
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
  const tcb = new Context(env, domSchemaChecker, oobRecorder, meta.id, meta.boundTarget, meta.pipes, meta.schemas);
  const scope = Scope.forNodes(tcb, null, tcb.boundTarget.target.template, null);
  const ctxRawType = env.referenceType(ref);
  if (!ts34.isTypeReferenceNode(ctxRawType)) {
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
        typeArguments = typeParameters.map((param) => ts34.factory.createTypeReferenceNode(param.name));
        break;
      case TcbGenericContextBehavior.CopyClassNodes:
        typeParameters = [...ref.node.typeParameters];
        typeArguments = typeParameters.map((param) => ts34.factory.createTypeReferenceNode(param.name));
        break;
      case TcbGenericContextBehavior.FallbackToAny:
        typeArguments = ref.node.typeParameters.map(() => ts34.factory.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword));
        break;
    }
  }
  const paramList = [tcbCtxParam(ref.node, ctxRawType.typeName, typeArguments)];
  const scopeStatements = scope.render();
  const innerBody = ts34.createBlock([
    ...env.getPreludeStatements(),
    ...scopeStatements
  ]);
  const body = ts34.createBlock([ts34.createIf(ts34.createTrue(), innerBody, void 0)]);
  const fnDecl = ts34.createFunctionDeclaration(void 0, void 0, void 0, name, env.config.useContextGenericType ? typeParameters : void 0, paramList, void 0, body);
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
    const initializer = ts34.createPropertyAccess(ctx, this.variable.value || "$implicit");
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
    const type = ts34.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword);
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
      guard = directiveGuards.reduce((expr, dirGuard) => ts34.createBinary(expr, ts34.SyntaxKind.AmpersandAmpersandToken, dirGuard), directiveGuards.pop());
    }
    const tmplScope = Scope.forNodes(this.tcb, this.scope, this.template, guard);
    const statements = tmplScope.render();
    if (statements.length === 0) {
      return null;
    }
    let tmplBlock = ts34.createBlock(statements);
    if (guard !== null) {
      tmplBlock = ts34.createIf(guard, tmplBlock);
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
    this.scope.addStatement(ts34.createExpressionStatement(expr));
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
      if (!ts34.isTypeReferenceNode(rawType)) {
        throw new Error(`Expected TypeReferenceNode when referencing the type for ${this.dir.ref.debugName}`);
      }
      const typeArguments = dirRef.node.typeParameters.map(() => ts34.factory.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword));
      type = ts34.factory.createTypeReferenceNode(rawType.typeName, typeArguments);
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
      initializer = ts34.createAsExpression(initializer, ts34.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword));
    } else if (this.target instanceof TmplAstTemplate2) {
      initializer = ts34.createAsExpression(initializer, ts34.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword));
      initializer = ts34.createAsExpression(initializer, this.tcb.env.referenceExternalType("@angular/core", "TemplateRef", [DYNAMIC_TYPE]));
      initializer = ts34.createParen(initializer);
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
          if (!ts34.isTypeReferenceNode(dirTypeRef)) {
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
          if (!ts34.isTypeReferenceNode(dirTypeRef)) {
            throw new Error(`Expected TypeReferenceNode from reference to ${this.dir.ref.debugName}`);
          }
          const type = ts34.createIndexedAccessTypeNode(ts34.createTypeQueryNode(dirId), ts34.createLiteralTypeNode(ts34.createStringLiteral(fieldName)));
          const temp = tsDeclareVariable(id, type);
          this.scope.addStatement(temp);
          target = id;
        } else {
          if (dirId === null) {
            dirId = this.scope.resolve(this.node, this.dir);
          }
          target = this.dir.stringLiteralInputFields.has(fieldName) ? ts34.createElementAccess(dirId, ts34.createStringLiteral(fieldName)) : ts34.createPropertyAccess(dirId, ts34.createIdentifier(fieldName));
        }
        if (input.attribute.keySpan !== void 0) {
          addParseSpanInfo(target, input.attribute.keySpan);
        }
        assignment = ts34.createBinary(target, ts34.SyntaxKind.EqualsToken, assignment);
      }
      addParseSpanInfo(assignment, input.attribute.sourceSpan);
      if (!this.tcb.env.config.checkTypeOfAttributes && input.attribute instanceof TmplAstTextAttribute2) {
        markIgnoreDiagnostics(assignment);
      }
      this.scope.addStatement(ts34.createExpressionStatement(assignment));
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
    const circularPlaceholder = ts34.createCall(typeCtor, void 0, [ts34.createNonNullExpression(ts34.createNull())]);
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
          const prop = ts34.createElementAccess(elId, ts34.createStringLiteral(propertyName));
          const stmt = ts34.createBinary(prop, ts34.SyntaxKind.EqualsToken, wrapForDiagnostics(expr));
          addParseSpanInfo(stmt, binding.sourceSpan);
          this.scope.addStatement(ts34.createExpressionStatement(stmt));
        } else {
          this.scope.addStatement(ts34.createExpressionStatement(expr));
        }
      } else {
        this.scope.addStatement(ts34.createExpressionStatement(expr));
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
      const outputField = ts34.createElementAccess(dirId, ts34.createStringLiteral(field));
      addParseSpanInfo(outputField, output.keySpan);
      if (this.tcb.env.config.checkTypeOfOutputEvents) {
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0);
        const subscribeFn = ts34.createPropertyAccess(outputField, "subscribe");
        const call = ts34.createCall(subscribeFn, void 0, [handler]);
        addParseSpanInfo(call, output.sourceSpan);
        this.scope.addStatement(ts34.createExpressionStatement(call));
      } else {
        this.scope.addStatement(ts34.createExpressionStatement(outputField));
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 1);
        this.scope.addStatement(ts34.createExpressionStatement(handler));
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
        this.scope.addStatement(ts34.createExpressionStatement(handler));
      } else if (this.tcb.env.config.checkTypeOfDomEvents) {
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0);
        if (elId === null) {
          elId = this.scope.resolve(this.element);
        }
        const propertyAccess = ts34.createPropertyAccess(elId, "addEventListener");
        addParseSpanInfo(propertyAccess, output.keySpan);
        const call = ts34.createCall(propertyAccess, void 0, [ts34.createStringLiteral(output.name), handler]);
        addParseSpanInfo(call, output.sourceSpan);
        this.scope.addStatement(ts34.createExpressionStatement(call));
      } else {
        const handler = tcbCreateEventHandler(output, this.tcb, this.scope, 1);
        this.scope.addStatement(ts34.createExpressionStatement(handler));
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
    const ctx = ts34.createIdentifier("ctx");
    const ctxDot = ts34.createPropertyAccess(ctx, "");
    markIgnoreDiagnostics(ctxDot);
    addExpressionIdentifier(ctxDot, ExpressionIdentifier.COMPONENT_COMPLETION);
    this.scope.addStatement(ts34.createExpressionStatement(ctxDot));
    return null;
  }
};
var INFER_TYPE_FOR_CIRCULAR_OP_EXPR = ts34.createNonNullExpression(ts34.createNull());
var Context = class {
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
    return ts34.createIdentifier(`_t${this.nextId++}`);
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
      const clone = ts34.getMutableClone(res);
      ts34.setSyntheticTrailingComments(clone, []);
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
      return ts34.createBinary(parentGuards, ts34.SyntaxKind.AmpersandAmpersandToken, this.guard);
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
  const type = ts34.factory.createTypeReferenceNode(name, typeArguments);
  return ts34.factory.createParameterDeclaration(void 0, void 0, void 0, "ctx", void 0, type, void 0);
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
      const result = ts34.createParen(ts34.createBinary(target, ts34.SyntaxKind.EqualsToken, expr));
      addParseSpanInfo(result, ast.sourceSpan);
      return result;
    } else if (ast instanceof ImplicitReceiver4) {
      return ts34.createIdentifier("ctx");
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
      const args = ast.args.map((arg) => this.translate(arg));
      let methodAccess = ts34.factory.createPropertyAccessExpression(pipe, "transform");
      addParseSpanInfo(methodAccess, ast.nameSpan);
      if (!this.tcb.env.config.checkTypeOfPipes) {
        methodAccess = ts34.factory.createAsExpression(methodAccess, ts34.factory.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword));
      }
      const result = ts34.createCall(methodAccess, void 0, [expr, ...args]);
      addParseSpanInfo(result, ast.sourceSpan);
      return result;
    } else if (ast instanceof Call2 && (ast.receiver instanceof PropertyRead2 || ast.receiver instanceof SafePropertyRead3) && !(ast.receiver.receiver instanceof ThisReceiver)) {
      if (ast.receiver.name === "$any" && ast.args.length === 1) {
        const expr = this.translate(ast.args[0]);
        const exprAsAny = ts34.createAsExpression(expr, ts34.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword));
        const result = ts34.createParen(exprAsAny);
        addParseSpanInfo(result, ast.sourceSpan);
        return result;
      }
      const receiver = this.resolveTarget(ast);
      if (receiver === null) {
        return null;
      }
      const method = wrapForDiagnostics(receiver);
      addParseSpanInfo(method, ast.receiver.nameSpan);
      const args = ast.args.map((arg) => this.translate(arg));
      const node = ts34.createCall(method, void 0, args);
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
    const propertyName = ts34.createStringLiteral(input.field);
    if (input.type === "binding") {
      const expr = widenBinding(input.expression, tcb);
      const assignment = ts34.createPropertyAssignment(propertyName, wrapForDiagnostics(expr));
      addParseSpanInfo(assignment, input.sourceSpan);
      return assignment;
    } else {
      return ts34.createPropertyAssignment(propertyName, NULL_AS_ANY);
    }
  });
  return ts34.createCall(typeCtor, void 0, [ts34.createObjectLiteral(members)]);
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
    return ts34.createStringLiteral(attr.value);
  }
}
function widenBinding(expr, tcb) {
  if (!tcb.env.config.checkTypeOfInputBindings) {
    return tsCastToAny(expr);
  } else if (!tcb.env.config.strictNullInputBindings) {
    if (ts34.isObjectLiteralExpression(expr) || ts34.isArrayLiteralExpression(expr)) {
      return expr;
    } else {
      return ts34.createNonNullExpression(expr);
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
    eventParamType = ts34.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword);
  } else {
    eventParamType = eventType;
  }
  const guards = scope.guards();
  let body = ts34.createExpressionStatement(handler);
  if (guards !== null) {
    body = ts34.createIf(guards, body);
  }
  const eventParam = ts34.createParameter(void 0, void 0, void 0, EVENT_PARAMETER, void 0, eventParamType);
  addExpressionIdentifier(eventParam, ExpressionIdentifier.EVENT_PARAMETER);
  return ts34.createFunctionExpression(void 0, void 0, void 0, void 0, [eventParam], ts34.createKeywordTypeNode(ts34.SyntaxKind.AnyKeyword), ts34.createBlock([body]));
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
      const event = ts34.createIdentifier(EVENT_PARAMETER);
      addParseSpanInfo(event, ast.nameSpan);
      return event;
    }
    return super.resolve(ast);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/src/type_check_file.mjs
import ts35 from "typescript";
var TypeCheckFile = class extends Environment {
  constructor(fileName, config, refEmitter, reflector, compilerHost) {
    super(config, new ImportManager(new NoopImportRewriter(), "i"), refEmitter, reflector, ts35.createSourceFile(compilerHost.getCanonicalFileName(fileName), "", ts35.ScriptTarget.Latest, true));
    this.fileName = fileName;
    this.nextTcbId = 1;
    this.tcbStatements = [];
  }
  addTypeCheckBlock(ref, meta, domSchemaChecker, oobRecorder, genericContextBehavior) {
    const fnId = ts35.createIdentifier(`_tcb${this.nextTcbId++}`);
    const fn = generateTypeCheckBlock(this, ref, fnId, meta, domSchemaChecker, oobRecorder, genericContextBehavior);
    this.tcbStatements.push(fn);
  }
  render(removeComments) {
    let source = this.importManager.getAllImports(this.contextFile.fileName).map((i) => `import * as ${i.qualifier.text} from '${i.specifier}';`).join("\n") + "\n\n";
    const printer = ts35.createPrinter({ removeComments });
    source += "\n";
    for (const stmt of this.pipeInstStatements) {
      source += printer.printNode(ts35.EmitHint.Unspecified, stmt, this.contextFile) + "\n";
    }
    for (const stmt of this.typeCtorStatements) {
      source += printer.printNode(ts35.EmitHint.Unspecified, stmt, this.contextFile) + "\n";
    }
    source += "\n";
    for (const stmt of this.tcbStatements) {
      source += printer.printNode(ts35.EmitHint.Unspecified, stmt, this.contextFile) + "\n";
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
    const printer = ts36.createPrinter({ omitTrailingSemicolon: true });
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
      return makeTemplateDiagnostic(templateId, sourceMapping, span, ts36.DiagnosticCategory.Error, ngErrorCode(ErrorCode.TEMPLATE_PARSE_ERROR), error2.msg);
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
    const fnName = ts36.createIdentifier(`_tcb_${this.ref.node.pos}`);
    const fn = generateTypeCheckBlock(env, this.ref, fnName, this.meta, this.domSchemaChecker, this.oobRecorder, TcbGenericContextBehavior.CopyClassNodes);
    return printer.printNode(ts36.EmitHint.Unspecified, fn, sf);
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
    return printer.printNode(ts36.EmitHint.Unspecified, tcb, sf);
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
import { ParseLocation, ParseSourceSpan } from "@angular/compiler";

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
    return new ParseSourceSpan(startLoc, endLoc);
  }
  toParseLocation(position) {
    const lineStarts = this.acquireLineStarts();
    const { line, character } = getLineAndCharacterFromPosition(lineStarts, position);
    return new ParseLocation(this.file, position, line, character);
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
import ts37 from "typescript";
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
    const node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: ts37.isVariableDeclaration });
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
    const isDirectiveDeclaration = (node) => (ts37.isTypeNode(node) || ts37.isIdentifier(node)) && ts37.isVariableDeclaration(node.parent) && hasExpressionIdentifier(tcbSourceFile, node, ExpressionIdentifier.DIRECTIVE);
    const nodes = findAllMatchingNodes(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: isDirectiveDeclaration });
    return nodes.map((node) => {
      var _a2;
      const symbol = this.getSymbolOfTsNode(node.parent);
      if (symbol === null || !isSymbolWithValueDeclaration(symbol.tsSymbol) || !ts37.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
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
      if (ts37.isPropertyAccessExpression(n)) {
        return n.name.getText() === expectedAccess;
      } else {
        return ts37.isStringLiteral(n.argumentExpression) && n.argumentExpression.text === expectedAccess;
      }
    }
    const outputFieldAccesses = findAllMatchingNodes(this.typeCheckBlock, { withSpan: eventBinding.keySpan, filter });
    const bindings = [];
    for (const outputFieldAccess of outputFieldAccesses) {
      if (consumer instanceof TmplAstTemplate3 || consumer instanceof TmplAstElement4) {
        if (!ts37.isPropertyAccessExpression(outputFieldAccess)) {
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
        if (!ts37.isElementAccessExpression(outputFieldAccess)) {
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
    if (!ts37.isVariableDeclaration(declaration) || !hasExpressionIdentifier(declaration.getSourceFile(), (_a = declaration.type) != null ? _a : declaration.name, ExpressionIdentifier.DIRECTIVE)) {
      return null;
    }
    const symbol = this.getSymbolOfTsNode(declaration);
    if (symbol === null || !isSymbolWithValueDeclaration(symbol.tsSymbol) || !ts37.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
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
    const node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: variable.sourceSpan, filter: ts37.isVariableDeclaration });
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
    let node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: ref.sourceSpan, filter: ts37.isVariableDeclaration });
    if (node === null || target === null || node.initializer === void 0) {
      return null;
    }
    const originalDeclaration = ts37.isParenthesizedExpression(node.initializer) && ts37.isAsExpression(node.initializer.expression) ? this.getTypeChecker().getSymbolAtLocation(node.name) : this.getTypeChecker().getSymbolAtLocation(node.initializer);
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
      if (!ts37.isClassDeclaration(target.directive.ref.node)) {
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
    const methodAccess = findFirstMatchingNode(this.typeCheckBlock, { withSpan: expression.nameSpan, filter: ts37.isPropertyAccessExpression });
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
      node = findFirstMatchingNode(this.typeCheckBlock, { withSpan, filter: ts37.isPropertyAccessExpression });
    }
    if (node === null) {
      node = findFirstMatchingNode(this.typeCheckBlock, { withSpan, filter: anyNodeFilter });
    }
    if (node === null) {
      return null;
    }
    while (ts37.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    if (expression instanceof SafePropertyRead4 && ts37.isConditionalExpression(node)) {
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
    while (ts37.isParenthesizedExpression(node)) {
      node = node.expression;
    }
    let tsSymbol;
    if (ts37.isPropertyAccessExpression(node)) {
      tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.name);
    } else if (ts37.isElementAccessExpression(node)) {
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
    if (ts37.isTypeReferenceNode(node)) {
      return this.getShimPositionForNode(node.typeName);
    } else if (ts37.isQualifiedName(node)) {
      return node.right.getStart();
    } else if (ts37.isPropertyAccessExpression(node)) {
      return node.name.getStart();
    } else if (ts37.isElementAccessExpression(node)) {
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
var REGISTRY2 = new DomElementSchemaRegistry2();
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
  getFileData(path7) {
    if (!this.state.has(path7)) {
      this.state.set(path7, {
        hasInlines: false,
        sourceManager: new TemplateSourceManager(),
        isComplete: false,
        shimData: new Map()
      });
    }
    return this.state.get(path7);
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
        for (const selector of CssSelector2.parse(directive.selector)) {
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
import ts38 from "typescript";

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
    const diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, node.sourceSpan, ts38.DiagnosticCategory.Warning, ErrorCode.INVALID_BANANA_IN_BOX, `In the two-way binding syntax the parentheses should be inside the brackets, ex. '${expectedBoundSyntax}'.
        Find more at https://angular.io/guide/two-way-binding`);
    return [diagnostic];
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable/index.mjs
import { Binary } from "@angular/compiler";
import ts39 from "typescript";
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
    const diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, span, ts39.DiagnosticCategory.Warning, ErrorCode.NULLISH_COALESCING_NOT_NULLABLE, `The left side of this nullish coalescing operation does not include 'null' or 'undefined' in its type, therefore the '??' operator can be safely removed.`);
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
function incrementalFromStateTicket(oldProgram, oldState, newProgram, options, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
  if (perfRecorder === null) {
    perfRecorder = ActivePerfRecorder.zeroedToNow();
  }
  const incrementalCompilation = IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
  return {
    kind: CompilationTicketKind.IncrementalTypeScript,
    newProgram,
    options,
    incrementalBuildStrategy,
    incrementalCompilation,
    programDriver,
    enableTemplateTypeChecker,
    usePoisonedData,
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
    const moduleResolutionCache = ts40.createModuleResolutionCache(this.adapter.getCurrentDirectory(), this.adapter.getCanonicalFileName.bind(this.adapter));
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
        if (!ts40.isClassDeclaration(clazz)) {
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
    before.push(ivySwitchTransform);
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
    if (!ts40.isVariableStatement(stmt)) {
      return false;
    }
    if (stmt.modifiers === void 0 || !stmt.modifiers.some((mod) => mod.kind === ts40.SyntaxKind.ExportKeyword)) {
      return false;
    }
    return stmt.declarationList.declarations.some((decl) => {
      if (!ts40.isIdentifier(decl.name) || decl.name.text !== "ITS_JUST_ANGULAR") {
        return false;
      }
      if (decl.initializer === void 0 || decl.initializer.kind !== ts40.SyntaxKind.TrueKeyword) {
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
      category: ts40.DiagnosticCategory.Error,
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
        sourceFile = ts40.getOriginalNode(node).getSourceFile();
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/core/src/host.mjs
import ts41 from "typescript";
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
          category: ts41.DiagnosticCategory.Error,
          code: ngErrorCode(ErrorCode.CONFIG_FLAT_MODULE_NO_INDEX),
          file: void 0,
          start: void 0,
          length: void 0,
          messageText: 'Angular compiler option "flatModuleOutFile" requires one and only one .ts file in the "files" field.'
        });
      } else {
        const flatModuleId = options.flatModuleId || null;
        const flatModuleOutFile = normalizeSeparators(options.flatModuleOutFile);
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
    const moduleResolutionCache = ts41.createModuleResolutionCache(this.getCurrentDirectory(), this.getCanonicalFileName.bind(this));
    return (moduleNames, containingFile, reusedNames, redirectedReference, options) => {
      return moduleNames.map((moduleName) => {
        const module = ts41.resolveModuleName(moduleName, containingFile, options, this, moduleResolutionCache, redirectedReference);
        return module.resolvedModule;
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
    this.tsProgram = perfRecorder.inPhase(PerfPhase.TypeScriptProgramCreate, () => ts42.createProgram(this.host.inputFiles, options, this.host, reuseProgram));
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/program.mjs
import { core, createAotCompiler, getMissingNgModuleMetadataErrorData, getParseErrors, isFormattedError, isSyntaxError } from "@angular/compiler";
import {
  readFileSync
} from "fs";
import * as path6 from "path";
import ts50 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/diagnostics/translate_diagnostics.mjs
import ts43 from "typescript";
function translateDiagnostics(host, untranslatedDiagnostics) {
  const ts52 = [];
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
      ts52.push(diagnostic);
    }
  });
  return { ts: ts52, ng: ng2 };
}
function sourceSpanOf(host, source, start) {
  const { line, character } = ts43.getLineAndCharacterOfPosition(source, start);
  return host.parseSourceSpanOf(source.fileName, line, character);
}
function diagnosticMessageToString(message) {
  return ts43.flattenDiagnosticMessageText(message, "\n");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/inline_resources.mjs
import ts44 from "typescript";
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
      if (isClassMetadata(value) && ts44.isClassDeclaration(node) && value.decorators) {
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
      if (!ts44.isClassDeclaration(node)) {
        return node;
      }
      const newDecorators = ts44.visitNodes(node.decorators, (node2) => {
        if (ts44.isDecorator(node2) && isComponentDecorator(node2, program.getTypeChecker())) {
          return updateDecorator(node2, loader);
        }
        return node2;
      });
      const newMembers = ts44.visitNodes(node.members, (node2) => {
        if (ts44.isClassElement(node2)) {
          return updateAnnotations(node2, loader, program.getTypeChecker());
        } else {
          return node2;
        }
      });
      return ts44.updateClassDeclaration(node, newDecorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], newMembers);
    };
    return ts44.visitEachChild(sourceFile, visitor, context);
  };
}
function updateDecorator(node, loader) {
  if (!ts44.isCallExpression(node.expression)) {
    return node;
  }
  const expr = node.expression;
  const newArguments = updateComponentProperties(expr.arguments, loader);
  return ts44.updateDecorator(node, ts44.updateCall(expr, expr.expression, expr.typeArguments, newArguments));
}
function updateAnnotations(node, loader, typeChecker) {
  if (!ts44.isPropertyDeclaration(node) || !ts44.isIdentifier(node.name) || node.name.text !== "decorators" || !node.initializer || !ts44.isArrayLiteralExpression(node.initializer)) {
    return node;
  }
  const newAnnotations = node.initializer.elements.map((annotation) => {
    if (!ts44.isObjectLiteralExpression(annotation))
      return annotation;
    const decoratorType = annotation.properties.find((p) => isIdentifierNamed(p, "type"));
    if (!decoratorType || !ts44.isPropertyAssignment(decoratorType) || !ts44.isIdentifier(decoratorType.initializer) || !isComponentSymbol(decoratorType.initializer, typeChecker)) {
      return annotation;
    }
    const newAnnotation = annotation.properties.map((prop) => {
      if (!isIdentifierNamed(prop, "args") || !ts44.isPropertyAssignment(prop) || !ts44.isArrayLiteralExpression(prop.initializer))
        return prop;
      const newDecoratorArgs = ts44.updatePropertyAssignment(prop, prop.name, ts44.createArrayLiteral(updateComponentProperties(prop.initializer.elements, loader)));
      return newDecoratorArgs;
    });
    return ts44.updateObjectLiteral(annotation, newAnnotation);
  });
  return ts44.updateProperty(node, node.decorators, node.modifiers, node.name, node.questionToken, node.type, ts44.updateArrayLiteral(node.initializer, newAnnotations));
}
function isIdentifierNamed(p, name) {
  return !!p.name && ts44.isIdentifier(p.name) && p.name.text === name;
}
function isComponentDecorator(node, typeChecker) {
  if (!ts44.isCallExpression(node.expression)) {
    return false;
  }
  const callExpr = node.expression;
  let identifier;
  if (ts44.isIdentifier(callExpr.expression)) {
    identifier = callExpr.expression;
  } else {
    return false;
  }
  return isComponentSymbol(identifier, typeChecker);
}
function isComponentSymbol(identifier, typeChecker) {
  if (!ts44.isIdentifier(identifier))
    return false;
  const symbol = typeChecker.getSymbolAtLocation(identifier);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    console.error(`Unable to resolve symbol '${identifier.text}' in the program, does it type-check?`);
    return false;
  }
  const declaration = symbol.declarations[0];
  if (!declaration || !ts44.isImportSpecifier(declaration)) {
    return false;
  }
  const name = (declaration.propertyName || declaration.name).text;
  const moduleId = declaration.parent.parent.parent.moduleSpecifier.text;
  return moduleId === "@angular/core" && name === "Component";
}
function updateComponentProperties(args, loader) {
  if (args.length !== 1) {
    return args;
  }
  const componentArg = args[0];
  if (!ts44.isObjectLiteralExpression(componentArg)) {
    return args;
  }
  const newProperties = [];
  const newStyleExprs = [];
  componentArg.properties.forEach((prop) => {
    if (!ts44.isPropertyAssignment(prop) || ts44.isComputedPropertyName(prop.name)) {
      newProperties.push(prop);
      return;
    }
    switch (prop.name.text) {
      case "styles":
        if (!ts44.isArrayLiteralExpression(prop.initializer)) {
          throw new Error("styles takes an array argument");
        }
        newStyleExprs.push(...prop.initializer.elements);
        break;
      case "styleUrls":
        if (!ts44.isArrayLiteralExpression(prop.initializer)) {
          throw new Error("styleUrls takes an array argument");
        }
        newStyleExprs.push(...prop.initializer.elements.map((expr) => {
          if (!ts44.isStringLiteral(expr) && !ts44.isNoSubstitutionTemplateLiteral(expr)) {
            throw new Error("Can only accept string literal arguments to styleUrls. " + PRECONDITIONS_TEXT);
          }
          const styles = loader.get(expr.text);
          return ts44.createLiteral(styles);
        }));
        break;
      case "templateUrl":
        if (!ts44.isStringLiteral(prop.initializer) && !ts44.isNoSubstitutionTemplateLiteral(prop.initializer)) {
          throw new Error("Can only accept a string literal argument to templateUrl. " + PRECONDITIONS_TEXT);
        }
        const template = loader.get(prop.initializer.text);
        newProperties.push(ts44.updatePropertyAssignment(prop, ts44.createIdentifier("template"), ts44.createLiteral(template)));
        break;
      default:
        newProperties.push(prop);
    }
  });
  if (newStyleExprs.length > 0) {
    const newStyles = ts44.createPropertyAssignment(ts44.createIdentifier("styles"), ts44.createArrayLiteral(newStyleExprs));
    newProperties.push(newStyles);
  }
  return ts44.createNodeArray([ts44.updateObjectLiteral(componentArg, newProperties)]);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/lower_expressions.mjs
import { createLoweredSymbol, isLoweredSymbol } from "@angular/compiler";
import ts45 from "typescript";
function toMap(items, select) {
  return new Map(items.map((i) => [select(i), i]));
}
function isLexicalScope(node) {
  switch (node.kind) {
    case ts45.SyntaxKind.ArrowFunction:
    case ts45.SyntaxKind.FunctionExpression:
    case ts45.SyntaxKind.FunctionDeclaration:
    case ts45.SyntaxKind.ClassExpression:
    case ts45.SyntaxKind.ClassDeclaration:
    case ts45.SyntaxKind.FunctionType:
    case ts45.SyntaxKind.TypeLiteral:
    case ts45.SyntaxKind.ArrayType:
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
        const { pos: pos2, end: end2, kind, parent: originalParent } = ts45.getOriginalNode(node2);
        const nodeRequest = requests.get(pos2);
        if (nodeRequest && nodeRequest.kind == kind && nodeRequest.end == end2) {
          if (originalParent && originalParent.kind === ts45.SyntaxKind.VariableDeclaration) {
            const varParent = originalParent;
            if (varParent.name.kind === ts45.SyntaxKind.Identifier) {
              const varName = varParent.name.text;
              const exportName2 = nodeRequest.name;
              declarations.push({
                name: exportName2,
                node: ts45.createIdentifier(varName),
                order: 1
              });
              return node2;
            }
          }
          const exportName = nodeRequest.name;
          declarations.push({ name: exportName, node: node2, order: 0 });
          return ts45.createIdentifier(exportName);
        }
        let result = node2;
        if (shouldVisit(pos2, end2) && !isLexicalScope(node2)) {
          result = ts45.visitEachChild(node2, visitNode, context);
        }
        return result;
      }
      const { pos, end } = ts45.getOriginalNode(node);
      let resultStmt;
      if (shouldVisit(pos, end)) {
        resultStmt = ts45.visitEachChild(node, visitNode, context);
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
      tmpStatements.push(ts45.createExportDeclaration(void 0, void 0, ts45.createNamedExports(inserts.reduce((accumulator, insert) => [...accumulator, ...insert.declarations], []).map((declaration) => ts45.createExportSpecifier(void 0, declaration.name)))));
      newStatements = tmpStatements;
    }
    const newSf = ts45.updateSourceFileNode(sourceFile2, ts45.setTextRange(ts45.createNodeArray(newStatements), sourceFile2.statements));
    if (!(sourceFile2.flags & ts45.NodeFlags.Synthesized)) {
      newSf.flags &= ~ts45.NodeFlags.Synthesized;
    }
    return newSf;
  }
  return visitSourceFile(sourceFile);
}
function createVariableStatementForDeclarations(declarations) {
  const varDecls = declarations.map((i) => ts45.createVariableDeclaration(i.name, void 0, i.node));
  return ts45.createVariableStatement(void 0, ts45.createVariableDeclarationList(varDecls, ts45.NodeFlags.Const));
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
      case ts45.SyntaxKind.SourceFile:
      case ts45.SyntaxKind.Decorator:
        return true;
      case ts45.SyntaxKind.ClassDeclaration:
      case ts45.SyntaxKind.InterfaceDeclaration:
      case ts45.SyntaxKind.EnumDeclaration:
      case ts45.SyntaxKind.FunctionDeclaration:
        return false;
      case ts45.SyntaxKind.VariableDeclaration:
        const isExported3 = (ts45.getCombinedModifierFlags(node) & ts45.ModifierFlags.Export) == 0;
        const varNode = node;
        return isExported3 || varNode.initializer !== void 0 && (ts45.isObjectLiteralExpression(varNode.initializer) || ts45.isArrayLiteralExpression(varNode.initializer) || ts45.isCallExpression(varNode.initializer));
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
  if (node.parent && node.parent.kind == ts45.SyntaxKind.PropertyAssignment) {
    const property = node.parent;
    if (property.parent && property.parent.kind == ts45.SyntaxKind.ObjectLiteralExpression && property.name && property.name.kind == ts45.SyntaxKind.Identifier) {
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
        if (node.kind == ts45.SyntaxKind.Identifier) {
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
      if (node.kind === ts45.SyntaxKind.PropertyAccessExpression) {
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
      if ((node.kind === ts45.SyntaxKind.ArrowFunction || node.kind === ts45.SyntaxKind.FunctionExpression) && isEligibleForLowering(node)) {
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
  ts45.forEachChild(sourceFile, function scan(node) {
    switch (node.kind) {
      case ts45.SyntaxKind.ClassDeclaration:
      case ts45.SyntaxKind.FunctionDeclaration:
      case ts45.SyntaxKind.InterfaceDeclaration:
        if ((ts45.getCombinedModifierFlags(node) & ts45.ModifierFlags.Export) != 0) {
          const classDeclaration = node;
          const name = classDeclaration.name;
          if (name)
            exportTable.add(name.text);
        }
        break;
      case ts45.SyntaxKind.VariableStatement:
        const variableStatement = node;
        for (const declaration of variableStatement.declarationList.declarations) {
          scan(declaration);
        }
        break;
      case ts45.SyntaxKind.VariableDeclaration:
        const variableDeclaration = node;
        if ((ts45.getCombinedModifierFlags(variableDeclaration) & ts45.ModifierFlags.Export) != 0 && variableDeclaration.name.kind == ts45.SyntaxKind.Identifier) {
          const name = variableDeclaration.name;
          exportTable.add(name.text);
        }
        break;
      case ts45.SyntaxKind.ExportDeclaration:
        const exportDeclaration = node;
        const { moduleSpecifier, exportClause } = exportDeclaration;
        if (!moduleSpecifier && exportClause && ts45.isNamedExports(exportClause)) {
          exportClause.elements.forEach((spec) => {
            exportTable.add(spec.name.text);
          });
        }
    }
  });
  return exportTable;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/metadata_cache.mjs
import ts46 from "typescript";
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
    const moduleFile = ts46.isExternalModule(sourceFile);
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
import ts48 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/node_emitter.mjs
import { BinaryOperator, BuiltinMethod, BuiltinVar, ClassStmt, ExternalExpr as ExternalExpr3, Statement, StmtModifier, UnaryOperator } from "@angular/compiler";
import ts47 from "typescript";
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
      const preambleCommentHolder = ts47.createNotEmittedStatement(sourceFile);
      ts47.addSyntheticLeadingComment(preambleCommentHolder, ts47.SyntaxKind.MultiLineCommentTrivia, preamble, true);
      sourceStatements.unshift(preambleCommentHolder);
    }
    converter.updateSourceMap(sourceStatements);
    const newSourceFile = ts47.updateSourceFileNode(sourceFile, sourceStatements);
    return [newSourceFile, converter.getNodeMap()];
  }
};
function updateSourceFile(sourceFile, module, annotateForClosureCompiler) {
  const converter = new NodeEmitterVisitor(annotateForClosureCompiler);
  converter.loadExportedVariableIdentifiers(sourceFile);
  const prefixStatements = module.statements.filter((statement) => !(statement instanceof ClassStmt));
  const classes = module.statements.filter((statement) => statement instanceof ClassStmt);
  const classMap = new Map(classes.map((classStatement) => [classStatement.name, classStatement]));
  const classNames = new Set(classes.map((classStatement) => classStatement.name));
  const prefix = prefixStatements.map((statement) => statement.visitStatement(converter, sourceFile));
  let newStatements = sourceFile.statements.map((node) => {
    if (node.kind == ts47.SyntaxKind.ClassDeclaration) {
      const classDeclaration = node;
      const name = classDeclaration.name;
      if (name) {
        const classStatement = classMap.get(name.text);
        if (classStatement) {
          classNames.delete(name.text);
          const classMemberHolder = converter.visitDeclareClassStmt(classStatement);
          const newMethods = classMemberHolder.members.filter((member) => member.kind !== ts47.SyntaxKind.Constructor);
          const newMembers = [...classDeclaration.members, ...newMethods];
          return ts47.updateClassDeclaration(classDeclaration, classDeclaration.decorators, classDeclaration.modifiers, classDeclaration.name, classDeclaration.typeParameters, classDeclaration.heritageClauses || [], newMembers);
        }
      }
    }
    return node;
  });
  classNames.size == 0 || error(`${classNames.size == 1 ? "Class" : "Classes"} "${Array.from(classNames.keys()).join(", ")}" not generated`);
  const imports = converter.getImports();
  if (imports && imports.length) {
    const index = firstAfter(newStatements, (statement) => statement.kind === ts47.SyntaxKind.ImportDeclaration || statement.kind === ts47.SyntaxKind.ImportEqualsDeclaration);
    newStatements = [...newStatements.slice(0, index), ...imports, ...prefix, ...newStatements.slice(index)];
  } else {
    newStatements = [...prefix, ...newStatements];
  }
  converter.updateSourceMap(newStatements);
  const newSourceFile = ts47.updateSourceFileNode(sourceFile, newStatements);
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
    return ts47.createNull();
  } else if (value === void 0) {
    return ts47.createIdentifier("undefined");
  } else {
    const result = ts47.createLiteral(value);
    if (ts47.isStringLiteral(result) && result.text.indexOf("\\") >= 0) {
      result.kind = ts47.SyntaxKind.NumericLiteral;
      result.text = `"${escapeLiteral(result.text)}"`;
    }
    return result;
  }
}
function isExportTypeStatement(statement) {
  return !!statement.modifiers && statement.modifiers.some((mod) => mod.kind === ts47.SyntaxKind.ExportKeyword);
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
      if (ts47.isVariableStatement(statement) && isExportTypeStatement(statement)) {
        statement.declarationList.declarations.forEach((declaration) => {
          if (ts47.isIdentifier(declaration.name)) {
            this._exportedVariableIdentifiers.set(declaration.name.text, declaration.name);
          }
        });
      }
    });
  }
  getReexports() {
    return Array.from(this._reexports.entries()).map(([exportedFilePath, reexports]) => ts47.createExportDeclaration(void 0, void 0, ts47.createNamedExports(reexports.map(({ name, as }) => ts47.createExportSpecifier(name, as))), createLiteral(exportedFilePath)));
  }
  getImports() {
    return Array.from(this._importsWithPrefixes.entries()).map(([namespace, prefix]) => ts47.createImportDeclaration(void 0, void 0, ts47.createImportClause(void 0, ts47.createNamespaceImport(ts47.createIdentifier(prefix))), createLiteral(namespace)));
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
          ts47.setSourceMapRange(lastRangeEndNode, lastRange);
        } else {
          ts47.setSourceMapRange(lastRangeStartNode, lastRange);
          ts47.setEmitFlags(lastRangeStartNode, ts47.EmitFlags.NoTrailingSourceMap);
          ts47.setSourceMapRange(lastRangeEndNode, lastRange);
          ts47.setEmitFlags(lastRangeEndNode, ts47.EmitFlags.NoLeadingSourceMap);
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
      ts47.forEachChild(tsNode, visitNode);
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
            source = ts47.createSourceMapSource(file.url, file.content, (pos) => pos);
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
    if (stmt.hasModifier(StmtModifier.Exported)) {
      modifiers.push(ts47.createToken(ts47.SyntaxKind.ExportKeyword));
    }
    return modifiers;
  }
  visitDeclareVarStmt(stmt) {
    if (stmt.hasModifier(StmtModifier.Exported) && stmt.value instanceof ExternalExpr3 && !stmt.type) {
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
    const varDeclList = ts47.createVariableDeclarationList([ts47.createVariableDeclaration(ts47.createIdentifier(stmt.name), void 0, stmt.value && stmt.value.visitExpression(this, null) || void 0)]);
    if (stmt.hasModifier(StmtModifier.Exported)) {
      const tsVarStmt = this.postProcess(stmt, ts47.createVariableStatement([], varDeclList));
      const exportStmt = this.postProcess(stmt, ts47.createExportDeclaration(void 0, void 0, ts47.createNamedExports([ts47.createExportSpecifier(stmt.name, stmt.name)])));
      return [tsVarStmt, exportStmt];
    }
    return this.postProcess(stmt, ts47.createVariableStatement(this.getModifiers(stmt), varDeclList));
  }
  visitDeclareFunctionStmt(stmt) {
    return this.postProcess(stmt, ts47.createFunctionDeclaration(void 0, this.getModifiers(stmt), void 0, stmt.name, void 0, stmt.params.map((p) => ts47.createParameter(void 0, void 0, void 0, p.name)), void 0, this._visitStatements(stmt.statements)));
  }
  visitExpressionStmt(stmt) {
    return this.postProcess(stmt, ts47.createStatement(stmt.expr.visitExpression(this, null)));
  }
  visitReturnStmt(stmt) {
    return this.postProcess(stmt, ts47.createReturn(stmt.value ? stmt.value.visitExpression(this, null) : void 0));
  }
  visitDeclareClassStmt(stmt) {
    const modifiers = this.getModifiers(stmt);
    const fields = stmt.fields.map((field) => {
      const property = ts47.createProperty(void 0, translateModifiers(field.modifiers), field.name, void 0, void 0, field.initializer == null ? ts47.createNull() : field.initializer.visitExpression(this, null));
      if (this.annotateForClosureCompiler) {
        ts47.addSyntheticLeadingComment(property, ts47.SyntaxKind.MultiLineCommentTrivia, "* @nocollapse ", false);
      }
      return property;
    });
    const getters = stmt.getters.map((getter) => ts47.createGetAccessor(void 0, void 0, getter.name, [], void 0, this._visitStatements(getter.body)));
    const constructor = stmt.constructorMethod && [ts47.createConstructor(void 0, void 0, stmt.constructorMethod.params.map((p) => ts47.createParameter(void 0, void 0, void 0, p.name)), this._visitStatements(stmt.constructorMethod.body))] || [];
    const methods = stmt.methods.filter((method) => method.name).map((method) => ts47.createMethod(void 0, translateModifiers(method.modifiers), void 0, method.name, void 0, void 0, method.params.map((p) => ts47.createParameter(void 0, void 0, void 0, p.name)), void 0, this._visitStatements(method.body)));
    return this.postProcess(stmt, ts47.createClassDeclaration(void 0, modifiers, stmt.name, void 0, stmt.parent && [ts47.createHeritageClause(ts47.SyntaxKind.ExtendsKeyword, [stmt.parent.visitExpression(this, null)])] || [], [...fields, ...getters, ...constructor, ...methods]));
  }
  visitIfStmt(stmt) {
    return this.postProcess(stmt, ts47.createIf(stmt.condition.visitExpression(this, null), this._visitStatements(stmt.trueCase), stmt.falseCase && stmt.falseCase.length && this._visitStatements(stmt.falseCase) || void 0));
  }
  visitTryCatchStmt(stmt) {
    return this.postProcess(stmt, ts47.createTry(this._visitStatements(stmt.bodyStmts), ts47.createCatchClause(CATCH_ERROR_NAME, this._visitStatementsPrefix([ts47.createVariableStatement(void 0, [ts47.createVariableDeclaration(CATCH_STACK_NAME, void 0, ts47.createPropertyAccess(ts47.createIdentifier(CATCH_ERROR_NAME), ts47.createIdentifier(CATCH_STACK_NAME)))])], stmt.catchStmts)), void 0));
  }
  visitThrowStmt(stmt) {
    return this.postProcess(stmt, ts47.createThrow(stmt.error.visitExpression(this, null)));
  }
  visitWrappedNodeExpr(expr) {
    return this.postProcess(expr, expr.node);
  }
  visitTypeofExpr(expr) {
    const typeOf = ts47.createTypeOf(expr.expr.visitExpression(this, null));
    return this.postProcess(expr, typeOf);
  }
  visitReadVarExpr(expr) {
    switch (expr.builtin) {
      case BuiltinVar.This:
        return this.postProcess(expr, ts47.createIdentifier(METHOD_THIS_NAME));
      case BuiltinVar.CatchError:
        return this.postProcess(expr, ts47.createIdentifier(CATCH_ERROR_NAME));
      case BuiltinVar.CatchStack:
        return this.postProcess(expr, ts47.createIdentifier(CATCH_STACK_NAME));
      case BuiltinVar.Super:
        return this.postProcess(expr, ts47.createSuper());
    }
    if (expr.name) {
      return this.postProcess(expr, ts47.createIdentifier(expr.name));
    }
    throw Error(`Unexpected ReadVarExpr form`);
  }
  visitWriteVarExpr(expr) {
    return this.postProcess(expr, ts47.createAssignment(ts47.createIdentifier(expr.name), expr.value.visitExpression(this, null)));
  }
  visitWriteKeyExpr(expr) {
    return this.postProcess(expr, ts47.createAssignment(ts47.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)), expr.value.visitExpression(this, null)));
  }
  visitWritePropExpr(expr) {
    return this.postProcess(expr, ts47.createAssignment(ts47.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name), expr.value.visitExpression(this, null)));
  }
  visitInvokeFunctionExpr(expr) {
    return this.postProcess(expr, ts47.createCall(expr.fn.visitExpression(this, null), void 0, expr.args.map((arg) => arg.visitExpression(this, null))));
  }
  visitTaggedTemplateExpr(expr) {
    throw new Error("tagged templates are not supported in pre-ivy mode.");
  }
  visitInstantiateExpr(expr) {
    return this.postProcess(expr, ts47.createNew(expr.classExpr.visitExpression(this, null), void 0, expr.args.map((arg) => arg.visitExpression(this, null))));
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
    return this.postProcess(expr, ts47.createParen(ts47.createConditional(expr.condition.visitExpression(this, null), expr.trueCase.visitExpression(this, null), expr.falseCase.visitExpression(this, null))));
  }
  visitNotExpr(expr) {
    return this.postProcess(expr, ts47.createPrefix(ts47.SyntaxKind.ExclamationToken, expr.condition.visitExpression(this, null)));
  }
  visitAssertNotNullExpr(expr) {
    return expr.condition.visitExpression(this, null);
  }
  visitCastExpr(expr) {
    return expr.value.visitExpression(this, null);
  }
  visitFunctionExpr(expr) {
    return this.postProcess(expr, ts47.createFunctionExpression(void 0, void 0, expr.name || void 0, void 0, expr.params.map((p) => ts47.createParameter(void 0, void 0, void 0, p.name)), void 0, this._visitStatements(expr.statements)));
  }
  visitUnaryOperatorExpr(expr) {
    let unaryOperator;
    switch (expr.operator) {
      case UnaryOperator.Minus:
        unaryOperator = ts47.SyntaxKind.MinusToken;
        break;
      case UnaryOperator.Plus:
        unaryOperator = ts47.SyntaxKind.PlusToken;
        break;
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
    const binary = ts47.createPrefix(unaryOperator, expr.expr.visitExpression(this, null));
    return this.postProcess(expr, expr.parens ? ts47.createParen(binary) : binary);
  }
  visitBinaryOperatorExpr(expr) {
    let binaryOperator;
    switch (expr.operator) {
      case BinaryOperator.And:
        binaryOperator = ts47.SyntaxKind.AmpersandAmpersandToken;
        break;
      case BinaryOperator.BitwiseAnd:
        binaryOperator = ts47.SyntaxKind.AmpersandToken;
        break;
      case BinaryOperator.Bigger:
        binaryOperator = ts47.SyntaxKind.GreaterThanToken;
        break;
      case BinaryOperator.BiggerEquals:
        binaryOperator = ts47.SyntaxKind.GreaterThanEqualsToken;
        break;
      case BinaryOperator.Divide:
        binaryOperator = ts47.SyntaxKind.SlashToken;
        break;
      case BinaryOperator.Equals:
        binaryOperator = ts47.SyntaxKind.EqualsEqualsToken;
        break;
      case BinaryOperator.Identical:
        binaryOperator = ts47.SyntaxKind.EqualsEqualsEqualsToken;
        break;
      case BinaryOperator.Lower:
        binaryOperator = ts47.SyntaxKind.LessThanToken;
        break;
      case BinaryOperator.LowerEquals:
        binaryOperator = ts47.SyntaxKind.LessThanEqualsToken;
        break;
      case BinaryOperator.Minus:
        binaryOperator = ts47.SyntaxKind.MinusToken;
        break;
      case BinaryOperator.Modulo:
        binaryOperator = ts47.SyntaxKind.PercentToken;
        break;
      case BinaryOperator.Multiply:
        binaryOperator = ts47.SyntaxKind.AsteriskToken;
        break;
      case BinaryOperator.NotEquals:
        binaryOperator = ts47.SyntaxKind.ExclamationEqualsToken;
        break;
      case BinaryOperator.NotIdentical:
        binaryOperator = ts47.SyntaxKind.ExclamationEqualsEqualsToken;
        break;
      case BinaryOperator.Or:
        binaryOperator = ts47.SyntaxKind.BarBarToken;
        break;
      case BinaryOperator.NullishCoalesce:
        binaryOperator = ts47.SyntaxKind.QuestionQuestionToken;
        break;
      case BinaryOperator.Plus:
        binaryOperator = ts47.SyntaxKind.PlusToken;
        break;
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
    const binary = ts47.createBinary(expr.lhs.visitExpression(this, null), binaryOperator, expr.rhs.visitExpression(this, null));
    return this.postProcess(expr, expr.parens ? ts47.createParen(binary) : binary);
  }
  visitReadPropExpr(expr) {
    return this.postProcess(expr, ts47.createPropertyAccess(expr.receiver.visitExpression(this, null), expr.name));
  }
  visitReadKeyExpr(expr) {
    return this.postProcess(expr, ts47.createElementAccess(expr.receiver.visitExpression(this, null), expr.index.visitExpression(this, null)));
  }
  visitLiteralArrayExpr(expr) {
    return this.postProcess(expr, ts47.createArrayLiteral(expr.entries.map((entry) => entry.visitExpression(this, null))));
  }
  visitLiteralMapExpr(expr) {
    return this.postProcess(expr, ts47.createObjectLiteral(expr.entries.map((entry) => ts47.createPropertyAssignment(entry.quoted || !_VALID_IDENTIFIER_RE.test(entry.key) ? ts47.createLiteral(entry.key) : entry.key, entry.value.visitExpression(this, null)))));
  }
  visitCommaExpr(expr) {
    return this.postProcess(expr, expr.parts.map((e) => e.visitExpression(this, null)).reduce((left, right) => left ? ts47.createBinary(left, ts47.SyntaxKind.CommaToken, right) : right, null));
  }
  _visitStatements(statements) {
    return this._visitStatementsPrefix([], statements);
  }
  _visitStatementsPrefix(prefix, statements) {
    return ts47.createBlock([
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
      prefixIdent = ts47.createIdentifier(prefix);
    }
    if (prefixIdent) {
      return ts47.createPropertyAccess(prefixIdent, name);
    } else {
      const id = ts47.createIdentifier(name);
      if (this._exportedVariableIdentifiers.has(name)) {
        ts47.setOriginalNode(id, this._exportedVariableIdentifiers.get(name));
      }
      return id;
    }
  }
};
function modifierFromModifier(modifier) {
  switch (modifier) {
    case StmtModifier.Exported:
      return ts47.createToken(ts47.SyntaxKind.ExportKeyword);
    case StmtModifier.Final:
      return ts47.createToken(ts47.SyntaxKind.ConstKeyword);
    case StmtModifier.Private:
      return ts47.createToken(ts47.SyntaxKind.PrivateKeyword);
    case StmtModifier.Static:
      return ts47.createToken(ts47.SyntaxKind.StaticKeyword);
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
        const commentStmt = ts48.createNotEmittedStatement(sourceFile);
        ts48.addSyntheticLeadingComment(commentStmt, ts48.SyntaxKind.MultiLineCommentTrivia, preamble, true);
        return ts48.updateSourceFileNode(sourceFile, [commentStmt]);
      }
      return sourceFile;
    };
  };
}
function getFileoverviewComment2(sourceFile) {
  const trivia = sourceFile.getFullText().substring(0, sourceFile.getStart());
  const leadingComments = ts48.getLeadingCommentRanges(trivia, 0);
  if (!leadingComments || leadingComments.length === 0)
    return "";
  const comment = leadingComments[0];
  if (comment.kind !== ts48.SyntaxKind.MultiLineCommentTrivia)
    return "";
  if (sourceFile.getFullText().substring(comment.end, comment.end + 2) !== "\n\n")
    return "";
  const commentText = sourceFile.getFullText().substring(comment.pos, comment.end);
  if (commentText.indexOf("@license") !== -1)
    return "";
  return stripComment(commentText).replace(/^\*\s+/, "");
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/transformers/r3_metadata_transform.mjs
import { ClassStmt as ClassStmt2, StmtModifier as StmtModifier2 } from "@angular/compiler";
import ts49 from "typescript";
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
          if (isClassMetadata(value) && node.kind === ts49.SyntaxKind.ClassDeclaration) {
            const classDeclaration = node;
            if (classDeclaration.name) {
              const partialClass = classMap.get(classDeclaration.name.text);
              if (partialClass) {
                for (const field of partialClass.fields) {
                  if (field.name && field.modifiers && field.modifiers.some((modifier) => modifier === StmtModifier2.Static)) {
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
      const module = moduleMap.get(sourceFile.fileName);
      if (module && module.statements.length > 0) {
        const [newSourceFile] = updateSourceFile(sourceFile, module, annotateForClosureCompiler);
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
    const tmpProgram = ts50.createProgram(rootNames, this.options, this.hostAdapter, oldTsProgram);
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
    this._tsProgram = ts50.createProgram(rootNames, this.options, this.hostAdapter, tmpProgram);
    if (tsStructureIsReused(this._tsProgram) !== 2) {
      throw new Error(`Internal Error: The structure of the program changed during codegen.`);
    }
  }
  _createProgramOnError(e) {
    this._analyzedModules = emptyModules;
    this.oldTsProgram = void 0;
    this._hostAdapter.isSourceFile = () => false;
    this._tsProgram = ts50.createProgram(this.rootNames, this.options, this.hostAdapter);
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
        category: ts50.DiagnosticCategory.Error,
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
          category: ts50.DiagnosticCategory.Error,
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
    translations = readFileSync(options.i18nInFile, "utf8");
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
          category: ts50.DiagnosticCategory.Error,
          source: SOURCE,
          code: DEFAULT_ERROR_CODE
        }];
    }
  }
  return [];
}
function normalizeSeparators2(path7) {
  return path7.replace(/\\/g, "/");
}
function createSrcToOutPathMapper(outDir, sampleSrcFileName, sampleOutFileName, host = path6) {
  if (outDir) {
    let path7 = {};
    if (sampleSrcFileName == null || sampleOutFileName == null) {
      throw new Error(`Can't calculate the rootDir without a sample srcFileName / outFileName. `);
    }
    const srcFileDir = normalizeSeparators2(host.dirname(sampleSrcFileName));
    const outFileDir = normalizeSeparators2(host.dirname(sampleOutFileName));
    if (srcFileDir === outFileDir) {
      return (srcFileName) => srcFileName;
    }
    const srcDirParts = srcFileDir.split("/");
    const outDirParts = normalizeSeparators2(host.relative(outDir, outFileDir)).split("/");
    let i = 0;
    while (i < Math.min(srcDirParts.length, outDirParts.length) && srcDirParts[srcDirParts.length - 1 - i] === outDirParts[outDirParts.length - 1 - i])
      i++;
    const rootDir = srcDirParts.slice(0, srcDirParts.length - i).join("/");
    return (srcFileName) => {
      return normalizeSeparators2(host.resolve(outDir, host.relative(rootDir, srcFileName)));
    };
  } else {
    return (srcFileName) => normalizeSeparators2(srcFileName);
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
      category: ts50.DiagnosticCategory.Error,
      source: SOURCE,
      code: DEFAULT_ERROR_CODE
    }));
  } else if (isFormattedError(error2)) {
    return [{
      messageText: error2.message,
      chain: error2.chain && diagnosticChainFromFormattedDiagnosticChain(error2.chain),
      category: ts50.DiagnosticCategory.Error,
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
        category: ts50.DiagnosticCategory.Error,
        code: DEFAULT_ERROR_CODE,
        source: SOURCE
      }];
    }
  }
  return [{
    messageText: error2.message,
    category: ts50.DiagnosticCategory.Error,
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
    if (!ts50.isClassDeclaration(stmt)) {
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
    if (!ts50.isPropertyDeclaration(member)) {
      continue;
    }
    if (ts50.isIdentifier(member.name) && member.name.text === "\u0275mod") {
      return true;
    }
  }
  return false;
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/perform_compile.mjs
import { isSyntaxError as isSyntaxError2 } from "@angular/compiler";
import ts51 from "typescript";
var defaultFormatHost = {
  getCurrentDirectory: () => ts51.sys.getCurrentDirectory(),
  getCanonicalFileName: (fileName) => fileName,
  getNewLine: () => ts51.sys.newLine
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
        return replaceTsWithNgInErrors(ts51.formatDiagnosticsWithColorAndContext([diagnostic], host));
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
    const fs3 = getFileSystem();
    const readConfigFile = (configFile) => ts51.readConfigFile(configFile, (file) => host.readFile(host.resolve(file)));
    const readAngularCompilerOptions = (configFile, parentOptions = {}) => {
      const { config: config2, error: error3 } = readConfigFile(configFile);
      if (error3) {
        return parentOptions;
      }
      const existingNgCompilerOptions = __spreadValues(__spreadValues({}, config2.angularCompilerOptions), parentOptions);
      if (config2.extends && typeof config2.extends === "string") {
        const extendedConfigPath = getExtendedConfigPath(configFile, config2.extends, host, fs3);
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
    const parseConfigHost = createParseConfigHost(host, fs3);
    const { options, errors, fileNames: rootNames, projectReferences } = ts51.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingCompilerOptions, configFileName);
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
      category: ts51.DiagnosticCategory.Error,
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
function createParseConfigHost(host, fs3 = getFileSystem()) {
  return {
    fileExists: host.exists.bind(host),
    readDirectory: ts51.sys.readDirectory,
    readFile: host.readFile.bind(host),
    useCaseSensitiveFileNames: fs3.isCaseSensitive()
  };
}
function getExtendedConfigPath(configFile, extendsValue, host, fs3) {
  const result = getExtendedConfigPathWorker(configFile, extendsValue, host, fs3);
  if (result !== null) {
    return result;
  }
  return getExtendedConfigPathWorker(configFile, `${extendsValue}.json`, host, fs3);
}
function getExtendedConfigPathWorker(configFile, extendsValue, host, fs3) {
  if (extendsValue.startsWith(".") || fs3.isRooted(extendsValue)) {
    const extendedConfigPath = host.resolve(host.dirname(configFile), extendsValue);
    if (host.exists(extendedConfigPath)) {
      return extendedConfigPath;
    }
  } else {
    const parseConfigHost = createParseConfigHost(host, fs3);
    const { resolvedModule } = ts51.nodeModuleNameResolver(extendsValue, configFile, { moduleResolution: ts51.ModuleResolutionKind.NodeJs, resolveJsonModule: true }, parseConfigHost);
    if (resolvedModule) {
      return absoluteFrom(resolvedModule.resolvedFileName);
    }
  }
  return null;
}
function exitCodeFromResult(diags) {
  if (!diags)
    return 0;
  if (diags.every((diag) => diag.category !== ts51.DiagnosticCategory.Error)) {
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
    allDiagnostics.push({ category: ts51.DiagnosticCategory.Error, messageText: errMsg, code, source: SOURCE });
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
  return diags.some((d) => d.category === ts51.DiagnosticCategory.Error);
}

export {
  METADATA_VERSION,
  isModuleMetadata,
  isClassMetadata,
  isInterfaceMetadata,
  isMemberMetadata,
  isMethodMetadata,
  isConstructorMetadata,
  isFunctionMetadata,
  isMetadataSymbolicExpression,
  isMetadataSymbolicBinaryExpression,
  isMetadataSymbolicIndexExpression,
  isMetadataSymbolicCallExpression,
  isMetadataSymbolicPrefixExpression,
  isMetadataSymbolicIfExpression,
  isMetadataGlobalReferenceExpression,
  isMetadataModuleReferenceExpression,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataImportDefaultReference,
  isMetadataSymbolicReferenceExpression,
  isMetadataSymbolicSelectExpression,
  isMetadataSymbolicSpreadExpression,
  isMetadataError,
  MetadataCollector,
  createBundleIndexHost,
  DEFAULT_ERROR_CODE,
  UNKNOWN_ERROR_CODE,
  SOURCE,
  isTsDiagnostic,
  isNgDiagnostic,
  EmitFlags,
  GENERATED_FILES,
  createMessageDiagnostic,
  ngToTsDiagnostic,
  createCompilerHost,
  CycleAnalyzer,
  ImportGraph,
  untagAllTsFiles,
  TsCreateProgramDriver,
  PatchedProgramIncrementalBuildStrategy,
  MetadataDtsModuleScopeResolver,
  LocalModuleScopeRegistry,
  TypeCheckScopeRegistry,
  OptimizeFor,
  freshCompilationTicket,
  incrementalFromStateTicket,
  NgCompiler,
  NgCompilerHost,
  NgtscProgram,
  createProgram,
  formatDiagnosticPosition,
  flattenDiagnosticMessageChain,
  formatDiagnostic,
  formatDiagnostics,
  calcProjectFileAndBasePath,
  readConfiguration,
  exitCodeFromResult,
  performCompilation,
  defaultGatherDiagnostics
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Closure Compiler ignores @suppress and similar if the comment contains @license.
//# sourceMappingURL=chunk-LS3MUQ6Q.js.map
