/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
     * A `TcbOp` which constructs an instance of a directive with types inferred from its inputs, which
     * also checks the bindings to the directive in the process.
     *
     * Executing this operation returns a reference to the directive instance variable with its inferred
     * type.
     */
    var TcbDirectiveOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveOp, _super);
        function TcbDirectiveOp(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        TcbDirectiveOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            // Process the directive and construct expressions for each of its bindings.
            var inputs = tcbGetDirectiveInputs(this.node, this.dir, this.tcb, this.scope);
            // Call the type constructor of the directive to infer a type, and assign the directive
            // instance.
            var typeCtor = tcbCallTypeCtor(this.dir, this.tcb, inputs);
            diagnostics_1.addParseSpanInfo(typeCtor, this.node.sourceSpan);
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, typeCtor));
            return id;
        };
        return TcbDirectiveOp;
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
            var e_2, _a;
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
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
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
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
            var e_4, _a, e_5, _b;
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
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_4) throw e_4.error; }
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
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_5) throw e_5.error; }
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
            var e_6, _a;
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
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
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
        Context.prototype.allocateId = function () { return ts.createIdentifier("_t" + this.nextId++); };
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
             * A map of maps which tracks the index of `TcbDirectiveOp`s in the `opQueue` for each directive
             * on a `TmplAstElement` or `TmplAstTemplate` node.
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
            var e_7, _a, e_8, _b;
            var scope = new Scope(tcb, parent, guard);
            var children;
            // If given an actual `TmplAstTemplate` instance, then process any additional information it
            // has.
            if (templateOrNodes instanceof compiler_1.TmplAstTemplate) {
                try {
                    // The template's variable declarations need to be added as `TcbVariableOp`s.
                    for (var _c = tslib_1.__values(templateOrNodes.variables), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var v = _d.value;
                        var opIndex = scope.opQueue.push(new TcbVariableOp(tcb, scope, templateOrNodes, v)) - 1;
                        scope.varMap.set(v, opIndex);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_7) throw e_7.error; }
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
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (children_1_1 && !children_1_1.done && (_b = children_1.return)) _b.call(children_1);
                }
                finally { if (e_8) throw e_8.error; }
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
        Scope.prototype.addStatement = function (stmt) { this.statements.push(stmt); };
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
            // Set the result of the operation in the queue to a special expression. If executing this
            // operation results in a circular dependency, this will break the cycle and infer the least
            // narrow type where needed (which is how TypeScript deals with circular dependencies in types).
            this.opQueue[opIndex] = INFER_TYPE_FOR_CIRCULAR_OP_EXPR;
            var res = op.execute();
            // Once the operation has finished executing, it's safe to cache the real result.
            this.opQueue[opIndex] = res;
            return res;
        };
        Scope.prototype.appendNode = function (node) {
            var e_9, _a;
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
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_9) throw e_9.error; }
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
            var e_10, _a;
            try {
                for (var _b = tslib_1.__values(node.references), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var ref = _c.value;
                    if (this.tcb.boundTarget.getReferenceTarget(ref) === null) {
                        this.tcb.oobRecorder.missingReferenceTarget(this.tcb.id, ref);
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_10) throw e_10.error; }
            }
        };
        Scope.prototype.appendDirectivesAndInputsOfNode = function (node) {
            var e_11, _a, e_12, _b, e_13, _c;
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
                    var dirIndex = this.opQueue.push(new TcbDirectiveOp(this.tcb, this, node, dir)) - 1;
                    dirMap.set(dir, dirIndex);
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (directives_2_1 && !directives_2_1.done && (_a = directives_2.return)) _a.call(directives_2);
                }
                finally { if (e_11) throw e_11.error; }
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
                            for (var _d = (e_13 = void 0, tslib_1.__values(Object.keys(dir.inputs))), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var fieldName = _e.value;
                                var value = dir.inputs[fieldName];
                                claimedInputs.add(Array.isArray(value) ? value[0] : value);
                            }
                        }
                        catch (e_13_1) { e_13 = { error: e_13_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_13) throw e_13.error; }
                        }
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (directives_3_1 && !directives_3_1.done && (_b = directives_3.return)) _b.call(directives_3);
                    }
                    finally { if (e_12) throw e_12.error; }
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
            var e_14, _a, e_15, _b, e_16, _c;
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
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (directives_4_1 && !directives_4_1.done && (_a = directives_4.return)) _a.call(directives_4);
                }
                finally { if (e_14) throw e_14.error; }
            }
            // After expanding the directives, we might need to queue an operation to check any unclaimed
            // outputs.
            if (node instanceof compiler_1.TmplAstElement) {
                try {
                    // Go through the directives and register any outputs that it claims in `claimedOutputs`.
                    for (var directives_5 = tslib_1.__values(directives), directives_5_1 = directives_5.next(); !directives_5_1.done; directives_5_1 = directives_5.next()) {
                        var dir = directives_5_1.value;
                        try {
                            for (var _d = (e_16 = void 0, tslib_1.__values(Object.keys(dir.outputs))), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var outputField = _e.value;
                                claimedOutputs.add(dir.outputs[outputField]);
                            }
                        }
                        catch (e_16_1) { e_16 = { error: e_16_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_16) throw e_16.error; }
                        }
                    }
                }
                catch (e_15_1) { e_15 = { error: e_15_1 }; }
                finally {
                    try {
                        if (directives_5_1 && !directives_5_1.done && (_b = directives_5.return)) _b.call(directives_5);
                    }
                    finally { if (e_15) throw e_15.error; }
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
    function tcbGetDirectiveInputs(el, dir, tcb, scope) {
        var e_17, _a;
        // Only the first binding to a property is written.
        // TODO(alxhub): produce an error for duplicate bindings to the same property, independently of
        // this logic.
        var directiveInputs = new Map();
        // `dir.inputs` is an object map of field names on the directive class to property names.
        // This is backwards from what's needed to match bindings - a map of properties to field names
        // is desired. Invert `dir.inputs` into `propMatch` to create this map.
        var propMatch = new Map();
        var inputs = dir.inputs;
        Object.keys(inputs).forEach(function (key) {
            Array.isArray(inputs[key]) ? propMatch.set(inputs[key][0], key) :
                propMatch.set(inputs[key], key);
        });
        el.inputs.forEach(processAttribute);
        el.attributes.forEach(processAttribute);
        if (el instanceof compiler_1.TmplAstTemplate) {
            el.templateAttrs.forEach(processAttribute);
        }
        try {
            // Add unset directive inputs for each of the remaining unset fields.
            // Note: it's actually important here that `propMatch.values()` isn't used, as there can be
            // multiple fields which share the same property name and only one of them will be listed as a
            // value in `propMatch`.
            for (var _b = tslib_1.__values(Object.keys(inputs)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var field = _c.value;
                if (!directiveInputs.has(field)) {
                    directiveInputs.set(field, { type: 'unset', field: field });
                }
            }
        }
        catch (e_17_1) { e_17 = { error: e_17_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_17) throw e_17.error; }
        }
        return Array.from(directiveInputs.values());
        /**
         * Add a binding expression to the map for each input/template attribute of the directive that has
         * a matching binding.
         */
        function processAttribute(attr) {
            // Skip non-property bindings.
            if (attr instanceof compiler_1.TmplAstBoundAttribute && attr.type !== 0 /* Property */) {
                return;
            }
            // Skip text attributes if configured to do so.
            if (!tcb.env.config.checkTypeOfAttributes && attr instanceof compiler_1.TmplAstTextAttribute) {
                return;
            }
            // Skip the attribute if the directive does not have an input for it.
            if (!propMatch.has(attr.name)) {
                return;
            }
            var field = propMatch.get(attr.name);
            // Skip the attribute if a previous binding also wrote to it.
            if (directiveInputs.has(field)) {
                return;
            }
            var expr;
            if (attr instanceof compiler_1.TmplAstBoundAttribute) {
                // Produce an expression representing the value of the binding.
                expr = tcbExpression(attr.value, tcb, scope);
            }
            else {
                // For regular attributes with a static string value, use the represented string literal.
                expr = ts.createStringLiteral(attr.value);
            }
            directiveInputs.set(field, {
                type: 'binding',
                field: field,
                expression: expr,
                sourceSpan: attr.sourceSpan,
            });
        }
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
                diagnostics_1.addParseSpanInfo(event_1, ast.sourceSpan);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEyVztJQUMzVywrQkFBaUM7SUFNakMseUZBQXFHO0lBR3JHLHVGQUEwRDtJQUUxRCx1R0FBK0Q7SUFDL0QsaUZBQWlLO0lBSWpLOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQkc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsR0FBZ0IsRUFBRSxHQUFxRCxFQUFFLElBQW1CLEVBQzVGLElBQTRCLEVBQUUsZ0JBQWtDLEVBQ2hFLFdBQXdDO1FBQzFDLElBQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUNuQixHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3RixJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBVSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3RixJQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxtRUFBaUUsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO1NBQ3ZGO1FBQ0QsSUFBTSxTQUFTLEdBQUcsQ0FBQyxXQUFXLENBQUMs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O2dCQUN2RSxHQUFHLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBRTtnQkFDaEMsSUFBTSxPQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNuRCw4QkFBZ0IsQ0FBQyxPQUFLLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN4QyxPQUFPLE9BQUssQ0FBQzthQUNkO1lBRUQsT0FBTyxpQkFBTSxPQUFPLFlBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQWZELENBQXdDLHVCQUF1QixHQWU5RDtJQUVELFNBQWdCLDRCQUE0QixDQUFDLElBQTJDO1FBQ3RGLGtGQUFrRjtRQUNsRixnQ0FBZ0M7UUFDaEMsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxnQ0FBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQyxtREFBbUQ7WUFDbkQsT0FBTyxJQUFJLENBQUM7U0FDYjthQUFNLElBQUksQ0FBQyx1Q0FBNkIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvQyxnRUFBZ0U7WUFDaEUsT0FBTyxJQUFJLENBQUM7U0FDYjthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7SUFiRCxvRUFhQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEJpbmRpbmdQaXBlLCBCaW5kaW5nVHlwZSwgQm91bmRUYXJnZXQsIERZTkFNSUNfVFlQRSwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgUGFyc2VTb3VyY2VTcGFuLCBQYXJzZWRFdmVudFR5cGUsIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgU2NoZW1hTWV0YWRhdGEsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtUZW1wbGF0ZUlkLCBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHthZGRQYXJzZVNwYW5JbmZvLCBhZGRUZW1wbGF0ZUlkLCBpZ25vcmVEaWFnbm9zdGljcywgd3JhcEZvckRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlcn0gZnJvbSAnLi9kb20nO1xuaW1wb3J0IHtFbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge05VTExfQVNfQU5ZLCBhc3RUb1R5cGVzY3JpcHR9IGZyb20gJy4vZXhwcmVzc2lvbic7XG5pbXBvcnQge091dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcn0gZnJvbSAnLi9vb2InO1xuaW1wb3J0IHtFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yfSBmcm9tICcuL3RlbXBsYXRlX3NlbWFudGljcyc7XG5pbXBvcnQge2NoZWNrSWZDbGFzc0lzRXhwb3J0ZWQsIGNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kLCB0c0NhbGxNZXRob2QsIHRzQ2FzdFRvQW55LCB0c0NyZWF0ZUVsZW1lbnQsIHRzQ3JlYXRlVmFyaWFibGUsIHRzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuXG5cblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBmb3IgYSBjb21wb25lbnQsIGFuZCBtZXRhZGF0YSByZWdhcmRpbmcgdGhhdCBjb21wb25lbnQsIGNvbXBvc2UgYVxuICogXCJ0eXBlIGNoZWNrIGJsb2NrXCIgZnVuY3Rpb24uXG4gKlxuICogV2hlbiBwYXNzZWQgdGhyb3VnaCBUeXBlU2NyaXB0J3MgVHlwZUNoZWNrZXIsIHR5cGUgZXJyb3JzIHRoYXQgYXJpc2Ugd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrXG4gKiBmdW5jdGlvbiBpbmRpY2F0ZSBpc3N1ZXMgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAqXG4gKiBBcyBhIHNpZGUgZWZmZWN0IG9mIGdlbmVyYXRpbmcgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQsIGB0cy5EaWFnbm9zdGljYHMgbWF5IGFsc28gYmUgcHJvZHVjZWRcbiAqIGRpcmVjdGx5IGZvciBpc3N1ZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSB3aGljaCBhcmUgaWRlbnRpZmllZCBkdXJpbmcgZ2VuZXJhdGlvbi4gVGhlc2UgaXNzdWVzIGFyZVxuICogcmVjb3JkZWQgaW4gZWl0aGVyIHRoZSBgZG9tU2NoZW1hQ2hlY2tlcmAgKHdoaWNoIGNoZWNrcyB1c2FnZSBvZiBET00gZWxlbWVudHMgYW5kIGJpbmRpbmdzKSBhc1xuICogd2VsbCBhcyB0aGUgYG9vYlJlY29yZGVyYCAod2hpY2ggcmVjb3JkcyBlcnJvcnMgd2hlbiB0aGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRvciBpcyB1bmFibGVcbiAqIHRvIHN1ZmZpY2llbnRseSB1bmRlcnN0YW5kIGEgdGVtcGxhdGUpLlxuICpcbiAqIEBwYXJhbSBlbnYgYW4gYEVudmlyb25tZW50YCBpbnRvIHdoaWNoIHR5cGUtY2hlY2tpbmcgY29kZSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSByZWYgYSBgUmVmZXJlbmNlYCB0byB0aGUgY29tcG9uZW50IGNsYXNzIHdoaWNoIHNob3VsZCBiZSB0eXBlLWNoZWNrZWQuXG4gKiBAcGFyYW0gbmFtZSBhIGB0cy5JZGVudGlmaWVyYCB0byB1c2UgZm9yIHRoZSBnZW5lcmF0ZWQgYHRzLkZ1bmN0aW9uRGVjbGFyYXRpb25gLlxuICogQHBhcmFtIG1ldGEgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGFuZCB0aGUgZnVuY3Rpb24gYmVpbmcgZ2VuZXJhdGVkLlxuICogQHBhcmFtIGRvbVNjaGVtYUNoZWNrZXIgdXNlZCB0byBjaGVjayBhbmQgcmVjb3JkIGVycm9ycyByZWdhcmRpbmcgaW1wcm9wZXIgdXNhZ2Ugb2YgRE9NIGVsZW1lbnRzXG4gKiBhbmQgYmluZGluZ3MuXG4gKiBAcGFyYW0gb29iUmVjb3JkZXIgdXNlZCB0byByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyB0ZW1wbGF0ZSBlbGVtZW50cyB3aGljaCBjb3VsZCBub3QgYmUgY29ycmVjdGx5XG4gKiB0cmFuc2xhdGVkIGludG8gdHlwZXMgZHVyaW5nIFRDQiBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICBlbnY6IEVudmlyb25tZW50LCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgbmFtZTogdHMuSWRlbnRpZmllcixcbiAgICBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgY29uc3QgdGNiID0gbmV3IENvbnRleHQoXG4gICAgICBlbnYsIGRvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyLCBtZXRhLmlkLCBtZXRhLmJvdW5kVGFyZ2V0LCBtZXRhLnBpcGVzLCBtZXRhLnNjaGVtYXMpO1xuICBjb25zdCBzY29wZSA9IFNjb3BlLmZvck5vZGVzKHRjYiwgbnVsbCwgdGNiLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCAvKiBndWFyZCAqLyBudWxsKTtcbiAgY29uc3QgY3R4UmF3VHlwZSA9IGVudi5yZWZlcmVuY2VUeXBlKHJlZik7XG4gIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShjdHhSYXdUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIHdoZW4gcmVmZXJlbmNpbmcgdGhlIGN0eCBwYXJhbSBmb3IgJHtyZWYuZGVidWdOYW1lfWApO1xuICB9XG4gIGNvbnN0IHBhcmFtTGlzdCA9IFt0Y2JDdHhQYXJhbShyZWYubm9kZSwgY3R4UmF3VHlwZS50eXBlTmFtZSwgZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUpXTtcblxuICBjb25zdCBzY29wZVN0YXRlbWVudHMgPSBzY29wZS5yZW5kZXIoKTtcbiAgY29uc3QgaW5uZXJCb2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgIC4uLmVudi5nZXRQcmVsdWRlU3RhdGVtZW50cygpLFxuICAgIC4uLnNjb3BlU3RhdGVtZW50cyxcbiAgXSk7XG5cbiAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBcImlmICh0cnVlKVwiIGV4cHJlc3Npb24uIFRoaXMgaXMgdW5uZWNlc3NhcnkgYnV0IGhhcyB0aGUgZWZmZWN0IG9mIGNhdXNpbmdcbiAgLy8gdGhlIGB0cy5QcmludGVyYCB0byBmb3JtYXQgdGhlIHR5cGUtY2hlY2sgYmxvY2sgbmljZWx5LlxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgaW5uZXJCb2R5LCB1bmRlZmluZWQpXSk7XG4gIGNvbnN0IGZuRGVjbCA9IHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gbmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVudi5jb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID8gcmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgOiB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovIHBhcmFtTGlzdCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbiAgYWRkVGVtcGxhdGVJZChmbkRlY2wsIG1ldGEuaWQpO1xuICByZXR1cm4gZm5EZWNsO1xufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0J3MgaW52b2x2ZWQgaW4gdGhlIGNvbnN0cnVjdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2suXG4gKlxuICogVGhlIGdlbmVyYXRpb24gb2YgYSBUQ0IgaXMgbm9uLWxpbmVhci4gQmluZGluZ3Mgd2l0aGluIGEgdGVtcGxhdGUgbWF5IHJlc3VsdCBpbiB0aGUgbmVlZCB0b1xuICogY29uc3RydWN0IGNlcnRhaW4gdHlwZXMgZWFybGllciB0aGFuIHRoZXkgb3RoZXJ3aXNlIHdvdWxkIGJlIGNvbnN0cnVjdGVkLiBUaGF0IGlzLCBpZiB0aGVcbiAqIGdlbmVyYXRpb24gb2YgYSBUQ0IgZm9yIGEgdGVtcGxhdGUgaXMgYnJva2VuIGRvd24gaW50byBzcGVjaWZpYyBvcGVyYXRpb25zIChjb25zdHJ1Y3RpbmcgYVxuICogZGlyZWN0aXZlLCBleHRyYWN0aW5nIGEgdmFyaWFibGUgZnJvbSBhIGxldC0gb3BlcmF0aW9uLCBldGMpLCB0aGVuIGl0J3MgcG9zc2libGUgZm9yIG9wZXJhdGlvbnNcbiAqIGVhcmxpZXIgaW4gdGhlIHNlcXVlbmNlIHRvIGRlcGVuZCBvbiBvcGVyYXRpb25zIHdoaWNoIG9jY3VyIGxhdGVyIGluIHRoZSBzZXF1ZW5jZS5cbiAqXG4gKiBgVGNiT3BgIGFic3RyYWN0cyB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIG9wZXJhdGlvbnMgd2hpY2ggYXJlIHJlcXVpcmVkIHRvIGNvbnZlcnQgYSB0ZW1wbGF0ZSBpbnRvXG4gKiBhIFRDQi4gVGhpcyBhbGxvd3MgZm9yIHR3byBwaGFzZXMgb2YgcHJvY2Vzc2luZyBmb3IgdGhlIHRlbXBsYXRlLCB3aGVyZSAxKSBhIGxpbmVhciBzZXF1ZW5jZSBvZlxuICogYFRjYk9wYHMgaXMgZ2VuZXJhdGVkLCBhbmQgdGhlbiAyKSB0aGVzZSBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgbm90IG5lY2Vzc2FyaWx5IGluIGxpbmVhclxuICogb3JkZXIuXG4gKlxuICogRWFjaCBgVGNiT3BgIG1heSBpbnNlcnQgc3RhdGVtZW50cyBpbnRvIHRoZSBib2R5IG9mIHRoZSBUQ0IsIGFuZCBhbHNvIG9wdGlvbmFsbHkgcmV0dXJuIGFcbiAqIGB0cy5FeHByZXNzaW9uYCB3aGljaCBjYW4gYmUgdXNlZCB0byByZWZlcmVuY2UgdGhlIG9wZXJhdGlvbidzIHJlc3VsdC5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgVGNiT3AgeyBhYnN0cmFjdCBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbDsgfVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIGEgbmF0aXZlIERPTSBlbGVtZW50IChvciB3ZWIgY29tcG9uZW50KSBmcm9tIGFcbiAqIGBUbXBsQXN0RWxlbWVudGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGVsZW1lbnQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYkVsZW1lbnRPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgLy8gQWRkIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZWxlbWVudCB1c2luZyBkb2N1bWVudC5jcmVhdGVFbGVtZW50LlxuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHNDcmVhdGVFbGVtZW50KHRoaXMuZWxlbWVudC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLmVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMuZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIHBhcnRpY3VsYXIgbGV0LSBgVG1wbEFzdFZhcmlhYmxlYCBvbiBhXG4gKiBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHZhcmlhYmxlIHZhcmlhYmxlIChsb2wpLlxuICovXG5jbGFzcyBUY2JWYXJpYWJsZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlLFxuICAgICAgcHJpdmF0ZSB2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gTG9vayBmb3IgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuXG4gICAgLy8gQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIFRtcGxBc3RWYXJpYWJsZSwgYW5kIGluaXRpYWxpemUgaXQgdG8gYSByZWFkIG9mIHRoZSB2YXJpYWJsZVxuICAgIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjb250ZXh0LlxuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgIC8qIGV4cHJlc3Npb24gKi8gY3R4LFxuICAgICAgICAvKiBuYW1lICovIHRoaXMudmFyaWFibGUudmFsdWUgfHwgJyRpbXBsaWNpdCcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMudmFyaWFibGUuc291cmNlU3Bhbik7XG5cbiAgICAvLyBEZWNsYXJlIHRoZSB2YXJpYWJsZSwgYW5kIHJldHVybiBpdHMgaWRlbnRpZmllci5cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgYSB2YXJpYWJsZSBmb3IgYSBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHRlbXBsYXRlJ3MgY29udGV4dCB2YXJpYWJsZS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVDb250ZXh0T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSkgeyBzdXBlcigpOyB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICAvLyBBbGxvY2F0ZSBhIHRlbXBsYXRlIGN0eCB2YXJpYWJsZSBhbmQgZGVjbGFyZSBpdCB3aXRoIGFuICdhbnknIHR5cGUuIFRoZSB0eXBlIG9mIHRoaXMgdmFyaWFibGVcbiAgICAvLyBtYXkgYmUgbmFycm93ZWQgYXMgYSByZXN1bHQgb2YgdGVtcGxhdGUgZ3VhcmQgY29uZGl0aW9ucy5cbiAgICBjb25zdCBjdHggPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGN0eCwgdHlwZSkpO1xuICAgIHJldHVybiBjdHg7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZGVzY2VuZHMgaW50byBhIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY2hpbGRyZW4gYW5kIGdlbmVyYXRlcyB0eXBlLWNoZWNraW5nIGNvZGUgZm9yXG4gKiB0aGVtLlxuICpcbiAqIFRoaXMgb3BlcmF0aW9uIHdyYXBzIHRoZSBjaGlsZHJlbidzIHR5cGUtY2hlY2tpbmcgY29kZSBpbiBhbiBgaWZgIGJsb2NrLCB3aGljaCBtYXkgaW5jbHVkZSBvbmVcbiAqIG9yIG1vcmUgdHlwZSBndWFyZCBjb25kaXRpb25zIHRoYXQgbmFycm93IHR5cGVzIHdpdGhpbiB0aGUgdGVtcGxhdGUgYm9keS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVCb2R5T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIC8vIEFuIGBpZmAgd2lsbCBiZSBjb25zdHJ1Y3RlZCwgd2l0aGluIHdoaWNoIHRoZSB0ZW1wbGF0ZSdzIGNoaWxkcmVuIHdpbGwgYmUgdHlwZSBjaGVja2VkLiBUaGVcbiAgICAvLyBgaWZgIGlzIHVzZWQgZm9yIHR3byByZWFzb25zOiBpdCBjcmVhdGVzIGEgbmV3IHN5bnRhY3RpYyBzY29wZSwgaXNvbGF0aW5nIHZhcmlhYmxlcyBkZWNsYXJlZFxuICAgIC8vIGluIHRoZSB0ZW1wbGF0ZSdzIFRDQiBmcm9tIHRoZSBvdXRlciBjb250ZXh0LCBhbmQgaXQgYWxsb3dzIGFueSBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZXNcbiAgICAvLyB0byBwZXJmb3JtIHR5cGUgbmFycm93aW5nIG9mIGVpdGhlciBleHByZXNzaW9ucyBvciB0aGUgdGVtcGxhdGUncyBjb250ZXh0LlxuICAgIC8vXG4gICAgLy8gVGhlIGd1YXJkIGlzIHRoZSBgaWZgIGJsb2NrJ3MgY29uZGl0aW9uLiBJdCdzIHVzdWFsbHkgc2V0IHRvIGB0cnVlYCBidXQgZGlyZWN0aXZlcyB0aGF0IGV4aXN0XG4gICAgLy8gb24gdGhlIHRlbXBsYXRlIGNhbiB0cmlnZ2VyIGV4dHJhIGd1YXJkIGV4cHJlc3Npb25zIHRoYXQgc2VydmUgdG8gbmFycm93IHR5cGVzIHdpdGhpbiB0aGVcbiAgICAvLyBgaWZgLiBgZ3VhcmRgIGlzIGNhbGN1bGF0ZWQgYnkgc3RhcnRpbmcgd2l0aCBgdHJ1ZWAgYW5kIGFkZGluZyBvdGhlciBjb25kaXRpb25zIGFzIG5lZWRlZC5cbiAgICAvLyBDb2xsZWN0IHRoZXNlIGludG8gYGd1YXJkc2AgYnkgcHJvY2Vzc2luZyB0aGUgZGlyZWN0aXZlcy5cbiAgICBjb25zdCBkaXJlY3RpdmVHdWFyZHM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUodGhpcy50ZW1wbGF0ZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgZGlySW5zdElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUsIGRpcik7XG4gICAgICAgIGNvbnN0IGRpcklkID1cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2UoZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuXG4gICAgICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ3VhcmRzLiBUZW1wbGF0ZSBndWFyZHMgKG5nVGVtcGxhdGVHdWFyZHMpIGFsbG93IHR5cGUgbmFycm93aW5nIG9mXG4gICAgICAgIC8vIHRoZSBleHByZXNzaW9uIHBhc3NlZCB0byBhbiBASW5wdXQgb2YgdGhlIGRpcmVjdGl2ZS4gU2NhbiB0aGUgZGlyZWN0aXZlIHRvIHNlZSBpZiBpdCBoYXNcbiAgICAgICAgLy8gYW55IHRlbXBsYXRlIGd1YXJkcywgYW5kIGdlbmVyYXRlIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgICBkaXIubmdUZW1wbGF0ZUd1YXJkcy5mb3JFYWNoKGd1YXJkID0+IHtcbiAgICAgICAgICAvLyBGb3IgZWFjaCB0ZW1wbGF0ZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlLCBsb29rIGZvciBhIGJpbmRpbmcgdG8gdGhhdCBpbnB1dC5cbiAgICAgICAgICBjb25zdCBib3VuZElucHV0ID0gdGhpcy50ZW1wbGF0ZS5pbnB1dHMuZmluZChpID0+IGkubmFtZSA9PT0gZ3VhcmQuaW5wdXROYW1lKSB8fFxuICAgICAgICAgICAgICB0aGlzLnRlbXBsYXRlLnRlbXBsYXRlQXR0cnMuZmluZChcbiAgICAgICAgICAgICAgICAgIChpOiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSB8IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSk6IGkgaXMgVG1wbEFzdEJvdW5kQXR0cmlidXRlID0+XG4gICAgICAgICAgICAgICAgICAgICAgaSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSk7XG4gICAgICAgICAgaWYgKGJvdW5kSW5wdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYm91bmRJbnB1dC52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuXG4gICAgICAgICAgICAvLyBUaGUgZXhwcmVzc2lvbiBoYXMgYWxyZWFkeSBiZWVuIGNoZWNrZWQgaW4gdGhlIHR5cGUgY29uc3RydWN0b3IgaW52b2NhdGlvbiwgc29cbiAgICAgICAgICAgIC8vIGl0IHNob3VsZCBiZSBpZ25vcmVkIHdoZW4gdXNlZCB3aXRoaW4gYSB0ZW1wbGF0ZSBndWFyZC5cbiAgICAgICAgICAgIGlnbm9yZURpYWdub3N0aWNzKGV4cHIpO1xuXG4gICAgICAgICAgICBpZiAoZ3VhcmQudHlwZSA9PT0gJ2JpbmRpbmcnKSB7XG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgYmluZGluZyBleHByZXNzaW9uIGl0c2VsZiBhcyBndWFyZC5cbiAgICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlIHdpdGggdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBhbmQgdGhhdFxuICAgICAgICAgICAgICAvLyBleHByZXNzaW9uLlxuICAgICAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgYG5nVGVtcGxhdGVHdWFyZF8ke2d1YXJkLmlucHV0TmFtZX1gLCBbXG4gICAgICAgICAgICAgICAgZGlySW5zdElkLFxuICAgICAgICAgICAgICAgIGV4cHIsXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCBib3VuZElucHV0LnZhbHVlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaGUgc2Vjb25kIGtpbmQgb2YgZ3VhcmQgaXMgYSB0ZW1wbGF0ZSBjb250ZXh0IGd1YXJkLiBUaGlzIGd1YXJkIG5hcnJvd3MgdGhlIHRlbXBsYXRlXG4gICAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgICBpZiAoZGlyLmhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQgJiYgdGhpcy50Y2IuZW52LmNvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcykge1xuICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgJ25nVGVtcGxhdGVDb250ZXh0R3VhcmQnLCBbZGlySW5zdElkLCBjdHhdKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCB0aGlzLnRlbXBsYXRlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJ5IGRlZmF1bHQgdGhlIGd1YXJkIGlzIHNpbXBseSBgdHJ1ZWAuXG4gICAgbGV0IGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSBndWFyZHMgZnJvbSBkaXJlY3RpdmVzLCB1c2UgdGhlbSBpbnN0ZWFkLlxuICAgIGlmIChkaXJlY3RpdmVHdWFyZHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gUG9wIHRoZSBmaXJzdCB2YWx1ZSBhbmQgdXNlIGl0IGFzIHRoZSBpbml0aWFsaXplciB0byByZWR1Y2UoKS4gVGhpcyB3YXksIGEgc2luZ2xlIGd1YXJkXG4gICAgICAvLyB3aWxsIGJlIHVzZWQgb24gaXRzIG93biwgYnV0IHR3byBvciBtb3JlIHdpbGwgYmUgY29tYmluZWQgaW50byBiaW5hcnkgQU5EIGV4cHJlc3Npb25zLlxuICAgICAgZ3VhcmQgPSBkaXJlY3RpdmVHdWFyZHMucmVkdWNlKFxuICAgICAgICAgIChleHByLCBkaXJHdWFyZCkgPT5cbiAgICAgICAgICAgICAgdHMuY3JlYXRlQmluYXJ5KGV4cHIsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIGRpckd1YXJkKSxcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucG9wKCkgISk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IFNjb3BlIGZvciB0aGUgdGVtcGxhdGUuIFRoaXMgY29uc3RydWN0cyB0aGUgbGlzdCBvZiBvcGVyYXRpb25zIGZvciB0aGUgdGVtcGxhdGVcbiAgICAvLyBjaGlsZHJlbiwgYXMgd2VsbCBhcyB0cmFja3MgYmluZGluZ3Mgd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICBjb25zdCB0bXBsU2NvcGUgPSBTY29wZS5mb3JOb2Rlcyh0aGlzLnRjYiwgdGhpcy5zY29wZSwgdGhpcy50ZW1wbGF0ZSwgZ3VhcmQpO1xuXG4gICAgLy8gUmVuZGVyIHRoZSB0ZW1wbGF0ZSdzIGBTY29wZWAgaW50byBhIGJsb2NrLlxuICAgIGxldCB0bXBsQmxvY2s6IHRzLlN0YXRlbWVudCA9IHRzLmNyZWF0ZUJsb2NrKHRtcGxTY29wZS5yZW5kZXIoKSk7XG4gICAgaWYgKGd1YXJkICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGUgc2NvcGUgaGFzIGEgZ3VhcmQgdGhhdCBuZWVkcyB0byBiZSBhcHBsaWVkLCBzbyB3cmFwIHRoZSB0ZW1wbGF0ZSBibG9jayBpbnRvIGFuIGBpZmBcbiAgICAgIC8vIHN0YXRlbWVudCBjb250YWluaW5nIHRoZSBndWFyZCBleHByZXNzaW9uLlxuICAgICAgdG1wbEJsb2NrID0gdHMuY3JlYXRlSWYoLyogZXhwcmVzc2lvbiAqLyBndWFyZCwgLyogdGhlblN0YXRlbWVudCAqLyB0bXBsQmxvY2spO1xuICAgIH1cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0bXBsQmxvY2spO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggcmVuZGVycyBhIHRleHQgYmluZGluZyAoaW50ZXJwb2xhdGlvbikgaW50byB0aGUgVENCLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlRleHRJbnRlcnBvbGF0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBiaW5kaW5nOiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24odGhpcy5iaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiBhIGRpcmVjdGl2ZSB3aXRoIHR5cGVzIGluZmVycmVkIGZyb20gaXRzIGlucHV0cywgd2hpY2hcbiAqIGFsc28gY2hlY2tzIHRoZSBiaW5kaW5ncyB0byB0aGUgZGlyZWN0aXZlIGluIHRoZSBwcm9jZXNzLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAvLyBQcm9jZXNzIHRoZSBkaXJlY3RpdmUgYW5kIGNvbnN0cnVjdCBleHByZXNzaW9ucyBmb3IgZWFjaCBvZiBpdHMgYmluZGluZ3MuXG4gICAgY29uc3QgaW5wdXRzID0gdGNiR2V0RGlyZWN0aXZlSW5wdXRzKHRoaXMubm9kZSwgdGhpcy5kaXIsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcblxuICAgIC8vIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgdGhlIGRpcmVjdGl2ZSB0byBpbmZlciBhIHR5cGUsIGFuZCBhc3NpZ24gdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGluc3RhbmNlLlxuICAgIGNvbnN0IHR5cGVDdG9yID0gdGNiQ2FsbFR5cGVDdG9yKHRoaXMuZGlyLCB0aGlzLnRjYiwgaW5wdXRzKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKHR5cGVDdG9yLCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdHlwZUN0b3IpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZmVlZHMgZWxlbWVudHMgYW5kIHVuY2xhaW1lZCBwcm9wZXJ0aWVzIHRvIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAuXG4gKlxuICogVGhlIERPTSBzY2hlbWEgaXMgbm90IGNoZWNrZWQgdmlhIFRDQiBjb2RlIGdlbmVyYXRpb24uIEluc3RlYWQsIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW5nZXN0c1xuICogZWxlbWVudHMgYW5kIHByb3BlcnR5IGJpbmRpbmdzIGFuZCBhY2N1bXVsYXRlcyBzeW50aGV0aWMgYHRzLkRpYWdub3N0aWNgcyBvdXQtb2YtYmFuZC4gVGhlc2UgYXJlXG4gKiBsYXRlciBtZXJnZWQgd2l0aCB0aGUgZGlhZ25vc3RpY3MgZ2VuZXJhdGVkIGZyb20gdGhlIFRDQi5cbiAqXG4gKiBGb3IgY29udmVuaWVuY2UsIHRoZSBUQ0IgaXRlcmF0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpcyB1c2VkIHRvIGRyaXZlIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgdmlhXG4gKiB0aGUgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKi9cbmNsYXNzIFRjYkRvbVNjaGVtYUNoZWNrZXJPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgcHJpdmF0ZSBjaGVja0VsZW1lbnQ6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAodGhpcy5jaGVja0VsZW1lbnQpIHtcbiAgICAgIHRoaXMudGNiLmRvbVNjaGVtYUNoZWNrZXIuY2hlY2tFbGVtZW50KHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHRoaXMudGNiLnNjaGVtYXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgdGhpcy5lbGVtZW50LmlucHV0cykge1xuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkgJiYgdGhpcy5jbGFpbWVkSW5wdXRzLmhhcyhiaW5kaW5nLm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBiaW5kaW5nIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgICAgaWYgKGJpbmRpbmcubmFtZSAhPT0gJ3N0eWxlJyAmJiBiaW5kaW5nLm5hbWUgIT09ICdjbGFzcycpIHtcbiAgICAgICAgICAvLyBBIGRpcmVjdCBiaW5kaW5nIHRvIGEgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3QgcHJvcGVydHlOYW1lID0gQVRUUl9UT19QUk9QW2JpbmRpbmcubmFtZV0gfHwgYmluZGluZy5uYW1lO1xuICAgICAgICAgIHRoaXMudGNiLmRvbVNjaGVtYUNoZWNrZXIuY2hlY2tQcm9wZXJ0eShcbiAgICAgICAgICAgICAgdGhpcy50Y2IuaWQsIHRoaXMuZWxlbWVudCwgcHJvcGVydHlOYW1lLCBiaW5kaW5nLnNvdXJjZVNwYW4sIHRoaXMudGNiLnNjaGVtYXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cblxuLyoqXG4gKiBNYXBwaW5nIGJldHdlZW4gYXR0cmlidXRlcyBuYW1lcyB0aGF0IGRvbid0IGNvcnJlc3BvbmQgdG8gdGhlaXIgZWxlbWVudCBwcm9wZXJ0eSBuYW1lcy5cbiAqIE5vdGU6IHRoaXMgbWFwcGluZyBoYXMgdG8gYmUga2VwdCBpbiBzeW5jIHdpdGggdGhlIGVxdWFsbHkgbmFtZWQgbWFwcGluZyBpbiB0aGUgcnVudGltZS5cbiAqL1xuY29uc3QgQVRUUl9UT19QUk9QOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICdjbGFzcyc6ICdjbGFzc05hbWUnLFxuICAnZm9yJzogJ2h0bWxGb3InLFxuICAnZm9ybWFjdGlvbic6ICdmb3JtQWN0aW9uJyxcbiAgJ2lubmVySHRtbCc6ICdpbm5lckhUTUwnLFxuICAncmVhZG9ubHknOiAncmVhZE9ubHknLFxuICAndGFiaW5kZXgnOiAndGFiSW5kZXgnLFxufTtcblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgXCJ1bmNsYWltZWQgaW5wdXRzXCIgLSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHdoaWNoIHdlcmVcbiAqIG5vdCBhdHRyaWJ1dGVkIHRvIGFueSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBhbmQgYXJlIGluc3RlYWQgcHJvY2Vzc2VkIGFnYWluc3QgdGhlIEhUTUwgZWxlbWVudFxuICogaXRzZWxmLlxuICpcbiAqIEN1cnJlbnRseSwgb25seSB0aGUgZXhwcmVzc2lvbnMgb2YgdGhlc2UgYmluZGluZ3MgYXJlIGNoZWNrZWQuIFRoZSB0YXJnZXRzIG9mIHRoZSBiaW5kaW5ncyBhcmVcbiAqIGNoZWNrZWQgYWdhaW5zdCB0aGUgRE9NIHNjaGVtYSB2aWEgYSBgVGNiRG9tU2NoZW1hQ2hlY2tlck9wYC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JVbmNsYWltZWRJbnB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgLy8gYHRoaXMuaW5wdXRzYCBjb250YWlucyBvbmx5IHRob3NlIGJpbmRpbmdzIG5vdCBtYXRjaGVkIGJ5IGFueSBkaXJlY3RpdmUuIFRoZXNlIGJpbmRpbmdzIGdvIHRvXG4gICAgLy8gdGhlIGVsZW1lbnQgaXRzZWxmLlxuICAgIGNvbnN0IGVsSWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5lbGVtZW50KTtcblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgdGhpcy5lbGVtZW50LmlucHV0cykge1xuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkgJiYgdGhpcy5jbGFpbWVkSW5wdXRzLmhhcyhiaW5kaW5nLm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBiaW5kaW5nIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJpbmRpbmcudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21CaW5kaW5ncyAmJiBiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICBjb25zdCBwcm9wID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhlbElkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHByb3BlcnR5TmFtZSkpO1xuICAgICAgICAgIGNvbnN0IHN0bXQgPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgd3JhcEZvckRpYWdub3N0aWNzKGV4cHIpKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHN0bXQsIGJpbmRpbmcuc291cmNlU3Bhbik7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChzdG10KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEEgYmluZGluZyB0byBhbiBhbmltYXRpb24sIGF0dHJpYnV0ZSwgY2xhc3Mgb3Igc3R5bGUuIEZvciBub3csIG9ubHkgdmFsaWRhdGUgdGhlIHJpZ2h0LVxuICAgICAgICAvLyBoYW5kIHNpZGUgb2YgdGhlIGV4cHJlc3Npb24uXG4gICAgICAgIC8vIFRPRE86IHByb3Blcmx5IGNoZWNrIGNsYXNzIGFuZCBzdHlsZSBiaW5kaW5ncy5cbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgZXZlbnQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB0aGF0IGNvcnJlc3BvbmQgd2l0aCB0aGVcbiAqIG91dHB1dHMgb2YgYSBkaXJlY3RpdmUuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlT3V0cHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcblxuICAgIC8vIGBkaXIub3V0cHV0c2AgaXMgYW4gb2JqZWN0IG1hcCBvZiBmaWVsZCBuYW1lcyBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzIHRvIGV2ZW50IG5hbWVzLlxuICAgIC8vIFRoaXMgaXMgYmFja3dhcmRzIGZyb20gd2hhdCdzIG5lZWRlZCB0byBtYXRjaCBldmVudCBoYW5kbGVycyAtIGEgbWFwIG9mIGV2ZW50IG5hbWVzIHRvIGZpZWxkXG4gICAgLy8gbmFtZXMgaXMgZGVzaXJlZC4gSW52ZXJ0IGBkaXIub3V0cHV0c2AgaW50byBgZmllbGRCeUV2ZW50TmFtZWAgdG8gY3JlYXRlIHRoaXMgbWFwLlxuICAgIGNvbnN0IGZpZWxkQnlFdmVudE5hbWUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGNvbnN0IG91dHB1dHMgPSB0aGlzLmRpci5vdXRwdXRzO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKG91dHB1dHMpKSB7XG4gICAgICBmaWVsZEJ5RXZlbnROYW1lLnNldChvdXRwdXRzW2tleV0sIGtleSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgdGhpcy5ub2RlLm91dHB1dHMpIHtcbiAgICAgIGlmIChvdXRwdXQudHlwZSAhPT0gUGFyc2VkRXZlbnRUeXBlLlJlZ3VsYXIgfHwgIWZpZWxkQnlFdmVudE5hbWUuaGFzKG91dHB1dC5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGZpZWxkID0gZmllbGRCeUV2ZW50TmFtZS5nZXQob3V0cHV0Lm5hbWUpICE7XG5cbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzKSB7XG4gICAgICAgIC8vIEZvciBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cywgZ2VuZXJhdGUgYSBjYWxsIHRvIHRoZSBgc3Vic2NyaWJlYCBtZXRob2RcbiAgICAgICAgLy8gb24gdGhlIGRpcmVjdGl2ZSdzIG91dHB1dCBmaWVsZCB0byBsZXQgdHlwZSBpbmZvcm1hdGlvbiBmbG93IGludG8gdGhlIGhhbmRsZXIgZnVuY3Rpb24nc1xuICAgICAgICAvLyBgJGV2ZW50YCBwYXJhbWV0ZXIuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0aGUgYEV2ZW50RW1pdHRlcjxUPmAgdHlwZSBmcm9tICdAYW5ndWxhci9jb3JlJyB0aGF0IGlzIHR5cGljYWxseSB1c2VkIGZvclxuICAgICAgICAvLyBvdXRwdXRzIGhhcyBhIHR5cGluZ3MgZGVmaWNpZW5jeSBpbiBpdHMgYHN1YnNjcmliZWAgbWV0aG9kLiBUaGUgZ2VuZXJpYyB0eXBlIGBUYCBpcyBub3RcbiAgICAgICAgLy8gY2FycmllZCBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uLCB3aGljaCBpcyB2aXRhbCBmb3IgaW5mZXJlbmNlIG9mIHRoZSB0eXBlIG9mIGAkZXZlbnRgLlxuICAgICAgICAvLyBBcyBhIHdvcmthcm91bmQsIHRoZSBkaXJlY3RpdmUncyBmaWVsZCBpcyBwYXNzZWQgaW50byBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IGhhcyBhXG4gICAgICAgIC8vIHNwZWNpYWxseSBjcmFmdGVkIHNldCBvZiBzaWduYXR1cmVzLCB0byBlZmZlY3RpdmVseSBjYXN0IGBFdmVudEVtaXR0ZXI8VD5gIHRvIHNvbWV0aGluZ1xuICAgICAgICAvLyB0aGF0IGhhcyBhIGBzdWJzY3JpYmVgIG1ldGhvZCB0aGF0IHByb3Blcmx5IGNhcnJpZXMgdGhlIGBUYCBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkluZmVyKTtcblxuICAgICAgICBjb25zdCBvdXRwdXRGaWVsZCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGQpKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0SGVscGVyID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUNhbGwodGhpcy50Y2IuZW52LmRlY2xhcmVPdXRwdXRIZWxwZXIoKSwgdW5kZWZpbmVkLCBbb3V0cHV0RmllbGRdKTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaWJlRm4gPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhvdXRwdXRIZWxwZXIsICdzdWJzY3JpYmUnKTtcbiAgICAgICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwoc3Vic2NyaWJlRm4sIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbaGFuZGxlcl0pO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGNhbGwsIG91dHB1dC5zb3VyY2VTcGFuKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjYWxsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cyBpcyBkaXNhYmxlZCwgZW1pdCBhIGhhbmRsZXIgZnVuY3Rpb24gd2hlcmUgdGhlXG4gICAgICAgIC8vIGAkZXZlbnRgIHBhcmFtZXRlciBoYXMgYW4gZXhwbGljaXQgYGFueWAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5BbnkpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH1cblxuICAgICAgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvci52aXNpdChcbiAgICAgICAgICBvdXRwdXQuaGFuZGxlciwgdGhpcy50Y2IuaWQsIHRoaXMudGNiLmJvdW5kVGFyZ2V0LCB0aGlzLnRjYi5vb2JSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgXCJ1bmNsYWltZWQgb3V0cHV0c1wiIC0gZXZlbnQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaFxuICogd2VyZSBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MXG4gKiBlbGVtZW50IGl0c2VsZi5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JVbmNsYWltZWRPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkT3V0cHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgdGhpcy5lbGVtZW50Lm91dHB1dHMpIHtcbiAgICAgIGlmICh0aGlzLmNsYWltZWRPdXRwdXRzLmhhcyhvdXRwdXQubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGV2ZW50IGhhbmRsZXIgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAob3V0cHV0LnR5cGUgPT09IFBhcnNlZEV2ZW50VHlwZS5BbmltYXRpb24pIHtcbiAgICAgICAgLy8gQW5pbWF0aW9uIG91dHB1dCBiaW5kaW5ncyBhbHdheXMgaGF2ZSBhbiBgJGV2ZW50YCBwYXJhbWV0ZXIgb2YgdHlwZSBgQW5pbWF0aW9uRXZlbnRgLlxuICAgICAgICBjb25zdCBldmVudFR5cGUgPSB0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID9cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoJ0Bhbmd1bGFyL2FuaW1hdGlvbnMnLCAnQW5pbWF0aW9uRXZlbnQnKSA6XG4gICAgICAgICAgICBFdmVudFBhcmFtVHlwZS5Bbnk7XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBldmVudFR5cGUpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgRE9NIGV2ZW50cyBpcyBlbmFibGVkLCBnZW5lcmF0ZSBhIGNhbGwgdG8gYGFkZEV2ZW50TGlzdGVuZXJgIG9uXG4gICAgICAgIC8vIHRoZSBlbGVtZW50IGluc3RhbmNlIHNvIHRoYXQgVHlwZVNjcmlwdCdzIHR5cGUgaW5mZXJlbmNlIGZvclxuICAgICAgICAvLyBgSFRNTEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcmAgdXNpbmcgYEhUTUxFbGVtZW50RXZlbnRNYXBgIHRvIGluZmVyIGFuIGFjY3VyYXRlIHR5cGUgZm9yXG4gICAgICAgIC8vIGAkZXZlbnRgIGRlcGVuZGluZyBvbiB0aGUgZXZlbnQgbmFtZS4gRm9yIHVua25vd24gZXZlbnQgbmFtZXMsIFR5cGVTY3JpcHQgcmVzb3J0cyB0byB0aGVcbiAgICAgICAgLy8gYmFzZSBgRXZlbnRgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuSW5mZXIpO1xuXG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgLyogZXhwcmVzc2lvbiAqLyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhlbElkLCAnYWRkRXZlbnRMaXN0ZW5lcicpLFxuICAgICAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBhcmd1bWVudHMgKi9bdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChvdXRwdXQubmFtZSksIGhhbmRsZXJdKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhjYWxsLCBvdXRwdXQuc291cmNlU3Bhbik7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoY2FsbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIERPTSBpbnB1dHMgaXMgZGlzYWJsZWQsIGVtaXQgYSBoYW5kbGVyIGZ1bmN0aW9uIHdoZXJlIHRoZSBgJGV2ZW50YFxuICAgICAgICAvLyBwYXJhbWV0ZXIgaGFzIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuQW55KTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9XG5cbiAgICAgIEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IudmlzaXQoXG4gICAgICAgICAgb3V0cHV0LmhhbmRsZXIsIHRoaXMudGNiLmlkLCB0aGlzLnRjYi5ib3VuZFRhcmdldCwgdGhpcy50Y2Iub29iUmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVmFsdWUgdXNlZCB0byBicmVhayBhIGNpcmN1bGFyIHJlZmVyZW5jZSBiZXR3ZWVuIGBUY2JPcGBzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgcmV0dXJuZWQgd2hlbmV2ZXIgYFRjYk9wYHMgaGF2ZSBhIGNpcmN1bGFyIGRlcGVuZGVuY3kuIFRoZSBleHByZXNzaW9uIGlzIGEgbm9uLW51bGxcbiAqIGFzc2VydGlvbiBvZiB0aGUgbnVsbCB2YWx1ZSAoaW4gVHlwZVNjcmlwdCwgdGhlIGV4cHJlc3Npb24gYG51bGwhYCkuIFRoaXMgY29uc3RydWN0aW9uIHdpbGwgaW5mZXJcbiAqIHRoZSBsZWFzdCBuYXJyb3cgdHlwZSBmb3Igd2hhdGV2ZXIgaXQncyBhc3NpZ25lZCB0by5cbiAqL1xuY29uc3QgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUiA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSk7XG5cbi8qKlxuICogT3ZlcmFsbCBnZW5lcmF0aW9uIGNvbnRleHQgZm9yIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICpcbiAqIGBDb250ZXh0YCBoYW5kbGVzIG9wZXJhdGlvbnMgZHVyaW5nIGNvZGUgZ2VuZXJhdGlvbiB3aGljaCBhcmUgZ2xvYmFsIHdpdGggcmVzcGVjdCB0byB0aGUgd2hvbGVcbiAqIGJsb2NrLiBJdCdzIHJlc3BvbnNpYmxlIGZvciB2YXJpYWJsZSBuYW1lIGFsbG9jYXRpb24gYW5kIG1hbmFnZW1lbnQgb2YgYW55IGltcG9ydHMgbmVlZGVkLiBJdFxuICogYWxzbyBjb250YWlucyB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaXRzZWxmLlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIHByaXZhdGUgbmV4dElkID0gMTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudjogRW52aXJvbm1lbnQsIHJlYWRvbmx5IGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgICByZWFkb25seSBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCByZWFkb25seSBpZDogVGVtcGxhdGVJZCxcbiAgICAgIHJlYWRvbmx5IGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwcml2YXRlIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgcmVhZG9ubHkgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSkge31cblxuICAvKipcbiAgICogQWxsb2NhdGUgYSBuZXcgdmFyaWFibGUgbmFtZSBmb3IgdXNlIHdpdGhpbiB0aGUgYENvbnRleHRgLlxuICAgKlxuICAgKiBDdXJyZW50bHkgdGhpcyB1c2VzIGEgbW9ub3RvbmljYWxseSBpbmNyZWFzaW5nIGNvdW50ZXIsIGJ1dCBpbiB0aGUgZnV0dXJlIHRoZSB2YXJpYWJsZSBuYW1lXG4gICAqIG1pZ2h0IGNoYW5nZSBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgZGF0YSBiZWluZyBzdG9yZWQuXG4gICAqL1xuICBhbGxvY2F0ZUlkKCk6IHRzLklkZW50aWZpZXIgeyByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihgX3Qke3RoaXMubmV4dElkKyt9YCk7IH1cblxuICBnZXRQaXBlQnlOYW1lKG5hbWU6IHN0cmluZyk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCF0aGlzLnBpcGVzLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmVudi5waXBlSW5zdCh0aGlzLnBpcGVzLmdldChuYW1lKSAhKTtcbiAgfVxufVxuXG4vKipcbiAqIExvY2FsIHNjb3BlIHdpdGhpbiB0aGUgdHlwZSBjaGVjayBibG9jayBmb3IgYSBwYXJ0aWN1bGFyIHRlbXBsYXRlLlxuICpcbiAqIFRoZSB0b3AtbGV2ZWwgdGVtcGxhdGUgYW5kIGVhY2ggbmVzdGVkIGA8bmctdGVtcGxhdGU+YCBoYXZlIHRoZWlyIG93biBgU2NvcGVgLCB3aGljaCBleGlzdCBpbiBhXG4gKiBoaWVyYXJjaHkuIFRoZSBzdHJ1Y3R1cmUgb2YgdGhpcyBoaWVyYXJjaHkgbWlycm9ycyB0aGUgc3ludGFjdGljIHNjb3BlcyBpbiB0aGUgZ2VuZXJhdGVkIHR5cGVcbiAqIGNoZWNrIGJsb2NrLCB3aGVyZSBlYWNoIG5lc3RlZCB0ZW1wbGF0ZSBpcyBlbmNhc2VkIGluIGFuIGBpZmAgc3RydWN0dXJlLlxuICpcbiAqIEFzIGEgdGVtcGxhdGUncyBgVGNiT3BgcyBhcmUgZXhlY3V0ZWQgaW4gYSBnaXZlbiBgU2NvcGVgLCBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB2aWFcbiAqIGBhZGRTdGF0ZW1lbnQoKWAuIFdoZW4gdGhpcyBwcm9jZXNzaW5nIGlzIGNvbXBsZXRlLCB0aGUgYFNjb3BlYCBjYW4gYmUgdHVybmVkIGludG8gYSBgdHMuQmxvY2tgXG4gKiB2aWEgYHJlbmRlclRvQmxvY2soKWAuXG4gKlxuICogSWYgYSBgVGNiT3BgIHJlcXVpcmVzIHRoZSBvdXRwdXQgb2YgYW5vdGhlciwgaXQgY2FuIGNhbGwgYHJlc29sdmUoKWAuXG4gKi9cbmNsYXNzIFNjb3BlIHtcbiAgLyoqXG4gICAqIEEgcXVldWUgb2Ygb3BlcmF0aW9ucyB3aGljaCBuZWVkIHRvIGJlIHBlcmZvcm1lZCB0byBnZW5lcmF0ZSB0aGUgVENCIGNvZGUgZm9yIHRoaXMgc2NvcGUuXG4gICAqXG4gICAqIFRoaXMgYXJyYXkgY2FuIGNvbnRhaW4gZWl0aGVyIGEgYFRjYk9wYCB3aGljaCBoYXMgeWV0IHRvIGJlIGV4ZWN1dGVkLCBvciBhIGB0cy5FeHByZXNzaW9ufG51bGxgXG4gICAqIHJlcHJlc2VudGluZyB0aGUgbWVtb2l6ZWQgcmVzdWx0IG9mIGV4ZWN1dGluZyB0aGUgb3BlcmF0aW9uLiBBcyBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgdGhlaXJcbiAgICogcmVzdWx0cyBhcmUgd3JpdHRlbiBpbnRvIHRoZSBgb3BRdWV1ZWAsIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBvcGVyYXRpb24uXG4gICAqXG4gICAqIElmIGFuIG9wZXJhdGlvbiBpcyBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBleGVjdXRlZCwgaXQgaXMgdGVtcG9yYXJpbHkgb3ZlcndyaXR0ZW4gaGVyZSB3aXRoXG4gICAqIGBJTkZFUl9UWVBFX0ZPUl9DSVJDVUxBUl9PUF9FWFBSYC4gVGhpcyB3YXksIGlmIGEgY3ljbGUgaXMgZW5jb3VudGVyZWQgd2hlcmUgYW4gb3BlcmF0aW9uXG4gICAqIGRlcGVuZHMgdHJhbnNpdGl2ZWx5IG9uIGl0cyBvd24gcmVzdWx0LCB0aGUgaW5uZXIgb3BlcmF0aW9uIHdpbGwgaW5mZXIgdGhlIGxlYXN0IG5hcnJvdyB0eXBlXG4gICAqIHRoYXQgZml0cyBpbnN0ZWFkLiBUaGlzIGhhcyB0aGUgc2FtZSBzZW1hbnRpY3MgYXMgVHlwZVNjcmlwdCBpdHNlbGYgd2hlbiB0eXBlcyBhcmUgcmVmZXJlbmNlZFxuICAgKiBjaXJjdWxhcmx5LlxuICAgKi9cbiAgcHJpdmF0ZSBvcFF1ZXVlOiAoVGNiT3B8dHMuRXhwcmVzc2lvbnxudWxsKVtdID0gW107XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGBUbXBsQXN0RWxlbWVudGBzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiRWxlbWVudE9wYCBpbiB0aGUgYG9wUXVldWVgXG4gICAqL1xuICBwcml2YXRlIGVsZW1lbnRPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdEVsZW1lbnQsIG51bWJlcj4oKTtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIG1hcHMgd2hpY2ggdHJhY2tzIHRoZSBpbmRleCBvZiBgVGNiRGlyZWN0aXZlT3BgcyBpbiB0aGUgYG9wUXVldWVgIGZvciBlYWNoIGRpcmVjdGl2ZVxuICAgKiBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgZGlyZWN0aXZlT3BNYXAgPVxuICAgICAgbmV3IE1hcDxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGltbWVkaWF0ZWx5IG5lc3RlZCA8bmctdGVtcGxhdGU+cyAod2l0aGluIHRoaXMgYFNjb3BlYCkgcmVwcmVzZW50ZWQgYnkgYFRtcGxBc3RUZW1wbGF0ZWBcbiAgICogbm9kZXMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlQ3R4T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgdmFyaWFibGVzIGRlY2xhcmVkIG9uIHRoZSB0ZW1wbGF0ZSB0aGF0IGNyZWF0ZWQgdGhpcyBgU2NvcGVgIChyZXByZXNlbnRlZCBieVxuICAgKiBgVG1wbEFzdFZhcmlhYmxlYCBub2RlcykgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JWYXJpYWJsZU9wYHMgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICovXG4gIHByaXZhdGUgdmFyTWFwID0gbmV3IE1hcDxUbXBsQXN0VmFyaWFibGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICpcbiAgICogRXhlY3V0aW5nIHRoZSBgVGNiT3BgcyBpbiB0aGUgYG9wUXVldWVgIHBvcHVsYXRlcyB0aGlzIGFycmF5LlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBwYXJlbnQ6IFNjb3BlfG51bGwgPSBudWxsLFxuICAgICAgcHJpdmF0ZSBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIGBTY29wZWAgZ2l2ZW4gZWl0aGVyIGEgYFRtcGxBc3RUZW1wbGF0ZWAgb3IgYSBsaXN0IG9mIGBUbXBsQXN0Tm9kZWBzLlxuICAgKlxuICAgKiBAcGFyYW0gdGNiIHRoZSBvdmVyYWxsIGNvbnRleHQgb2YgVENCIGdlbmVyYXRpb24uXG4gICAqIEBwYXJhbSBwYXJlbnQgdGhlIGBTY29wZWAgb2YgdGhlIHBhcmVudCB0ZW1wbGF0ZSAoaWYgYW55KSBvciBgbnVsbGAgaWYgdGhpcyBpcyB0aGUgcm9vdFxuICAgKiBgU2NvcGVgLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVPck5vZGVzIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIHJlcHJlc2VudGluZyB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIHRvXG4gICAqIGNhbGN1bGF0ZSB0aGUgYFNjb3BlYCwgb3IgYSBsaXN0IG9mIG5vZGVzIGlmIG5vIG91dGVyIHRlbXBsYXRlIG9iamVjdCBpcyBhdmFpbGFibGUuXG4gICAqIEBwYXJhbSBndWFyZCBhbiBleHByZXNzaW9uIHRoYXQgaXMgYXBwbGllZCB0byB0aGlzIHNjb3BlIGZvciB0eXBlIG5hcnJvd2luZyBwdXJwb3Nlcy5cbiAgICovXG4gIHN0YXRpYyBmb3JOb2RlcyhcbiAgICAgIHRjYjogQ29udGV4dCwgcGFyZW50OiBTY29wZXxudWxsLCB0ZW1wbGF0ZU9yTm9kZXM6IFRtcGxBc3RUZW1wbGF0ZXwoVG1wbEFzdE5vZGVbXSksXG4gICAgICBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsKTogU2NvcGUge1xuICAgIGNvbnN0IHNjb3BlID0gbmV3IFNjb3BlKHRjYiwgcGFyZW50LCBndWFyZCk7XG5cbiAgICBsZXQgY2hpbGRyZW46IFRtcGxBc3ROb2RlW107XG5cbiAgICAvLyBJZiBnaXZlbiBhbiBhY3R1YWwgYFRtcGxBc3RUZW1wbGF0ZWAgaW5zdGFuY2UsIHRoZW4gcHJvY2VzcyBhbnkgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBpdFxuICAgIC8vIGhhcy5cbiAgICBpZiAodGVtcGxhdGVPck5vZGVzIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUncyB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgbmVlZCB0byBiZSBhZGRlZCBhcyBgVGNiVmFyaWFibGVPcGBzLlxuICAgICAgZm9yIChjb25zdCB2IG9mIHRlbXBsYXRlT3JOb2Rlcy52YXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3Qgb3BJbmRleCA9IHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiVmFyaWFibGVPcCh0Y2IsIHNjb3BlLCB0ZW1wbGF0ZU9yTm9kZXMsIHYpKSAtIDE7XG4gICAgICAgIHNjb3BlLnZhck1hcC5zZXQodiwgb3BJbmRleCk7XG4gICAgICB9XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2Rlcy5jaGlsZHJlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXM7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBjaGlsZHJlbikge1xuICAgICAgc2NvcGUuYXBwZW5kTm9kZShub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgYSBgdHMuRXhwcmVzc2lvbmAgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiBzb21lIG9wZXJhdGlvbiBpbiB0aGUgY3VycmVudCBgU2NvcGVgLFxuICAgKiBpbmNsdWRpbmcgYW55IHBhcmVudCBzY29wZShzKS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBgVG1wbEFzdE5vZGVgIG9mIHRoZSBvcGVyYXRpb24gaW4gcXVlc3Rpb24uIFRoZSBsb29rdXAgcGVyZm9ybWVkIHdpbGwgZGVwZW5kIG9uXG4gICAqIHRoZSB0eXBlIG9mIHRoaXMgbm9kZTpcbiAgICpcbiAgICogQXNzdW1pbmcgYGRpcmVjdGl2ZWAgaXMgbm90IHByZXNlbnQsIHRoZW4gYHJlc29sdmVgIHdpbGwgcmV0dXJuOlxuICAgKlxuICAgKiAqIGBUbXBsQXN0RWxlbWVudGAgLSByZXRyaWV2ZSB0aGUgZXhwcmVzc2lvbiBmb3IgdGhlIGVsZW1lbnQgRE9NIG5vZGVcbiAgICogKiBgVG1wbEFzdFRlbXBsYXRlYCAtIHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHZhcmlhYmxlXG4gICAqICogYFRtcGxBc3RWYXJpYWJsZWAgLSByZXRyaWV2ZSBhIHRlbXBsYXRlIGxldC0gdmFyaWFibGVcbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBpZiBwcmVzZW50LCBhIGRpcmVjdGl2ZSB0eXBlIG9uIGEgYFRtcGxBc3RFbGVtZW50YCBvciBgVG1wbEFzdFRlbXBsYXRlYCB0b1xuICAgKiBsb29rIHVwIGluc3RlYWQgb2YgdGhlIGRlZmF1bHQgZm9yIGFuIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZS5cbiAgICovXG4gIHJlc29sdmUoXG4gICAgICBub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG9wZXJhdGlvbiBsb2NhbGx5LlxuICAgIGNvbnN0IHJlcyA9IHRoaXMucmVzb2x2ZUxvY2FsKG5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgaWYgKHJlcyAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2UgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBDaGVjayB3aXRoIHRoZSBwYXJlbnQuXG4gICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZShub2RlLCBkaXJlY3RpdmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICR7bm9kZX0gLyAke2RpcmVjdGl2ZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgc3RhdGVtZW50IHRvIHRoaXMgc2NvcGUuXG4gICAqL1xuICBhZGRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7IHRoaXMuc3RhdGVtZW50cy5wdXNoKHN0bXQpOyB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc3RhdGVtZW50cy5cbiAgICovXG4gIHJlbmRlcigpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm9wUXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuZXhlY3V0ZU9wKGkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZW1lbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gZXhwcmVzc2lvbiBvZiBhbGwgdGVtcGxhdGUgZ3VhcmRzIHRoYXQgYXBwbHkgdG8gdGhpcyBzY29wZSwgaW5jbHVkaW5nIHRob3NlIG9mXG4gICAqIHBhcmVudCBzY29wZXMuIElmIG5vIGd1YXJkcyBoYXZlIGJlZW4gYXBwbGllZCwgbnVsbCBpcyByZXR1cm5lZC5cbiAgICovXG4gIGd1YXJkcygpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGxldCBwYXJlbnRHdWFyZHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBTdGFydCB3aXRoIHRoZSBndWFyZHMgZnJvbSB0aGUgcGFyZW50IHNjb3BlLCBpZiBwcmVzZW50LlxuICAgICAgcGFyZW50R3VhcmRzID0gdGhpcy5wYXJlbnQuZ3VhcmRzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ3VhcmQgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoaXMgc2NvcGUgZG9lcyBub3QgaGF2ZSBhIGd1YXJkLCBzbyByZXR1cm4gdGhlIHBhcmVudCdzIGd1YXJkcyBhcyBpcy5cbiAgICAgIHJldHVybiBwYXJlbnRHdWFyZHM7XG4gICAgfSBlbHNlIGlmIChwYXJlbnRHdWFyZHMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlJ3Mgbm8gZ3VhcmRzIGZyb20gdGhlIHBhcmVudCBzY29wZSwgc28gdGhpcyBzY29wZSdzIGd1YXJkIHJlcHJlc2VudHMgYWxsIGF2YWlsYWJsZVxuICAgICAgLy8gZ3VhcmRzLlxuICAgICAgcmV0dXJuIHRoaXMuZ3VhcmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEJvdGggdGhlIHBhcmVudCBzY29wZSBhbmQgdGhpcyBzY29wZSBwcm92aWRlIGEgZ3VhcmQsIHNvIGNyZWF0ZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB0d28uXG4gICAgICAvLyBJdCBpcyBpbXBvcnRhbnQgdGhhdCB0aGUgcGFyZW50IGd1YXJkIGlzIHVzZWQgYXMgbGVmdCBvcGVyYW5kLCBnaXZlbiB0aGF0IGl0IG1heSBwcm92aWRlXG4gICAgICAvLyBuYXJyb3dpbmcgdGhhdCBpcyByZXF1aXJlZCBmb3IgdGhpcyBzY29wZSdzIGd1YXJkIHRvIGJlIHZhbGlkLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShwYXJlbnRHdWFyZHMsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIHRoaXMuZ3VhcmQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUxvY2FsKFxuICAgICAgcmVmOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUgJiYgdGhpcy52YXJNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBgVGNiVmFyaWFibGVPcGAgYXNzb2NpYXRlZCB3aXRoIHRoZSBgVG1wbEFzdFZhcmlhYmxlYC5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnZhck1hcC5nZXQocmVmKSAhKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgJiYgZGlyZWN0aXZlID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIGNvbnRleHQgb2YgdGhlIGdpdmVuIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuZ2V0KHJlZikgISk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkgJiZcbiAgICAgICAgZGlyZWN0aXZlICE9PSB1bmRlZmluZWQgJiYgdGhpcy5kaXJlY3RpdmVPcE1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIGEgZGlyZWN0aXZlIG9uIGFuIGVsZW1lbnQgb3Igc3ViLXRlbXBsYXRlLlxuICAgICAgY29uc3QgZGlyTWFwID0gdGhpcy5kaXJlY3RpdmVPcE1hcC5nZXQocmVmKSAhO1xuICAgICAgaWYgKGRpck1hcC5oYXMoZGlyZWN0aXZlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AoZGlyTWFwLmdldChkaXJlY3RpdmUpICEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCAmJiB0aGlzLmVsZW1lbnRPcE1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIHRoZSBET00gbm9kZSBvZiBhbiBlbGVtZW50IGluIHRoaXMgdGVtcGxhdGUuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy5lbGVtZW50T3BNYXAuZ2V0KHJlZikgISk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBMaWtlIGBleGVjdXRlT3BgLCBidXQgYXNzZXJ0IHRoYXQgdGhlIG9wZXJhdGlvbiBhY3R1YWxseSByZXR1cm5lZCBgdHMuRXhwcmVzc2lvbmAuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVPcChvcEluZGV4OiBudW1iZXIpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCByZXMgPSB0aGlzLmV4ZWN1dGVPcChvcEluZGV4KTtcbiAgICBpZiAocmVzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIHJlc29sdmluZyBvcGVyYXRpb24sIGdvdCBudWxsYCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIHBhcnRpY3VsYXIgYFRjYk9wYCBpbiB0aGUgYG9wUXVldWVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCByZXBsYWNlcyB0aGUgb3BlcmF0aW9uIGluIHRoZSBgb3BRdWV1ZWAgd2l0aCB0aGUgcmVzdWx0IG9mIGV4ZWN1dGlvbiAob25jZSBkb25lKVxuICAgKiBhbmQgYWxzbyBwcm90ZWN0cyBhZ2FpbnN0IGEgY2lyY3VsYXIgZGVwZW5kZW5jeSBmcm9tIHRoZSBvcGVyYXRpb24gdG8gaXRzZWxmIGJ5IHRlbXBvcmFyaWx5XG4gICAqIHNldHRpbmcgdGhlIG9wZXJhdGlvbidzIHJlc3VsdCB0byBhIHNwZWNpYWwgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZXhlY3V0ZU9wKG9wSW5kZXg6IG51bWJlcik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3Qgb3AgPSB0aGlzLm9wUXVldWVbb3BJbmRleF07XG4gICAgaWYgKCEob3AgaW5zdGFuY2VvZiBUY2JPcCkpIHtcbiAgICAgIHJldHVybiBvcDtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uIGluIHRoZSBxdWV1ZSB0byBhIHNwZWNpYWwgZXhwcmVzc2lvbi4gSWYgZXhlY3V0aW5nIHRoaXNcbiAgICAvLyBvcGVyYXRpb24gcmVzdWx0cyBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3ksIHRoaXMgd2lsbCBicmVhayB0aGUgY3ljbGUgYW5kIGluZmVyIHRoZSBsZWFzdFxuICAgIC8vIG5hcnJvdyB0eXBlIHdoZXJlIG5lZWRlZCAod2hpY2ggaXMgaG93IFR5cGVTY3JpcHQgZGVhbHMgd2l0aCBjaXJjdWxhciBkZXBlbmRlbmNpZXMgaW4gdHlwZXMpLlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFI7XG4gICAgY29uc3QgcmVzID0gb3AuZXhlY3V0ZSgpO1xuICAgIC8vIE9uY2UgdGhlIG9wZXJhdGlvbiBoYXMgZmluaXNoZWQgZXhlY3V0aW5nLCBpdCdzIHNhZmUgdG8gY2FjaGUgdGhlIHJlYWwgcmVzdWx0LlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IHJlcztcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmROb2RlKG5vZGU6IFRtcGxBc3ROb2RlKTogdm9pZCB7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgY29uc3Qgb3BJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JFbGVtZW50T3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKSAtIDE7XG4gICAgICB0aGlzLmVsZW1lbnRPcE1hcC5zZXQobm9kZSwgb3BJbmRleCk7XG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgdGhpcy5hcHBlbmROb2RlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tSZWZlcmVuY2VzT2ZOb2RlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gVGVtcGxhdGUgY2hpbGRyZW4gYXJlIHJlbmRlcmVkIGluIGEgY2hpbGQgc2NvcGUuXG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1RlbXBsYXRlQm9kaWVzKSB7XG4gICAgICAgIGNvbnN0IGN0eEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQ29udGV4dE9wKHRoaXMudGNiLCB0aGlzKSkgLSAxO1xuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuc2V0KG5vZGUsIGN0eEluZGV4KTtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQm9keU9wKHRoaXMudGNiLCB0aGlzLCBub2RlKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrUmVmZXJlbmNlc09mTm9kZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tSZWZlcmVuY2VzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcmVmIG9mIG5vZGUucmVmZXJlbmNlcykge1xuICAgICAgaWYgKHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMudGNiLm9vYlJlY29yZGVyLm1pc3NpbmdSZWZlcmVuY2VUYXJnZXQodGhpcy50Y2IuaWQsIHJlZik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmREaXJlY3RpdmVzQW5kSW5wdXRzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBpbnB1dHMgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgY2xhaW1lZElucHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKG5vZGUpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsIHx8IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcywgdGhlbiBhbGwgaW5wdXRzIGFyZSB1bmNsYWltZWQgaW5wdXRzLCBzbyBxdWV1ZSBhbiBvcGVyYXRpb25cbiAgICAgIC8vIHRvIGFkZCB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZElucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKFxuICAgICAgICAgICAgbmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgLyogY2hlY2tFbGVtZW50ICovIHRydWUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJNYXAgPSBuZXcgTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgY29uc3QgZGlySW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRGlyZWN0aXZlT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikpIC0gMTtcbiAgICAgIGRpck1hcC5zZXQoZGlyLCBkaXJJbmRleCk7XG4gICAgfVxuICAgIHRoaXMuZGlyZWN0aXZlT3BNYXAuc2V0KG5vZGUsIGRpck1hcCk7XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBpbnB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVtb3ZlIGFueSBpbnB1dHMgdGhhdCBpdCBjbGFpbXMgZnJvbSBgZWxlbWVudElucHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIE9iamVjdC5rZXlzKGRpci5pbnB1dHMpKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBkaXIuaW5wdXRzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQoQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZVswXSA6IHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkSW5wdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIHRoaXMgZWxlbWVudCwgdGhlbiBpdCdzIGEgXCJwbGFpblwiIERPTSBlbGVtZW50IChvciBhXG4gICAgICAvLyB3ZWIgY29tcG9uZW50KSwgYW5kIHNob3VsZCBiZSBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuIElmIGFueSBkaXJlY3RpdmVzIG1hdGNoLFxuICAgICAgLy8gd2UgbXVzdCBhc3N1bWUgdGhhdCB0aGUgZWxlbWVudCBjb3VsZCBiZSBjdXN0b20gKGVpdGhlciBhIGNvbXBvbmVudCwgb3IgYSBkaXJlY3RpdmUgbGlrZVxuICAgICAgLy8gPHJvdXRlci1vdXRsZXQ+KSBhbmQgc2hvdWxkbid0IHZhbGlkYXRlIHRoZSBlbGVtZW50IG5hbWUgaXRzZWxmLlxuICAgICAgY29uc3QgY2hlY2tFbGVtZW50ID0gZGlyZWN0aXZlcy5sZW5ndGggPT09IDA7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCBjaGVja0VsZW1lbnQsIGNsYWltZWRJbnB1dHMpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE91dHB1dHNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIG91dHB1dHMgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgY2xhaW1lZE91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIG91dHB1dHMgYXJlIHVuY2xhaW1lZCBvdXRwdXRzLCBzbyBxdWV1ZSBhbiBvcGVyYXRpb25cbiAgICAgIC8vIHRvIGFkZCB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZE91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZE91dHB1dHMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBRdWV1ZSBvcGVyYXRpb25zIGZvciBhbGwgZGlyZWN0aXZlcyB0byBjaGVjayB0aGUgcmVsZXZhbnQgb3V0cHV0cyBmb3IgYSBkaXJlY3RpdmUuXG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRpcmVjdGl2ZU91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgZXhwYW5kaW5nIHRoZSBkaXJlY3RpdmVzLCB3ZSBtaWdodCBuZWVkIHRvIHF1ZXVlIGFuIG9wZXJhdGlvbiB0byBjaGVjayBhbnkgdW5jbGFpbWVkXG4gICAgLy8gb3V0cHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZWdpc3RlciBhbnkgb3V0cHV0cyB0aGF0IGl0IGNsYWltcyBpbiBgY2xhaW1lZE91dHB1dHNgLlxuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dEZpZWxkIG9mIE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSkge1xuICAgICAgICAgIGNsYWltZWRPdXRwdXRzLmFkZChkaXIub3V0cHV0c1tvdXRwdXRGaWVsZF0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBgY3R4YCBwYXJhbWV0ZXIgdG8gdGhlIHRvcC1sZXZlbCBUQ0IgZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBhIHBhcmFtZXRlciB3aXRoIGEgdHlwZSBlcXVpdmFsZW50IHRvIHRoZSBjb21wb25lbnQgdHlwZSwgd2l0aCBhbGwgZ2VuZXJpYyB0eXBlXG4gKiBwYXJhbWV0ZXJzIGxpc3RlZCAod2l0aG91dCB0aGVpciBnZW5lcmljIGJvdW5kcykuXG4gKi9cbmZ1bmN0aW9uIHRjYkN0eFBhcmFtKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG5hbWU6IHRzLkVudGl0eU5hbWUsXG4gICAgdXNlR2VuZXJpY1R5cGU6IGJvb2xlYW4pOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiB7XG4gIGxldCB0eXBlQXJndW1lbnRzOiB0cy5UeXBlTm9kZVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgLy8gQ2hlY2sgaWYgdGhlIGNvbXBvbmVudCBpcyBnZW5lcmljLCBhbmQgcGFzcyBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBpZiBzby5cbiAgaWYgKG5vZGUudHlwZVBhcmFtZXRlcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh1c2VHZW5lcmljVHlwZSkge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUocGFyYW0ubmFtZSwgdW5kZWZpbmVkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVBcmd1bWVudHMgPVxuICAgICAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKCgpID0+IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKG5hbWUsIHR5cGVBcmd1bWVudHMpO1xuICByZXR1cm4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyAnY3R4JyxcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFuIGBBU1RgIGV4cHJlc3Npb24gYW5kIGNvbnZlcnQgaXQgaW50byBhIGB0cy5FeHByZXNzaW9uYCwgZ2VuZXJhdGluZyByZWZlcmVuY2VzIHRvIHRoZVxuICogY29ycmVjdCBpZGVudGlmaWVycyBpbiB0aGUgY3VycmVudCBzY29wZS5cbiAqL1xuZnVuY3Rpb24gdGNiRXhwcmVzc2lvbihhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvcih0Y2IsIHNjb3BlKTtcbiAgcmV0dXJuIHRyYW5zbGF0b3IudHJhbnNsYXRlKGFzdCk7XG59XG5cbmNsYXNzIFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHRjYjogQ29udGV4dCwgcHJvdGVjdGVkIHNjb3BlOiBTY29wZSkge31cblxuICB0cmFuc2xhdGUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBgYXN0VG9UeXBlc2NyaXB0YCBhY3R1YWxseSBkb2VzIHRoZSBjb252ZXJzaW9uLiBBIHNwZWNpYWwgcmVzb2x2ZXIgYHRjYlJlc29sdmVgIGlzIHBhc3NlZFxuICAgIC8vIHdoaWNoIGludGVycHJldHMgc3BlY2lmaWMgZXhwcmVzc2lvbiBub2RlcyB0aGF0IGludGVyYWN0IHdpdGggdGhlIGBJbXBsaWNpdFJlY2VpdmVyYC4gVGhlc2VcbiAgICAvLyBub2RlcyBhY3R1YWxseSByZWZlciB0byBpZGVudGlmaWVycyB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICAgcmV0dXJuIGFzdFRvVHlwZXNjcmlwdChhc3QsIGFzdCA9PiB0aGlzLnJlc29sdmUoYXN0KSwgdGhpcy50Y2IuZW52LmNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhbiBgQVNUYCBleHByZXNzaW9uIHdpdGhpbiB0aGUgZ2l2ZW4gc2NvcGUuXG4gICAqXG4gICAqIFNvbWUgYEFTVGAgZXhwcmVzc2lvbnMgcmVmZXIgdG8gdG9wLWxldmVsIGNvbmNlcHRzIChyZWZlcmVuY2VzLCB2YXJpYWJsZXMsIHRoZSBjb21wb25lbnRcbiAgICogY29udGV4dCkuIFRoaXMgbWV0aG9kIGFzc2lzdHMgaW4gcmVzb2x2aW5nIHRob3NlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgYSBib3VuZCB0YXJnZXQgZm9yIHRoaXMgZXhwcmVzc2lvbi4gSWYgbm8gc3VjaCB0YXJnZXQgaXMgYXZhaWxhYmxlLCB0aGVuXG4gICAgICAvLyB0aGUgZXhwcmVzc2lvbiBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsIGNvbXBvbmVudCBjb250ZXh0LiBJbiB0aGF0IGNhc2UsIGBudWxsYCBpc1xuICAgICAgLy8gcmV0dXJuZWQgaGVyZSB0byBsZXQgaXQgZmFsbCB0aHJvdWdoIHJlc29sdXRpb24gc28gaXQgd2lsbCBiZSBjYXVnaHQgd2hlbiB0aGVcbiAgICAgIC8vIGBJbXBsaWNpdFJlY2VpdmVyYCBpcyByZXNvbHZlZCBpbiB0aGUgYnJhbmNoIGJlbG93LlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnJlc29sdmVUYXJnZXQoYXN0KTtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QudmFsdWUpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQmluYXJ5KHRhcmdldCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgZXhwcikpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXN1bHQsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBBU1QgaW5zdGFuY2VzIHJlcHJlc2VudGluZyB2YXJpYWJsZXMgYW5kIHJlZmVyZW5jZXMgbG9vayB2ZXJ5IHNpbWlsYXIgdG8gcHJvcGVydHkgcmVhZHNcbiAgICAgIC8vIG9yIG1ldGhvZCBjYWxscyBmcm9tIHRoZSBjb21wb25lbnQgY29udGV4dDogYm90aCBoYXZlIHRoZSBzaGFwZVxuICAgICAgLy8gUHJvcGVydHlSZWFkKEltcGxpY2l0UmVjZWl2ZXIsICdwcm9wTmFtZScpIG9yIE1ldGhvZENhbGwoSW1wbGljaXRSZWNlaXZlciwgJ21ldGhvZE5hbWUnKS5cbiAgICAgIC8vXG4gICAgICAvLyBgdHJhbnNsYXRlYCB3aWxsIGZpcnN0IHRyeSB0byBgcmVzb2x2ZWAgdGhlIG91dGVyIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsLiBJZiB0aGlzIHdvcmtzLFxuICAgICAgLy8gaXQncyBiZWNhdXNlIHRoZSBgQm91bmRUYXJnZXRgIGZvdW5kIGFuIGV4cHJlc3Npb24gdGFyZ2V0IGZvciB0aGUgd2hvbGUgZXhwcmVzc2lvbiwgYW5kXG4gICAgICAvLyB0aGVyZWZvcmUgYHRyYW5zbGF0ZWAgd2lsbCBuZXZlciBhdHRlbXB0IHRvIGByZXNvbHZlYCB0aGUgSW1wbGljaXRSZWNlaXZlciBvZiB0aGF0XG4gICAgICAvLyBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbC5cbiAgICAgIC8vXG4gICAgICAvLyBUaGVyZWZvcmUgaWYgYHJlc29sdmVgIGlzIGNhbGxlZCBvbiBhbiBgSW1wbGljaXRSZWNlaXZlcmAsIGl0J3MgYmVjYXVzZSBubyBvdXRlclxuICAgICAgLy8gUHJvcGVydHlSZWFkL01ldGhvZENhbGwgcmVzb2x2ZWQgdG8gYSB2YXJpYWJsZSBvciByZWZlcmVuY2UsIGFuZCB0aGVyZWZvcmUgdGhpcyBpcyBhXG4gICAgICAvLyBwcm9wZXJ0eSByZWFkIG9yIG1ldGhvZCBjYWxsIG9uIHRoZSBjb21wb25lbnQgY29udGV4dCBpdHNlbGYuXG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignY3R4Jyk7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSkge1xuICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5leHApO1xuICAgICAgbGV0IHBpcGU6IHRzLkV4cHJlc3Npb258bnVsbDtcbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mUGlwZXMpIHtcbiAgICAgICAgcGlwZSA9IHRoaXMudGNiLmdldFBpcGVCeU5hbWUoYXN0Lm5hbWUpO1xuICAgICAgICBpZiAocGlwZSA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIE5vIHBpcGUgYnkgdGhhdCBuYW1lIGV4aXN0cyBpbiBzY29wZS4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IuXG4gICAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1BpcGUodGhpcy50Y2IuaWQsIGFzdCk7XG5cbiAgICAgICAgICAvLyBSZXR1cm4gYW4gJ2FueScgdmFsdWUgdG8gYXQgbGVhc3QgYWxsb3cgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24gdG8gYmUgY2hlY2tlZC5cbiAgICAgICAgICBwaXBlID0gTlVMTF9BU19BTlk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBpcGUgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVBc0V4cHJlc3Npb24oXG4gICAgICAgICAgICB0cy5jcmVhdGVOdWxsKCksIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLnRyYW5zbGF0ZShhcmcpKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzQ2FsbE1ldGhvZChwaXBlLCAndHJhbnNmb3JtJywgW2V4cHIsIC4uLmFyZ3NdKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgTWV0aG9kQ2FsbCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBSZXNvbHZlIHRoZSBzcGVjaWFsIGAkYW55KGV4cHIpYCBzeW50YXggdG8gaW5zZXJ0IGEgY2FzdCBvZiB0aGUgYXJndW1lbnQgdG8gdHlwZSBgYW55YC5cbiAgICAgIGlmIChhc3QubmFtZSA9PT0gJyRhbnknICYmIGFzdC5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmFyZ3NbMF0pO1xuICAgICAgICBjb25zdCBleHByQXNBbnkgPVxuICAgICAgICAgICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKGV4cHIsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdHMuY3JlYXRlUGFyZW4oZXhwckFzQW55KTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXN1bHQsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cblxuICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIGEgYm91bmQgdGFyZ2V0IGZvciB0aGUgbWV0aG9kLCBhbmQgZ2VuZXJhdGUgdGhlIG1ldGhvZCBjYWxsIGlmIGEgdGFyZ2V0XG4gICAgICAvLyBjb3VsZCBiZSByZXNvbHZlZC4gSWYgbm8gdGFyZ2V0IGlzIGF2YWlsYWJsZSwgdGhlbiB0aGUgbWV0aG9kIGlzIHJlZmVyZW5jaW5nIHRoZSB0b3AtbGV2ZWxcbiAgICAgIC8vIGNvbXBvbmVudCBjb250ZXh0LCBpbiB3aGljaCBjYXNlIGBudWxsYCBpcyByZXR1cm5lZCB0byBsZXQgdGhlIGBJbXBsaWNpdFJlY2VpdmVyYCBiZWluZ1xuICAgICAgLy8gcmVzb2x2ZWQgdG8gdGhlIGNvbXBvbmVudCBjb250ZXh0LlxuICAgICAgY29uc3QgcmVjZWl2ZXIgPSB0aGlzLnJlc29sdmVUYXJnZXQoYXN0KTtcbiAgICAgIGlmIChyZWNlaXZlciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0aG9kID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3Mod3JhcEZvckRpYWdub3N0aWNzKHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlQ2FsbChtZXRob2QsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIEFTVCBpc24ndCBzcGVjaWFsIGFmdGVyIGFsbC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIGEgYm91bmQgdGFyZ2V0IGZvciBhIGdpdmVuIGV4cHJlc3Npb24sIGFuZCB0cmFuc2xhdGVzIGl0IGludG8gdGhlXG4gICAqIGFwcHJvcHJpYXRlIGB0cy5FeHByZXNzaW9uYCB0aGF0IHJlcHJlc2VudHMgdGhlIGJvdW5kIHRhcmdldC4gSWYgbm8gdGFyZ2V0IGlzIGF2YWlsYWJsZSxcbiAgICogYG51bGxgIGlzIHJldHVybmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVUYXJnZXQoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGJpbmRpbmcgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGFzdCk7XG4gICAgaWYgKGJpbmRpbmcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoaXMgZXhwcmVzc2lvbiBoYXMgYSBiaW5kaW5nIHRvIHNvbWUgdmFyaWFibGUgb3IgcmVmZXJlbmNlIGluIHRoZSB0ZW1wbGF0ZS4gUmVzb2x2ZSBpdC5cbiAgICBpZiAoYmluZGluZyBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgY29uc3QgZXhwciA9IHRzLmdldE11dGFibGVDbG9uZSh0aGlzLnNjb3BlLnJlc29sdmUoYmluZGluZykpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gZXhwcjtcbiAgICB9IGVsc2UgaWYgKGJpbmRpbmcgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRSZWZlcmVuY2VUYXJnZXQoYmluZGluZyk7XG4gICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgcmVmZXJlbmNlIGlzIHVuYm91bmQuIFRyYXZlcnNhbCBvZiB0aGUgYFRtcGxBc3RSZWZlcmVuY2VgIGl0c2VsZiBzaG91bGQgaGF2ZVxuICAgICAgICAvLyByZWNvcmRlZCB0aGUgZXJyb3IgaW4gdGhlIGBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJgLlxuICAgICAgICAvLyBTdGlsbCBjaGVjayB0aGUgcmVzdCBvZiB0aGUgZXhwcmVzc2lvbiBpZiBwb3NzaWJsZSBieSB1c2luZyBhbiBgYW55YCB2YWx1ZS5cbiAgICAgICAgcmV0dXJuIE5VTExfQVNfQU5ZO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcmVmZXJlbmNlIGlzIGVpdGhlciB0byBhbiBlbGVtZW50LCBhbiA8bmctdGVtcGxhdGU+IG5vZGUsIG9yIHRvIGEgZGlyZWN0aXZlIG9uIGFuXG4gICAgICAvLyBlbGVtZW50IG9yIHRlbXBsYXRlLlxuXG4gICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcykge1xuICAgICAgICAgIC8vIFJlZmVyZW5jZXMgdG8gRE9NIG5vZGVzIGFyZSBwaW5uZWQgdG8gJ2FueScuXG4gICAgICAgICAgcmV0dXJuIE5VTExfQVNfQU5ZO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwciA9IHRzLmdldE11dGFibGVDbG9uZSh0aGlzLnNjb3BlLnJlc29sdmUodGFyZ2V0KSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgIH0gZWxzZSBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXMpIHtcbiAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIGBUZW1wbGF0ZVJlZmBzIHBpbm5lZCB0byAnYW55Jy5cbiAgICAgICAgICByZXR1cm4gTlVMTF9BU19BTlk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXJlY3QgcmVmZXJlbmNlcyB0byBhbiA8bmctdGVtcGxhdGU+IG5vZGUgc2ltcGx5IHJlcXVpcmUgYSB2YWx1ZSBvZiB0eXBlXG4gICAgICAgIC8vIGBUZW1wbGF0ZVJlZjxhbnk+YC4gVG8gZ2V0IHRoaXMsIGFuIGV4cHJlc3Npb24gb2YgdGhlIGZvcm1cbiAgICAgICAgLy8gYChudWxsIGFzIGFueSBhcyBUZW1wbGF0ZVJlZjxhbnk+KWAgaXMgY29uc3RydWN0ZWQuXG4gICAgICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgICAgICAgdmFsdWUgPSB0cy5jcmVhdGVBc0V4cHJlc3Npb24odmFsdWUsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICAgICAgdmFsdWUgPSB0cy5jcmVhdGVBc0V4cHJlc3Npb24oXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoJ0Bhbmd1bGFyL2NvcmUnLCAnVGVtcGxhdGVSZWYnLCBbRFlOQU1JQ19UWVBFXSkpO1xuICAgICAgICB2YWx1ZSA9IHRzLmNyZWF0ZVBhcmVuKHZhbHVlKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyh2YWx1ZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzKSB7XG4gICAgICAgICAgLy8gUmVmZXJlbmNlcyB0byBkaXJlY3RpdmVzIGFyZSBwaW5uZWQgdG8gJ2FueScuXG4gICAgICAgICAgcmV0dXJuIE5VTExfQVNfQU5ZO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwciA9IHRzLmdldE11dGFibGVDbG9uZSh0aGlzLnNjb3BlLnJlc29sdmUodGFyZ2V0Lm5vZGUsIHRhcmdldC5kaXJlY3RpdmUpKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICAgIHJldHVybiBleHByO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVhY2hhYmxlOiAke2JpbmRpbmd9YCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUsIGluZmVycmluZyBhIHR5cGUgZm9yXG4gKiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGZyb20gYW55IGJvdW5kIGlucHV0cy5cbiAqL1xuZnVuY3Rpb24gdGNiQ2FsbFR5cGVDdG9yKFxuICAgIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCwgaW5wdXRzOiBUY2JEaXJlY3RpdmVJbnB1dFtdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHR5cGVDdG9yID0gdGNiLmVudi50eXBlQ3RvckZvcihkaXIpO1xuXG4gIC8vIENvbnN0cnVjdCBhbiBhcnJheSBvZiBgdHMuUHJvcGVydHlBc3NpZ25tZW50YHMgZm9yIGVhY2ggb2YgdGhlIGRpcmVjdGl2ZSdzIGlucHV0cy5cbiAgY29uc3QgbWVtYmVycyA9IGlucHV0cy5tYXAoaW5wdXQgPT4ge1xuICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoaW5wdXQuZmllbGQpO1xuXG4gICAgaWYgKGlucHV0LnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IGlucHV0LmV4cHJlc3Npb247XG4gICAgICBpZiAoIXRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYXNzaWdubWVudCA9IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIGFzc2lnbm1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEEgdHlwZSBjb25zdHJ1Y3RvciBpcyByZXF1aXJlZCB0byBiZSBjYWxsZWQgd2l0aCBhbGwgaW5wdXQgcHJvcGVydGllcywgc28gYW55IHVuc2V0XG4gICAgICAvLyBpbnB1dHMgYXJlIHNpbXBseSBhc3NpZ25lZCBhIHZhbHVlIG9mIHR5cGUgYGFueWAgdG8gaWdub3JlIHRoZW0uXG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5TmFtZSwgTlVMTF9BU19BTlkpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2FsbCB0aGUgYG5nVHlwZUN0b3JgIG1ldGhvZCBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzLCB3aXRoIGFuIG9iamVjdCBsaXRlcmFsIGFyZ3VtZW50IGNyZWF0ZWRcbiAgLy8gZnJvbSB0aGUgbWF0Y2hlZCBpbnB1dHMuXG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyB0eXBlQ3RvcixcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9bdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKV0pO1xufVxuXG50eXBlIFRjYkRpcmVjdGl2ZUlucHV0ID0ge1xuICB0eXBlOiAnYmluZGluZyc7IGZpZWxkOiBzdHJpbmc7IGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247IHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbjtcbn0gfFxue1xuICB0eXBlOiAndW5zZXQnO1xuICBmaWVsZDogc3RyaW5nO1xufTtcblxuZnVuY3Rpb24gdGNiR2V0RGlyZWN0aXZlSW5wdXRzKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdGNiOiBDb250ZXh0LFxuICAgIHNjb3BlOiBTY29wZSk6IFRjYkRpcmVjdGl2ZUlucHV0W10ge1xuICAvLyBPbmx5IHRoZSBmaXJzdCBiaW5kaW5nIHRvIGEgcHJvcGVydHkgaXMgd3JpdHRlbi5cbiAgLy8gVE9ETyhhbHhodWIpOiBwcm9kdWNlIGFuIGVycm9yIGZvciBkdXBsaWNhdGUgYmluZGluZ3MgdG8gdGhlIHNhbWUgcHJvcGVydHksIGluZGVwZW5kZW50bHkgb2ZcbiAgLy8gdGhpcyBsb2dpYy5cbiAgY29uc3QgZGlyZWN0aXZlSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIFRjYkRpcmVjdGl2ZUlucHV0PigpO1xuICAvLyBgZGlyLmlucHV0c2AgaXMgYW4gb2JqZWN0IG1hcCBvZiBmaWVsZCBuYW1lcyBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzIHRvIHByb3BlcnR5IG5hbWVzLlxuICAvLyBUaGlzIGlzIGJhY2t3YXJkcyBmcm9tIHdoYXQncyBuZWVkZWQgdG8gbWF0Y2ggYmluZGluZ3MgLSBhIG1hcCBvZiBwcm9wZXJ0aWVzIHRvIGZpZWxkIG5hbWVzXG4gIC8vIGlzIGRlc2lyZWQuIEludmVydCBgZGlyLmlucHV0c2AgaW50byBgcHJvcE1hdGNoYCB0byBjcmVhdGUgdGhpcyBtYXAuXG4gIGNvbnN0IHByb3BNYXRjaCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGlucHV0cyA9IGRpci5pbnB1dHM7XG4gIE9iamVjdC5rZXlzKGlucHV0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgIEFycmF5LmlzQXJyYXkoaW5wdXRzW2tleV0pID8gcHJvcE1hdGNoLnNldChpbnB1dHNba2V5XVswXSwga2V5KSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wTWF0Y2guc2V0KGlucHV0c1trZXldIGFzIHN0cmluZywga2V5KTtcbiAgfSk7XG5cbiAgZWwuaW5wdXRzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIGVsLmF0dHJpYnV0ZXMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgaWYgKGVsIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgZWwudGVtcGxhdGVBdHRycy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICB9XG5cbiAgLy8gQWRkIHVuc2V0IGRpcmVjdGl2ZSBpbnB1dHMgZm9yIGVhY2ggb2YgdGhlIHJlbWFpbmluZyB1bnNldCBmaWVsZHMuXG4gIC8vIE5vdGU6IGl0J3MgYWN0dWFsbHkgaW1wb3J0YW50IGhlcmUgdGhhdCBgcHJvcE1hdGNoLnZhbHVlcygpYCBpc24ndCB1c2VkLCBhcyB0aGVyZSBjYW4gYmVcbiAgLy8gbXVsdGlwbGUgZmllbGRzIHdoaWNoIHNoYXJlIHRoZSBzYW1lIHByb3BlcnR5IG5hbWUgYW5kIG9ubHkgb25lIG9mIHRoZW0gd2lsbCBiZSBsaXN0ZWQgYXMgYVxuICAvLyB2YWx1ZSBpbiBgcHJvcE1hdGNoYC5cbiAgZm9yIChjb25zdCBmaWVsZCBvZiBPYmplY3Qua2V5cyhpbnB1dHMpKSB7XG4gICAgaWYgKCFkaXJlY3RpdmVJbnB1dHMuaGFzKGZpZWxkKSkge1xuICAgICAgZGlyZWN0aXZlSW5wdXRzLnNldChmaWVsZCwge3R5cGU6ICd1bnNldCcsIGZpZWxkfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIEFycmF5LmZyb20oZGlyZWN0aXZlSW5wdXRzLnZhbHVlcygpKTtcblxuICAvKipcbiAgICogQWRkIGEgYmluZGluZyBleHByZXNzaW9uIHRvIHRoZSBtYXAgZm9yIGVhY2ggaW5wdXQvdGVtcGxhdGUgYXR0cmlidXRlIG9mIHRoZSBkaXJlY3RpdmUgdGhhdCBoYXNcbiAgICogYSBtYXRjaGluZyBiaW5kaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc0F0dHJpYnV0ZShhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSk6IHZvaWQge1xuICAgIC8vIFNraXAgbm9uLXByb3BlcnR5IGJpbmRpbmdzLlxuICAgIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGF0dHIudHlwZSAhPT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTa2lwIHRleHQgYXR0cmlidXRlcyBpZiBjb25maWd1cmVkIHRvIGRvIHNvLlxuICAgIGlmICghdGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzICYmIGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNraXAgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgZGlyZWN0aXZlIGRvZXMgbm90IGhhdmUgYW4gaW5wdXQgZm9yIGl0LlxuICAgIGlmICghcHJvcE1hdGNoLmhhcyhhdHRyLm5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZpZWxkID0gcHJvcE1hdGNoLmdldChhdHRyLm5hbWUpICE7XG5cbiAgICAvLyBTa2lwIHRoZSBhdHRyaWJ1dGUgaWYgYSBwcmV2aW91cyBiaW5kaW5nIGFsc28gd3JvdGUgdG8gaXQuXG4gICAgaWYgKGRpcmVjdGl2ZUlucHV0cy5oYXMoZmllbGQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGV4cHI6IHRzLkV4cHJlc3Npb247XG4gICAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAgIC8vIFByb2R1Y2UgYW4gZXhwcmVzc2lvbiByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHRoZSBiaW5kaW5nLlxuICAgICAgZXhwciA9IHRjYkV4cHJlc3Npb24oYXR0ci52YWx1ZSwgdGNiLCBzY29wZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciByZWd1bGFyIGF0dHJpYnV0ZXMgd2l0aCBhIHN0YXRpYyBzdHJpbmcgdmFsdWUsIHVzZSB0aGUgcmVwcmVzZW50ZWQgc3RyaW5nIGxpdGVyYWwuXG4gICAgICBleHByID0gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChhdHRyLnZhbHVlKTtcbiAgICB9XG5cbiAgICBkaXJlY3RpdmVJbnB1dHMuc2V0KGZpZWxkLCB7XG4gICAgICB0eXBlOiAnYmluZGluZycsXG4gICAgICBmaWVsZDogZmllbGQsXG4gICAgICBleHByZXNzaW9uOiBleHByLFxuICAgICAgc291cmNlU3BhbjogYXR0ci5zb3VyY2VTcGFuLFxuICAgIH0pO1xuICB9XG59XG5cbmNvbnN0IEVWRU5UX1BBUkFNRVRFUiA9ICckZXZlbnQnO1xuXG5jb25zdCBlbnVtIEV2ZW50UGFyYW1UeXBlIHtcbiAgLyogR2VuZXJhdGVzIGNvZGUgdG8gaW5mZXIgdGhlIHR5cGUgb2YgYCRldmVudGAgYmFzZWQgb24gaG93IHRoZSBsaXN0ZW5lciBpcyByZWdpc3RlcmVkLiAqL1xuICBJbmZlcixcblxuICAvKiBEZWNsYXJlcyB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgcGFyYW1ldGVyIGFzIGBhbnlgLiAqL1xuICBBbnksXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJvdyBmdW5jdGlvbiB0byBiZSB1c2VkIGFzIGhhbmRsZXIgZnVuY3Rpb24gZm9yIGV2ZW50IGJpbmRpbmdzLiBUaGUgaGFuZGxlclxuICogZnVuY3Rpb24gaGFzIGEgc2luZ2xlIHBhcmFtZXRlciBgJGV2ZW50YCBhbmQgdGhlIGJvdW5kIGV2ZW50J3MgaGFuZGxlciBgQVNUYCByZXByZXNlbnRlZCBhcyBhXG4gKiBUeXBlU2NyaXB0IGV4cHJlc3Npb24gYXMgaXRzIGJvZHkuXG4gKlxuICogV2hlbiBgZXZlbnRUeXBlYCBpcyBzZXQgdG8gYEluZmVyYCwgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciB3aWxsIG5vdCBoYXZlIGFuIGV4cGxpY2l0IHR5cGUuIFRoaXNcbiAqIGFsbG93cyBmb3IgdGhlIGNyZWF0ZWQgaGFuZGxlciBmdW5jdGlvbiB0byBoYXZlIGl0cyBgJGV2ZW50YCBwYXJhbWV0ZXIncyB0eXBlIGluZmVycmVkIGJhc2VkIG9uXG4gKiBob3cgaXQncyB1c2VkLCB0byBlbmFibGUgc3RyaWN0IHR5cGUgY2hlY2tpbmcgb2YgZXZlbnQgYmluZGluZ3MuIFdoZW4gc2V0IHRvIGBBbnlgLCB0aGUgYCRldmVudGBcbiAqIHBhcmFtZXRlciB3aWxsIGhhdmUgYW4gZXhwbGljaXQgYGFueWAgdHlwZSwgZWZmZWN0aXZlbHkgZGlzYWJsaW5nIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50XG4gKiBiaW5kaW5ncy4gQWx0ZXJuYXRpdmVseSwgYW4gZXhwbGljaXQgdHlwZSBjYW4gYmUgcGFzc2VkIGZvciB0aGUgYCRldmVudGAgcGFyYW1ldGVyLlxuICovXG5mdW5jdGlvbiB0Y2JDcmVhdGVFdmVudEhhbmRsZXIoXG4gICAgZXZlbnQ6IFRtcGxBc3RCb3VuZEV2ZW50LCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSxcbiAgICBldmVudFR5cGU6IEV2ZW50UGFyYW1UeXBlIHwgdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgaGFuZGxlciA9IHRjYkV2ZW50SGFuZGxlckV4cHJlc3Npb24oZXZlbnQuaGFuZGxlciwgdGNiLCBzY29wZSk7XG5cbiAgbGV0IGV2ZW50UGFyYW1UeXBlOiB0cy5UeXBlTm9kZXx1bmRlZmluZWQ7XG4gIGlmIChldmVudFR5cGUgPT09IEV2ZW50UGFyYW1UeXBlLkluZmVyKSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSBFdmVudFBhcmFtVHlwZS5BbnkpIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICB9IGVsc2Uge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gZXZlbnRUeXBlO1xuICB9XG5cbiAgLy8gT2J0YWluIGFsbCBndWFyZHMgdGhhdCBoYXZlIGJlZW4gYXBwbGllZCB0byB0aGUgc2NvcGUgYW5kIGl0cyBwYXJlbnRzLCBhcyB0aGV5IGhhdmUgdG8gYmVcbiAgLy8gcmVwZWF0ZWQgd2l0aGluIHRoZSBoYW5kbGVyIGZ1bmN0aW9uIGZvciB0aGVpciBuYXJyb3dpbmcgdG8gYmUgaW4gZWZmZWN0IHdpdGhpbiB0aGUgaGFuZGxlci5cbiAgY29uc3QgZ3VhcmRzID0gc2NvcGUuZ3VhcmRzKCk7XG5cbiAgbGV0IGJvZHk6IHRzLlN0YXRlbWVudCA9IHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcik7XG4gIGlmIChndWFyZHMgIT09IG51bGwpIHtcbiAgICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIGBpZmAgc3RhdGVtZW50IGNvbnRhaW5pbmcgYWxsIGd1YXJkcyB0aGF0IGhhdmUgdG8gYmUgYXBwbGllZC5cbiAgICBib2R5ID0gdHMuY3JlYXRlSWYoZ3VhcmRzLCBib2R5KTtcbiAgfVxuXG4gIGNvbnN0IGV2ZW50UGFyYW0gPSB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIEVWRU5UX1BBUkFNRVRFUixcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZSAqLyBldmVudFBhcmFtVHlwZSk7XG5cbiAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgIC8qIG1vZGlmaWVyICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovW2V2ZW50UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSxcbiAgICAgIC8qIGJvZHkgKi8gdHMuY3JlYXRlQmxvY2soW2JvZHldKSk7XG59XG5cbi8qKlxuICogU2ltaWxhciB0byBgdGNiRXhwcmVzc2lvbmAsIHRoaXMgZnVuY3Rpb24gY29udmVydHMgdGhlIHByb3ZpZGVkIGBBU1RgIGV4cHJlc3Npb24gaW50byBhXG4gKiBgdHMuRXhwcmVzc2lvbmAsIHdpdGggc3BlY2lhbCBoYW5kbGluZyBvZiB0aGUgYCRldmVudGAgdmFyaWFibGUgdGhhdCBjYW4gYmUgdXNlZCB3aXRoaW4gZXZlbnRcbiAqIGJpbmRpbmdzLlxuICovXG5mdW5jdGlvbiB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV2ZW50SGFuZGxlclRyYW5zbGF0b3IodGNiLCBzY29wZSk7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yIGV4dGVuZHMgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gUmVjb2duaXplIGEgcHJvcGVydHkgcmVhZCBvbiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBldmVudCBwYXJhbWV0ZXJcbiAgICAvLyB0aGF0IGlzIGF2YWlsYWJsZSBpbiBldmVudCBiaW5kaW5ncy4gU2luY2UgdGhpcyB2YXJpYWJsZSBpcyBhIHBhcmFtZXRlciBvZiB0aGUgaGFuZGxlclxuICAgIC8vIGZ1bmN0aW9uIHRoYXQgdGhlIGNvbnZlcnRlZCBleHByZXNzaW9uIGJlY29tZXMgYSBjaGlsZCBvZiwganVzdCBjcmVhdGUgYSByZWZlcmVuY2UgdG8gdGhlXG4gICAgLy8gcGFyYW1ldGVyIGJ5IGl0cyBuYW1lLlxuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlciAmJlxuICAgICAgICBhc3QubmFtZSA9PT0gRVZFTlRfUEFSQU1FVEVSKSB7XG4gICAgICBjb25zdCBldmVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoRVZFTlRfUEFSQU1FVEVSKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXZlbnQsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVzb2x2ZShhc3QpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBib29sZWFuIHtcbiAgLy8gSW4gb3JkZXIgdG8gcXVhbGlmeSBmb3IgYSBkZWNsYXJlZCBUQ0IgKG5vdCBpbmxpbmUpIHR3byBjb25kaXRpb25zIG11c3QgYmUgbWV0OlxuICAvLyAxKSB0aGUgY2xhc3MgbXVzdCBiZSBleHBvcnRlZFxuICAvLyAyKSBpdCBtdXN0IG5vdCBoYXZlIGNvbnN0cmFpbmVkIGdlbmVyaWMgdHlwZXNcbiAgaWYgKCFjaGVja0lmQ2xhc3NJc0V4cG9ydGVkKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDEgaXMgZmFsc2UsIHRoZSBjbGFzcyBpcyBub3QgZXhwb3J0ZWQuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoIWNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDIgaXMgZmFsc2UsIHRoZSBjbGFzcyBoYXMgY29uc3RyYWluZWQgZ2VuZXJpYyB0eXBlc1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19