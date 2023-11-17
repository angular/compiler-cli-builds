
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
    
import {
  ImportFlags,
  NoopImportRewriter,
  Reference,
  assertSuccessfulReferenceEmit
} from "./chunk-J72CGISC.js";

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
import * as o from "@angular/compiler";
var UNARY_OPERATORS = /* @__PURE__ */ new Map([
  [o.UnaryOperator.Minus, "-"],
  [o.UnaryOperator.Plus, "+"]
]);
var BINARY_OPERATORS = /* @__PURE__ */ new Map([
  [o.BinaryOperator.And, "&&"],
  [o.BinaryOperator.Bigger, ">"],
  [o.BinaryOperator.BiggerEquals, ">="],
  [o.BinaryOperator.BitwiseAnd, "&"],
  [o.BinaryOperator.Divide, "/"],
  [o.BinaryOperator.Equals, "=="],
  [o.BinaryOperator.Identical, "==="],
  [o.BinaryOperator.Lower, "<"],
  [o.BinaryOperator.LowerEquals, "<="],
  [o.BinaryOperator.Minus, "-"],
  [o.BinaryOperator.Modulo, "%"],
  [o.BinaryOperator.Multiply, "*"],
  [o.BinaryOperator.NotEquals, "!="],
  [o.BinaryOperator.NotIdentical, "!=="],
  [o.BinaryOperator.Or, "||"],
  [o.BinaryOperator.Plus, "+"],
  [o.BinaryOperator.NullishCoalesce, "??"]
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
    const varType = this.downlevelVariableDeclarations ? "var" : stmt.hasModifier(o.StmtModifier.Final) ? "const" : "let";
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
  visitIfStmt(stmt, context) {
    return this.attachComments(this.factory.createIfStatement(stmt.condition.visitExpression(this, context), this.factory.createBlock(this.visitStatements(stmt.trueCase, context.withStatementMode)), stmt.falseCase.length > 0 ? this.factory.createBlock(this.visitStatements(stmt.falseCase, context.withStatementMode)) : null), stmt.leadingComments);
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
    const templateHelperCall = this.factory.createCallExpression(
      __makeTemplateObjectHelper,
      [this.factory.createArrayLiteral(cooked), this.factory.createArrayLiteral(raw)],
      false
    );
    return this.factory.createCallExpression(
      tagHandler,
      [templateHelperCall, ...expressions],
      false
    );
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
    if (ast.condition instanceof o.ConditionalExpr) {
      cond = this.factory.createParenthesizedExpression(cond);
    }
    return this.factory.createConditional(cond, ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context));
  }
  visitDynamicImportExpr(ast, context) {
    return this.factory.createDynamicImport(ast.url);
  }
  visitNotExpr(ast, context) {
    return this.factory.createUnaryExpression("!", ast.condition.visitExpression(this, context));
  }
  visitFunctionExpr(ast, context) {
    var _a;
    return this.factory.createFunctionExpression((_a = ast.name) != null ? _a : null, ast.params.map((param) => param.name), this.factory.createBlock(this.visitStatements(ast.statements, context)));
  }
  visitArrowFunctionExpr(ast, context) {
    return this.factory.createArrowFunctionExpression(ast.params.map((param) => param.name), Array.isArray(ast.body) ? this.factory.createBlock(this.visitStatements(ast.body, context)) : ast.body.visitExpression(this, context));
  }
  visitBinaryOperatorExpr(ast, context) {
    if (!BINARY_OPERATORS.has(ast.operator)) {
      throw new Error(`Unknown binary operator: ${o.BinaryOperator[ast.operator]}`);
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
      throw new Error(`Unknown unary operator: ${o.UnaryOperator[ast.operator]}`);
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
import ts from "typescript";
var ImportManager = class {
  constructor(rewriter = new NoopImportRewriter(), prefix = "i") {
    this.rewriter = rewriter;
    this.prefix = prefix;
    this.specifierToIdentifier = /* @__PURE__ */ new Map();
    this.nextIndex = 0;
  }
  generateNamespaceImport(moduleName) {
    if (!this.specifierToIdentifier.has(moduleName)) {
      this.specifierToIdentifier.set(moduleName, ts.factory.createIdentifier(`${this.prefix}${this.nextIndex++}`));
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

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_emitter.mjs
import ts2 from "typescript";
var INELIGIBLE = {};
function canEmitType(type, canEmit) {
  return canEmitTypeWorker(type);
  function canEmitTypeWorker(type2) {
    return visitNode(type2) !== INELIGIBLE;
  }
  function visitNode(node) {
    if (ts2.isImportTypeNode(node)) {
      return INELIGIBLE;
    }
    if (ts2.isTypeReferenceNode(node) && !canEmitTypeReference(node)) {
      return INELIGIBLE;
    } else {
      return ts2.forEachChild(node, visitNode);
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
  constructor(translator) {
    this.translator = translator;
  }
  emitType(type) {
    const typeReferenceTransformer = (context) => {
      const visitNode = (node) => {
        if (ts2.isImportTypeNode(node)) {
          throw new Error("Unable to emit import type");
        }
        if (ts2.isTypeReferenceNode(node)) {
          return this.emitTypeReference(node);
        } else if (ts2.isLiteralExpression(node)) {
          let clone;
          if (ts2.isStringLiteral(node)) {
            clone = ts2.factory.createStringLiteral(node.text);
          } else if (ts2.isNumericLiteral(node)) {
            clone = ts2.factory.createNumericLiteral(node.text);
          } else if (ts2.isBigIntLiteral(node)) {
            clone = ts2.factory.createBigIntLiteral(node.text);
          } else if (ts2.isNoSubstitutionTemplateLiteral(node)) {
            clone = ts2.factory.createNoSubstitutionTemplateLiteral(node.text, node.rawText);
          } else if (ts2.isRegularExpressionLiteral(node)) {
            clone = ts2.factory.createRegularExpressionLiteral(node.text);
          } else {
            throw new Error(`Unsupported literal kind ${ts2.SyntaxKind[node.kind]}`);
          }
          ts2.setTextRange(clone, { pos: -1, end: -1 });
          return clone;
        } else {
          return ts2.visitEachChild(node, visitNode, context);
        }
      };
      return (node) => ts2.visitNode(node, visitNode, ts2.isTypeNode);
    };
    return ts2.transform(type, [typeReferenceTransformer]).transformed[0];
  }
  emitTypeReference(type) {
    const translatedType = this.translator(type);
    if (translatedType === null) {
      throw new Error("Unable to emit an unresolved reference");
    }
    let typeArguments = void 0;
    if (type.typeArguments !== void 0) {
      typeArguments = ts2.factory.createNodeArray(type.typeArguments.map((typeArg) => this.emitType(typeArg)));
    }
    return ts2.factory.updateTypeReferenceNode(type, translatedType.typeName, typeArguments);
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_translator.mjs
import * as o2 from "@angular/compiler";
import ts4 from "typescript";

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/ts_util.mjs
import ts3 from "typescript";
function tsNumericExpression(value) {
  if (value < 0) {
    const operand = ts3.factory.createNumericLiteral(Math.abs(value));
    return ts3.factory.createPrefixUnaryExpression(ts3.SyntaxKind.MinusToken, operand);
  }
  return ts3.factory.createNumericLiteral(value);
}

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/type_translator.mjs
function translateType(type, contextFile, reflector, refEmitter, imports) {
  return type.visitType(new TypeTranslatorVisitor(imports, contextFile, reflector, refEmitter), new Context(false));
}
var TypeTranslatorVisitor = class {
  constructor(imports, contextFile, reflector, refEmitter) {
    this.imports = imports;
    this.contextFile = contextFile;
    this.reflector = reflector;
    this.refEmitter = refEmitter;
  }
  visitBuiltinType(type, context) {
    switch (type.name) {
      case o2.BuiltinTypeName.Bool:
        return ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.BooleanKeyword);
      case o2.BuiltinTypeName.Dynamic:
        return ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.AnyKeyword);
      case o2.BuiltinTypeName.Int:
      case o2.BuiltinTypeName.Number:
        return ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.NumberKeyword);
      case o2.BuiltinTypeName.String:
        return ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.StringKeyword);
      case o2.BuiltinTypeName.None:
        return ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.NeverKeyword);
      default:
        throw new Error(`Unsupported builtin type: ${o2.BuiltinTypeName[type.name]}`);
    }
  }
  visitExpressionType(type, context) {
    const typeNode = this.translateExpression(type.value, context);
    if (type.typeParams === null) {
      return typeNode;
    }
    if (!ts4.isTypeReferenceNode(typeNode)) {
      throw new Error("An ExpressionType with type arguments must translate into a TypeReferenceNode");
    } else if (typeNode.typeArguments !== void 0) {
      throw new Error(`An ExpressionType with type arguments cannot have multiple levels of type arguments`);
    }
    const typeArgs = type.typeParams.map((param) => this.translateType(param, context));
    return ts4.factory.createTypeReferenceNode(typeNode.typeName, typeArgs);
  }
  visitArrayType(type, context) {
    return ts4.factory.createArrayTypeNode(this.translateType(type.of, context));
  }
  visitMapType(type, context) {
    const parameter = ts4.factory.createParameterDeclaration(void 0, void 0, "key", void 0, ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.StringKeyword));
    const typeArgs = type.valueType !== null ? this.translateType(type.valueType, context) : ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.UnknownKeyword);
    const indexSignature = ts4.factory.createIndexSignature(void 0, [parameter], typeArgs);
    return ts4.factory.createTypeLiteralNode([indexSignature]);
  }
  visitTransplantedType(ast, context) {
    const node = ast.type instanceof Reference ? ast.type.node : ast.type;
    if (!ts4.isTypeNode(node)) {
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
    return ts4.factory.createTypeQueryNode(ts4.factory.createIdentifier(ast.name));
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
      return ts4.factory.createLiteralTypeNode(ts4.factory.createNull());
    } else if (ast.value === void 0) {
      return ts4.factory.createKeywordTypeNode(ts4.SyntaxKind.UndefinedKeyword);
    } else if (typeof ast.value === "boolean") {
      return ts4.factory.createLiteralTypeNode(ast.value ? ts4.factory.createTrue() : ts4.factory.createFalse());
    } else if (typeof ast.value === "number") {
      return ts4.factory.createLiteralTypeNode(tsNumericExpression(ast.value));
    } else {
      return ts4.factory.createLiteralTypeNode(ts4.factory.createStringLiteral(ast.value));
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
    const symbolIdentifier = ts4.factory.createIdentifier(symbol);
    const typeName = moduleImport ? ts4.factory.createQualifiedName(moduleImport, symbolIdentifier) : symbolIdentifier;
    const typeArguments = ast.typeParams !== null ? ast.typeParams.map((type) => this.translateType(type, context)) : void 0;
    return ts4.factory.createTypeReferenceNode(typeName, typeArguments);
  }
  visitConditionalExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitDynamicImportExpr(ast, context) {
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
    return ts4.factory.createTupleTypeNode(values);
  }
  visitLiteralMapExpr(ast, context) {
    const entries = ast.entries.map((entry) => {
      const { key, quoted } = entry;
      const type = this.translateExpression(entry.value, context);
      return ts4.factory.createPropertySignature(
        void 0,
        quoted ? ts4.factory.createStringLiteral(key) : key,
        void 0,
        type
      );
    });
    return ts4.factory.createTypeLiteralNode(entries);
  }
  visitCommaExpr(ast, context) {
    throw new Error("Method not implemented.");
  }
  visitWrappedNodeExpr(ast, context) {
    const node = ast.node;
    if (ts4.isEntityName(node)) {
      return ts4.factory.createTypeReferenceNode(node, void 0);
    } else if (ts4.isTypeNode(node)) {
      return node;
    } else if (ts4.isLiteralExpression(node)) {
      return ts4.factory.createLiteralTypeNode(node);
    } else {
      throw new Error(`Unsupported WrappedNodeExpr in TypeTranslatorVisitor: ${ts4.SyntaxKind[node.kind]}`);
    }
  }
  visitTypeofExpr(ast, context) {
    const typeNode = this.translateExpression(ast.expr, context);
    if (!ts4.isTypeReferenceNode(typeNode)) {
      throw new Error(`The target of a typeof expression must be a type reference, but it was
          ${ts4.SyntaxKind[typeNode.kind]}`);
    }
    return ts4.factory.createTypeQueryNode(typeNode.typeName);
  }
  translateType(type, context) {
    const typeNode = type.visitType(this, context);
    if (!ts4.isTypeNode(typeNode)) {
      throw new Error(`A Type must translate to a TypeNode, but was ${ts4.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateExpression(expr, context) {
    const typeNode = expr.visitExpression(this, context);
    if (!ts4.isTypeNode(typeNode)) {
      throw new Error(`An Expression must translate to a TypeNode, but was ${ts4.SyntaxKind[typeNode.kind]}`);
    }
    return typeNode;
  }
  translateTypeReference(type, context, viaModule) {
    const target = ts4.isIdentifier(type.typeName) ? type.typeName : type.typeName.right;
    const declaration = this.reflector.getDeclarationOfIdentifier(target);
    if (declaration === null) {
      throw new Error(`Unable to statically determine the declaration file of type node ${target.text}`);
    }
    let owningModule = viaModule;
    if (declaration.viaModule !== null) {
      owningModule = {
        specifier: declaration.viaModule,
        resolutionContext: type.getSourceFile().fileName
      };
    }
    const reference = new Reference(declaration.node, owningModule);
    const emittedType = this.refEmitter.emit(reference, this.contextFile, ImportFlags.NoAliasing | ImportFlags.AllowTypeImports);
    assertSuccessfulReferenceEmit(emittedType, target, "type");
    const typeNode = this.translateExpression(emittedType.expression, context);
    if (!ts4.isTypeReferenceNode(typeNode)) {
      throw new Error(`Expected TypeReferenceNode for emitted reference, got ${ts4.SyntaxKind[typeNode.kind]}.`);
    }
    return typeNode;
  }
};

// bazel-out/k8-fastbuild/bin/packages/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory.mjs
import ts5 from "typescript";
var PureAnnotation;
(function(PureAnnotation2) {
  PureAnnotation2["CLOSURE"] = "* @pureOrBreakMyCode ";
  PureAnnotation2["TERSER"] = "@__PURE__";
})(PureAnnotation || (PureAnnotation = {}));
var UNARY_OPERATORS2 = {
  "+": ts5.SyntaxKind.PlusToken,
  "-": ts5.SyntaxKind.MinusToken,
  "!": ts5.SyntaxKind.ExclamationToken
};
var BINARY_OPERATORS2 = {
  "&&": ts5.SyntaxKind.AmpersandAmpersandToken,
  ">": ts5.SyntaxKind.GreaterThanToken,
  ">=": ts5.SyntaxKind.GreaterThanEqualsToken,
  "&": ts5.SyntaxKind.AmpersandToken,
  "/": ts5.SyntaxKind.SlashToken,
  "==": ts5.SyntaxKind.EqualsEqualsToken,
  "===": ts5.SyntaxKind.EqualsEqualsEqualsToken,
  "<": ts5.SyntaxKind.LessThanToken,
  "<=": ts5.SyntaxKind.LessThanEqualsToken,
  "-": ts5.SyntaxKind.MinusToken,
  "%": ts5.SyntaxKind.PercentToken,
  "*": ts5.SyntaxKind.AsteriskToken,
  "!=": ts5.SyntaxKind.ExclamationEqualsToken,
  "!==": ts5.SyntaxKind.ExclamationEqualsEqualsToken,
  "||": ts5.SyntaxKind.BarBarToken,
  "+": ts5.SyntaxKind.PlusToken,
  "??": ts5.SyntaxKind.QuestionQuestionToken
};
var VAR_TYPES = {
  "const": ts5.NodeFlags.Const,
  "let": ts5.NodeFlags.Let,
  "var": ts5.NodeFlags.None
};
var TypeScriptAstFactory = class {
  constructor(annotateForClosureCompiler) {
    this.annotateForClosureCompiler = annotateForClosureCompiler;
    this.externalSourceFiles = /* @__PURE__ */ new Map();
    this.attachComments = attachComments;
    this.createArrayLiteral = ts5.factory.createArrayLiteralExpression;
    this.createElementAccess = ts5.factory.createElementAccessExpression;
    this.createExpressionStatement = ts5.factory.createExpressionStatement;
    this.createIdentifier = ts5.factory.createIdentifier;
    this.createParenthesizedExpression = ts5.factory.createParenthesizedExpression;
    this.createPropertyAccess = ts5.factory.createPropertyAccessExpression;
    this.createThrowStatement = ts5.factory.createThrowStatement;
    this.createTypeOfExpression = ts5.factory.createTypeOfExpression;
  }
  createAssignment(target, value) {
    return ts5.factory.createBinaryExpression(target, ts5.SyntaxKind.EqualsToken, value);
  }
  createBinaryExpression(leftOperand, operator, rightOperand) {
    return ts5.factory.createBinaryExpression(leftOperand, BINARY_OPERATORS2[operator], rightOperand);
  }
  createBlock(body) {
    return ts5.factory.createBlock(body);
  }
  createCallExpression(callee, args, pure) {
    const call = ts5.factory.createCallExpression(callee, void 0, args);
    if (pure) {
      ts5.addSyntheticLeadingComment(
        call,
        ts5.SyntaxKind.MultiLineCommentTrivia,
        this.annotateForClosureCompiler ? PureAnnotation.CLOSURE : PureAnnotation.TERSER,
        false
      );
    }
    return call;
  }
  createConditional(condition, whenTrue, whenFalse) {
    return ts5.factory.createConditionalExpression(condition, void 0, whenTrue, void 0, whenFalse);
  }
  createDynamicImport(url) {
    return ts5.factory.createCallExpression(
      ts5.factory.createToken(ts5.SyntaxKind.ImportKeyword),
      void 0,
      [ts5.factory.createStringLiteral(url)]
    );
  }
  createFunctionDeclaration(functionName, parameters, body) {
    if (!ts5.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts5.SyntaxKind[body.kind]}.`);
    }
    return ts5.factory.createFunctionDeclaration(void 0, void 0, functionName, void 0, parameters.map((param) => ts5.factory.createParameterDeclaration(void 0, void 0, param)), void 0, body);
  }
  createFunctionExpression(functionName, parameters, body) {
    if (!ts5.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts5.SyntaxKind[body.kind]}.`);
    }
    return ts5.factory.createFunctionExpression(void 0, void 0, functionName != null ? functionName : void 0, void 0, parameters.map((param) => ts5.factory.createParameterDeclaration(void 0, void 0, param)), void 0, body);
  }
  createArrowFunctionExpression(parameters, body) {
    if (ts5.isStatement(body) && !ts5.isBlock(body)) {
      throw new Error(`Invalid syntax, expected a block, but got ${ts5.SyntaxKind[body.kind]}.`);
    }
    return ts5.factory.createArrowFunction(void 0, void 0, parameters.map((param) => ts5.factory.createParameterDeclaration(void 0, void 0, param)), void 0, void 0, body);
  }
  createIfStatement(condition, thenStatement, elseStatement) {
    return ts5.factory.createIfStatement(condition, thenStatement, elseStatement != null ? elseStatement : void 0);
  }
  createLiteral(value) {
    if (value === void 0) {
      return ts5.factory.createIdentifier("undefined");
    } else if (value === null) {
      return ts5.factory.createNull();
    } else if (typeof value === "boolean") {
      return value ? ts5.factory.createTrue() : ts5.factory.createFalse();
    } else if (typeof value === "number") {
      return tsNumericExpression(value);
    } else {
      return ts5.factory.createStringLiteral(value);
    }
  }
  createNewExpression(expression, args) {
    return ts5.factory.createNewExpression(expression, void 0, args);
  }
  createObjectLiteral(properties) {
    return ts5.factory.createObjectLiteralExpression(properties.map((prop) => ts5.factory.createPropertyAssignment(prop.quoted ? ts5.factory.createStringLiteral(prop.propertyName) : ts5.factory.createIdentifier(prop.propertyName), prop.value)));
  }
  createReturnStatement(expression) {
    return ts5.factory.createReturnStatement(expression != null ? expression : void 0);
  }
  createTaggedTemplate(tag, template) {
    let templateLiteral;
    const length = template.elements.length;
    const head = template.elements[0];
    if (length === 1) {
      templateLiteral = ts5.factory.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
    } else {
      const spans = [];
      for (let i = 1; i < length - 1; i++) {
        const { cooked, raw, range } = template.elements[i];
        const middle = createTemplateMiddle(cooked, raw);
        if (range !== null) {
          this.setSourceMapRange(middle, range);
        }
        spans.push(ts5.factory.createTemplateSpan(template.expressions[i - 1], middle));
      }
      const resolvedExpression = template.expressions[length - 2];
      const templatePart = template.elements[length - 1];
      const templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
      if (templatePart.range !== null) {
        this.setSourceMapRange(templateTail, templatePart.range);
      }
      spans.push(ts5.factory.createTemplateSpan(resolvedExpression, templateTail));
      templateLiteral = ts5.factory.createTemplateExpression(ts5.factory.createTemplateHead(head.cooked, head.raw), spans);
    }
    if (head.range !== null) {
      this.setSourceMapRange(templateLiteral, head.range);
    }
    return ts5.factory.createTaggedTemplateExpression(tag, void 0, templateLiteral);
  }
  createUnaryExpression(operator, operand) {
    return ts5.factory.createPrefixUnaryExpression(UNARY_OPERATORS2[operator], operand);
  }
  createVariableDeclaration(variableName, initializer, type) {
    return ts5.factory.createVariableStatement(void 0, ts5.factory.createVariableDeclarationList([ts5.factory.createVariableDeclaration(variableName, void 0, void 0, initializer != null ? initializer : void 0)], VAR_TYPES[type]));
  }
  setSourceMapRange(node, sourceMapRange) {
    if (sourceMapRange === null) {
      return node;
    }
    const url = sourceMapRange.url;
    if (!this.externalSourceFiles.has(url)) {
      this.externalSourceFiles.set(url, ts5.createSourceMapSource(url, sourceMapRange.content, (pos) => pos));
    }
    const source = this.externalSourceFiles.get(url);
    ts5.setSourceMapRange(node, { pos: sourceMapRange.start.offset, end: sourceMapRange.end.offset, source });
    return node;
  }
};
function createTemplateMiddle(cooked, raw) {
  const node = ts5.factory.createTemplateHead(cooked, raw);
  node.kind = ts5.SyntaxKind.TemplateMiddle;
  return node;
}
function createTemplateTail(cooked, raw) {
  const node = ts5.factory.createTemplateHead(cooked, raw);
  node.kind = ts5.SyntaxKind.TemplateTail;
  return node;
}
function attachComments(statement, leadingComments) {
  for (const comment of leadingComments) {
    const commentKind = comment.multiline ? ts5.SyntaxKind.MultiLineCommentTrivia : ts5.SyntaxKind.SingleLineCommentTrivia;
    if (comment.multiline) {
      ts5.addSyntheticLeadingComment(statement, commentKind, comment.toString(), comment.trailingNewline);
    } else {
      for (const line of comment.toString().split("\n")) {
        ts5.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
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
  Context,
  ImportManager,
  ExpressionTranslatorVisitor,
  canEmitType,
  TypeEmitter,
  translateType,
  translateExpression,
  translateStatement
};
/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=chunk-7JZOZRTE.js.map
