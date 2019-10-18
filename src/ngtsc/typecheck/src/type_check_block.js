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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/expression", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var expression_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/expression");
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
    /**
     * Given a `ts.ClassDeclaration` for a component, and metadata regarding that component, compose a
     * "type check block" function.
     *
     * When passed through TypeScript's TypeChecker, type errors that arise within the type check block
     * function indicate issues in the template itself.
     *
     * @param node the TypeScript node for the component class.
     * @param meta metadata about the component's template and the function being generated.
     * @param importManager an `ImportManager` for the file into which the TCB will be written.
     */
    function generateTypeCheckBlock(env, ref, name, meta, domSchemaChecker) {
        var tcb = new Context(env, domSchemaChecker, meta.id, meta.boundTarget, meta.pipes, meta.schemas);
        var scope = Scope.forNodes(tcb, null, tcb.boundTarget.target.template);
        var ctxRawType = env.referenceType(ref);
        if (!ts.isTypeReferenceNode(ctxRawType)) {
            throw new Error("Expected TypeReferenceNode when referencing the ctx param for " + ref.debugName);
        }
        var paramList = [tcbCtxParam(ref.node, ctxRawType.typeName)];
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
        /* typeParameters */ ref.node.typeParameters, 
        /* parameters */ paramList, 
        /* type */ undefined, 
        /* body */ body);
        diagnostics_1.addSourceId(fnDecl, meta.id);
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
            // Create a new Scope for the template. This constructs the list of operations for the template
            // children, as well as tracks bindings within the template.
            var tmplScope = Scope.forNodes(this.tcb, this.scope, this.template);
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
                            var expr = tcbExpression(boundInput.value, _this.tcb, _this.scope, boundInput.valueSpan || boundInput.sourceSpan);
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
                                diagnostics_1.addParseSpanInfo(guardInvoke, diagnostics_1.toAbsoluteSpan(boundInput.value.span, boundInput.sourceSpan));
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
            var guard = ts.createTrue();
            // If there are any guards from directives, use them instead.
            if (directiveGuards.length > 0) {
                // Pop the first value and use it as the initializer to reduce(). This way, a single guard
                // will be used on its own, but two or more will be combined into binary AND expressions.
                guard = directiveGuards.reduce(function (expr, dirGuard) {
                    return ts.createBinary(expr, ts.SyntaxKind.AmpersandAmpersandToken, dirGuard);
                }, directiveGuards.pop());
            }
            // Construct the `if` block for the template with the generated guard expression. The body of
            // the `if` block is created by rendering the template's `Scope.
            var tmplIf = ts.createIf(
            /* expression */ guard, 
            /* thenStatement */ ts.createBlock(tmplScope.render()));
            this.scope.addStatement(tmplIf);
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
            var expr = tcbExpression(this.binding.value, this.tcb, this.scope, this.binding.sourceSpan);
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
                    var expr = tcbExpression(binding.value, this.tcb, this.scope, binding.valueSpan || binding.sourceSpan);
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
                            var prop = ts.createPropertyAccess(elId, propertyName);
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
                        var outputField = ts.createPropertyAccess(dirId, field);
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
        function Context(env, domSchemaChecker, id, boundTarget, pipes, schemas) {
            this.env = env;
            this.domSchemaChecker = domSchemaChecker;
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
                throw new Error("Missing pipe: " + name);
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
        function Scope(tcb, parent) {
            if (parent === void 0) { parent = null; }
            this.tcb = tcb;
            this.parent = parent;
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
         */
        Scope.forNodes = function (tcb, parent, templateOrNodes) {
            var e_7, _a, e_8, _b;
            var scope = new Scope(tcb, parent);
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
            }
            else if (node instanceof compiler_1.TmplAstBoundText) {
                this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, node));
            }
        };
        Scope.prototype.appendDirectivesAndInputsOfNode = function (node) {
            var e_10, _a, e_11, _b, e_12, _c;
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
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (directives_2_1 && !directives_2_1.done && (_a = directives_2.return)) _a.call(directives_2);
                }
                finally { if (e_10) throw e_10.error; }
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
                            for (var _d = (e_12 = void 0, tslib_1.__values(Object.keys(dir.inputs))), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var fieldName = _e.value;
                                var value = dir.inputs[fieldName];
                                claimedInputs.add(Array.isArray(value) ? value[0] : value);
                            }
                        }
                        catch (e_12_1) { e_12 = { error: e_12_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_12) throw e_12.error; }
                        }
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (directives_3_1 && !directives_3_1.done && (_b = directives_3.return)) _b.call(directives_3);
                    }
                    finally { if (e_11) throw e_11.error; }
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
            var e_13, _a, e_14, _b, e_15, _c;
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
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (directives_4_1 && !directives_4_1.done && (_a = directives_4.return)) _a.call(directives_4);
                }
                finally { if (e_13) throw e_13.error; }
            }
            // After expanding the directives, we might need to queue an operation to check any unclaimed
            // outputs.
            if (node instanceof compiler_1.TmplAstElement) {
                try {
                    // Go through the directives and register any outputs that it claims in `claimedOutputs`.
                    for (var directives_5 = tslib_1.__values(directives), directives_5_1 = directives_5.next(); !directives_5_1.done; directives_5_1 = directives_5.next()) {
                        var dir = directives_5_1.value;
                        try {
                            for (var _d = (e_15 = void 0, tslib_1.__values(Object.keys(dir.outputs))), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var outputField = _e.value;
                                claimedOutputs.add(dir.outputs[outputField]);
                            }
                        }
                        catch (e_15_1) { e_15 = { error: e_15_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_15) throw e_15.error; }
                        }
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (directives_5_1 && !directives_5_1.done && (_b = directives_5.return)) _b.call(directives_5);
                    }
                    finally { if (e_14) throw e_14.error; }
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
    function tcbCtxParam(node, name) {
        var typeArguments = undefined;
        // Check if the component is generic, and pass generic type parameters if so.
        if (node.typeParameters !== undefined) {
            typeArguments =
                node.typeParameters.map(function (param) { return ts.createTypeReferenceNode(param.name, undefined); });
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
    function tcbExpression(ast, tcb, scope, sourceSpan) {
        var translator = new TcbExpressionTranslator(tcb, scope, sourceSpan);
        return translator.translate(ast);
    }
    var TcbExpressionTranslator = /** @class */ (function () {
        function TcbExpressionTranslator(tcb, scope, sourceSpan) {
            this.tcb = tcb;
            this.scope = scope;
            this.sourceSpan = sourceSpan;
        }
        TcbExpressionTranslator.prototype.translate = function (ast) {
            var _this = this;
            // `astToTypescript` actually does the conversion. A special resolver `tcbResolve` is passed
            // which interprets specific expression nodes that interact with the `ImplicitReceiver`. These
            // nodes actually refer to identifiers within the current scope.
            return expression_1.astToTypescript(ast, function (ast) { return _this.resolve(ast); }, this.tcb.env.config, function (span) { return diagnostics_1.toAbsoluteSpan(span, _this.sourceSpan); });
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
                // Check whether the template metadata has bound a target for this expression. If so, then
                // resolve that target. If not, then the expression is referencing the top-level component
                // context.
                var binding = this.tcb.boundTarget.getExpressionTarget(ast);
                if (binding !== null) {
                    // This expression has a binding to some variable or reference in the template. Resolve it.
                    if (binding instanceof compiler_1.TmplAstVariable) {
                        var expr = ts.getMutableClone(this.scope.resolve(binding));
                        diagnostics_1.addParseSpanInfo(expr, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
                        return expr;
                    }
                    else if (binding instanceof compiler_1.TmplAstReference) {
                        var target = this.tcb.boundTarget.getReferenceTarget(binding);
                        if (target === null) {
                            throw new Error("Unbound reference? " + binding.name);
                        }
                        // The reference is either to an element, an <ng-template> node, or to a directive on an
                        // element or template.
                        if (target instanceof compiler_1.TmplAstElement) {
                            var expr = ts.getMutableClone(this.scope.resolve(target));
                            diagnostics_1.addParseSpanInfo(expr, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
                            return expr;
                        }
                        else if (target instanceof compiler_1.TmplAstTemplate) {
                            // Direct references to an <ng-template> node simply require a value of type
                            // `TemplateRef<any>`. To get this, an expression of the form
                            // `(null as any as TemplateRef<any>)` is constructed.
                            var value = ts.createNull();
                            value =
                                ts.createAsExpression(value, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                            value = ts.createAsExpression(value, this.tcb.env.referenceExternalType('@angular/core', 'TemplateRef', [compiler_1.DYNAMIC_TYPE]));
                            value = ts.createParen(value);
                            diagnostics_1.addParseSpanInfo(value, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
                            return value;
                        }
                        else {
                            var expr = ts.getMutableClone(this.scope.resolve(target.node, target.directive));
                            diagnostics_1.addParseSpanInfo(expr, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
                            return expr;
                        }
                    }
                    else {
                        throw new Error("Unreachable: " + binding);
                    }
                }
                else {
                    // This is a PropertyRead(ImplicitReceiver) and probably refers to a property access on the
                    // component context. Let it fall through resolution here so it will be caught when the
                    // ImplicitReceiver is resolved in the branch below.
                    return null;
                }
            }
            else if (ast instanceof compiler_1.ImplicitReceiver) {
                // AST instances representing variables and references look very similar to property reads
                // from the component context: both have the shape
                // PropertyRead(ImplicitReceiver, 'propertyName').
                //
                // `tcbExpression` will first try to `tcbResolve` the outer PropertyRead. If this works, it's
                // because the `BoundTarget` found an expression target for the whole expression, and
                // therefore `tcbExpression` will never attempt to `tcbResolve` the ImplicitReceiver of that
                // PropertyRead.
                //
                // Therefore if `tcbResolve` is called on an `ImplicitReceiver`, it's because no outer
                // PropertyRead resolved to a variable or reference, and therefore this is a property read on
                // the component context itself.
                return ts.createIdentifier('ctx');
            }
            else if (ast instanceof compiler_1.BindingPipe) {
                var expr = this.translate(ast.exp);
                var pipe = void 0;
                if (this.tcb.env.config.checkTypeOfPipes) {
                    pipe = this.tcb.getPipeByName(ast.name);
                }
                else {
                    pipe = ts.createParen(ts.createAsExpression(ts.createNull(), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)));
                }
                var args = ast.args.map(function (arg) { return _this.translate(arg); });
                var result = ts_util_1.tsCallMethod(pipe, 'transform', tslib_1.__spread([expr], args));
                diagnostics_1.addParseSpanInfo(result, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
                return result;
            }
            else if (ast instanceof compiler_1.MethodCall && ast.receiver instanceof compiler_1.ImplicitReceiver &&
                ast.name === '$any' && ast.args.length === 1) {
                var expr = this.translate(ast.args[0]);
                var exprAsAny = ts.createAsExpression(expr, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                var result = ts.createParen(exprAsAny);
                diagnostics_1.addParseSpanInfo(result, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
                return result;
            }
            else {
                // This AST isn't special after all.
                return null;
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
                var assignment = ts.createPropertyAssignment(input.field, diagnostics_1.wrapForDiagnostics(expr));
                diagnostics_1.addParseSpanInfo(assignment, input.sourceSpan);
                return assignment;
            }
            else {
                // A type constructor is required to be called with all input properties, so any unset
                // inputs are simply assigned a value of type `any` to ignore them.
                return ts.createPropertyAssignment(input.field, expression_1.NULL_AS_ANY);
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
        var e_16, _a;
        var directiveInputs = [];
        // `dir.inputs` is an object map of field names on the directive class to property names.
        // This is backwards from what's needed to match bindings - a map of properties to field names
        // is desired. Invert `dir.inputs` into `propMatch` to create this map.
        var propMatch = new Map();
        var inputs = dir.inputs;
        Object.keys(inputs).forEach(function (key) {
            Array.isArray(inputs[key]) ? propMatch.set(inputs[key][0], key) :
                propMatch.set(inputs[key], key);
        });
        // To determine which of directive's inputs are unset, we keep track of the set of field names
        // that have not been seen yet. A field is removed from this set once a binding to it is found.
        var unsetFields = new Set(propMatch.values());
        el.inputs.forEach(processAttribute);
        el.attributes.forEach(processAttribute);
        if (el instanceof compiler_1.TmplAstTemplate) {
            el.templateAttrs.forEach(processAttribute);
        }
        try {
            // Add unset directive inputs for each of the remaining unset fields.
            for (var unsetFields_1 = tslib_1.__values(unsetFields), unsetFields_1_1 = unsetFields_1.next(); !unsetFields_1_1.done; unsetFields_1_1 = unsetFields_1.next()) {
                var field = unsetFields_1_1.value;
                directiveInputs.push({ type: 'unset', field: field });
            }
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (unsetFields_1_1 && !unsetFields_1_1.done && (_a = unsetFields_1.return)) _a.call(unsetFields_1);
            }
            finally { if (e_16) throw e_16.error; }
        }
        return directiveInputs;
        /**
         * Add a binding expression to the map for each input/template attribute of the directive that has
         * a matching binding.
         */
        function processAttribute(attr) {
            // Skip non-property bindings.
            if (attr instanceof compiler_1.TmplAstBoundAttribute && attr.type !== 0 /* Property */) {
                return;
            }
            // Skip the attribute if the directive does not have an input for it.
            if (!propMatch.has(attr.name)) {
                return;
            }
            var field = propMatch.get(attr.name);
            // Remove the field from the set of unseen fields, now that it's been assigned to.
            unsetFields.delete(field);
            var expr;
            if (attr instanceof compiler_1.TmplAstBoundAttribute) {
                // Produce an expression representing the value of the binding.
                expr = tcbExpression(attr.value, tcb, scope, attr.valueSpan || attr.sourceSpan);
            }
            else {
                // For regular attributes with a static string value, use the represented string literal.
                expr = ts.createStringLiteral(attr.value);
            }
            directiveInputs.push({
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
        var handler = tcbEventHandlerExpression(event.handler, tcb, scope, event.handlerSpan);
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
        var eventParam = ts.createParameter(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* dotDotDotToken */ undefined, 
        /* name */ EVENT_PARAMETER, 
        /* questionToken */ undefined, 
        /* type */ eventParamType);
        return ts.createArrowFunction(
        /* modifier */ undefined, 
        /* typeParameters */ undefined, 
        /* parameters */ [eventParam], 
        /* type */ undefined, 
        /* equalsGreaterThanToken*/ undefined, 
        /* body */ handler);
    }
    /**
     * Similar to `tcbExpression`, this function converts the provided `AST` expression into a
     * `ts.Expression`, with special handling of the `$event` variable that can be used within event
     * bindings.
     */
    function tcbEventHandlerExpression(ast, tcb, scope, sourceSpan) {
        var translator = new TcbEventHandlerTranslator(tcb, scope, sourceSpan);
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
                diagnostics_1.addParseSpanInfo(event_1, diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF1VztJQUN2VywrQkFBaUM7SUFNakMseUZBQWdHO0lBR2hHLHVGQUEwRDtJQUMxRCxpRkFBaUs7SUFJaks7Ozs7Ozs7Ozs7T0FVRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxHQUFnQixFQUFFLEdBQXFELEVBQUUsSUFBbUIsRUFDNUYsSUFBNEIsRUFBRSxnQkFBa0M7UUFDbEUsSUFBTSxHQUFHLEdBQ0wsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1RixJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBVSxDQUFDLENBQUM7UUFDM0UsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUVBQWlFLEdBQUcsQ0FBQyxTQUFXLENBQUMsQ0FBQztTQUN2RjtRQUNELElBQU0sU0FBUyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFL0QsSUFBTSxlQUFlLEdB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eUZBQXlGO1lBQ3pGLDRGQUE0RjtZQUM1Rix5QkFBeUI7WUFDekIsSUFBSSxHQUFHLFlBQVksdUJBQVksSUFBSSxHQUFHLENBQUMsUUFBUSxZQUFZLDJCQUFnQjtnQkFDdkUsR0FBRyxDQUFDLElBQUksS0FBSyxlQUFlLEVBQUU7Z0JBQ2hDLElBQU0sT0FBSyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDbkQsOEJBQWdCLENBQUMsT0FBSyxFQUFFLDRCQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDbkUsT0FBTyxPQUFLLENBQUM7YUFDZDtZQUVELE9BQU8saUJBQU0sT0FBTyxZQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDSCxnQ0FBQztJQUFELENBQUMsQUFmRCxDQUF3Qyx1QkFBdUIsR0FlOUQ7SUFFRCxTQUFnQiw0QkFBNEIsQ0FBQyxJQUEyQztRQUN0RixrRkFBa0Y7UUFDbEYsZ0NBQWdDO1FBQ2hDLGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsZ0NBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakMsbURBQW1EO1lBQ25ELE9BQU8sSUFBSSxDQUFDO1NBQ2I7YUFBTSxJQUFJLENBQUMsdUNBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0MsZ0VBQWdFO1lBQ2hFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7YUFBTTtZQUNMLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0lBYkQsb0VBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBEWU5BTUlDX1RZUEUsIEltcGxpY2l0UmVjZWl2ZXIsIE1ldGhvZENhbGwsIFBhcnNlU291cmNlU3BhbiwgUGFyc2VTcGFuLCBQYXJzZWRFdmVudFR5cGUsIFByb3BlcnR5UmVhZCwgU2NoZW1hTWV0YWRhdGEsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHthZGRQYXJzZVNwYW5JbmZvLCBhZGRTb3VyY2VJZCwgdG9BYnNvbHV0ZVNwYW4sIHdyYXBGb3JEaWFnbm9zdGljc30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtOVUxMX0FTX0FOWSwgYXN0VG9UeXBlc2NyaXB0fSBmcm9tICcuL2V4cHJlc3Npb24nO1xuaW1wb3J0IHtjaGVja0lmQ2xhc3NJc0V4cG9ydGVkLCBjaGVja0lmR2VuZXJpY1R5cGVzQXJlVW5ib3VuZCwgdHNDYWxsTWV0aG9kLCB0c0Nhc3RUb0FueSwgdHNDcmVhdGVFbGVtZW50LCB0c0NyZWF0ZVZhcmlhYmxlLCB0c0RlY2xhcmVWYXJpYWJsZX0gZnJvbSAnLi90c191dGlsJztcblxuXG5cbi8qKlxuICogR2l2ZW4gYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgZm9yIGEgY29tcG9uZW50LCBhbmQgbWV0YWRhdGEgcmVnYXJkaW5nIHRoYXQgY29tcG9uZW50LCBjb21wb3NlIGFcbiAqIFwidHlwZSBjaGVjayBibG9ja1wiIGZ1bmN0aW9uLlxuICpcbiAqIFdoZW4gcGFzc2VkIHRocm91Z2ggVHlwZVNjcmlwdCdzIFR5cGVDaGVja2VyLCB0eXBlIGVycm9ycyB0aGF0IGFyaXNlIHdpdGhpbiB0aGUgdHlwZSBjaGVjayBibG9ja1xuICogZnVuY3Rpb24gaW5kaWNhdGUgaXNzdWVzIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGYuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIFR5cGVTY3JpcHQgbm9kZSBmb3IgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAqIEBwYXJhbSBtZXRhIG1ldGFkYXRhIGFib3V0IHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBhbmQgdGhlIGZ1bmN0aW9uIGJlaW5nIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSBpbXBvcnRNYW5hZ2VyIGFuIGBJbXBvcnRNYW5hZ2VyYCBmb3IgdGhlIGZpbGUgaW50byB3aGljaCB0aGUgVENCIHdpbGwgYmUgd3JpdHRlbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHlwZUNoZWNrQmxvY2soXG4gICAgZW52OiBFbnZpcm9ubWVudCwgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sIG5hbWU6IHRzLklkZW50aWZpZXIsXG4gICAgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICBjb25zdCB0Y2IgPVxuICAgICAgbmV3IENvbnRleHQoZW52LCBkb21TY2hlbWFDaGVja2VyLCBtZXRhLmlkLCBtZXRhLmJvdW5kVGFyZ2V0LCBtZXRhLnBpcGVzLCBtZXRhLnNjaGVtYXMpO1xuICBjb25zdCBzY29wZSA9IFNjb3BlLmZvck5vZGVzKHRjYiwgbnVsbCwgdGNiLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhKTtcbiAgY29uc3QgY3R4UmF3VHlwZSA9IGVudi5yZWZlcmVuY2VUeXBlKHJlZik7XG4gIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShjdHhSYXdUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIHdoZW4gcmVmZXJlbmNpbmcgdGhlIGN0eCBwYXJhbSBmb3IgJHtyZWYuZGVidWdOYW1lfWApO1xuICB9XG4gIGNvbnN0IHBhcmFtTGlzdCA9IFt0Y2JDdHhQYXJhbShyZWYubm9kZSwgY3R4UmF3VHlwZS50eXBlTmFtZSldO1xuXG4gIGNvbnN0IHNjb3BlU3RhdGVtZW50cyA9IHNjb3BlLnJlbmRlcigpO1xuICBjb25zdCBpbm5lckJvZHkgPSB0cy5jcmVhdGVCbG9jayhbXG4gICAgLi4uZW52LmdldFByZWx1ZGVTdGF0ZW1lbnRzKCksXG4gICAgLi4uc2NvcGVTdGF0ZW1lbnRzLFxuICBdKTtcblxuICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIFwiaWYgKHRydWUpXCIgZXhwcmVzc2lvbi4gVGhpcyBpcyB1bm5lY2Vzc2FyeSBidXQgaGFzIHRoZSBlZmZlY3Qgb2YgY2F1c2luZ1xuICAvLyB0aGUgYHRzLlByaW50ZXJgIHRvIGZvcm1hdCB0aGUgdHlwZS1jaGVjayBibG9jayBuaWNlbHkuXG4gIGNvbnN0IGJvZHkgPSB0cy5jcmVhdGVCbG9jayhbdHMuY3JlYXRlSWYodHMuY3JlYXRlVHJ1ZSgpLCBpbm5lckJvZHksIHVuZGVmaW5lZCldKTtcbiAgY29uc3QgZm5EZWNsID0gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBuYW1lLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gcmVmLm5vZGUudHlwZVBhcmFtZXRlcnMsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovIHBhcmFtTGlzdCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbiAgYWRkU291cmNlSWQoZm5EZWNsLCBtZXRhLmlkKTtcbiAgcmV0dXJuIGZuRGVjbDtcbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCdzIGludm9sdmVkIGluIHRoZSBjb25zdHJ1Y3Rpb24gb2YgYSBUeXBlIENoZWNrIEJsb2NrLlxuICpcbiAqIFRoZSBnZW5lcmF0aW9uIG9mIGEgVENCIGlzIG5vbi1saW5lYXIuIEJpbmRpbmdzIHdpdGhpbiBhIHRlbXBsYXRlIG1heSByZXN1bHQgaW4gdGhlIG5lZWQgdG9cbiAqIGNvbnN0cnVjdCBjZXJ0YWluIHR5cGVzIGVhcmxpZXIgdGhhbiB0aGV5IG90aGVyd2lzZSB3b3VsZCBiZSBjb25zdHJ1Y3RlZC4gVGhhdCBpcywgaWYgdGhlXG4gKiBnZW5lcmF0aW9uIG9mIGEgVENCIGZvciBhIHRlbXBsYXRlIGlzIGJyb2tlbiBkb3duIGludG8gc3BlY2lmaWMgb3BlcmF0aW9ucyAoY29uc3RydWN0aW5nIGFcbiAqIGRpcmVjdGl2ZSwgZXh0cmFjdGluZyBhIHZhcmlhYmxlIGZyb20gYSBsZXQtIG9wZXJhdGlvbiwgZXRjKSwgdGhlbiBpdCdzIHBvc3NpYmxlIGZvciBvcGVyYXRpb25zXG4gKiBlYXJsaWVyIGluIHRoZSBzZXF1ZW5jZSB0byBkZXBlbmQgb24gb3BlcmF0aW9ucyB3aGljaCBvY2N1ciBsYXRlciBpbiB0aGUgc2VxdWVuY2UuXG4gKlxuICogYFRjYk9wYCBhYnN0cmFjdHMgdGhlIGRpZmZlcmVudCB0eXBlcyBvZiBvcGVyYXRpb25zIHdoaWNoIGFyZSByZXF1aXJlZCB0byBjb252ZXJ0IGEgdGVtcGxhdGUgaW50b1xuICogYSBUQ0IuIFRoaXMgYWxsb3dzIGZvciB0d28gcGhhc2VzIG9mIHByb2Nlc3NpbmcgZm9yIHRoZSB0ZW1wbGF0ZSwgd2hlcmUgMSkgYSBsaW5lYXIgc2VxdWVuY2Ugb2ZcbiAqIGBUY2JPcGBzIGlzIGdlbmVyYXRlZCwgYW5kIHRoZW4gMikgdGhlc2Ugb3BlcmF0aW9ucyBhcmUgZXhlY3V0ZWQsIG5vdCBuZWNlc3NhcmlseSBpbiBsaW5lYXJcbiAqIG9yZGVyLlxuICpcbiAqIEVhY2ggYFRjYk9wYCBtYXkgaW5zZXJ0IHN0YXRlbWVudHMgaW50byB0aGUgYm9keSBvZiB0aGUgVENCLCBhbmQgYWxzbyBvcHRpb25hbGx5IHJldHVybiBhXG4gKiBgdHMuRXhwcmVzc2lvbmAgd2hpY2ggY2FuIGJlIHVzZWQgdG8gcmVmZXJlbmNlIHRoZSBvcGVyYXRpb24ncyByZXN1bHQuXG4gKi9cbmFic3RyYWN0IGNsYXNzIFRjYk9wIHsgYWJzdHJhY3QgZXhlY3V0ZSgpOiB0cy5FeHByZXNzaW9ufG51bGw7IH1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBhIG5hdGl2ZSBET00gZWxlbWVudCAob3Igd2ViIGNvbXBvbmVudCkgZnJvbSBhXG4gKiBgVG1wbEFzdEVsZW1lbnRgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JFbGVtZW50T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIC8vIEFkZCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGVsZW1lbnQgdXNpbmcgZG9jdW1lbnQuY3JlYXRlRWxlbWVudC5cbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzQ3JlYXRlRWxlbWVudCh0aGlzLmVsZW1lbnQubmFtZSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpbml0aWFsaXplciwgdGhpcy5lbGVtZW50LnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLmVsZW1lbnQuc291cmNlU3Bhbik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBwYXJ0aWN1bGFyIGxldC0gYFRtcGxBc3RWYXJpYWJsZWAgb24gYVxuICogYFRtcGxBc3RUZW1wbGF0ZWAncyBjb250ZXh0LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSB2YXJpYWJsZSB2YXJpYWJsZSAobG9sKS5cbiAqL1xuY2xhc3MgVGNiVmFyaWFibGVPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgdGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSxcbiAgICAgIHByaXZhdGUgdmFyaWFibGU6IFRtcGxBc3RWYXJpYWJsZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgZm9yIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcblxuICAgIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGVcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY29udGV4dC5cbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAvKiBleHByZXNzaW9uICovIGN0eCxcbiAgICAgICAgLyogbmFtZSAqLyB0aGlzLnZhcmlhYmxlLnZhbHVlIHx8ICckaW1wbGljaXQnKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLnZhcmlhYmxlLnNvdXJjZVNwYW4pO1xuXG4gICAgLy8gRGVjbGFyZSB0aGUgdmFyaWFibGUsIGFuZCByZXR1cm4gaXRzIGlkZW50aWZpZXIuXG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGEgdmFyaWFibGUgZm9yIGEgYFRtcGxBc3RUZW1wbGF0ZWAncyBjb250ZXh0LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQ29udGV4dE9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUpIHsgc3VwZXIoKTsgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gQWxsb2NhdGUgYSB0ZW1wbGF0ZSBjdHggdmFyaWFibGUgYW5kIGRlY2xhcmUgaXQgd2l0aCBhbiAnYW55JyB0eXBlLiBUaGUgdHlwZSBvZiB0aGlzIHZhcmlhYmxlXG4gICAgLy8gbWF5IGJlIG5hcnJvd2VkIGFzIGEgcmVzdWx0IG9mIHRlbXBsYXRlIGd1YXJkIGNvbmRpdGlvbnMuXG4gICAgY29uc3QgY3R4ID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShjdHgsIHR5cGUpKTtcbiAgICByZXR1cm4gY3R4O1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGRlc2NlbmRzIGludG8gYSBgVG1wbEFzdFRlbXBsYXRlYCdzIGNoaWxkcmVuIGFuZCBnZW5lcmF0ZXMgdHlwZS1jaGVja2luZyBjb2RlIGZvclxuICogdGhlbS5cbiAqXG4gKiBUaGlzIG9wZXJhdGlvbiB3cmFwcyB0aGUgY2hpbGRyZW4ncyB0eXBlLWNoZWNraW5nIGNvZGUgaW4gYW4gYGlmYCBibG9jaywgd2hpY2ggbWF5IGluY2x1ZGUgb25lXG4gKiBvciBtb3JlIHR5cGUgZ3VhcmQgY29uZGl0aW9ucyB0aGF0IG5hcnJvdyB0eXBlcyB3aXRoaW4gdGhlIHRlbXBsYXRlIGJvZHkuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQm9keU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgdGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBDcmVhdGUgYSBuZXcgU2NvcGUgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBjb25zdHJ1Y3RzIHRoZSBsaXN0IG9mIG9wZXJhdGlvbnMgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIC8vIGNoaWxkcmVuLCBhcyB3ZWxsIGFzIHRyYWNrcyBiaW5kaW5ncyB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IHRtcGxTY29wZSA9IFNjb3BlLmZvck5vZGVzKHRoaXMudGNiLCB0aGlzLnNjb3BlLCB0aGlzLnRlbXBsYXRlKTtcblxuICAgIC8vIEFuIGBpZmAgd2lsbCBiZSBjb25zdHJ1Y3RlZCwgd2l0aGluIHdoaWNoIHRoZSB0ZW1wbGF0ZSdzIGNoaWxkcmVuIHdpbGwgYmUgdHlwZSBjaGVja2VkLiBUaGVcbiAgICAvLyBgaWZgIGlzIHVzZWQgZm9yIHR3byByZWFzb25zOiBpdCBjcmVhdGVzIGEgbmV3IHN5bnRhY3RpYyBzY29wZSwgaXNvbGF0aW5nIHZhcmlhYmxlcyBkZWNsYXJlZFxuICAgIC8vIGluIHRoZSB0ZW1wbGF0ZSdzIFRDQiBmcm9tIHRoZSBvdXRlciBjb250ZXh0LCBhbmQgaXQgYWxsb3dzIGFueSBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZXNcbiAgICAvLyB0byBwZXJmb3JtIHR5cGUgbmFycm93aW5nIG9mIGVpdGhlciBleHByZXNzaW9ucyBvciB0aGUgdGVtcGxhdGUncyBjb250ZXh0LlxuICAgIC8vXG4gICAgLy8gVGhlIGd1YXJkIGlzIHRoZSBgaWZgIGJsb2NrJ3MgY29uZGl0aW9uLiBJdCdzIHVzdWFsbHkgc2V0IHRvIGB0cnVlYCBidXQgZGlyZWN0aXZlcyB0aGF0IGV4aXN0XG4gICAgLy8gb24gdGhlIHRlbXBsYXRlIGNhbiB0cmlnZ2VyIGV4dHJhIGd1YXJkIGV4cHJlc3Npb25zIHRoYXQgc2VydmUgdG8gbmFycm93IHR5cGVzIHdpdGhpbiB0aGVcbiAgICAvLyBgaWZgLiBgZ3VhcmRgIGlzIGNhbGN1bGF0ZWQgYnkgc3RhcnRpbmcgd2l0aCBgdHJ1ZWAgYW5kIGFkZGluZyBvdGhlciBjb25kaXRpb25zIGFzIG5lZWRlZC5cbiAgICAvLyBDb2xsZWN0IHRoZXNlIGludG8gYGd1YXJkc2AgYnkgcHJvY2Vzc2luZyB0aGUgZGlyZWN0aXZlcy5cbiAgICBjb25zdCBkaXJlY3RpdmVHdWFyZHM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUodGhpcy50ZW1wbGF0ZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgZGlySW5zdElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUsIGRpcik7XG4gICAgICAgIGNvbnN0IGRpcklkID1cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2UoZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuXG4gICAgICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ3VhcmRzLiBUZW1wbGF0ZSBndWFyZHMgKG5nVGVtcGxhdGVHdWFyZHMpIGFsbG93IHR5cGUgbmFycm93aW5nIG9mXG4gICAgICAgIC8vIHRoZSBleHByZXNzaW9uIHBhc3NlZCB0byBhbiBASW5wdXQgb2YgdGhlIGRpcmVjdGl2ZS4gU2NhbiB0aGUgZGlyZWN0aXZlIHRvIHNlZSBpZiBpdCBoYXNcbiAgICAgICAgLy8gYW55IHRlbXBsYXRlIGd1YXJkcywgYW5kIGdlbmVyYXRlIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgICBkaXIubmdUZW1wbGF0ZUd1YXJkcy5mb3JFYWNoKGd1YXJkID0+IHtcbiAgICAgICAgICAvLyBGb3IgZWFjaCB0ZW1wbGF0ZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlLCBsb29rIGZvciBhIGJpbmRpbmcgdG8gdGhhdCBpbnB1dC5cbiAgICAgICAgICBjb25zdCBib3VuZElucHV0ID0gdGhpcy50ZW1wbGF0ZS5pbnB1dHMuZmluZChpID0+IGkubmFtZSA9PT0gZ3VhcmQuaW5wdXROYW1lKSB8fFxuICAgICAgICAgICAgICB0aGlzLnRlbXBsYXRlLnRlbXBsYXRlQXR0cnMuZmluZChcbiAgICAgICAgICAgICAgICAgIChpOiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSB8IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSk6IGkgaXMgVG1wbEFzdEJvdW5kQXR0cmlidXRlID0+XG4gICAgICAgICAgICAgICAgICAgICAgaSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSk7XG4gICAgICAgICAgaWYgKGJvdW5kSW5wdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oXG4gICAgICAgICAgICAgICAgYm91bmRJbnB1dC52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsXG4gICAgICAgICAgICAgICAgYm91bmRJbnB1dC52YWx1ZVNwYW4gfHwgYm91bmRJbnB1dC5zb3VyY2VTcGFuKTtcblxuICAgICAgICAgICAgaWYgKGd1YXJkLnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgICAgICAgICAvLyBVc2UgdGhlIGJpbmRpbmcgZXhwcmVzc2lvbiBpdHNlbGYgYXMgZ3VhcmQuXG4gICAgICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSB3aXRoIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgYW5kIHRoYXRcbiAgICAgICAgICAgICAgLy8gZXhwcmVzc2lvbi5cbiAgICAgICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsIGBuZ1RlbXBsYXRlR3VhcmRfJHtndWFyZC5pbnB1dE5hbWV9YCwgW1xuICAgICAgICAgICAgICAgIGRpckluc3RJZCxcbiAgICAgICAgICAgICAgICBleHByLFxuICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhcbiAgICAgICAgICAgICAgICAgIGd1YXJkSW52b2tlLCB0b0Fic29sdXRlU3Bhbihib3VuZElucHV0LnZhbHVlLnNwYW4sIGJvdW5kSW5wdXQuc291cmNlU3BhbikpO1xuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaGUgc2Vjb25kIGtpbmQgb2YgZ3VhcmQgaXMgYSB0ZW1wbGF0ZSBjb250ZXh0IGd1YXJkLiBUaGlzIGd1YXJkIG5hcnJvd3MgdGhlIHRlbXBsYXRlXG4gICAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgICBpZiAoZGlyLmhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQgJiYgdGhpcy50Y2IuZW52LmNvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcykge1xuICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgJ25nVGVtcGxhdGVDb250ZXh0R3VhcmQnLCBbZGlySW5zdElkLCBjdHhdKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCB0aGlzLnRlbXBsYXRlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJ5IGRlZmF1bHQgdGhlIGd1YXJkIGlzIHNpbXBseSBgdHJ1ZWAuXG4gICAgbGV0IGd1YXJkOiB0cy5FeHByZXNzaW9uID0gdHMuY3JlYXRlVHJ1ZSgpO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSBndWFyZHMgZnJvbSBkaXJlY3RpdmVzLCB1c2UgdGhlbSBpbnN0ZWFkLlxuICAgIGlmIChkaXJlY3RpdmVHdWFyZHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gUG9wIHRoZSBmaXJzdCB2YWx1ZSBhbmQgdXNlIGl0IGFzIHRoZSBpbml0aWFsaXplciB0byByZWR1Y2UoKS4gVGhpcyB3YXksIGEgc2luZ2xlIGd1YXJkXG4gICAgICAvLyB3aWxsIGJlIHVzZWQgb24gaXRzIG93biwgYnV0IHR3byBvciBtb3JlIHdpbGwgYmUgY29tYmluZWQgaW50byBiaW5hcnkgQU5EIGV4cHJlc3Npb25zLlxuICAgICAgZ3VhcmQgPSBkaXJlY3RpdmVHdWFyZHMucmVkdWNlKFxuICAgICAgICAgIChleHByLCBkaXJHdWFyZCkgPT5cbiAgICAgICAgICAgICAgdHMuY3JlYXRlQmluYXJ5KGV4cHIsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIGRpckd1YXJkKSxcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucG9wKCkgISk7XG4gICAgfVxuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBgaWZgIGJsb2NrIGZvciB0aGUgdGVtcGxhdGUgd2l0aCB0aGUgZ2VuZXJhdGVkIGd1YXJkIGV4cHJlc3Npb24uIFRoZSBib2R5IG9mXG4gICAgLy8gdGhlIGBpZmAgYmxvY2sgaXMgY3JlYXRlZCBieSByZW5kZXJpbmcgdGhlIHRlbXBsYXRlJ3MgYFNjb3BlLlxuICAgIGNvbnN0IHRtcGxJZiA9IHRzLmNyZWF0ZUlmKFxuICAgICAgICAvKiBleHByZXNzaW9uICovIGd1YXJkLFxuICAgICAgICAvKiB0aGVuU3RhdGVtZW50ICovIHRzLmNyZWF0ZUJsb2NrKHRtcGxTY29wZS5yZW5kZXIoKSkpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRtcGxJZik7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggcmVuZGVycyBhIHRleHQgYmluZGluZyAoaW50ZXJwb2xhdGlvbikgaW50byB0aGUgVENCLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlRleHRJbnRlcnBvbGF0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBiaW5kaW5nOiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24odGhpcy5iaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgdGhpcy5iaW5kaW5nLnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUgd2l0aCB0eXBlcyBpbmZlcnJlZCBmcm9tIGl0cyBpbnB1dHMsIHdoaWNoXG4gKiBhbHNvIGNoZWNrcyB0aGUgYmluZGluZ3MgdG8gdGhlIGRpcmVjdGl2ZSBpbiB0aGUgcHJvY2Vzcy5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgLy8gUHJvY2VzcyB0aGUgZGlyZWN0aXZlIGFuZCBjb25zdHJ1Y3QgZXhwcmVzc2lvbnMgZm9yIGVhY2ggb2YgaXRzIGJpbmRpbmdzLlxuICAgIGNvbnN0IGlucHV0cyA9IHRjYkdldERpcmVjdGl2ZUlucHV0cyh0aGlzLm5vZGUsIHRoaXMuZGlyLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG5cbiAgICAvLyBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIHRoZSBkaXJlY3RpdmUgdG8gaW5mZXIgYSB0eXBlLCBhbmQgYXNzaWduIHRoZSBkaXJlY3RpdmVcbiAgICAvLyBpbnN0YW5jZS5cbiAgICBjb25zdCB0eXBlQ3RvciA9IHRjYkNhbGxUeXBlQ3Rvcih0aGlzLmRpciwgdGhpcy50Y2IsIGlucHV0cyk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyh0eXBlQ3RvciwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIHR5cGVDdG9yKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGZlZWRzIGVsZW1lbnRzIGFuZCB1bmNsYWltZWQgcHJvcGVydGllcyB0byB0aGUgYERvbVNjaGVtYUNoZWNrZXJgLlxuICpcbiAqIFRoZSBET00gc2NoZW1hIGlzIG5vdCBjaGVja2VkIHZpYSBUQ0IgY29kZSBnZW5lcmF0aW9uLiBJbnN0ZWFkLCB0aGUgYERvbVNjaGVtYUNoZWNrZXJgIGluZ2VzdHNcbiAqIGVsZW1lbnRzIGFuZCBwcm9wZXJ0eSBiaW5kaW5ncyBhbmQgYWNjdW11bGF0ZXMgc3ludGhldGljIGB0cy5EaWFnbm9zdGljYHMgb3V0LW9mLWJhbmQuIFRoZXNlIGFyZVxuICogbGF0ZXIgbWVyZ2VkIHdpdGggdGhlIGRpYWdub3N0aWNzIGdlbmVyYXRlZCBmcm9tIHRoZSBUQ0IuXG4gKlxuICogRm9yIGNvbnZlbmllbmNlLCB0aGUgVENCIGl0ZXJhdGlvbiBvZiB0aGUgdGVtcGxhdGUgaXMgdXNlZCB0byBkcml2ZSB0aGUgYERvbVNjaGVtYUNoZWNrZXJgIHZpYVxuICogdGhlIGBUY2JEb21TY2hlbWFDaGVja2VyT3BgLlxuICovXG5jbGFzcyBUY2JEb21TY2hlbWFDaGVja2VyT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHByaXZhdGUgY2hlY2tFbGVtZW50OiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkSW5wdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHRoaXMuY2hlY2tFbGVtZW50KSB7XG4gICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrRWxlbWVudCh0aGlzLnRjYi5pZCwgdGhpcy5lbGVtZW50LCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrUHJvcGVydHkoXG4gICAgICAgICAgICAgIHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHByb3BlcnR5TmFtZSwgYmluZGluZy5zb3VyY2VTcGFuLCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5cbi8qKlxuICogTWFwcGluZyBiZXR3ZWVuIGF0dHJpYnV0ZXMgbmFtZXMgdGhhdCBkb24ndCBjb3JyZXNwb25kIHRvIHRoZWlyIGVsZW1lbnQgcHJvcGVydHkgbmFtZXMuXG4gKiBOb3RlOiB0aGlzIG1hcHBpbmcgaGFzIHRvIGJlIGtlcHQgaW4gc3luYyB3aXRoIHRoZSBlcXVhbGx5IG5hbWVkIG1hcHBpbmcgaW4gdGhlIHJ1bnRpbWUuXG4gKi9cbmNvbnN0IEFUVFJfVE9fUFJPUDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2Zvcm1hY3Rpb24nOiAnZm9ybUFjdGlvbicsXG4gICdpbm5lckh0bWwnOiAnaW5uZXJIVE1MJyxcbiAgJ3JlYWRvbmx5JzogJ3JlYWRPbmx5JyxcbiAgJ3RhYmluZGV4JzogJ3RhYkluZGV4Jyxcbn07XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIGlucHV0c1wiIC0gYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaCB3ZXJlXG4gKiBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MIGVsZW1lbnRcbiAqIGl0c2VsZi5cbiAqXG4gKiBDdXJyZW50bHksIG9ubHkgdGhlIGV4cHJlc3Npb25zIG9mIHRoZXNlIGJpbmRpbmdzIGFyZSBjaGVja2VkLiBUaGUgdGFyZ2V0cyBvZiB0aGUgYmluZGluZ3MgYXJlXG4gKiBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEgdmlhIGEgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkSW5wdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkSW5wdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIC8vIGB0aGlzLmlucHV0c2AgY29udGFpbnMgb25seSB0aG9zZSBiaW5kaW5ncyBub3QgbWF0Y2hlZCBieSBhbnkgZGlyZWN0aXZlLiBUaGVzZSBiaW5kaW5ncyBnbyB0b1xuICAgIC8vIHRoZSBlbGVtZW50IGl0c2VsZi5cbiAgICBjb25zdCBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBleHByID0gdGNiRXhwcmVzc2lvbihcbiAgICAgICAgICBiaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgYmluZGluZy52YWx1ZVNwYW4gfHwgYmluZGluZy5zb3VyY2VTcGFuKTtcbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21CaW5kaW5ncyAmJiBiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICBjb25zdCBwcm9wID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZWxJZCwgcHJvcGVydHlOYW1lKTtcbiAgICAgICAgICBjb25zdCBzdG10ID0gdHMuY3JlYXRlQmluYXJ5KHByb3AsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhzdG10LCBiaW5kaW5nLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBIGJpbmRpbmcgdG8gYW4gYW5pbWF0aW9uLCBhdHRyaWJ1dGUsIGNsYXNzIG9yIHN0eWxlLiBGb3Igbm93LCBvbmx5IHZhbGlkYXRlIHRoZSByaWdodC1cbiAgICAgICAgLy8gaGFuZCBzaWRlIG9mIHRoZSBleHByZXNzaW9uLlxuICAgICAgICAvLyBUT0RPOiBwcm9wZXJseSBjaGVjayBjbGFzcyBhbmQgc3R5bGUgYmluZGluZ3MuXG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBvdXRwdXRzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZU91dHB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG5cbiAgICAvLyBgZGlyLm91dHB1dHNgIGlzIGFuIG9iamVjdCBtYXAgb2YgZmllbGQgbmFtZXMgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcyB0byBldmVudCBuYW1lcy5cbiAgICAvLyBUaGlzIGlzIGJhY2t3YXJkcyBmcm9tIHdoYXQncyBuZWVkZWQgdG8gbWF0Y2ggZXZlbnQgaGFuZGxlcnMgLSBhIG1hcCBvZiBldmVudCBuYW1lcyB0byBmaWVsZFxuICAgIC8vIG5hbWVzIGlzIGRlc2lyZWQuIEludmVydCBgZGlyLm91dHB1dHNgIGludG8gYGZpZWxkQnlFdmVudE5hbWVgIHRvIGNyZWF0ZSB0aGlzIG1hcC5cbiAgICBjb25zdCBmaWVsZEJ5RXZlbnROYW1lID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBjb25zdCBvdXRwdXRzID0gdGhpcy5kaXIub3V0cHV0cztcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhvdXRwdXRzKSkge1xuICAgICAgZmllbGRCeUV2ZW50TmFtZS5zZXQob3V0cHV0c1trZXldLCBrZXkpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMubm9kZS5vdXRwdXRzKSB7XG4gICAgICBpZiAob3V0cHV0LnR5cGUgIT09IFBhcnNlZEV2ZW50VHlwZS5SZWd1bGFyIHx8ICFmaWVsZEJ5RXZlbnROYW1lLmhhcyhvdXRwdXQubmFtZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBmaWVsZCA9IGZpZWxkQnlFdmVudE5hbWUuZ2V0KG91dHB1dC5uYW1lKSAhO1xuXG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cykge1xuICAgICAgICAvLyBGb3Igc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMsIGdlbmVyYXRlIGEgY2FsbCB0byB0aGUgYHN1YnNjcmliZWAgbWV0aG9kXG4gICAgICAgIC8vIG9uIHRoZSBkaXJlY3RpdmUncyBvdXRwdXQgZmllbGQgdG8gbGV0IHR5cGUgaW5mb3JtYXRpb24gZmxvdyBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uJ3NcbiAgICAgICAgLy8gYCRldmVudGAgcGFyYW1ldGVyLlxuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlIHRoYXQgdGhlIGBFdmVudEVtaXR0ZXI8VD5gIHR5cGUgZnJvbSAnQGFuZ3VsYXIvY29yZScgdGhhdCBpcyB0eXBpY2FsbHkgdXNlZCBmb3JcbiAgICAgICAgLy8gb3V0cHV0cyBoYXMgYSB0eXBpbmdzIGRlZmljaWVuY3kgaW4gaXRzIGBzdWJzY3JpYmVgIG1ldGhvZC4gVGhlIGdlbmVyaWMgdHlwZSBgVGAgaXMgbm90XG4gICAgICAgIC8vIGNhcnJpZWQgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbiwgd2hpY2ggaXMgdml0YWwgZm9yIGluZmVyZW5jZSBvZiB0aGUgdHlwZSBvZiBgJGV2ZW50YC5cbiAgICAgICAgLy8gQXMgYSB3b3JrYXJvdW5kLCB0aGUgZGlyZWN0aXZlJ3MgZmllbGQgaXMgcGFzc2VkIGludG8gYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBoYXMgYVxuICAgICAgICAvLyBzcGVjaWFsbHkgY3JhZnRlZCBzZXQgb2Ygc2lnbmF0dXJlcywgdG8gZWZmZWN0aXZlbHkgY2FzdCBgRXZlbnRFbWl0dGVyPFQ+YCB0byBzb21ldGhpbmdcbiAgICAgICAgLy8gdGhhdCBoYXMgYSBgc3Vic2NyaWJlYCBtZXRob2QgdGhhdCBwcm9wZXJseSBjYXJyaWVzIHRoZSBgVGAgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG5cbiAgICAgICAgY29uc3Qgb3V0cHV0RmllbGQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhkaXJJZCwgZmllbGQpO1xuICAgICAgICBjb25zdCBvdXRwdXRIZWxwZXIgPVxuICAgICAgICAgICAgdHMuY3JlYXRlQ2FsbCh0aGlzLnRjYi5lbnYuZGVjbGFyZU91dHB1dEhlbHBlcigpLCB1bmRlZmluZWQsIFtvdXRwdXRGaWVsZF0pO1xuICAgICAgICBjb25zdCBzdWJzY3JpYmVGbiA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKG91dHB1dEhlbHBlciwgJ3N1YnNjcmliZScpO1xuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChzdWJzY3JpYmVGbiwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIFtoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBkaXJlY3RpdmUgZXZlbnRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGVcbiAgICAgICAgLy8gYCRldmVudGAgcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIG91dHB1dHNcIiAtIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgd2hpY2hcbiAqIHdlcmUgbm90IGF0dHJpYnV0ZWQgdG8gYW55IGRpcmVjdGl2ZSBvciBjb21wb25lbnQsIGFuZCBhcmUgaW5zdGVhZCBwcm9jZXNzZWQgYWdhaW5zdCB0aGUgSFRNTFxuICogZWxlbWVudCBpdHNlbGYuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkT3V0cHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgY2xhaW1lZE91dHB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZWxJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmVsZW1lbnQpO1xuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMuZWxlbWVudC5vdXRwdXRzKSB7XG4gICAgICBpZiAodGhpcy5jbGFpbWVkT3V0cHV0cy5oYXMob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBldmVudCBoYW5kbGVyIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG91dHB1dC50eXBlID09PSBQYXJzZWRFdmVudFR5cGUuQW5pbWF0aW9uKSB7XG4gICAgICAgIC8vIEFuaW1hdGlvbiBvdXRwdXQgYmluZGluZ3MgYWx3YXlzIGhhdmUgYW4gYCRldmVudGAgcGFyYW1ldGVyIG9mIHR5cGUgYEFuaW1hdGlvbkV2ZW50YC5cbiAgICAgICAgY29uc3QgZXZlbnRUeXBlID0gdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA/XG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9hbmltYXRpb25zJywgJ0FuaW1hdGlvbkV2ZW50JykgOlxuICAgICAgICAgICAgRXZlbnRQYXJhbVR5cGUuQW55O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgZXZlbnRUeXBlKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIERPTSBldmVudHMgaXMgZW5hYmxlZCwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBhZGRFdmVudExpc3RlbmVyYCBvblxuICAgICAgICAvLyB0aGUgZWxlbWVudCBpbnN0YW5jZSBzbyB0aGF0IFR5cGVTY3JpcHQncyB0eXBlIGluZmVyZW5jZSBmb3JcbiAgICAgICAgLy8gYEhUTUxFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXJgIHVzaW5nIGBIVE1MRWxlbWVudEV2ZW50TWFwYCB0byBpbmZlciBhbiBhY2N1cmF0ZSB0eXBlIGZvclxuICAgICAgICAvLyBgJGV2ZW50YCBkZXBlbmRpbmcgb24gdGhlIGV2ZW50IG5hbWUuIEZvciB1bmtub3duIGV2ZW50IG5hbWVzLCBUeXBlU2NyaXB0IHJlc29ydHMgdG8gdGhlXG4gICAgICAgIC8vIGJhc2UgYEV2ZW50YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkluZmVyKTtcblxuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZWxJZCwgJ2FkZEV2ZW50TGlzdGVuZXInKSxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogYXJndW1lbnRzICovW3RzLmNyZWF0ZVN0cmluZ0xpdGVyYWwob3V0cHV0Lm5hbWUpLCBoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gaW5wdXRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGUgYCRldmVudGBcbiAgICAgICAgLy8gcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVmFsdWUgdXNlZCB0byBicmVhayBhIGNpcmN1bGFyIHJlZmVyZW5jZSBiZXR3ZWVuIGBUY2JPcGBzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgcmV0dXJuZWQgd2hlbmV2ZXIgYFRjYk9wYHMgaGF2ZSBhIGNpcmN1bGFyIGRlcGVuZGVuY3kuIFRoZSBleHByZXNzaW9uIGlzIGEgbm9uLW51bGxcbiAqIGFzc2VydGlvbiBvZiB0aGUgbnVsbCB2YWx1ZSAoaW4gVHlwZVNjcmlwdCwgdGhlIGV4cHJlc3Npb24gYG51bGwhYCkuIFRoaXMgY29uc3RydWN0aW9uIHdpbGwgaW5mZXJcbiAqIHRoZSBsZWFzdCBuYXJyb3cgdHlwZSBmb3Igd2hhdGV2ZXIgaXQncyBhc3NpZ25lZCB0by5cbiAqL1xuY29uc3QgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUiA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSk7XG5cbi8qKlxuICogT3ZlcmFsbCBnZW5lcmF0aW9uIGNvbnRleHQgZm9yIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICpcbiAqIGBDb250ZXh0YCBoYW5kbGVzIG9wZXJhdGlvbnMgZHVyaW5nIGNvZGUgZ2VuZXJhdGlvbiB3aGljaCBhcmUgZ2xvYmFsIHdpdGggcmVzcGVjdCB0byB0aGUgd2hvbGVcbiAqIGJsb2NrLiBJdCdzIHJlc3BvbnNpYmxlIGZvciB2YXJpYWJsZSBuYW1lIGFsbG9jYXRpb24gYW5kIG1hbmFnZW1lbnQgb2YgYW55IGltcG9ydHMgbmVlZGVkLiBJdFxuICogYWxzbyBjb250YWlucyB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaXRzZWxmLlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIHByaXZhdGUgbmV4dElkID0gMTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudjogRW52aXJvbm1lbnQsIHJlYWRvbmx5IGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsIHJlYWRvbmx5IGlkOiBzdHJpbmcsXG4gICAgICByZWFkb25seSBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LFxuICAgICAgcHJpdmF0ZSBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PixcbiAgICAgIHJlYWRvbmx5IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pIHt9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGEgbmV3IHZhcmlhYmxlIG5hbWUgZm9yIHVzZSB3aXRoaW4gdGhlIGBDb250ZXh0YC5cbiAgICpcbiAgICogQ3VycmVudGx5IHRoaXMgdXNlcyBhIG1vbm90b25pY2FsbHkgaW5jcmVhc2luZyBjb3VudGVyLCBidXQgaW4gdGhlIGZ1dHVyZSB0aGUgdmFyaWFibGUgbmFtZVxuICAgKiBtaWdodCBjaGFuZ2UgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGRhdGEgYmVpbmcgc3RvcmVkLlxuICAgKi9cbiAgYWxsb2NhdGVJZCgpOiB0cy5JZGVudGlmaWVyIHsgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90JHt0aGlzLm5leHRJZCsrfWApOyB9XG5cbiAgZ2V0UGlwZUJ5TmFtZShuYW1lOiBzdHJpbmcpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAoIXRoaXMucGlwZXMuaGFzKG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcGlwZTogJHtuYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbnYucGlwZUluc3QodGhpcy5waXBlcy5nZXQobmFtZSkgISk7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2NhbCBzY29wZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2sgZm9yIGEgcGFydGljdWxhciB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGUgdG9wLWxldmVsIHRlbXBsYXRlIGFuZCBlYWNoIG5lc3RlZCBgPG5nLXRlbXBsYXRlPmAgaGF2ZSB0aGVpciBvd24gYFNjb3BlYCwgd2hpY2ggZXhpc3QgaW4gYVxuICogaGllcmFyY2h5LiBUaGUgc3RydWN0dXJlIG9mIHRoaXMgaGllcmFyY2h5IG1pcnJvcnMgdGhlIHN5bnRhY3RpYyBzY29wZXMgaW4gdGhlIGdlbmVyYXRlZCB0eXBlXG4gKiBjaGVjayBibG9jaywgd2hlcmUgZWFjaCBuZXN0ZWQgdGVtcGxhdGUgaXMgZW5jYXNlZCBpbiBhbiBgaWZgIHN0cnVjdHVyZS5cbiAqXG4gKiBBcyBhIHRlbXBsYXRlJ3MgYFRjYk9wYHMgYXJlIGV4ZWN1dGVkIGluIGEgZ2l2ZW4gYFNjb3BlYCwgc3RhdGVtZW50cyBhcmUgYWRkZWQgdmlhXG4gKiBgYWRkU3RhdGVtZW50KClgLiBXaGVuIHRoaXMgcHJvY2Vzc2luZyBpcyBjb21wbGV0ZSwgdGhlIGBTY29wZWAgY2FuIGJlIHR1cm5lZCBpbnRvIGEgYHRzLkJsb2NrYFxuICogdmlhIGByZW5kZXJUb0Jsb2NrKClgLlxuICpcbiAqIElmIGEgYFRjYk9wYCByZXF1aXJlcyB0aGUgb3V0cHV0IG9mIGFub3RoZXIsIGl0IGNhbiBjYWxsIGByZXNvbHZlKClgLlxuICovXG5jbGFzcyBTY29wZSB7XG4gIC8qKlxuICAgKiBBIHF1ZXVlIG9mIG9wZXJhdGlvbnMgd2hpY2ggbmVlZCB0byBiZSBwZXJmb3JtZWQgdG8gZ2VuZXJhdGUgdGhlIFRDQiBjb2RlIGZvciB0aGlzIHNjb3BlLlxuICAgKlxuICAgKiBUaGlzIGFycmF5IGNhbiBjb250YWluIGVpdGhlciBhIGBUY2JPcGAgd2hpY2ggaGFzIHlldCB0byBiZSBleGVjdXRlZCwgb3IgYSBgdHMuRXhwcmVzc2lvbnxudWxsYFxuICAgKiByZXByZXNlbnRpbmcgdGhlIG1lbW9pemVkIHJlc3VsdCBvZiBleGVjdXRpbmcgdGhlIG9wZXJhdGlvbi4gQXMgb3BlcmF0aW9ucyBhcmUgZXhlY3V0ZWQsIHRoZWlyXG4gICAqIHJlc3VsdHMgYXJlIHdyaXR0ZW4gaW50byB0aGUgYG9wUXVldWVgLCBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBJZiBhbiBvcGVyYXRpb24gaXMgaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgZXhlY3V0ZWQsIGl0IGlzIHRlbXBvcmFyaWx5IG92ZXJ3cml0dGVuIGhlcmUgd2l0aFxuICAgKiBgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUmAuIFRoaXMgd2F5LCBpZiBhIGN5Y2xlIGlzIGVuY291bnRlcmVkIHdoZXJlIGFuIG9wZXJhdGlvblxuICAgKiBkZXBlbmRzIHRyYW5zaXRpdmVseSBvbiBpdHMgb3duIHJlc3VsdCwgdGhlIGlubmVyIG9wZXJhdGlvbiB3aWxsIGluZmVyIHRoZSBsZWFzdCBuYXJyb3cgdHlwZVxuICAgKiB0aGF0IGZpdHMgaW5zdGVhZC4gVGhpcyBoYXMgdGhlIHNhbWUgc2VtYW50aWNzIGFzIFR5cGVTY3JpcHQgaXRzZWxmIHdoZW4gdHlwZXMgYXJlIHJlZmVyZW5jZWRcbiAgICogY2lyY3VsYXJseS5cbiAgICovXG4gIHByaXZhdGUgb3BRdWV1ZTogKFRjYk9wfHRzLkV4cHJlc3Npb258bnVsbClbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBgVG1wbEFzdEVsZW1lbnRgcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYkVsZW1lbnRPcGAgaW4gdGhlIGBvcFF1ZXVlYFxuICAgKi9cbiAgcHJpdmF0ZSBlbGVtZW50T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RFbGVtZW50LCBudW1iZXI+KCk7XG4gIC8qKlxuICAgKiBBIG1hcCBvZiBtYXBzIHdoaWNoIHRyYWNrcyB0aGUgaW5kZXggb2YgYFRjYkRpcmVjdGl2ZU9wYHMgaW4gdGhlIGBvcFF1ZXVlYCBmb3IgZWFjaCBkaXJlY3RpdmVcbiAgICogb24gYSBgVG1wbEFzdEVsZW1lbnRgIG9yIGBUbXBsQXN0VGVtcGxhdGVgIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIGRpcmVjdGl2ZU9wTWFwID1cbiAgICAgIG5ldyBNYXA8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIG51bWJlcj4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbW1lZGlhdGVseSBuZXN0ZWQgPG5nLXRlbXBsYXRlPnMgKHdpdGhpbiB0aGlzIGBTY29wZWApIHJlcHJlc2VudGVkIGJ5IGBUbXBsQXN0VGVtcGxhdGVgXG4gICAqIG5vZGVzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiVGVtcGxhdGVDb250ZXh0T3BgcyBpbiB0aGUgYG9wUXVldWVgLlxuICAgKi9cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUN0eE9wTWFwID0gbmV3IE1hcDxUbXBsQXN0VGVtcGxhdGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHZhcmlhYmxlcyBkZWNsYXJlZCBvbiB0aGUgdGVtcGxhdGUgdGhhdCBjcmVhdGVkIHRoaXMgYFNjb3BlYCAocmVwcmVzZW50ZWQgYnlcbiAgICogYFRtcGxBc3RWYXJpYWJsZWAgbm9kZXMpIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiVmFyaWFibGVPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHZhck1hcCA9IG5ldyBNYXA8VG1wbEFzdFZhcmlhYmxlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIFN0YXRlbWVudHMgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqXG4gICAqIEV4ZWN1dGluZyB0aGUgYFRjYk9wYHMgaW4gdGhlIGBvcFF1ZXVlYCBwb3B1bGF0ZXMgdGhpcyBhcnJheS5cbiAgICovXG4gIHByaXZhdGUgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHBhcmVudDogU2NvcGV8bnVsbCA9IG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBgU2NvcGVgIGdpdmVuIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIG9yIGEgbGlzdCBvZiBgVG1wbEFzdE5vZGVgcy5cbiAgICpcbiAgICogQHBhcmFtIHRjYiB0aGUgb3ZlcmFsbCBjb250ZXh0IG9mIFRDQiBnZW5lcmF0aW9uLlxuICAgKiBAcGFyYW0gcGFyZW50IHRoZSBgU2NvcGVgIG9mIHRoZSBwYXJlbnQgdGVtcGxhdGUgKGlmIGFueSkgb3IgYG51bGxgIGlmIHRoaXMgaXMgdGhlIHJvb3RcbiAgICogYFNjb3BlYC5cbiAgICogQHBhcmFtIHRlbXBsYXRlT3JOb2RlcyBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCByZXByZXNlbnRpbmcgdGhlIHRlbXBsYXRlIGZvciB3aGljaCB0b1xuICAgKiBjYWxjdWxhdGUgdGhlIGBTY29wZWAsIG9yIGEgbGlzdCBvZiBub2RlcyBpZiBubyBvdXRlciB0ZW1wbGF0ZSBvYmplY3QgaXMgYXZhaWxhYmxlLlxuICAgKi9cbiAgc3RhdGljIGZvck5vZGVzKFxuICAgICAgdGNiOiBDb250ZXh0LCBwYXJlbnQ6IFNjb3BlfG51bGwsIHRlbXBsYXRlT3JOb2RlczogVG1wbEFzdFRlbXBsYXRlfChUbXBsQXN0Tm9kZVtdKSk6IFNjb3BlIHtcbiAgICBjb25zdCBzY29wZSA9IG5ldyBTY29wZSh0Y2IsIHBhcmVudCk7XG5cbiAgICBsZXQgY2hpbGRyZW46IFRtcGxBc3ROb2RlW107XG5cbiAgICAvLyBJZiBnaXZlbiBhbiBhY3R1YWwgYFRtcGxBc3RUZW1wbGF0ZWAgaW5zdGFuY2UsIHRoZW4gcHJvY2VzcyBhbnkgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBpdFxuICAgIC8vIGhhcy5cbiAgICBpZiAodGVtcGxhdGVPck5vZGVzIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUncyB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgbmVlZCB0byBiZSBhZGRlZCBhcyBgVGNiVmFyaWFibGVPcGBzLlxuICAgICAgZm9yIChjb25zdCB2IG9mIHRlbXBsYXRlT3JOb2Rlcy52YXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3Qgb3BJbmRleCA9IHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiVmFyaWFibGVPcCh0Y2IsIHNjb3BlLCB0ZW1wbGF0ZU9yTm9kZXMsIHYpKSAtIDE7XG4gICAgICAgIHNjb3BlLnZhck1hcC5zZXQodiwgb3BJbmRleCk7XG4gICAgICB9XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2Rlcy5jaGlsZHJlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXM7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBjaGlsZHJlbikge1xuICAgICAgc2NvcGUuYXBwZW5kTm9kZShub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgYSBgdHMuRXhwcmVzc2lvbmAgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiBzb21lIG9wZXJhdGlvbiBpbiB0aGUgY3VycmVudCBgU2NvcGVgLFxuICAgKiBpbmNsdWRpbmcgYW55IHBhcmVudCBzY29wZShzKS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBgVG1wbEFzdE5vZGVgIG9mIHRoZSBvcGVyYXRpb24gaW4gcXVlc3Rpb24uIFRoZSBsb29rdXAgcGVyZm9ybWVkIHdpbGwgZGVwZW5kIG9uXG4gICAqIHRoZSB0eXBlIG9mIHRoaXMgbm9kZTpcbiAgICpcbiAgICogQXNzdW1pbmcgYGRpcmVjdGl2ZWAgaXMgbm90IHByZXNlbnQsIHRoZW4gYHJlc29sdmVgIHdpbGwgcmV0dXJuOlxuICAgKlxuICAgKiAqIGBUbXBsQXN0RWxlbWVudGAgLSByZXRyaWV2ZSB0aGUgZXhwcmVzc2lvbiBmb3IgdGhlIGVsZW1lbnQgRE9NIG5vZGVcbiAgICogKiBgVG1wbEFzdFRlbXBsYXRlYCAtIHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHZhcmlhYmxlXG4gICAqICogYFRtcGxBc3RWYXJpYWJsZWAgLSByZXRyaWV2ZSBhIHRlbXBsYXRlIGxldC0gdmFyaWFibGVcbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBpZiBwcmVzZW50LCBhIGRpcmVjdGl2ZSB0eXBlIG9uIGEgYFRtcGxBc3RFbGVtZW50YCBvciBgVG1wbEFzdFRlbXBsYXRlYCB0b1xuICAgKiBsb29rIHVwIGluc3RlYWQgb2YgdGhlIGRlZmF1bHQgZm9yIGFuIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZS5cbiAgICovXG4gIHJlc29sdmUoXG4gICAgICBub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG9wZXJhdGlvbiBsb2NhbGx5LlxuICAgIGNvbnN0IHJlcyA9IHRoaXMucmVzb2x2ZUxvY2FsKG5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgaWYgKHJlcyAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2UgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBDaGVjayB3aXRoIHRoZSBwYXJlbnQuXG4gICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZShub2RlLCBkaXJlY3RpdmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICR7bm9kZX0gLyAke2RpcmVjdGl2ZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgc3RhdGVtZW50IHRvIHRoaXMgc2NvcGUuXG4gICAqL1xuICBhZGRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7IHRoaXMuc3RhdGVtZW50cy5wdXNoKHN0bXQpOyB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc3RhdGVtZW50cy5cbiAgICovXG4gIHJlbmRlcigpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm9wUXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuZXhlY3V0ZU9wKGkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZW1lbnRzO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTG9jYWwoXG4gICAgICByZWY6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0VmFyaWFibGUsXG4gICAgICBkaXJlY3RpdmU/OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSAmJiB0aGlzLnZhck1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGBUY2JWYXJpYWJsZU9wYCBhc3NvY2lhdGVkIHdpdGggdGhlIGBUbXBsQXN0VmFyaWFibGVgLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudmFyTWFwLmdldChyZWYpICEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSAmJiBkaXJlY3RpdmUgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyB0aGUgY29udGV4dCBvZiB0aGUgZ2l2ZW4gc3ViLXRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlRlbXBsYXRlQ29udGV4dE9wYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudGVtcGxhdGVDdHhPcE1hcC5nZXQocmVmKSAhKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAocmVmIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgcmVmIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSAmJlxuICAgICAgICBkaXJlY3RpdmUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmRpcmVjdGl2ZU9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgYSBkaXJlY3RpdmUgb24gYW4gZWxlbWVudCBvciBzdWItdGVtcGxhdGUuXG4gICAgICBjb25zdCBkaXJNYXAgPSB0aGlzLmRpcmVjdGl2ZU9wTWFwLmdldChyZWYpICE7XG4gICAgICBpZiAoZGlyTWFwLmhhcyhkaXJlY3RpdmUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcChkaXJNYXAuZ2V0KGRpcmVjdGl2ZSkgISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmIHRoaXMuZWxlbWVudE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIERPTSBub2RlIG9mIGFuIGVsZW1lbnQgaW4gdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLmVsZW1lbnRPcE1hcC5nZXQocmVmKSAhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExpa2UgYGV4ZWN1dGVPcGAsIGJ1dCBhc3NlcnQgdGhhdCB0aGUgb3BlcmF0aW9uIGFjdHVhbGx5IHJldHVybmVkIGB0cy5FeHByZXNzaW9uYC5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZU9wKG9wSW5kZXg6IG51bWJlcik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlcyA9IHRoaXMuZXhlY3V0ZU9wKG9wSW5kZXgpO1xuICAgIGlmIChyZXMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3IgcmVzb2x2aW5nIG9wZXJhdGlvbiwgZ290IG51bGxgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGEgcGFydGljdWxhciBgVGNiT3BgIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHJlcGxhY2VzIHRoZSBvcGVyYXRpb24gaW4gdGhlIGBvcFF1ZXVlYCB3aXRoIHRoZSByZXN1bHQgb2YgZXhlY3V0aW9uIChvbmNlIGRvbmUpXG4gICAqIGFuZCBhbHNvIHByb3RlY3RzIGFnYWluc3QgYSBjaXJjdWxhciBkZXBlbmRlbmN5IGZyb20gdGhlIG9wZXJhdGlvbiB0byBpdHNlbGYgYnkgdGVtcG9yYXJpbHlcbiAgICogc2V0dGluZyB0aGUgb3BlcmF0aW9uJ3MgcmVzdWx0IHRvIGEgc3BlY2lhbCBleHByZXNzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBleGVjdXRlT3Aob3BJbmRleDogbnVtYmVyKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBvcCA9IHRoaXMub3BRdWV1ZVtvcEluZGV4XTtcbiAgICBpZiAoIShvcCBpbnN0YW5jZW9mIFRjYk9wKSkge1xuICAgICAgcmV0dXJuIG9wO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24gaW4gdGhlIHF1ZXVlIHRvIGEgc3BlY2lhbCBleHByZXNzaW9uLiBJZiBleGVjdXRpbmcgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiByZXN1bHRzIGluIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSwgdGhpcyB3aWxsIGJyZWFrIHRoZSBjeWNsZSBhbmQgaW5mZXIgdGhlIGxlYXN0XG4gICAgLy8gbmFycm93IHR5cGUgd2hlcmUgbmVlZGVkICh3aGljaCBpcyBob3cgVHlwZVNjcmlwdCBkZWFscyB3aXRoIGNpcmN1bGFyIGRlcGVuZGVuY2llcyBpbiB0eXBlcykuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUjtcbiAgICBjb25zdCByZXMgPSBvcC5leGVjdXRlKCk7XG4gICAgLy8gT25jZSB0aGUgb3BlcmF0aW9uIGhhcyBmaW5pc2hlZCBleGVjdXRpbmcsIGl0J3Mgc2FmZSB0byBjYWNoZSB0aGUgcmVhbCByZXN1bHQuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gcmVzO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE5vZGUobm9kZTogVG1wbEFzdE5vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBjb25zdCBvcEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkVsZW1lbnRPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpIC0gMTtcbiAgICAgIHRoaXMuZWxlbWVudE9wTWFwLnNldChub2RlLCBvcEluZGV4KTtcbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICB0aGlzLmFwcGVuZE5vZGUoY2hpbGQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gVGVtcGxhdGUgY2hpbGRyZW4gYXJlIHJlbmRlcmVkIGluIGEgY2hpbGQgc2NvcGUuXG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1RlbXBsYXRlQm9kaWVzKSB7XG4gICAgICAgIGNvbnN0IGN0eEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQ29udGV4dE9wKHRoaXMudGNiLCB0aGlzKSkgLSAxO1xuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuc2V0KG5vZGUsIGN0eEluZGV4KTtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQm9keU9wKHRoaXMudGNiLCB0aGlzLCBub2RlKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRleHRJbnRlcnBvbGF0aW9uT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIGlucHV0cyBvbiB0aGUgZWxlbWVudC5cbiAgICBjb25zdCBjbGFpbWVkSW5wdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwgfHwgZGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzLCB0aGVuIGFsbCBpbnB1dHMgYXJlIHVuY2xhaW1lZCBpbnB1dHMsIHNvIHF1ZXVlIGFuIG9wZXJhdGlvblxuICAgICAgLy8gdG8gYWRkIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkSW5wdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2goXG4gICAgICAgICAgICBuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCAvKiBjaGVja0VsZW1lbnQgKi8gdHJ1ZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRpck1hcCA9IG5ldyBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICBjb25zdCBkaXJJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSkgLSAxO1xuICAgICAgZGlyTWFwLnNldChkaXIsIGRpckluZGV4KTtcbiAgICB9XG4gICAgdGhpcy5kaXJlY3RpdmVPcE1hcC5zZXQobm9kZSwgZGlyTWFwKTtcblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIGlucHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZW1vdmUgYW55IGlucHV0cyB0aGF0IGl0IGNsYWltcyBmcm9tIGBlbGVtZW50SW5wdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBmaWVsZE5hbWUgb2YgT2JqZWN0LmtleXMoZGlyLmlucHV0cykpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRpci5pbnB1dHNbZmllbGROYW1lXTtcbiAgICAgICAgICBjbGFpbWVkSW5wdXRzLmFkZChBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlWzBdIDogdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMgd2hpY2ggbWF0Y2ggdGhpcyBlbGVtZW50LCB0aGVuIGl0J3MgYSBcInBsYWluXCIgRE9NIGVsZW1lbnQgKG9yIGFcbiAgICAgIC8vIHdlYiBjb21wb25lbnQpLCBhbmQgc2hvdWxkIGJlIGNoZWNrZWQgYWdhaW5zdCB0aGUgRE9NIHNjaGVtYS4gSWYgYW55IGRpcmVjdGl2ZXMgbWF0Y2gsXG4gICAgICAvLyB3ZSBtdXN0IGFzc3VtZSB0aGF0IHRoZSBlbGVtZW50IGNvdWxkIGJlIGN1c3RvbSAoZWl0aGVyIGEgY29tcG9uZW50LCBvciBhIGRpcmVjdGl2ZSBsaWtlXG4gICAgICAvLyA8cm91dGVyLW91dGxldD4pIGFuZCBzaG91bGRuJ3QgdmFsaWRhdGUgdGhlIGVsZW1lbnQgbmFtZSBpdHNlbGYuXG4gICAgICBjb25zdCBjaGVja0VsZW1lbnQgPSBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMDtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEb21TY2hlbWFDaGVja2VyT3AodGhpcy50Y2IsIG5vZGUsIGNoZWNrRWxlbWVudCwgY2xhaW1lZElucHV0cykpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kT3V0cHV0c09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgb3V0cHV0cyBvbiB0aGUgZWxlbWVudC5cbiAgICBjb25zdCBjbGFpbWVkT3V0cHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKG5vZGUpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsIHx8IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcywgdGhlbiBhbGwgb3V0cHV0cyBhcmUgdW5jbGFpbWVkIG91dHB1dHMsIHNvIHF1ZXVlIGFuIG9wZXJhdGlvblxuICAgICAgLy8gdG8gYWRkIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkT3V0cHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkT3V0cHV0cykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFF1ZXVlIG9wZXJhdGlvbnMgZm9yIGFsbCBkaXJlY3RpdmVzIHRvIGNoZWNrIHRoZSByZWxldmFudCBvdXRwdXRzIGZvciBhIGRpcmVjdGl2ZS5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRGlyZWN0aXZlT3V0cHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBkaXIpKTtcbiAgICB9XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBvdXRwdXRzLlxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIC8vIEdvIHRocm91Z2ggdGhlIGRpcmVjdGl2ZXMgYW5kIHJlZ2lzdGVyIGFueSBvdXRwdXRzIHRoYXQgaXQgY2xhaW1zIGluIGBjbGFpbWVkT3V0cHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3Qgb3V0cHV0RmllbGQgb2YgT2JqZWN0LmtleXMoZGlyLm91dHB1dHMpKSB7XG4gICAgICAgICAgY2xhaW1lZE91dHB1dHMuYWRkKGRpci5vdXRwdXRzW291dHB1dEZpZWxkXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZE91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZE91dHB1dHMpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGBjdHhgIHBhcmFtZXRlciB0byB0aGUgdG9wLWxldmVsIFRDQiBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgcGFyYW1ldGVyIHdpdGggYSB0eXBlIGVxdWl2YWxlbnQgdG8gdGhlIGNvbXBvbmVudCB0eXBlLCB3aXRoIGFsbCBnZW5lcmljIHR5cGVcbiAqIHBhcmFtZXRlcnMgbGlzdGVkICh3aXRob3V0IHRoZWlyIGdlbmVyaWMgYm91bmRzKS5cbiAqL1xuZnVuY3Rpb24gdGNiQ3R4UGFyYW0oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbmFtZTogdHMuRW50aXR5TmFtZSk6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uIHtcbiAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLlR5cGVOb2RlW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvLyBDaGVjayBpZiB0aGUgY29tcG9uZW50IGlzIGdlbmVyaWMsIGFuZCBwYXNzIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGlmIHNvLlxuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpO1xuICB9XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShuYW1lLCB0eXBlQXJndW1lbnRzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2N0eCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBgQVNUYCBleHByZXNzaW9uIGFuZCBjb252ZXJ0IGl0IGludG8gYSBgdHMuRXhwcmVzc2lvbmAsIGdlbmVyYXRpbmcgcmVmZXJlbmNlcyB0byB0aGVcbiAqIGNvcnJlY3QgaWRlbnRpZmllcnMgaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHRjYkV4cHJlc3Npb24oXG4gICAgYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvcih0Y2IsIHNjb3BlLCBzb3VyY2VTcGFuKTtcbiAgcmV0dXJuIHRyYW5zbGF0b3IudHJhbnNsYXRlKGFzdCk7XG59XG5cbmNsYXNzIFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgdGNiOiBDb250ZXh0LCBwcm90ZWN0ZWQgc2NvcGU6IFNjb3BlLCBwcm90ZWN0ZWQgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuKSB7fVxuXG4gIHRyYW5zbGF0ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkXG4gICAgLy8gd2hpY2ggaW50ZXJwcmV0cyBzcGVjaWZpYyBleHByZXNzaW9uIG5vZGVzIHRoYXQgaW50ZXJhY3Qgd2l0aCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgLiBUaGVzZVxuICAgIC8vIG5vZGVzIGFjdHVhbGx5IHJlZmVyIHRvIGlkZW50aWZpZXJzIHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KFxuICAgICAgICBhc3QsIGFzdCA9PiB0aGlzLnJlc29sdmUoYXN0KSwgdGhpcy50Y2IuZW52LmNvbmZpZyxcbiAgICAgICAgKHNwYW46IFBhcnNlU3BhbikgPT4gdG9BYnNvbHV0ZVNwYW4oc3BhbiwgdGhpcy5zb3VyY2VTcGFuKSk7XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhbiBgQVNUYCBleHByZXNzaW9uIHdpdGhpbiB0aGUgZ2l2ZW4gc2NvcGUuXG4gICAqXG4gICAqIFNvbWUgYEFTVGAgZXhwcmVzc2lvbnMgcmVmZXIgdG8gdG9wLWxldmVsIGNvbmNlcHRzIChyZWZlcmVuY2VzLCB2YXJpYWJsZXMsIHRoZSBjb21wb25lbnRcbiAgICogY29udGV4dCkuIFRoaXMgbWV0aG9kIGFzc2lzdHMgaW4gcmVzb2x2aW5nIHRob3NlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaGFzIGJvdW5kIGEgdGFyZ2V0IGZvciB0aGlzIGV4cHJlc3Npb24uIElmIHNvLCB0aGVuXG4gICAgICAvLyByZXNvbHZlIHRoYXQgdGFyZ2V0LiBJZiBub3QsIHRoZW4gdGhlIGV4cHJlc3Npb24gaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbCBjb21wb25lbnRcbiAgICAgIC8vIGNvbnRleHQuXG4gICAgICBjb25zdCBiaW5kaW5nID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgICAgaWYgKGJpbmRpbmcgIT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBleHByZXNzaW9uIGhhcyBhIGJpbmRpbmcgdG8gc29tZSB2YXJpYWJsZSBvciByZWZlcmVuY2UgaW4gdGhlIHRlbXBsYXRlLiBSZXNvbHZlIGl0LlxuICAgICAgICBpZiAoYmluZGluZyBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUodGhpcy5zY29wZS5yZXNvbHZlKGJpbmRpbmcpKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIHRvQWJzb2x1dGVTcGFuKGFzdC5zcGFuLCB0aGlzLnNvdXJjZVNwYW4pKTtcbiAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfSBlbHNlIGlmIChiaW5kaW5nIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChiaW5kaW5nKTtcbiAgICAgICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYm91bmQgcmVmZXJlbmNlPyAke2JpbmRpbmcubmFtZX1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBUaGUgcmVmZXJlbmNlIGlzIGVpdGhlciB0byBhbiBlbGVtZW50LCBhbiA8bmctdGVtcGxhdGU+IG5vZGUsIG9yIHRvIGEgZGlyZWN0aXZlIG9uIGFuXG4gICAgICAgICAgLy8gZWxlbWVudCBvciB0ZW1wbGF0ZS5cblxuICAgICAgICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRzLmdldE11dGFibGVDbG9uZSh0aGlzLnNjb3BlLnJlc29sdmUodGFyZ2V0KSk7XG4gICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIHRvQWJzb2x1dGVTcGFuKGFzdC5zcGFuLCB0aGlzLnNvdXJjZVNwYW4pKTtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAgICAgICAvLyBEaXJlY3QgcmVmZXJlbmNlcyB0byBhbiA8bmctdGVtcGxhdGU+IG5vZGUgc2ltcGx5IHJlcXVpcmUgYSB2YWx1ZSBvZiB0eXBlXG4gICAgICAgICAgICAvLyBgVGVtcGxhdGVSZWY8YW55PmAuIFRvIGdldCB0aGlzLCBhbiBleHByZXNzaW9uIG9mIHRoZSBmb3JtXG4gICAgICAgICAgICAvLyBgKG51bGwgYXMgYW55IGFzIFRlbXBsYXRlUmVmPGFueT4pYCBpcyBjb25zdHJ1Y3RlZC5cbiAgICAgICAgICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24odmFsdWUsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICAgICAgICAgIHZhbHVlID0gdHMuY3JlYXRlQXNFeHByZXNzaW9uKFxuICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoJ0Bhbmd1bGFyL2NvcmUnLCAnVGVtcGxhdGVSZWYnLCBbRFlOQU1JQ19UWVBFXSkpO1xuICAgICAgICAgICAgdmFsdWUgPSB0cy5jcmVhdGVQYXJlbih2YWx1ZSk7XG4gICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHZhbHVlLCB0b0Fic29sdXRlU3Bhbihhc3Quc3BhbiwgdGhpcy5zb3VyY2VTcGFuKSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUodGhpcy5zY29wZS5yZXNvbHZlKHRhcmdldC5ub2RlLCB0YXJnZXQuZGlyZWN0aXZlKSk7XG4gICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIHRvQWJzb2x1dGVTcGFuKGFzdC5zcGFuLCB0aGlzLnNvdXJjZVNwYW4pKTtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVhY2hhYmxlOiAke2JpbmRpbmd9YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYSBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlcikgYW5kIHByb2JhYmx5IHJlZmVycyB0byBhIHByb3BlcnR5IGFjY2VzcyBvbiB0aGVcbiAgICAgICAgLy8gY29tcG9uZW50IGNvbnRleHQuIExldCBpdCBmYWxsIHRocm91Z2ggcmVzb2x1dGlvbiBoZXJlIHNvIGl0IHdpbGwgYmUgY2F1Z2h0IHdoZW4gdGhlXG4gICAgICAgIC8vIEltcGxpY2l0UmVjZWl2ZXIgaXMgcmVzb2x2ZWQgaW4gdGhlIGJyYW5jaCBiZWxvdy5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBBU1QgaW5zdGFuY2VzIHJlcHJlc2VudGluZyB2YXJpYWJsZXMgYW5kIHJlZmVyZW5jZXMgbG9vayB2ZXJ5IHNpbWlsYXIgdG8gcHJvcGVydHkgcmVhZHNcbiAgICAgIC8vIGZyb20gdGhlIGNvbXBvbmVudCBjb250ZXh0OiBib3RoIGhhdmUgdGhlIHNoYXBlXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlciwgJ3Byb3BlcnR5TmFtZScpLlxuICAgICAgLy9cbiAgICAgIC8vIGB0Y2JFeHByZXNzaW9uYCB3aWxsIGZpcnN0IHRyeSB0byBgdGNiUmVzb2x2ZWAgdGhlIG91dGVyIFByb3BlcnR5UmVhZC4gSWYgdGhpcyB3b3JrcywgaXQnc1xuICAgICAgLy8gYmVjYXVzZSB0aGUgYEJvdW5kVGFyZ2V0YCBmb3VuZCBhbiBleHByZXNzaW9uIHRhcmdldCBmb3IgdGhlIHdob2xlIGV4cHJlc3Npb24sIGFuZFxuICAgICAgLy8gdGhlcmVmb3JlIGB0Y2JFeHByZXNzaW9uYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHRjYlJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXRcbiAgICAgIC8vIFByb3BlcnR5UmVhZC5cbiAgICAgIC8vXG4gICAgICAvLyBUaGVyZWZvcmUgaWYgYHRjYlJlc29sdmVgIGlzIGNhbGxlZCBvbiBhbiBgSW1wbGljaXRSZWNlaXZlcmAsIGl0J3MgYmVjYXVzZSBubyBvdXRlclxuICAgICAgLy8gUHJvcGVydHlSZWFkIHJlc29sdmVkIHRvIGEgdmFyaWFibGUgb3IgcmVmZXJlbmNlLCBhbmQgdGhlcmVmb3JlIHRoaXMgaXMgYSBwcm9wZXJ0eSByZWFkIG9uXG4gICAgICAvLyB0aGUgY29tcG9uZW50IGNvbnRleHQgaXRzZWxmLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2N0eCcpO1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuZXhwKTtcbiAgICAgIGxldCBwaXBlOiB0cy5FeHByZXNzaW9uO1xuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZQaXBlcykge1xuICAgICAgICBwaXBlID0gdGhpcy50Y2IuZ2V0UGlwZUJ5TmFtZShhc3QubmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwaXBlID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQXNFeHByZXNzaW9uKFxuICAgICAgICAgICAgdHMuY3JlYXRlTnVsbCgpLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSkpO1xuICAgICAgfVxuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0NhbGxNZXRob2QocGlwZSwgJ3RyYW5zZm9ybScsIFtleHByLCAuLi5hcmdzXSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgdG9BYnNvbHV0ZVNwYW4oYXN0LnNwYW4sIHRoaXMuc291cmNlU3BhbikpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBhc3QgaW5zdGFuY2VvZiBNZXRob2RDYWxsICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgYXN0Lm5hbWUgPT09ICckYW55JyAmJiBhc3QuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuYXJnc1swXSk7XG4gICAgICBjb25zdCBleHByQXNBbnkgPVxuICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihleHByLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbihleHByQXNBbnkpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXN1bHQsIHRvQWJzb2x1dGVTcGFuKGFzdC5zcGFuLCB0aGlzLnNvdXJjZVNwYW4pKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgQVNUIGlzbid0IHNwZWNpYWwgYWZ0ZXIgYWxsLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUsIGluZmVycmluZyBhIHR5cGUgZm9yXG4gKiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGZyb20gYW55IGJvdW5kIGlucHV0cy5cbiAqL1xuZnVuY3Rpb24gdGNiQ2FsbFR5cGVDdG9yKFxuICAgIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCwgaW5wdXRzOiBUY2JEaXJlY3RpdmVJbnB1dFtdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHR5cGVDdG9yID0gdGNiLmVudi50eXBlQ3RvckZvcihkaXIpO1xuXG4gIC8vIENvbnN0cnVjdCBhbiBhcnJheSBvZiBgdHMuUHJvcGVydHlBc3NpZ25tZW50YHMgZm9yIGVhY2ggb2YgdGhlIGRpcmVjdGl2ZSdzIGlucHV0cy5cbiAgY29uc3QgbWVtYmVycyA9IGlucHV0cy5tYXAoaW5wdXQgPT4ge1xuICAgIGlmIChpbnB1dC50eXBlID09PSAnYmluZGluZycpIHtcbiAgICAgIC8vIEZvciBib3VuZCBpbnB1dHMsIHRoZSBwcm9wZXJ0eSBpcyBhc3NpZ25lZCB0aGUgYmluZGluZyBleHByZXNzaW9uLlxuICAgICAgbGV0IGV4cHIgPSBpbnB1dC5leHByZXNzaW9uO1xuICAgICAgaWYgKCF0Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoaW5wdXQuZmllbGQsIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIGFzc2lnbm1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEEgdHlwZSBjb25zdHJ1Y3RvciBpcyByZXF1aXJlZCB0byBiZSBjYWxsZWQgd2l0aCBhbGwgaW5wdXQgcHJvcGVydGllcywgc28gYW55IHVuc2V0XG4gICAgICAvLyBpbnB1dHMgYXJlIHNpbXBseSBhc3NpZ25lZCBhIHZhbHVlIG9mIHR5cGUgYGFueWAgdG8gaWdub3JlIHRoZW0uXG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KGlucHV0LmZpZWxkLCBOVUxMX0FTX0FOWSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDYWxsIHRoZSBgbmdUeXBlQ3RvcmAgbWV0aG9kIG9uIHRoZSBkaXJlY3RpdmUgY2xhc3MsIHdpdGggYW4gb2JqZWN0IGxpdGVyYWwgYXJndW1lbnQgY3JlYXRlZFxuICAvLyBmcm9tIHRoZSBtYXRjaGVkIGlucHV0cy5cbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIHR5cGVDdG9yLFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1t0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG1lbWJlcnMpXSk7XG59XG5cbnR5cGUgVGNiRGlyZWN0aXZlSW5wdXQgPSB7XG4gIHR5cGU6ICdiaW5kaW5nJzsgZmllbGQ6IHN0cmluZzsgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjsgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuO1xufSB8XG57XG4gIHR5cGU6ICd1bnNldCc7XG4gIGZpZWxkOiBzdHJpbmc7XG59O1xuXG5mdW5jdGlvbiB0Y2JHZXREaXJlY3RpdmVJbnB1dHMoXG4gICAgZWw6IFRtcGxBc3RFbGVtZW50IHwgVG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlKTogVGNiRGlyZWN0aXZlSW5wdXRbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZUlucHV0czogVGNiRGlyZWN0aXZlSW5wdXRbXSA9IFtdO1xuICAvLyBgZGlyLmlucHV0c2AgaXMgYW4gb2JqZWN0IG1hcCBvZiBmaWVsZCBuYW1lcyBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzIHRvIHByb3BlcnR5IG5hbWVzLlxuICAvLyBUaGlzIGlzIGJhY2t3YXJkcyBmcm9tIHdoYXQncyBuZWVkZWQgdG8gbWF0Y2ggYmluZGluZ3MgLSBhIG1hcCBvZiBwcm9wZXJ0aWVzIHRvIGZpZWxkIG5hbWVzXG4gIC8vIGlzIGRlc2lyZWQuIEludmVydCBgZGlyLmlucHV0c2AgaW50byBgcHJvcE1hdGNoYCB0byBjcmVhdGUgdGhpcyBtYXAuXG4gIGNvbnN0IHByb3BNYXRjaCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGlucHV0cyA9IGRpci5pbnB1dHM7XG4gIE9iamVjdC5rZXlzKGlucHV0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgIEFycmF5LmlzQXJyYXkoaW5wdXRzW2tleV0pID8gcHJvcE1hdGNoLnNldChpbnB1dHNba2V5XVswXSwga2V5KSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wTWF0Y2guc2V0KGlucHV0c1trZXldIGFzIHN0cmluZywga2V5KTtcbiAgfSk7XG5cbiAgLy8gVG8gZGV0ZXJtaW5lIHdoaWNoIG9mIGRpcmVjdGl2ZSdzIGlucHV0cyBhcmUgdW5zZXQsIHdlIGtlZXAgdHJhY2sgb2YgdGhlIHNldCBvZiBmaWVsZCBuYW1lc1xuICAvLyB0aGF0IGhhdmUgbm90IGJlZW4gc2VlbiB5ZXQuIEEgZmllbGQgaXMgcmVtb3ZlZCBmcm9tIHRoaXMgc2V0IG9uY2UgYSBiaW5kaW5nIHRvIGl0IGlzIGZvdW5kLlxuICBjb25zdCB1bnNldEZpZWxkcyA9IG5ldyBTZXQocHJvcE1hdGNoLnZhbHVlcygpKTtcblxuICBlbC5pbnB1dHMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgZWwuYXR0cmlidXRlcy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICBpZiAoZWwgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICBlbC50ZW1wbGF0ZUF0dHJzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIH1cblxuICAvLyBBZGQgdW5zZXQgZGlyZWN0aXZlIGlucHV0cyBmb3IgZWFjaCBvZiB0aGUgcmVtYWluaW5nIHVuc2V0IGZpZWxkcy5cbiAgZm9yIChjb25zdCBmaWVsZCBvZiB1bnNldEZpZWxkcykge1xuICAgIGRpcmVjdGl2ZUlucHV0cy5wdXNoKHt0eXBlOiAndW5zZXQnLCBmaWVsZH0pO1xuICB9XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZUlucHV0cztcblxuICAvKipcbiAgICogQWRkIGEgYmluZGluZyBleHByZXNzaW9uIHRvIHRoZSBtYXAgZm9yIGVhY2ggaW5wdXQvdGVtcGxhdGUgYXR0cmlidXRlIG9mIHRoZSBkaXJlY3RpdmUgdGhhdCBoYXNcbiAgICogYSBtYXRjaGluZyBiaW5kaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc0F0dHJpYnV0ZShhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSk6IHZvaWQge1xuICAgIC8vIFNraXAgbm9uLXByb3BlcnR5IGJpbmRpbmdzLlxuICAgIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGF0dHIudHlwZSAhPT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTa2lwIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGFuIGlucHV0IGZvciBpdC5cbiAgICBpZiAoIXByb3BNYXRjaC5oYXMoYXR0ci5uYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWVsZCA9IHByb3BNYXRjaC5nZXQoYXR0ci5uYW1lKSAhO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBmaWVsZCBmcm9tIHRoZSBzZXQgb2YgdW5zZWVuIGZpZWxkcywgbm93IHRoYXQgaXQncyBiZWVuIGFzc2lnbmVkIHRvLlxuICAgIHVuc2V0RmllbGRzLmRlbGV0ZShmaWVsZCk7XG5cbiAgICBsZXQgZXhwcjogdHMuRXhwcmVzc2lvbjtcbiAgICBpZiAoYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkge1xuICAgICAgLy8gUHJvZHVjZSBhbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgdGhlIGJpbmRpbmcuXG4gICAgICBleHByID0gdGNiRXhwcmVzc2lvbihhdHRyLnZhbHVlLCB0Y2IsIHNjb3BlLCBhdHRyLnZhbHVlU3BhbiB8fCBhdHRyLnNvdXJjZVNwYW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3IgcmVndWxhciBhdHRyaWJ1dGVzIHdpdGggYSBzdGF0aWMgc3RyaW5nIHZhbHVlLCB1c2UgdGhlIHJlcHJlc2VudGVkIHN0cmluZyBsaXRlcmFsLlxuICAgICAgZXhwciA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoYXR0ci52YWx1ZSk7XG4gICAgfVxuXG4gICAgZGlyZWN0aXZlSW5wdXRzLnB1c2goe1xuICAgICAgdHlwZTogJ2JpbmRpbmcnLFxuICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgZXhwcmVzc2lvbjogZXhwcixcbiAgICAgIHNvdXJjZVNwYW46IGF0dHIuc291cmNlU3BhbixcbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBFVkVOVF9QQVJBTUVURVIgPSAnJGV2ZW50JztcblxuY29uc3QgZW51bSBFdmVudFBhcmFtVHlwZSB7XG4gIC8qIEdlbmVyYXRlcyBjb2RlIHRvIGluZmVyIHRoZSB0eXBlIG9mIGAkZXZlbnRgIGJhc2VkIG9uIGhvdyB0aGUgbGlzdGVuZXIgaXMgcmVnaXN0ZXJlZC4gKi9cbiAgSW5mZXIsXG5cbiAgLyogRGVjbGFyZXMgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciBhcyBgYW55YC4gKi9cbiAgQW55LFxufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyb3cgZnVuY3Rpb24gdG8gYmUgdXNlZCBhcyBoYW5kbGVyIGZ1bmN0aW9uIGZvciBldmVudCBiaW5kaW5ncy4gVGhlIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZSBwYXJhbWV0ZXIgYCRldmVudGAgYW5kIHRoZSBib3VuZCBldmVudCdzIGhhbmRsZXIgYEFTVGAgcmVwcmVzZW50ZWQgYXMgYVxuICogVHlwZVNjcmlwdCBleHByZXNzaW9uIGFzIGl0cyBib2R5LlxuICpcbiAqIFdoZW4gYGV2ZW50VHlwZWAgaXMgc2V0IHRvIGBJbmZlcmAsIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIgd2lsbCBub3QgaGF2ZSBhbiBleHBsaWNpdCB0eXBlLiBUaGlzXG4gKiBhbGxvd3MgZm9yIHRoZSBjcmVhdGVkIGhhbmRsZXIgZnVuY3Rpb24gdG8gaGF2ZSBpdHMgYCRldmVudGAgcGFyYW1ldGVyJ3MgdHlwZSBpbmZlcnJlZCBiYXNlZCBvblxuICogaG93IGl0J3MgdXNlZCwgdG8gZW5hYmxlIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50IGJpbmRpbmdzLiBXaGVuIHNldCB0byBgQW55YCwgdGhlIGAkZXZlbnRgXG4gKiBwYXJhbWV0ZXIgd2lsbCBoYXZlIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUsIGVmZmVjdGl2ZWx5IGRpc2FibGluZyBzdHJpY3QgdHlwZSBjaGVja2luZyBvZiBldmVudFxuICogYmluZGluZ3MuIEFsdGVybmF0aXZlbHksIGFuIGV4cGxpY2l0IHR5cGUgY2FuIGJlIHBhc3NlZCBmb3IgdGhlIGAkZXZlbnRgIHBhcmFtZXRlci5cbiAqL1xuZnVuY3Rpb24gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKFxuICAgIGV2ZW50OiBUbXBsQXN0Qm91bmRFdmVudCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUsXG4gICAgZXZlbnRUeXBlOiBFdmVudFBhcmFtVHlwZSB8IHRzLlR5cGVOb2RlKTogdHMuQXJyb3dGdW5jdGlvbiB7XG4gIGNvbnN0IGhhbmRsZXIgPSB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGV2ZW50LmhhbmRsZXIsIHRjYiwgc2NvcGUsIGV2ZW50LmhhbmRsZXJTcGFuKTtcblxuICBsZXQgZXZlbnRQYXJhbVR5cGU6IHRzLlR5cGVOb2RlfHVuZGVmaW5lZDtcbiAgaWYgKGV2ZW50VHlwZSA9PT0gRXZlbnRQYXJhbVR5cGUuSW5mZXIpIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChldmVudFR5cGUgPT09IEV2ZW50UGFyYW1UeXBlLkFueSkge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSBldmVudFR5cGU7XG4gIH1cblxuICBjb25zdCBldmVudFBhcmFtID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBFVkVOVF9QQVJBTUVURVIsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gZXZlbnRQYXJhbVR5cGUpO1xuICByZXR1cm4gdHMuY3JlYXRlQXJyb3dGdW5jdGlvbihcbiAgICAgIC8qIG1vZGlmaWVyICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi9bZXZlbnRQYXJhbV0sXG4gICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGVxdWFsc0dyZWF0ZXJUaGFuVG9rZW4qLyB1bmRlZmluZWQsXG4gICAgICAvKiBib2R5ICovIGhhbmRsZXIpO1xufVxuXG4vKipcbiAqIFNpbWlsYXIgdG8gYHRjYkV4cHJlc3Npb25gLCB0aGlzIGZ1bmN0aW9uIGNvbnZlcnRzIHRoZSBwcm92aWRlZCBgQVNUYCBleHByZXNzaW9uIGludG8gYVxuICogYHRzLkV4cHJlc3Npb25gLCB3aXRoIHNwZWNpYWwgaGFuZGxpbmcgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHRoYXQgY2FuIGJlIHVzZWQgd2l0aGluIGV2ZW50XG4gKiBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gdGNiRXZlbnRIYW5kbGVyRXhwcmVzc2lvbihcbiAgICBhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUsIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbik6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV2ZW50SGFuZGxlclRyYW5zbGF0b3IodGNiLCBzY29wZSwgc291cmNlU3Bhbik7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yIGV4dGVuZHMgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gUmVjb2duaXplIGEgcHJvcGVydHkgcmVhZCBvbiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBldmVudCBwYXJhbWV0ZXJcbiAgICAvLyB0aGF0IGlzIGF2YWlsYWJsZSBpbiBldmVudCBiaW5kaW5ncy4gU2luY2UgdGhpcyB2YXJpYWJsZSBpcyBhIHBhcmFtZXRlciBvZiB0aGUgaGFuZGxlclxuICAgIC8vIGZ1bmN0aW9uIHRoYXQgdGhlIGNvbnZlcnRlZCBleHByZXNzaW9uIGJlY29tZXMgYSBjaGlsZCBvZiwganVzdCBjcmVhdGUgYSByZWZlcmVuY2UgdG8gdGhlXG4gICAgLy8gcGFyYW1ldGVyIGJ5IGl0cyBuYW1lLlxuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlciAmJlxuICAgICAgICBhc3QubmFtZSA9PT0gRVZFTlRfUEFSQU1FVEVSKSB7XG4gICAgICBjb25zdCBldmVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoRVZFTlRfUEFSQU1FVEVSKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXZlbnQsIHRvQWJzb2x1dGVTcGFuKGFzdC5zcGFuLCB0aGlzLnNvdXJjZVNwYW4pKTtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVzb2x2ZShhc3QpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBib29sZWFuIHtcbiAgLy8gSW4gb3JkZXIgdG8gcXVhbGlmeSBmb3IgYSBkZWNsYXJlZCBUQ0IgKG5vdCBpbmxpbmUpIHR3byBjb25kaXRpb25zIG11c3QgYmUgbWV0OlxuICAvLyAxKSB0aGUgY2xhc3MgbXVzdCBiZSBleHBvcnRlZFxuICAvLyAyKSBpdCBtdXN0IG5vdCBoYXZlIGNvbnN0cmFpbmVkIGdlbmVyaWMgdHlwZXNcbiAgaWYgKCFjaGVja0lmQ2xhc3NJc0V4cG9ydGVkKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDEgaXMgZmFsc2UsIHRoZSBjbGFzcyBpcyBub3QgZXhwb3J0ZWQuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoIWNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDIgaXMgZmFsc2UsIHRoZSBjbGFzcyBoYXMgY29uc3RyYWluZWQgZ2VuZXJpYyB0eXBlc1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19