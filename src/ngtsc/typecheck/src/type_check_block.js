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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/expression", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.requiresInlineTypeCheckBlock = exports.Context = exports.TcbDirectiveOutputsOp = exports.generateTypeCheckBlock = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
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
        Object.defineProperty(TcbElementOp.prototype, "optional", {
            get: function () {
                // The statement generated by this operation is only used for type-inference of the DOM
                // element's type and won't report diagnostics by itself, so the operation is marked as optional
                // to avoid generating statements for DOM elements that are never referenced.
                return true;
            },
            enumerable: false,
            configurable: true
        });
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
        Object.defineProperty(TcbVariableOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
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
            // The declaration of the context variable is only needed when the context is actually referenced.
            _this.optional = true;
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
        Object.defineProperty(TcbTemplateBodyOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
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
                            comments_1.markIgnoreDiagnostics(expr);
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
            // Render the template's `Scope` into its statements.
            var statements = tmplScope.render();
            if (statements.length === 0) {
                // As an optimization, don't generate the scope's block if it has no statements. This is
                // beneficial for templates that contain for example `<span *ngIf="first"></span>`, in which
                // case there's no need to render the `NgIf` guard expression. This seems like a minor
                // improvement, however it reduces the number of flow-node antecedents that TypeScript needs
                // to keep into account for such cases, resulting in an overall reduction of
                // type-checking time.
                return null;
            }
            var tmplBlock = ts.createBlock(statements);
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
        Object.defineProperty(TcbTextInterpolationOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
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
        Object.defineProperty(TcbDirectiveTypeOp.prototype, "optional", {
            get: function () {
                // The statement generated by this operation is only used to declare the directive's type and
                // won't report diagnostics by itself, so the operation is marked as optional to avoid
                // generating declarations for directives that don't have any inputs/outputs.
                return true;
            },
            enumerable: false,
            configurable: true
        });
        TcbDirectiveTypeOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            var type = this.tcb.env.referenceType(this.dir.ref);
            comments_1.addExpressionIdentifier(type, comments_1.ExpressionIdentifier.DIRECTIVE);
            diagnostics_1.addParseSpanInfo(type, this.node.startSourceSpan || this.node.sourceSpan);
            this.scope.addStatement(ts_util_1.tsDeclareVariable(id, type));
            return id;
        };
        return TcbDirectiveTypeOp;
    }(TcbOp));
    /**
     * A `TcbOp` which creates a variable for a local ref in a template.
     * The initializer for the variable is the variable expression for the directive, template, or
     * element the ref refers to. When the reference is used in the template, those TCB statements will
     * access this variable as well. For example:
     * ```
     * var _t1 = document.createElement('div');
     * var _t2 = _t1;
     * _t2.value
     * ```
     * This operation supports more fluent lookups for the `TemplateTypeChecker` when getting a symbol
     * for a reference. In most cases, this isn't essential; that is, the information for the symbol
     * could be gathered without this operation using the `BoundTarget`. However, for the case of
     * ng-template references, we will need this reference variable to not only provide a location in
     * the shim file, but also to narrow the variable to the correct `TemplateRef<T>` type rather than
     * `TemplateRef<any>` (this work is still TODO).
     *
     * Executing this operation returns a reference to the directive instance variable with its inferred
     * type.
     */
    var TcbReferenceOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbReferenceOp, _super);
        function TcbReferenceOp(tcb, scope, node, host, target) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.host = host;
            _this.target = target;
            // The statement generated by this operation is only used to for the Type Checker
            // so it can map a reference variable in the template directly to a node in the TCB.
            _this.optional = true;
            return _this;
        }
        TcbReferenceOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            var initializer = this.target instanceof compiler_1.TmplAstTemplate || this.target instanceof compiler_1.TmplAstElement ?
                this.scope.resolve(this.target) :
                this.scope.resolve(this.host, this.target);
            // The reference is either to an element, an <ng-template> node, or to a directive on an
            // element or template.
            if ((this.target instanceof compiler_1.TmplAstElement && !this.tcb.env.config.checkTypeOfDomReferences) ||
                !this.tcb.env.config.checkTypeOfNonDomReferences) {
                // References to DOM nodes are pinned to 'any' when `checkTypeOfDomReferences` is `false`.
                // References to `TemplateRef`s and directives are pinned to 'any' when
                // `checkTypeOfNonDomReferences` is `false`.
                initializer =
                    ts.createAsExpression(initializer, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
            }
            else if (this.target instanceof compiler_1.TmplAstTemplate) {
                // Direct references to an <ng-template> node simply require a value of type
                // `TemplateRef<any>`. To get this, an expression of the form
                // `(_t1 as any as TemplateRef<any>)` is constructed.
                initializer =
                    ts.createAsExpression(initializer, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                initializer = ts.createAsExpression(initializer, this.tcb.env.referenceExternalType('@angular/core', 'TemplateRef', [compiler_1.DYNAMIC_TYPE]));
                initializer = ts.createParen(initializer);
            }
            diagnostics_1.addParseSpanInfo(initializer, this.node.sourceSpan);
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, initializer));
            return id;
        };
        return TcbReferenceOp;
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
        Object.defineProperty(TcbDirectiveCtorOp.prototype, "optional", {
            get: function () {
                // The statement generated by this operation is only used to infer the directive's type and
                // won't report diagnostics by itself, so the operation is marked as optional.
                return true;
            },
            enumerable: false,
            configurable: true
        });
        TcbDirectiveCtorOp.prototype.execute = function () {
            var e_2, _a, e_3, _b, e_4, _c;
            var id = this.tcb.allocateId();
            comments_1.addExpressionIdentifier(id, comments_1.ExpressionIdentifier.DIRECTIVE);
            diagnostics_1.addParseSpanInfo(id, this.node.startSourceSpan || this.node.sourceSpan);
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
                for (var _f = tslib_1.__values(this.dir.inputs), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = tslib_1.__read(_g.value, 1), fieldName = _h[0];
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
            comments_1.markIgnoreDiagnostics(typeCtor);
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
        Object.defineProperty(TcbDirectiveInputsOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
        TcbDirectiveInputsOp.prototype.execute = function () {
            var e_5, _a, e_6, _b;
            var dirId = null;
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
                                if (dirId === null) {
                                    dirId = this.scope.resolve(this.node, this.dir);
                                }
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
                                if (dirId === null) {
                                    dirId = this.scope.resolve(this.node, this.dir);
                                }
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
        Object.defineProperty(TcbDirectiveCtorCircularFallbackOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
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
        Object.defineProperty(TcbDomSchemaCheckerOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
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
        Object.defineProperty(TcbUnclaimedInputsOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
        TcbUnclaimedInputsOp.prototype.execute = function () {
            var e_8, _a;
            // `this.inputs` contains only those bindings not matched by any directive. These bindings go to
            // the element itself.
            var elId = null;
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
                            if (elId === null) {
                                elId = this.scope.resolve(this.element);
                            }
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
        Object.defineProperty(TcbDirectiveOutputsOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
        TcbDirectiveOutputsOp.prototype.execute = function () {
            var e_9, _a;
            var dirId = null;
            var outputs = this.dir.outputs;
            try {
                for (var _b = tslib_1.__values(this.node.outputs), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var output = _c.value;
                    if (output.type !== 0 /* Regular */ || !outputs.hasBindingPropertyName(output.name)) {
                        continue;
                    }
                    // TODO(alxhub): consider supporting multiple fields with the same property name for outputs.
                    var field = outputs.getByBindingPropertyName(output.name)[0].classPropertyName;
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
                        if (dirId === null) {
                            dirId = this.scope.resolve(this.node, this.dir);
                        }
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
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_9) throw e_9.error; }
            }
            return null;
        };
        /**
         * Outputs are a `ts.CallExpression` that look like one of the two:
         *  - `_outputHelper(_t1["outputField"]).subscribe(handler);`
         *  - `_t1.addEventListener(handler);`
         * This method reverses the operations to create a call expression for a directive output.
         * It unpacks the given call expression and returns the original element access (i.e.
         * `_t1["outputField"]` in the example above). Returns `null` if the given call expression is not
         * the expected structure of an output binding
         */
        TcbDirectiveOutputsOp.decodeOutputCallExpression = function (node) {
            // `node.expression` === `_outputHelper(_t1["outputField"]).subscribe` or `_t1.addEventListener`
            if (!ts.isPropertyAccessExpression(node.expression) ||
                node.expression.name.text === 'addEventListener') {
                // `addEventListener` outputs do not have an `ElementAccessExpression` for the output field.
                return null;
            }
            if (!ts.isCallExpression(node.expression.expression)) {
                return null;
            }
            // `node.expression.expression` === `_outputHelper(_t1["outputField"])`
            if (node.expression.expression.arguments.length === 0) {
                return null;
            }
            var _a = tslib_1.__read(node.expression.expression.arguments, 1), outputFieldAccess = _a[0];
            if (!ts.isElementAccessExpression(outputFieldAccess)) {
                return null;
            }
            return outputFieldAccess;
        };
        return TcbDirectiveOutputsOp;
    }(TcbOp));
    exports.TcbDirectiveOutputsOp = TcbDirectiveOutputsOp;
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
        Object.defineProperty(TcbUnclaimedOutputsOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
        TcbUnclaimedOutputsOp.prototype.execute = function () {
            var e_10, _a;
            var elId = null;
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
                        if (elId === null) {
                            elId = this.scope.resolve(this.element);
                        }
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
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_10) throw e_10.error; }
            }
            return null;
        };
        return TcbUnclaimedOutputsOp;
    }(TcbOp));
    /**
     * A `TcbOp` which generates a completion point for the component context.
     *
     * This completion point looks like `ctx. ;` in the TCB output, and does not produce diagnostics.
     * TypeScript autocompletion APIs can be used at this completion point (after the '.') to produce
     * autocompletion results of properties and methods from the template's component context.
     */
    var TcbComponentContextCompletionOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbComponentContextCompletionOp, _super);
        function TcbComponentContextCompletionOp(scope) {
            var _this = _super.call(this) || this;
            _this.scope = scope;
            _this.optional = false;
            return _this;
        }
        TcbComponentContextCompletionOp.prototype.execute = function () {
            var ctx = ts.createIdentifier('ctx');
            var ctxDot = ts.createPropertyAccess(ctx, '');
            comments_1.markIgnoreDiagnostics(ctxDot);
            comments_1.addExpressionIdentifier(ctxDot, comments_1.ExpressionIdentifier.COMPONENT_COMPLETION);
            this.scope.addStatement(ts.createExpressionStatement(ctxDot));
            return null;
        };
        return TcbComponentContextCompletionOp;
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
            return this.pipes.get(name);
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
             * A map of `TmplAstReference`s to the index of their `TcbReferenceOp` in the `opQueue`
             */
            this.referenceOpMap = new Map();
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
            var e_11, _a, e_12, _b;
            var scope = new Scope(tcb, parent, guard);
            if (parent === null && tcb.env.config.enableTemplateTypeChecker) {
                // Add an autocompletion point for the component context.
                scope.opQueue.push(new TcbComponentContextCompletionOp(scope));
            }
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
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_11) throw e_11.error; }
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
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (children_1_1 && !children_1_1.done && (_b = children_1.return)) _b.call(children_1);
                }
                finally { if (e_12) throw e_12.error; }
            }
            return scope;
        };
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
         * * `TmplAstReference` - retrieve variable created for the local ref
         *
         * @param directive if present, a directive type on a `TmplAstElement` or `TmplAstTemplate` to
         * look up instead of the default for an element or template node.
         */
        Scope.prototype.resolve = function (node, directive) {
            // Attempt to resolve the operation locally.
            var res = this.resolveLocal(node, directive);
            if (res !== null) {
                // We want to get a clone of the resolved expression and clear the trailing comments
                // so they don't continue to appear in every place the expression is used.
                // As an example, this would otherwise produce:
                // var _t1 /**T:DIR*/ /*1,2*/ = _ctor1();
                // _t1 /**T:DIR*/ /*1,2*/.input = 'value';
                //
                // In addition, returning a clone prevents the consumer of `Scope#resolve` from
                // attaching comments at the declaration site.
                var clone = ts.getMutableClone(res);
                ts.setSyntheticTrailingComments(clone, []);
                return clone;
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
                // Optional statements cannot be skipped when we are generating the TCB for use
                // by the TemplateTypeChecker.
                var skipOptional = !this.tcb.env.config.enableTemplateTypeChecker;
                this.executeOp(i, skipOptional);
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
            if (ref instanceof compiler_1.TmplAstReference && this.referenceOpMap.has(ref)) {
                return this.resolveOp(this.referenceOpMap.get(ref));
            }
            else if (ref instanceof compiler_1.TmplAstVariable && this.varMap.has(ref)) {
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
            var res = this.executeOp(opIndex, /* skipOptional */ false);
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
        Scope.prototype.executeOp = function (opIndex, skipOptional) {
            var op = this.opQueue[opIndex];
            if (!(op instanceof TcbOp)) {
                return op;
            }
            if (skipOptional && op.optional) {
                return null;
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
            var e_13, _a;
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
                catch (e_13_1) { e_13 = { error: e_13_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_13) throw e_13.error; }
                }
                this.checkAndAppendReferencesOfNode(node);
            }
            else if (node instanceof compiler_1.TmplAstTemplate) {
                // Template children are rendered in a child scope.
                this.appendDirectivesAndInputsOfNode(node);
                this.appendOutputsOfNode(node);
                var ctxIndex = this.opQueue.push(new TcbTemplateContextOp(this.tcb, this)) - 1;
                this.templateCtxOpMap.set(node, ctxIndex);
                if (this.tcb.env.config.checkTemplateBodies) {
                    this.opQueue.push(new TcbTemplateBodyOp(this.tcb, this, node));
                }
                else if (this.tcb.env.config.alwaysCheckSchemaInTemplateBodies) {
                    this.appendDeepSchemaChecks(node.children);
                }
                this.checkAndAppendReferencesOfNode(node);
            }
            else if (node instanceof compiler_1.TmplAstBoundText) {
                this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, node));
            }
            else if (node instanceof compiler_1.TmplAstIcu) {
                this.appendIcuExpressions(node);
            }
        };
        Scope.prototype.checkAndAppendReferencesOfNode = function (node) {
            var e_14, _a;
            try {
                for (var _b = tslib_1.__values(node.references), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var ref = _c.value;
                    var target = this.tcb.boundTarget.getReferenceTarget(ref);
                    if (target === null) {
                        this.tcb.oobRecorder.missingReferenceTarget(this.tcb.id, ref);
                        continue;
                    }
                    var ctxIndex = void 0;
                    if (target instanceof compiler_1.TmplAstTemplate || target instanceof compiler_1.TmplAstElement) {
                        ctxIndex = this.opQueue.push(new TcbReferenceOp(this.tcb, this, ref, node, target)) - 1;
                    }
                    else {
                        ctxIndex =
                            this.opQueue.push(new TcbReferenceOp(this.tcb, this, ref, node, target.directive)) - 1;
                    }
                    this.referenceOpMap.set(ref, ctxIndex);
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_14) throw e_14.error; }
            }
        };
        Scope.prototype.appendDirectivesAndInputsOfNode = function (node) {
            var e_15, _a, e_16, _b, e_17, _c;
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
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (directives_2_1 && !directives_2_1.done && (_a = directives_2.return)) _a.call(directives_2);
                }
                finally { if (e_15) throw e_15.error; }
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
                            for (var _d = (e_17 = void 0, tslib_1.__values(dir.inputs.propertyNames)), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var propertyName = _e.value;
                                claimedInputs.add(propertyName);
                            }
                        }
                        catch (e_17_1) { e_17 = { error: e_17_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_17) throw e_17.error; }
                        }
                    }
                }
                catch (e_16_1) { e_16 = { error: e_16_1 }; }
                finally {
                    try {
                        if (directives_3_1 && !directives_3_1.done && (_b = directives_3.return)) _b.call(directives_3);
                    }
                    finally { if (e_16) throw e_16.error; }
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
            var e_18, _a, e_19, _b, e_20, _c;
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
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (directives_4_1 && !directives_4_1.done && (_a = directives_4.return)) _a.call(directives_4);
                }
                finally { if (e_18) throw e_18.error; }
            }
            // After expanding the directives, we might need to queue an operation to check any unclaimed
            // outputs.
            if (node instanceof compiler_1.TmplAstElement) {
                try {
                    // Go through the directives and register any outputs that it claims in `claimedOutputs`.
                    for (var directives_5 = tslib_1.__values(directives), directives_5_1 = directives_5.next(); !directives_5_1.done; directives_5_1 = directives_5.next()) {
                        var dir = directives_5_1.value;
                        try {
                            for (var _d = (e_20 = void 0, tslib_1.__values(dir.outputs.propertyNames)), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var outputProperty = _e.value;
                                claimedOutputs.add(outputProperty);
                            }
                        }
                        catch (e_20_1) { e_20 = { error: e_20_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                            }
                            finally { if (e_20) throw e_20.error; }
                        }
                    }
                }
                catch (e_19_1) { e_19 = { error: e_19_1 }; }
                finally {
                    try {
                        if (directives_5_1 && !directives_5_1.done && (_b = directives_5.return)) _b.call(directives_5);
                    }
                    finally { if (e_19) throw e_19.error; }
                }
                this.opQueue.push(new TcbUnclaimedOutputsOp(this.tcb, this, node, claimedOutputs));
            }
        };
        Scope.prototype.appendDeepSchemaChecks = function (nodes) {
            var e_21, _a, e_22, _b, e_23, _c;
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    if (!(node instanceof compiler_1.TmplAstElement || node instanceof compiler_1.TmplAstTemplate)) {
                        continue;
                    }
                    if (node instanceof compiler_1.TmplAstElement) {
                        var claimedInputs = new Set();
                        var directives = this.tcb.boundTarget.getDirectivesOfNode(node);
                        var hasDirectives = void 0;
                        if (directives === null || directives.length === 0) {
                            hasDirectives = false;
                        }
                        else {
                            hasDirectives = true;
                            try {
                                for (var directives_6 = (e_22 = void 0, tslib_1.__values(directives)), directives_6_1 = directives_6.next(); !directives_6_1.done; directives_6_1 = directives_6.next()) {
                                    var dir = directives_6_1.value;
                                    try {
                                        for (var _d = (e_23 = void 0, tslib_1.__values(dir.inputs.propertyNames)), _e = _d.next(); !_e.done; _e = _d.next()) {
                                            var propertyName = _e.value;
                                            claimedInputs.add(propertyName);
                                        }
                                    }
                                    catch (e_23_1) { e_23 = { error: e_23_1 }; }
                                    finally {
                                        try {
                                            if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                                        }
                                        finally { if (e_23) throw e_23.error; }
                                    }
                                }
                            }
                            catch (e_22_1) { e_22 = { error: e_22_1 }; }
                            finally {
                                try {
                                    if (directives_6_1 && !directives_6_1.done && (_b = directives_6.return)) _b.call(directives_6);
                                }
                                finally { if (e_22) throw e_22.error; }
                            }
                        }
                        this.opQueue.push(new TcbDomSchemaCheckerOp(this.tcb, node, !hasDirectives, claimedInputs));
                    }
                    this.appendDeepSchemaChecks(node.children);
                }
            }
            catch (e_21_1) { e_21 = { error: e_21_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
                }
                finally { if (e_21) throw e_21.error; }
            }
        };
        Scope.prototype.appendIcuExpressions = function (node) {
            var e_24, _a, e_25, _b;
            try {
                for (var _c = tslib_1.__values(Object.values(node.vars)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var variable = _d.value;
                    this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, variable));
                }
            }
            catch (e_24_1) { e_24 = { error: e_24_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_24) throw e_24.error; }
            }
            try {
                for (var _e = tslib_1.__values(Object.values(node.placeholders)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var placeholder = _f.value;
                    if (placeholder instanceof compiler_1.TmplAstBoundText) {
                        this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, placeholder));
                    }
                }
            }
            catch (e_25_1) { e_25 = { error: e_25_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_25) throw e_25.error; }
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
                var pipeRef = this.tcb.getPipeByName(ast.name);
                var pipe = void 0;
                if (pipeRef === null) {
                    // No pipe by that name exists in scope. Record this as an error.
                    this.tcb.oobRecorder.missingPipe(this.tcb.id, ast);
                    // Use an 'any' value to at least allow the rest of the expression to be checked.
                    pipe = expression_1.NULL_AS_ANY;
                }
                else if (this.tcb.env.config.checkTypeOfPipes) {
                    // Use a variable declared as the pipe's type.
                    pipe = this.tcb.env.pipeInst(pipeRef);
                }
                else {
                    // Use an 'any' value when not checking the type of the pipe.
                    pipe = expression_1.NULL_AS_ANY;
                }
                var args = ast.args.map(function (arg) { return _this.translate(arg); });
                var result = ts_util_1.tsCallMethod(pipe, 'transform', tslib_1.__spread([expr], args));
                diagnostics_1.addParseSpanInfo(result, ast.sourceSpan);
                return result;
            }
            else if (ast instanceof compiler_1.MethodCall && ast.receiver instanceof compiler_1.ImplicitReceiver &&
                !(ast.receiver instanceof compiler_1.ThisReceiver)) {
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
            var expr = this.scope.resolve(binding);
            diagnostics_1.addParseSpanInfo(expr, ast.sourceSpan);
            return expr;
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
            var inputs = directive.inputs.getByBindingPropertyName(attr.name);
            if (inputs === null) {
                return;
            }
            var fieldNames = inputs.map(function (input) { return input.classPropertyName; });
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
                !(ast.receiver instanceof compiler_1.ThisReceiver) && ast.name === EVENT_PARAMETER) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclksK0JBQWlDO0lBT2pDLG1GQUFnRztJQUNoRyx5RkFBa0Y7SUFHbEYsdUZBQTBEO0lBRTFELHVHQUErRDtJQUMvRCxpRkFBbU07SUFFbk07Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFCRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxHQUFnQixFQUFFLEdBQXFELEVBQUUsSUFBbUIsRUFDNUYsSUFBNEIsRUFBRSxnQkFBa0MsRUFDaEUsV0FBd0M7UUFDMUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQ25CLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdGLElBQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFVLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUNYLG1FQUFpRSxHQUFHLENBQUMsU0FBVyxDQUFDLENBQUM7U0FDdkY7UUFDRCxJQUFNLFNBQVMsR0FBRyxD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SUFBSSxHQUFHLFlBQVksdUJBQVksSUFBSSxHQUFHLENBQUMsUUFBUSxZQUFZLDJCQUFnQjtnQkFDdkUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLFlBQVksdUJBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO2dCQUMzRSxJQUFNLE9BQUssR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ25ELDhCQUFnQixDQUFDLE9BQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sT0FBSyxDQUFDO2FBQ2Q7WUFFRCxPQUFPLGlCQUFNLE9BQU8sWUFBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBZkQsQ0FBd0MsdUJBQXVCLEdBZTlEO0lBRUQsU0FBZ0IsNEJBQTRCLENBQUMsSUFBMkM7UUFDdEYsa0ZBQWtGO1FBQ2xGLGdDQUFnQztRQUNoQyxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLGdDQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLG1EQUFtRDtZQUNuRCxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU0sSUFBSSxDQUFDLHVDQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9DLGdFQUFnRTtZQUNoRSxPQUFPLElBQUksQ0FBQztTQUNiO2FBQU07WUFDTCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztJQWJELG9FQWFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBEWU5BTUlDX1RZUEUsIEltcGxpY2l0UmVjZWl2ZXIsIE1ldGhvZENhbGwsIFBhcnNlZEV2ZW50VHlwZSwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNjaGVtYU1ldGFkYXRhLCBUaGlzUmVjZWl2ZXIsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0SWN1LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc1Byb3BlcnR5TmFtZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7VGVtcGxhdGVJZCwgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGF9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7YWRkRXhwcmVzc2lvbklkZW50aWZpZXIsIEV4cHJlc3Npb25JZGVudGlmaWVyLCBtYXJrSWdub3JlRGlhZ25vc3RpY3N9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHthZGRQYXJzZVNwYW5JbmZvLCBhZGRUZW1wbGF0ZUlkLCB3cmFwRm9yRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7YXN0VG9UeXBlc2NyaXB0LCBOVUxMX0FTX0FOWX0gZnJvbSAnLi9leHByZXNzaW9uJztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5pbXBvcnQge0V4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3J9IGZyb20gJy4vdGVtcGxhdGVfc2VtYW50aWNzJztcbmltcG9ydCB7Y2hlY2tJZkNsYXNzSXNFeHBvcnRlZCwgY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQsIHRzQ2FsbE1ldGhvZCwgdHNDYXN0VG9BbnksIHRzQ3JlYXRlRWxlbWVudCwgdHNDcmVhdGVUeXBlUXVlcnlGb3JDb2VyY2VkSW5wdXQsIHRzQ3JlYXRlVmFyaWFibGUsIHRzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuXG4vKipcbiAqIEdpdmVuIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIGZvciBhIGNvbXBvbmVudCwgYW5kIG1ldGFkYXRhIHJlZ2FyZGluZyB0aGF0IGNvbXBvbmVudCwgY29tcG9zZSBhXG4gKiBcInR5cGUgY2hlY2sgYmxvY2tcIiBmdW5jdGlvbi5cbiAqXG4gKiBXaGVuIHBhc3NlZCB0aHJvdWdoIFR5cGVTY3JpcHQncyBUeXBlQ2hlY2tlciwgdHlwZSBlcnJvcnMgdGhhdCBhcmlzZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2tcbiAqIGZ1bmN0aW9uIGluZGljYXRlIGlzc3VlcyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICpcbiAqIEFzIGEgc2lkZSBlZmZlY3Qgb2YgZ2VuZXJhdGluZyBhIFRDQiBmb3IgdGhlIGNvbXBvbmVudCwgYHRzLkRpYWdub3N0aWNgcyBtYXkgYWxzbyBiZSBwcm9kdWNlZFxuICogZGlyZWN0bHkgZm9yIGlzc3VlcyB3aXRoaW4gdGhlIHRlbXBsYXRlIHdoaWNoIGFyZSBpZGVudGlmaWVkIGR1cmluZyBnZW5lcmF0aW9uLiBUaGVzZSBpc3N1ZXMgYXJlXG4gKiByZWNvcmRlZCBpbiBlaXRoZXIgdGhlIGBkb21TY2hlbWFDaGVja2VyYCAod2hpY2ggY2hlY2tzIHVzYWdlIG9mIERPTSBlbGVtZW50cyBhbmQgYmluZGluZ3MpIGFzXG4gKiB3ZWxsIGFzIHRoZSBgb29iUmVjb3JkZXJgICh3aGljaCByZWNvcmRzIGVycm9ycyB3aGVuIHRoZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdG9yIGlzIHVuYWJsZVxuICogdG8gc3VmZmljaWVudGx5IHVuZGVyc3RhbmQgYSB0ZW1wbGF0ZSkuXG4gKlxuICogQHBhcmFtIGVudiBhbiBgRW52aXJvbm1lbnRgIGludG8gd2hpY2ggdHlwZS1jaGVja2luZyBjb2RlIHdpbGwgYmUgZ2VuZXJhdGVkLlxuICogQHBhcmFtIHJlZiBhIGBSZWZlcmVuY2VgIHRvIHRoZSBjb21wb25lbnQgY2xhc3Mgd2hpY2ggc2hvdWxkIGJlIHR5cGUtY2hlY2tlZC5cbiAqIEBwYXJhbSBuYW1lIGEgYHRzLklkZW50aWZpZXJgIHRvIHVzZSBmb3IgdGhlIGdlbmVyYXRlZCBgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbmAuXG4gKiBAcGFyYW0gbWV0YSBtZXRhZGF0YSBhYm91dCB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgYW5kIHRoZSBmdW5jdGlvbiBiZWluZyBnZW5lcmF0ZWQuXG4gKiBAcGFyYW0gZG9tU2NoZW1hQ2hlY2tlciB1c2VkIHRvIGNoZWNrIGFuZCByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyBpbXByb3BlciB1c2FnZSBvZiBET00gZWxlbWVudHNcbiAqIGFuZCBiaW5kaW5ncy5cbiAqIEBwYXJhbSBvb2JSZWNvcmRlciB1c2VkIHRvIHJlY29yZCBlcnJvcnMgcmVnYXJkaW5nIHRlbXBsYXRlIGVsZW1lbnRzIHdoaWNoIGNvdWxkIG5vdCBiZSBjb3JyZWN0bHlcbiAqIHRyYW5zbGF0ZWQgaW50byB0eXBlcyBkdXJpbmcgVENCIGdlbmVyYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgIGVudjogRW52aXJvbm1lbnQsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBuYW1lOiB0cy5JZGVudGlmaWVyLFxuICAgIG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICBjb25zdCB0Y2IgPSBuZXcgQ29udGV4dChcbiAgICAgIGVudiwgZG9tU2NoZW1hQ2hlY2tlciwgb29iUmVjb3JkZXIsIG1ldGEuaWQsIG1ldGEuYm91bmRUYXJnZXQsIG1ldGEucGlwZXMsIG1ldGEuc2NoZW1hcyk7XG4gIGNvbnN0IHNjb3BlID0gU2NvcGUuZm9yTm9kZXModGNiLCBudWxsLCB0Y2IuYm91bmRUYXJnZXQudGFyZ2V0LnRlbXBsYXRlICEsIC8qIGd1YXJkICovIG51bGwpO1xuICBjb25zdCBjdHhSYXdUeXBlID0gZW52LnJlZmVyZW5jZVR5cGUocmVmKTtcbiAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGN0eFJhd1R5cGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgd2hlbiByZWZlcmVuY2luZyB0aGUgY3R4IHBhcmFtIGZvciAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gIH1cbiAgY29uc3QgcGFyYW1MaXN0ID0gW3RjYkN0eFBhcmFtKHJlZi5ub2RlLCBjdHhSYXdUeXBlLnR5cGVOYW1lLCBlbnYuY29uZmlnLnVzZUNvbnRleHRHZW5lcmljVHlwZSldO1xuXG4gIGNvbnN0IHNjb3BlU3RhdGVtZW50cyA9IHNjb3BlLnJlbmRlcigpO1xuICBjb25zdCBpbm5lckJvZHkgPSB0cy5jcmVhdGVCbG9jayhbXG4gICAgLi4uZW52LmdldFByZWx1ZGVTdGF0ZW1lbnRzKCksXG4gICAgLi4uc2NvcGVTdGF0ZW1lbnRzLFxuICBdKTtcblxuICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIFwiaWYgKHRydWUpXCIgZXhwcmVzc2lvbi4gVGhpcyBpcyB1bm5lY2Vzc2FyeSBidXQgaGFzIHRoZSBlZmZlY3Qgb2YgY2F1c2luZ1xuICAvLyB0aGUgYHRzLlByaW50ZXJgIHRvIGZvcm1hdCB0aGUgdHlwZS1jaGVjayBibG9jayBuaWNlbHkuXG4gIGNvbnN0IGJvZHkgPSB0cy5jcmVhdGVCbG9jayhbdHMuY3JlYXRlSWYodHMuY3JlYXRlVHJ1ZSgpLCBpbm5lckJvZHksIHVuZGVmaW5lZCldKTtcbiAgY29uc3QgZm5EZWNsID0gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBuYW1lLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPyByZWYubm9kZS50eXBlUGFyYW1ldGVycyA6IHVuZGVmaW5lZCxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi8gcGFyYW1MaXN0LFxuICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBib2R5ICovIGJvZHkpO1xuICBhZGRUZW1wbGF0ZUlkKGZuRGVjbCwgbWV0YS5pZCk7XG4gIHJldHVybiBmbkRlY2w7XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQncyBpbnZvbHZlZCBpbiB0aGUgY29uc3RydWN0aW9uIG9mIGEgVHlwZSBDaGVjayBCbG9jay5cbiAqXG4gKiBUaGUgZ2VuZXJhdGlvbiBvZiBhIFRDQiBpcyBub24tbGluZWFyLiBCaW5kaW5ncyB3aXRoaW4gYSB0ZW1wbGF0ZSBtYXkgcmVzdWx0IGluIHRoZSBuZWVkIHRvXG4gKiBjb25zdHJ1Y3QgY2VydGFpbiB0eXBlcyBlYXJsaWVyIHRoYW4gdGhleSBvdGhlcndpc2Ugd291bGQgYmUgY29uc3RydWN0ZWQuIFRoYXQgaXMsIGlmIHRoZVxuICogZ2VuZXJhdGlvbiBvZiBhIFRDQiBmb3IgYSB0ZW1wbGF0ZSBpcyBicm9rZW4gZG93biBpbnRvIHNwZWNpZmljIG9wZXJhdGlvbnMgKGNvbnN0cnVjdGluZyBhXG4gKiBkaXJlY3RpdmUsIGV4dHJhY3RpbmcgYSB2YXJpYWJsZSBmcm9tIGEgbGV0LSBvcGVyYXRpb24sIGV0YyksIHRoZW4gaXQncyBwb3NzaWJsZSBmb3Igb3BlcmF0aW9uc1xuICogZWFybGllciBpbiB0aGUgc2VxdWVuY2UgdG8gZGVwZW5kIG9uIG9wZXJhdGlvbnMgd2hpY2ggb2NjdXIgbGF0ZXIgaW4gdGhlIHNlcXVlbmNlLlxuICpcbiAqIGBUY2JPcGAgYWJzdHJhY3RzIHRoZSBkaWZmZXJlbnQgdHlwZXMgb2Ygb3BlcmF0aW9ucyB3aGljaCBhcmUgcmVxdWlyZWQgdG8gY29udmVydCBhIHRlbXBsYXRlIGludG9cbiAqIGEgVENCLiBUaGlzIGFsbG93cyBmb3IgdHdvIHBoYXNlcyBvZiBwcm9jZXNzaW5nIGZvciB0aGUgdGVtcGxhdGUsIHdoZXJlIDEpIGEgbGluZWFyIHNlcXVlbmNlIG9mXG4gKiBgVGNiT3BgcyBpcyBnZW5lcmF0ZWQsIGFuZCB0aGVuIDIpIHRoZXNlIG9wZXJhdGlvbnMgYXJlIGV4ZWN1dGVkLCBub3QgbmVjZXNzYXJpbHkgaW4gbGluZWFyXG4gKiBvcmRlci5cbiAqXG4gKiBFYWNoIGBUY2JPcGAgbWF5IGluc2VydCBzdGF0ZW1lbnRzIGludG8gdGhlIGJvZHkgb2YgdGhlIFRDQiwgYW5kIGFsc28gb3B0aW9uYWxseSByZXR1cm4gYVxuICogYHRzLkV4cHJlc3Npb25gIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHJlZmVyZW5jZSB0aGUgb3BlcmF0aW9uJ3MgcmVzdWx0LlxuICovXG5hYnN0cmFjdCBjbGFzcyBUY2JPcCB7XG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBpZiB0aGlzIG9wZXJhdGlvbiBjYW4gYmUgY29uc2lkZXJlZCBvcHRpb25hbC4gT3B0aW9uYWwgb3BlcmF0aW9ucyBhcmUgb25seSBleGVjdXRlZFxuICAgKiB3aGVuIGRlcGVuZGVkIHVwb24gYnkgb3RoZXIgb3BlcmF0aW9ucywgb3RoZXJ3aXNlIHRoZXkgYXJlIGRpc3JlZ2FyZGVkLiBUaGlzIGFsbG93cyBmb3IgbGVzc1xuICAgKiBjb2RlIHRvIGdlbmVyYXRlLCBwYXJzZSBhbmQgdHlwZS1jaGVjaywgb3ZlcmFsbCBwb3NpdGl2ZWx5IGNvbnRyaWJ1dGluZyB0byBwZXJmb3JtYW5jZS5cbiAgICovXG4gIGFic3RyYWN0IHJlYWRvbmx5IG9wdGlvbmFsOiBib29sZWFuO1xuXG4gIGFic3RyYWN0IGV4ZWN1dGUoKTogdHMuRXhwcmVzc2lvbnxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXBsYWNlbWVudCB2YWx1ZSBvciBvcGVyYXRpb24gdXNlZCB3aGlsZSB0aGlzIGBUY2JPcGAgaXMgZXhlY3V0aW5nIChpLmUuIHRvIHJlc29sdmUgY2lyY3VsYXJcbiAgICogcmVmZXJlbmNlcyBkdXJpbmcgaXRzIGV4ZWN1dGlvbikuXG4gICAqXG4gICAqIFRoaXMgaXMgdXN1YWxseSBhIGBudWxsIWAgZXhwcmVzc2lvbiAod2hpY2ggYXNrcyBUUyB0byBpbmZlciBhbiBhcHByb3ByaWF0ZSB0eXBlKSwgYnV0IGFub3RoZXJcbiAgICogYFRjYk9wYCBjYW4gYmUgcmV0dXJuZWQgaW4gY2FzZXMgd2hlcmUgYWRkaXRpb25hbCBjb2RlIGdlbmVyYXRpb24gaXMgbmVjZXNzYXJ5IHRvIGRlYWwgd2l0aFxuICAgKiBjaXJjdWxhciByZWZlcmVuY2VzLlxuICAgKi9cbiAgY2lyY3VsYXJGYWxsYmFjaygpOiBUY2JPcHx0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUjtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIGEgbmF0aXZlIERPTSBlbGVtZW50IChvciB3ZWIgY29tcG9uZW50KSBmcm9tIGFcbiAqIGBUbXBsQXN0RWxlbWVudGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGVsZW1lbnQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYkVsZW1lbnRPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgZm9yIHR5cGUtaW5mZXJlbmNlIG9mIHRoZSBET01cbiAgICAvLyBlbGVtZW50J3MgdHlwZSBhbmQgd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWxcbiAgICAvLyB0byBhdm9pZCBnZW5lcmF0aW5nIHN0YXRlbWVudHMgZm9yIERPTSBlbGVtZW50cyB0aGF0IGFyZSBuZXZlciByZWZlcmVuY2VkLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAvLyBBZGQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBlbGVtZW50IHVzaW5nIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQuXG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0c0NyZWF0ZUVsZW1lbnQodGhpcy5lbGVtZW50Lm5hbWUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMuZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5lbGVtZW50LnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNyZWF0ZXMgYW4gZXhwcmVzc2lvbiBmb3IgcGFydGljdWxhciBsZXQtIGBUbXBsQXN0VmFyaWFibGVgIG9uIGFcbiAqIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY29udGV4dC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgdmFyaWFibGUgdmFyaWFibGUgKGxvbCkuXG4gKi9cbmNsYXNzIFRjYlZhcmlhYmxlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUsXG4gICAgICBwcml2YXRlIHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gTG9vayBmb3IgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuXG4gICAgLy8gQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIFRtcGxBc3RWYXJpYWJsZSwgYW5kIGluaXRpYWxpemUgaXQgdG8gYSByZWFkIG9mIHRoZSB2YXJpYWJsZVxuICAgIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjb250ZXh0LlxuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgIC8qIGV4cHJlc3Npb24gKi8gY3R4LFxuICAgICAgICAvKiBuYW1lICovIHRoaXMudmFyaWFibGUudmFsdWUgfHwgJyRpbXBsaWNpdCcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMudmFyaWFibGUuc291cmNlU3Bhbik7XG5cbiAgICAvLyBEZWNsYXJlIHRoZSB2YXJpYWJsZSwgYW5kIHJldHVybiBpdHMgaWRlbnRpZmllci5cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgYSB2YXJpYWJsZSBmb3IgYSBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHRlbXBsYXRlJ3MgY29udGV4dCB2YXJpYWJsZS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVDb250ZXh0T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvLyBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIGNvbnRleHQgdmFyaWFibGUgaXMgb25seSBuZWVkZWQgd2hlbiB0aGUgY29udGV4dCBpcyBhY3R1YWxseSByZWZlcmVuY2VkLlxuICByZWFkb25seSBvcHRpb25hbCA9IHRydWU7XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICAvLyBBbGxvY2F0ZSBhIHRlbXBsYXRlIGN0eCB2YXJpYWJsZSBhbmQgZGVjbGFyZSBpdCB3aXRoIGFuICdhbnknIHR5cGUuIFRoZSB0eXBlIG9mIHRoaXMgdmFyaWFibGVcbiAgICAvLyBtYXkgYmUgbmFycm93ZWQgYXMgYSByZXN1bHQgb2YgdGVtcGxhdGUgZ3VhcmQgY29uZGl0aW9ucy5cbiAgICBjb25zdCBjdHggPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGN0eCwgdHlwZSkpO1xuICAgIHJldHVybiBjdHg7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZGVzY2VuZHMgaW50byBhIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY2hpbGRyZW4gYW5kIGdlbmVyYXRlcyB0eXBlLWNoZWNraW5nIGNvZGUgZm9yXG4gKiB0aGVtLlxuICpcbiAqIFRoaXMgb3BlcmF0aW9uIHdyYXBzIHRoZSBjaGlsZHJlbidzIHR5cGUtY2hlY2tpbmcgY29kZSBpbiBhbiBgaWZgIGJsb2NrLCB3aGljaCBtYXkgaW5jbHVkZSBvbmVcbiAqIG9yIG1vcmUgdHlwZSBndWFyZCBjb25kaXRpb25zIHRoYXQgbmFycm93IHR5cGVzIHdpdGhpbiB0aGUgdGVtcGxhdGUgYm9keS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVCb2R5T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIC8vIEFuIGBpZmAgd2lsbCBiZSBjb25zdHJ1Y3RlZCwgd2l0aGluIHdoaWNoIHRoZSB0ZW1wbGF0ZSdzIGNoaWxkcmVuIHdpbGwgYmUgdHlwZSBjaGVja2VkLiBUaGVcbiAgICAvLyBgaWZgIGlzIHVzZWQgZm9yIHR3byByZWFzb25zOiBpdCBjcmVhdGVzIGEgbmV3IHN5bnRhY3RpYyBzY29wZSwgaXNvbGF0aW5nIHZhcmlhYmxlcyBkZWNsYXJlZFxuICAgIC8vIGluIHRoZSB0ZW1wbGF0ZSdzIFRDQiBmcm9tIHRoZSBvdXRlciBjb250ZXh0LCBhbmQgaXQgYWxsb3dzIGFueSBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZXNcbiAgICAvLyB0byBwZXJmb3JtIHR5cGUgbmFycm93aW5nIG9mIGVpdGhlciBleHByZXNzaW9ucyBvciB0aGUgdGVtcGxhdGUncyBjb250ZXh0LlxuICAgIC8vXG4gICAgLy8gVGhlIGd1YXJkIGlzIHRoZSBgaWZgIGJsb2NrJ3MgY29uZGl0aW9uLiBJdCdzIHVzdWFsbHkgc2V0IHRvIGB0cnVlYCBidXQgZGlyZWN0aXZlcyB0aGF0IGV4aXN0XG4gICAgLy8gb24gdGhlIHRlbXBsYXRlIGNhbiB0cmlnZ2VyIGV4dHJhIGd1YXJkIGV4cHJlc3Npb25zIHRoYXQgc2VydmUgdG8gbmFycm93IHR5cGVzIHdpdGhpbiB0aGVcbiAgICAvLyBgaWZgLiBgZ3VhcmRgIGlzIGNhbGN1bGF0ZWQgYnkgc3RhcnRpbmcgd2l0aCBgdHJ1ZWAgYW5kIGFkZGluZyBvdGhlciBjb25kaXRpb25zIGFzIG5lZWRlZC5cbiAgICAvLyBDb2xsZWN0IHRoZXNlIGludG8gYGd1YXJkc2AgYnkgcHJvY2Vzc2luZyB0aGUgZGlyZWN0aXZlcy5cbiAgICBjb25zdCBkaXJlY3RpdmVHdWFyZHM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUodGhpcy50ZW1wbGF0ZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgZGlySW5zdElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUsIGRpcik7XG4gICAgICAgIGNvbnN0IGRpcklkID1cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2UoZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuXG4gICAgICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ3VhcmRzLiBUZW1wbGF0ZSBndWFyZHMgKG5nVGVtcGxhdGVHdWFyZHMpIGFsbG93IHR5cGUgbmFycm93aW5nIG9mXG4gICAgICAgIC8vIHRoZSBleHByZXNzaW9uIHBhc3NlZCB0byBhbiBASW5wdXQgb2YgdGhlIGRpcmVjdGl2ZS4gU2NhbiB0aGUgZGlyZWN0aXZlIHRvIHNlZSBpZiBpdCBoYXNcbiAgICAgICAgLy8gYW55IHRlbXBsYXRlIGd1YXJkcywgYW5kIGdlbmVyYXRlIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgICBkaXIubmdUZW1wbGF0ZUd1YXJkcy5mb3JFYWNoKGd1YXJkID0+IHtcbiAgICAgICAgICAvLyBGb3IgZWFjaCB0ZW1wbGF0ZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlLCBsb29rIGZvciBhIGJpbmRpbmcgdG8gdGhhdCBpbnB1dC5cbiAgICAgICAgICBjb25zdCBib3VuZElucHV0ID0gdGhpcy50ZW1wbGF0ZS5pbnB1dHMuZmluZChpID0+IGkubmFtZSA9PT0gZ3VhcmQuaW5wdXROYW1lKSB8fFxuICAgICAgICAgICAgICB0aGlzLnRlbXBsYXRlLnRlbXBsYXRlQXR0cnMuZmluZChcbiAgICAgICAgICAgICAgICAgIChpOiBUbXBsQXN0VGV4dEF0dHJpYnV0ZXxUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpOiBpIGlzIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSA9PlxuICAgICAgICAgICAgICAgICAgICAgIGkgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgaS5uYW1lID09PSBndWFyZC5pbnB1dE5hbWUpO1xuICAgICAgICAgIGlmIChib3VuZElucHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIHN1Y2ggYSBiaW5kaW5nLCBnZW5lcmF0ZSBhbiBleHByZXNzaW9uIGZvciBpdC5cbiAgICAgICAgICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJvdW5kSW5wdXQudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcblxuICAgICAgICAgICAgLy8gVGhlIGV4cHJlc3Npb24gaGFzIGFscmVhZHkgYmVlbiBjaGVja2VkIGluIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGludm9jYXRpb24sIHNvXG4gICAgICAgICAgICAvLyBpdCBzaG91bGQgYmUgaWdub3JlZCB3aGVuIHVzZWQgd2l0aGluIGEgdGVtcGxhdGUgZ3VhcmQuXG4gICAgICAgICAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3MoZXhwcik7XG5cbiAgICAgICAgICAgIGlmIChndWFyZC50eXBlID09PSAnYmluZGluZycpIHtcbiAgICAgICAgICAgICAgLy8gVXNlIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24gaXRzZWxmIGFzIGd1YXJkLlxuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIENhbGwgdGhlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUgd2l0aCB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGFuZCB0aGF0XG4gICAgICAgICAgICAgIC8vIGV4cHJlc3Npb24uXG4gICAgICAgICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCBgbmdUZW1wbGF0ZUd1YXJkXyR7Z3VhcmQuaW5wdXROYW1lfWAsIFtcbiAgICAgICAgICAgICAgICBkaXJJbnN0SWQsXG4gICAgICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8oZ3VhcmRJbnZva2UsIGJvdW5kSW5wdXQudmFsdWUuc291cmNlU3Bhbik7XG4gICAgICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRoZSBzZWNvbmQga2luZCBvZiBndWFyZCBpcyBhIHRlbXBsYXRlIGNvbnRleHQgZ3VhcmQuIFRoaXMgZ3VhcmQgbmFycm93cyB0aGUgdGVtcGxhdGVcbiAgICAgICAgLy8gcmVuZGVyaW5nIGNvbnRleHQgdmFyaWFibGUgYGN0eGAuXG4gICAgICAgIGlmIChkaXIuaGFzTmdUZW1wbGF0ZUNvbnRleHRHdWFyZCAmJiB0aGlzLnRjYi5lbnYuY29uZmlnLmFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzKSB7XG4gICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCAnbmdUZW1wbGF0ZUNvbnRleHRHdWFyZCcsIFtkaXJJbnN0SWQsIGN0eF0pO1xuICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8oZ3VhcmRJbnZva2UsIHRoaXMudGVtcGxhdGUuc291cmNlU3Bhbik7XG4gICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQnkgZGVmYXVsdCB0aGUgZ3VhcmQgaXMgc2ltcGx5IGB0cnVlYC5cbiAgICBsZXQgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGd1YXJkcyBmcm9tIGRpcmVjdGl2ZXMsIHVzZSB0aGVtIGluc3RlYWQuXG4gICAgaWYgKGRpcmVjdGl2ZUd1YXJkcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBQb3AgdGhlIGZpcnN0IHZhbHVlIGFuZCB1c2UgaXQgYXMgdGhlIGluaXRpYWxpemVyIHRvIHJlZHVjZSgpLiBUaGlzIHdheSwgYSBzaW5nbGUgZ3VhcmRcbiAgICAgIC8vIHdpbGwgYmUgdXNlZCBvbiBpdHMgb3duLCBidXQgdHdvIG9yIG1vcmUgd2lsbCBiZSBjb21iaW5lZCBpbnRvIGJpbmFyeSBBTkQgZXhwcmVzc2lvbnMuXG4gICAgICBndWFyZCA9IGRpcmVjdGl2ZUd1YXJkcy5yZWR1Y2UoXG4gICAgICAgICAgKGV4cHIsIGRpckd1YXJkKSA9PlxuICAgICAgICAgICAgICB0cy5jcmVhdGVCaW5hcnkoZXhwciwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgZGlyR3VhcmQpLFxuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wb3AoKSEpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBTY29wZSBmb3IgdGhlIHRlbXBsYXRlLiBUaGlzIGNvbnN0cnVjdHMgdGhlIGxpc3Qgb2Ygb3BlcmF0aW9ucyBmb3IgdGhlIHRlbXBsYXRlXG4gICAgLy8gY2hpbGRyZW4sIGFzIHdlbGwgYXMgdHJhY2tzIGJpbmRpbmdzIHdpdGhpbiB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgdG1wbFNjb3BlID0gU2NvcGUuZm9yTm9kZXModGhpcy50Y2IsIHRoaXMuc2NvcGUsIHRoaXMudGVtcGxhdGUsIGd1YXJkKTtcblxuICAgIC8vIFJlbmRlciB0aGUgdGVtcGxhdGUncyBgU2NvcGVgIGludG8gaXRzIHN0YXRlbWVudHMuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHRtcGxTY29wZS5yZW5kZXIoKTtcbiAgICBpZiAoc3RhdGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIEFzIGFuIG9wdGltaXphdGlvbiwgZG9uJ3QgZ2VuZXJhdGUgdGhlIHNjb3BlJ3MgYmxvY2sgaWYgaXQgaGFzIG5vIHN0YXRlbWVudHMuIFRoaXMgaXNcbiAgICAgIC8vIGJlbmVmaWNpYWwgZm9yIHRlbXBsYXRlcyB0aGF0IGNvbnRhaW4gZm9yIGV4YW1wbGUgYDxzcGFuICpuZ0lmPVwiZmlyc3RcIj48L3NwYW4+YCwgaW4gd2hpY2hcbiAgICAgIC8vIGNhc2UgdGhlcmUncyBubyBuZWVkIHRvIHJlbmRlciB0aGUgYE5nSWZgIGd1YXJkIGV4cHJlc3Npb24uIFRoaXMgc2VlbXMgbGlrZSBhIG1pbm9yXG4gICAgICAvLyBpbXByb3ZlbWVudCwgaG93ZXZlciBpdCByZWR1Y2VzIHRoZSBudW1iZXIgb2YgZmxvdy1ub2RlIGFudGVjZWRlbnRzIHRoYXQgVHlwZVNjcmlwdCBuZWVkc1xuICAgICAgLy8gdG8ga2VlcCBpbnRvIGFjY291bnQgZm9yIHN1Y2ggY2FzZXMsIHJlc3VsdGluZyBpbiBhbiBvdmVyYWxsIHJlZHVjdGlvbiBvZlxuICAgICAgLy8gdHlwZS1jaGVja2luZyB0aW1lLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHRtcGxCbG9jazogdHMuU3RhdGVtZW50ID0gdHMuY3JlYXRlQmxvY2soc3RhdGVtZW50cyk7XG4gICAgaWYgKGd1YXJkICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGUgc2NvcGUgaGFzIGEgZ3VhcmQgdGhhdCBuZWVkcyB0byBiZSBhcHBsaWVkLCBzbyB3cmFwIHRoZSB0ZW1wbGF0ZSBibG9jayBpbnRvIGFuIGBpZmBcbiAgICAgIC8vIHN0YXRlbWVudCBjb250YWluaW5nIHRoZSBndWFyZCBleHByZXNzaW9uLlxuICAgICAgdG1wbEJsb2NrID0gdHMuY3JlYXRlSWYoLyogZXhwcmVzc2lvbiAqLyBndWFyZCwgLyogdGhlblN0YXRlbWVudCAqLyB0bXBsQmxvY2spO1xuICAgIH1cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0bXBsQmxvY2spO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggcmVuZGVycyBhIHRleHQgYmluZGluZyAoaW50ZXJwb2xhdGlvbikgaW50byB0aGUgVENCLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlRleHRJbnRlcnBvbGF0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBiaW5kaW5nOiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKHRoaXMuYmluZGluZy52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUgX3dpdGhvdXRfIHNldHRpbmcgYW55IG9mIGl0cyBpbnB1dHMuIElucHV0c1xuICogYXJlIGxhdGVyIHNldCBpbiB0aGUgYFRjYkRpcmVjdGl2ZUlucHV0c09wYC4gVHlwZSBjaGVja2luZyB3YXMgZm91bmQgdG8gYmUgZmFzdGVyIHdoZW4gZG9uZSBpblxuICogdGhpcyB3YXkgYXMgb3Bwb3NlZCB0byBgVGNiRGlyZWN0aXZlQ3Rvck9wYCB3aGljaCBpcyBvbmx5IG5lY2Vzc2FyeSB3aGVuIHRoZSBkaXJlY3RpdmUgaXNcbiAqIGdlbmVyaWMuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB2YXJpYWJsZSB3aXRoIGl0cyBpbmZlcnJlZFxuICogdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlVHlwZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgZ2VuZXJhdGVkIGJ5IHRoaXMgb3BlcmF0aW9uIGlzIG9ubHkgdXNlZCB0byBkZWNsYXJlIHRoZSBkaXJlY3RpdmUncyB0eXBlIGFuZFxuICAgIC8vIHdvbid0IHJlcG9ydCBkaWFnbm9zdGljcyBieSBpdHNlbGYsIHNvIHRoZSBvcGVyYXRpb24gaXMgbWFya2VkIGFzIG9wdGlvbmFsIHRvIGF2b2lkXG4gICAgLy8gZ2VuZXJhdGluZyBkZWNsYXJhdGlvbnMgZm9yIGRpcmVjdGl2ZXMgdGhhdCBkb24ndCBoYXZlIGFueSBpbnB1dHMvb3V0cHV0cy5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG5cbiAgICBjb25zdCB0eXBlID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICBhZGRFeHByZXNzaW9uSWRlbnRpZmllcih0eXBlLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8odHlwZSwgdGhpcy5ub2RlLnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhIHZhcmlhYmxlIGZvciBhIGxvY2FsIHJlZiBpbiBhIHRlbXBsYXRlLlxuICogVGhlIGluaXRpYWxpemVyIGZvciB0aGUgdmFyaWFibGUgaXMgdGhlIHZhcmlhYmxlIGV4cHJlc3Npb24gZm9yIHRoZSBkaXJlY3RpdmUsIHRlbXBsYXRlLCBvclxuICogZWxlbWVudCB0aGUgcmVmIHJlZmVycyB0by4gV2hlbiB0aGUgcmVmZXJlbmNlIGlzIHVzZWQgaW4gdGhlIHRlbXBsYXRlLCB0aG9zZSBUQ0Igc3RhdGVtZW50cyB3aWxsXG4gKiBhY2Nlc3MgdGhpcyB2YXJpYWJsZSBhcyB3ZWxsLiBGb3IgZXhhbXBsZTpcbiAqIGBgYFxuICogdmFyIF90MSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICogdmFyIF90MiA9IF90MTtcbiAqIF90Mi52YWx1ZVxuICogYGBgXG4gKiBUaGlzIG9wZXJhdGlvbiBzdXBwb3J0cyBtb3JlIGZsdWVudCBsb29rdXBzIGZvciB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIHdoZW4gZ2V0dGluZyBhIHN5bWJvbFxuICogZm9yIGEgcmVmZXJlbmNlLiBJbiBtb3N0IGNhc2VzLCB0aGlzIGlzbid0IGVzc2VudGlhbDsgdGhhdCBpcywgdGhlIGluZm9ybWF0aW9uIGZvciB0aGUgc3ltYm9sXG4gKiBjb3VsZCBiZSBnYXRoZXJlZCB3aXRob3V0IHRoaXMgb3BlcmF0aW9uIHVzaW5nIHRoZSBgQm91bmRUYXJnZXRgLiBIb3dldmVyLCBmb3IgdGhlIGNhc2Ugb2ZcbiAqIG5nLXRlbXBsYXRlIHJlZmVyZW5jZXMsIHdlIHdpbGwgbmVlZCB0aGlzIHJlZmVyZW5jZSB2YXJpYWJsZSB0byBub3Qgb25seSBwcm92aWRlIGEgbG9jYXRpb24gaW5cbiAqIHRoZSBzaGltIGZpbGUsIGJ1dCBhbHNvIHRvIG5hcnJvdyB0aGUgdmFyaWFibGUgdG8gdGhlIGNvcnJlY3QgYFRlbXBsYXRlUmVmPFQ+YCB0eXBlIHJhdGhlciB0aGFuXG4gKiBgVGVtcGxhdGVSZWY8YW55PmAgKHRoaXMgd29yayBpcyBzdGlsbCBUT0RPKS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JSZWZlcmVuY2VPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRjYjogQ29udGV4dCwgcHJpdmF0ZSByZWFkb25seSBzY29wZTogU2NvcGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IFRtcGxBc3RSZWZlcmVuY2UsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIHRvIGZvciB0aGUgVHlwZSBDaGVja2VyXG4gIC8vIHNvIGl0IGNhbiBtYXAgYSByZWZlcmVuY2UgdmFyaWFibGUgaW4gdGhlIHRlbXBsYXRlIGRpcmVjdGx5IHRvIGEgbm9kZSBpbiB0aGUgVENCLlxuICByZWFkb25seSBvcHRpb25hbCA9IHRydWU7XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBsZXQgaW5pdGlhbGl6ZXIgPVxuICAgICAgICB0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ID9cbiAgICAgICAgdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGFyZ2V0KSA6XG4gICAgICAgIHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmhvc3QsIHRoaXMudGFyZ2V0KTtcblxuICAgIC8vIFRoZSByZWZlcmVuY2UgaXMgZWl0aGVyIHRvIGFuIGVsZW1lbnQsIGFuIDxuZy10ZW1wbGF0ZT4gbm9kZSwgb3IgdG8gYSBkaXJlY3RpdmUgb24gYW5cbiAgICAvLyBlbGVtZW50IG9yIHRlbXBsYXRlLlxuICAgIGlmICgodGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCAmJiAhdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMpIHx8XG4gICAgICAgICF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlcykge1xuICAgICAgLy8gUmVmZXJlbmNlcyB0byBET00gbm9kZXMgYXJlIHBpbm5lZCB0byAnYW55JyB3aGVuIGBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXNgIGlzIGBmYWxzZWAuXG4gICAgICAvLyBSZWZlcmVuY2VzIHRvIGBUZW1wbGF0ZVJlZmBzIGFuZCBkaXJlY3RpdmVzIGFyZSBwaW5uZWQgdG8gJ2FueScgd2hlblxuICAgICAgLy8gYGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlc2AgaXMgYGZhbHNlYC5cbiAgICAgIGluaXRpYWxpemVyID1cbiAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24oaW5pdGlhbGl6ZXIsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBEaXJlY3QgcmVmZXJlbmNlcyB0byBhbiA8bmctdGVtcGxhdGU+IG5vZGUgc2ltcGx5IHJlcXVpcmUgYSB2YWx1ZSBvZiB0eXBlXG4gICAgICAvLyBgVGVtcGxhdGVSZWY8YW55PmAuIFRvIGdldCB0aGlzLCBhbiBleHByZXNzaW9uIG9mIHRoZSBmb3JtXG4gICAgICAvLyBgKF90MSBhcyBhbnkgYXMgVGVtcGxhdGVSZWY8YW55PilgIGlzIGNvbnN0cnVjdGVkLlxuICAgICAgaW5pdGlhbGl6ZXIgPVxuICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihpbml0aWFsaXplciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVBc0V4cHJlc3Npb24oXG4gICAgICAgICAgaW5pdGlhbGl6ZXIsXG4gICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZUV4dGVybmFsVHlwZSgnQGFuZ3VsYXIvY29yZScsICdUZW1wbGF0ZVJlZicsIFtEWU5BTUlDX1RZUEVdKSk7XG4gICAgICBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVBhcmVuKGluaXRpYWxpemVyKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpbml0aWFsaXplciwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuXG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiBhIGRpcmVjdGl2ZSB3aXRoIHR5cGVzIGluZmVycmVkIGZyb20gaXRzIGlucHV0cy4gVGhlXG4gKiBpbnB1dHMgdGhlbXNlbHZlcyBhcmUgbm90IGNoZWNrZWQgaGVyZTsgY2hlY2tpbmcgb2YgaW5wdXRzIGlzIGFjaGlldmVkIGluIGBUY2JEaXJlY3RpdmVJbnB1dHNPcGAuXG4gKiBBbnkgZXJyb3JzIHJlcG9ydGVkIGluIHRoaXMgc3RhdGVtZW50IGFyZSBpZ25vcmVkLCBhcyB0aGUgdHlwZSBjb25zdHJ1Y3RvciBjYWxsIGlzIG9ubHkgcHJlc2VudFxuICogZm9yIHR5cGUtaW5mZXJlbmNlLlxuICpcbiAqIFdoZW4gYSBEaXJlY3RpdmUgaXMgZ2VuZXJpYywgaXQgaXMgcmVxdWlyZWQgdGhhdCB0aGUgVENCIGdlbmVyYXRlcyB0aGUgaW5zdGFuY2UgdXNpbmcgdGhpcyBtZXRob2RcbiAqIGluIG9yZGVyIHRvIGluZmVyIHRoZSB0eXBlIGluZm9ybWF0aW9uIGNvcnJlY3RseS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVDdG9yT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIHRvIGluZmVyIHRoZSBkaXJlY3RpdmUncyB0eXBlIGFuZFxuICAgIC8vIHdvbid0IHJlcG9ydCBkaWFnbm9zdGljcyBieSBpdHNlbGYsIHNvIHRoZSBvcGVyYXRpb24gaXMgbWFya2VkIGFzIG9wdGlvbmFsLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBhZGRFeHByZXNzaW9uSWRlbnRpZmllcihpZCwgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGlkLCB0aGlzLm5vZGUuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMubm9kZS5zb3VyY2VTcGFuKTtcblxuICAgIGNvbnN0IGdlbmVyaWNJbnB1dHMgPSBuZXcgTWFwPHN0cmluZywgVGNiRGlyZWN0aXZlSW5wdXQ+KCk7XG5cbiAgICBjb25zdCBpbnB1dHMgPSBnZXRCb3VuZElucHV0cyh0aGlzLmRpciwgdGhpcy5ub2RlLCB0aGlzLnRjYik7XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBpbnB1dHMpIHtcbiAgICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIGlucHV0LmZpZWxkTmFtZXMpIHtcbiAgICAgICAgLy8gU2tpcCB0aGUgZmllbGQgaWYgYW4gYXR0cmlidXRlIGhhcyBhbHJlYWR5IGJlZW4gYm91bmQgdG8gaXQ7IHdlIGNhbid0IGhhdmUgYSBkdXBsaWNhdGVcbiAgICAgICAgLy8ga2V5IGluIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGNhbGwuXG4gICAgICAgIGlmIChnZW5lcmljSW5wdXRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdHJhbnNsYXRlSW5wdXQoaW5wdXQuYXR0cmlidXRlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICAgIGdlbmVyaWNJbnB1dHMuc2V0KGZpZWxkTmFtZSwge1xuICAgICAgICAgIHR5cGU6ICdiaW5kaW5nJyxcbiAgICAgICAgICBmaWVsZDogZmllbGROYW1lLFxuICAgICAgICAgIGV4cHJlc3Npb24sXG4gICAgICAgICAgc291cmNlU3BhbjogaW5wdXQuYXR0cmlidXRlLnNvdXJjZVNwYW5cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIHVuc2V0IGRpcmVjdGl2ZSBpbnB1dHMgZm9yIGVhY2ggb2YgdGhlIHJlbWFpbmluZyB1bnNldCBmaWVsZHMuXG4gICAgZm9yIChjb25zdCBbZmllbGROYW1lXSBvZiB0aGlzLmRpci5pbnB1dHMpIHtcbiAgICAgIGlmICghZ2VuZXJpY0lucHV0cy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICBnZW5lcmljSW5wdXRzLnNldChmaWVsZE5hbWUsIHt0eXBlOiAndW5zZXQnLCBmaWVsZDogZmllbGROYW1lfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiB0aGUgZGlyZWN0aXZlIHRvIGluZmVyIGEgdHlwZSwgYW5kIGFzc2lnbiB0aGUgZGlyZWN0aXZlXG4gICAgLy8gaW5zdGFuY2UuXG4gICAgY29uc3QgdHlwZUN0b3IgPSB0Y2JDYWxsVHlwZUN0b3IodGhpcy5kaXIsIHRoaXMudGNiLCBBcnJheS5mcm9tKGdlbmVyaWNJbnB1dHMudmFsdWVzKCkpKTtcbiAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3ModHlwZUN0b3IpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIHR5cGVDdG9yKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgY2lyY3VsYXJGYWxsYmFjaygpOiBUY2JPcCB7XG4gICAgcmV0dXJuIG5ldyBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wKHRoaXMudGNiLCB0aGlzLnNjb3BlLCB0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBpbnB1dCBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHRoYXQgY29ycmVzcG9uZCB3aXRoIHRoZVxuICogbWVtYmVycyBvZiBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVJbnB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGxldCBkaXJJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIFRPRE8oam9vc3QpOiByZXBvcnQgZHVwbGljYXRlIHByb3BlcnRpZXNcblxuICAgIGNvbnN0IGlucHV0cyA9IGdldEJvdW5kSW5wdXRzKHRoaXMuZGlyLCB0aGlzLm5vZGUsIHRoaXMudGNiKTtcbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIGlucHV0cykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IHRyYW5zbGF0ZUlucHV0KGlucHV0LmF0dHJpYnV0ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBudWxsIGNoZWNrcyBhcmUgZGlzYWJsZWQsIGVyYXNlIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgZnJvbSB0aGUgdHlwZSBieVxuICAgICAgICAvLyB3cmFwcGluZyB0aGUgZXhwcmVzc2lvbiBpbiBhIG5vbi1udWxsIGFzc2VydGlvbi5cbiAgICAgICAgZXhwciA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgYXNzaWdubWVudDogdHMuRXhwcmVzc2lvbiA9IHdyYXBGb3JEaWFnbm9zdGljcyhleHByKTtcblxuICAgICAgZm9yIChjb25zdCBmaWVsZE5hbWUgb2YgaW5wdXQuZmllbGROYW1lcykge1xuICAgICAgICBsZXQgdGFyZ2V0OiB0cy5MZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICBpZiAodGhpcy5kaXIuY29lcmNlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGlucHV0IGhhcyBhIGNvZXJjaW9uIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSB1c2VkIGluc3RlYWQgb2YgYXNzaWduaW5nIHRoZVxuICAgICAgICAgIC8vIGV4cHJlc3Npb24gaW50byB0aGUgaW5wdXQgZmllbGQgZGlyZWN0bHkuIFRvIGFjaGlldmUgdGhpcywgYSB2YXJpYWJsZSBpcyBkZWNsYXJlZFxuICAgICAgICAgIC8vIHdpdGggYSB0eXBlIG9mIGB0eXBlb2YgRGlyZWN0aXZlLm5nQWNjZXB0SW5wdXRUeXBlX2ZpZWxkTmFtZWAgd2hpY2ggaXMgdGhlbiB1c2VkIGFzXG4gICAgICAgICAgLy8gdGFyZ2V0IG9mIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICAgIGNvbnN0IGRpclR5cGVSZWYgPSB0aGlzLnRjYi5lbnYucmVmZXJlbmNlVHlwZSh0aGlzLmRpci5yZWYpO1xuICAgICAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkaXJUeXBlUmVmKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke3RoaXMuZGlyLnJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHRzQ3JlYXRlVHlwZVF1ZXJ5Rm9yQ29lcmNlZElucHV0KGRpclR5cGVSZWYudHlwZU5hbWUsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpKTtcblxuICAgICAgICAgIHRhcmdldCA9IGlkO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZGlyLnVuZGVjbGFyZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIElmIG5vIGNvZXJjaW9uIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQgbm9yIGlzIHRoZSBmaWVsZCBkZWNsYXJlZCAoaS5lLiB0aGUgaW5wdXQgaXNcbiAgICAgICAgICAvLyBkZWNsYXJlZCBpbiBhIGBARGlyZWN0aXZlYCBvciBgQENvbXBvbmVudGAgZGVjb3JhdG9yJ3MgYGlucHV0c2AgcHJvcGVydHkpIHRoZXJlIGlzIG5vXG4gICAgICAgICAgLy8gYXNzaWdubWVudCB0YXJnZXQgYXZhaWxhYmxlLCBzbyB0aGlzIGZpZWxkIGlzIHNraXBwZWQuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAhdGhpcy50Y2IuZW52LmNvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgJiZcbiAgICAgICAgICAgIHRoaXMuZGlyLnJlc3RyaWN0ZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBhY2Nlc3MgbW9kaWZpZXJzIGlzIGRpc2FibGVkIGFuZCB0aGUgZmllbGQgaXMgcmVzdHJpY3RlZFxuICAgICAgICAgIC8vIChpLmUuIHByaXZhdGUvcHJvdGVjdGVkL3JlYWRvbmx5KSwgZ2VuZXJhdGUgYW4gYXNzaWdubWVudCBpbnRvIGEgdGVtcG9yYXJ5IHZhcmlhYmxlXG4gICAgICAgICAgLy8gdGhhdCBoYXMgdGhlIHR5cGUgb2YgdGhlIGZpZWxkLiBUaGlzIGFjaGlldmVzIHR5cGUtY2hlY2tpbmcgYnV0IGNpcmN1bXZlbnRzIHRoZSBhY2Nlc3NcbiAgICAgICAgICAvLyBtb2RpZmllcnMuXG4gICAgICAgICAgaWYgKGRpcklkID09PSBudWxsKSB7XG4gICAgICAgICAgICBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAgICAgICBjb25zdCBkaXJUeXBlUmVmID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICAgICAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGlyVHlwZVJlZikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgZnJvbSByZWZlcmVuY2UgdG8gJHt0aGlzLmRpci5yZWYuZGVidWdOYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB0eXBlID0gdHMuY3JlYXRlSW5kZXhlZEFjY2Vzc1R5cGVOb2RlKFxuICAgICAgICAgICAgICB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKGRpcklkIGFzIHRzLklkZW50aWZpZXIpLFxuICAgICAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZE5hbWUpKSk7XG4gICAgICAgICAgY29uc3QgdGVtcCA9IHRzRGVjbGFyZVZhcmlhYmxlKGlkLCB0eXBlKTtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0ZW1wKTtcbiAgICAgICAgICB0YXJnZXQgPSBpZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZGlySWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRpcklkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRvIGdldCBlcnJvcnMgYXNzaWduIGRpcmVjdGx5IHRvIHRoZSBmaWVsZHMgb24gdGhlIGluc3RhbmNlLCB1c2luZyBwcm9wZXJ0eSBhY2Nlc3NcbiAgICAgICAgICAvLyB3aGVuIHBvc3NpYmxlLiBTdHJpbmcgbGl0ZXJhbCBmaWVsZHMgbWF5IG5vdCBiZSB2YWxpZCBKUyBpZGVudGlmaWVycyBzbyB3ZSB1c2VcbiAgICAgICAgICAvLyBsaXRlcmFsIGVsZW1lbnQgYWNjZXNzIGluc3RlYWQgZm9yIHRob3NlIGNhc2VzLlxuICAgICAgICAgIHRhcmdldCA9IHRoaXMuZGlyLnN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSA/XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGROYW1lKSkgOlxuICAgICAgICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlSWRlbnRpZmllcihmaWVsZE5hbWUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbmFsbHkgdGhlIGFzc2lnbm1lbnQgaXMgZXh0ZW5kZWQgYnkgYXNzaWduaW5nIGl0IGludG8gdGhlIHRhcmdldCBleHByZXNzaW9uLlxuICAgICAgICBhc3NpZ25tZW50ID0gdHMuY3JlYXRlQmluYXJ5KHRhcmdldCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgYXNzaWdubWVudCk7XG4gICAgICB9XG5cbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oYXNzaWdubWVudCwgaW5wdXQuYXR0cmlidXRlLnNvdXJjZVNwYW4pO1xuICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChhc3NpZ25tZW50KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggaXMgdXNlZCB0byBnZW5lcmF0ZSBhIGZhbGxiYWNrIGV4cHJlc3Npb24gaWYgdGhlIGluZmVyZW5jZSBvZiBhIGRpcmVjdGl2ZSB0eXBlXG4gKiB2aWEgYFRjYkRpcmVjdGl2ZUN0b3JPcGAgcmVxdWlyZXMgYSByZWZlcmVuY2UgdG8gaXRzIG93biB0eXBlLiBUaGlzIGNhbiBoYXBwZW4gdXNpbmcgYSB0ZW1wbGF0ZVxuICogcmVmZXJlbmNlOlxuICpcbiAqIGBgYGh0bWxcbiAqIDxzb21lLWNtcCAjcmVmIFtwcm9wXT1cInJlZi5mb29cIj48L3NvbWUtY21wPlxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCBgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcGAgd2lsbCBhZGQgYSBzZWNvbmQgaW5mZXJlbmNlIG9mIHRoZSBkaXJlY3RpdmVcbiAqIHR5cGUgdG8gdGhlIHR5cGUtY2hlY2sgYmxvY2ssIHRoaXMgdGltZSBjYWxsaW5nIHRoZSBkaXJlY3RpdmUncyB0eXBlIGNvbnN0cnVjdG9yIHdpdGhvdXQgYW55XG4gKiBpbnB1dCBleHByZXNzaW9ucy4gVGhpcyBpbmZlcnMgdGhlIHdpZGVzdCBwb3NzaWJsZSBzdXBlcnR5cGUgZm9yIHRoZSBkaXJlY3RpdmUsIHdoaWNoIGlzIHVzZWQgdG9cbiAqIHJlc29sdmUgYW55IHJlY3Vyc2l2ZSByZWZlcmVuY2VzIHJlcXVpcmVkIHRvIGluZmVyIHRoZSByZWFsIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUN0b3JDaXJjdWxhckZhbGxiYWNrT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCB0eXBlQ3RvciA9IHRoaXMudGNiLmVudi50eXBlQ3RvckZvcih0aGlzLmRpcik7XG4gICAgY29uc3QgY2lyY3VsYXJQbGFjZWhvbGRlciA9IHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgIHR5cGVDdG9yLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSldKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBjaXJjdWxhclBsYWNlaG9sZGVyKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGZlZWRzIGVsZW1lbnRzIGFuZCB1bmNsYWltZWQgcHJvcGVydGllcyB0byB0aGUgYERvbVNjaGVtYUNoZWNrZXJgLlxuICpcbiAqIFRoZSBET00gc2NoZW1hIGlzIG5vdCBjaGVja2VkIHZpYSBUQ0IgY29kZSBnZW5lcmF0aW9uLiBJbnN0ZWFkLCB0aGUgYERvbVNjaGVtYUNoZWNrZXJgIGluZ2VzdHNcbiAqIGVsZW1lbnRzIGFuZCBwcm9wZXJ0eSBiaW5kaW5ncyBhbmQgYWNjdW11bGF0ZXMgc3ludGhldGljIGB0cy5EaWFnbm9zdGljYHMgb3V0LW9mLWJhbmQuIFRoZXNlIGFyZVxuICogbGF0ZXIgbWVyZ2VkIHdpdGggdGhlIGRpYWdub3N0aWNzIGdlbmVyYXRlZCBmcm9tIHRoZSBUQ0IuXG4gKlxuICogRm9yIGNvbnZlbmllbmNlLCB0aGUgVENCIGl0ZXJhdGlvbiBvZiB0aGUgdGVtcGxhdGUgaXMgdXNlZCB0byBkcml2ZSB0aGUgYERvbVNjaGVtYUNoZWNrZXJgIHZpYVxuICogdGhlIGBUY2JEb21TY2hlbWFDaGVja2VyT3BgLlxuICovXG5jbGFzcyBUY2JEb21TY2hlbWFDaGVja2VyT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHByaXZhdGUgY2hlY2tFbGVtZW50OiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkSW5wdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICh0aGlzLmNoZWNrRWxlbWVudCkge1xuICAgICAgdGhpcy50Y2IuZG9tU2NoZW1hQ2hlY2tlci5jaGVja0VsZW1lbnQodGhpcy50Y2IuaWQsIHRoaXMuZWxlbWVudCwgdGhpcy50Y2Iuc2NoZW1hcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3QgYmluZGluZyBvZiB0aGlzLmVsZW1lbnQuaW5wdXRzKSB7XG4gICAgICBpZiAoYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSAmJiB0aGlzLmNsYWltZWRJbnB1dHMuaGFzKGJpbmRpbmcubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGJpbmRpbmcgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgICBpZiAoYmluZGluZy5uYW1lICE9PSAnc3R5bGUnICYmIGJpbmRpbmcubmFtZSAhPT0gJ2NsYXNzJykge1xuICAgICAgICAgIC8vIEEgZGlyZWN0IGJpbmRpbmcgdG8gYSBwcm9wZXJ0eS5cbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSBBVFRSX1RPX1BST1BbYmluZGluZy5uYW1lXSB8fCBiaW5kaW5nLm5hbWU7XG4gICAgICAgICAgdGhpcy50Y2IuZG9tU2NoZW1hQ2hlY2tlci5jaGVja1Byb3BlcnR5KFxuICAgICAgICAgICAgICB0aGlzLnRjYi5pZCwgdGhpcy5lbGVtZW50LCBwcm9wZXJ0eU5hbWUsIGJpbmRpbmcuc291cmNlU3BhbiwgdGhpcy50Y2Iuc2NoZW1hcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuXG4vKipcbiAqIE1hcHBpbmcgYmV0d2VlbiBhdHRyaWJ1dGVzIG5hbWVzIHRoYXQgZG9uJ3QgY29ycmVzcG9uZCB0byB0aGVpciBlbGVtZW50IHByb3BlcnR5IG5hbWVzLlxuICogTm90ZTogdGhpcyBtYXBwaW5nIGhhcyB0byBiZSBrZXB0IGluIHN5bmMgd2l0aCB0aGUgZXF1YWxseSBuYW1lZCBtYXBwaW5nIGluIHRoZSBydW50aW1lLlxuICovXG5jb25zdCBBVFRSX1RPX1BST1A6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdmb3JtYWN0aW9uJzogJ2Zvcm1BY3Rpb24nLFxuICAnaW5uZXJIdG1sJzogJ2lubmVySFRNTCcsXG4gICdyZWFkb25seSc6ICdyZWFkT25seScsXG4gICd0YWJpbmRleCc6ICd0YWJJbmRleCcsXG59O1xuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBcInVuY2xhaW1lZCBpbnB1dHNcIiAtIGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgd2hpY2ggd2VyZVxuICogbm90IGF0dHJpYnV0ZWQgdG8gYW55IGRpcmVjdGl2ZSBvciBjb21wb25lbnQsIGFuZCBhcmUgaW5zdGVhZCBwcm9jZXNzZWQgYWdhaW5zdCB0aGUgSFRNTCBlbGVtZW50XG4gKiBpdHNlbGYuXG4gKlxuICogQ3VycmVudGx5LCBvbmx5IHRoZSBleHByZXNzaW9ucyBvZiB0aGVzZSBiaW5kaW5ncyBhcmUgY2hlY2tlZC4gVGhlIHRhcmdldHMgb2YgdGhlIGJpbmRpbmdzIGFyZVxuICogY2hlY2tlZCBhZ2FpbnN0IHRoZSBET00gc2NoZW1hIHZpYSBhIGBUY2JEb21TY2hlbWFDaGVja2VyT3BgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlVuY2xhaW1lZElucHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgY2xhaW1lZElucHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgLy8gYHRoaXMuaW5wdXRzYCBjb250YWlucyBvbmx5IHRob3NlIGJpbmRpbmdzIG5vdCBtYXRjaGVkIGJ5IGFueSBkaXJlY3RpdmUuIFRoZXNlIGJpbmRpbmdzIGdvIHRvXG4gICAgLy8gdGhlIGVsZW1lbnQgaXRzZWxmLlxuICAgIGxldCBlbElkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3QgYmluZGluZyBvZiB0aGlzLmVsZW1lbnQuaW5wdXRzKSB7XG4gICAgICBpZiAoYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSAmJiB0aGlzLmNsYWltZWRJbnB1dHMuaGFzKGJpbmRpbmcubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGJpbmRpbmcgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgZXhwciA9IHRjYkV4cHJlc3Npb24oYmluZGluZy52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBudWxsIGNoZWNrcyBhcmUgZGlzYWJsZWQsIGVyYXNlIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgZnJvbSB0aGUgdHlwZSBieVxuICAgICAgICAvLyB3cmFwcGluZyB0aGUgZXhwcmVzc2lvbiBpbiBhIG5vbi1udWxsIGFzc2VydGlvbi5cbiAgICAgICAgZXhwciA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbUJpbmRpbmdzICYmIGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgICAgaWYgKGJpbmRpbmcubmFtZSAhPT0gJ3N0eWxlJyAmJiBiaW5kaW5nLm5hbWUgIT09ICdjbGFzcycpIHtcbiAgICAgICAgICBpZiAoZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZWxJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBBIGRpcmVjdCBiaW5kaW5nIHRvIGEgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3QgcHJvcGVydHlOYW1lID0gQVRUUl9UT19QUk9QW2JpbmRpbmcubmFtZV0gfHwgYmluZGluZy5uYW1lO1xuICAgICAgICAgIGNvbnN0IHByb3AgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGVsSWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwocHJvcGVydHlOYW1lKSk7XG4gICAgICAgICAgY29uc3Qgc3RtdCA9IHRzLmNyZWF0ZUJpbmFyeShwcm9wLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcikpO1xuICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8oc3RtdCwgYmluZGluZy5zb3VyY2VTcGFuKTtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KHN0bXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQSBiaW5kaW5nIHRvIGFuIGFuaW1hdGlvbiwgYXR0cmlidXRlLCBjbGFzcyBvciBzdHlsZS4gRm9yIG5vdywgb25seSB2YWxpZGF0ZSB0aGUgcmlnaHQtXG4gICAgICAgIC8vIGhhbmQgc2lkZSBvZiB0aGUgZXhwcmVzc2lvbi5cbiAgICAgICAgLy8gVE9ETzogcHJvcGVybHkgY2hlY2sgY2xhc3MgYW5kIHN0eWxlIGJpbmRpbmdzLlxuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBldmVudCBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHRoYXQgY29ycmVzcG9uZCB3aXRoIHRoZVxuICogb3V0cHV0cyBvZiBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5leHBvcnQgY2xhc3MgVGNiRGlyZWN0aXZlT3V0cHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgbGV0IGRpcklkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGNvbnN0IG91dHB1dHMgPSB0aGlzLmRpci5vdXRwdXRzO1xuXG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgdGhpcy5ub2RlLm91dHB1dHMpIHtcbiAgICAgIGlmIChvdXRwdXQudHlwZSAhPT0gUGFyc2VkRXZlbnRUeXBlLlJlZ3VsYXIgfHwgIW91dHB1dHMuaGFzQmluZGluZ1Byb3BlcnR5TmFtZShvdXRwdXQubmFtZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBUT0RPKGFseGh1Yik6IGNvbnNpZGVyIHN1cHBvcnRpbmcgbXVsdGlwbGUgZmllbGRzIHdpdGggdGhlIHNhbWUgcHJvcGVydHkgbmFtZSBmb3Igb3V0cHV0cy5cbiAgICAgIGNvbnN0IGZpZWxkID0gb3V0cHV0cy5nZXRCeUJpbmRpbmdQcm9wZXJ0eU5hbWUob3V0cHV0Lm5hbWUpIVswXS5jbGFzc1Byb3BlcnR5TmFtZTtcblxuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMpIHtcbiAgICAgICAgLy8gRm9yIHN0cmljdCBjaGVja2luZyBvZiBkaXJlY3RpdmUgZXZlbnRzLCBnZW5lcmF0ZSBhIGNhbGwgdG8gdGhlIGBzdWJzY3JpYmVgIG1ldGhvZFxuICAgICAgICAvLyBvbiB0aGUgZGlyZWN0aXZlJ3Mgb3V0cHV0IGZpZWxkIHRvIGxldCB0eXBlIGluZm9ybWF0aW9uIGZsb3cgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbidzXG4gICAgICAgIC8vIGAkZXZlbnRgIHBhcmFtZXRlci5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gTm90ZSB0aGF0IHRoZSBgRXZlbnRFbWl0dGVyPFQ+YCB0eXBlIGZyb20gJ0Bhbmd1bGFyL2NvcmUnIHRoYXQgaXMgdHlwaWNhbGx5IHVzZWQgZm9yXG4gICAgICAgIC8vIG91dHB1dHMgaGFzIGEgdHlwaW5ncyBkZWZpY2llbmN5IGluIGl0cyBgc3Vic2NyaWJlYCBtZXRob2QuIFRoZSBnZW5lcmljIHR5cGUgYFRgIGlzIG5vdFxuICAgICAgICAvLyBjYXJyaWVkIGludG8gdGhlIGhhbmRsZXIgZnVuY3Rpb24sIHdoaWNoIGlzIHZpdGFsIGZvciBpbmZlcmVuY2Ugb2YgdGhlIHR5cGUgb2YgYCRldmVudGAuXG4gICAgICAgIC8vIEFzIGEgd29ya2Fyb3VuZCwgdGhlIGRpcmVjdGl2ZSdzIGZpZWxkIGlzIHBhc3NlZCBpbnRvIGEgaGVscGVyIGZ1bmN0aW9uIHRoYXQgaGFzIGFcbiAgICAgICAgLy8gc3BlY2lhbGx5IGNyYWZ0ZWQgc2V0IG9mIHNpZ25hdHVyZXMsIHRvIGVmZmVjdGl2ZWx5IGNhc3QgYEV2ZW50RW1pdHRlcjxUPmAgdG8gc29tZXRoaW5nXG4gICAgICAgIC8vIHRoYXQgaGFzIGEgYHN1YnNjcmliZWAgbWV0aG9kIHRoYXQgcHJvcGVybHkgY2FycmllcyB0aGUgYFRgIGludG8gdGhlIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuSW5mZXIpO1xuXG4gICAgICAgIGlmIChkaXJJZCA9PT0gbnVsbCkge1xuICAgICAgICAgIGRpcklkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG91dHB1dEZpZWxkID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZCkpO1xuICAgICAgICBjb25zdCBvdXRwdXRIZWxwZXIgPVxuICAgICAgICAgICAgdHMuY3JlYXRlQ2FsbCh0aGlzLnRjYi5lbnYuZGVjbGFyZU91dHB1dEhlbHBlcigpLCB1bmRlZmluZWQsIFtvdXRwdXRGaWVsZF0pO1xuICAgICAgICBjb25zdCBzdWJzY3JpYmVGbiA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKG91dHB1dEhlbHBlciwgJ3N1YnNjcmliZScpO1xuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChzdWJzY3JpYmVGbiwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIFtoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBkaXJlY3RpdmUgZXZlbnRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGVcbiAgICAgICAgLy8gYCRldmVudGAgcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuXG4gICAgICBFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yLnZpc2l0KFxuICAgICAgICAgIG91dHB1dC5oYW5kbGVyLCB0aGlzLnRjYi5pZCwgdGhpcy50Y2IuYm91bmRUYXJnZXQsIHRoaXMudGNiLm9vYlJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBPdXRwdXRzIGFyZSBhIGB0cy5DYWxsRXhwcmVzc2lvbmAgdGhhdCBsb29rIGxpa2Ugb25lIG9mIHRoZSB0d286XG4gICAqICAtIGBfb3V0cHV0SGVscGVyKF90MVtcIm91dHB1dEZpZWxkXCJdKS5zdWJzY3JpYmUoaGFuZGxlcik7YFxuICAgKiAgLSBgX3QxLmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlcik7YFxuICAgKiBUaGlzIG1ldGhvZCByZXZlcnNlcyB0aGUgb3BlcmF0aW9ucyB0byBjcmVhdGUgYSBjYWxsIGV4cHJlc3Npb24gZm9yIGEgZGlyZWN0aXZlIG91dHB1dC5cbiAgICogSXQgdW5wYWNrcyB0aGUgZ2l2ZW4gY2FsbCBleHByZXNzaW9uIGFuZCByZXR1cm5zIHRoZSBvcmlnaW5hbCBlbGVtZW50IGFjY2VzcyAoaS5lLlxuICAgKiBgX3QxW1wib3V0cHV0RmllbGRcIl1gIGluIHRoZSBleGFtcGxlIGFib3ZlKS4gUmV0dXJucyBgbnVsbGAgaWYgdGhlIGdpdmVuIGNhbGwgZXhwcmVzc2lvbiBpcyBub3RcbiAgICogdGhlIGV4cGVjdGVkIHN0cnVjdHVyZSBvZiBhbiBvdXRwdXQgYmluZGluZ1xuICAgKi9cbiAgc3RhdGljIGRlY29kZU91dHB1dENhbGxFeHByZXNzaW9uKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uKTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gYG5vZGUuZXhwcmVzc2lvbmAgPT09IGBfb3V0cHV0SGVscGVyKF90MVtcIm91dHB1dEZpZWxkXCJdKS5zdWJzY3JpYmVgIG9yIGBfdDEuYWRkRXZlbnRMaXN0ZW5lcmBcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikgfHxcbiAgICAgICAgbm9kZS5leHByZXNzaW9uLm5hbWUudGV4dCA9PT0gJ2FkZEV2ZW50TGlzdGVuZXInKSB7XG4gICAgICAvLyBgYWRkRXZlbnRMaXN0ZW5lcmAgb3V0cHV0cyBkbyBub3QgaGF2ZSBhbiBgRWxlbWVudEFjY2Vzc0V4cHJlc3Npb25gIGZvciB0aGUgb3V0cHV0IGZpZWxkLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gYG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uYCA9PT0gYF9vdXRwdXRIZWxwZXIoX3QxW1wib3V0cHV0RmllbGRcIl0pYFxuICAgIGlmIChub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBbb3V0cHV0RmllbGRBY2Nlc3NdID0gbm9kZS5leHByZXNzaW9uLmV4cHJlc3Npb24uYXJndW1lbnRzO1xuICAgIGlmICghdHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0RmllbGRBY2Nlc3M7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgXCJ1bmNsYWltZWQgb3V0cHV0c1wiIC0gZXZlbnQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaFxuICogd2VyZSBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MXG4gKiBlbGVtZW50IGl0c2VsZi5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JVbmNsYWltZWRPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkT3V0cHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgbGV0IGVsSWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgdGhpcy5lbGVtZW50Lm91dHB1dHMpIHtcbiAgICAgIGlmICh0aGlzLmNsYWltZWRPdXRwdXRzLmhhcyhvdXRwdXQubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGV2ZW50IGhhbmRsZXIgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAob3V0cHV0LnR5cGUgPT09IFBhcnNlZEV2ZW50VHlwZS5BbmltYXRpb24pIHtcbiAgICAgICAgLy8gQW5pbWF0aW9uIG91dHB1dCBiaW5kaW5ncyBhbHdheXMgaGF2ZSBhbiBgJGV2ZW50YCBwYXJhbWV0ZXIgb2YgdHlwZSBgQW5pbWF0aW9uRXZlbnRgLlxuICAgICAgICBjb25zdCBldmVudFR5cGUgPSB0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID9cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoJ0Bhbmd1bGFyL2FuaW1hdGlvbnMnLCAnQW5pbWF0aW9uRXZlbnQnKSA6XG4gICAgICAgICAgICBFdmVudFBhcmFtVHlwZS5Bbnk7XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBldmVudFR5cGUpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgRE9NIGV2ZW50cyBpcyBlbmFibGVkLCBnZW5lcmF0ZSBhIGNhbGwgdG8gYGFkZEV2ZW50TGlzdGVuZXJgIG9uXG4gICAgICAgIC8vIHRoZSBlbGVtZW50IGluc3RhbmNlIHNvIHRoYXQgVHlwZVNjcmlwdCdzIHR5cGUgaW5mZXJlbmNlIGZvclxuICAgICAgICAvLyBgSFRNTEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcmAgdXNpbmcgYEhUTUxFbGVtZW50RXZlbnRNYXBgIHRvIGluZmVyIGFuIGFjY3VyYXRlIHR5cGUgZm9yXG4gICAgICAgIC8vIGAkZXZlbnRgIGRlcGVuZGluZyBvbiB0aGUgZXZlbnQgbmFtZS4gRm9yIHVua25vd24gZXZlbnQgbmFtZXMsIFR5cGVTY3JpcHQgcmVzb3J0cyB0byB0aGVcbiAgICAgICAgLy8gYmFzZSBgRXZlbnRgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuSW5mZXIpO1xuXG4gICAgICAgIGlmIChlbElkID09PSBudWxsKSB7XG4gICAgICAgICAgZWxJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgLyogZXhwcmVzc2lvbiAqLyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhlbElkLCAnYWRkRXZlbnRMaXN0ZW5lcicpLFxuICAgICAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBhcmd1bWVudHMgKi9bdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChvdXRwdXQubmFtZSksIGhhbmRsZXJdKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhjYWxsLCBvdXRwdXQuc291cmNlU3Bhbik7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoY2FsbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIERPTSBpbnB1dHMgaXMgZGlzYWJsZWQsIGVtaXQgYSBoYW5kbGVyIGZ1bmN0aW9uIHdoZXJlIHRoZSBgJGV2ZW50YFxuICAgICAgICAvLyBwYXJhbWV0ZXIgaGFzIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuQW55KTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9XG5cbiAgICAgIEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IudmlzaXQoXG4gICAgICAgICAgb3V0cHV0LmhhbmRsZXIsIHRoaXMudGNiLmlkLCB0aGlzLnRjYi5ib3VuZFRhcmdldCwgdGhpcy50Y2Iub29iUmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBhIGNvbXBsZXRpb24gcG9pbnQgZm9yIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAqXG4gKiBUaGlzIGNvbXBsZXRpb24gcG9pbnQgbG9va3MgbGlrZSBgY3R4LiA7YCBpbiB0aGUgVENCIG91dHB1dCwgYW5kIGRvZXMgbm90IHByb2R1Y2UgZGlhZ25vc3RpY3MuXG4gKiBUeXBlU2NyaXB0IGF1dG9jb21wbGV0aW9uIEFQSXMgY2FuIGJlIHVzZWQgYXQgdGhpcyBjb21wbGV0aW9uIHBvaW50IChhZnRlciB0aGUgJy4nKSB0byBwcm9kdWNlXG4gKiBhdXRvY29tcGxldGlvbiByZXN1bHRzIG9mIHByb3BlcnRpZXMgYW5kIG1ldGhvZHMgZnJvbSB0aGUgdGVtcGxhdGUncyBjb21wb25lbnQgY29udGV4dC5cbiAqL1xuY2xhc3MgVGNiQ29tcG9uZW50Q29udGV4dENvbXBsZXRpb25PcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzY29wZTogU2NvcGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgcmVhZG9ubHkgb3B0aW9uYWwgPSBmYWxzZTtcblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGNvbnN0IGN0eCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2N0eCcpO1xuICAgIGNvbnN0IGN0eERvdCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGN0eCwgJycpO1xuICAgIG1hcmtJZ25vcmVEaWFnbm9zdGljcyhjdHhEb3QpO1xuICAgIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKGN0eERvdCwgRXhwcmVzc2lvbklkZW50aWZpZXIuQ09NUE9ORU5UX0NPTVBMRVRJT04pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoY3R4RG90KSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWx1ZSB1c2VkIHRvIGJyZWFrIGEgY2lyY3VsYXIgcmVmZXJlbmNlIGJldHdlZW4gYFRjYk9wYHMuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyByZXR1cm5lZCB3aGVuZXZlciBgVGNiT3BgcyBoYXZlIGEgY2lyY3VsYXIgZGVwZW5kZW5jeS4gVGhlIGV4cHJlc3Npb24gaXMgYSBub24tbnVsbFxuICogYXNzZXJ0aW9uIG9mIHRoZSBudWxsIHZhbHVlIChpbiBUeXBlU2NyaXB0LCB0aGUgZXhwcmVzc2lvbiBgbnVsbCFgKS4gVGhpcyBjb25zdHJ1Y3Rpb24gd2lsbCBpbmZlclxuICogdGhlIGxlYXN0IG5hcnJvdyB0eXBlIGZvciB3aGF0ZXZlciBpdCdzIGFzc2lnbmVkIHRvLlxuICovXG5jb25zdCBJTkZFUl9UWVBFX0ZPUl9DSVJDVUxBUl9PUF9FWFBSID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKTtcblxuLyoqXG4gKiBPdmVyYWxsIGdlbmVyYXRpb24gY29udGV4dCBmb3IgdGhlIHR5cGUgY2hlY2sgYmxvY2suXG4gKlxuICogYENvbnRleHRgIGhhbmRsZXMgb3BlcmF0aW9ucyBkdXJpbmcgY29kZSBnZW5lcmF0aW9uIHdoaWNoIGFyZSBnbG9iYWwgd2l0aCByZXNwZWN0IHRvIHRoZSB3aG9sZVxuICogYmxvY2suIEl0J3MgcmVzcG9uc2libGUgZm9yIHZhcmlhYmxlIG5hbWUgYWxsb2NhdGlvbiBhbmQgbWFuYWdlbWVudCBvZiBhbnkgaW1wb3J0cyBuZWVkZWQuIEl0XG4gKiBhbHNvIGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZSBtZXRhZGF0YSBpdHNlbGYuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb250ZXh0IHtcbiAgcHJpdmF0ZSBuZXh0SWQgPSAxO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZW52OiBFbnZpcm9ubWVudCwgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIHJlYWRvbmx5IGlkOiBUZW1wbGF0ZUlkLFxuICAgICAgcmVhZG9ubHkgYm91bmRUYXJnZXQ6IEJvdW5kVGFyZ2V0PFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPixcbiAgICAgIHByaXZhdGUgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICByZWFkb25seSBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKSB7fVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhIG5ldyB2YXJpYWJsZSBuYW1lIGZvciB1c2Ugd2l0aGluIHRoZSBgQ29udGV4dGAuXG4gICAqXG4gICAqIEN1cnJlbnRseSB0aGlzIHVzZXMgYSBtb25vdG9uaWNhbGx5IGluY3JlYXNpbmcgY291bnRlciwgYnV0IGluIHRoZSBmdXR1cmUgdGhlIHZhcmlhYmxlIG5hbWVcbiAgICogbWlnaHQgY2hhbmdlIGRlcGVuZGluZyBvbiB0aGUgdHlwZSBvZiBkYXRhIGJlaW5nIHN0b3JlZC5cbiAgICovXG4gIGFsbG9jYXRlSWQoKTogdHMuSWRlbnRpZmllciB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90JHt0aGlzLm5leHRJZCsrfWApO1xuICB9XG5cbiAgZ2V0UGlwZUJ5TmFtZShuYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj58bnVsbCB7XG4gICAgaWYgKCF0aGlzLnBpcGVzLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBpcGVzLmdldChuYW1lKSE7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2NhbCBzY29wZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2sgZm9yIGEgcGFydGljdWxhciB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGUgdG9wLWxldmVsIHRlbXBsYXRlIGFuZCBlYWNoIG5lc3RlZCBgPG5nLXRlbXBsYXRlPmAgaGF2ZSB0aGVpciBvd24gYFNjb3BlYCwgd2hpY2ggZXhpc3QgaW4gYVxuICogaGllcmFyY2h5LiBUaGUgc3RydWN0dXJlIG9mIHRoaXMgaGllcmFyY2h5IG1pcnJvcnMgdGhlIHN5bnRhY3RpYyBzY29wZXMgaW4gdGhlIGdlbmVyYXRlZCB0eXBlXG4gKiBjaGVjayBibG9jaywgd2hlcmUgZWFjaCBuZXN0ZWQgdGVtcGxhdGUgaXMgZW5jYXNlZCBpbiBhbiBgaWZgIHN0cnVjdHVyZS5cbiAqXG4gKiBBcyBhIHRlbXBsYXRlJ3MgYFRjYk9wYHMgYXJlIGV4ZWN1dGVkIGluIGEgZ2l2ZW4gYFNjb3BlYCwgc3RhdGVtZW50cyBhcmUgYWRkZWQgdmlhXG4gKiBgYWRkU3RhdGVtZW50KClgLiBXaGVuIHRoaXMgcHJvY2Vzc2luZyBpcyBjb21wbGV0ZSwgdGhlIGBTY29wZWAgY2FuIGJlIHR1cm5lZCBpbnRvIGEgYHRzLkJsb2NrYFxuICogdmlhIGByZW5kZXJUb0Jsb2NrKClgLlxuICpcbiAqIElmIGEgYFRjYk9wYCByZXF1aXJlcyB0aGUgb3V0cHV0IG9mIGFub3RoZXIsIGl0IGNhbiBjYWxsIGByZXNvbHZlKClgLlxuICovXG5jbGFzcyBTY29wZSB7XG4gIC8qKlxuICAgKiBBIHF1ZXVlIG9mIG9wZXJhdGlvbnMgd2hpY2ggbmVlZCB0byBiZSBwZXJmb3JtZWQgdG8gZ2VuZXJhdGUgdGhlIFRDQiBjb2RlIGZvciB0aGlzIHNjb3BlLlxuICAgKlxuICAgKiBUaGlzIGFycmF5IGNhbiBjb250YWluIGVpdGhlciBhIGBUY2JPcGAgd2hpY2ggaGFzIHlldCB0byBiZSBleGVjdXRlZCwgb3IgYSBgdHMuRXhwcmVzc2lvbnxudWxsYFxuICAgKiByZXByZXNlbnRpbmcgdGhlIG1lbW9pemVkIHJlc3VsdCBvZiBleGVjdXRpbmcgdGhlIG9wZXJhdGlvbi4gQXMgb3BlcmF0aW9ucyBhcmUgZXhlY3V0ZWQsIHRoZWlyXG4gICAqIHJlc3VsdHMgYXJlIHdyaXR0ZW4gaW50byB0aGUgYG9wUXVldWVgLCBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBJZiBhbiBvcGVyYXRpb24gaXMgaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgZXhlY3V0ZWQsIGl0IGlzIHRlbXBvcmFyaWx5IG92ZXJ3cml0dGVuIGhlcmUgd2l0aFxuICAgKiBgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUmAuIFRoaXMgd2F5LCBpZiBhIGN5Y2xlIGlzIGVuY291bnRlcmVkIHdoZXJlIGFuIG9wZXJhdGlvblxuICAgKiBkZXBlbmRzIHRyYW5zaXRpdmVseSBvbiBpdHMgb3duIHJlc3VsdCwgdGhlIGlubmVyIG9wZXJhdGlvbiB3aWxsIGluZmVyIHRoZSBsZWFzdCBuYXJyb3cgdHlwZVxuICAgKiB0aGF0IGZpdHMgaW5zdGVhZC4gVGhpcyBoYXMgdGhlIHNhbWUgc2VtYW50aWNzIGFzIFR5cGVTY3JpcHQgaXRzZWxmIHdoZW4gdHlwZXMgYXJlIHJlZmVyZW5jZWRcbiAgICogY2lyY3VsYXJseS5cbiAgICovXG4gIHByaXZhdGUgb3BRdWV1ZTogKFRjYk9wfHRzLkV4cHJlc3Npb258bnVsbClbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBgVG1wbEFzdEVsZW1lbnRgcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYkVsZW1lbnRPcGAgaW4gdGhlIGBvcFF1ZXVlYFxuICAgKi9cbiAgcHJpdmF0ZSBlbGVtZW50T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RFbGVtZW50LCBudW1iZXI+KCk7XG4gIC8qKlxuICAgKiBBIG1hcCBvZiBtYXBzIHdoaWNoIHRyYWNrcyB0aGUgaW5kZXggb2YgYFRjYkRpcmVjdGl2ZUN0b3JPcGBzIGluIHRoZSBgb3BRdWV1ZWAgZm9yIGVhY2hcbiAgICogZGlyZWN0aXZlIG9uIGEgYFRtcGxBc3RFbGVtZW50YCBvciBgVG1wbEFzdFRlbXBsYXRlYCBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSBkaXJlY3RpdmVPcE1hcCA9XG4gICAgICBuZXcgTWFwPFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBudW1iZXI+PigpO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBgVG1wbEFzdFJlZmVyZW5jZWBzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiUmVmZXJlbmNlT3BgIGluIHRoZSBgb3BRdWV1ZWBcbiAgICovXG4gIHByaXZhdGUgcmVmZXJlbmNlT3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RSZWZlcmVuY2UsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGltbWVkaWF0ZWx5IG5lc3RlZCA8bmctdGVtcGxhdGU+cyAod2l0aGluIHRoaXMgYFNjb3BlYCkgcmVwcmVzZW50ZWQgYnkgYFRtcGxBc3RUZW1wbGF0ZWBcbiAgICogbm9kZXMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlQ3R4T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgdmFyaWFibGVzIGRlY2xhcmVkIG9uIHRoZSB0ZW1wbGF0ZSB0aGF0IGNyZWF0ZWQgdGhpcyBgU2NvcGVgIChyZXByZXNlbnRlZCBieVxuICAgKiBgVG1wbEFzdFZhcmlhYmxlYCBub2RlcykgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JWYXJpYWJsZU9wYHMgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICovXG4gIHByaXZhdGUgdmFyTWFwID0gbmV3IE1hcDxUbXBsQXN0VmFyaWFibGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICpcbiAgICogRXhlY3V0aW5nIHRoZSBgVGNiT3BgcyBpbiB0aGUgYG9wUXVldWVgIHBvcHVsYXRlcyB0aGlzIGFycmF5LlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBwYXJlbnQ6IFNjb3BlfG51bGwgPSBudWxsLFxuICAgICAgcHJpdmF0ZSBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIGBTY29wZWAgZ2l2ZW4gZWl0aGVyIGEgYFRtcGxBc3RUZW1wbGF0ZWAgb3IgYSBsaXN0IG9mIGBUbXBsQXN0Tm9kZWBzLlxuICAgKlxuICAgKiBAcGFyYW0gdGNiIHRoZSBvdmVyYWxsIGNvbnRleHQgb2YgVENCIGdlbmVyYXRpb24uXG4gICAqIEBwYXJhbSBwYXJlbnQgdGhlIGBTY29wZWAgb2YgdGhlIHBhcmVudCB0ZW1wbGF0ZSAoaWYgYW55KSBvciBgbnVsbGAgaWYgdGhpcyBpcyB0aGUgcm9vdFxuICAgKiBgU2NvcGVgLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVPck5vZGVzIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIHJlcHJlc2VudGluZyB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIHRvXG4gICAqIGNhbGN1bGF0ZSB0aGUgYFNjb3BlYCwgb3IgYSBsaXN0IG9mIG5vZGVzIGlmIG5vIG91dGVyIHRlbXBsYXRlIG9iamVjdCBpcyBhdmFpbGFibGUuXG4gICAqIEBwYXJhbSBndWFyZCBhbiBleHByZXNzaW9uIHRoYXQgaXMgYXBwbGllZCB0byB0aGlzIHNjb3BlIGZvciB0eXBlIG5hcnJvd2luZyBwdXJwb3Nlcy5cbiAgICovXG4gIHN0YXRpYyBmb3JOb2RlcyhcbiAgICAgIHRjYjogQ29udGV4dCwgcGFyZW50OiBTY29wZXxudWxsLCB0ZW1wbGF0ZU9yTm9kZXM6IFRtcGxBc3RUZW1wbGF0ZXwoVG1wbEFzdE5vZGVbXSksXG4gICAgICBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsKTogU2NvcGUge1xuICAgIGNvbnN0IHNjb3BlID0gbmV3IFNjb3BlKHRjYiwgcGFyZW50LCBndWFyZCk7XG5cbiAgICBpZiAocGFyZW50ID09PSBudWxsICYmIHRjYi5lbnYuY29uZmlnLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIpIHtcbiAgICAgIC8vIEFkZCBhbiBhdXRvY29tcGxldGlvbiBwb2ludCBmb3IgdGhlIGNvbXBvbmVudCBjb250ZXh0LlxuICAgICAgc2NvcGUub3BRdWV1ZS5wdXNoKG5ldyBUY2JDb21wb25lbnRDb250ZXh0Q29tcGxldGlvbk9wKHNjb3BlKSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuOiBUbXBsQXN0Tm9kZVtdO1xuXG4gICAgLy8gSWYgZ2l2ZW4gYW4gYWN0dWFsIGBUbXBsQXN0VGVtcGxhdGVgIGluc3RhbmNlLCB0aGVuIHByb2Nlc3MgYW55IGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gaXRcbiAgICAvLyBoYXMuXG4gICAgaWYgKHRlbXBsYXRlT3JOb2RlcyBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlJ3MgdmFyaWFibGUgZGVjbGFyYXRpb25zIG5lZWQgdG8gYmUgYWRkZWQgYXMgYFRjYlZhcmlhYmxlT3Bgcy5cbiAgICAgIGNvbnN0IHZhck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUbXBsQXN0VmFyaWFibGU+KCk7XG5cbiAgICAgIGZvciAoY29uc3QgdiBvZiB0ZW1wbGF0ZU9yTm9kZXMudmFyaWFibGVzKSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgdmFyaWFibGVzIG9uIHRoZSBgVG1wbEFzdFRlbXBsYXRlYCBhcmUgb25seSBkZWNsYXJlZCBvbmNlLlxuICAgICAgICBpZiAoIXZhck1hcC5oYXModi5uYW1lKSkge1xuICAgICAgICAgIHZhck1hcC5zZXQodi5uYW1lLCB2KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBmaXJzdERlY2wgPSB2YXJNYXAuZ2V0KHYubmFtZSkhO1xuICAgICAgICAgIHRjYi5vb2JSZWNvcmRlci5kdXBsaWNhdGVUZW1wbGF0ZVZhcih0Y2IuaWQsIHYsIGZpcnN0RGVjbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcEluZGV4ID0gc2NvcGUub3BRdWV1ZS5wdXNoKG5ldyBUY2JWYXJpYWJsZU9wKHRjYiwgc2NvcGUsIHRlbXBsYXRlT3JOb2RlcywgdikpIC0gMTtcbiAgICAgICAgc2NvcGUudmFyTWFwLnNldCh2LCBvcEluZGV4KTtcbiAgICAgIH1cbiAgICAgIGNoaWxkcmVuID0gdGVtcGxhdGVPck5vZGVzLmNoaWxkcmVuO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2RlcztcbiAgICB9XG4gICAgZm9yIChjb25zdCBub2RlIG9mIGNoaWxkcmVuKSB7XG4gICAgICBzY29wZS5hcHBlbmROb2RlKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogTG9vayB1cCBhIGB0cy5FeHByZXNzaW9uYCByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHNvbWUgb3BlcmF0aW9uIGluIHRoZSBjdXJyZW50IGBTY29wZWAsXG4gICAqIGluY2x1ZGluZyBhbnkgcGFyZW50IHNjb3BlKHMpLiBUaGlzIG1ldGhvZCBhbHdheXMgcmV0dXJucyBhIG11dGFibGUgY2xvbmUgb2YgdGhlXG4gICAqIGB0cy5FeHByZXNzaW9uYCB3aXRoIHRoZSBjb21tZW50cyBjbGVhcmVkLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBhIGBUbXBsQXN0Tm9kZWAgb2YgdGhlIG9wZXJhdGlvbiBpbiBxdWVzdGlvbi4gVGhlIGxvb2t1cCBwZXJmb3JtZWQgd2lsbCBkZXBlbmQgb25cbiAgICogdGhlIHR5cGUgb2YgdGhpcyBub2RlOlxuICAgKlxuICAgKiBBc3N1bWluZyBgZGlyZWN0aXZlYCBpcyBub3QgcHJlc2VudCwgdGhlbiBgcmVzb2x2ZWAgd2lsbCByZXR1cm46XG4gICAqXG4gICAqICogYFRtcGxBc3RFbGVtZW50YCAtIHJldHJpZXZlIHRoZSBleHByZXNzaW9uIGZvciB0aGUgZWxlbWVudCBET00gbm9kZVxuICAgKiAqIGBUbXBsQXN0VGVtcGxhdGVgIC0gcmV0cmlldmUgdGhlIHRlbXBsYXRlIGNvbnRleHQgdmFyaWFibGVcbiAgICogKiBgVG1wbEFzdFZhcmlhYmxlYCAtIHJldHJpZXZlIGEgdGVtcGxhdGUgbGV0LSB2YXJpYWJsZVxuICAgKiAqIGBUbXBsQXN0UmVmZXJlbmNlYCAtIHJldHJpZXZlIHZhcmlhYmxlIGNyZWF0ZWQgZm9yIHRoZSBsb2NhbCByZWZcbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBpZiBwcmVzZW50LCBhIGRpcmVjdGl2ZSB0eXBlIG9uIGEgYFRtcGxBc3RFbGVtZW50YCBvciBgVG1wbEFzdFRlbXBsYXRlYCB0b1xuICAgKiBsb29rIHVwIGluc3RlYWQgb2YgdGhlIGRlZmF1bHQgZm9yIGFuIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZS5cbiAgICovXG4gIHJlc29sdmUoXG4gICAgICBub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlfFRtcGxBc3RSZWZlcmVuY2UsXG4gICAgICBkaXJlY3RpdmU/OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgb3BlcmF0aW9uIGxvY2FsbHkuXG4gICAgY29uc3QgcmVzID0gdGhpcy5yZXNvbHZlTG9jYWwobm9kZSwgZGlyZWN0aXZlKTtcbiAgICBpZiAocmVzICE9PSBudWxsKSB7XG4gICAgICAvLyBXZSB3YW50IHRvIGdldCBhIGNsb25lIG9mIHRoZSByZXNvbHZlZCBleHByZXNzaW9uIGFuZCBjbGVhciB0aGUgdHJhaWxpbmcgY29tbWVudHNcbiAgICAgIC8vIHNvIHRoZXkgZG9uJ3QgY29udGludWUgdG8gYXBwZWFyIGluIGV2ZXJ5IHBsYWNlIHRoZSBleHByZXNzaW9uIGlzIHVzZWQuXG4gICAgICAvLyBBcyBhbiBleGFtcGxlLCB0aGlzIHdvdWxkIG90aGVyd2lzZSBwcm9kdWNlOlxuICAgICAgLy8gdmFyIF90MSAvKipUOkRJUiovIC8qMSwyKi8gPSBfY3RvcjEoKTtcbiAgICAgIC8vIF90MSAvKipUOkRJUiovIC8qMSwyKi8uaW5wdXQgPSAndmFsdWUnO1xuICAgICAgLy9cbiAgICAgIC8vIEluIGFkZGl0aW9uLCByZXR1cm5pbmcgYSBjbG9uZSBwcmV2ZW50cyB0aGUgY29uc3VtZXIgb2YgYFNjb3BlI3Jlc29sdmVgIGZyb21cbiAgICAgIC8vIGF0dGFjaGluZyBjb21tZW50cyBhdCB0aGUgZGVjbGFyYXRpb24gc2l0ZS5cblxuICAgICAgY29uc3QgY2xvbmUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUocmVzKTtcbiAgICAgIHRzLnNldFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudHMoY2xvbmUsIFtdKTtcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBDaGVjayB3aXRoIHRoZSBwYXJlbnQuXG4gICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZShub2RlLCBkaXJlY3RpdmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICR7bm9kZX0gLyAke2RpcmVjdGl2ZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgc3RhdGVtZW50IHRvIHRoaXMgc2NvcGUuXG4gICAqL1xuICBhZGRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgdGhpcy5zdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzdGF0ZW1lbnRzLlxuICAgKi9cbiAgcmVuZGVyKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub3BRdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gT3B0aW9uYWwgc3RhdGVtZW50cyBjYW5ub3QgYmUgc2tpcHBlZCB3aGVuIHdlIGFyZSBnZW5lcmF0aW5nIHRoZSBUQ0IgZm9yIHVzZVxuICAgICAgLy8gYnkgdGhlIFRlbXBsYXRlVHlwZUNoZWNrZXIuXG4gICAgICBjb25zdCBza2lwT3B0aW9uYWwgPSAhdGhpcy50Y2IuZW52LmNvbmZpZy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyO1xuICAgICAgdGhpcy5leGVjdXRlT3AoaSwgc2tpcE9wdGlvbmFsKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVtZW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGV4cHJlc3Npb24gb2YgYWxsIHRlbXBsYXRlIGd1YXJkcyB0aGF0IGFwcGx5IHRvIHRoaXMgc2NvcGUsIGluY2x1ZGluZyB0aG9zZSBvZlxuICAgKiBwYXJlbnQgc2NvcGVzLiBJZiBubyBndWFyZHMgaGF2ZSBiZWVuIGFwcGxpZWQsIG51bGwgaXMgcmV0dXJuZWQuXG4gICAqL1xuICBndWFyZHMoKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBsZXQgcGFyZW50R3VhcmRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLnBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgZ3VhcmRzIGZyb20gdGhlIHBhcmVudCBzY29wZSwgaWYgcHJlc2VudC5cbiAgICAgIHBhcmVudEd1YXJkcyA9IHRoaXMucGFyZW50Lmd1YXJkcygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmd1YXJkID09PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIHNjb3BlIGRvZXMgbm90IGhhdmUgYSBndWFyZCwgc28gcmV0dXJuIHRoZSBwYXJlbnQncyBndWFyZHMgYXMgaXMuXG4gICAgICByZXR1cm4gcGFyZW50R3VhcmRzO1xuICAgIH0gZWxzZSBpZiAocGFyZW50R3VhcmRzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSdzIG5vIGd1YXJkcyBmcm9tIHRoZSBwYXJlbnQgc2NvcGUsIHNvIHRoaXMgc2NvcGUncyBndWFyZCByZXByZXNlbnRzIGFsbCBhdmFpbGFibGVcbiAgICAgIC8vIGd1YXJkcy5cbiAgICAgIHJldHVybiB0aGlzLmd1YXJkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBCb3RoIHRoZSBwYXJlbnQgc2NvcGUgYW5kIHRoaXMgc2NvcGUgcHJvdmlkZSBhIGd1YXJkLCBzbyBjcmVhdGUgYSBjb21iaW5hdGlvbiBvZiB0aGUgdHdvLlxuICAgICAgLy8gSXQgaXMgaW1wb3J0YW50IHRoYXQgdGhlIHBhcmVudCBndWFyZCBpcyB1c2VkIGFzIGxlZnQgb3BlcmFuZCwgZ2l2ZW4gdGhhdCBpdCBtYXkgcHJvdmlkZVxuICAgICAgLy8gbmFycm93aW5nIHRoYXQgaXMgcmVxdWlyZWQgZm9yIHRoaXMgc2NvcGUncyBndWFyZCB0byBiZSB2YWxpZC5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVCaW5hcnkocGFyZW50R3VhcmRzLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCB0aGlzLmd1YXJkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVMb2NhbChcbiAgICAgIHJlZjogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZXxUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlICYmIHRoaXMucmVmZXJlbmNlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnJlZmVyZW5jZU9wTWFwLmdldChyZWYpISk7XG4gICAgfSBlbHNlIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUgJiYgdGhpcy52YXJNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBgVGNiVmFyaWFibGVPcGAgYXNzb2NpYXRlZCB3aXRoIHRoZSBgVG1wbEFzdFZhcmlhYmxlYC5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnZhck1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSAmJiBkaXJlY3RpdmUgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyB0aGUgY29udGV4dCBvZiB0aGUgZ2l2ZW4gc3ViLXRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlRlbXBsYXRlQ29udGV4dE9wYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudGVtcGxhdGVDdHhPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpICYmXG4gICAgICAgIGRpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuZGlyZWN0aXZlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGRpcmVjdGl2ZSBvbiBhbiBlbGVtZW50IG9yIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIGNvbnN0IGRpck1hcCA9IHRoaXMuZGlyZWN0aXZlT3BNYXAuZ2V0KHJlZikhO1xuICAgICAgaWYgKGRpck1hcC5oYXMoZGlyZWN0aXZlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AoZGlyTWFwLmdldChkaXJlY3RpdmUpISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmIHRoaXMuZWxlbWVudE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIERPTSBub2RlIG9mIGFuIGVsZW1lbnQgaW4gdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLmVsZW1lbnRPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgZXhlY3V0ZU9wYCwgYnV0IGFzc2VydCB0aGF0IHRoZSBvcGVyYXRpb24gYWN0dWFsbHkgcmV0dXJuZWQgYHRzLkV4cHJlc3Npb25gLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlT3Aob3BJbmRleDogbnVtYmVyKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVzID0gdGhpcy5leGVjdXRlT3Aob3BJbmRleCwgLyogc2tpcE9wdGlvbmFsICovIGZhbHNlKTtcbiAgICBpZiAocmVzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIHJlc29sdmluZyBvcGVyYXRpb24sIGdvdCBudWxsYCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIHBhcnRpY3VsYXIgYFRjYk9wYCBpbiB0aGUgYG9wUXVldWVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCByZXBsYWNlcyB0aGUgb3BlcmF0aW9uIGluIHRoZSBgb3BRdWV1ZWAgd2l0aCB0aGUgcmVzdWx0IG9mIGV4ZWN1dGlvbiAob25jZSBkb25lKVxuICAgKiBhbmQgYWxzbyBwcm90ZWN0cyBhZ2FpbnN0IGEgY2lyY3VsYXIgZGVwZW5kZW5jeSBmcm9tIHRoZSBvcGVyYXRpb24gdG8gaXRzZWxmIGJ5IHRlbXBvcmFyaWx5XG4gICAqIHNldHRpbmcgdGhlIG9wZXJhdGlvbidzIHJlc3VsdCB0byBhIHNwZWNpYWwgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZXhlY3V0ZU9wKG9wSW5kZXg6IG51bWJlciwgc2tpcE9wdGlvbmFsOiBib29sZWFuKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBvcCA9IHRoaXMub3BRdWV1ZVtvcEluZGV4XTtcbiAgICBpZiAoIShvcCBpbnN0YW5jZW9mIFRjYk9wKSkge1xuICAgICAgcmV0dXJuIG9wO1xuICAgIH1cblxuICAgIGlmIChza2lwT3B0aW9uYWwgJiYgb3Aub3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24gaW4gdGhlIHF1ZXVlIHRvIGl0cyBjaXJjdWxhciBmYWxsYmFjay4gSWYgZXhlY3V0aW5nIHRoaXNcbiAgICAvLyBvcGVyYXRpb24gcmVzdWx0cyBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3ksIHRoaXMgd2lsbCBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AgYW5kIGFsbG93IGZvclxuICAgIC8vIHRoZSByZXNvbHV0aW9uIG9mIHN1Y2ggY3ljbGVzLlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IG9wLmNpcmN1bGFyRmFsbGJhY2soKTtcbiAgICBjb25zdCByZXMgPSBvcC5leGVjdXRlKCk7XG4gICAgLy8gT25jZSB0aGUgb3BlcmF0aW9uIGhhcyBmaW5pc2hlZCBleGVjdXRpbmcsIGl0J3Mgc2FmZSB0byBjYWNoZSB0aGUgcmVhbCByZXN1bHQuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gcmVzO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE5vZGUobm9kZTogVG1wbEFzdE5vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBjb25zdCBvcEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkVsZW1lbnRPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpIC0gMTtcbiAgICAgIHRoaXMuZWxlbWVudE9wTWFwLnNldChub2RlLCBvcEluZGV4KTtcbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICB0aGlzLmFwcGVuZE5vZGUoY2hpbGQpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUZW1wbGF0ZSBjaGlsZHJlbiBhcmUgcmVuZGVyZWQgaW4gYSBjaGlsZCBzY29wZS5cbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGNvbnN0IGN0eEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQ29udGV4dE9wKHRoaXMudGNiLCB0aGlzKSkgLSAxO1xuICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLnNldChub2RlLCBjdHhJbmRleCk7XG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1RlbXBsYXRlQm9kaWVzKSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUJvZHlPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmFsd2F5c0NoZWNrU2NoZW1hSW5UZW1wbGF0ZUJvZGllcykge1xuICAgICAgICB0aGlzLmFwcGVuZERlZXBTY2hlbWFDaGVja3Mobm9kZS5jaGlsZHJlbik7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrQW5kQXBwZW5kUmVmZXJlbmNlc09mTm9kZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RJY3UpIHtcbiAgICAgIHRoaXMuYXBwZW5kSWN1RXhwcmVzc2lvbnMobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByZWYgb2Ygbm9kZS5yZWZlcmVuY2VzKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRSZWZlcmVuY2VUYXJnZXQocmVmKTtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1JlZmVyZW5jZVRhcmdldCh0aGlzLnRjYi5pZCwgcmVmKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBjdHhJbmRleDogbnVtYmVyO1xuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JSZWZlcmVuY2VPcCh0aGlzLnRjYiwgdGhpcywgcmVmLCBub2RlLCB0YXJnZXQpKSAtIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHhJbmRleCA9XG4gICAgICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMsIHJlZiwgbm9kZSwgdGFyZ2V0LmRpcmVjdGl2ZSkpIC0gMTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVmZXJlbmNlT3BNYXAuc2V0KHJlZiwgY3R4SW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgaW5wdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIGlucHV0cyBhcmUgdW5jbGFpbWVkIGlucHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChcbiAgICAgICAgICAgIG5ldyBUY2JEb21TY2hlbWFDaGVja2VyT3AodGhpcy50Y2IsIG5vZGUsIC8qIGNoZWNrRWxlbWVudCAqLyB0cnVlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlyTWFwID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZU9wID0gZGlyLmlzR2VuZXJpYyA/IG5ldyBUY2JEaXJlY3RpdmVDdG9yT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFRjYkRpcmVjdGl2ZVR5cGVPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIGNvbnN0IGRpckluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2goZGlyZWN0aXZlT3ApIC0gMTtcbiAgICAgIGRpck1hcC5zZXQoZGlyLCBkaXJJbmRleCk7XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuICAgIHRoaXMuZGlyZWN0aXZlT3BNYXAuc2V0KG5vZGUsIGRpck1hcCk7XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBpbnB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVtb3ZlIGFueSBpbnB1dHMgdGhhdCBpdCBjbGFpbXMgZnJvbSBgZWxlbWVudElucHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIG9mIGRpci5pbnB1dHMucHJvcGVydHlOYW1lcykge1xuICAgICAgICAgIGNsYWltZWRJbnB1dHMuYWRkKHByb3BlcnR5TmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZElucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcyB3aGljaCBtYXRjaCB0aGlzIGVsZW1lbnQsIHRoZW4gaXQncyBhIFwicGxhaW5cIiBET00gZWxlbWVudCAob3IgYVxuICAgICAgLy8gd2ViIGNvbXBvbmVudCksIGFuZCBzaG91bGQgYmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLiBJZiBhbnkgZGlyZWN0aXZlcyBtYXRjaCxcbiAgICAgIC8vIHdlIG11c3QgYXNzdW1lIHRoYXQgdGhlIGVsZW1lbnQgY291bGQgYmUgY3VzdG9tIChlaXRoZXIgYSBjb21wb25lbnQsIG9yIGEgZGlyZWN0aXZlIGxpa2VcbiAgICAgIC8vIDxyb3V0ZXItb3V0bGV0PikgYW5kIHNob3VsZG4ndCB2YWxpZGF0ZSB0aGUgZWxlbWVudCBuYW1lIGl0c2VsZi5cbiAgICAgIGNvbnN0IGNoZWNrRWxlbWVudCA9IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwO1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgY2hlY2tFbGVtZW50LCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBvdXRwdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRPdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwgfHwgZGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzLCB0aGVuIGFsbCBvdXRwdXRzIGFyZSB1bmNsYWltZWQgb3V0cHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUXVldWUgb3BlcmF0aW9ucyBmb3IgYWxsIGRpcmVjdGl2ZXMgdG8gY2hlY2sgdGhlIHJlbGV2YW50IG91dHB1dHMgZm9yIGEgZGlyZWN0aXZlLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikpO1xuICAgIH1cblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIG91dHB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVnaXN0ZXIgYW55IG91dHB1dHMgdGhhdCBpdCBjbGFpbXMgaW4gYGNsYWltZWRPdXRwdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBvdXRwdXRQcm9wZXJ0eSBvZiBkaXIub3V0cHV0cy5wcm9wZXJ0eU5hbWVzKSB7XG4gICAgICAgICAgY2xhaW1lZE91dHB1dHMuYWRkKG91dHB1dFByb3BlcnR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkT3V0cHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkT3V0cHV0cykpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGVlcFNjaGVtYUNoZWNrcyhub2RlczogVG1wbEFzdE5vZGVbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgICAgIGxldCBoYXNEaXJlY3RpdmVzOiBib29sZWFuO1xuICAgICAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGhhc0RpcmVjdGl2ZXMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBvZiBkaXIuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQocHJvcGVydHlOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgIWhhc0RpcmVjdGl2ZXMsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kSWN1RXhwcmVzc2lvbnMobm9kZTogVG1wbEFzdEljdSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgT2JqZWN0LnZhbHVlcyhub2RlLnZhcnMpKSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgdmFyaWFibGUpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwbGFjZWhvbGRlciBvZiBPYmplY3QudmFsdWVzKG5vZGUucGxhY2Vob2xkZXJzKSkge1xuICAgICAgaWYgKHBsYWNlaG9sZGVyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgcGxhY2Vob2xkZXIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRjYkJvdW5kSW5wdXQge1xuICBhdHRyaWJ1dGU6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZTtcbiAgZmllbGROYW1lczogQ2xhc3NQcm9wZXJ0eU5hbWVbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGBjdHhgIHBhcmFtZXRlciB0byB0aGUgdG9wLWxldmVsIFRDQiBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgcGFyYW1ldGVyIHdpdGggYSB0eXBlIGVxdWl2YWxlbnQgdG8gdGhlIGNvbXBvbmVudCB0eXBlLCB3aXRoIGFsbCBnZW5lcmljIHR5cGVcbiAqIHBhcmFtZXRlcnMgbGlzdGVkICh3aXRob3V0IHRoZWlyIGdlbmVyaWMgYm91bmRzKS5cbiAqL1xuZnVuY3Rpb24gdGNiQ3R4UGFyYW0oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbmFtZTogdHMuRW50aXR5TmFtZSxcbiAgICB1c2VHZW5lcmljVHlwZTogYm9vbGVhbik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uIHtcbiAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLlR5cGVOb2RlW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvLyBDaGVjayBpZiB0aGUgY29tcG9uZW50IGlzIGdlbmVyaWMsIGFuZCBwYXNzIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGlmIHNvLlxuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHVzZUdlbmVyaWNUeXBlKSB7XG4gICAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAoKCkgPT4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH1cbiAgfVxuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovICdjdHgnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gYEFTVGAgZXhwcmVzc2lvbiBhbmQgY29udmVydCBpdCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLCBnZW5lcmF0aW5nIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBjb3JyZWN0IGlkZW50aWZpZXJzIGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICovXG5mdW5jdGlvbiB0Y2JFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdGNiOiBDb250ZXh0LCBwcm90ZWN0ZWQgc2NvcGU6IFNjb3BlKSB7fVxuXG4gIHRyYW5zbGF0ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkXG4gICAgLy8gd2hpY2ggaW50ZXJwcmV0cyBzcGVjaWZpYyBleHByZXNzaW9uIG5vZGVzIHRoYXQgaW50ZXJhY3Qgd2l0aCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgLiBUaGVzZVxuICAgIC8vIG5vZGVzIGFjdHVhbGx5IHJlZmVyIHRvIGlkZW50aWZpZXJzIHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KGFzdCwgYXN0ID0+IHRoaXMucmVzb2x2ZShhc3QpLCB0aGlzLnRjYi5lbnYuY29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFuIGBBU1RgIGV4cHJlc3Npb24gd2l0aGluIHRoZSBnaXZlbiBzY29wZS5cbiAgICpcbiAgICogU29tZSBgQVNUYCBleHByZXNzaW9ucyByZWZlciB0byB0b3AtbGV2ZWwgY29uY2VwdHMgKHJlZmVyZW5jZXMsIHZhcmlhYmxlcywgdGhlIGNvbXBvbmVudFxuICAgKiBjb250ZXh0KS4gVGhpcyBtZXRob2QgYXNzaXN0cyBpbiByZXNvbHZpbmcgdGhvc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhpcyBleHByZXNzaW9uLiBJZiBubyBzdWNoIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW5cbiAgICAgIC8vIHRoZSBleHByZXNzaW9uIGlzIHJlZmVyZW5jaW5nIHRoZSB0b3AtbGV2ZWwgY29tcG9uZW50IGNvbnRleHQuIEluIHRoYXQgY2FzZSwgYG51bGxgIGlzXG4gICAgICAvLyByZXR1cm5lZCBoZXJlIHRvIGxldCBpdCBmYWxsIHRocm91Z2ggcmVzb2x1dGlvbiBzbyBpdCB3aWxsIGJlIGNhdWdodCB3aGVuIHRoZVxuICAgICAgLy8gYEltcGxpY2l0UmVjZWl2ZXJgIGlzIHJlc29sdmVkIGluIHRoZSBicmFuY2ggYmVsb3cuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC52YWx1ZSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIC8vIEFTVCBpbnN0YW5jZXMgcmVwcmVzZW50aW5nIHZhcmlhYmxlcyBhbmQgcmVmZXJlbmNlcyBsb29rIHZlcnkgc2ltaWxhciB0byBwcm9wZXJ0eSByZWFkc1xuICAgICAgLy8gb3IgbWV0aG9kIGNhbGxzIGZyb20gdGhlIGNvbXBvbmVudCBjb250ZXh0OiBib3RoIGhhdmUgdGhlIHNoYXBlXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlciwgJ3Byb3BOYW1lJykgb3IgTWV0aG9kQ2FsbChJbXBsaWNpdFJlY2VpdmVyLCAnbWV0aG9kTmFtZScpLlxuICAgICAgLy9cbiAgICAgIC8vIGB0cmFuc2xhdGVgIHdpbGwgZmlyc3QgdHJ5IHRvIGByZXNvbHZlYCB0aGUgb3V0ZXIgUHJvcGVydHlSZWFkL01ldGhvZENhbGwuIElmIHRoaXMgd29ya3MsXG4gICAgICAvLyBpdCdzIGJlY2F1c2UgdGhlIGBCb3VuZFRhcmdldGAgZm91bmQgYW4gZXhwcmVzc2lvbiB0YXJnZXQgZm9yIHRoZSB3aG9sZSBleHByZXNzaW9uLCBhbmRcbiAgICAgIC8vIHRoZXJlZm9yZSBgdHJhbnNsYXRlYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXRcbiAgICAgIC8vIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsLlxuICAgICAgLy9cbiAgICAgIC8vIFRoZXJlZm9yZSBpZiBgcmVzb2x2ZWAgaXMgY2FsbGVkIG9uIGFuIGBJbXBsaWNpdFJlY2VpdmVyYCwgaXQncyBiZWNhdXNlIG5vIG91dGVyXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbCByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSwgYW5kIHRoZXJlZm9yZSB0aGlzIGlzIGFcbiAgICAgIC8vIHByb3BlcnR5IHJlYWQgb3IgbWV0aG9kIGNhbGwgb24gdGhlIGNvbXBvbmVudCBjb250ZXh0IGl0c2VsZi5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlKSB7XG4gICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmV4cCk7XG4gICAgICBjb25zdCBwaXBlUmVmID0gdGhpcy50Y2IuZ2V0UGlwZUJ5TmFtZShhc3QubmFtZSk7XG4gICAgICBsZXQgcGlwZTogdHMuRXhwcmVzc2lvbnxudWxsO1xuICAgICAgaWYgKHBpcGVSZWYgPT09IG51bGwpIHtcbiAgICAgICAgLy8gTm8gcGlwZSBieSB0aGF0IG5hbWUgZXhpc3RzIGluIHNjb3BlLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvci5cbiAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1BpcGUodGhpcy50Y2IuaWQsIGFzdCk7XG5cbiAgICAgICAgLy8gVXNlIGFuICdhbnknIHZhbHVlIHRvIGF0IGxlYXN0IGFsbG93IHRoZSByZXN0IG9mIHRoZSBleHByZXNzaW9uIHRvIGJlIGNoZWNrZWQuXG4gICAgICAgIHBpcGUgPSBOVUxMX0FTX0FOWTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZlBpcGVzKSB7XG4gICAgICAgIC8vIFVzZSBhIHZhcmlhYmxlIGRlY2xhcmVkIGFzIHRoZSBwaXBlJ3MgdHlwZS5cbiAgICAgICAgcGlwZSA9IHRoaXMudGNiLmVudi5waXBlSW5zdChwaXBlUmVmKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFVzZSBhbiAnYW55JyB2YWx1ZSB3aGVuIG5vdCBjaGVja2luZyB0aGUgdHlwZSBvZiB0aGUgcGlwZS5cbiAgICAgICAgcGlwZSA9IE5VTExfQVNfQU5ZO1xuICAgICAgfVxuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0NhbGxNZXRob2QocGlwZSwgJ3RyYW5zZm9ybScsIFtleHByLCAuLi5hcmdzXSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBhc3QgaW5zdGFuY2VvZiBNZXRob2RDYWxsICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBUaGlzUmVjZWl2ZXIpKSB7XG4gICAgICAvLyBSZXNvbHZlIHRoZSBzcGVjaWFsIGAkYW55KGV4cHIpYCBzeW50YXggdG8gaW5zZXJ0IGEgY2FzdCBvZiB0aGUgYXJndW1lbnQgdG8gdHlwZSBgYW55YC5cbiAgICAgIC8vIGAkYW55KGV4cHIpYCAtPiBgZXhwciBhcyBhbnlgXG4gICAgICBpZiAoYXN0Lm5hbWUgPT09ICckYW55JyAmJiBhc3QuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5hcmdzWzBdKTtcbiAgICAgICAgY29uc3QgZXhwckFzQW55ID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihleHByLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZVBhcmVuKGV4cHJBc0FueSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhlIG1ldGhvZCwgYW5kIGdlbmVyYXRlIHRoZSBtZXRob2QgY2FsbCBpZiBhIHRhcmdldFxuICAgICAgLy8gY291bGQgYmUgcmVzb2x2ZWQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW4gdGhlIG1ldGhvZCBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsXG4gICAgICAvLyBjb21wb25lbnQgY29udGV4dCwgaW4gd2hpY2ggY2FzZSBgbnVsbGAgaXMgcmV0dXJuZWQgdG8gbGV0IHRoZSBgSW1wbGljaXRSZWNlaXZlcmAgYmVpbmdcbiAgICAgIC8vIHJlc29sdmVkIHRvIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgIGNvbnN0IHJlY2VpdmVyID0gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1ldGhvZCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHdyYXBGb3JEaWFnbm9zdGljcyhyZWNlaXZlciksIGFzdC5uYW1lKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8obWV0aG9kLCBhc3QubmFtZVNwYW4pO1xuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlQ2FsbChtZXRob2QsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIEFTVCBpc24ndCBzcGVjaWFsIGFmdGVyIGFsbC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIGEgYm91bmQgdGFyZ2V0IGZvciBhIGdpdmVuIGV4cHJlc3Npb24sIGFuZCB0cmFuc2xhdGVzIGl0IGludG8gdGhlXG4gICAqIGFwcHJvcHJpYXRlIGB0cy5FeHByZXNzaW9uYCB0aGF0IHJlcHJlc2VudHMgdGhlIGJvdW5kIHRhcmdldC4gSWYgbm8gdGFyZ2V0IGlzIGF2YWlsYWJsZSxcbiAgICogYG51bGxgIGlzIHJldHVybmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVUYXJnZXQoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGJpbmRpbmcgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGFzdCk7XG4gICAgaWYgKGJpbmRpbmcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHIgPSB0aGlzLnNjb3BlLnJlc29sdmUoYmluZGluZyk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cbn1cblxuLyoqXG4gKiBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIGEgZGlyZWN0aXZlIGluc3RhbmNlIG9uIGEgZ2l2ZW4gdGVtcGxhdGUgbm9kZSwgaW5mZXJyaW5nIGEgdHlwZSBmb3JcbiAqIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgZnJvbSBhbnkgYm91bmQgaW5wdXRzLlxuICovXG5mdW5jdGlvbiB0Y2JDYWxsVHlwZUN0b3IoXG4gICAgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdGNiOiBDb250ZXh0LCBpbnB1dHM6IFRjYkRpcmVjdGl2ZUlucHV0W10pOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHlwZUN0b3IgPSB0Y2IuZW52LnR5cGVDdG9yRm9yKGRpcik7XG5cbiAgLy8gQ29uc3RydWN0IGFuIGFycmF5IG9mIGB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnRgcyBmb3IgZWFjaCBvZiB0aGUgZGlyZWN0aXZlJ3MgaW5wdXRzLlxuICBjb25zdCBtZW1iZXJzID0gaW5wdXRzLm1hcChpbnB1dCA9PiB7XG4gICAgY29uc3QgcHJvcGVydHlOYW1lID0gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChpbnB1dC5maWVsZCk7XG5cbiAgICBpZiAoaW5wdXQudHlwZSA9PT0gJ2JpbmRpbmcnKSB7XG4gICAgICAvLyBGb3IgYm91bmQgaW5wdXRzLCB0aGUgcHJvcGVydHkgaXMgYXNzaWduZWQgdGhlIGJpbmRpbmcgZXhwcmVzc2lvbi5cbiAgICAgIGxldCBleHByID0gaW5wdXQuZXhwcmVzc2lvbjtcbiAgICAgIGlmICghdGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIGNoZWNraW5nIHRoZSB0eXBlIG9mIGJpbmRpbmdzIGlzIGRpc2FibGVkLCBjYXN0IHRoZSByZXN1bHRpbmcgZXhwcmVzc2lvbiB0byAnYW55J1xuICAgICAgICAvLyBiZWZvcmUgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgIGV4cHIgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRjYi5lbnYuY29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBudWxsIGNoZWNrcyBhcmUgZGlzYWJsZWQsIGVyYXNlIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgZnJvbSB0aGUgdHlwZSBieVxuICAgICAgICAvLyB3cmFwcGluZyB0aGUgZXhwcmVzc2lvbiBpbiBhIG5vbi1udWxsIGFzc2VydGlvbi5cbiAgICAgICAgZXhwciA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhc3NpZ25tZW50ID0gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5TmFtZSwgd3JhcEZvckRpYWdub3N0aWNzKGV4cHIpKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oYXNzaWdubWVudCwgaW5wdXQuc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gYXNzaWdubWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQSB0eXBlIGNvbnN0cnVjdG9yIGlzIHJlcXVpcmVkIHRvIGJlIGNhbGxlZCB3aXRoIGFsbCBpbnB1dCBwcm9wZXJ0aWVzLCBzbyBhbnkgdW5zZXRcbiAgICAgIC8vIGlucHV0cyBhcmUgc2ltcGx5IGFzc2lnbmVkIGEgdmFsdWUgb2YgdHlwZSBgYW55YCB0byBpZ25vcmUgdGhlbS5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcGVydHlOYW1lLCBOVUxMX0FTX0FOWSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDYWxsIHRoZSBgbmdUeXBlQ3RvcmAgbWV0aG9kIG9uIHRoZSBkaXJlY3RpdmUgY2xhc3MsIHdpdGggYW4gb2JqZWN0IGxpdGVyYWwgYXJndW1lbnQgY3JlYXRlZFxuICAvLyBmcm9tIHRoZSBtYXRjaGVkIGlucHV0cy5cbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIHR5cGVDdG9yLFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1t0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG1lbWJlcnMpXSk7XG59XG5cbmZ1bmN0aW9uIGdldEJvdW5kSW5wdXRzKFxuICAgIGRpcmVjdGl2ZTogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICB0Y2I6IENvbnRleHQpOiBUY2JCb3VuZElucHV0W10ge1xuICBjb25zdCBib3VuZElucHV0czogVGNiQm91bmRJbnB1dFtdID0gW107XG5cbiAgY29uc3QgcHJvY2Vzc0F0dHJpYnV0ZSA9IChhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGUpID0+IHtcbiAgICAvLyBTa2lwIG5vbi1wcm9wZXJ0eSBiaW5kaW5ncy5cbiAgICBpZiAoYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBhdHRyLnR5cGUgIT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2tpcCB0ZXh0IGF0dHJpYnV0ZXMgaWYgY29uZmlndXJlZCB0byBkbyBzby5cbiAgICBpZiAoIXRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyAmJiBhdHRyIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTa2lwIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGFuIGlucHV0IGZvciBpdC5cbiAgICBjb25zdCBpbnB1dHMgPSBkaXJlY3RpdmUuaW5wdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShhdHRyLm5hbWUpO1xuICAgIGlmIChpbnB1dHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmllbGROYW1lcyA9IGlucHV0cy5tYXAoaW5wdXQgPT4gaW5wdXQuY2xhc3NQcm9wZXJ0eU5hbWUpO1xuICAgIGJvdW5kSW5wdXRzLnB1c2goe2F0dHJpYnV0ZTogYXR0ciwgZmllbGROYW1lc30pO1xuICB9O1xuXG4gIG5vZGUuaW5wdXRzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIG5vZGUuYXR0cmlidXRlcy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIG5vZGUudGVtcGxhdGVBdHRycy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICB9XG5cbiAgcmV0dXJuIGJvdW5kSW5wdXRzO1xufVxuXG4vKipcbiAqIFRyYW5zbGF0ZXMgdGhlIGdpdmVuIGF0dHJpYnV0ZSBiaW5kaW5nIHRvIGEgYHRzLkV4cHJlc3Npb25gLlxuICovXG5mdW5jdGlvbiB0cmFuc2xhdGVJbnB1dChcbiAgICBhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGUsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSB7XG4gICAgLy8gUHJvZHVjZSBhbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgdGhlIGJpbmRpbmcuXG4gICAgcmV0dXJuIHRjYkV4cHJlc3Npb24oYXR0ci52YWx1ZSwgdGNiLCBzY29wZSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRm9yIHJlZ3VsYXIgYXR0cmlidXRlcyB3aXRoIGEgc3RhdGljIHN0cmluZyB2YWx1ZSwgdXNlIHRoZSByZXByZXNlbnRlZCBzdHJpbmcgbGl0ZXJhbC5cbiAgICByZXR1cm4gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChhdHRyLnZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGlucHV0IGJpbmRpbmcgdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgZmllbGQgb2YgYSBkaXJlY3RpdmUuXG4gKi9cbmludGVyZmFjZSBUY2JEaXJlY3RpdmVCb3VuZElucHV0IHtcbiAgdHlwZTogJ2JpbmRpbmcnO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiBhIGZpZWxkIG9uIHRoZSBkaXJlY3RpdmUgdGhhdCBpcyBzZXQuXG4gICAqL1xuICBmaWVsZDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLkV4cHJlc3Npb25gIGNvcnJlc3BvbmRpbmcgd2l0aCB0aGUgaW5wdXQgYmluZGluZyBleHByZXNzaW9uLlxuICAgKi9cbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcblxuICAvKipcbiAgICogVGhlIHNvdXJjZSBzcGFuIG9mIHRoZSBmdWxsIGF0dHJpYnV0ZSBiaW5kaW5nLlxuICAgKi9cbiAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuO1xufVxuXG4vKipcbiAqIEluZGljYXRlcyB0aGF0IGEgY2VydGFpbiBmaWVsZCBvZiBhIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGEgY29ycmVzcG9uZGluZyBpbnB1dCBiaW5kaW5nLlxuICovXG5pbnRlcmZhY2UgVGNiRGlyZWN0aXZlVW5zZXRJbnB1dCB7XG4gIHR5cGU6ICd1bnNldCc7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIGEgZmllbGQgb24gdGhlIGRpcmVjdGl2ZSBmb3Igd2hpY2ggbm8gaW5wdXQgYmluZGluZyBpcyBwcmVzZW50LlxuICAgKi9cbiAgZmllbGQ6IHN0cmluZztcbn1cblxudHlwZSBUY2JEaXJlY3RpdmVJbnB1dCA9IFRjYkRpcmVjdGl2ZUJvdW5kSW5wdXR8VGNiRGlyZWN0aXZlVW5zZXRJbnB1dDtcblxuY29uc3QgRVZFTlRfUEFSQU1FVEVSID0gJyRldmVudCc7XG5cbmNvbnN0IGVudW0gRXZlbnRQYXJhbVR5cGUge1xuICAvKiBHZW5lcmF0ZXMgY29kZSB0byBpbmZlciB0aGUgdHlwZSBvZiBgJGV2ZW50YCBiYXNlZCBvbiBob3cgdGhlIGxpc3RlbmVyIGlzIHJlZ2lzdGVyZWQuICovXG4gIEluZmVyLFxuXG4gIC8qIERlY2xhcmVzIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIgYXMgYGFueWAuICovXG4gIEFueSxcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycm93IGZ1bmN0aW9uIHRvIGJlIHVzZWQgYXMgaGFuZGxlciBmdW5jdGlvbiBmb3IgZXZlbnQgYmluZGluZ3MuIFRoZSBoYW5kbGVyXG4gKiBmdW5jdGlvbiBoYXMgYSBzaW5nbGUgcGFyYW1ldGVyIGAkZXZlbnRgIGFuZCB0aGUgYm91bmQgZXZlbnQncyBoYW5kbGVyIGBBU1RgIHJlcHJlc2VudGVkIGFzIGFcbiAqIFR5cGVTY3JpcHQgZXhwcmVzc2lvbiBhcyBpdHMgYm9keS5cbiAqXG4gKiBXaGVuIGBldmVudFR5cGVgIGlzIHNldCB0byBgSW5mZXJgLCB0aGUgYCRldmVudGAgcGFyYW1ldGVyIHdpbGwgbm90IGhhdmUgYW4gZXhwbGljaXQgdHlwZS4gVGhpc1xuICogYWxsb3dzIGZvciB0aGUgY3JlYXRlZCBoYW5kbGVyIGZ1bmN0aW9uIHRvIGhhdmUgaXRzIGAkZXZlbnRgIHBhcmFtZXRlcidzIHR5cGUgaW5mZXJyZWQgYmFzZWQgb25cbiAqIGhvdyBpdCdzIHVzZWQsIHRvIGVuYWJsZSBzdHJpY3QgdHlwZSBjaGVja2luZyBvZiBldmVudCBiaW5kaW5ncy4gV2hlbiBzZXQgdG8gYEFueWAsIHRoZSBgJGV2ZW50YFxuICogcGFyYW1ldGVyIHdpbGwgaGF2ZSBhbiBleHBsaWNpdCBgYW55YCB0eXBlLCBlZmZlY3RpdmVseSBkaXNhYmxpbmcgc3RyaWN0IHR5cGUgY2hlY2tpbmcgb2YgZXZlbnRcbiAqIGJpbmRpbmdzLiBBbHRlcm5hdGl2ZWx5LCBhbiBleHBsaWNpdCB0eXBlIGNhbiBiZSBwYXNzZWQgZm9yIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIuXG4gKi9cbmZ1bmN0aW9uIHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihcbiAgICBldmVudDogVG1wbEFzdEJvdW5kRXZlbnQsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlLFxuICAgIGV2ZW50VHlwZTogRXZlbnRQYXJhbVR5cGV8dHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgaGFuZGxlciA9IHRjYkV2ZW50SGFuZGxlckV4cHJlc3Npb24oZXZlbnQuaGFuZGxlciwgdGNiLCBzY29wZSk7XG5cbiAgbGV0IGV2ZW50UGFyYW1UeXBlOiB0cy5UeXBlTm9kZXx1bmRlZmluZWQ7XG4gIGlmIChldmVudFR5cGUgPT09IEV2ZW50UGFyYW1UeXBlLkluZmVyKSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSBFdmVudFBhcmFtVHlwZS5BbnkpIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICB9IGVsc2Uge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gZXZlbnRUeXBlO1xuICB9XG5cbiAgLy8gT2J0YWluIGFsbCBndWFyZHMgdGhhdCBoYXZlIGJlZW4gYXBwbGllZCB0byB0aGUgc2NvcGUgYW5kIGl0cyBwYXJlbnRzLCBhcyB0aGV5IGhhdmUgdG8gYmVcbiAgLy8gcmVwZWF0ZWQgd2l0aGluIHRoZSBoYW5kbGVyIGZ1bmN0aW9uIGZvciB0aGVpciBuYXJyb3dpbmcgdG8gYmUgaW4gZWZmZWN0IHdpdGhpbiB0aGUgaGFuZGxlci5cbiAgY29uc3QgZ3VhcmRzID0gc2NvcGUuZ3VhcmRzKCk7XG5cbiAgbGV0IGJvZHk6IHRzLlN0YXRlbWVudCA9IHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcik7XG4gIGlmIChndWFyZHMgIT09IG51bGwpIHtcbiAgICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIGBpZmAgc3RhdGVtZW50IGNvbnRhaW5pbmcgYWxsIGd1YXJkcyB0aGF0IGhhdmUgdG8gYmUgYXBwbGllZC5cbiAgICBib2R5ID0gdHMuY3JlYXRlSWYoZ3VhcmRzLCBib2R5KTtcbiAgfVxuXG4gIGNvbnN0IGV2ZW50UGFyYW0gPSB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIEVWRU5UX1BBUkFNRVRFUixcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZSAqLyBldmVudFBhcmFtVHlwZSk7XG5cbiAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgIC8qIG1vZGlmaWVyICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovW2V2ZW50UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSxcbiAgICAgIC8qIGJvZHkgKi8gdHMuY3JlYXRlQmxvY2soW2JvZHldKSk7XG59XG5cbi8qKlxuICogU2ltaWxhciB0byBgdGNiRXhwcmVzc2lvbmAsIHRoaXMgZnVuY3Rpb24gY29udmVydHMgdGhlIHByb3ZpZGVkIGBBU1RgIGV4cHJlc3Npb24gaW50byBhXG4gKiBgdHMuRXhwcmVzc2lvbmAsIHdpdGggc3BlY2lhbCBoYW5kbGluZyBvZiB0aGUgYCRldmVudGAgdmFyaWFibGUgdGhhdCBjYW4gYmUgdXNlZCB3aXRoaW4gZXZlbnRcbiAqIGJpbmRpbmdzLlxuICovXG5mdW5jdGlvbiB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV2ZW50SGFuZGxlclRyYW5zbGF0b3IodGNiLCBzY29wZSk7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yIGV4dGVuZHMgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gUmVjb2duaXplIGEgcHJvcGVydHkgcmVhZCBvbiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBldmVudCBwYXJhbWV0ZXJcbiAgICAvLyB0aGF0IGlzIGF2YWlsYWJsZSBpbiBldmVudCBiaW5kaW5ncy4gU2luY2UgdGhpcyB2YXJpYWJsZSBpcyBhIHBhcmFtZXRlciBvZiB0aGUgaGFuZGxlclxuICAgIC8vIGZ1bmN0aW9uIHRoYXQgdGhlIGNvbnZlcnRlZCBleHByZXNzaW9uIGJlY29tZXMgYSBjaGlsZCBvZiwganVzdCBjcmVhdGUgYSByZWZlcmVuY2UgdG8gdGhlXG4gICAgLy8gcGFyYW1ldGVyIGJ5IGl0cyBuYW1lLlxuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlciAmJlxuICAgICAgICAhKGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIFRoaXNSZWNlaXZlcikgJiYgYXN0Lm5hbWUgPT09IEVWRU5UX1BBUkFNRVRFUikge1xuICAgICAgY29uc3QgZXZlbnQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKEVWRU5UX1BBUkFNRVRFUik7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGV2ZW50LCBhc3QubmFtZVNwYW4pO1xuICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXNvbHZlKGFzdCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2sobm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPik6IGJvb2xlYW4ge1xuICAvLyBJbiBvcmRlciB0byBxdWFsaWZ5IGZvciBhIGRlY2xhcmVkIFRDQiAobm90IGlubGluZSkgdHdvIGNvbmRpdGlvbnMgbXVzdCBiZSBtZXQ6XG4gIC8vIDEpIHRoZSBjbGFzcyBtdXN0IGJlIGV4cG9ydGVkXG4gIC8vIDIpIGl0IG11c3Qgbm90IGhhdmUgY29uc3RyYWluZWQgZ2VuZXJpYyB0eXBlc1xuICBpZiAoIWNoZWNrSWZDbGFzc0lzRXhwb3J0ZWQobm9kZSkpIHtcbiAgICAvLyBDb25kaXRpb24gMSBpcyBmYWxzZSwgdGhlIGNsYXNzIGlzIG5vdCBleHBvcnRlZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmICghY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQobm9kZSkpIHtcbiAgICAvLyBDb25kaXRpb24gMiBpcyBmYWxzZSwgdGhlIGNsYXNzIGhhcyBjb25zdHJhaW5lZCBnZW5lcmljIHR5cGVzXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=