/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/expression", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.requiresInlineTypeCheckBlock = exports.Context = exports.generateTypeCheckBlock = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var expression_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/expression");
    var template_semantics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics");
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
    /**
     * Given a `ts.ClassDeclaration` for a component, and metadata regarding that component, compose a
     * "type check block" function.
     *
     * When passed through TypeScript's TypeChecker, type errors that arise within the type check block
     * function indicate issues in the template itself.
     *
     * As a side effect of generating a TCB for the component, `ts.Diagnostic`s may also be produced
     * directly for issues within the template which are identified during generation. These issues are
     * recorded in either the `domSchemaChecker` (which checks usage of DOM elements and bindings) as
     * well as the `oobRecorder` (which records errors when the type-checking code generator is unable
     * to sufficiently understand a template).
     *
     * @param env an `Environment` into which type-checking code will be generated.
     * @param ref a `Reference` to the component class which should be type-checked.
     * @param name a `ts.Identifier` to use for the generated `ts.FunctionDeclaration`.
     * @param meta metadata about the component's template and the function being generated.
     * @param domSchemaChecker used to check and record errors regarding improper usage of DOM elements
     * and bindings.
     * @param oobRecorder used to record errors regarding template elements which could not be correctly
     * translated into types during TCB generation.
     */
    function generateTypeCheckBlock(env, ref, name, meta, domSchemaChecker, oobRecorder) {
        var tcb = new Context(env, domSchemaChecker, oobRecorder, meta.id, meta.boundTarget, meta.pipes, meta.schemas);
        var scope = Scope.forNodes(tcb, null, tcb.boundTarget.target.template, /* guard */ null);
        var ctxRawType = env.referenceType(ref);
        if (!ts.isTypeReferenceNode(ctxRawType)) {
            throw new Error("Expected TypeReferenceNode when referencing the ctx param for " + ref.debugName);
        }
        var paramList = [tcbCtxParam(ref.node, ctxRawType.typeName, env.config.useContextGenericType)];
        var scopeStatements = scope.render();
        var innerBody = ts.createBlock(tslib_1.__spread(env.getPreludeStatements(), scopeStatements));
        // Wrap the body in an "if (true)" expression. This is unnecessary but has the effect of causing
        // the `ts.Printer` to format the type-check block nicely.
        var body = ts.createBlock([ts.createIf(ts.createTrue(), innerBody, undefined)]);
        var fnDecl = ts.createFunctionDeclaration(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* asteriskToken */ undefined, 
        /* name */ name, 
        /* typeParameters */ env.config.useContextGenericType ? ref.node.typeParameters : undefined, 
        /* parameters */ paramList, 
        /* type */ undefined, 
        /* body */ body);
        diagnostics_1.addTemplateId(fnDecl, meta.id);
        return fnDecl;
    }
    exports.generateTypeCheckBlock = generateTypeCheckBlock;
    /**
     * A code generation operation that's involved in the construction of a Type Check Block.
     *
     * The generation of a TCB is non-linear. Bindings within a template may result in the need to
     * construct certain types earlier than they otherwise would be constructed. That is, if the
     * generation of a TCB for a template is broken down into specific operations (constructing a
     * directive, extracting a variable from a let- operation, etc), then it's possible for operations
     * earlier in the sequence to depend on operations which occur later in the sequence.
     *
     * `TcbOp` abstracts the different types of operations which are required to convert a template into
     * a TCB. This allows for two phases of processing for the template, where 1) a linear sequence of
     * `TcbOp`s is generated, and then 2) these operations are executed, not necessarily in linear
     * order.
     *
     * Each `TcbOp` may insert statements into the body of the TCB, and also optionally return a
     * `ts.Expression` which can be used to reference the operation's result.
     */
    var TcbOp = /** @class */ (function () {
        function TcbOp() {
        }
        /**
         * Replacement value or operation used while this `TcbOp` is executing (i.e. to resolve circular
         * references during its execution).
         *
         * This is usually a `null!` expression (which asks TS to infer an appropriate type), but another
         * `TcbOp` can be returned in cases where additional code generation is necessary to deal with
         * circular references.
         */
        TcbOp.prototype.circularFallback = function () {
            return INFER_TYPE_FOR_CIRCULAR_OP_EXPR;
        };
        return TcbOp;
    }());
    /**
     * A `TcbOp` which creates an expression for a native DOM element (or web component) from a
     * `TmplAstElement`.
     *
     * Executing this operation returns a reference to the element variable.
     */
    var TcbElementOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbElementOp, _super);
        function TcbElementOp(tcb, scope, element) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.element = element;
            return _this;
        }
        TcbElementOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            // Add the declaration of the element using document.createElement.
            var initializer = ts_util_1.tsCreateElement(this.element.name);
            diagnostics_1.addParseSpanInfo(initializer, this.element.startSourceSpan || this.element.sourceSpan);
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, initializer));
            return id;
        };
        return TcbElementOp;
    }(TcbOp));
    /**
     * A `TcbOp` which creates an expression for particular let- `TmplAstVariable` on a
     * `TmplAstTemplate`'s context.
     *
     * Executing this operation returns a reference to the variable variable (lol).
     */
    var TcbVariableOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbVariableOp, _super);
        function TcbVariableOp(tcb, scope, template, variable) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.template = template;
            _this.variable = variable;
            return _this;
        }
        TcbVariableOp.prototype.execute = function () {
            // Look for a context variable for the template.
            var ctx = this.scope.resolve(this.template);
            // Allocate an identifier for the TmplAstVariable, and initialize it to a read of the variable
            // on the template context.
            var id = this.tcb.allocateId();
            var initializer = ts.createPropertyAccess(
            /* expression */ ctx, 
            /* name */ this.variable.value || '$implicit');
            diagnostics_1.addParseSpanInfo(initializer, this.variable.sourceSpan);
            // Declare the variable, and return its identifier.
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, initializer));
            return id;
        };
        return TcbVariableOp;
    }(TcbOp));
    /**
     * A `TcbOp` which generates a variable for a `TmplAstTemplate`'s context.
     *
     * Executing this operation returns a reference to the template's context variable.
     */
    var TcbTemplateContextOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbTemplateContextOp, _super);
        function TcbTemplateContextOp(tcb, scope) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            return _this;
        }
        TcbTemplateContextOp.prototype.execute = function () {
            // Allocate a template ctx variable and declare it with an 'any' type. The type of this variable
            // may be narrowed as a result of template guard conditions.
            var ctx = this.tcb.allocateId();
            var type = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
            this.scope.addStatement(ts_util_1.tsDeclareVariable(ctx, type));
            return ctx;
        };
        return TcbTemplateContextOp;
    }(TcbOp));
    /**
     * A `TcbOp` which descends into a `TmplAstTemplate`'s children and generates type-checking code for
     * them.
     *
     * This operation wraps the children's type-checking code in an `if` block, which may include one
     * or more type guard conditions that narrow types within the template body.
     */
    var TcbTemplateBodyOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbTemplateBodyOp, _super);
        function TcbTemplateBodyOp(tcb, scope, template) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.template = template;
            return _this;
        }
        TcbTemplateBodyOp.prototype.execute = function () {
            var e_1, _a;
            var _this = this;
            // An `if` will be constructed, within which the template's children will be type checked. The
            // `if` is used for two reasons: it creates a new syntactic scope, isolating variables declared
            // in the template's TCB from the outer context, and it allows any directives on the templates
            // to perform type narrowing of either expressions or the template's context.
            //
            // The guard is the `if` block's condition. It's usually set to `true` but directives that exist
            // on the template can trigger extra guard expressions that serve to narrow types within the
            // `if`. `guard` is calculated by starting with `true` and adding other conditions as needed.
            // Collect these into `guards` by processing the directives.
            var directiveGuards = [];
            var directives = this.tcb.boundTarget.getDirectivesOfNode(this.template);
            if (directives !== null) {
                var _loop_1 = function (dir) {
                    var dirInstId = this_1.scope.resolve(this_1.template, dir);
                    var dirId = this_1.tcb.env.reference(dir.ref);
                    // There are two kinds of guards. Template guards (ngTemplateGuards) allow type narrowing of
                    // the expression passed to an @Input of the directive. Scan the directive to see if it has
                    // any template guards, and generate them if needed.
                    dir.ngTemplateGuards.forEach(function (guard) {
                        // For each template guard function on the directive, look for a binding to that input.
                        var boundInput = _this.template.inputs.find(function (i) { return i.name === guard.inputName; }) ||
                            _this.template.templateAttrs.find(function (i) {
                                return i instanceof compiler_1.TmplAstBoundAttribute && i.name === guard.inputName;
                            });
                        if (boundInput !== undefined) {
                            // If there is such a binding, generate an expression for it.
                            var expr = tcbExpression(boundInput.value, _this.tcb, _this.scope);
                            // The expression has already been checked in the type constructor invocation, so
                            // it should be ignored when used within a template guard.
                            diagnostics_1.ignoreDiagnostics(expr);
                            if (guard.type === 'binding') {
                                // Use the binding expression itself as guard.
                                directiveGuards.push(expr);
                            }
                            else {
                                // Call the guard function on the directive with the directive instance and that
                                // expression.
                                var guardInvoke = ts_util_1.tsCallMethod(dirId, "ngTemplateGuard_" + guard.inputName, [
                                    dirInstId,
                                    expr,
                                ]);
                                diagnostics_1.addParseSpanInfo(guardInvoke, boundInput.value.sourceSpan);
                                directiveGuards.push(guardInvoke);
                            }
                        }
                    });
                    // The second kind of guard is a template context guard. This guard narrows the template
                    // rendering context variable `ctx`.
                    if (dir.hasNgTemplateContextGuard && this_1.tcb.env.config.applyTemplateContextGuards) {
                        var ctx = this_1.scope.resolve(this_1.template);
                        var guardInvoke = ts_util_1.tsCallMethod(dirId, 'ngTemplateContextGuard', [dirInstId, ctx]);
                        diagnostics_1.addParseSpanInfo(guardInvoke, this_1.template.sourceSpan);
                        directiveGuards.push(guardInvoke);
                    }
                };
                var this_1 = this;
                try {
                    for (var directives_1 = tslib_1.__values(directives), directives_1_1 = directives_1.next(); !directives_1_1.done; directives_1_1 = directives_1.next()) {
                        var dir = directives_1_1.value;
                        _loop_1(dir);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (directives_1_1 && !directives_1_1.done && (_a = directives_1.return)) _a.call(directives_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            // By default the guard is simply `true`.
            var guard = null;
            // If there are any guards from directives, use them instead.
            if (directiveGuards.length > 0) {
                // Pop the first value and use it as the initializer to reduce(). This way, a single guard
                // will be used on its own, but two or more will be combined into binary AND expressions.
                guard = directiveGuards.reduce(function (expr, dirGuard) {
                    return ts.createBinary(expr, ts.SyntaxKind.AmpersandAmpersandToken, dirGuard);
                }, directiveGuards.pop());
            }
            // Create a new Scope for the template. This constructs the list of operations for the template
            // children, as well as tracks bindings within the template.
            var tmplScope = Scope.forNodes(this.tcb, this.scope, this.template, guard);
            // Render the template's `Scope` into a block.
            var tmplBlock = ts.createBlock(tmplScope.render());
            if (guard !== null) {
                // The scope has a guard that needs to be applied, so wrap the template block into an `if`
                // statement containing the guard expression.
                tmplBlock = ts.createIf(/* expression */ guard, /* thenStatement */ tmplBlock);
            }
            this.scope.addStatement(tmplBlock);
            return null;
        };
        return TcbTemplateBodyOp;
    }(TcbOp));
    /**
     * A `TcbOp` which renders a text binding (interpolation) into the TCB.
     *
     * Executing this operation returns nothing.
     */
    var TcbTextInterpolationOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbTextInterpolationOp, _super);
        function TcbTextInterpolationOp(tcb, scope, binding) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.binding = binding;
            return _this;
        }
        TcbTextInterpolationOp.prototype.execute = function () {
            var expr = tcbExpression(this.binding.value, this.tcb, this.scope);
            this.scope.addStatement(ts.createExpressionStatement(expr));
            return null;
        };
        return TcbTextInterpolationOp;
    }(TcbOp));
    /**
     * A `TcbOp` which constructs an instance of a directive _without_ setting any of its inputs. Inputs
     * are later set in the `TcbDirectiveInputsOp`. Type checking was found to be faster when done in
     * this way as opposed to `TcbDirectiveCtorOp` which is only necessary when the directive is
     * generic.
     *
     * Executing this operation returns a reference to the directive instance variable with its inferred
     * type.
     */
    var TcbDirectiveTypeOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveTypeOp, _super);
        function TcbDirectiveTypeOp(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        TcbDirectiveTypeOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            var type = this.tcb.env.referenceType(this.dir.ref);
            this.scope.addStatement(ts_util_1.tsDeclareVariable(id, type));
            return id;
        };
        return TcbDirectiveTypeOp;
    }(TcbOp));
    /**
     * A `TcbOp` which constructs an instance of a directive with types inferred from its inputs. The
     * inputs themselves are not checked here; checking of inputs is achieved in `TcbDirectiveInputsOp`.
     * Any errors reported in this statement are ignored, as the type constructor call is only present
     * for type-inference.
     *
     * When a Directive is generic, it is required that the TCB generates the instance using this method
     * in order to infer the type information correctly.
     *
     * Executing this operation returns a reference to the directive instance variable with its inferred
     * type.
     */
    var TcbDirectiveCtorOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveCtorOp, _super);
        function TcbDirectiveCtorOp(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        TcbDirectiveCtorOp.prototype.execute = function () {
            var e_2, _a, e_3, _b, e_4, _c;
            var id = this.tcb.allocateId();
            var genericInputs = new Map();
            var inputs = getBoundInputs(this.dir, this.node, this.tcb);
            try {
                for (var inputs_1 = tslib_1.__values(inputs), inputs_1_1 = inputs_1.next(); !inputs_1_1.done; inputs_1_1 = inputs_1.next()) {
                    var input = inputs_1_1.value;
                    try {
                        for (var _d = (e_3 = void 0, tslib_1.__values(input.fieldNames)), _e = _d.next(); !_e.done; _e = _d.next()) {
                            var fieldName = _e.value;
                            // Skip the field if an attribute has already been bound to it; we can't have a duplicate
                            // key in the type constructor call.
                            if (genericInputs.has(fieldName)) {
                                continue;
                            }
                            var expression = translateInput(input.attribute, this.tcb, this.scope);
                            genericInputs.set(fieldName, {
                                type: 'binding',
                                field: fieldName,
                                expression: expression,
                                sourceSpan: input.attribute.sourceSpan
                            });
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (inputs_1_1 && !inputs_1_1.done && (_a = inputs_1.return)) _a.call(inputs_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // Add unset directive inputs for each of the remaining unset fields.
                for (var _f = tslib_1.__values(Object.keys(this.dir.inputs)), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var fieldName = _g.value;
                    if (!genericInputs.has(fieldName)) {
                        genericInputs.set(fieldName, { type: 'unset', field: fieldName });
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                }
                finally { if (e_4) throw e_4.error; }
            }
            // Call the type constructor of the directive to infer a type, and assign the directive
            // instance.
            var typeCtor = tcbCallTypeCtor(this.dir, this.tcb, Array.from(genericInputs.values()));
            diagnostics_1.ignoreDiagnostics(typeCtor);
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, typeCtor));
            return id;
        };
        TcbDirectiveCtorOp.prototype.circularFallback = function () {
            return new TcbDirectiveCtorCircularFallbackOp(this.tcb, this.scope, this.node, this.dir);
        };
        return TcbDirectiveCtorOp;
    }(TcbOp));
    /**
     * A `TcbOp` which generates code to check input bindings on an element that correspond with the
     * members of a directive.
     *
     * Executing this operation returns nothing.
     */
    var TcbDirectiveInputsOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveInputsOp, _super);
        function TcbDirectiveInputsOp(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        TcbDirectiveInputsOp.prototype.execute = function () {
            var e_5, _a, e_6, _b;
            var dirId = this.scope.resolve(this.node, this.dir);
            // TODO(joost): report duplicate properties
            var inputs = getBoundInputs(this.dir, this.node, this.tcb);
            try {
                for (var inputs_2 = tslib_1.__values(inputs), inputs_2_1 = inputs_2.next(); !inputs_2_1.done; inputs_2_1 = inputs_2.next()) {
                    var input = inputs_2_1.value;
                    // For bound inputs, the property is assigned the binding expression.
                    var expr = translateInput(input.attribute, this.tcb, this.scope);
                    if (!this.tcb.env.config.checkTypeOfInputBindings) {
                        // If checking the type of bindings is disabled, cast the resulting expression to 'any'
                        // before the assignment.
                        expr = ts_util_1.tsCastToAny(expr);
                    }
                    else if (!this.tcb.env.config.strictNullInputBindings) {
                        // If strict null checks are disabled, erase `null` and `undefined` from the type by
                        // wrapping the expression in a non-null assertion.
                        expr = ts.createNonNullExpression(expr);
                    }
                    var assignment = diagnostics_1.wrapForDiagnostics(expr);
                    try {
                        for (var _c = (e_6 = void 0, tslib_1.__values(input.fieldNames)), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var fieldName = _d.value;
                            var target = void 0;
                            if (this.dir.coercedInputFields.has(fieldName)) {
                                // The input has a coercion declaration which should be used instead of assigning the
                                // expression into the input field directly. To achieve this, a variable is declared
                                // with a type of `typeof Directive.ngAcceptInputType_fieldName` which is then used as
                                // target of the assignment.
                                var dirTypeRef = this.tcb.env.referenceType(this.dir.ref);
                                if (!ts.isTypeReferenceNode(dirTypeRef)) {
                                    throw new Error("Expected TypeReferenceNode from reference to " + this.dir.ref.debugName);
                                }
                                var id = this.tcb.allocateId();
                                var type = ts_util_1.tsCreateTypeQueryForCoercedInput(dirTypeRef.typeName, fieldName);
                                this.scope.addStatement(ts_util_1.tsDeclareVariable(id, type));
                                target = id;
                            }
                            else if (this.dir.undeclaredInputFields.has(fieldName)) {
                                // If no coercion declaration is present nor is the field declared (i.e. the input is
                                // declared in a `@Directive` or `@Component` decorator's `inputs` property) there is no
                                // assignment target available, so this field is skipped.
                                continue;
                            }
                            else if (!this.tcb.env.config.honorAccessModifiersForInputBindings &&
                                this.dir.restrictedInputFields.has(fieldName)) {
                                // If strict checking of access modifiers is disabled and the field is restricted
                                // (i.e. private/protected/readonly), generate an assignment into a temporary variable
                                // that has the type of the field. This achieves type-checking but circumvents the access
                                // modifiers.
                                var id = this.tcb.allocateId();
                                var dirTypeRef = this.tcb.env.referenceType(this.dir.ref);
                                if (!ts.isTypeReferenceNode(dirTypeRef)) {
                                    throw new Error("Expected TypeReferenceNode from reference to " + this.dir.ref.debugName);
                                }
                                var type = ts.createIndexedAccessTypeNode(ts.createTypeQueryNode(dirId), ts.createLiteralTypeNode(ts.createStringLiteral(fieldName)));
                                var temp = ts_util_1.tsDeclareVariable(id, type);
                                this.scope.addStatement(temp);
                                target = id;
                            }
                            else {
                                // To get errors assign directly to the fields on the instance, using property access
                                // when possible. String literal fields may not be valid JS identifiers so we use
                                // literal element access instead for those cases.
                                target = this.dir.stringLiteralInputFields.has(fieldName) ?
                                    ts.createElementAccess(dirId, ts.createStringLiteral(fieldName)) :
                                    ts.createPropertyAccess(dirId, ts.createIdentifier(fieldName));
                            }
                            // Finally the assignment is extended by assigning it into the target expression.
                            assignment = ts.createBinary(target, ts.SyntaxKind.EqualsToken, assignment);
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    diagnostics_1.addParseSpanInfo(assignment, input.attribute.sourceSpan);
                    this.scope.addStatement(ts.createExpressionStatement(assignment));
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (inputs_2_1 && !inputs_2_1.done && (_a = inputs_2.return)) _a.call(inputs_2);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return null;
        };
        return TcbDirectiveInputsOp;
    }(TcbOp));
    /**
     * A `TcbOp` which is used to generate a fallback expression if the inference of a directive type
     * via `TcbDirectiveCtorOp` requires a reference to its own type. This can happen using a template
     * reference:
     *
     * ```html
     * <some-cmp #ref [prop]="ref.foo"></some-cmp>
     * ```
     *
     * In this case, `TcbDirectiveCtorCircularFallbackOp` will add a second inference of the directive
     * type to the type-check block, this time calling the directive's type constructor without any
     * input expressions. This infers the widest possible supertype for the directive, which is used to
     * resolve any recursive references required to infer the real type.
     */
    var TcbDirectiveCtorCircularFallbackOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveCtorCircularFallbackOp, _super);
        function TcbDirectiveCtorCircularFallbackOp(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        TcbDirectiveCtorCircularFallbackOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            var typeCtor = this.tcb.env.typeCtorFor(this.dir);
            var circularPlaceholder = ts.createCall(typeCtor, /* typeArguments */ undefined, [ts.createNonNullExpression(ts.createNull())]);
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, circularPlaceholder));
            return id;
        };
        return TcbDirectiveCtorCircularFallbackOp;
    }(TcbOp));
    /**
     * A `TcbOp` which feeds elements and unclaimed properties to the `DomSchemaChecker`.
     *
     * The DOM schema is not checked via TCB code generation. Instead, the `DomSchemaChecker` ingests
     * elements and property bindings and accumulates synthetic `ts.Diagnostic`s out-of-band. These are
     * later merged with the diagnostics generated from the TCB.
     *
     * For convenience, the TCB iteration of the template is used to drive the `DomSchemaChecker` via
     * the `TcbDomSchemaCheckerOp`.
     */
    var TcbDomSchemaCheckerOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDomSchemaCheckerOp, _super);
        function TcbDomSchemaCheckerOp(tcb, element, checkElement, claimedInputs) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.element = element;
            _this.checkElement = checkElement;
            _this.claimedInputs = claimedInputs;
            return _this;
        }
        TcbDomSchemaCheckerOp.prototype.execute = function () {
            var e_7, _a;
            if (this.checkElement) {
                this.tcb.domSchemaChecker.checkElement(this.tcb.id, this.element, this.tcb.schemas);
            }
            try {
                // TODO(alxhub): this could be more efficient.
                for (var _b = tslib_1.__values(this.element.inputs), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var binding = _c.value;
                    if (binding.type === 0 /* Property */ && this.claimedInputs.has(binding.name)) {
                        // Skip this binding as it was claimed by a directive.
                        continue;
                    }
                    if (binding.type === 0 /* Property */) {
                        if (binding.name !== 'style' && binding.name !== 'class') {
                            // A direct binding to a property.
                            var propertyName = ATTR_TO_PROP[binding.name] || binding.name;
                            this.tcb.domSchemaChecker.checkProperty(this.tcb.id, this.element, propertyName, binding.sourceSpan, this.tcb.schemas);
                        }
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            return null;
        };
        return TcbDomSchemaCheckerOp;
    }(TcbOp));
    /**
     * Mapping between attributes names that don't correspond to their element property names.
     * Note: this mapping has to be kept in sync with the equally named mapping in the runtime.
     */
    var ATTR_TO_PROP = {
        'class': 'className',
        'for': 'htmlFor',
        'formaction': 'formAction',
        'innerHtml': 'innerHTML',
        'readonly': 'readOnly',
        'tabindex': 'tabIndex',
    };
    /**
     * A `TcbOp` which generates code to check "unclaimed inputs" - bindings on an element which were
     * not attributed to any directive or component, and are instead processed against the HTML element
     * itself.
     *
     * Currently, only the expressions of these bindings are checked. The targets of the bindings are
     * checked against the DOM schema via a `TcbDomSchemaCheckerOp`.
     *
     * Executing this operation returns nothing.
     */
    var TcbUnclaimedInputsOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbUnclaimedInputsOp, _super);
        function TcbUnclaimedInputsOp(tcb, scope, element, claimedInputs) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.element = element;
            _this.claimedInputs = claimedInputs;
            return _this;
        }
        TcbUnclaimedInputsOp.prototype.execute = function () {
            var e_8, _a;
            // `this.inputs` contains only those bindings not matched by any directive. These bindings go to
            // the element itself.
            var elId = this.scope.resolve(this.element);
            try {
                // TODO(alxhub): this could be more efficient.
                for (var _b = tslib_1.__values(this.element.inputs), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var binding = _c.value;
                    if (binding.type === 0 /* Property */ && this.claimedInputs.has(binding.name)) {
                        // Skip this binding as it was claimed by a directive.
                        continue;
                    }
                    var expr = tcbExpression(binding.value, this.tcb, this.scope);
                    if (!this.tcb.env.config.checkTypeOfInputBindings) {
                        // If checking the type of bindings is disabled, cast the resulting expression to 'any'
                        // before the assignment.
                        expr = ts_util_1.tsCastToAny(expr);
                    }
                    else if (!this.tcb.env.config.strictNullInputBindings) {
                        // If strict null checks are disabled, erase `null` and `undefined` from the type by
                        // wrapping the expression in a non-null assertion.
                        expr = ts.createNonNullExpression(expr);
                    }
                    if (this.tcb.env.config.checkTypeOfDomBindings && binding.type === 0 /* Property */) {
                        if (binding.name !== 'style' && binding.name !== 'class') {
                            // A direct binding to a property.
                            var propertyName = ATTR_TO_PROP[binding.name] || binding.name;
                            var prop = ts.createElementAccess(elId, ts.createStringLiteral(propertyName));
                            var stmt = ts.createBinary(prop, ts.SyntaxKind.EqualsToken, diagnostics_1.wrapForDiagnostics(expr));
                            diagnostics_1.addParseSpanInfo(stmt, binding.sourceSpan);
                            this.scope.addStatement(ts.createExpressionStatement(stmt));
                        }
                        else {
                            this.scope.addStatement(ts.createExpressionStatement(expr));
                        }
                    }
                    else {
                        // A binding to an animation, attribute, class or style. For now, only validate the right-
                        // hand side of the expression.
                        // TODO: properly check class and style bindings.
                        this.scope.addStatement(ts.createExpressionStatement(expr));
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return null;
        };
        return TcbUnclaimedInputsOp;
    }(TcbOp));
    /**
     * A `TcbOp` which generates code to check event bindings on an element that correspond with the
     * outputs of a directive.
     *
     * Executing this operation returns nothing.
     */
    var TcbDirectiveOutputsOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveOutputsOp, _super);
        function TcbDirectiveOutputsOp(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        TcbDirectiveOutputsOp.prototype.execute = function () {
            var e_9, _a, e_10, _b;
            var dirId = this.scope.resolve(this.node, this.dir);
            // `dir.outputs` is an object map of field names on the directive class to event names.
            // This is backwards from what's needed to match event handlers - a map of event names to field
            // names is desired. Invert `dir.outputs` into `fieldByEventName` to create this map.
            var fieldByEventName = new Map();
            var outputs = this.dir.outputs;
            try {
                for (var _c = tslib_1.__values(Object.keys(outputs)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var key = _d.value;
                    fieldByEventName.set(outputs[key], key);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_9) throw e_9.error; }
            }
            try {
                for (var _e = tslib_1.__values(this.node.outputs), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var output = _f.value;
                    if (output.type !== 0 /* Regular */ || !fieldByEventName.has(output.name)) {
                        continue;
                    }
                    var field = fieldByEventName.get(output.name);
                    if (this.tcb.env.config.checkTypeOfOutputEvents) {
                        // For strict checking of directive events, generate a call to the `subscribe` method
                        // on the directive's output field to let type information flow into the handler function's
                        // `$event` parameter.
                        //
                        // Note that the `EventEmitter<T>` type from '@angular/core' that is typically used for
                        // outputs has a typings deficiency in its `subscribe` method. The generic type `T` is not
                        // carried into the handler function, which is vital for inference of the type of `$event`.
                        // As a workaround, the directive's field is passed into a helper function that has a
                        // specially crafted set of signatures, to effectively cast `EventEmitter<T>` to something
                        // that has a `subscribe` method that properly carries the `T` into the handler function.
                        var handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0 /* Infer */);
                        var outputField = ts.createElementAccess(dirId, ts.createStringLiteral(field));
                        var outputHelper = ts.createCall(this.tcb.env.declareOutputHelper(), undefined, [outputField]);
                        var subscribeFn = ts.createPropertyAccess(outputHelper, 'subscribe');
                        var call = ts.createCall(subscribeFn, /* typeArguments */ undefined, [handler]);
                        diagnostics_1.addParseSpanInfo(call, output.sourceSpan);
                        this.scope.addStatement(ts.createExpressionStatement(call));
                    }
                    else {
                        // If strict checking of directive events is disabled, emit a handler function where the
                        // `$event` parameter has an explicit `any` type.
                        var handler = tcbCreateEventHandler(output, this.tcb, this.scope, 1 /* Any */);
                        this.scope.addStatement(ts.createExpressionStatement(handler));
                    }
                    template_semantics_1.ExpressionSemanticVisitor.visit(output.handler, this.tcb.id, this.tcb.boundTarget, this.tcb.oobRecorder);
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_10) throw e_10.error; }
            }
            return null;
        };
        return TcbDirectiveOutputsOp;
    }(TcbOp));
    /**
     * A `TcbOp` which generates code to check "unclaimed outputs" - event bindings on an element which
     * were not attributed to any directive or component, and are instead processed against the HTML
     * element itself.
     *
     * Executing this operation returns nothing.
     */
    var TcbUnclaimedOutputsOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbUnclaimedOutputsOp, _super);
        function TcbUnclaimedOutputsOp(tcb, scope, element, claimedOutputs) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.element = element;
            _this.claimedOutputs = claimedOutputs;
            return _this;
        }
        TcbUnclaimedOutputsOp.prototype.execute = function () {
            var e_11, _a;
            var elId = this.scope.resolve(this.element);
            try {
                // TODO(alxhub): this could be more efficient.
                for (var _b = tslib_1.__values(this.element.outputs), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var output = _c.value;
                    if (this.claimedOutputs.has(output.name)) {
                        // Skip this event handler as it was claimed by a directive.
                        continue;
                    }
                    if (output.type === 1 /* Animation */) {
                        // Animation output bindings always have an `$event` parameter of type `AnimationEvent`.
                        var eventType = this.tcb.env.config.checkTypeOfAnimationEvents ?
                            this.tcb.env.referenceExternalType('@angular/animations', 'AnimationEvent') :
                            1 /* Any */;
                        var handler = tcbCreateEventHandler(output, this.tcb, this.scope, eventType);
                        this.scope.addStatement(ts.createExpressionStatement(handler));
                    }
                    else if (this.tcb.env.config.checkTypeOfDomEvents) {
                        // If strict checking of DOM events is enabled, generate a call to `addEventListener` on
                        // the element instance so that TypeScript's type inference for
                        // `HTMLElement.addEventListener` using `HTMLElementEventMap` to infer an accurate type for
                        // `$event` depending on the event name. For unknown event names, TypeScript resorts to the
                        // base `Event` type.
                        var handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0 /* Infer */);
                        var call = ts.createCall(
                        /* expression */ ts.createPropertyAccess(elId, 'addEventListener'), 
                        /* typeArguments */ undefined, 
                        /* arguments */ [ts.createStringLiteral(output.name), handler]);
                        diagnostics_1.addParseSpanInfo(call, output.sourceSpan);
                        this.scope.addStatement(ts.createExpressionStatement(call));
                    }
                    else {
                        // If strict checking of DOM inputs is disabled, emit a handler function where the `$event`
                        // parameter has an explicit `any` type.
                        var handler = tcbCreateEventHandler(output, this.tcb, this.scope, 1 /* Any */);
                        this.scope.addStatement(ts.createExpressionStatement(handler));
                    }
                    template_semantics_1.ExpressionSemanticVisitor.visit(output.handler, this.tcb.id, this.tcb.boundTarget, this.tcb.oobRecorder);
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_11) throw e_11.error; }
            }
            return null;
        };
        return TcbUnclaimedOutputsOp;
    }(TcbOp));
    /**
     * Value used to break a circular reference between `TcbOp`s.
     *
     * This value is returned whenever `TcbOp`s have a circular dependency. The expression is a non-null
     * assertion of the null value (in TypeScript, the expression `null!`). This construction will infer
     * the least narrow type for whatever it's assigned to.
     */
    var INFER_TYPE_FOR_CIRCULAR_OP_EXPR = ts.createNonNullExpression(ts.createNull());
    /**
     * Overall generation context for the type check block.
     *
     * `Context` handles operations during code generation which are global with respect to the whole
     * block. It's responsible for variable name allocation and management of any imports needed. It
     * also contains the template metadata itself.
     */
    var Context = /** @class */ (function () {
        function Context(env, domSchemaChecker, oobRecorder, id, boundTarget, pipes, schemas) {
            this.env = env;
            this.domSchemaChecker = domSchemaChecker;
            this.oobRecorder = oobRecorder;
            this.id = id;
            this.boundTarget = boundTarget;
            this.pipes = pipes;
            this.schemas = schemas;
            this.nextId = 1;
        }
        /**
         * Allocate a new variable name for use within the `Context`.
         *
         * Currently this uses a monotonically increasing counter, but in the future the variable name
         * might change depending on the type of data being stored.
         */
        Context.prototype.allocateId = function () {
            return ts.createIdentifier("_t" + this.nextId++);
        };
        Context.prototype.getPipeByName = function (name) {
            if (!this.pipes.has(name)) {
                return null;
            }
            return this.env.pipeInst(this.pipes.get(name));
        };
        return Context;
    }());
    exports.Context = Context;
    /**
     * Local scope within the type check block for a particular template.
     *
     * The top-level template and each nested `<ng-template>` have their own `Scope`, which exist in a
     * hierarchy. The structure of this hierarchy mirrors the syntactic scopes in the generated type
     * check block, where each nested template is encased in an `if` structure.
     *
     * As a template's `TcbOp`s are executed in a given `Scope`, statements are added via
     * `addStatement()`. When this processing is complete, the `Scope` can be turned into a `ts.Block`
     * via `renderToBlock()`.
     *
     * If a `TcbOp` requires the output of another, it can call `resolve()`.
     */
    var Scope = /** @class */ (function () {
        function Scope(tcb, parent, guard) {
            if (parent === void 0) { parent = null; }
            if (guard === void 0) { guard = null; }
            this.tcb = tcb;
            this.parent = parent;
            this.guard = guard;
            /**
             * A queue of operations which need to be performed to generate the TCB code for this scope.
             *
             * This array can contain either a `TcbOp` which has yet to be executed, or a `ts.Expression|null`
             * representing the memoized result of executing the operation. As operations are executed, their
             * results are written into the `opQueue`, overwriting the original operation.
             *
             * If an operation is in the process of being executed, it is temporarily overwritten here with
             * `INFER_TYPE_FOR_CIRCULAR_OP_EXPR`. This way, if a cycle is encountered where an operation
             * depends transitively on its own result, the inner operation will infer the least narrow type
             * that fits instead. This has the same semantics as TypeScript itself when types are referenced
             * circularly.
             */
            this.opQueue = [];
            /**
             * A map of `TmplAstElement`s to the index of their `TcbElementOp` in the `opQueue`
             */
            this.elementOpMap = new Map();
            /**
             * A map of maps which tracks the index of `TcbDirectiveCtorOp`s in the `opQueue` for each
             * directive on a `TmplAstElement` or `TmplAstTemplate` node.
             */
            this.directiveOpMap = new Map();
            /**
             * Map of immediately nested <ng-template>s (within this `Scope`) represented by `TmplAstTemplate`
             * nodes to the index of their `TcbTemplateContextOp`s in the `opQueue`.
             */
            this.templateCtxOpMap = new Map();
            /**
             * Map of variables declared on the template that created this `Scope` (represented by
             * `TmplAstVariable` nodes) to the index of their `TcbVariableOp`s in the `opQueue`.
             */
            this.varMap = new Map();
            /**
             * Statements for this template.
             *
             * Executing the `TcbOp`s in the `opQueue` populates this array.
             */
            this.statements = [];
        }
        /**
         * Constructs a `Scope` given either a `TmplAstTemplate` or a list of `TmplAstNode`s.
         *
         * @param tcb the overall context of TCB generation.
         * @param parent the `Scope` of the parent template (if any) or `null` if this is the root
         * `Scope`.
         * @param templateOrNodes either a `TmplAstTemplate` representing the template for which to
         * calculate the `Scope`, or a list of nodes if no outer template object is available.
         * @param guard an expression that is applied to this scope for type narrowing purposes.
         */
        Scope.forNodes = function (tcb, parent, templateOrNodes, guard) {
            var e_12, _a, e_13, _b;
            var scope = new Scope(tcb, parent, guard);
            var children;
            // If given an actual `TmplAstTemplate` instance, then process any additional information it
            // has.
            if (templateOrNodes instanceof compiler_1.TmplAstTemplate) {
                // The template's variable declarations need to be added as `TcbVariableOp`s.
                var varMap = new Map();
                try {
                    for (var _c = tslib_1.__values(templateOrNodes.variables), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var v = _d.value;
                        // Validate that variables on the `TmplAstTemplate` are only declared once.
                        if (!varMap.has(v.name)) {
                            varMap.set(v.name, v);
                        }
                        else {
                            var firstDecl = varMap.get(v.name);
                            tcb.oobRecorder.duplicateTemplateVar(tcb.id, v, firstDecl);
                        }
                        var opIndex = scope.opQueue.push(new TcbVariableOp(tcb, scope, templateOrNodes, v)) - 1;
                        scope.varMap.set(v, opIndex);
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
                children = templateOrNodes.children;
            }
            else {
                children = templateOrNodes;
            }
            try {
                for (var children_1 = tslib_1.__values(children), children_1_1 = children_1.next(); !children_1_1.done; children_1_1 = children_1.next()) {
                    var node = children_1_1.value;
                    scope.appendNode(node);
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (children_1_1 && !children_1_1.done && (_b = children_1.return)) _b.call(children_1);
                }
                finally { if (e_13) throw e_13.error; }
            }
            return scope;
        };
        /**
         * Look up a `ts.Expression` representing the value of some operation in the current `Scope`,
         * including any parent scope(s).
         *
         * @param node a `TmplAstNode` of the operation in question. The lookup performed will depend on
         * the type of this node:
         *
         * Assuming `directive` is not present, then `resolve` will return:
         *
         * * `TmplAstElement` - retrieve the expression for the element DOM node
         * * `TmplAstTemplate` - retrieve the template context variable
         * * `TmplAstVariable` - retrieve a template let- variable
         *
         * @param directive if present, a directive type on a `TmplAstElement` or `TmplAstTemplate` to
         * look up instead of the default for an element or template node.
         */
        Scope.prototype.resolve = function (node, directive) {
            // Attempt to resolve the operation locally.
            var res = this.resolveLocal(node, directive);
            if (res !== null) {
                return res;
            }
            else if (this.parent !== null) {
                // Check with the parent.
                return this.parent.resolve(node, directive);
            }
            else {
                throw new Error("Could not resolve " + node + " / " + directive);
            }
        };
        /**
         * Add a statement to this scope.
         */
        Scope.prototype.addStatement = function (stmt) {
            this.statements.push(stmt);
        };
        /**
         * Get the statements.
         */
        Scope.prototype.render = function () {
            for (var i = 0; i < this.opQueue.length; i++) {
                this.executeOp(i);
            }
            return this.statements;
        };
        /**
         * Returns an expression of all template guards that apply to this scope, including those of
         * parent scopes. If no guards have been applied, null is returned.
         */
        Scope.prototype.guards = function () {
            var parentGuards = null;
            if (this.parent !== null) {
                // Start with the guards from the parent scope, if present.
                parentGuards = this.parent.guards();
            }
            if (this.guard === null) {
                // This scope does not have a guard, so return the parent's guards as is.
                return parentGuards;
            }
            else if (parentGuards === null) {
                // There's no guards from the parent scope, so this scope's guard represents all available
                // guards.
                return this.guard;
            }
            else {
                // Both the parent scope and this scope provide a guard, so create a combination of the two.
                // It is important that the parent guard is used as left operand, given that it may provide
                // narrowing that is required for this scope's guard to be valid.
                return ts.createBinary(parentGuards, ts.SyntaxKind.AmpersandAmpersandToken, this.guard);
            }
        };
        Scope.prototype.resolveLocal = function (ref, directive) {
            if (ref instanceof compiler_1.TmplAstVariable && this.varMap.has(ref)) {
                // Resolving a context variable for this template.
                // Execute the `TcbVariableOp` associated with the `TmplAstVariable`.
                return this.resolveOp(this.varMap.get(ref));
            }
            else if (ref instanceof compiler_1.TmplAstTemplate && directive === undefined &&
                this.templateCtxOpMap.has(ref)) {
                // Resolving the context of the given sub-template.
                // Execute the `TcbTemplateContextOp` for the template.
                return this.resolveOp(this.templateCtxOpMap.get(ref));
            }
            else if ((ref instanceof compiler_1.TmplAstElement || ref instanceof compiler_1.TmplAstTemplate) &&
                directive !== undefined && this.directiveOpMap.has(ref)) {
                // Resolving a directive on an element or sub-template.
                var dirMap = this.directiveOpMap.get(ref);
                if (dirMap.has(directive)) {
                    return this.resolveOp(dirMap.get(directive));
                }
                else {
                    return null;
                }
            }
            else if (ref instanceof compiler_1.TmplAstElement && this.elementOpMap.has(ref)) {
                // Resolving the DOM node of an element in this template.
                return this.resolveOp(this.elementOpMap.get(ref));
            }
            else {
                return null;
            }
        };
        /**
         * Like `executeOp`, but assert that the operation actually returned `ts.Expression`.
         */
        Scope.prototype.resolveOp = function (opIndex) {
            var res = this.executeOp(opIndex);
            if (res === null) {
                throw new Error("Error resolving operation, got null");
            }
            return res;
        };
        /**
         * Execute a particular `TcbOp` in the `opQueue`.
         *
         * This method replaces the operation in the `opQueue` with the result of execution (once done)
         * and also protects against a circular dependency from the operation to itself by temporarily
         * setting the operation's result to a special expression.
         */
        Scope.prototype.executeOp = function (opIndex) {
            var op = this.opQueue[opIndex];
            if (!(op instanceof TcbOp)) {
                return op;
            }
            // Set the result of the operation in the queue to its circular fallback. If executing this
            // operation results in a circular dependency, this will prevent an infinite loop and allow for
            // the resolution of such cycles.
            this.opQueue[opIndex] = op.circularFallback();
            var res = op.execute();
            // Once the operation has finished executing, it's safe to cache the real result.
            this.opQueue[opIndex] = res;
            return res;
        };
        Scope.prototype.appendNode = function (node) {
            var e_14, _a;
            if (node instanceof compiler_1.TmplAstElement) {
                var opIndex = this.opQueue.push(new TcbElementOp(this.tcb, this, node)) - 1;
                this.elementOpMap.set(node, opIndex);
                this.appendDirectivesAndInputsOfNode(node);
                this.appendOutputsOfNode(node);
                try {
                    for (var _b = tslib_1.__values(node.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var child = _c.value;
                        this.appendNode(child);
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_14) throw e_14.error; }
                }
                this.checkReferencesOfNode(node);
            }
            else if (node instanceof compiler_1.TmplAstTemplate) {
                // Template children are rendered in a child scope.
                this.appendDirectivesAndInputsOfNode(node);
                this.appendOutputsOfNode(node);
                if (this.tcb.env.config.checkTemplateBodies) {
                    var ctxIndex = this.opQueue.push(new TcbTemplateContextOp(this.tcb, this)) - 1;
                    this.templateCtxOpMap.set(node, ctxIndex);
                    this.opQueue.push(new TcbTemplateBodyOp(this.tcb, this, node));
                }
                this.checkReferencesOfNode(node);
            }
            else if (node instanceof compiler_1.TmplAstBoundText) {
                this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, node));
            }
        };
        Scope.prototype.checkReferencesOfNode = function (node) {
            var e_15, _a;
            try {
                for (var _b = tslib_1.__values(node.references), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var ref = _c.value;
                    if (this.tcb.boundTarget.getReferenceTarget(ref) === null) {
                        this.tcb.oobRecorder.missingReferenceTarget(this.tcb.id, ref);
                    }
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_15) throw e_15.error; }
            }
        };
        Scope.prototype.appendDirectivesAndInputsOfNode = function (node) {
            var e_16, _a, e_17, _b, e_18, _c;
            // Collect all the inputs on the element.
            var claimedInputs = new Set();
            var directives = this.tcb.boundTarget.getDirectivesOfNode(node);
            if (directives === null || directives.length === 0) {
                // If there are no directives, then all inputs are unclaimed inputs, so queue an operation
                // to add them if needed.
                if (node instanceof compiler_1.TmplAstElement) {
                    this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node, claimedInputs));
                    this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, /* checkElement */ true, claimedInputs));
                }
                return;
            }
            var dirMap = new Map();
            try {
                for (var directives_2 = tslib_1.__values(directives), directives_2_1 = directives_2.next(); !directives_2_1.done; directives_2_1 = directives_2.next()) {
                    var dir = directives_2_1.value;
                    var directiveOp = dir.isGeneric ? new TcbDirectiveCtorOp(this.tcb, this, node, dir) :
                        new TcbDirectiveTypeOp(this.tcb, this, node, dir);
                    var dirIndex = this.opQueue.push(directiveOp) - 1;
                    dirMap.set(dir, dirIndex);
                    this.opQueue.push(new TcbDirectiveInputsOp(this.tcb, this, node, dir));
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (directives_2_1 && !directives_2_1.done && (_a = directives_2.return)) _a.call(directives_2);
                }
                finally { if (e_16) throw e_16.error; }
            }
            this.directiveOpMap.set(node, dirMap);
            // After expanding the directives, we might need to queue an operation to check any unclaimed
            // inputs.
            if (node instanceof compiler_1.TmplAstElement) {
                try {
                    // Go through the directives and remove any inputs that it claims from `elementInputs`.
                    for (var directives_3 = tslib_1.__values(directives), directives_3_1 = directives_3.next(); !directives_3_1.done; directives_3_1 = directives_3.next()) {
                        var dir = directives_3_1.value;
                        try {
                            for (var _d = (e_18 = void 0, tslib_1.__values(Object.keys(dir.inputs))), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var fieldName = _e.value;
                                var value = dir.inputs[fieldName];
                                claimedInputs.add(Array.isArray(value) ? value[0] : value);
                            }
                        }
                        catch (e_18_1) { e_18 = { error: e_18_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_18) throw e_18.error; }
                        }
                    }
                }
                catch (e_17_1) { e_17 = { error: e_17_1 }; }
                finally {
                    try {
                        if (directives_3_1 && !directives_3_1.done && (_b = directives_3.return)) _b.call(directives_3);
                    }
                    finally { if (e_17) throw e_17.error; }
                }
                this.opQueue.push(new TcbUnclaimedInputsOp(this.tcb, this, node, claimedInputs));
                // If there are no directives which match this element, then it's a "plain" DOM element (or a
                // web component), and should be checked against the DOM schema. If any directives match,
                // we must assume that the element could be custom (either a component, or a directive like
                // <router-outlet>) and shouldn't validate the element name itself.
                var checkElement = directives.length === 0;
                this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, checkElement, claimedInputs));
            }
        };
        Scope.prototype.appendOutputsOfNode = function (node) {
            var e_19, _a, e_20, _b, e_21, _c;
            // Collect all the outputs on the element.
            var claimedOutputs = new Set();
            var directives = this.tcb.boundTarget.getDirectivesOfNode(node);
            if (directives === null || directives.length === 0) {
                // If there are no directives, then all outputs are unclaimed outputs, so queue an operation
                // to add them if needed.
                if (node instanceof compiler_1.TmplAstElement) {
                    this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, claimedOutputs));
                }
                return;
            }
            try {
                // Queue operations for all directives to check the relevant outputs for a directive.
                for (var directives_4 = tslib_1.__values(directives), directives_4_1 = directives_4.next(); !directives_4_1.done; directives_4_1 = directives_4.next()) {
                    var dir = directives_4_1.value;
                    this.opQueue.push(new TcbDirectiveOutputsOp(this.tcb, this, node, dir));
                }
            }
            catch (e_19_1) { e_19 = { error: e_19_1 }; }
            finally {
                try {
                    if (directives_4_1 && !directives_4_1.done && (_a = directives_4.return)) _a.call(directives_4);
                }
                finally { if (e_19) throw e_19.error; }
            }
            // After expanding the directives, we might need to queue an operation to check any unclaimed
            // outputs.
            if (node instanceof compiler_1.TmplAstElement) {
                try {
                    // Go through the directives and register any outputs that it claims in `claimedOutputs`.
                    for (var directives_5 = tslib_1.__values(directives), directives_5_1 = directives_5.next(); !directives_5_1.done; directives_5_1 = directives_5.next()) {
                        var dir = directives_5_1.value;
                        try {
                            for (var _d = (e_21 = void 0, tslib_1.__values(Object.keys(dir.outputs))), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var outputField = _e.value;
                                claimedOutputs.add(dir.outputs[outputField]);
                            }
                        }
                        catch (e_21_1) { e_21 = { error: e_21_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_21) throw e_21.error; }
                        }
                    }
                }
                catch (e_20_1) { e_20 = { error: e_20_1 }; }
                finally {
                    try {
                        if (directives_5_1 && !directives_5_1.done && (_b = directives_5.return)) _b.call(directives_5);
                    }
                    finally { if (e_20) throw e_20.error; }
                }
                this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, claimedOutputs));
            }
        };
        return Scope;
    }());
    /**
     * Create the `ctx` parameter to the top-level TCB function.
     *
     * This is a parameter with a type equivalent to the component type, with all generic type
     * parameters listed (without their generic bounds).
     */
    function tcbCtxParam(node, name, useGenericType) {
        var typeArguments = undefined;
        // Check if the component is generic, and pass generic type parameters if so.
        if (node.typeParameters !== undefined) {
            if (useGenericType) {
                typeArguments =
                    node.typeParameters.map(function (param) { return ts.createTypeReferenceNode(param.name, undefined); });
            }
            else {
                typeArguments =
                    node.typeParameters.map(function () { return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword); });
            }
        }
        var type = ts.createTypeReferenceNode(name, typeArguments);
        return ts.createParameter(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, 
        /* name */ 'ctx', 
        /* questionToken */ undefined, 
        /* type */ type, 
        /* initializer */ undefined);
    }
    /**
     * Process an `AST` expression and convert it into a `ts.Expression`, generating references to the
     * correct identifiers in the current scope.
     */
    function tcbExpression(ast, tcb, scope) {
        var translator = new TcbExpressionTranslator(tcb, scope);
        return translator.translate(ast);
    }
    var TcbExpressionTranslator = /** @class */ (function () {
        function TcbExpressionTranslator(tcb, scope) {
            this.tcb = tcb;
            this.scope = scope;
        }
        TcbExpressionTranslator.prototype.translate = function (ast) {
            var _this = this;
            // `astToTypescript` actually does the conversion. A special resolver `tcbResolve` is passed
            // which interprets specific expression nodes that interact with the `ImplicitReceiver`. These
            // nodes actually refer to identifiers within the current scope.
            return expression_1.astToTypescript(ast, function (ast) { return _this.resolve(ast); }, this.tcb.env.config);
        };
        /**
         * Resolve an `AST` expression within the given scope.
         *
         * Some `AST` expressions refer to top-level concepts (references, variables, the component
         * context). This method assists in resolving those.
         */
        TcbExpressionTranslator.prototype.resolve = function (ast) {
            var _this = this;
            if (ast instanceof compiler_1.PropertyRead && ast.receiver instanceof compiler_1.ImplicitReceiver) {
                // Try to resolve a bound target for this expression. If no such target is available, then
                // the expression is referencing the top-level component context. In that case, `null` is
                // returned here to let it fall through resolution so it will be caught when the
                // `ImplicitReceiver` is resolved in the branch below.
                return this.resolveTarget(ast);
            }
            else if (ast instanceof compiler_1.PropertyWrite && ast.receiver instanceof compiler_1.ImplicitReceiver) {
                var target = this.resolveTarget(ast);
                if (target === null) {
                    return null;
                }
                var expr = this.translate(ast.value);
                var result = ts.createParen(ts.createBinary(target, ts.SyntaxKind.EqualsToken, expr));
                diagnostics_1.addParseSpanInfo(result, ast.sourceSpan);
                return result;
            }
            else if (ast instanceof compiler_1.ImplicitReceiver) {
                // AST instances representing variables and references look very similar to property reads
                // or method calls from the component context: both have the shape
                // PropertyRead(ImplicitReceiver, 'propName') or MethodCall(ImplicitReceiver, 'methodName').
                //
                // `translate` will first try to `resolve` the outer PropertyRead/MethodCall. If this works,
                // it's because the `BoundTarget` found an expression target for the whole expression, and
                // therefore `translate` will never attempt to `resolve` the ImplicitReceiver of that
                // PropertyRead/MethodCall.
                //
                // Therefore if `resolve` is called on an `ImplicitReceiver`, it's because no outer
                // PropertyRead/MethodCall resolved to a variable or reference, and therefore this is a
                // property read or method call on the component context itself.
                return ts.createIdentifier('ctx');
            }
            else if (ast instanceof compiler_1.BindingPipe) {
                var expr = this.translate(ast.exp);
                var pipe = void 0;
                if (this.tcb.env.config.checkTypeOfPipes) {
                    pipe = this.tcb.getPipeByName(ast.name);
                    if (pipe === null) {
                        // No pipe by that name exists in scope. Record this as an error.
                        this.tcb.oobRecorder.missingPipe(this.tcb.id, ast);
                        // Return an 'any' value to at least allow the rest of the expression to be checked.
                        pipe = expression_1.NULL_AS_ANY;
                    }
                }
                else {
                    pipe = ts.createParen(ts.createAsExpression(ts.createNull(), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
                }
                var args = ast.args.map(function (arg) { return _this.translate(arg); });
                var result = ts_util_1.tsCallMethod(pipe, 'transform', tslib_1.__spread([expr], args));
                diagnostics_1.addParseSpanInfo(result, ast.sourceSpan);
                return result;
            }
            else if (ast instanceof compiler_1.MethodCall && ast.receiver instanceof compiler_1.ImplicitReceiver) {
                // Resolve the special `$any(expr)` syntax to insert a cast of the argument to type `any`.
                // `$any(expr)` -> `expr as any`
                if (ast.name === '$any' && ast.args.length === 1) {
                    var expr = this.translate(ast.args[0]);
                    var exprAsAny = ts.createAsExpression(expr, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                    var result = ts.createParen(exprAsAny);
                    diagnostics_1.addParseSpanInfo(result, ast.sourceSpan);
                    return result;
                }
                // Attempt to resolve a bound target for the method, and generate the method call if a target
                // could be resolved. If no target is available, then the method is referencing the top-level
                // component context, in which case `null` is returned to let the `ImplicitReceiver` being
                // resolved to the component context.
                var receiver = this.resolveTarget(ast);
                if (receiver === null) {
                    return null;
                }
                var method = ts.createPropertyAccess(diagnostics_1.wrapForDiagnostics(receiver), ast.name);
                diagnostics_1.addParseSpanInfo(method, ast.nameSpan);
                var args = ast.args.map(function (arg) { return _this.translate(arg); });
                var node = ts.createCall(method, undefined, args);
                diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
                return node;
            }
            else {
                // This AST isn't special after all.
                return null;
            }
        };
        /**
         * Attempts to resolve a bound target for a given expression, and translates it into the
         * appropriate `ts.Expression` that represents the bound target. If no target is available,
         * `null` is returned.
         */
        TcbExpressionTranslator.prototype.resolveTarget = function (ast) {
            var binding = this.tcb.boundTarget.getExpressionTarget(ast);
            if (binding === null) {
                return null;
            }
            // This expression has a binding to some variable or reference in the template. Resolve it.
            if (binding instanceof compiler_1.TmplAstVariable) {
                var expr = ts.getMutableClone(this.scope.resolve(binding));
                diagnostics_1.addParseSpanInfo(expr, ast.sourceSpan);
                return expr;
            }
            else if (binding instanceof compiler_1.TmplAstReference) {
                var target = this.tcb.boundTarget.getReferenceTarget(binding);
                if (target === null) {
                    // This reference is unbound. Traversal of the `TmplAstReference` itself should have
                    // recorded the error in the `OutOfBandDiagnosticRecorder`.
                    // Still check the rest of the expression if possible by using an `any` value.
                    return expression_1.NULL_AS_ANY;
                }
                // The reference is either to an element, an <ng-template> node, or to a directive on an
                // element or template.
                if (target instanceof compiler_1.TmplAstElement) {
                    if (!this.tcb.env.config.checkTypeOfDomReferences) {
                        // References to DOM nodes are pinned to 'any'.
                        return expression_1.NULL_AS_ANY;
                    }
                    var expr = ts.getMutableClone(this.scope.resolve(target));
                    diagnostics_1.addParseSpanInfo(expr, ast.sourceSpan);
                    return expr;
                }
                else if (target instanceof compiler_1.TmplAstTemplate) {
                    if (!this.tcb.env.config.checkTypeOfNonDomReferences) {
                        // References to `TemplateRef`s pinned to 'any'.
                        return expression_1.NULL_AS_ANY;
                    }
                    // Direct references to an <ng-template> node simply require a value of type
                    // `TemplateRef<any>`. To get this, an expression of the form
                    // `(null as any as TemplateRef<any>)` is constructed.
                    var value = ts.createNull();
                    value = ts.createAsExpression(value, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                    value = ts.createAsExpression(value, this.tcb.env.referenceExternalType('@angular/core', 'TemplateRef', [compiler_1.DYNAMIC_TYPE]));
                    value = ts.createParen(value);
                    diagnostics_1.addParseSpanInfo(value, ast.sourceSpan);
                    return value;
                }
                else {
                    if (!this.tcb.env.config.checkTypeOfNonDomReferences) {
                        // References to directives are pinned to 'any'.
                        return expression_1.NULL_AS_ANY;
                    }
                    var expr = ts.getMutableClone(this.scope.resolve(target.node, target.directive));
                    diagnostics_1.addParseSpanInfo(expr, ast.sourceSpan);
                    return expr;
                }
            }
            else {
                throw new Error("Unreachable: " + binding);
            }
        };
        return TcbExpressionTranslator;
    }());
    /**
     * Call the type constructor of a directive instance on a given template node, inferring a type for
     * the directive instance from any bound inputs.
     */
    function tcbCallTypeCtor(dir, tcb, inputs) {
        var typeCtor = tcb.env.typeCtorFor(dir);
        // Construct an array of `ts.PropertyAssignment`s for each of the directive's inputs.
        var members = inputs.map(function (input) {
            var propertyName = ts.createStringLiteral(input.field);
            if (input.type === 'binding') {
                // For bound inputs, the property is assigned the binding expression.
                var expr = input.expression;
                if (!tcb.env.config.checkTypeOfInputBindings) {
                    // If checking the type of bindings is disabled, cast the resulting expression to 'any'
                    // before the assignment.
                    expr = ts_util_1.tsCastToAny(expr);
                }
                else if (!tcb.env.config.strictNullInputBindings) {
                    // If strict null checks are disabled, erase `null` and `undefined` from the type by
                    // wrapping the expression in a non-null assertion.
                    expr = ts.createNonNullExpression(expr);
                }
                var assignment = ts.createPropertyAssignment(propertyName, diagnostics_1.wrapForDiagnostics(expr));
                diagnostics_1.addParseSpanInfo(assignment, input.sourceSpan);
                return assignment;
            }
            else {
                // A type constructor is required to be called with all input properties, so any unset
                // inputs are simply assigned a value of type `any` to ignore them.
                return ts.createPropertyAssignment(propertyName, expression_1.NULL_AS_ANY);
            }
        });
        // Call the `ngTypeCtor` method on the directive class, with an object literal argument created
        // from the matched inputs.
        return ts.createCall(
        /* expression */ typeCtor, 
        /* typeArguments */ undefined, 
        /* argumentsArray */ [ts.createObjectLiteral(members)]);
    }
    function getBoundInputs(directive, node, tcb) {
        var boundInputs = [];
        var propertyToFieldNames = invertInputs(directive.inputs);
        var processAttribute = function (attr) {
            // Skip non-property bindings.
            if (attr instanceof compiler_1.TmplAstBoundAttribute && attr.type !== 0 /* Property */) {
                return;
            }
            // Skip text attributes if configured to do so.
            if (!tcb.env.config.checkTypeOfAttributes && attr instanceof compiler_1.TmplAstTextAttribute) {
                return;
            }
            // Skip the attribute if the directive does not have an input for it.
            if (!propertyToFieldNames.has(attr.name)) {
                return;
            }
            var fieldNames = propertyToFieldNames.get(attr.name);
            boundInputs.push({ attribute: attr, fieldNames: fieldNames });
        };
        node.inputs.forEach(processAttribute);
        node.attributes.forEach(processAttribute);
        if (node instanceof compiler_1.TmplAstTemplate) {
            node.templateAttrs.forEach(processAttribute);
        }
        return boundInputs;
    }
    /**
     * Translates the given attribute binding to a `ts.Expression`.
     */
    function translateInput(attr, tcb, scope) {
        if (attr instanceof compiler_1.TmplAstBoundAttribute) {
            // Produce an expression representing the value of the binding.
            return tcbExpression(attr.value, tcb, scope);
        }
        else {
            // For regular attributes with a static string value, use the represented string literal.
            return ts.createStringLiteral(attr.value);
        }
    }
    /**
     * Inverts the input-mapping from field-to-property name into property-to-field name, to be able
     * to match a property in a template with the corresponding field on a directive.
     */
    function invertInputs(inputs) {
        var e_22, _a;
        var propertyToFieldNames = new Map();
        try {
            for (var _b = tslib_1.__values(Object.keys(inputs)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var fieldName = _c.value;
                var propertyNames = inputs[fieldName];
                var propertyName = Array.isArray(propertyNames) ? propertyNames[0] : propertyNames;
                if (propertyToFieldNames.has(propertyName)) {
                    propertyToFieldNames.get(propertyName).push(fieldName);
                }
                else {
                    propertyToFieldNames.set(propertyName, [fieldName]);
                }
            }
        }
        catch (e_22_1) { e_22 = { error: e_22_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_22) throw e_22.error; }
        }
        return propertyToFieldNames;
    }
    var EVENT_PARAMETER = '$event';
    /**
     * Creates an arrow function to be used as handler function for event bindings. The handler
     * function has a single parameter `$event` and the bound event's handler `AST` represented as a
     * TypeScript expression as its body.
     *
     * When `eventType` is set to `Infer`, the `$event` parameter will not have an explicit type. This
     * allows for the created handler function to have its `$event` parameter's type inferred based on
     * how it's used, to enable strict type checking of event bindings. When set to `Any`, the `$event`
     * parameter will have an explicit `any` type, effectively disabling strict type checking of event
     * bindings. Alternatively, an explicit type can be passed for the `$event` parameter.
     */
    function tcbCreateEventHandler(event, tcb, scope, eventType) {
        var handler = tcbEventHandlerExpression(event.handler, tcb, scope);
        var eventParamType;
        if (eventType === 0 /* Infer */) {
            eventParamType = undefined;
        }
        else if (eventType === 1 /* Any */) {
            eventParamType = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
        }
        else {
            eventParamType = eventType;
        }
        // Obtain all guards that have been applied to the scope and its parents, as they have to be
        // repeated within the handler function for their narrowing to be in effect within the handler.
        var guards = scope.guards();
        var body = ts.createExpressionStatement(handler);
        if (guards !== null) {
            // Wrap the body in an `if` statement containing all guards that have to be applied.
            body = ts.createIf(guards, body);
        }
        var eventParam = ts.createParameter(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, 
        /* name */ EVENT_PARAMETER, 
        /* questionToken */ undefined, 
        /* type */ eventParamType);
        return ts.createFunctionExpression(
        /* modifier */ undefined, 
        /* asteriskToken */ undefined, 
        /* name */ undefined, 
        /* typeParameters */ undefined, 
        /* parameters */ [eventParam], 
        /* type */ ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), 
        /* body */ ts.createBlock([body]));
    }
    /**
     * Similar to `tcbExpression`, this function converts the provided `AST` expression into a
     * `ts.Expression`, with special handling of the `$event` variable that can be used within event
     * bindings.
     */
    function tcbEventHandlerExpression(ast, tcb, scope) {
        var translator = new TcbEventHandlerTranslator(tcb, scope);
        return translator.translate(ast);
    }
    var TcbEventHandlerTranslator = /** @class */ (function (_super) {
        tslib_1.__extends(TcbEventHandlerTranslator, _super);
        function TcbEventHandlerTranslator() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        TcbEventHandlerTranslator.prototype.resolve = function (ast) {
            // Recognize a property read on the implicit receiver corresponding with the event parameter
            // that is available in event bindings. Since this variable is a parameter of the handler
            // function that the converted expression becomes a child of, just create a reference to the
            // parameter by its name.
            if (ast instanceof compiler_1.PropertyRead && ast.receiver instanceof compiler_1.ImplicitReceiver &&
                ast.name === EVENT_PARAMETER) {
                var event_1 = ts.createIdentifier(EVENT_PARAMETER);
                diagnostics_1.addParseSpanInfo(event_1, ast.nameSpan);
                return event_1;
            }
            return _super.prototype.resolve.call(this, ast);
        };
        return TcbEventHandlerTranslator;
    }(TcbExpressionTranslator));
    function requiresInlineTypeCheckBlock(node) {
        // In order to qualify for a declared TCB (not inline) two conditions must be met:
        // 1) the class must be exported
        // 2) it must not have constrained generic types
        if (!ts_util_1.checkIfClassIsExported(node)) {
            // Condition 1 is false, the class is not exported.
            return true;
        }
        else if (!ts_util_1.checkIfGenericTypesAreUnbound(node)) {
            // Condition 2 is false, the class has constrained generic types
            return true;
        }
        else {
            return false;
        }
    }
    exports.requiresInlineTypeCheckBlock = requiresInlineTypeCheckBlock;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMlc7SUFDM1csK0JBQWlDO0lBTWpDLHlGQUFxRztJQUdyRyx1RkFBMEQ7SUFFMUQsdUdBQStEO0lBQy9ELGlGQUFtTTtJQUluTTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BcUJHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQ2xDLEdBQWdCLEVBQUUsR0FBcUQsRUFBRSxJQUFtQixFQUM1RixJQUE0QixFQUFFLGdCQUFrQyxFQUNoRSxXQUF3QztRQUMxQyxJQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FDbkIsR0FBRyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0YsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVUsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0YsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUVBQWlFLEdBQUcsQ0FBQyxTQUFXLENBQUMsQ0FBQztTQUN2RjtRQUNELElBQU0sU0FBUyxHQUFHLENBQUMsV0FBVyxDQUFD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LElBQUksQ0FBQyxFQUFFO1lBQ2pDLG1EQUFtRDtZQUNuRCxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFBSSxDQUFDLHVDQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9DLGdFQUFnRTtZQUNoRSxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU07WUFDTCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztJQWJELG9FQWFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBEWU5BTUlDX1RZUEUsIEltcGxpY2l0UmVjZWl2ZXIsIE1ldGhvZENhbGwsIFBhcnNlZEV2ZW50VHlwZSwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNjaGVtYU1ldGFkYXRhLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Qm91bmRUZXh0LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1RlbXBsYXRlSWQsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2FkZFBhcnNlU3BhbkluZm8sIGFkZFRlbXBsYXRlSWQsIGlnbm9yZURpYWdub3N0aWNzLCB3cmFwRm9yRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7YXN0VG9UeXBlc2NyaXB0LCBOVUxMX0FTX0FOWX0gZnJvbSAnLi9leHByZXNzaW9uJztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5pbXBvcnQge0V4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3J9IGZyb20gJy4vdGVtcGxhdGVfc2VtYW50aWNzJztcbmltcG9ydCB7Y2hlY2tJZkNsYXNzSXNFeHBvcnRlZCwgY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQsIHRzQ2FsbE1ldGhvZCwgdHNDYXN0VG9BbnksIHRzQ3JlYXRlRWxlbWVudCwgdHNDcmVhdGVUeXBlUXVlcnlGb3JDb2VyY2VkSW5wdXQsIHRzQ3JlYXRlVmFyaWFibGUsIHRzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuXG5cblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBmb3IgYSBjb21wb25lbnQsIGFuZCBtZXRhZGF0YSByZWdhcmRpbmcgdGhhdCBjb21wb25lbnQsIGNvbXBvc2UgYVxuICogXCJ0eXBlIGNoZWNrIGJsb2NrXCIgZnVuY3Rpb24uXG4gKlxuICogV2hlbiBwYXNzZWQgdGhyb3VnaCBUeXBlU2NyaXB0J3MgVHlwZUNoZWNrZXIsIHR5cGUgZXJyb3JzIHRoYXQgYXJpc2Ugd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrXG4gKiBmdW5jdGlvbiBpbmRpY2F0ZSBpc3N1ZXMgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAqXG4gKiBBcyBhIHNpZGUgZWZmZWN0IG9mIGdlbmVyYXRpbmcgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQsIGB0cy5EaWFnbm9zdGljYHMgbWF5IGFsc28gYmUgcHJvZHVjZWRcbiAqIGRpcmVjdGx5IGZvciBpc3N1ZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSB3aGljaCBhcmUgaWRlbnRpZmllZCBkdXJpbmcgZ2VuZXJhdGlvbi4gVGhlc2UgaXNzdWVzIGFyZVxuICogcmVjb3JkZWQgaW4gZWl0aGVyIHRoZSBgZG9tU2NoZW1hQ2hlY2tlcmAgKHdoaWNoIGNoZWNrcyB1c2FnZSBvZiBET00gZWxlbWVudHMgYW5kIGJpbmRpbmdzKSBhc1xuICogd2VsbCBhcyB0aGUgYG9vYlJlY29yZGVyYCAod2hpY2ggcmVjb3JkcyBlcnJvcnMgd2hlbiB0aGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRvciBpcyB1bmFibGVcbiAqIHRvIHN1ZmZpY2llbnRseSB1bmRlcnN0YW5kIGEgdGVtcGxhdGUpLlxuICpcbiAqIEBwYXJhbSBlbnYgYW4gYEVudmlyb25tZW50YCBpbnRvIHdoaWNoIHR5cGUtY2hlY2tpbmcgY29kZSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSByZWYgYSBgUmVmZXJlbmNlYCB0byB0aGUgY29tcG9uZW50IGNsYXNzIHdoaWNoIHNob3VsZCBiZSB0eXBlLWNoZWNrZWQuXG4gKiBAcGFyYW0gbmFtZSBhIGB0cy5JZGVudGlmaWVyYCB0byB1c2UgZm9yIHRoZSBnZW5lcmF0ZWQgYHRzLkZ1bmN0aW9uRGVjbGFyYXRpb25gLlxuICogQHBhcmFtIG1ldGEgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGFuZCB0aGUgZnVuY3Rpb24gYmVpbmcgZ2VuZXJhdGVkLlxuICogQHBhcmFtIGRvbVNjaGVtYUNoZWNrZXIgdXNlZCB0byBjaGVjayBhbmQgcmVjb3JkIGVycm9ycyByZWdhcmRpbmcgaW1wcm9wZXIgdXNhZ2Ugb2YgRE9NIGVsZW1lbnRzXG4gKiBhbmQgYmluZGluZ3MuXG4gKiBAcGFyYW0gb29iUmVjb3JkZXIgdXNlZCB0byByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyB0ZW1wbGF0ZSBlbGVtZW50cyB3aGljaCBjb3VsZCBub3QgYmUgY29ycmVjdGx5XG4gKiB0cmFuc2xhdGVkIGludG8gdHlwZXMgZHVyaW5nIFRDQiBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICBlbnY6IEVudmlyb25tZW50LCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgbmFtZTogdHMuSWRlbnRpZmllcixcbiAgICBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgY29uc3QgdGNiID0gbmV3IENvbnRleHQoXG4gICAgICBlbnYsIGRvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyLCBtZXRhLmlkLCBtZXRhLmJvdW5kVGFyZ2V0LCBtZXRhLnBpcGVzLCBtZXRhLnNjaGVtYXMpO1xuICBjb25zdCBzY29wZSA9IFNjb3BlLmZvck5vZGVzKHRjYiwgbnVsbCwgdGNiLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCAvKiBndWFyZCAqLyBudWxsKTtcbiAgY29uc3QgY3R4UmF3VHlwZSA9IGVudi5yZWZlcmVuY2VUeXBlKHJlZik7XG4gIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShjdHhSYXdUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIHdoZW4gcmVmZXJlbmNpbmcgdGhlIGN0eCBwYXJhbSBmb3IgJHtyZWYuZGVidWdOYW1lfWApO1xuICB9XG4gIGNvbnN0IHBhcmFtTGlzdCA9IFt0Y2JDdHhQYXJhbShyZWYubm9kZSwgY3R4UmF3VHlwZS50eXBlTmFtZSwgZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUpXTtcblxuICBjb25zdCBzY29wZVN0YXRlbWVudHMgPSBzY29wZS5yZW5kZXIoKTtcbiAgY29uc3QgaW5uZXJCb2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgIC4uLmVudi5nZXRQcmVsdWRlU3RhdGVtZW50cygpLFxuICAgIC4uLnNjb3BlU3RhdGVtZW50cyxcbiAgXSk7XG5cbiAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBcImlmICh0cnVlKVwiIGV4cHJlc3Npb24uIFRoaXMgaXMgdW5uZWNlc3NhcnkgYnV0IGhhcyB0aGUgZWZmZWN0IG9mIGNhdXNpbmdcbiAgLy8gdGhlIGB0cy5QcmludGVyYCB0byBmb3JtYXQgdGhlIHR5cGUtY2hlY2sgYmxvY2sgbmljZWx5LlxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgaW5uZXJCb2R5LCB1bmRlZmluZWQpXSk7XG4gIGNvbnN0IGZuRGVjbCA9IHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gbmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVudi5jb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID8gcmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgOiB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovIHBhcmFtTGlzdCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbiAgYWRkVGVtcGxhdGVJZChmbkRlY2wsIG1ldGEuaWQpO1xuICByZXR1cm4gZm5EZWNsO1xufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0J3MgaW52b2x2ZWQgaW4gdGhlIGNvbnN0cnVjdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2suXG4gKlxuICogVGhlIGdlbmVyYXRpb24gb2YgYSBUQ0IgaXMgbm9uLWxpbmVhci4gQmluZGluZ3Mgd2l0aGluIGEgdGVtcGxhdGUgbWF5IHJlc3VsdCBpbiB0aGUgbmVlZCB0b1xuICogY29uc3RydWN0IGNlcnRhaW4gdHlwZXMgZWFybGllciB0aGFuIHRoZXkgb3RoZXJ3aXNlIHdvdWxkIGJlIGNvbnN0cnVjdGVkLiBUaGF0IGlzLCBpZiB0aGVcbiAqIGdlbmVyYXRpb24gb2YgYSBUQ0IgZm9yIGEgdGVtcGxhdGUgaXMgYnJva2VuIGRvd24gaW50byBzcGVjaWZpYyBvcGVyYXRpb25zIChjb25zdHJ1Y3RpbmcgYVxuICogZGlyZWN0aXZlLCBleHRyYWN0aW5nIGEgdmFyaWFibGUgZnJvbSBhIGxldC0gb3BlcmF0aW9uLCBldGMpLCB0aGVuIGl0J3MgcG9zc2libGUgZm9yIG9wZXJhdGlvbnNcbiAqIGVhcmxpZXIgaW4gdGhlIHNlcXVlbmNlIHRvIGRlcGVuZCBvbiBvcGVyYXRpb25zIHdoaWNoIG9jY3VyIGxhdGVyIGluIHRoZSBzZXF1ZW5jZS5cbiAqXG4gKiBgVGNiT3BgIGFic3RyYWN0cyB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIG9wZXJhdGlvbnMgd2hpY2ggYXJlIHJlcXVpcmVkIHRvIGNvbnZlcnQgYSB0ZW1wbGF0ZSBpbnRvXG4gKiBhIFRDQi4gVGhpcyBhbGxvd3MgZm9yIHR3byBwaGFzZXMgb2YgcHJvY2Vzc2luZyBmb3IgdGhlIHRlbXBsYXRlLCB3aGVyZSAxKSBhIGxpbmVhciBzZXF1ZW5jZSBvZlxuICogYFRjYk9wYHMgaXMgZ2VuZXJhdGVkLCBhbmQgdGhlbiAyKSB0aGVzZSBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgbm90IG5lY2Vzc2FyaWx5IGluIGxpbmVhclxuICogb3JkZXIuXG4gKlxuICogRWFjaCBgVGNiT3BgIG1heSBpbnNlcnQgc3RhdGVtZW50cyBpbnRvIHRoZSBib2R5IG9mIHRoZSBUQ0IsIGFuZCBhbHNvIG9wdGlvbmFsbHkgcmV0dXJuIGFcbiAqIGB0cy5FeHByZXNzaW9uYCB3aGljaCBjYW4gYmUgdXNlZCB0byByZWZlcmVuY2UgdGhlIG9wZXJhdGlvbidzIHJlc3VsdC5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgVGNiT3Age1xuICBhYnN0cmFjdCBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbDtcblxuICAvKipcbiAgICogUmVwbGFjZW1lbnQgdmFsdWUgb3Igb3BlcmF0aW9uIHVzZWQgd2hpbGUgdGhpcyBgVGNiT3BgIGlzIGV4ZWN1dGluZyAoaS5lLiB0byByZXNvbHZlIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMgZHVyaW5nIGl0cyBleGVjdXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzdWFsbHkgYSBgbnVsbCFgIGV4cHJlc3Npb24gKHdoaWNoIGFza3MgVFMgdG8gaW5mZXIgYW4gYXBwcm9wcmlhdGUgdHlwZSksIGJ1dCBhbm90aGVyXG4gICAqIGBUY2JPcGAgY2FuIGJlIHJldHVybmVkIGluIGNhc2VzIHdoZXJlIGFkZGl0aW9uYWwgY29kZSBnZW5lcmF0aW9uIGlzIG5lY2Vzc2FyeSB0byBkZWFsIHdpdGhcbiAgICogY2lyY3VsYXIgcmVmZXJlbmNlcy5cbiAgICovXG4gIGNpcmN1bGFyRmFsbGJhY2soKTogVGNiT3B8dHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBhIG5hdGl2ZSBET00gZWxlbWVudCAob3Igd2ViIGNvbXBvbmVudCkgZnJvbSBhXG4gKiBgVG1wbEFzdEVsZW1lbnRgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JFbGVtZW50T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIC8vIEFkZCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGVsZW1lbnQgdXNpbmcgZG9jdW1lbnQuY3JlYXRlRWxlbWVudC5cbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzQ3JlYXRlRWxlbWVudCh0aGlzLmVsZW1lbnQubmFtZSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpbml0aWFsaXplciwgdGhpcy5lbGVtZW50LnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLmVsZW1lbnQuc291cmNlU3Bhbik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBwYXJ0aWN1bGFyIGxldC0gYFRtcGxBc3RWYXJpYWJsZWAgb24gYVxuICogYFRtcGxBc3RUZW1wbGF0ZWAncyBjb250ZXh0LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSB2YXJpYWJsZSB2YXJpYWJsZSAobG9sKS5cbiAqL1xuY2xhc3MgVGNiVmFyaWFibGVPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgdGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSxcbiAgICAgIHByaXZhdGUgdmFyaWFibGU6IFRtcGxBc3RWYXJpYWJsZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgZm9yIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcblxuICAgIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGVcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY29udGV4dC5cbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAvKiBleHByZXNzaW9uICovIGN0eCxcbiAgICAgICAgLyogbmFtZSAqLyB0aGlzLnZhcmlhYmxlLnZhbHVlIHx8ICckaW1wbGljaXQnKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLnZhcmlhYmxlLnNvdXJjZVNwYW4pO1xuXG4gICAgLy8gRGVjbGFyZSB0aGUgdmFyaWFibGUsIGFuZCByZXR1cm4gaXRzIGlkZW50aWZpZXIuXG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGEgdmFyaWFibGUgZm9yIGEgYFRtcGxBc3RUZW1wbGF0ZWAncyBjb250ZXh0LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQ29udGV4dE9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICAvLyBBbGxvY2F0ZSBhIHRlbXBsYXRlIGN0eCB2YXJpYWJsZSBhbmQgZGVjbGFyZSBpdCB3aXRoIGFuICdhbnknIHR5cGUuIFRoZSB0eXBlIG9mIHRoaXMgdmFyaWFibGVcbiAgICAvLyBtYXkgYmUgbmFycm93ZWQgYXMgYSByZXN1bHQgb2YgdGVtcGxhdGUgZ3VhcmQgY29uZGl0aW9ucy5cbiAgICBjb25zdCBjdHggPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGN0eCwgdHlwZSkpO1xuICAgIHJldHVybiBjdHg7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZGVzY2VuZHMgaW50byBhIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY2hpbGRyZW4gYW5kIGdlbmVyYXRlcyB0eXBlLWNoZWNraW5nIGNvZGUgZm9yXG4gKiB0aGVtLlxuICpcbiAqIFRoaXMgb3BlcmF0aW9uIHdyYXBzIHRoZSBjaGlsZHJlbidzIHR5cGUtY2hlY2tpbmcgY29kZSBpbiBhbiBgaWZgIGJsb2NrLCB3aGljaCBtYXkgaW5jbHVkZSBvbmVcbiAqIG9yIG1vcmUgdHlwZSBndWFyZCBjb25kaXRpb25zIHRoYXQgbmFycm93IHR5cGVzIHdpdGhpbiB0aGUgdGVtcGxhdGUgYm9keS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVCb2R5T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgLy8gQW4gYGlmYCB3aWxsIGJlIGNvbnN0cnVjdGVkLCB3aXRoaW4gd2hpY2ggdGhlIHRlbXBsYXRlJ3MgY2hpbGRyZW4gd2lsbCBiZSB0eXBlIGNoZWNrZWQuIFRoZVxuICAgIC8vIGBpZmAgaXMgdXNlZCBmb3IgdHdvIHJlYXNvbnM6IGl0IGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljIHNjb3BlLCBpc29sYXRpbmcgdmFyaWFibGVzIGRlY2xhcmVkXG4gICAgLy8gaW4gdGhlIHRlbXBsYXRlJ3MgVENCIGZyb20gdGhlIG91dGVyIGNvbnRleHQsIGFuZCBpdCBhbGxvd3MgYW55IGRpcmVjdGl2ZXMgb24gdGhlIHRlbXBsYXRlc1xuICAgIC8vIHRvIHBlcmZvcm0gdHlwZSBuYXJyb3dpbmcgb2YgZWl0aGVyIGV4cHJlc3Npb25zIG9yIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQuXG4gICAgLy9cbiAgICAvLyBUaGUgZ3VhcmQgaXMgdGhlIGBpZmAgYmxvY2sncyBjb25kaXRpb24uIEl0J3MgdXN1YWxseSBzZXQgdG8gYHRydWVgIGJ1dCBkaXJlY3RpdmVzIHRoYXQgZXhpc3RcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY2FuIHRyaWdnZXIgZXh0cmEgZ3VhcmQgZXhwcmVzc2lvbnMgdGhhdCBzZXJ2ZSB0byBuYXJyb3cgdHlwZXMgd2l0aGluIHRoZVxuICAgIC8vIGBpZmAuIGBndWFyZGAgaXMgY2FsY3VsYXRlZCBieSBzdGFydGluZyB3aXRoIGB0cnVlYCBhbmQgYWRkaW5nIG90aGVyIGNvbmRpdGlvbnMgYXMgbmVlZGVkLlxuICAgIC8vIENvbGxlY3QgdGhlc2UgaW50byBgZ3VhcmRzYCBieSBwcm9jZXNzaW5nIHRoZSBkaXJlY3RpdmVzLlxuICAgIGNvbnN0IGRpcmVjdGl2ZUd1YXJkczogdHMuRXhwcmVzc2lvbltdID0gW107XG5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZSh0aGlzLnRlbXBsYXRlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCBkaXJJbnN0SWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50ZW1wbGF0ZSwgZGlyKTtcbiAgICAgICAgY29uc3QgZGlySWQgPVxuICAgICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZShkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik7XG5cbiAgICAgICAgLy8gVGhlcmUgYXJlIHR3byBraW5kcyBvZiBndWFyZHMuIFRlbXBsYXRlIGd1YXJkcyAobmdUZW1wbGF0ZUd1YXJkcykgYWxsb3cgdHlwZSBuYXJyb3dpbmcgb2ZcbiAgICAgICAgLy8gdGhlIGV4cHJlc3Npb24gcGFzc2VkIHRvIGFuIEBJbnB1dCBvZiB0aGUgZGlyZWN0aXZlLiBTY2FuIHRoZSBkaXJlY3RpdmUgdG8gc2VlIGlmIGl0IGhhc1xuICAgICAgICAvLyBhbnkgdGVtcGxhdGUgZ3VhcmRzLCBhbmQgZ2VuZXJhdGUgdGhlbSBpZiBuZWVkZWQuXG4gICAgICAgIGRpci5uZ1RlbXBsYXRlR3VhcmRzLmZvckVhY2goZ3VhcmQgPT4ge1xuICAgICAgICAgIC8vIEZvciBlYWNoIHRlbXBsYXRlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUsIGxvb2sgZm9yIGEgYmluZGluZyB0byB0aGF0IGlucHV0LlxuICAgICAgICAgIGNvbnN0IGJvdW5kSW5wdXQgPSB0aGlzLnRlbXBsYXRlLmlucHV0cy5maW5kKGkgPT4gaS5uYW1lID09PSBndWFyZC5pbnB1dE5hbWUpIHx8XG4gICAgICAgICAgICAgIHRoaXMudGVtcGxhdGUudGVtcGxhdGVBdHRycy5maW5kKFxuICAgICAgICAgICAgICAgICAgKGk6IFRtcGxBc3RUZXh0QXR0cmlidXRlfFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSk6IGkgaXMgVG1wbEFzdEJvdW5kQXR0cmlidXRlID0+XG4gICAgICAgICAgICAgICAgICAgICAgaSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSk7XG4gICAgICAgICAgaWYgKGJvdW5kSW5wdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYm91bmRJbnB1dC52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuXG4gICAgICAgICAgICAvLyBUaGUgZXhwcmVzc2lvbiBoYXMgYWxyZWFkeSBiZWVuIGNoZWNrZWQgaW4gdGhlIHR5cGUgY29uc3RydWN0b3IgaW52b2NhdGlvbiwgc29cbiAgICAgICAgICAgIC8vIGl0IHNob3VsZCBiZSBpZ25vcmVkIHdoZW4gdXNlZCB3aXRoaW4gYSB0ZW1wbGF0ZSBndWFyZC5cbiAgICAgICAgICAgIGlnbm9yZURpYWdub3N0aWNzKGV4cHIpO1xuXG4gICAgICAgICAgICBpZiAoZ3VhcmQudHlwZSA9PT0gJ2JpbmRpbmcnKSB7XG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgYmluZGluZyBleHByZXNzaW9uIGl0c2VsZiBhcyBndWFyZC5cbiAgICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlIHdpdGggdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBhbmQgdGhhdFxuICAgICAgICAgICAgICAvLyBleHByZXNzaW9uLlxuICAgICAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgYG5nVGVtcGxhdGVHdWFyZF8ke2d1YXJkLmlucHV0TmFtZX1gLCBbXG4gICAgICAgICAgICAgICAgZGlySW5zdElkLFxuICAgICAgICAgICAgICAgIGV4cHIsXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCBib3VuZElucHV0LnZhbHVlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaGUgc2Vjb25kIGtpbmQgb2YgZ3VhcmQgaXMgYSB0ZW1wbGF0ZSBjb250ZXh0IGd1YXJkLiBUaGlzIGd1YXJkIG5hcnJvd3MgdGhlIHRlbXBsYXRlXG4gICAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgICBpZiAoZGlyLmhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQgJiYgdGhpcy50Y2IuZW52LmNvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcykge1xuICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgJ25nVGVtcGxhdGVDb250ZXh0R3VhcmQnLCBbZGlySW5zdElkLCBjdHhdKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCB0aGlzLnRlbXBsYXRlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJ5IGRlZmF1bHQgdGhlIGd1YXJkIGlzIHNpbXBseSBgdHJ1ZWAuXG4gICAgbGV0IGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSBndWFyZHMgZnJvbSBkaXJlY3RpdmVzLCB1c2UgdGhlbSBpbnN0ZWFkLlxuICAgIGlmIChkaXJlY3RpdmVHdWFyZHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gUG9wIHRoZSBmaXJzdCB2YWx1ZSBhbmQgdXNlIGl0IGFzIHRoZSBpbml0aWFsaXplciB0byByZWR1Y2UoKS4gVGhpcyB3YXksIGEgc2luZ2xlIGd1YXJkXG4gICAgICAvLyB3aWxsIGJlIHVzZWQgb24gaXRzIG93biwgYnV0IHR3byBvciBtb3JlIHdpbGwgYmUgY29tYmluZWQgaW50byBiaW5hcnkgQU5EIGV4cHJlc3Npb25zLlxuICAgICAgZ3VhcmQgPSBkaXJlY3RpdmVHdWFyZHMucmVkdWNlKFxuICAgICAgICAgIChleHByLCBkaXJHdWFyZCkgPT5cbiAgICAgICAgICAgICAgdHMuY3JlYXRlQmluYXJ5KGV4cHIsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIGRpckd1YXJkKSxcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucG9wKCkhKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgU2NvcGUgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBjb25zdHJ1Y3RzIHRoZSBsaXN0IG9mIG9wZXJhdGlvbnMgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIC8vIGNoaWxkcmVuLCBhcyB3ZWxsIGFzIHRyYWNrcyBiaW5kaW5ncyB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IHRtcGxTY29wZSA9IFNjb3BlLmZvck5vZGVzKHRoaXMudGNiLCB0aGlzLnNjb3BlLCB0aGlzLnRlbXBsYXRlLCBndWFyZCk7XG5cbiAgICAvLyBSZW5kZXIgdGhlIHRlbXBsYXRlJ3MgYFNjb3BlYCBpbnRvIGEgYmxvY2suXG4gICAgbGV0IHRtcGxCbG9jazogdHMuU3RhdGVtZW50ID0gdHMuY3JlYXRlQmxvY2sodG1wbFNjb3BlLnJlbmRlcigpKTtcbiAgICBpZiAoZ3VhcmQgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBzY29wZSBoYXMgYSBndWFyZCB0aGF0IG5lZWRzIHRvIGJlIGFwcGxpZWQsIHNvIHdyYXAgdGhlIHRlbXBsYXRlIGJsb2NrIGludG8gYW4gYGlmYFxuICAgICAgLy8gc3RhdGVtZW50IGNvbnRhaW5pbmcgdGhlIGd1YXJkIGV4cHJlc3Npb24uXG4gICAgICB0bXBsQmxvY2sgPSB0cy5jcmVhdGVJZigvKiBleHByZXNzaW9uICovIGd1YXJkLCAvKiB0aGVuU3RhdGVtZW50ICovIHRtcGxCbG9jayk7XG4gICAgfVxuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRtcGxCbG9jayk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCByZW5kZXJzIGEgdGV4dCBiaW5kaW5nIChpbnRlcnBvbGF0aW9uKSBpbnRvIHRoZSBUQ0IuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVGV4dEludGVycG9sYXRpb25PcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGJpbmRpbmc6IFRtcGxBc3RCb3VuZFRleHQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbih0aGlzLmJpbmRpbmcudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjb25zdHJ1Y3RzIGFuIGluc3RhbmNlIG9mIGEgZGlyZWN0aXZlIF93aXRob3V0XyBzZXR0aW5nIGFueSBvZiBpdHMgaW5wdXRzLiBJbnB1dHNcbiAqIGFyZSBsYXRlciBzZXQgaW4gdGhlIGBUY2JEaXJlY3RpdmVJbnB1dHNPcGAuIFR5cGUgY2hlY2tpbmcgd2FzIGZvdW5kIHRvIGJlIGZhc3RlciB3aGVuIGRvbmUgaW5cbiAqIHRoaXMgd2F5IGFzIG9wcG9zZWQgdG8gYFRjYkRpcmVjdGl2ZUN0b3JPcGAgd2hpY2ggaXMgb25seSBuZWNlc3Nhcnkgd2hlbiB0aGUgZGlyZWN0aXZlIGlzXG4gKiBnZW5lcmljLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZVR5cGVPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG5cbiAgICBjb25zdCB0eXBlID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjb25zdHJ1Y3RzIGFuIGluc3RhbmNlIG9mIGEgZGlyZWN0aXZlIHdpdGggdHlwZXMgaW5mZXJyZWQgZnJvbSBpdHMgaW5wdXRzLiBUaGVcbiAqIGlucHV0cyB0aGVtc2VsdmVzIGFyZSBub3QgY2hlY2tlZCBoZXJlOyBjaGVja2luZyBvZiBpbnB1dHMgaXMgYWNoaWV2ZWQgaW4gYFRjYkRpcmVjdGl2ZUlucHV0c09wYC5cbiAqIEFueSBlcnJvcnMgcmVwb3J0ZWQgaW4gdGhpcyBzdGF0ZW1lbnQgYXJlIGlnbm9yZWQsIGFzIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGNhbGwgaXMgb25seSBwcmVzZW50XG4gKiBmb3IgdHlwZS1pbmZlcmVuY2UuXG4gKlxuICogV2hlbiBhIERpcmVjdGl2ZSBpcyBnZW5lcmljLCBpdCBpcyByZXF1aXJlZCB0aGF0IHRoZSBUQ0IgZ2VuZXJhdGVzIHRoZSBpbnN0YW5jZSB1c2luZyB0aGlzIG1ldGhvZFxuICogaW4gb3JkZXIgdG8gaW5mZXIgdGhlIHR5cGUgaW5mb3JtYXRpb24gY29ycmVjdGx5LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUN0b3JPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG5cbiAgICBjb25zdCBnZW5lcmljSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIFRjYkRpcmVjdGl2ZUlucHV0PigpO1xuXG4gICAgY29uc3QgaW5wdXRzID0gZ2V0Qm91bmRJbnB1dHModGhpcy5kaXIsIHRoaXMubm9kZSwgdGhpcy50Y2IpO1xuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IGZpZWxkTmFtZSBvZiBpbnB1dC5maWVsZE5hbWVzKSB7XG4gICAgICAgIC8vIFNraXAgdGhlIGZpZWxkIGlmIGFuIGF0dHJpYnV0ZSBoYXMgYWxyZWFkeSBiZWVuIGJvdW5kIHRvIGl0OyB3ZSBjYW4ndCBoYXZlIGEgZHVwbGljYXRlXG4gICAgICAgIC8vIGtleSBpbiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBjYWxsLlxuICAgICAgICBpZiAoZ2VuZXJpY0lucHV0cy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHRyYW5zbGF0ZUlucHV0KGlucHV0LmF0dHJpYnV0ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgICBnZW5lcmljSW5wdXRzLnNldChmaWVsZE5hbWUsIHtcbiAgICAgICAgICB0eXBlOiAnYmluZGluZycsXG4gICAgICAgICAgZmllbGQ6IGZpZWxkTmFtZSxcbiAgICAgICAgICBleHByZXNzaW9uLFxuICAgICAgICAgIHNvdXJjZVNwYW46IGlucHV0LmF0dHJpYnV0ZS5zb3VyY2VTcGFuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCB1bnNldCBkaXJlY3RpdmUgaW5wdXRzIGZvciBlYWNoIG9mIHRoZSByZW1haW5pbmcgdW5zZXQgZmllbGRzLlxuICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIE9iamVjdC5rZXlzKHRoaXMuZGlyLmlucHV0cykpIHtcbiAgICAgIGlmICghZ2VuZXJpY0lucHV0cy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICBnZW5lcmljSW5wdXRzLnNldChmaWVsZE5hbWUsIHt0eXBlOiAndW5zZXQnLCBmaWVsZDogZmllbGROYW1lfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiB0aGUgZGlyZWN0aXZlIHRvIGluZmVyIGEgdHlwZSwgYW5kIGFzc2lnbiB0aGUgZGlyZWN0aXZlXG4gICAgLy8gaW5zdGFuY2UuXG4gICAgY29uc3QgdHlwZUN0b3IgPSB0Y2JDYWxsVHlwZUN0b3IodGhpcy5kaXIsIHRoaXMudGNiLCBBcnJheS5mcm9tKGdlbmVyaWNJbnB1dHMudmFsdWVzKCkpKTtcbiAgICBpZ25vcmVEaWFnbm9zdGljcyh0eXBlQ3Rvcik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdHlwZUN0b3IpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBjaXJjdWxhckZhbGxiYWNrKCk6IFRjYk9wIHtcbiAgICByZXR1cm4gbmV3IFRjYkRpcmVjdGl2ZUN0b3JDaXJjdWxhckZhbGxiYWNrT3AodGhpcy50Y2IsIHRoaXMuc2NvcGUsIHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGlucHV0IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBtZW1iZXJzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUlucHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcblxuICAgIC8vIFRPRE8oam9vc3QpOiByZXBvcnQgZHVwbGljYXRlIHByb3BlcnRpZXNcblxuICAgIGNvbnN0IGlucHV0cyA9IGdldEJvdW5kSW5wdXRzKHRoaXMuZGlyLCB0aGlzLm5vZGUsIHRoaXMudGNiKTtcbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIGlucHV0cykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IHRyYW5zbGF0ZUlucHV0KGlucHV0LmF0dHJpYnV0ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBudWxsIGNoZWNrcyBhcmUgZGlzYWJsZWQsIGVyYXNlIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgZnJvbSB0aGUgdHlwZSBieVxuICAgICAgICAvLyB3cmFwcGluZyB0aGUgZXhwcmVzc2lvbiBpbiBhIG5vbi1udWxsIGFzc2VydGlvbi5cbiAgICAgICAgZXhwciA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgYXNzaWdubWVudDogdHMuRXhwcmVzc2lvbiA9IHdyYXBGb3JEaWFnbm9zdGljcyhleHByKTtcblxuICAgICAgZm9yIChjb25zdCBmaWVsZE5hbWUgb2YgaW5wdXQuZmllbGROYW1lcykge1xuICAgICAgICBsZXQgdGFyZ2V0OiB0cy5MZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICBpZiAodGhpcy5kaXIuY29lcmNlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGlucHV0IGhhcyBhIGNvZXJjaW9uIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSB1c2VkIGluc3RlYWQgb2YgYXNzaWduaW5nIHRoZVxuICAgICAgICAgIC8vIGV4cHJlc3Npb24gaW50byB0aGUgaW5wdXQgZmllbGQgZGlyZWN0bHkuIFRvIGFjaGlldmUgdGhpcywgYSB2YXJpYWJsZSBpcyBkZWNsYXJlZFxuICAgICAgICAgIC8vIHdpdGggYSB0eXBlIG9mIGB0eXBlb2YgRGlyZWN0aXZlLm5nQWNjZXB0SW5wdXRUeXBlX2ZpZWxkTmFtZWAgd2hpY2ggaXMgdGhlbiB1c2VkIGFzXG4gICAgICAgICAgLy8gdGFyZ2V0IG9mIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICAgIGNvbnN0IGRpclR5cGVSZWYgPSB0aGlzLnRjYi5lbnYucmVmZXJlbmNlVHlwZSh0aGlzLmRpci5yZWYpO1xuICAgICAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkaXJUeXBlUmVmKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke3RoaXMuZGlyLnJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHRzQ3JlYXRlVHlwZVF1ZXJ5Rm9yQ29lcmNlZElucHV0KGRpclR5cGVSZWYudHlwZU5hbWUsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpKTtcblxuICAgICAgICAgIHRhcmdldCA9IGlkO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZGlyLnVuZGVjbGFyZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIElmIG5vIGNvZXJjaW9uIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQgbm9yIGlzIHRoZSBmaWVsZCBkZWNsYXJlZCAoaS5lLiB0aGUgaW5wdXQgaXNcbiAgICAgICAgICAvLyBkZWNsYXJlZCBpbiBhIGBARGlyZWN0aXZlYCBvciBgQENvbXBvbmVudGAgZGVjb3JhdG9yJ3MgYGlucHV0c2AgcHJvcGVydHkpIHRoZXJlIGlzIG5vXG4gICAgICAgICAgLy8gYXNzaWdubWVudCB0YXJnZXQgYXZhaWxhYmxlLCBzbyB0aGlzIGZpZWxkIGlzIHNraXBwZWQuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAhdGhpcy50Y2IuZW52LmNvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgJiZcbiAgICAgICAgICAgIHRoaXMuZGlyLnJlc3RyaWN0ZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBhY2Nlc3MgbW9kaWZpZXJzIGlzIGRpc2FibGVkIGFuZCB0aGUgZmllbGQgaXMgcmVzdHJpY3RlZFxuICAgICAgICAgIC8vIChpLmUuIHByaXZhdGUvcHJvdGVjdGVkL3JlYWRvbmx5KSwgZ2VuZXJhdGUgYW4gYXNzaWdubWVudCBpbnRvIGEgdGVtcG9yYXJ5IHZhcmlhYmxlXG4gICAgICAgICAgLy8gdGhhdCBoYXMgdGhlIHR5cGUgb2YgdGhlIGZpZWxkLiBUaGlzIGFjaGlldmVzIHR5cGUtY2hlY2tpbmcgYnV0IGNpcmN1bXZlbnRzIHRoZSBhY2Nlc3NcbiAgICAgICAgICAvLyBtb2RpZmllcnMuXG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgICAgICAgY29uc3QgZGlyVHlwZVJlZiA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG4gICAgICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRpclR5cGVSZWYpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7dGhpcy5kaXIucmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUluZGV4ZWRBY2Nlc3NUeXBlTm9kZShcbiAgICAgICAgICAgICAgdHMuY3JlYXRlVHlwZVF1ZXJ5Tm9kZShkaXJJZCBhcyB0cy5JZGVudGlmaWVyKSxcbiAgICAgICAgICAgICAgdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGROYW1lKSkpO1xuICAgICAgICAgIGNvbnN0IHRlbXAgPSB0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSk7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodGVtcCk7XG4gICAgICAgICAgdGFyZ2V0ID0gaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVG8gZ2V0IGVycm9ycyBhc3NpZ24gZGlyZWN0bHkgdG8gdGhlIGZpZWxkcyBvbiB0aGUgaW5zdGFuY2UsIHVzaW5nIHByb3BlcnR5IGFjY2Vzc1xuICAgICAgICAgIC8vIHdoZW4gcG9zc2libGUuIFN0cmluZyBsaXRlcmFsIGZpZWxkcyBtYXkgbm90IGJlIHZhbGlkIEpTIGlkZW50aWZpZXJzIHNvIHdlIHVzZVxuICAgICAgICAgIC8vIGxpdGVyYWwgZWxlbWVudCBhY2Nlc3MgaW5zdGVhZCBmb3IgdGhvc2UgY2FzZXMuXG4gICAgICAgICAgdGFyZ2V0ID0gdGhpcy5kaXIuc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpID9cbiAgICAgICAgICAgICAgdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZE5hbWUpKSA6XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVJZGVudGlmaWVyKGZpZWxkTmFtZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluYWxseSB0aGUgYXNzaWdubWVudCBpcyBleHRlbmRlZCBieSBhc3NpZ25pbmcgaXQgaW50byB0aGUgdGFyZ2V0IGV4cHJlc3Npb24uXG4gICAgICAgIGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBhc3NpZ25tZW50KTtcbiAgICAgIH1cblxuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhhc3NpZ25tZW50LCBpbnB1dC5hdHRyaWJ1dGUuc291cmNlU3Bhbik7XG4gICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGFzc2lnbm1lbnQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgZmFsbGJhY2sgZXhwcmVzc2lvbiBpZiB0aGUgaW5mZXJlbmNlIG9mIGEgZGlyZWN0aXZlIHR5cGVcbiAqIHZpYSBgVGNiRGlyZWN0aXZlQ3Rvck9wYCByZXF1aXJlcyBhIHJlZmVyZW5jZSB0byBpdHMgb3duIHR5cGUuIFRoaXMgY2FuIGhhcHBlbiB1c2luZyBhIHRlbXBsYXRlXG4gKiByZWZlcmVuY2U6XG4gKlxuICogYGBgaHRtbFxuICogPHNvbWUtY21wICNyZWYgW3Byb3BdPVwicmVmLmZvb1wiPjwvc29tZS1jbXA+XG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wYCB3aWxsIGFkZCBhIHNlY29uZCBpbmZlcmVuY2Ugb2YgdGhlIGRpcmVjdGl2ZVxuICogdHlwZSB0byB0aGUgdHlwZS1jaGVjayBibG9jaywgdGhpcyB0aW1lIGNhbGxpbmcgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgY29uc3RydWN0b3Igd2l0aG91dCBhbnlcbiAqIGlucHV0IGV4cHJlc3Npb25zLiBUaGlzIGluZmVycyB0aGUgd2lkZXN0IHBvc3NpYmxlIHN1cGVydHlwZSBmb3IgdGhlIGRpcmVjdGl2ZSwgd2hpY2ggaXMgdXNlZCB0b1xuICogcmVzb2x2ZSBhbnkgcmVjdXJzaXZlIHJlZmVyZW5jZXMgcmVxdWlyZWQgdG8gaW5mZXIgdGhlIHJlYWwgdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZUN0b3IgPSB0aGlzLnRjYi5lbnYudHlwZUN0b3JGb3IodGhpcy5kaXIpO1xuICAgIGNvbnN0IGNpcmN1bGFyUGxhY2Vob2xkZXIgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICB0eXBlQ3RvciwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIFt0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpXSk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgY2lyY3VsYXJQbGFjZWhvbGRlcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBmZWVkcyBlbGVtZW50cyBhbmQgdW5jbGFpbWVkIHByb3BlcnRpZXMgdG8gdGhlIGBEb21TY2hlbWFDaGVja2VyYC5cbiAqXG4gKiBUaGUgRE9NIHNjaGVtYSBpcyBub3QgY2hlY2tlZCB2aWEgVENCIGNvZGUgZ2VuZXJhdGlvbi4gSW5zdGVhZCwgdGhlIGBEb21TY2hlbWFDaGVja2VyYCBpbmdlc3RzXG4gKiBlbGVtZW50cyBhbmQgcHJvcGVydHkgYmluZGluZ3MgYW5kIGFjY3VtdWxhdGVzIHN5bnRoZXRpYyBgdHMuRGlhZ25vc3RpY2BzIG91dC1vZi1iYW5kLiBUaGVzZSBhcmVcbiAqIGxhdGVyIG1lcmdlZCB3aXRoIHRoZSBkaWFnbm9zdGljcyBnZW5lcmF0ZWQgZnJvbSB0aGUgVENCLlxuICpcbiAqIEZvciBjb252ZW5pZW5jZSwgdGhlIFRDQiBpdGVyYXRpb24gb2YgdGhlIHRlbXBsYXRlIGlzIHVzZWQgdG8gZHJpdmUgdGhlIGBEb21TY2hlbWFDaGVja2VyYCB2aWFcbiAqIHRoZSBgVGNiRG9tU2NoZW1hQ2hlY2tlck9wYC5cbiAqL1xuY2xhc3MgVGNiRG9tU2NoZW1hQ2hlY2tlck9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBwcml2YXRlIGNoZWNrRWxlbWVudDogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgY2xhaW1lZElucHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICh0aGlzLmNoZWNrRWxlbWVudCkge1xuICAgICAgdGhpcy50Y2IuZG9tU2NoZW1hQ2hlY2tlci5jaGVja0VsZW1lbnQodGhpcy50Y2IuaWQsIHRoaXMuZWxlbWVudCwgdGhpcy50Y2Iuc2NoZW1hcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3QgYmluZGluZyBvZiB0aGlzLmVsZW1lbnQuaW5wdXRzKSB7XG4gICAgICBpZiAoYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSAmJiB0aGlzLmNsYWltZWRJbnB1dHMuaGFzKGJpbmRpbmcubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGJpbmRpbmcgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgICBpZiAoYmluZGluZy5uYW1lICE9PSAnc3R5bGUnICYmIGJpbmRpbmcubmFtZSAhPT0gJ2NsYXNzJykge1xuICAgICAgICAgIC8vIEEgZGlyZWN0IGJpbmRpbmcgdG8gYSBwcm9wZXJ0eS5cbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSBBVFRSX1RPX1BST1BbYmluZGluZy5uYW1lXSB8fCBiaW5kaW5nLm5hbWU7XG4gICAgICAgICAgdGhpcy50Y2IuZG9tU2NoZW1hQ2hlY2tlci5jaGVja1Byb3BlcnR5KFxuICAgICAgICAgICAgICB0aGlzLnRjYi5pZCwgdGhpcy5lbGVtZW50LCBwcm9wZXJ0eU5hbWUsIGJpbmRpbmcuc291cmNlU3BhbiwgdGhpcy50Y2Iuc2NoZW1hcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuXG4vKipcbiAqIE1hcHBpbmcgYmV0d2VlbiBhdHRyaWJ1dGVzIG5hbWVzIHRoYXQgZG9uJ3QgY29ycmVzcG9uZCB0byB0aGVpciBlbGVtZW50IHByb3BlcnR5IG5hbWVzLlxuICogTm90ZTogdGhpcyBtYXBwaW5nIGhhcyB0byBiZSBrZXB0IGluIHN5bmMgd2l0aCB0aGUgZXF1YWxseSBuYW1lZCBtYXBwaW5nIGluIHRoZSBydW50aW1lLlxuICovXG5jb25zdCBBVFRSX1RPX1BST1A6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdmb3JtYWN0aW9uJzogJ2Zvcm1BY3Rpb24nLFxuICAnaW5uZXJIdG1sJzogJ2lubmVySFRNTCcsXG4gICdyZWFkb25seSc6ICdyZWFkT25seScsXG4gICd0YWJpbmRleCc6ICd0YWJJbmRleCcsXG59O1xuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBcInVuY2xhaW1lZCBpbnB1dHNcIiAtIGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgd2hpY2ggd2VyZVxuICogbm90IGF0dHJpYnV0ZWQgdG8gYW55IGRpcmVjdGl2ZSBvciBjb21wb25lbnQsIGFuZCBhcmUgaW5zdGVhZCBwcm9jZXNzZWQgYWdhaW5zdCB0aGUgSFRNTCBlbGVtZW50XG4gKiBpdHNlbGYuXG4gKlxuICogQ3VycmVudGx5LCBvbmx5IHRoZSBleHByZXNzaW9ucyBvZiB0aGVzZSBiaW5kaW5ncyBhcmUgY2hlY2tlZC4gVGhlIHRhcmdldHMgb2YgdGhlIGJpbmRpbmdzIGFyZVxuICogY2hlY2tlZCBhZ2FpbnN0IHRoZSBET00gc2NoZW1hIHZpYSBhIGBUY2JEb21TY2hlbWFDaGVja2VyT3BgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlVuY2xhaW1lZElucHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgY2xhaW1lZElucHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBgdGhpcy5pbnB1dHNgIGNvbnRhaW5zIG9ubHkgdGhvc2UgYmluZGluZ3Mgbm90IG1hdGNoZWQgYnkgYW55IGRpcmVjdGl2ZS4gVGhlc2UgYmluZGluZ3MgZ28gdG9cbiAgICAvLyB0aGUgZWxlbWVudCBpdHNlbGYuXG4gICAgY29uc3QgZWxJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmVsZW1lbnQpO1xuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3QgYmluZGluZyBvZiB0aGlzLmVsZW1lbnQuaW5wdXRzKSB7XG4gICAgICBpZiAoYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSAmJiB0aGlzLmNsYWltZWRJbnB1dHMuaGFzKGJpbmRpbmcubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGJpbmRpbmcgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgZXhwciA9IHRjYkV4cHJlc3Npb24oYmluZGluZy52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBudWxsIGNoZWNrcyBhcmUgZGlzYWJsZWQsIGVyYXNlIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgZnJvbSB0aGUgdHlwZSBieVxuICAgICAgICAvLyB3cmFwcGluZyB0aGUgZXhwcmVzc2lvbiBpbiBhIG5vbi1udWxsIGFzc2VydGlvbi5cbiAgICAgICAgZXhwciA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbUJpbmRpbmdzICYmIGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgICAgaWYgKGJpbmRpbmcubmFtZSAhPT0gJ3N0eWxlJyAmJiBiaW5kaW5nLm5hbWUgIT09ICdjbGFzcycpIHtcbiAgICAgICAgICAvLyBBIGRpcmVjdCBiaW5kaW5nIHRvIGEgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3QgcHJvcGVydHlOYW1lID0gQVRUUl9UT19QUk9QW2JpbmRpbmcubmFtZV0gfHwgYmluZGluZy5uYW1lO1xuICAgICAgICAgIGNvbnN0IHByb3AgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGVsSWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwocHJvcGVydHlOYW1lKSk7XG4gICAgICAgICAgY29uc3Qgc3RtdCA9IHRzLmNyZWF0ZUJpbmFyeShwcm9wLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcikpO1xuICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8oc3RtdCwgYmluZGluZy5zb3VyY2VTcGFuKTtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KHN0bXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQSBiaW5kaW5nIHRvIGFuIGFuaW1hdGlvbiwgYXR0cmlidXRlLCBjbGFzcyBvciBzdHlsZS4gRm9yIG5vdywgb25seSB2YWxpZGF0ZSB0aGUgcmlnaHQtXG4gICAgICAgIC8vIGhhbmQgc2lkZSBvZiB0aGUgZXhwcmVzc2lvbi5cbiAgICAgICAgLy8gVE9ETzogcHJvcGVybHkgY2hlY2sgY2xhc3MgYW5kIHN0eWxlIGJpbmRpbmdzLlxuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBldmVudCBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHRoYXQgY29ycmVzcG9uZCB3aXRoIHRoZVxuICogb3V0cHV0cyBvZiBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGNvbnN0IGRpcklkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuXG4gICAgLy8gYGRpci5vdXRwdXRzYCBpcyBhbiBvYmplY3QgbWFwIG9mIGZpZWxkIG5hbWVzIG9uIHRoZSBkaXJlY3RpdmUgY2xhc3MgdG8gZXZlbnQgbmFtZXMuXG4gICAgLy8gVGhpcyBpcyBiYWNrd2FyZHMgZnJvbSB3aGF0J3MgbmVlZGVkIHRvIG1hdGNoIGV2ZW50IGhhbmRsZXJzIC0gYSBtYXAgb2YgZXZlbnQgbmFtZXMgdG8gZmllbGRcbiAgICAvLyBuYW1lcyBpcyBkZXNpcmVkLiBJbnZlcnQgYGRpci5vdXRwdXRzYCBpbnRvIGBmaWVsZEJ5RXZlbnROYW1lYCB0byBjcmVhdGUgdGhpcyBtYXAuXG4gICAgY29uc3QgZmllbGRCeUV2ZW50TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgY29uc3Qgb3V0cHV0cyA9IHRoaXMuZGlyLm91dHB1dHM7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMob3V0cHV0cykpIHtcbiAgICAgIGZpZWxkQnlFdmVudE5hbWUuc2V0KG91dHB1dHNba2V5XSwga2V5KTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiB0aGlzLm5vZGUub3V0cHV0cykge1xuICAgICAgaWYgKG91dHB1dC50eXBlICE9PSBQYXJzZWRFdmVudFR5cGUuUmVndWxhciB8fCAhZmllbGRCeUV2ZW50TmFtZS5oYXMob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZmllbGQgPSBmaWVsZEJ5RXZlbnROYW1lLmdldChvdXRwdXQubmFtZSkhO1xuXG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cykge1xuICAgICAgICAvLyBGb3Igc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMsIGdlbmVyYXRlIGEgY2FsbCB0byB0aGUgYHN1YnNjcmliZWAgbWV0aG9kXG4gICAgICAgIC8vIG9uIHRoZSBkaXJlY3RpdmUncyBvdXRwdXQgZmllbGQgdG8gbGV0IHR5cGUgaW5mb3JtYXRpb24gZmxvdyBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uJ3NcbiAgICAgICAgLy8gYCRldmVudGAgcGFyYW1ldGVyLlxuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlIHRoYXQgdGhlIGBFdmVudEVtaXR0ZXI8VD5gIHR5cGUgZnJvbSAnQGFuZ3VsYXIvY29yZScgdGhhdCBpcyB0eXBpY2FsbHkgdXNlZCBmb3JcbiAgICAgICAgLy8gb3V0cHV0cyBoYXMgYSB0eXBpbmdzIGRlZmljaWVuY3kgaW4gaXRzIGBzdWJzY3JpYmVgIG1ldGhvZC4gVGhlIGdlbmVyaWMgdHlwZSBgVGAgaXMgbm90XG4gICAgICAgIC8vIGNhcnJpZWQgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbiwgd2hpY2ggaXMgdml0YWwgZm9yIGluZmVyZW5jZSBvZiB0aGUgdHlwZSBvZiBgJGV2ZW50YC5cbiAgICAgICAgLy8gQXMgYSB3b3JrYXJvdW5kLCB0aGUgZGlyZWN0aXZlJ3MgZmllbGQgaXMgcGFzc2VkIGludG8gYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBoYXMgYVxuICAgICAgICAvLyBzcGVjaWFsbHkgY3JhZnRlZCBzZXQgb2Ygc2lnbmF0dXJlcywgdG8gZWZmZWN0aXZlbHkgY2FzdCBgRXZlbnRFbWl0dGVyPFQ+YCB0byBzb21ldGhpbmdcbiAgICAgICAgLy8gdGhhdCBoYXMgYSBgc3Vic2NyaWJlYCBtZXRob2QgdGhhdCBwcm9wZXJseSBjYXJyaWVzIHRoZSBgVGAgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG5cbiAgICAgICAgY29uc3Qgb3V0cHV0RmllbGQgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkKSk7XG4gICAgICAgIGNvbnN0IG91dHB1dEhlbHBlciA9XG4gICAgICAgICAgICB0cy5jcmVhdGVDYWxsKHRoaXMudGNiLmVudi5kZWNsYXJlT3V0cHV0SGVscGVyKCksIHVuZGVmaW5lZCwgW291dHB1dEZpZWxkXSk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmliZUZuID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3Mob3V0cHV0SGVscGVyLCAnc3Vic2NyaWJlJyk7XG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKHN1YnNjcmliZUZuLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCwgW2hhbmRsZXJdKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhjYWxsLCBvdXRwdXQuc291cmNlU3Bhbik7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoY2FsbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMgaXMgZGlzYWJsZWQsIGVtaXQgYSBoYW5kbGVyIGZ1bmN0aW9uIHdoZXJlIHRoZVxuICAgICAgICAvLyBgJGV2ZW50YCBwYXJhbWV0ZXIgaGFzIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuQW55KTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9XG5cbiAgICAgIEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IudmlzaXQoXG4gICAgICAgICAgb3V0cHV0LmhhbmRsZXIsIHRoaXMudGNiLmlkLCB0aGlzLnRjYi5ib3VuZFRhcmdldCwgdGhpcy50Y2Iub29iUmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIG91dHB1dHNcIiAtIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgd2hpY2hcbiAqIHdlcmUgbm90IGF0dHJpYnV0ZWQgdG8gYW55IGRpcmVjdGl2ZSBvciBjb21wb25lbnQsIGFuZCBhcmUgaW5zdGVhZCBwcm9jZXNzZWQgYWdhaW5zdCB0aGUgSFRNTFxuICogZWxlbWVudCBpdHNlbGYuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkT3V0cHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgY2xhaW1lZE91dHB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZWxJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmVsZW1lbnQpO1xuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMuZWxlbWVudC5vdXRwdXRzKSB7XG4gICAgICBpZiAodGhpcy5jbGFpbWVkT3V0cHV0cy5oYXMob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBldmVudCBoYW5kbGVyIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG91dHB1dC50eXBlID09PSBQYXJzZWRFdmVudFR5cGUuQW5pbWF0aW9uKSB7XG4gICAgICAgIC8vIEFuaW1hdGlvbiBvdXRwdXQgYmluZGluZ3MgYWx3YXlzIGhhdmUgYW4gYCRldmVudGAgcGFyYW1ldGVyIG9mIHR5cGUgYEFuaW1hdGlvbkV2ZW50YC5cbiAgICAgICAgY29uc3QgZXZlbnRUeXBlID0gdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA/XG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9hbmltYXRpb25zJywgJ0FuaW1hdGlvbkV2ZW50JykgOlxuICAgICAgICAgICAgRXZlbnRQYXJhbVR5cGUuQW55O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgZXZlbnRUeXBlKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIERPTSBldmVudHMgaXMgZW5hYmxlZCwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBhZGRFdmVudExpc3RlbmVyYCBvblxuICAgICAgICAvLyB0aGUgZWxlbWVudCBpbnN0YW5jZSBzbyB0aGF0IFR5cGVTY3JpcHQncyB0eXBlIGluZmVyZW5jZSBmb3JcbiAgICAgICAgLy8gYEhUTUxFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXJgIHVzaW5nIGBIVE1MRWxlbWVudEV2ZW50TWFwYCB0byBpbmZlciBhbiBhY2N1cmF0ZSB0eXBlIGZvclxuICAgICAgICAvLyBgJGV2ZW50YCBkZXBlbmRpbmcgb24gdGhlIGV2ZW50IG5hbWUuIEZvciB1bmtub3duIGV2ZW50IG5hbWVzLCBUeXBlU2NyaXB0IHJlc29ydHMgdG8gdGhlXG4gICAgICAgIC8vIGJhc2UgYEV2ZW50YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkluZmVyKTtcblxuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZWxJZCwgJ2FkZEV2ZW50TGlzdGVuZXInKSxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogYXJndW1lbnRzICovW3RzLmNyZWF0ZVN0cmluZ0xpdGVyYWwob3V0cHV0Lm5hbWUpLCBoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gaW5wdXRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGUgYCRldmVudGBcbiAgICAgICAgLy8gcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuXG4gICAgICBFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yLnZpc2l0KFxuICAgICAgICAgIG91dHB1dC5oYW5kbGVyLCB0aGlzLnRjYi5pZCwgdGhpcy50Y2IuYm91bmRUYXJnZXQsIHRoaXMudGNiLm9vYlJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFZhbHVlIHVzZWQgdG8gYnJlYWsgYSBjaXJjdWxhciByZWZlcmVuY2UgYmV0d2VlbiBgVGNiT3Bgcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIHJldHVybmVkIHdoZW5ldmVyIGBUY2JPcGBzIGhhdmUgYSBjaXJjdWxhciBkZXBlbmRlbmN5LiBUaGUgZXhwcmVzc2lvbiBpcyBhIG5vbi1udWxsXG4gKiBhc3NlcnRpb24gb2YgdGhlIG51bGwgdmFsdWUgKGluIFR5cGVTY3JpcHQsIHRoZSBleHByZXNzaW9uIGBudWxsIWApLiBUaGlzIGNvbnN0cnVjdGlvbiB3aWxsIGluZmVyXG4gKiB0aGUgbGVhc3QgbmFycm93IHR5cGUgZm9yIHdoYXRldmVyIGl0J3MgYXNzaWduZWQgdG8uXG4gKi9cbmNvbnN0IElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpO1xuXG4vKipcbiAqIE92ZXJhbGwgZ2VuZXJhdGlvbiBjb250ZXh0IGZvciB0aGUgdHlwZSBjaGVjayBibG9jay5cbiAqXG4gKiBgQ29udGV4dGAgaGFuZGxlcyBvcGVyYXRpb25zIGR1cmluZyBjb2RlIGdlbmVyYXRpb24gd2hpY2ggYXJlIGdsb2JhbCB3aXRoIHJlc3BlY3QgdG8gdGhlIHdob2xlXG4gKiBibG9jay4gSXQncyByZXNwb25zaWJsZSBmb3IgdmFyaWFibGUgbmFtZSBhbGxvY2F0aW9uIGFuZCBtYW5hZ2VtZW50IG9mIGFueSBpbXBvcnRzIG5lZWRlZC4gSXRcbiAqIGFsc28gY29udGFpbnMgdGhlIHRlbXBsYXRlIG1ldGFkYXRhIGl0c2VsZi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBwcml2YXRlIG5leHRJZCA9IDE7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBlbnY6IEVudmlyb25tZW50LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciwgcmVhZG9ubHkgaWQ6IFRlbXBsYXRlSWQsXG4gICAgICByZWFkb25seSBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LFxuICAgICAgcHJpdmF0ZSBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PixcbiAgICAgIHJlYWRvbmx5IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pIHt9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGEgbmV3IHZhcmlhYmxlIG5hbWUgZm9yIHVzZSB3aXRoaW4gdGhlIGBDb250ZXh0YC5cbiAgICpcbiAgICogQ3VycmVudGx5IHRoaXMgdXNlcyBhIG1vbm90b25pY2FsbHkgaW5jcmVhc2luZyBjb3VudGVyLCBidXQgaW4gdGhlIGZ1dHVyZSB0aGUgdmFyaWFibGUgbmFtZVxuICAgKiBtaWdodCBjaGFuZ2UgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGRhdGEgYmVpbmcgc3RvcmVkLlxuICAgKi9cbiAgYWxsb2NhdGVJZCgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihgX3Qke3RoaXMubmV4dElkKyt9YCk7XG4gIH1cblxuICBnZXRQaXBlQnlOYW1lKG5hbWU6IHN0cmluZyk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCF0aGlzLnBpcGVzLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmVudi5waXBlSW5zdCh0aGlzLnBpcGVzLmdldChuYW1lKSEpO1xuICB9XG59XG5cbi8qKlxuICogTG9jYWwgc2NvcGUgd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrIGZvciBhIHBhcnRpY3VsYXIgdGVtcGxhdGUuXG4gKlxuICogVGhlIHRvcC1sZXZlbCB0ZW1wbGF0ZSBhbmQgZWFjaCBuZXN0ZWQgYDxuZy10ZW1wbGF0ZT5gIGhhdmUgdGhlaXIgb3duIGBTY29wZWAsIHdoaWNoIGV4aXN0IGluIGFcbiAqIGhpZXJhcmNoeS4gVGhlIHN0cnVjdHVyZSBvZiB0aGlzIGhpZXJhcmNoeSBtaXJyb3JzIHRoZSBzeW50YWN0aWMgc2NvcGVzIGluIHRoZSBnZW5lcmF0ZWQgdHlwZVxuICogY2hlY2sgYmxvY2ssIHdoZXJlIGVhY2ggbmVzdGVkIHRlbXBsYXRlIGlzIGVuY2FzZWQgaW4gYW4gYGlmYCBzdHJ1Y3R1cmUuXG4gKlxuICogQXMgYSB0ZW1wbGF0ZSdzIGBUY2JPcGBzIGFyZSBleGVjdXRlZCBpbiBhIGdpdmVuIGBTY29wZWAsIHN0YXRlbWVudHMgYXJlIGFkZGVkIHZpYVxuICogYGFkZFN0YXRlbWVudCgpYC4gV2hlbiB0aGlzIHByb2Nlc3NpbmcgaXMgY29tcGxldGUsIHRoZSBgU2NvcGVgIGNhbiBiZSB0dXJuZWQgaW50byBhIGB0cy5CbG9ja2BcbiAqIHZpYSBgcmVuZGVyVG9CbG9jaygpYC5cbiAqXG4gKiBJZiBhIGBUY2JPcGAgcmVxdWlyZXMgdGhlIG91dHB1dCBvZiBhbm90aGVyLCBpdCBjYW4gY2FsbCBgcmVzb2x2ZSgpYC5cbiAqL1xuY2xhc3MgU2NvcGUge1xuICAvKipcbiAgICogQSBxdWV1ZSBvZiBvcGVyYXRpb25zIHdoaWNoIG5lZWQgdG8gYmUgcGVyZm9ybWVkIHRvIGdlbmVyYXRlIHRoZSBUQ0IgY29kZSBmb3IgdGhpcyBzY29wZS5cbiAgICpcbiAgICogVGhpcyBhcnJheSBjYW4gY29udGFpbiBlaXRoZXIgYSBgVGNiT3BgIHdoaWNoIGhhcyB5ZXQgdG8gYmUgZXhlY3V0ZWQsIG9yIGEgYHRzLkV4cHJlc3Npb258bnVsbGBcbiAgICogcmVwcmVzZW50aW5nIHRoZSBtZW1vaXplZCByZXN1bHQgb2YgZXhlY3V0aW5nIHRoZSBvcGVyYXRpb24uIEFzIG9wZXJhdGlvbnMgYXJlIGV4ZWN1dGVkLCB0aGVpclxuICAgKiByZXN1bHRzIGFyZSB3cml0dGVuIGludG8gdGhlIGBvcFF1ZXVlYCwgb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIG9wZXJhdGlvbi5cbiAgICpcbiAgICogSWYgYW4gb3BlcmF0aW9uIGlzIGluIHRoZSBwcm9jZXNzIG9mIGJlaW5nIGV4ZWN1dGVkLCBpdCBpcyB0ZW1wb3JhcmlseSBvdmVyd3JpdHRlbiBoZXJlIHdpdGhcbiAgICogYElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFJgLiBUaGlzIHdheSwgaWYgYSBjeWNsZSBpcyBlbmNvdW50ZXJlZCB3aGVyZSBhbiBvcGVyYXRpb25cbiAgICogZGVwZW5kcyB0cmFuc2l0aXZlbHkgb24gaXRzIG93biByZXN1bHQsIHRoZSBpbm5lciBvcGVyYXRpb24gd2lsbCBpbmZlciB0aGUgbGVhc3QgbmFycm93IHR5cGVcbiAgICogdGhhdCBmaXRzIGluc3RlYWQuIFRoaXMgaGFzIHRoZSBzYW1lIHNlbWFudGljcyBhcyBUeXBlU2NyaXB0IGl0c2VsZiB3aGVuIHR5cGVzIGFyZSByZWZlcmVuY2VkXG4gICAqIGNpcmN1bGFybHkuXG4gICAqL1xuICBwcml2YXRlIG9wUXVldWU6IChUY2JPcHx0cy5FeHByZXNzaW9ufG51bGwpW10gPSBbXTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgYFRtcGxBc3RFbGVtZW50YHMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JFbGVtZW50T3BgIGluIHRoZSBgb3BRdWV1ZWBcbiAgICovXG4gIHByaXZhdGUgZWxlbWVudE9wTWFwID0gbmV3IE1hcDxUbXBsQXN0RWxlbWVudCwgbnVtYmVyPigpO1xuICAvKipcbiAgICogQSBtYXAgb2YgbWFwcyB3aGljaCB0cmFja3MgdGhlIGluZGV4IG9mIGBUY2JEaXJlY3RpdmVDdG9yT3BgcyBpbiB0aGUgYG9wUXVldWVgIGZvciBlYWNoXG4gICAqIGRpcmVjdGl2ZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgZGlyZWN0aXZlT3BNYXAgPVxuICAgICAgbmV3IE1hcDxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGltbWVkaWF0ZWx5IG5lc3RlZCA8bmctdGVtcGxhdGU+cyAod2l0aGluIHRoaXMgYFNjb3BlYCkgcmVwcmVzZW50ZWQgYnkgYFRtcGxBc3RUZW1wbGF0ZWBcbiAgICogbm9kZXMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlQ3R4T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgdmFyaWFibGVzIGRlY2xhcmVkIG9uIHRoZSB0ZW1wbGF0ZSB0aGF0IGNyZWF0ZWQgdGhpcyBgU2NvcGVgIChyZXByZXNlbnRlZCBieVxuICAgKiBgVG1wbEFzdFZhcmlhYmxlYCBub2RlcykgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JWYXJpYWJsZU9wYHMgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICovXG4gIHByaXZhdGUgdmFyTWFwID0gbmV3IE1hcDxUbXBsQXN0VmFyaWFibGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICpcbiAgICogRXhlY3V0aW5nIHRoZSBgVGNiT3BgcyBpbiB0aGUgYG9wUXVldWVgIHBvcHVsYXRlcyB0aGlzIGFycmF5LlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBwYXJlbnQ6IFNjb3BlfG51bGwgPSBudWxsLFxuICAgICAgcHJpdmF0ZSBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIGBTY29wZWAgZ2l2ZW4gZWl0aGVyIGEgYFRtcGxBc3RUZW1wbGF0ZWAgb3IgYSBsaXN0IG9mIGBUbXBsQXN0Tm9kZWBzLlxuICAgKlxuICAgKiBAcGFyYW0gdGNiIHRoZSBvdmVyYWxsIGNvbnRleHQgb2YgVENCIGdlbmVyYXRpb24uXG4gICAqIEBwYXJhbSBwYXJlbnQgdGhlIGBTY29wZWAgb2YgdGhlIHBhcmVudCB0ZW1wbGF0ZSAoaWYgYW55KSBvciBgbnVsbGAgaWYgdGhpcyBpcyB0aGUgcm9vdFxuICAgKiBgU2NvcGVgLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVPck5vZGVzIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIHJlcHJlc2VudGluZyB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIHRvXG4gICAqIGNhbGN1bGF0ZSB0aGUgYFNjb3BlYCwgb3IgYSBsaXN0IG9mIG5vZGVzIGlmIG5vIG91dGVyIHRlbXBsYXRlIG9iamVjdCBpcyBhdmFpbGFibGUuXG4gICAqIEBwYXJhbSBndWFyZCBhbiBleHByZXNzaW9uIHRoYXQgaXMgYXBwbGllZCB0byB0aGlzIHNjb3BlIGZvciB0eXBlIG5hcnJvd2luZyBwdXJwb3Nlcy5cbiAgICovXG4gIHN0YXRpYyBmb3JOb2RlcyhcbiAgICAgIHRjYjogQ29udGV4dCwgcGFyZW50OiBTY29wZXxudWxsLCB0ZW1wbGF0ZU9yTm9kZXM6IFRtcGxBc3RUZW1wbGF0ZXwoVG1wbEFzdE5vZGVbXSksXG4gICAgICBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsKTogU2NvcGUge1xuICAgIGNvbnN0IHNjb3BlID0gbmV3IFNjb3BlKHRjYiwgcGFyZW50LCBndWFyZCk7XG5cbiAgICBsZXQgY2hpbGRyZW46IFRtcGxBc3ROb2RlW107XG5cbiAgICAvLyBJZiBnaXZlbiBhbiBhY3R1YWwgYFRtcGxBc3RUZW1wbGF0ZWAgaW5zdGFuY2UsIHRoZW4gcHJvY2VzcyBhbnkgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBpdFxuICAgIC8vIGhhcy5cbiAgICBpZiAodGVtcGxhdGVPck5vZGVzIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUncyB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgbmVlZCB0byBiZSBhZGRlZCBhcyBgVGNiVmFyaWFibGVPcGBzLlxuICAgICAgY29uc3QgdmFyTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRtcGxBc3RWYXJpYWJsZT4oKTtcblxuICAgICAgZm9yIChjb25zdCB2IG9mIHRlbXBsYXRlT3JOb2Rlcy52YXJpYWJsZXMpIHtcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCB2YXJpYWJsZXMgb24gdGhlIGBUbXBsQXN0VGVtcGxhdGVgIGFyZSBvbmx5IGRlY2xhcmVkIG9uY2UuXG4gICAgICAgIGlmICghdmFyTWFwLmhhcyh2Lm5hbWUpKSB7XG4gICAgICAgICAgdmFyTWFwLnNldCh2Lm5hbWUsIHYpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGZpcnN0RGVjbCA9IHZhck1hcC5nZXQodi5uYW1lKSE7XG4gICAgICAgICAgdGNiLm9vYlJlY29yZGVyLmR1cGxpY2F0ZVRlbXBsYXRlVmFyKHRjYi5pZCwgdiwgZmlyc3REZWNsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wSW5kZXggPSBzY29wZS5vcFF1ZXVlLnB1c2gobmV3IFRjYlZhcmlhYmxlT3AodGNiLCBzY29wZSwgdGVtcGxhdGVPck5vZGVzLCB2KSkgLSAxO1xuICAgICAgICBzY29wZS52YXJNYXAuc2V0KHYsIG9wSW5kZXgpO1xuICAgICAgfVxuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXMuY2hpbGRyZW47XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkcmVuID0gdGVtcGxhdGVPck5vZGVzO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgY2hpbGRyZW4pIHtcbiAgICAgIHNjb3BlLmFwcGVuZE5vZGUobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIHVwIGEgYHRzLkV4cHJlc3Npb25gIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2Ygc29tZSBvcGVyYXRpb24gaW4gdGhlIGN1cnJlbnQgYFNjb3BlYCxcbiAgICogaW5jbHVkaW5nIGFueSBwYXJlbnQgc2NvcGUocykuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGEgYFRtcGxBc3ROb2RlYCBvZiB0aGUgb3BlcmF0aW9uIGluIHF1ZXN0aW9uLiBUaGUgbG9va3VwIHBlcmZvcm1lZCB3aWxsIGRlcGVuZCBvblxuICAgKiB0aGUgdHlwZSBvZiB0aGlzIG5vZGU6XG4gICAqXG4gICAqIEFzc3VtaW5nIGBkaXJlY3RpdmVgIGlzIG5vdCBwcmVzZW50LCB0aGVuIGByZXNvbHZlYCB3aWxsIHJldHVybjpcbiAgICpcbiAgICogKiBgVG1wbEFzdEVsZW1lbnRgIC0gcmV0cmlldmUgdGhlIGV4cHJlc3Npb24gZm9yIHRoZSBlbGVtZW50IERPTSBub2RlXG4gICAqICogYFRtcGxBc3RUZW1wbGF0ZWAgLSByZXRyaWV2ZSB0aGUgdGVtcGxhdGUgY29udGV4dCB2YXJpYWJsZVxuICAgKiAqIGBUbXBsQXN0VmFyaWFibGVgIC0gcmV0cmlldmUgYSB0ZW1wbGF0ZSBsZXQtIHZhcmlhYmxlXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RpdmUgaWYgcHJlc2VudCwgYSBkaXJlY3RpdmUgdHlwZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgdG9cbiAgICogbG9vayB1cCBpbnN0ZWFkIG9mIHRoZSBkZWZhdWx0IGZvciBhbiBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICByZXNvbHZlKFxuICAgICAgbm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZSxcbiAgICAgIGRpcmVjdGl2ZT86IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIHRoZSBvcGVyYXRpb24gbG9jYWxseS5cbiAgICBjb25zdCByZXMgPSB0aGlzLnJlc29sdmVMb2NhbChub2RlLCBkaXJlY3RpdmUpO1xuICAgIGlmIChyZXMgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIGlmICh0aGlzLnBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gQ2hlY2sgd2l0aCB0aGUgcGFyZW50LlxuICAgICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmUobm9kZSwgZGlyZWN0aXZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSAke25vZGV9IC8gJHtkaXJlY3RpdmV9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHN0YXRlbWVudCB0byB0aGlzIHNjb3BlLlxuICAgKi9cbiAgYWRkU3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc3RhdGVtZW50cy5cbiAgICovXG4gIHJlbmRlcigpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm9wUXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuZXhlY3V0ZU9wKGkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZW1lbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gZXhwcmVzc2lvbiBvZiBhbGwgdGVtcGxhdGUgZ3VhcmRzIHRoYXQgYXBwbHkgdG8gdGhpcyBzY29wZSwgaW5jbHVkaW5nIHRob3NlIG9mXG4gICAqIHBhcmVudCBzY29wZXMuIElmIG5vIGd1YXJkcyBoYXZlIGJlZW4gYXBwbGllZCwgbnVsbCBpcyByZXR1cm5lZC5cbiAgICovXG4gIGd1YXJkcygpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGxldCBwYXJlbnRHdWFyZHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBTdGFydCB3aXRoIHRoZSBndWFyZHMgZnJvbSB0aGUgcGFyZW50IHNjb3BlLCBpZiBwcmVzZW50LlxuICAgICAgcGFyZW50R3VhcmRzID0gdGhpcy5wYXJlbnQuZ3VhcmRzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ3VhcmQgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoaXMgc2NvcGUgZG9lcyBub3QgaGF2ZSBhIGd1YXJkLCBzbyByZXR1cm4gdGhlIHBhcmVudCdzIGd1YXJkcyBhcyBpcy5cbiAgICAgIHJldHVybiBwYXJlbnRHdWFyZHM7XG4gICAgfSBlbHNlIGlmIChwYXJlbnRHdWFyZHMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlJ3Mgbm8gZ3VhcmRzIGZyb20gdGhlIHBhcmVudCBzY29wZSwgc28gdGhpcyBzY29wZSdzIGd1YXJkIHJlcHJlc2VudHMgYWxsIGF2YWlsYWJsZVxuICAgICAgLy8gZ3VhcmRzLlxuICAgICAgcmV0dXJuIHRoaXMuZ3VhcmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEJvdGggdGhlIHBhcmVudCBzY29wZSBhbmQgdGhpcyBzY29wZSBwcm92aWRlIGEgZ3VhcmQsIHNvIGNyZWF0ZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB0d28uXG4gICAgICAvLyBJdCBpcyBpbXBvcnRhbnQgdGhhdCB0aGUgcGFyZW50IGd1YXJkIGlzIHVzZWQgYXMgbGVmdCBvcGVyYW5kLCBnaXZlbiB0aGF0IGl0IG1heSBwcm92aWRlXG4gICAgICAvLyBuYXJyb3dpbmcgdGhhdCBpcyByZXF1aXJlZCBmb3IgdGhpcyBzY29wZSdzIGd1YXJkIHRvIGJlIHZhbGlkLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShwYXJlbnRHdWFyZHMsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIHRoaXMuZ3VhcmQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUxvY2FsKFxuICAgICAgcmVmOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUgJiYgdGhpcy52YXJNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBgVGNiVmFyaWFibGVPcGAgYXNzb2NpYXRlZCB3aXRoIHRoZSBgVG1wbEFzdFZhcmlhYmxlYC5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnZhck1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSAmJiBkaXJlY3RpdmUgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyB0aGUgY29udGV4dCBvZiB0aGUgZ2l2ZW4gc3ViLXRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlRlbXBsYXRlQ29udGV4dE9wYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudGVtcGxhdGVDdHhPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpICYmXG4gICAgICAgIGRpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuZGlyZWN0aXZlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGRpcmVjdGl2ZSBvbiBhbiBlbGVtZW50IG9yIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIGNvbnN0IGRpck1hcCA9IHRoaXMuZGlyZWN0aXZlT3BNYXAuZ2V0KHJlZikhO1xuICAgICAgaWYgKGRpck1hcC5oYXMoZGlyZWN0aXZlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AoZGlyTWFwLmdldChkaXJlY3RpdmUpISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmIHRoaXMuZWxlbWVudE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIERPTSBub2RlIG9mIGFuIGVsZW1lbnQgaW4gdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLmVsZW1lbnRPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgZXhlY3V0ZU9wYCwgYnV0IGFzc2VydCB0aGF0IHRoZSBvcGVyYXRpb24gYWN0dWFsbHkgcmV0dXJuZWQgYHRzLkV4cHJlc3Npb25gLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlT3Aob3BJbmRleDogbnVtYmVyKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVzID0gdGhpcy5leGVjdXRlT3Aob3BJbmRleCk7XG4gICAgaWYgKHJlcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvciByZXNvbHZpbmcgb3BlcmF0aW9uLCBnb3QgbnVsbGApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYSBwYXJ0aWN1bGFyIGBUY2JPcGAgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgcmVwbGFjZXMgdGhlIG9wZXJhdGlvbiBpbiB0aGUgYG9wUXVldWVgIHdpdGggdGhlIHJlc3VsdCBvZiBleGVjdXRpb24gKG9uY2UgZG9uZSlcbiAgICogYW5kIGFsc28gcHJvdGVjdHMgYWdhaW5zdCBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgZnJvbSB0aGUgb3BlcmF0aW9uIHRvIGl0c2VsZiBieSB0ZW1wb3JhcmlseVxuICAgKiBzZXR0aW5nIHRoZSBvcGVyYXRpb24ncyByZXN1bHQgdG8gYSBzcGVjaWFsIGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGV4ZWN1dGVPcChvcEluZGV4OiBudW1iZXIpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IG9wID0gdGhpcy5vcFF1ZXVlW29wSW5kZXhdO1xuICAgIGlmICghKG9wIGluc3RhbmNlb2YgVGNiT3ApKSB7XG4gICAgICByZXR1cm4gb3A7XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbiBpbiB0aGUgcXVldWUgdG8gaXRzIGNpcmN1bGFyIGZhbGxiYWNrLiBJZiBleGVjdXRpbmcgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiByZXN1bHRzIGluIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSwgdGhpcyB3aWxsIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcCBhbmQgYWxsb3cgZm9yXG4gICAgLy8gdGhlIHJlc29sdXRpb24gb2Ygc3VjaCBjeWNsZXMuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gb3AuY2lyY3VsYXJGYWxsYmFjaygpO1xuICAgIGNvbnN0IHJlcyA9IG9wLmV4ZWN1dGUoKTtcbiAgICAvLyBPbmNlIHRoZSBvcGVyYXRpb24gaGFzIGZpbmlzaGVkIGV4ZWN1dGluZywgaXQncyBzYWZlIHRvIGNhY2hlIHRoZSByZWFsIHJlc3VsdC5cbiAgICB0aGlzLm9wUXVldWVbb3BJbmRleF0gPSByZXM7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kTm9kZShub2RlOiBUbXBsQXN0Tm9kZSk6IHZvaWQge1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IG9wSW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRWxlbWVudE9wKHRoaXMudGNiLCB0aGlzLCBub2RlKSkgLSAxO1xuICAgICAgdGhpcy5lbGVtZW50T3BNYXAuc2V0KG5vZGUsIG9wSW5kZXgpO1xuICAgICAgdGhpcy5hcHBlbmREaXJlY3RpdmVzQW5kSW5wdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgdGhpcy5hcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kTm9kZShjaGlsZCk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrUmVmZXJlbmNlc09mTm9kZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIFRlbXBsYXRlIGNoaWxkcmVuIGFyZSByZW5kZXJlZCBpbiBhIGNoaWxkIHNjb3BlLlxuICAgICAgdGhpcy5hcHBlbmREaXJlY3RpdmVzQW5kSW5wdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgdGhpcy5hcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUZW1wbGF0ZUJvZGllcykge1xuICAgICAgICBjb25zdCBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUNvbnRleHRPcCh0aGlzLnRjYiwgdGhpcykpIC0gMTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLnNldChub2RlLCBjdHhJbmRleCk7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUJvZHlPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja1JlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRleHRJbnRlcnBvbGF0aW9uT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNoZWNrUmVmZXJlbmNlc09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiBub2RlLnJlZmVyZW5jZXMpIHtcbiAgICAgIGlmICh0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRSZWZlcmVuY2VUYXJnZXQocmVmKSA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRjYi5vb2JSZWNvcmRlci5taXNzaW5nUmVmZXJlbmNlVGFyZ2V0KHRoaXMudGNiLmlkLCByZWYpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgaW5wdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIGlucHV0cyBhcmUgdW5jbGFpbWVkIGlucHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChcbiAgICAgICAgICAgIG5ldyBUY2JEb21TY2hlbWFDaGVja2VyT3AodGhpcy50Y2IsIG5vZGUsIC8qIGNoZWNrRWxlbWVudCAqLyB0cnVlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlyTWFwID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZU9wID0gZGlyLmlzR2VuZXJpYyA/IG5ldyBUY2JEaXJlY3RpdmVDdG9yT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFRjYkRpcmVjdGl2ZVR5cGVPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIGNvbnN0IGRpckluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2goZGlyZWN0aXZlT3ApIC0gMTtcbiAgICAgIGRpck1hcC5zZXQoZGlyLCBkaXJJbmRleCk7XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuICAgIHRoaXMuZGlyZWN0aXZlT3BNYXAuc2V0KG5vZGUsIGRpck1hcCk7XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBpbnB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVtb3ZlIGFueSBpbnB1dHMgdGhhdCBpdCBjbGFpbXMgZnJvbSBgZWxlbWVudElucHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIE9iamVjdC5rZXlzKGRpci5pbnB1dHMpKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBkaXIuaW5wdXRzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQoQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZVswXSA6IHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkSW5wdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIHRoaXMgZWxlbWVudCwgdGhlbiBpdCdzIGEgXCJwbGFpblwiIERPTSBlbGVtZW50IChvciBhXG4gICAgICAvLyB3ZWIgY29tcG9uZW50KSwgYW5kIHNob3VsZCBiZSBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuIElmIGFueSBkaXJlY3RpdmVzIG1hdGNoLFxuICAgICAgLy8gd2UgbXVzdCBhc3N1bWUgdGhhdCB0aGUgZWxlbWVudCBjb3VsZCBiZSBjdXN0b20gKGVpdGhlciBhIGNvbXBvbmVudCwgb3IgYSBkaXJlY3RpdmUgbGlrZVxuICAgICAgLy8gPHJvdXRlci1vdXRsZXQ+KSBhbmQgc2hvdWxkbid0IHZhbGlkYXRlIHRoZSBlbGVtZW50IG5hbWUgaXRzZWxmLlxuICAgICAgY29uc3QgY2hlY2tFbGVtZW50ID0gZGlyZWN0aXZlcy5sZW5ndGggPT09IDA7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCBjaGVja0VsZW1lbnQsIGNsYWltZWRJbnB1dHMpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE91dHB1dHNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIG91dHB1dHMgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgY2xhaW1lZE91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIG91dHB1dHMgYXJlIHVuY2xhaW1lZCBvdXRwdXRzLCBzbyBxdWV1ZSBhbiBvcGVyYXRpb25cbiAgICAgIC8vIHRvIGFkZCB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZE91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZE91dHB1dHMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBRdWV1ZSBvcGVyYXRpb25zIGZvciBhbGwgZGlyZWN0aXZlcyB0byBjaGVjayB0aGUgcmVsZXZhbnQgb3V0cHV0cyBmb3IgYSBkaXJlY3RpdmUuXG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRpcmVjdGl2ZU91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgZXhwYW5kaW5nIHRoZSBkaXJlY3RpdmVzLCB3ZSBtaWdodCBuZWVkIHRvIHF1ZXVlIGFuIG9wZXJhdGlvbiB0byBjaGVjayBhbnkgdW5jbGFpbWVkXG4gICAgLy8gb3V0cHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZWdpc3RlciBhbnkgb3V0cHV0cyB0aGF0IGl0IGNsYWltcyBpbiBgY2xhaW1lZE91dHB1dHNgLlxuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dEZpZWxkIG9mIE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSkge1xuICAgICAgICAgIGNsYWltZWRPdXRwdXRzLmFkZChkaXIub3V0cHV0c1tvdXRwdXRGaWVsZF0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBUY2JCb3VuZElucHV0IHtcbiAgYXR0cmlidXRlOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGU7XG4gIGZpZWxkTmFtZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIENyZWF0ZSB0aGUgYGN0eGAgcGFyYW1ldGVyIHRvIHRoZSB0b3AtbGV2ZWwgVENCIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBwYXJhbWV0ZXIgd2l0aCBhIHR5cGUgZXF1aXZhbGVudCB0byB0aGUgY29tcG9uZW50IHR5cGUsIHdpdGggYWxsIGdlbmVyaWMgdHlwZVxuICogcGFyYW1ldGVycyBsaXN0ZWQgKHdpdGhvdXQgdGhlaXIgZ2VuZXJpYyBib3VuZHMpLlxuICovXG5mdW5jdGlvbiB0Y2JDdHhQYXJhbShcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBuYW1lOiB0cy5FbnRpdHlOYW1lLFxuICAgIHVzZUdlbmVyaWNUeXBlOiBib29sZWFuKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICBsZXQgdHlwZUFyZ3VtZW50czogdHMuVHlwZU5vZGVbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIC8vIENoZWNrIGlmIHRoZSBjb21wb25lbnQgaXMgZ2VuZXJpYywgYW5kIHBhc3MgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgaWYgc28uXG4gIGlmIChub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodXNlR2VuZXJpY1R5cGUpIHtcbiAgICAgIHR5cGVBcmd1bWVudHMgPVxuICAgICAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcCgoKSA9PiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShuYW1lLCB0eXBlQXJndW1lbnRzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2N0eCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBgQVNUYCBleHByZXNzaW9uIGFuZCBjb252ZXJ0IGl0IGludG8gYSBgdHMuRXhwcmVzc2lvbmAsIGdlbmVyYXRpbmcgcmVmZXJlbmNlcyB0byB0aGVcbiAqIGNvcnJlY3QgaWRlbnRpZmllcnMgaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHRjYkV4cHJlc3Npb24oYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHRyYW5zbGF0b3IgPSBuZXcgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3IodGNiLCBzY29wZSk7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvciB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCB0Y2I6IENvbnRleHQsIHByb3RlY3RlZCBzY29wZTogU2NvcGUpIHt9XG5cbiAgdHJhbnNsYXRlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gYGFzdFRvVHlwZXNjcmlwdGAgYWN0dWFsbHkgZG9lcyB0aGUgY29udmVyc2lvbi4gQSBzcGVjaWFsIHJlc29sdmVyIGB0Y2JSZXNvbHZlYCBpcyBwYXNzZWRcbiAgICAvLyB3aGljaCBpbnRlcnByZXRzIHNwZWNpZmljIGV4cHJlc3Npb24gbm9kZXMgdGhhdCBpbnRlcmFjdCB3aXRoIHRoZSBgSW1wbGljaXRSZWNlaXZlcmAuIFRoZXNlXG4gICAgLy8gbm9kZXMgYWN0dWFsbHkgcmVmZXIgdG8gaWRlbnRpZmllcnMgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICAgIHJldHVybiBhc3RUb1R5cGVzY3JpcHQoYXN0LCBhc3QgPT4gdGhpcy5yZXNvbHZlKGFzdCksIHRoaXMudGNiLmVudi5jb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYW4gYEFTVGAgZXhwcmVzc2lvbiB3aXRoaW4gdGhlIGdpdmVuIHNjb3BlLlxuICAgKlxuICAgKiBTb21lIGBBU1RgIGV4cHJlc3Npb25zIHJlZmVyIHRvIHRvcC1sZXZlbCBjb25jZXB0cyAocmVmZXJlbmNlcywgdmFyaWFibGVzLCB0aGUgY29tcG9uZW50XG4gICAqIGNvbnRleHQpLiBUaGlzIG1ldGhvZCBhc3Npc3RzIGluIHJlc29sdmluZyB0aG9zZS5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIC8vIFRyeSB0byByZXNvbHZlIGEgYm91bmQgdGFyZ2V0IGZvciB0aGlzIGV4cHJlc3Npb24uIElmIG5vIHN1Y2ggdGFyZ2V0IGlzIGF2YWlsYWJsZSwgdGhlblxuICAgICAgLy8gdGhlIGV4cHJlc3Npb24gaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbCBjb21wb25lbnQgY29udGV4dC4gSW4gdGhhdCBjYXNlLCBgbnVsbGAgaXNcbiAgICAgIC8vIHJldHVybmVkIGhlcmUgdG8gbGV0IGl0IGZhbGwgdGhyb3VnaCByZXNvbHV0aW9uIHNvIGl0IHdpbGwgYmUgY2F1Z2h0IHdoZW4gdGhlXG4gICAgICAvLyBgSW1wbGljaXRSZWNlaXZlcmAgaXMgcmVzb2x2ZWQgaW4gdGhlIGJyYW5jaCBiZWxvdy5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVUYXJnZXQoYXN0KTtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5V3JpdGUgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LnZhbHVlKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUJpbmFyeSh0YXJnZXQsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGV4cHIpKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgLy8gQVNUIGluc3RhbmNlcyByZXByZXNlbnRpbmcgdmFyaWFibGVzIGFuZCByZWZlcmVuY2VzIGxvb2sgdmVyeSBzaW1pbGFyIHRvIHByb3BlcnR5IHJlYWRzXG4gICAgICAvLyBvciBtZXRob2QgY2FsbHMgZnJvbSB0aGUgY29tcG9uZW50IGNvbnRleHQ6IGJvdGggaGF2ZSB0aGUgc2hhcGVcbiAgICAgIC8vIFByb3BlcnR5UmVhZChJbXBsaWNpdFJlY2VpdmVyLCAncHJvcE5hbWUnKSBvciBNZXRob2RDYWxsKEltcGxpY2l0UmVjZWl2ZXIsICdtZXRob2ROYW1lJykuXG4gICAgICAvL1xuICAgICAgLy8gYHRyYW5zbGF0ZWAgd2lsbCBmaXJzdCB0cnkgdG8gYHJlc29sdmVgIHRoZSBvdXRlciBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbC4gSWYgdGhpcyB3b3JrcyxcbiAgICAgIC8vIGl0J3MgYmVjYXVzZSB0aGUgYEJvdW5kVGFyZ2V0YCBmb3VuZCBhbiBleHByZXNzaW9uIHRhcmdldCBmb3IgdGhlIHdob2xlIGV4cHJlc3Npb24sIGFuZFxuICAgICAgLy8gdGhlcmVmb3JlIGB0cmFuc2xhdGVgIHdpbGwgbmV2ZXIgYXR0ZW1wdCB0byBgcmVzb2x2ZWAgdGhlIEltcGxpY2l0UmVjZWl2ZXIgb2YgdGhhdFxuICAgICAgLy8gUHJvcGVydHlSZWFkL01ldGhvZENhbGwuXG4gICAgICAvL1xuICAgICAgLy8gVGhlcmVmb3JlIGlmIGByZXNvbHZlYCBpcyBjYWxsZWQgb24gYW4gYEltcGxpY2l0UmVjZWl2ZXJgLCBpdCdzIGJlY2F1c2Ugbm8gb3V0ZXJcbiAgICAgIC8vIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsIHJlc29sdmVkIHRvIGEgdmFyaWFibGUgb3IgcmVmZXJlbmNlLCBhbmQgdGhlcmVmb3JlIHRoaXMgaXMgYVxuICAgICAgLy8gcHJvcGVydHkgcmVhZCBvciBtZXRob2QgY2FsbCBvbiB0aGUgY29tcG9uZW50IGNvbnRleHQgaXRzZWxmLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2N0eCcpO1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuZXhwKTtcbiAgICAgIGxldCBwaXBlOiB0cy5FeHByZXNzaW9ufG51bGw7XG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZlBpcGVzKSB7XG4gICAgICAgIHBpcGUgPSB0aGlzLnRjYi5nZXRQaXBlQnlOYW1lKGFzdC5uYW1lKTtcbiAgICAgICAgaWYgKHBpcGUgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBObyBwaXBlIGJ5IHRoYXQgbmFtZSBleGlzdHMgaW4gc2NvcGUuIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yLlxuICAgICAgICAgIHRoaXMudGNiLm9vYlJlY29yZGVyLm1pc3NpbmdQaXBlKHRoaXMudGNiLmlkLCBhc3QpO1xuXG4gICAgICAgICAgLy8gUmV0dXJuIGFuICdhbnknIHZhbHVlIHRvIGF0IGxlYXN0IGFsbG93IHRoZSByZXN0IG9mIHRoZSBleHByZXNzaW9uIHRvIGJlIGNoZWNrZWQuXG4gICAgICAgICAgcGlwZSA9IE5VTExfQVNfQU5ZO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwaXBlID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQXNFeHByZXNzaW9uKFxuICAgICAgICAgICAgdHMuY3JlYXRlTnVsbCgpLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSkpO1xuICAgICAgfVxuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0NhbGxNZXRob2QocGlwZSwgJ3RyYW5zZm9ybScsIFtleHByLCAuLi5hcmdzXSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIE1ldGhvZENhbGwgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgLy8gUmVzb2x2ZSB0aGUgc3BlY2lhbCBgJGFueShleHByKWAgc3ludGF4IHRvIGluc2VydCBhIGNhc3Qgb2YgdGhlIGFyZ3VtZW50IHRvIHR5cGUgYGFueWAuXG4gICAgICAvLyBgJGFueShleHByKWAgLT4gYGV4cHIgYXMgYW55YFxuICAgICAgaWYgKGFzdC5uYW1lID09PSAnJGFueScgJiYgYXN0LmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuYXJnc1swXSk7XG4gICAgICAgIGNvbnN0IGV4cHJBc0FueSA9XG4gICAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24oZXhwciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbihleHByQXNBbnkpO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgYSBib3VuZCB0YXJnZXQgZm9yIHRoZSBtZXRob2QsIGFuZCBnZW5lcmF0ZSB0aGUgbWV0aG9kIGNhbGwgaWYgYSB0YXJnZXRcbiAgICAgIC8vIGNvdWxkIGJlIHJlc29sdmVkLiBJZiBubyB0YXJnZXQgaXMgYXZhaWxhYmxlLCB0aGVuIHRoZSBtZXRob2QgaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbFxuICAgICAgLy8gY29tcG9uZW50IGNvbnRleHQsIGluIHdoaWNoIGNhc2UgYG51bGxgIGlzIHJldHVybmVkIHRvIGxldCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgIGJlaW5nXG4gICAgICAvLyByZXNvbHZlZCB0byB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gICAgICBjb25zdCByZWNlaXZlciA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHJlY2VpdmVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRob2QgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh3cmFwRm9yRGlhZ25vc3RpY3MocmVjZWl2ZXIpLCBhc3QubmFtZSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMudHJhbnNsYXRlKGFyZykpO1xuICAgICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUNhbGwobWV0aG9kLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBBU1QgaXNuJ3Qgc3BlY2lhbCBhZnRlciBhbGwuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgYSBnaXZlbiBleHByZXNzaW9uLCBhbmQgdHJhbnNsYXRlcyBpdCBpbnRvIHRoZVxuICAgKiBhcHByb3ByaWF0ZSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZXByZXNlbnRzIHRoZSBib3VuZCB0YXJnZXQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVGFyZ2V0KGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBiaW5kaW5nID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmIChiaW5kaW5nID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGV4cHJlc3Npb24gaGFzIGEgYmluZGluZyB0byBzb21lIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSBpbiB0aGUgdGVtcGxhdGUuIFJlc29sdmUgaXQuXG4gICAgaWYgKGJpbmRpbmcgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUodGhpcy5zY29wZS5yZXNvbHZlKGJpbmRpbmcpKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfSBlbHNlIGlmIChiaW5kaW5nIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0UmVmZXJlbmNlVGFyZ2V0KGJpbmRpbmcpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIHJlZmVyZW5jZSBpcyB1bmJvdW5kLiBUcmF2ZXJzYWwgb2YgdGhlIGBUbXBsQXN0UmVmZXJlbmNlYCBpdHNlbGYgc2hvdWxkIGhhdmVcbiAgICAgICAgLy8gcmVjb3JkZWQgdGhlIGVycm9yIGluIHRoZSBgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyYC5cbiAgICAgICAgLy8gU3RpbGwgY2hlY2sgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24gaWYgcG9zc2libGUgYnkgdXNpbmcgYW4gYGFueWAgdmFsdWUuXG4gICAgICAgIHJldHVybiBOVUxMX0FTX0FOWTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHJlZmVyZW5jZSBpcyBlaXRoZXIgdG8gYW4gZWxlbWVudCwgYW4gPG5nLXRlbXBsYXRlPiBub2RlLCBvciB0byBhIGRpcmVjdGl2ZSBvbiBhblxuICAgICAgLy8gZWxlbWVudCBvciB0ZW1wbGF0ZS5cblxuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMpIHtcbiAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIERPTSBub2RlcyBhcmUgcGlubmVkIHRvICdhbnknLlxuICAgICAgICAgIHJldHVybiBOVUxMX0FTX0FOWTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUodGhpcy5zY29wZS5yZXNvbHZlKHRhcmdldCkpO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICB9IGVsc2UgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzKSB7XG4gICAgICAgICAgLy8gUmVmZXJlbmNlcyB0byBgVGVtcGxhdGVSZWZgcyBwaW5uZWQgdG8gJ2FueScuXG4gICAgICAgICAgcmV0dXJuIE5VTExfQVNfQU5ZO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGlyZWN0IHJlZmVyZW5jZXMgdG8gYW4gPG5nLXRlbXBsYXRlPiBub2RlIHNpbXBseSByZXF1aXJlIGEgdmFsdWUgb2YgdHlwZVxuICAgICAgICAvLyBgVGVtcGxhdGVSZWY8YW55PmAuIFRvIGdldCB0aGlzLCBhbiBleHByZXNzaW9uIG9mIHRoZSBmb3JtXG4gICAgICAgIC8vIGAobnVsbCBhcyBhbnkgYXMgVGVtcGxhdGVSZWY8YW55PilgIGlzIGNvbnN0cnVjdGVkLlxuICAgICAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb24gPSB0cy5jcmVhdGVOdWxsKCk7XG4gICAgICAgIHZhbHVlID0gdHMuY3JlYXRlQXNFeHByZXNzaW9uKHZhbHVlLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICAgIHZhbHVlID0gdHMuY3JlYXRlQXNFeHByZXNzaW9uKFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9jb3JlJywgJ1RlbXBsYXRlUmVmJywgW0RZTkFNSUNfVFlQRV0pKTtcbiAgICAgICAgdmFsdWUgPSB0cy5jcmVhdGVQYXJlbih2YWx1ZSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8odmFsdWUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlcykge1xuICAgICAgICAgIC8vIFJlZmVyZW5jZXMgdG8gZGlyZWN0aXZlcyBhcmUgcGlubmVkIHRvICdhbnknLlxuICAgICAgICAgIHJldHVybiBOVUxMX0FTX0FOWTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUodGhpcy5zY29wZS5yZXNvbHZlKHRhcmdldC5ub2RlLCB0YXJnZXQuZGlyZWN0aXZlKSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlYWNoYWJsZTogJHtiaW5kaW5nfWApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgYSBkaXJlY3RpdmUgaW5zdGFuY2Ugb24gYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLCBpbmZlcnJpbmcgYSB0eXBlIGZvclxuICogdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBmcm9tIGFueSBib3VuZCBpbnB1dHMuXG4gKi9cbmZ1bmN0aW9uIHRjYkNhbGxUeXBlQ3RvcihcbiAgICBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsIGlucHV0czogVGNiRGlyZWN0aXZlSW5wdXRbXSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0eXBlQ3RvciA9IHRjYi5lbnYudHlwZUN0b3JGb3IoZGlyKTtcblxuICAvLyBDb25zdHJ1Y3QgYW4gYXJyYXkgb2YgYHRzLlByb3BlcnR5QXNzaWdubWVudGBzIGZvciBlYWNoIG9mIHRoZSBkaXJlY3RpdmUncyBpbnB1dHMuXG4gIGNvbnN0IG1lbWJlcnMgPSBpbnB1dHMubWFwKGlucHV0ID0+IHtcbiAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGlucHV0LmZpZWxkKTtcblxuICAgIGlmIChpbnB1dC50eXBlID09PSAnYmluZGluZycpIHtcbiAgICAgIC8vIEZvciBib3VuZCBpbnB1dHMsIHRoZSBwcm9wZXJ0eSBpcyBhc3NpZ25lZCB0aGUgYmluZGluZyBleHByZXNzaW9uLlxuICAgICAgbGV0IGV4cHIgPSBpbnB1dC5leHByZXNzaW9uO1xuICAgICAgaWYgKCF0Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcGVydHlOYW1lLCB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcikpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhhc3NpZ25tZW50LCBpbnB1dC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBhc3NpZ25tZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBIHR5cGUgY29uc3RydWN0b3IgaXMgcmVxdWlyZWQgdG8gYmUgY2FsbGVkIHdpdGggYWxsIGlucHV0IHByb3BlcnRpZXMsIHNvIGFueSB1bnNldFxuICAgICAgLy8gaW5wdXRzIGFyZSBzaW1wbHkgYXNzaWduZWQgYSB2YWx1ZSBvZiB0eXBlIGBhbnlgIHRvIGlnbm9yZSB0aGVtLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIE5VTExfQVNfQU5ZKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENhbGwgdGhlIGBuZ1R5cGVDdG9yYCBtZXRob2Qgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcywgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCBhcmd1bWVudCBjcmVhdGVkXG4gIC8vIGZyb20gdGhlIG1hdGNoZWQgaW5wdXRzLlxuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHlwZUN0b3IsXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW3RzLmNyZWF0ZU9iamVjdExpdGVyYWwobWVtYmVycyldKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm91bmRJbnB1dHMoXG4gICAgZGlyZWN0aXZlOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgIHRjYjogQ29udGV4dCk6IFRjYkJvdW5kSW5wdXRbXSB7XG4gIGNvbnN0IGJvdW5kSW5wdXRzOiBUY2JCb3VuZElucHV0W10gPSBbXTtcblxuICBjb25zdCBwcm9wZXJ0eVRvRmllbGROYW1lcyA9IGludmVydElucHV0cyhkaXJlY3RpdmUuaW5wdXRzKTtcbiAgY29uc3QgcHJvY2Vzc0F0dHJpYnV0ZSA9IChhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGUpID0+IHtcbiAgICAvLyBTa2lwIG5vbi1wcm9wZXJ0eSBiaW5kaW5ncy5cbiAgICBpZiAoYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBhdHRyLnR5cGUgIT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2tpcCB0ZXh0IGF0dHJpYnV0ZXMgaWYgY29uZmlndXJlZCB0byBkbyBzby5cbiAgICBpZiAoIXRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyAmJiBhdHRyIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTa2lwIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGFuIGlucHV0IGZvciBpdC5cbiAgICBpZiAoIXByb3BlcnR5VG9GaWVsZE5hbWVzLmhhcyhhdHRyLm5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZpZWxkTmFtZXMgPSBwcm9wZXJ0eVRvRmllbGROYW1lcy5nZXQoYXR0ci5uYW1lKSE7XG4gICAgYm91bmRJbnB1dHMucHVzaCh7YXR0cmlidXRlOiBhdHRyLCBmaWVsZE5hbWVzfSk7XG4gIH07XG5cbiAgbm9kZS5pbnB1dHMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgbm9kZS5hdHRyaWJ1dGVzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgbm9kZS50ZW1wbGF0ZUF0dHJzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIH1cblxuICByZXR1cm4gYm91bmRJbnB1dHM7XG59XG5cbi8qKlxuICogVHJhbnNsYXRlcyB0aGUgZ2l2ZW4gYXR0cmlidXRlIGJpbmRpbmcgdG8gYSBgdHMuRXhwcmVzc2lvbmAuXG4gKi9cbmZ1bmN0aW9uIHRyYW5zbGF0ZUlucHV0KFxuICAgIGF0dHI6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAvLyBQcm9kdWNlIGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiB0aGUgYmluZGluZy5cbiAgICByZXR1cm4gdGNiRXhwcmVzc2lvbihhdHRyLnZhbHVlLCB0Y2IsIHNjb3BlKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBGb3IgcmVndWxhciBhdHRyaWJ1dGVzIHdpdGggYSBzdGF0aWMgc3RyaW5nIHZhbHVlLCB1c2UgdGhlIHJlcHJlc2VudGVkIHN0cmluZyBsaXRlcmFsLlxuICAgIHJldHVybiB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGF0dHIudmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogSW52ZXJ0cyB0aGUgaW5wdXQtbWFwcGluZyBmcm9tIGZpZWxkLXRvLXByb3BlcnR5IG5hbWUgaW50byBwcm9wZXJ0eS10by1maWVsZCBuYW1lLCB0byBiZSBhYmxlXG4gKiB0byBtYXRjaCBhIHByb3BlcnR5IGluIGEgdGVtcGxhdGUgd2l0aCB0aGUgY29ycmVzcG9uZGluZyBmaWVsZCBvbiBhIGRpcmVjdGl2ZS5cbiAqL1xuZnVuY3Rpb24gaW52ZXJ0SW5wdXRzKGlucHV0czoge1tmaWVsZE5hbWU6IHN0cmluZ106IHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddfSk6XG4gICAgTWFwPHN0cmluZywgc3RyaW5nW10+IHtcbiAgY29uc3QgcHJvcGVydHlUb0ZpZWxkTmFtZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG4gIGZvciAoY29uc3QgZmllbGROYW1lIG9mIE9iamVjdC5rZXlzKGlucHV0cykpIHtcbiAgICBjb25zdCBwcm9wZXJ0eU5hbWVzID0gaW5wdXRzW2ZpZWxkTmFtZV07XG4gICAgY29uc3QgcHJvcGVydHlOYW1lID0gQXJyYXkuaXNBcnJheShwcm9wZXJ0eU5hbWVzKSA/IHByb3BlcnR5TmFtZXNbMF0gOiBwcm9wZXJ0eU5hbWVzO1xuXG4gICAgaWYgKHByb3BlcnR5VG9GaWVsZE5hbWVzLmhhcyhwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICBwcm9wZXJ0eVRvRmllbGROYW1lcy5nZXQocHJvcGVydHlOYW1lKSEucHVzaChmaWVsZE5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9wZXJ0eVRvRmllbGROYW1lcy5zZXQocHJvcGVydHlOYW1lLCBbZmllbGROYW1lXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcm9wZXJ0eVRvRmllbGROYW1lcztcbn1cblxuLyoqXG4gKiBBbiBpbnB1dCBiaW5kaW5nIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIGZpZWxkIG9mIGEgZGlyZWN0aXZlLlxuICovXG5pbnRlcmZhY2UgVGNiRGlyZWN0aXZlQm91bmRJbnB1dCB7XG4gIHR5cGU6ICdiaW5kaW5nJztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgYSBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlIHRoYXQgaXMgc2V0LlxuICAgKi9cbiAgZmllbGQ6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGB0cy5FeHByZXNzaW9uYCBjb3JyZXNwb25kaW5nIHdpdGggdGhlIGlucHV0IGJpbmRpbmcgZXhwcmVzc2lvbi5cbiAgICovXG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG5cbiAgLyoqXG4gICAqIFRoZSBzb3VyY2Ugc3BhbiBvZiB0aGUgZnVsbCBhdHRyaWJ1dGUgYmluZGluZy5cbiAgICovXG4gIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbjtcbn1cblxuLyoqXG4gKiBJbmRpY2F0ZXMgdGhhdCBhIGNlcnRhaW4gZmllbGQgb2YgYSBkaXJlY3RpdmUgZG9lcyBub3QgaGF2ZSBhIGNvcnJlc3BvbmRpbmcgaW5wdXQgYmluZGluZy5cbiAqL1xuaW50ZXJmYWNlIFRjYkRpcmVjdGl2ZVVuc2V0SW5wdXQge1xuICB0eXBlOiAndW5zZXQnO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiBhIGZpZWxkIG9uIHRoZSBkaXJlY3RpdmUgZm9yIHdoaWNoIG5vIGlucHV0IGJpbmRpbmcgaXMgcHJlc2VudC5cbiAgICovXG4gIGZpZWxkOiBzdHJpbmc7XG59XG5cbnR5cGUgVGNiRGlyZWN0aXZlSW5wdXQgPSBUY2JEaXJlY3RpdmVCb3VuZElucHV0fFRjYkRpcmVjdGl2ZVVuc2V0SW5wdXQ7XG5cbmNvbnN0IEVWRU5UX1BBUkFNRVRFUiA9ICckZXZlbnQnO1xuXG5jb25zdCBlbnVtIEV2ZW50UGFyYW1UeXBlIHtcbiAgLyogR2VuZXJhdGVzIGNvZGUgdG8gaW5mZXIgdGhlIHR5cGUgb2YgYCRldmVudGAgYmFzZWQgb24gaG93IHRoZSBsaXN0ZW5lciBpcyByZWdpc3RlcmVkLiAqL1xuICBJbmZlcixcblxuICAvKiBEZWNsYXJlcyB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgcGFyYW1ldGVyIGFzIGBhbnlgLiAqL1xuICBBbnksXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJvdyBmdW5jdGlvbiB0byBiZSB1c2VkIGFzIGhhbmRsZXIgZnVuY3Rpb24gZm9yIGV2ZW50IGJpbmRpbmdzLiBUaGUgaGFuZGxlclxuICogZnVuY3Rpb24gaGFzIGEgc2luZ2xlIHBhcmFtZXRlciBgJGV2ZW50YCBhbmQgdGhlIGJvdW5kIGV2ZW50J3MgaGFuZGxlciBgQVNUYCByZXByZXNlbnRlZCBhcyBhXG4gKiBUeXBlU2NyaXB0IGV4cHJlc3Npb24gYXMgaXRzIGJvZHkuXG4gKlxuICogV2hlbiBgZXZlbnRUeXBlYCBpcyBzZXQgdG8gYEluZmVyYCwgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciB3aWxsIG5vdCBoYXZlIGFuIGV4cGxpY2l0IHR5cGUuIFRoaXNcbiAqIGFsbG93cyBmb3IgdGhlIGNyZWF0ZWQgaGFuZGxlciBmdW5jdGlvbiB0byBoYXZlIGl0cyBgJGV2ZW50YCBwYXJhbWV0ZXIncyB0eXBlIGluZmVycmVkIGJhc2VkIG9uXG4gKiBob3cgaXQncyB1c2VkLCB0byBlbmFibGUgc3RyaWN0IHR5cGUgY2hlY2tpbmcgb2YgZXZlbnQgYmluZGluZ3MuIFdoZW4gc2V0IHRvIGBBbnlgLCB0aGUgYCRldmVudGBcbiAqIHBhcmFtZXRlciB3aWxsIGhhdmUgYW4gZXhwbGljaXQgYGFueWAgdHlwZSwgZWZmZWN0aXZlbHkgZGlzYWJsaW5nIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50XG4gKiBiaW5kaW5ncy4gQWx0ZXJuYXRpdmVseSwgYW4gZXhwbGljaXQgdHlwZSBjYW4gYmUgcGFzc2VkIGZvciB0aGUgYCRldmVudGAgcGFyYW1ldGVyLlxuICovXG5mdW5jdGlvbiB0Y2JDcmVhdGVFdmVudEhhbmRsZXIoXG4gICAgZXZlbnQ6IFRtcGxBc3RCb3VuZEV2ZW50LCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSxcbiAgICBldmVudFR5cGU6IEV2ZW50UGFyYW1UeXBlfHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGhhbmRsZXIgPSB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGV2ZW50LmhhbmRsZXIsIHRjYiwgc2NvcGUpO1xuXG4gIGxldCBldmVudFBhcmFtVHlwZTogdHMuVHlwZU5vZGV8dW5kZWZpbmVkO1xuICBpZiAoZXZlbnRUeXBlID09PSBFdmVudFBhcmFtVHlwZS5JbmZlcikge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKGV2ZW50VHlwZSA9PT0gRXZlbnRQYXJhbVR5cGUuQW55KSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgfSBlbHNlIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IGV2ZW50VHlwZTtcbiAgfVxuXG4gIC8vIE9idGFpbiBhbGwgZ3VhcmRzIHRoYXQgaGF2ZSBiZWVuIGFwcGxpZWQgdG8gdGhlIHNjb3BlIGFuZCBpdHMgcGFyZW50cywgYXMgdGhleSBoYXZlIHRvIGJlXG4gIC8vIHJlcGVhdGVkIHdpdGhpbiB0aGUgaGFuZGxlciBmdW5jdGlvbiBmb3IgdGhlaXIgbmFycm93aW5nIHRvIGJlIGluIGVmZmVjdCB3aXRoaW4gdGhlIGhhbmRsZXIuXG4gIGNvbnN0IGd1YXJkcyA9IHNjb3BlLmd1YXJkcygpO1xuXG4gIGxldCBib2R5OiB0cy5TdGF0ZW1lbnQgPSB0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpO1xuICBpZiAoZ3VhcmRzICE9PSBudWxsKSB7XG4gICAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBgaWZgIHN0YXRlbWVudCBjb250YWluaW5nIGFsbCBndWFyZHMgdGhhdCBoYXZlIHRvIGJlIGFwcGxpZWQuXG4gICAgYm9keSA9IHRzLmNyZWF0ZUlmKGd1YXJkcywgYm9keSk7XG4gIH1cblxuICBjb25zdCBldmVudFBhcmFtID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBFVkVOVF9QQVJBTUVURVIsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gZXZlbnRQYXJhbVR5cGUpO1xuXG4gIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkV4cHJlc3Npb24oXG4gICAgICAvKiBtb2RpZmllciAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tldmVudFBhcmFtXSxcbiAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCksXG4gICAgICAvKiBib2R5ICovIHRzLmNyZWF0ZUJsb2NrKFtib2R5XSkpO1xufVxuXG4vKipcbiAqIFNpbWlsYXIgdG8gYHRjYkV4cHJlc3Npb25gLCB0aGlzIGZ1bmN0aW9uIGNvbnZlcnRzIHRoZSBwcm92aWRlZCBgQVNUYCBleHByZXNzaW9uIGludG8gYVxuICogYHRzLkV4cHJlc3Npb25gLCB3aXRoIHNwZWNpYWwgaGFuZGxpbmcgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHRoYXQgY2FuIGJlIHVzZWQgd2l0aGluIGV2ZW50XG4gKiBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gdGNiRXZlbnRIYW5kbGVyRXhwcmVzc2lvbihhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXZlbnRIYW5kbGVyVHJhbnNsYXRvciBleHRlbmRzIFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yIHtcbiAgcHJvdGVjdGVkIHJlc29sdmUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIC8vIFJlY29nbml6ZSBhIHByb3BlcnR5IHJlYWQgb24gdGhlIGltcGxpY2l0IHJlY2VpdmVyIGNvcnJlc3BvbmRpbmcgd2l0aCB0aGUgZXZlbnQgcGFyYW1ldGVyXG4gICAgLy8gdGhhdCBpcyBhdmFpbGFibGUgaW4gZXZlbnQgYmluZGluZ3MuIFNpbmNlIHRoaXMgdmFyaWFibGUgaXMgYSBwYXJhbWV0ZXIgb2YgdGhlIGhhbmRsZXJcbiAgICAvLyBmdW5jdGlvbiB0aGF0IHRoZSBjb252ZXJ0ZWQgZXhwcmVzc2lvbiBiZWNvbWVzIGEgY2hpbGQgb2YsIGp1c3QgY3JlYXRlIGEgcmVmZXJlbmNlIHRvIHRoZVxuICAgIC8vIHBhcmFtZXRlciBieSBpdHMgbmFtZS5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgYXN0Lm5hbWUgPT09IEVWRU5UX1BBUkFNRVRFUikge1xuICAgICAgY29uc3QgZXZlbnQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKEVWRU5UX1BBUkFNRVRFUik7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGV2ZW50LCBhc3QubmFtZVNwYW4pO1xuICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXNvbHZlKGFzdCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2sobm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPik6IGJvb2xlYW4ge1xuICAvLyBJbiBvcmRlciB0byBxdWFsaWZ5IGZvciBhIGRlY2xhcmVkIFRDQiAobm90IGlubGluZSkgdHdvIGNvbmRpdGlvbnMgbXVzdCBiZSBtZXQ6XG4gIC8vIDEpIHRoZSBjbGFzcyBtdXN0IGJlIGV4cG9ydGVkXG4gIC8vIDIpIGl0IG11c3Qgbm90IGhhdmUgY29uc3RyYWluZWQgZ2VuZXJpYyB0eXBlc1xuICBpZiAoIWNoZWNrSWZDbGFzc0lzRXhwb3J0ZWQobm9kZSkpIHtcbiAgICAvLyBDb25kaXRpb24gMSBpcyBmYWxzZSwgdGhlIGNsYXNzIGlzIG5vdCBleHBvcnRlZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmICghY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQobm9kZSkpIHtcbiAgICAvLyBDb25kaXRpb24gMiBpcyBmYWxzZSwgdGhlIGNsYXNzIGhhcyBjb25zdHJhaW5lZCBnZW5lcmljIHR5cGVzXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=