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
            return _this;
        }
        Object.defineProperty(TcbTemplateContextOp.prototype, "optional", {
            get: function () {
                return false;
            },
            enumerable: false,
            configurable: true
        });
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
            var initializer = ts.getMutableClone(this.target instanceof compiler_1.TmplAstTemplate || this.target instanceof compiler_1.TmplAstElement ?
                this.scope.resolve(this.target) :
                this.scope.resolve(this.host, this.target));
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
         * * `TmplAstReference` - retrieve variable created for the local ref
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
                this.checkAndAppendReferencesOfNode(node);
            }
            else if (node instanceof compiler_1.TmplAstBoundText) {
                this.opQueue.push(new TcbTextInterpolationOp(this.tcb, this, node));
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
            var expr = ts.getMutableClone(this.scope.resolve(binding));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMlc7SUFDM1csK0JBQWlDO0lBT2pDLG1GQUFnRztJQUNoRyx5RkFBa0Y7SUFHbEYsdUZBQTBEO0lBRTFELHVHQUErRDtJQUMvRCxpRkFBbU07SUFFbk07Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFCRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxHQUFnQixFQUFFLEdBQXFELEVBQUUsSUFBbUIsRUFDNUYsSUFBNEIsRUFBRSxnQkFBa0MsRUFDaEUsV0FBd0M7UUFDMUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQ25CLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdGLElBQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFVLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUNYLG1FQUFpRSxHQUFHLENBQUMsU0FBVyxDQUFDLENBQUM7U0FDdkY7UUFDRCxJQUFNLFNBQVMsR0FBRyxD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QUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVEO1FBQXdDLHFEQUF1QjtRQUEvRDs7UUFlQSxDQUFDO1FBZFcsMkNBQU8sR0FBakIsVUFBa0IsR0FBUTtZQUN4Qiw0RkFBNEY7WUFDNUYseUZBQXlGO1lBQ3pGLDRGQUE0RjtZQUM1Rix5QkFBeUI7WUFDekIsSUFBSSxHQUFHLFlBQVksdUJBQVksSUFBSSxHQUFHLENBQUMsUUFBUSxZQUFZLDJCQUFnQjtnQkFDdkUsR0FBRyxDQUFDLElBQUksS0FBSyxlQUFlLEVBQUU7Z0JBQ2hDLElBQU0sT0FBSyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDbkQsOEJBQWdCLENBQUMsT0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEMsT0FBTyxPQUFLLENBQUM7YUFDZDtZQUVELE9BQU8saUJBQU0sT0FBTyxZQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDSCxnQ0FBQztJQUFELENBQUMsQUFmRCxDQUF3Qyx1QkFBdUIsR0FlOUQ7SUFFRCxTQUFnQiw0QkFBNEIsQ0FBQyxJQUEyQztRQUN0RixrRkFBa0Y7UUFDbEYsZ0NBQWdDO1FBQ2hDLGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsZ0NBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakMsbURBQW1EO1lBQ25ELE9BQU8sSUFBSSxDQUFDO1NBQ2I7YUFBTSxJQUFJLENBQUMsdUNBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0MsZ0VBQWdFO1lBQ2hFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7YUFBTTtZQUNMLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0lBYkQsb0VBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEJpbmRpbmdQaXBlLCBCaW5kaW5nVHlwZSwgQm91bmRUYXJnZXQsIERZTkFNSUNfVFlQRSwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgUGFyc2VkRXZlbnRUeXBlLCBQYXJzZVNvdXJjZVNwYW4sIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgU2NoZW1hTWV0YWRhdGEsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc1Byb3BlcnR5TmFtZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7VGVtcGxhdGVJZCwgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGF9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7YWRkRXhwcmVzc2lvbklkZW50aWZpZXIsIEV4cHJlc3Npb25JZGVudGlmaWVyLCBtYXJrSWdub3JlRGlhZ25vc3RpY3N9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHthZGRQYXJzZVNwYW5JbmZvLCBhZGRUZW1wbGF0ZUlkLCB3cmFwRm9yRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7YXN0VG9UeXBlc2NyaXB0LCBOVUxMX0FTX0FOWX0gZnJvbSAnLi9leHByZXNzaW9uJztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5pbXBvcnQge0V4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3J9IGZyb20gJy4vdGVtcGxhdGVfc2VtYW50aWNzJztcbmltcG9ydCB7Y2hlY2tJZkNsYXNzSXNFeHBvcnRlZCwgY2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQsIHRzQ2FsbE1ldGhvZCwgdHNDYXN0VG9BbnksIHRzQ3JlYXRlRWxlbWVudCwgdHNDcmVhdGVUeXBlUXVlcnlGb3JDb2VyY2VkSW5wdXQsIHRzQ3JlYXRlVmFyaWFibGUsIHRzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuXG4vKipcbiAqIEdpdmVuIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIGZvciBhIGNvbXBvbmVudCwgYW5kIG1ldGFkYXRhIHJlZ2FyZGluZyB0aGF0IGNvbXBvbmVudCwgY29tcG9zZSBhXG4gKiBcInR5cGUgY2hlY2sgYmxvY2tcIiBmdW5jdGlvbi5cbiAqXG4gKiBXaGVuIHBhc3NlZCB0aHJvdWdoIFR5cGVTY3JpcHQncyBUeXBlQ2hlY2tlciwgdHlwZSBlcnJvcnMgdGhhdCBhcmlzZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2tcbiAqIGZ1bmN0aW9uIGluZGljYXRlIGlzc3VlcyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICpcbiAqIEFzIGEgc2lkZSBlZmZlY3Qgb2YgZ2VuZXJhdGluZyBhIFRDQiBmb3IgdGhlIGNvbXBvbmVudCwgYHRzLkRpYWdub3N0aWNgcyBtYXkgYWxzbyBiZSBwcm9kdWNlZFxuICogZGlyZWN0bHkgZm9yIGlzc3VlcyB3aXRoaW4gdGhlIHRlbXBsYXRlIHdoaWNoIGFyZSBpZGVudGlmaWVkIGR1cmluZyBnZW5lcmF0aW9uLiBUaGVzZSBpc3N1ZXMgYXJlXG4gKiByZWNvcmRlZCBpbiBlaXRoZXIgdGhlIGBkb21TY2hlbWFDaGVja2VyYCAod2hpY2ggY2hlY2tzIHVzYWdlIG9mIERPTSBlbGVtZW50cyBhbmQgYmluZGluZ3MpIGFzXG4gKiB3ZWxsIGFzIHRoZSBgb29iUmVjb3JkZXJgICh3aGljaCByZWNvcmRzIGVycm9ycyB3aGVuIHRoZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdG9yIGlzIHVuYWJsZVxuICogdG8gc3VmZmljaWVudGx5IHVuZGVyc3RhbmQgYSB0ZW1wbGF0ZSkuXG4gKlxuICogQHBhcmFtIGVudiBhbiBgRW52aXJvbm1lbnRgIGludG8gd2hpY2ggdHlwZS1jaGVja2luZyBjb2RlIHdpbGwgYmUgZ2VuZXJhdGVkLlxuICogQHBhcmFtIHJlZiBhIGBSZWZlcmVuY2VgIHRvIHRoZSBjb21wb25lbnQgY2xhc3Mgd2hpY2ggc2hvdWxkIGJlIHR5cGUtY2hlY2tlZC5cbiAqIEBwYXJhbSBuYW1lIGEgYHRzLklkZW50aWZpZXJgIHRvIHVzZSBmb3IgdGhlIGdlbmVyYXRlZCBgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbmAuXG4gKiBAcGFyYW0gbWV0YSBtZXRhZGF0YSBhYm91dCB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgYW5kIHRoZSBmdW5jdGlvbiBiZWluZyBnZW5lcmF0ZWQuXG4gKiBAcGFyYW0gZG9tU2NoZW1hQ2hlY2tlciB1c2VkIHRvIGNoZWNrIGFuZCByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyBpbXByb3BlciB1c2FnZSBvZiBET00gZWxlbWVudHNcbiAqIGFuZCBiaW5kaW5ncy5cbiAqIEBwYXJhbSBvb2JSZWNvcmRlciB1c2VkIHRvIHJlY29yZCBlcnJvcnMgcmVnYXJkaW5nIHRlbXBsYXRlIGVsZW1lbnRzIHdoaWNoIGNvdWxkIG5vdCBiZSBjb3JyZWN0bHlcbiAqIHRyYW5zbGF0ZWQgaW50byB0eXBlcyBkdXJpbmcgVENCIGdlbmVyYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgIGVudjogRW52aXJvbm1lbnQsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBuYW1lOiB0cy5JZGVudGlmaWVyLFxuICAgIG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICBjb25zdCB0Y2IgPSBuZXcgQ29udGV4dChcbiAgICAgIGVudiwgZG9tU2NoZW1hQ2hlY2tlciwgb29iUmVjb3JkZXIsIG1ldGEuaWQsIG1ldGEuYm91bmRUYXJnZXQsIG1ldGEucGlwZXMsIG1ldGEuc2NoZW1hcyk7XG4gIGNvbnN0IHNjb3BlID0gU2NvcGUuZm9yTm9kZXModGNiLCBudWxsLCB0Y2IuYm91bmRUYXJnZXQudGFyZ2V0LnRlbXBsYXRlICEsIC8qIGd1YXJkICovIG51bGwpO1xuICBjb25zdCBjdHhSYXdUeXBlID0gZW52LnJlZmVyZW5jZVR5cGUocmVmKTtcbiAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGN0eFJhd1R5cGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgd2hlbiByZWZlcmVuY2luZyB0aGUgY3R4IHBhcmFtIGZvciAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gIH1cbiAgY29uc3QgcGFyYW1MaXN0ID0gW3RjYkN0eFBhcmFtKHJlZi5ub2RlLCBjdHhSYXdUeXBlLnR5cGVOYW1lLCBlbnYuY29uZmlnLnVzZUNvbnRleHRHZW5lcmljVHlwZSldO1xuXG4gIGNvbnN0IHNjb3BlU3RhdGVtZW50cyA9IHNjb3BlLnJlbmRlcigpO1xuICBjb25zdCBpbm5lckJvZHkgPSB0cy5jcmVhdGVCbG9jayhbXG4gICAgLi4uZW52LmdldFByZWx1ZGVTdGF0ZW1lbnRzKCksXG4gICAgLi4uc2NvcGVTdGF0ZW1lbnRzLFxuICBdKTtcblxuICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIFwiaWYgKHRydWUpXCIgZXhwcmVzc2lvbi4gVGhpcyBpcyB1bm5lY2Vzc2FyeSBidXQgaGFzIHRoZSBlZmZlY3Qgb2YgY2F1c2luZ1xuICAvLyB0aGUgYHRzLlByaW50ZXJgIHRvIGZvcm1hdCB0aGUgdHlwZS1jaGVjayBibG9jayBuaWNlbHkuXG4gIGNvbnN0IGJvZHkgPSB0cy5jcmVhdGVCbG9jayhbdHMuY3JlYXRlSWYodHMuY3JlYXRlVHJ1ZSgpLCBpbm5lckJvZHksIHVuZGVmaW5lZCldKTtcbiAgY29uc3QgZm5EZWNsID0gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBuYW1lLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPyByZWYubm9kZS50eXBlUGFyYW1ldGVycyA6IHVuZGVmaW5lZCxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi8gcGFyYW1MaXN0LFxuICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBib2R5ICovIGJvZHkpO1xuICBhZGRUZW1wbGF0ZUlkKGZuRGVjbCwgbWV0YS5pZCk7XG4gIHJldHVybiBmbkRlY2w7XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQncyBpbnZvbHZlZCBpbiB0aGUgY29uc3RydWN0aW9uIG9mIGEgVHlwZSBDaGVjayBCbG9jay5cbiAqXG4gKiBUaGUgZ2VuZXJhdGlvbiBvZiBhIFRDQiBpcyBub24tbGluZWFyLiBCaW5kaW5ncyB3aXRoaW4gYSB0ZW1wbGF0ZSBtYXkgcmVzdWx0IGluIHRoZSBuZWVkIHRvXG4gKiBjb25zdHJ1Y3QgY2VydGFpbiB0eXBlcyBlYXJsaWVyIHRoYW4gdGhleSBvdGhlcndpc2Ugd291bGQgYmUgY29uc3RydWN0ZWQuIFRoYXQgaXMsIGlmIHRoZVxuICogZ2VuZXJhdGlvbiBvZiBhIFRDQiBmb3IgYSB0ZW1wbGF0ZSBpcyBicm9rZW4gZG93biBpbnRvIHNwZWNpZmljIG9wZXJhdGlvbnMgKGNvbnN0cnVjdGluZyBhXG4gKiBkaXJlY3RpdmUsIGV4dHJhY3RpbmcgYSB2YXJpYWJsZSBmcm9tIGEgbGV0LSBvcGVyYXRpb24sIGV0YyksIHRoZW4gaXQncyBwb3NzaWJsZSBmb3Igb3BlcmF0aW9uc1xuICogZWFybGllciBpbiB0aGUgc2VxdWVuY2UgdG8gZGVwZW5kIG9uIG9wZXJhdGlvbnMgd2hpY2ggb2NjdXIgbGF0ZXIgaW4gdGhlIHNlcXVlbmNlLlxuICpcbiAqIGBUY2JPcGAgYWJzdHJhY3RzIHRoZSBkaWZmZXJlbnQgdHlwZXMgb2Ygb3BlcmF0aW9ucyB3aGljaCBhcmUgcmVxdWlyZWQgdG8gY29udmVydCBhIHRlbXBsYXRlIGludG9cbiAqIGEgVENCLiBUaGlzIGFsbG93cyBmb3IgdHdvIHBoYXNlcyBvZiBwcm9jZXNzaW5nIGZvciB0aGUgdGVtcGxhdGUsIHdoZXJlIDEpIGEgbGluZWFyIHNlcXVlbmNlIG9mXG4gKiBgVGNiT3BgcyBpcyBnZW5lcmF0ZWQsIGFuZCB0aGVuIDIpIHRoZXNlIG9wZXJhdGlvbnMgYXJlIGV4ZWN1dGVkLCBub3QgbmVjZXNzYXJpbHkgaW4gbGluZWFyXG4gKiBvcmRlci5cbiAqXG4gKiBFYWNoIGBUY2JPcGAgbWF5IGluc2VydCBzdGF0ZW1lbnRzIGludG8gdGhlIGJvZHkgb2YgdGhlIFRDQiwgYW5kIGFsc28gb3B0aW9uYWxseSByZXR1cm4gYVxuICogYHRzLkV4cHJlc3Npb25gIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHJlZmVyZW5jZSB0aGUgb3BlcmF0aW9uJ3MgcmVzdWx0LlxuICovXG5hYnN0cmFjdCBjbGFzcyBUY2JPcCB7XG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBpZiB0aGlzIG9wZXJhdGlvbiBjYW4gYmUgY29uc2lkZXJlZCBvcHRpb25hbC4gT3B0aW9uYWwgb3BlcmF0aW9ucyBhcmUgb25seSBleGVjdXRlZFxuICAgKiB3aGVuIGRlcGVuZGVkIHVwb24gYnkgb3RoZXIgb3BlcmF0aW9ucywgb3RoZXJ3aXNlIHRoZXkgYXJlIGRpc3JlZ2FyZGVkLiBUaGlzIGFsbG93cyBmb3IgbGVzc1xuICAgKiBjb2RlIHRvIGdlbmVyYXRlLCBwYXJzZSBhbmQgdHlwZS1jaGVjaywgb3ZlcmFsbCBwb3NpdGl2ZWx5IGNvbnRyaWJ1dGluZyB0byBwZXJmb3JtYW5jZS5cbiAgICovXG4gIGFic3RyYWN0IHJlYWRvbmx5IG9wdGlvbmFsOiBib29sZWFuO1xuXG4gIGFic3RyYWN0IGV4ZWN1dGUoKTogdHMuRXhwcmVzc2lvbnxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXBsYWNlbWVudCB2YWx1ZSBvciBvcGVyYXRpb24gdXNlZCB3aGlsZSB0aGlzIGBUY2JPcGAgaXMgZXhlY3V0aW5nIChpLmUuIHRvIHJlc29sdmUgY2lyY3VsYXJcbiAgICogcmVmZXJlbmNlcyBkdXJpbmcgaXRzIGV4ZWN1dGlvbikuXG4gICAqXG4gICAqIFRoaXMgaXMgdXN1YWxseSBhIGBudWxsIWAgZXhwcmVzc2lvbiAod2hpY2ggYXNrcyBUUyB0byBpbmZlciBhbiBhcHByb3ByaWF0ZSB0eXBlKSwgYnV0IGFub3RoZXJcbiAgICogYFRjYk9wYCBjYW4gYmUgcmV0dXJuZWQgaW4gY2FzZXMgd2hlcmUgYWRkaXRpb25hbCBjb2RlIGdlbmVyYXRpb24gaXMgbmVjZXNzYXJ5IHRvIGRlYWwgd2l0aFxuICAgKiBjaXJjdWxhciByZWZlcmVuY2VzLlxuICAgKi9cbiAgY2lyY3VsYXJGYWxsYmFjaygpOiBUY2JPcHx0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUjtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIGEgbmF0aXZlIERPTSBlbGVtZW50IChvciB3ZWIgY29tcG9uZW50KSBmcm9tIGFcbiAqIGBUbXBsQXN0RWxlbWVudGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGVsZW1lbnQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYkVsZW1lbnRPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgZm9yIHR5cGUtaW5mZXJlbmNlIG9mIHRoZSBET01cbiAgICAvLyBlbGVtZW50J3MgdHlwZSBhbmQgd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWxcbiAgICAvLyB0byBhdm9pZCBnZW5lcmF0aW5nIHN0YXRlbWVudHMgZm9yIERPTSBlbGVtZW50cyB0aGF0IGFyZSBuZXZlciByZWZlcmVuY2VkLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAvLyBBZGQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBlbGVtZW50IHVzaW5nIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQuXG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0c0NyZWF0ZUVsZW1lbnQodGhpcy5lbGVtZW50Lm5hbWUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMuZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5lbGVtZW50LnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNyZWF0ZXMgYW4gZXhwcmVzc2lvbiBmb3IgcGFydGljdWxhciBsZXQtIGBUbXBsQXN0VmFyaWFibGVgIG9uIGFcbiAqIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY29udGV4dC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgdmFyaWFibGUgdmFyaWFibGUgKGxvbCkuXG4gKi9cbmNsYXNzIFRjYlZhcmlhYmxlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUsXG4gICAgICBwcml2YXRlIHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gTG9vayBmb3IgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuXG4gICAgLy8gQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIFRtcGxBc3RWYXJpYWJsZSwgYW5kIGluaXRpYWxpemUgaXQgdG8gYSByZWFkIG9mIHRoZSB2YXJpYWJsZVxuICAgIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjb250ZXh0LlxuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgIC8qIGV4cHJlc3Npb24gKi8gY3R4LFxuICAgICAgICAvKiBuYW1lICovIHRoaXMudmFyaWFibGUudmFsdWUgfHwgJyRpbXBsaWNpdCcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMudmFyaWFibGUuc291cmNlU3Bhbik7XG5cbiAgICAvLyBEZWNsYXJlIHRoZSB2YXJpYWJsZSwgYW5kIHJldHVybiBpdHMgaWRlbnRpZmllci5cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgYSB2YXJpYWJsZSBmb3IgYSBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHRlbXBsYXRlJ3MgY29udGV4dCB2YXJpYWJsZS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVDb250ZXh0T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICAvLyBBbGxvY2F0ZSBhIHRlbXBsYXRlIGN0eCB2YXJpYWJsZSBhbmQgZGVjbGFyZSBpdCB3aXRoIGFuICdhbnknIHR5cGUuIFRoZSB0eXBlIG9mIHRoaXMgdmFyaWFibGVcbiAgICAvLyBtYXkgYmUgbmFycm93ZWQgYXMgYSByZXN1bHQgb2YgdGVtcGxhdGUgZ3VhcmQgY29uZGl0aW9ucy5cbiAgICBjb25zdCBjdHggPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGN0eCwgdHlwZSkpO1xuICAgIHJldHVybiBjdHg7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZGVzY2VuZHMgaW50byBhIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY2hpbGRyZW4gYW5kIGdlbmVyYXRlcyB0eXBlLWNoZWNraW5nIGNvZGUgZm9yXG4gKiB0aGVtLlxuICpcbiAqIFRoaXMgb3BlcmF0aW9uIHdyYXBzIHRoZSBjaGlsZHJlbidzIHR5cGUtY2hlY2tpbmcgY29kZSBpbiBhbiBgaWZgIGJsb2NrLCB3aGljaCBtYXkgaW5jbHVkZSBvbmVcbiAqIG9yIG1vcmUgdHlwZSBndWFyZCBjb25kaXRpb25zIHRoYXQgbmFycm93IHR5cGVzIHdpdGhpbiB0aGUgdGVtcGxhdGUgYm9keS5cbiAqL1xuY2xhc3MgVGNiVGVtcGxhdGVCb2R5T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIC8vIEFuIGBpZmAgd2lsbCBiZSBjb25zdHJ1Y3RlZCwgd2l0aGluIHdoaWNoIHRoZSB0ZW1wbGF0ZSdzIGNoaWxkcmVuIHdpbGwgYmUgdHlwZSBjaGVja2VkLiBUaGVcbiAgICAvLyBgaWZgIGlzIHVzZWQgZm9yIHR3byByZWFzb25zOiBpdCBjcmVhdGVzIGEgbmV3IHN5bnRhY3RpYyBzY29wZSwgaXNvbGF0aW5nIHZhcmlhYmxlcyBkZWNsYXJlZFxuICAgIC8vIGluIHRoZSB0ZW1wbGF0ZSdzIFRDQiBmcm9tIHRoZSBvdXRlciBjb250ZXh0LCBhbmQgaXQgYWxsb3dzIGFueSBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZXNcbiAgICAvLyB0byBwZXJmb3JtIHR5cGUgbmFycm93aW5nIG9mIGVpdGhlciBleHByZXNzaW9ucyBvciB0aGUgdGVtcGxhdGUncyBjb250ZXh0LlxuICAgIC8vXG4gICAgLy8gVGhlIGd1YXJkIGlzIHRoZSBgaWZgIGJsb2NrJ3MgY29uZGl0aW9uLiBJdCdzIHVzdWFsbHkgc2V0IHRvIGB0cnVlYCBidXQgZGlyZWN0aXZlcyB0aGF0IGV4aXN0XG4gICAgLy8gb24gdGhlIHRlbXBsYXRlIGNhbiB0cmlnZ2VyIGV4dHJhIGd1YXJkIGV4cHJlc3Npb25zIHRoYXQgc2VydmUgdG8gbmFycm93IHR5cGVzIHdpdGhpbiB0aGVcbiAgICAvLyBgaWZgLiBgZ3VhcmRgIGlzIGNhbGN1bGF0ZWQgYnkgc3RhcnRpbmcgd2l0aCBgdHJ1ZWAgYW5kIGFkZGluZyBvdGhlciBjb25kaXRpb25zIGFzIG5lZWRlZC5cbiAgICAvLyBDb2xsZWN0IHRoZXNlIGludG8gYGd1YXJkc2AgYnkgcHJvY2Vzc2luZyB0aGUgZGlyZWN0aXZlcy5cbiAgICBjb25zdCBkaXJlY3RpdmVHdWFyZHM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUodGhpcy50ZW1wbGF0ZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgZGlySW5zdElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUsIGRpcik7XG4gICAgICAgIGNvbnN0IGRpcklkID1cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2UoZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuXG4gICAgICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ3VhcmRzLiBUZW1wbGF0ZSBndWFyZHMgKG5nVGVtcGxhdGVHdWFyZHMpIGFsbG93IHR5cGUgbmFycm93aW5nIG9mXG4gICAgICAgIC8vIHRoZSBleHByZXNzaW9uIHBhc3NlZCB0byBhbiBASW5wdXQgb2YgdGhlIGRpcmVjdGl2ZS4gU2NhbiB0aGUgZGlyZWN0aXZlIHRvIHNlZSBpZiBpdCBoYXNcbiAgICAgICAgLy8gYW55IHRlbXBsYXRlIGd1YXJkcywgYW5kIGdlbmVyYXRlIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgICBkaXIubmdUZW1wbGF0ZUd1YXJkcy5mb3JFYWNoKGd1YXJkID0+IHtcbiAgICAgICAgICAvLyBGb3IgZWFjaCB0ZW1wbGF0ZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlLCBsb29rIGZvciBhIGJpbmRpbmcgdG8gdGhhdCBpbnB1dC5cbiAgICAgICAgICBjb25zdCBib3VuZElucHV0ID0gdGhpcy50ZW1wbGF0ZS5pbnB1dHMuZmluZChpID0+IGkubmFtZSA9PT0gZ3VhcmQuaW5wdXROYW1lKSB8fFxuICAgICAgICAgICAgICB0aGlzLnRlbXBsYXRlLnRlbXBsYXRlQXR0cnMuZmluZChcbiAgICAgICAgICAgICAgICAgIChpOiBUbXBsQXN0VGV4dEF0dHJpYnV0ZXxUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpOiBpIGlzIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSA9PlxuICAgICAgICAgICAgICAgICAgICAgIGkgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgaS5uYW1lID09PSBndWFyZC5pbnB1dE5hbWUpO1xuICAgICAgICAgIGlmIChib3VuZElucHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIHN1Y2ggYSBiaW5kaW5nLCBnZW5lcmF0ZSBhbiBleHByZXNzaW9uIGZvciBpdC5cbiAgICAgICAgICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJvdW5kSW5wdXQudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcblxuICAgICAgICAgICAgLy8gVGhlIGV4cHJlc3Npb24gaGFzIGFscmVhZHkgYmVlbiBjaGVja2VkIGluIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGludm9jYXRpb24sIHNvXG4gICAgICAgICAgICAvLyBpdCBzaG91bGQgYmUgaWdub3JlZCB3aGVuIHVzZWQgd2l0aGluIGEgdGVtcGxhdGUgZ3VhcmQuXG4gICAgICAgICAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3MoZXhwcik7XG5cbiAgICAgICAgICAgIGlmIChndWFyZC50eXBlID09PSAnYmluZGluZycpIHtcbiAgICAgICAgICAgICAgLy8gVXNlIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24gaXRzZWxmIGFzIGd1YXJkLlxuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIENhbGwgdGhlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUgd2l0aCB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGFuZCB0aGF0XG4gICAgICAgICAgICAgIC8vIGV4cHJlc3Npb24uXG4gICAgICAgICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCBgbmdUZW1wbGF0ZUd1YXJkXyR7Z3VhcmQuaW5wdXROYW1lfWAsIFtcbiAgICAgICAgICAgICAgICBkaXJJbnN0SWQsXG4gICAgICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8oZ3VhcmRJbnZva2UsIGJvdW5kSW5wdXQudmFsdWUuc291cmNlU3Bhbik7XG4gICAgICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRoZSBzZWNvbmQga2luZCBvZiBndWFyZCBpcyBhIHRlbXBsYXRlIGNvbnRleHQgZ3VhcmQuIFRoaXMgZ3VhcmQgbmFycm93cyB0aGUgdGVtcGxhdGVcbiAgICAgICAgLy8gcmVuZGVyaW5nIGNvbnRleHQgdmFyaWFibGUgYGN0eGAuXG4gICAgICAgIGlmIChkaXIuaGFzTmdUZW1wbGF0ZUNvbnRleHRHdWFyZCAmJiB0aGlzLnRjYi5lbnYuY29uZmlnLmFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzKSB7XG4gICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCAnbmdUZW1wbGF0ZUNvbnRleHRHdWFyZCcsIFtkaXJJbnN0SWQsIGN0eF0pO1xuICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8oZ3VhcmRJbnZva2UsIHRoaXMudGVtcGxhdGUuc291cmNlU3Bhbik7XG4gICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQnkgZGVmYXVsdCB0aGUgZ3VhcmQgaXMgc2ltcGx5IGB0cnVlYC5cbiAgICBsZXQgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGd1YXJkcyBmcm9tIGRpcmVjdGl2ZXMsIHVzZSB0aGVtIGluc3RlYWQuXG4gICAgaWYgKGRpcmVjdGl2ZUd1YXJkcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBQb3AgdGhlIGZpcnN0IHZhbHVlIGFuZCB1c2UgaXQgYXMgdGhlIGluaXRpYWxpemVyIHRvIHJlZHVjZSgpLiBUaGlzIHdheSwgYSBzaW5nbGUgZ3VhcmRcbiAgICAgIC8vIHdpbGwgYmUgdXNlZCBvbiBpdHMgb3duLCBidXQgdHdvIG9yIG1vcmUgd2lsbCBiZSBjb21iaW5lZCBpbnRvIGJpbmFyeSBBTkQgZXhwcmVzc2lvbnMuXG4gICAgICBndWFyZCA9IGRpcmVjdGl2ZUd1YXJkcy5yZWR1Y2UoXG4gICAgICAgICAgKGV4cHIsIGRpckd1YXJkKSA9PlxuICAgICAgICAgICAgICB0cy5jcmVhdGVCaW5hcnkoZXhwciwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgZGlyR3VhcmQpLFxuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wb3AoKSEpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBTY29wZSBmb3IgdGhlIHRlbXBsYXRlLiBUaGlzIGNvbnN0cnVjdHMgdGhlIGxpc3Qgb2Ygb3BlcmF0aW9ucyBmb3IgdGhlIHRlbXBsYXRlXG4gICAgLy8gY2hpbGRyZW4sIGFzIHdlbGwgYXMgdHJhY2tzIGJpbmRpbmdzIHdpdGhpbiB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgdG1wbFNjb3BlID0gU2NvcGUuZm9yTm9kZXModGhpcy50Y2IsIHRoaXMuc2NvcGUsIHRoaXMudGVtcGxhdGUsIGd1YXJkKTtcblxuICAgIC8vIFJlbmRlciB0aGUgdGVtcGxhdGUncyBgU2NvcGVgIGludG8gaXRzIHN0YXRlbWVudHMuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHRtcGxTY29wZS5yZW5kZXIoKTtcbiAgICBpZiAoc3RhdGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIEFzIGFuIG9wdGltaXphdGlvbiwgZG9uJ3QgZ2VuZXJhdGUgdGhlIHNjb3BlJ3MgYmxvY2sgaWYgaXQgaGFzIG5vIHN0YXRlbWVudHMuIFRoaXMgaXNcbiAgICAgIC8vIGJlbmVmaWNpYWwgZm9yIHRlbXBsYXRlcyB0aGF0IGNvbnRhaW4gZm9yIGV4YW1wbGUgYDxzcGFuICpuZ0lmPVwiZmlyc3RcIj48L3NwYW4+YCwgaW4gd2hpY2hcbiAgICAgIC8vIGNhc2UgdGhlcmUncyBubyBuZWVkIHRvIHJlbmRlciB0aGUgYE5nSWZgIGd1YXJkIGV4cHJlc3Npb24uIFRoaXMgc2VlbXMgbGlrZSBhIG1pbm9yXG4gICAgICAvLyBpbXByb3ZlbWVudCwgaG93ZXZlciBpdCByZWR1Y2VzIHRoZSBudW1iZXIgb2YgZmxvdy1ub2RlIGFudGVjZWRlbnRzIHRoYXQgVHlwZVNjcmlwdCBuZWVkc1xuICAgICAgLy8gdG8ga2VlcCBpbnRvIGFjY291bnQgZm9yIHN1Y2ggY2FzZXMsIHJlc3VsdGluZyBpbiBhbiBvdmVyYWxsIHJlZHVjdGlvbiBvZlxuICAgICAgLy8gdHlwZS1jaGVja2luZyB0aW1lLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHRtcGxCbG9jazogdHMuU3RhdGVtZW50ID0gdHMuY3JlYXRlQmxvY2soc3RhdGVtZW50cyk7XG4gICAgaWYgKGd1YXJkICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGUgc2NvcGUgaGFzIGEgZ3VhcmQgdGhhdCBuZWVkcyB0byBiZSBhcHBsaWVkLCBzbyB3cmFwIHRoZSB0ZW1wbGF0ZSBibG9jayBpbnRvIGFuIGBpZmBcbiAgICAgIC8vIHN0YXRlbWVudCBjb250YWluaW5nIHRoZSBndWFyZCBleHByZXNzaW9uLlxuICAgICAgdG1wbEJsb2NrID0gdHMuY3JlYXRlSWYoLyogZXhwcmVzc2lvbiAqLyBndWFyZCwgLyogdGhlblN0YXRlbWVudCAqLyB0bXBsQmxvY2spO1xuICAgIH1cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0bXBsQmxvY2spO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggcmVuZGVycyBhIHRleHQgYmluZGluZyAoaW50ZXJwb2xhdGlvbikgaW50byB0aGUgVENCLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlRleHRJbnRlcnBvbGF0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBiaW5kaW5nOiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKHRoaXMuYmluZGluZy52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUgX3dpdGhvdXRfIHNldHRpbmcgYW55IG9mIGl0cyBpbnB1dHMuIElucHV0c1xuICogYXJlIGxhdGVyIHNldCBpbiB0aGUgYFRjYkRpcmVjdGl2ZUlucHV0c09wYC4gVHlwZSBjaGVja2luZyB3YXMgZm91bmQgdG8gYmUgZmFzdGVyIHdoZW4gZG9uZSBpblxuICogdGhpcyB3YXkgYXMgb3Bwb3NlZCB0byBgVGNiRGlyZWN0aXZlQ3Rvck9wYCB3aGljaCBpcyBvbmx5IG5lY2Vzc2FyeSB3aGVuIHRoZSBkaXJlY3RpdmUgaXNcbiAqIGdlbmVyaWMuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB2YXJpYWJsZSB3aXRoIGl0cyBpbmZlcnJlZFxuICogdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlVHlwZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgZ2VuZXJhdGVkIGJ5IHRoaXMgb3BlcmF0aW9uIGlzIG9ubHkgdXNlZCB0byBkZWNsYXJlIHRoZSBkaXJlY3RpdmUncyB0eXBlIGFuZFxuICAgIC8vIHdvbid0IHJlcG9ydCBkaWFnbm9zdGljcyBieSBpdHNlbGYsIHNvIHRoZSBvcGVyYXRpb24gaXMgbWFya2VkIGFzIG9wdGlvbmFsIHRvIGF2b2lkXG4gICAgLy8gZ2VuZXJhdGluZyBkZWNsYXJhdGlvbnMgZm9yIGRpcmVjdGl2ZXMgdGhhdCBkb24ndCBoYXZlIGFueSBpbnB1dHMvb3V0cHV0cy5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG5cbiAgICBjb25zdCB0eXBlID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICBhZGRFeHByZXNzaW9uSWRlbnRpZmllcih0eXBlLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8odHlwZSwgdGhpcy5ub2RlLnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhIHZhcmlhYmxlIGZvciBhIGxvY2FsIHJlZiBpbiBhIHRlbXBsYXRlLlxuICogVGhlIGluaXRpYWxpemVyIGZvciB0aGUgdmFyaWFibGUgaXMgdGhlIHZhcmlhYmxlIGV4cHJlc3Npb24gZm9yIHRoZSBkaXJlY3RpdmUsIHRlbXBsYXRlLCBvclxuICogZWxlbWVudCB0aGUgcmVmIHJlZmVycyB0by4gV2hlbiB0aGUgcmVmZXJlbmNlIGlzIHVzZWQgaW4gdGhlIHRlbXBsYXRlLCB0aG9zZSBUQ0Igc3RhdGVtZW50cyB3aWxsXG4gKiBhY2Nlc3MgdGhpcyB2YXJpYWJsZSBhcyB3ZWxsLiBGb3IgZXhhbXBsZTpcbiAqIGBgYFxuICogdmFyIF90MSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICogdmFyIF90MiA9IF90MTtcbiAqIF90Mi52YWx1ZVxuICogYGBgXG4gKiBUaGlzIG9wZXJhdGlvbiBzdXBwb3J0cyBtb3JlIGZsdWVudCBsb29rdXBzIGZvciB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIHdoZW4gZ2V0dGluZyBhIHN5bWJvbFxuICogZm9yIGEgcmVmZXJlbmNlLiBJbiBtb3N0IGNhc2VzLCB0aGlzIGlzbid0IGVzc2VudGlhbDsgdGhhdCBpcywgdGhlIGluZm9ybWF0aW9uIGZvciB0aGUgc3ltYm9sXG4gKiBjb3VsZCBiZSBnYXRoZXJlZCB3aXRob3V0IHRoaXMgb3BlcmF0aW9uIHVzaW5nIHRoZSBgQm91bmRUYXJnZXRgLiBIb3dldmVyLCBmb3IgdGhlIGNhc2Ugb2ZcbiAqIG5nLXRlbXBsYXRlIHJlZmVyZW5jZXMsIHdlIHdpbGwgbmVlZCB0aGlzIHJlZmVyZW5jZSB2YXJpYWJsZSB0byBub3Qgb25seSBwcm92aWRlIGEgbG9jYXRpb24gaW5cbiAqIHRoZSBzaGltIGZpbGUsIGJ1dCBhbHNvIHRvIG5hcnJvdyB0aGUgdmFyaWFibGUgdG8gdGhlIGNvcnJlY3QgYFRlbXBsYXRlUmVmPFQ+YCB0eXBlIHJhdGhlciB0aGFuXG4gKiBgVGVtcGxhdGVSZWY8YW55PmAgKHRoaXMgd29yayBpcyBzdGlsbCBUT0RPKS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JSZWZlcmVuY2VPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRjYjogQ29udGV4dCwgcHJpdmF0ZSByZWFkb25seSBzY29wZTogU2NvcGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IFRtcGxBc3RSZWZlcmVuY2UsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIHRvIGZvciB0aGUgVHlwZSBDaGVja2VyXG4gIC8vIHNvIGl0IGNhbiBtYXAgYSByZWZlcmVuY2UgdmFyaWFibGUgaW4gdGhlIHRlbXBsYXRlIGRpcmVjdGx5IHRvIGEgbm9kZSBpbiB0aGUgVENCLlxuICByZWFkb25seSBvcHRpb25hbCA9IHRydWU7XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBsZXQgaW5pdGlhbGl6ZXIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoXG4gICAgICAgIHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgP1xuICAgICAgICAgICAgdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGFyZ2V0KSA6XG4gICAgICAgICAgICB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ob3N0LCB0aGlzLnRhcmdldCkpO1xuXG4gICAgLy8gVGhlIHJlZmVyZW5jZSBpcyBlaXRoZXIgdG8gYW4gZWxlbWVudCwgYW4gPG5nLXRlbXBsYXRlPiBub2RlLCBvciB0byBhIGRpcmVjdGl2ZSBvbiBhblxuICAgIC8vIGVsZW1lbnQgb3IgdGVtcGxhdGUuXG4gICAgaWYgKCh0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmICF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcykgfHxcbiAgICAgICAgIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzKSB7XG4gICAgICAvLyBSZWZlcmVuY2VzIHRvIERPTSBub2RlcyBhcmUgcGlubmVkIHRvICdhbnknIHdoZW4gYGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlc2AgaXMgYGZhbHNlYC5cbiAgICAgIC8vIFJlZmVyZW5jZXMgdG8gYFRlbXBsYXRlUmVmYHMgYW5kIGRpcmVjdGl2ZXMgYXJlIHBpbm5lZCB0byAnYW55JyB3aGVuXG4gICAgICAvLyBgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzYCBpcyBgZmFsc2VgLlxuICAgICAgaW5pdGlhbGl6ZXIgPVxuICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihpbml0aWFsaXplciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIERpcmVjdCByZWZlcmVuY2VzIHRvIGFuIDxuZy10ZW1wbGF0ZT4gbm9kZSBzaW1wbHkgcmVxdWlyZSBhIHZhbHVlIG9mIHR5cGVcbiAgICAgIC8vIGBUZW1wbGF0ZVJlZjxhbnk+YC4gVG8gZ2V0IHRoaXMsIGFuIGV4cHJlc3Npb24gb2YgdGhlIGZvcm1cbiAgICAgIC8vIGAoX3QxIGFzIGFueSBhcyBUZW1wbGF0ZVJlZjxhbnk+KWAgaXMgY29uc3RydWN0ZWQuXG4gICAgICBpbml0aWFsaXplciA9XG4gICAgICAgICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKGluaXRpYWxpemVyLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICBpbml0aWFsaXplciA9IHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihcbiAgICAgICAgICBpbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9jb3JlJywgJ1RlbXBsYXRlUmVmJywgW0RZTkFNSUNfVFlQRV0pKTtcbiAgICAgIGluaXRpYWxpemVyID0gdHMuY3JlYXRlUGFyZW4oaW5pdGlhbGl6ZXIpO1xuICAgIH1cbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG5cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjb25zdHJ1Y3RzIGFuIGluc3RhbmNlIG9mIGEgZGlyZWN0aXZlIHdpdGggdHlwZXMgaW5mZXJyZWQgZnJvbSBpdHMgaW5wdXRzLiBUaGVcbiAqIGlucHV0cyB0aGVtc2VsdmVzIGFyZSBub3QgY2hlY2tlZCBoZXJlOyBjaGVja2luZyBvZiBpbnB1dHMgaXMgYWNoaWV2ZWQgaW4gYFRjYkRpcmVjdGl2ZUlucHV0c09wYC5cbiAqIEFueSBlcnJvcnMgcmVwb3J0ZWQgaW4gdGhpcyBzdGF0ZW1lbnQgYXJlIGlnbm9yZWQsIGFzIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGNhbGwgaXMgb25seSBwcmVzZW50XG4gKiBmb3IgdHlwZS1pbmZlcmVuY2UuXG4gKlxuICogV2hlbiBhIERpcmVjdGl2ZSBpcyBnZW5lcmljLCBpdCBpcyByZXF1aXJlZCB0aGF0IHRoZSBUQ0IgZ2VuZXJhdGVzIHRoZSBpbnN0YW5jZSB1c2luZyB0aGlzIG1ldGhvZFxuICogaW4gb3JkZXIgdG8gaW5mZXIgdGhlIHR5cGUgaW5mb3JtYXRpb24gY29ycmVjdGx5LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUN0b3JPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgdG8gaW5mZXIgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgYW5kXG4gICAgLy8gd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWwuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKGlkLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaWQsIHRoaXMubm9kZS5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuXG4gICAgY29uc3QgZ2VuZXJpY0lucHV0cyA9IG5ldyBNYXA8c3RyaW5nLCBUY2JEaXJlY3RpdmVJbnB1dD4oKTtcblxuICAgIGNvbnN0IGlucHV0cyA9IGdldEJvdW5kSW5wdXRzKHRoaXMuZGlyLCB0aGlzLm5vZGUsIHRoaXMudGNiKTtcbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIGlucHV0cykge1xuICAgICAgZm9yIChjb25zdCBmaWVsZE5hbWUgb2YgaW5wdXQuZmllbGROYW1lcykge1xuICAgICAgICAvLyBTa2lwIHRoZSBmaWVsZCBpZiBhbiBhdHRyaWJ1dGUgaGFzIGFscmVhZHkgYmVlbiBib3VuZCB0byBpdDsgd2UgY2FuJ3QgaGF2ZSBhIGR1cGxpY2F0ZVxuICAgICAgICAvLyBrZXkgaW4gdGhlIHR5cGUgY29uc3RydWN0b3IgY2FsbC5cbiAgICAgICAgaWYgKGdlbmVyaWNJbnB1dHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0cmFuc2xhdGVJbnB1dChpbnB1dC5hdHRyaWJ1dGUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgICAgZ2VuZXJpY0lucHV0cy5zZXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgdHlwZTogJ2JpbmRpbmcnLFxuICAgICAgICAgIGZpZWxkOiBmaWVsZE5hbWUsXG4gICAgICAgICAgZXhwcmVzc2lvbixcbiAgICAgICAgICBzb3VyY2VTcGFuOiBpbnB1dC5hdHRyaWJ1dGUuc291cmNlU3BhblxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgdW5zZXQgZGlyZWN0aXZlIGlucHV0cyBmb3IgZWFjaCBvZiB0aGUgcmVtYWluaW5nIHVuc2V0IGZpZWxkcy5cbiAgICBmb3IgKGNvbnN0IFtmaWVsZE5hbWVdIG9mIHRoaXMuZGlyLmlucHV0cykge1xuICAgICAgaWYgKCFnZW5lcmljSW5wdXRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgIGdlbmVyaWNJbnB1dHMuc2V0KGZpZWxkTmFtZSwge3R5cGU6ICd1bnNldCcsIGZpZWxkOiBmaWVsZE5hbWV9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIHRoZSBkaXJlY3RpdmUgdG8gaW5mZXIgYSB0eXBlLCBhbmQgYXNzaWduIHRoZSBkaXJlY3RpdmVcbiAgICAvLyBpbnN0YW5jZS5cbiAgICBjb25zdCB0eXBlQ3RvciA9IHRjYkNhbGxUeXBlQ3Rvcih0aGlzLmRpciwgdGhpcy50Y2IsIEFycmF5LmZyb20oZ2VuZXJpY0lucHV0cy52YWx1ZXMoKSkpO1xuICAgIG1hcmtJZ25vcmVEaWFnbm9zdGljcyh0eXBlQ3Rvcik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdHlwZUN0b3IpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBjaXJjdWxhckZhbGxiYWNrKCk6IFRjYk9wIHtcbiAgICByZXR1cm4gbmV3IFRjYkRpcmVjdGl2ZUN0b3JDaXJjdWxhckZhbGxiYWNrT3AodGhpcy50Y2IsIHRoaXMuc2NvcGUsIHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGlucHV0IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBtZW1iZXJzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUlucHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgbGV0IGRpcklkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gVE9ETyhqb29zdCk6IHJlcG9ydCBkdXBsaWNhdGUgcHJvcGVydGllc1xuXG4gICAgY29uc3QgaW5wdXRzID0gZ2V0Qm91bmRJbnB1dHModGhpcy5kaXIsIHRoaXMubm9kZSwgdGhpcy50Y2IpO1xuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XG4gICAgICAvLyBGb3IgYm91bmQgaW5wdXRzLCB0aGUgcHJvcGVydHkgaXMgYXNzaWduZWQgdGhlIGJpbmRpbmcgZXhwcmVzc2lvbi5cbiAgICAgIGxldCBleHByID0gdHJhbnNsYXRlSW5wdXQoaW5wdXQuYXR0cmlidXRlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIGNoZWNraW5nIHRoZSB0eXBlIG9mIGJpbmRpbmdzIGlzIGRpc2FibGVkLCBjYXN0IHRoZSByZXN1bHRpbmcgZXhwcmVzc2lvbiB0byAnYW55J1xuICAgICAgICAvLyBiZWZvcmUgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgIGV4cHIgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGxldCBhc3NpZ25tZW50OiB0cy5FeHByZXNzaW9uID0gd3JhcEZvckRpYWdub3N0aWNzKGV4cHIpO1xuXG4gICAgICBmb3IgKGNvbnN0IGZpZWxkTmFtZSBvZiBpbnB1dC5maWVsZE5hbWVzKSB7XG4gICAgICAgIGxldCB0YXJnZXQ6IHRzLkxlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgIGlmICh0aGlzLmRpci5jb2VyY2VkSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAvLyBUaGUgaW5wdXQgaGFzIGEgY29lcmNpb24gZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIHVzZWQgaW5zdGVhZCBvZiBhc3NpZ25pbmcgdGhlXG4gICAgICAgICAgLy8gZXhwcmVzc2lvbiBpbnRvIHRoZSBpbnB1dCBmaWVsZCBkaXJlY3RseS4gVG8gYWNoaWV2ZSB0aGlzLCBhIHZhcmlhYmxlIGlzIGRlY2xhcmVkXG4gICAgICAgICAgLy8gd2l0aCBhIHR5cGUgb2YgYHR5cGVvZiBEaXJlY3RpdmUubmdBY2NlcHRJbnB1dFR5cGVfZmllbGROYW1lYCB3aGljaCBpcyB0aGVuIHVzZWQgYXNcbiAgICAgICAgICAvLyB0YXJnZXQgb2YgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgICAgY29uc3QgZGlyVHlwZVJlZiA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG4gICAgICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRpclR5cGVSZWYpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7dGhpcy5kaXIucmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAgICAgICBjb25zdCB0eXBlID0gdHNDcmVhdGVUeXBlUXVlcnlGb3JDb2VyY2VkSW5wdXQoZGlyVHlwZVJlZi50eXBlTmFtZSwgZmllbGROYW1lKTtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSkpO1xuXG4gICAgICAgICAgdGFyZ2V0ID0gaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5kaXIudW5kZWNsYXJlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gSWYgbm8gY29lcmNpb24gZGVjbGFyYXRpb24gaXMgcHJlc2VudCBub3IgaXMgdGhlIGZpZWxkIGRlY2xhcmVkIChpLmUuIHRoZSBpbnB1dCBpc1xuICAgICAgICAgIC8vIGRlY2xhcmVkIGluIGEgYEBEaXJlY3RpdmVgIG9yIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IncyBgaW5wdXRzYCBwcm9wZXJ0eSkgdGhlcmUgaXMgbm9cbiAgICAgICAgICAvLyBhc3NpZ25tZW50IHRhcmdldCBhdmFpbGFibGUsIHNvIHRoaXMgZmllbGQgaXMgc2tpcHBlZC5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICF0aGlzLnRjYi5lbnYuY29uZmlnLmhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5ncyAmJlxuICAgICAgICAgICAgdGhpcy5kaXIucmVzdHJpY3RlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIGFjY2VzcyBtb2RpZmllcnMgaXMgZGlzYWJsZWQgYW5kIHRoZSBmaWVsZCBpcyByZXN0cmljdGVkXG4gICAgICAgICAgLy8gKGkuZS4gcHJpdmF0ZS9wcm90ZWN0ZWQvcmVhZG9ubHkpLCBnZW5lcmF0ZSBhbiBhc3NpZ25tZW50IGludG8gYSB0ZW1wb3JhcnkgdmFyaWFibGVcbiAgICAgICAgICAvLyB0aGF0IGhhcyB0aGUgdHlwZSBvZiB0aGUgZmllbGQuIFRoaXMgYWNoaWV2ZXMgdHlwZS1jaGVja2luZyBidXQgY2lyY3VtdmVudHMgdGhlIGFjY2Vzc1xuICAgICAgICAgIC8vIG1vZGlmaWVycy5cbiAgICAgICAgICBpZiAoZGlySWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRpcklkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgICAgICAgIGNvbnN0IGRpclR5cGVSZWYgPSB0aGlzLnRjYi5lbnYucmVmZXJlbmNlVHlwZSh0aGlzLmRpci5yZWYpO1xuICAgICAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkaXJUeXBlUmVmKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke3RoaXMuZGlyLnJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVJbmRleGVkQWNjZXNzVHlwZU5vZGUoXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZVR5cGVRdWVyeU5vZGUoZGlySWQgYXMgdHMuSWRlbnRpZmllciksXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkTmFtZSkpKTtcbiAgICAgICAgICBjb25zdCB0ZW1wID0gdHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRlbXApO1xuICAgICAgICAgIHRhcmdldCA9IGlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChkaXJJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVG8gZ2V0IGVycm9ycyBhc3NpZ24gZGlyZWN0bHkgdG8gdGhlIGZpZWxkcyBvbiB0aGUgaW5zdGFuY2UsIHVzaW5nIHByb3BlcnR5IGFjY2Vzc1xuICAgICAgICAgIC8vIHdoZW4gcG9zc2libGUuIFN0cmluZyBsaXRlcmFsIGZpZWxkcyBtYXkgbm90IGJlIHZhbGlkIEpTIGlkZW50aWZpZXJzIHNvIHdlIHVzZVxuICAgICAgICAgIC8vIGxpdGVyYWwgZWxlbWVudCBhY2Nlc3MgaW5zdGVhZCBmb3IgdGhvc2UgY2FzZXMuXG4gICAgICAgICAgdGFyZ2V0ID0gdGhpcy5kaXIuc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpID9cbiAgICAgICAgICAgICAgdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZE5hbWUpKSA6XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVJZGVudGlmaWVyKGZpZWxkTmFtZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluYWxseSB0aGUgYXNzaWdubWVudCBpcyBleHRlbmRlZCBieSBhc3NpZ25pbmcgaXQgaW50byB0aGUgdGFyZ2V0IGV4cHJlc3Npb24uXG4gICAgICAgIGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBhc3NpZ25tZW50KTtcbiAgICAgIH1cblxuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhhc3NpZ25tZW50LCBpbnB1dC5hdHRyaWJ1dGUuc291cmNlU3Bhbik7XG4gICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGFzc2lnbm1lbnQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgZmFsbGJhY2sgZXhwcmVzc2lvbiBpZiB0aGUgaW5mZXJlbmNlIG9mIGEgZGlyZWN0aXZlIHR5cGVcbiAqIHZpYSBgVGNiRGlyZWN0aXZlQ3Rvck9wYCByZXF1aXJlcyBhIHJlZmVyZW5jZSB0byBpdHMgb3duIHR5cGUuIFRoaXMgY2FuIGhhcHBlbiB1c2luZyBhIHRlbXBsYXRlXG4gKiByZWZlcmVuY2U6XG4gKlxuICogYGBgaHRtbFxuICogPHNvbWUtY21wICNyZWYgW3Byb3BdPVwicmVmLmZvb1wiPjwvc29tZS1jbXA+XG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wYCB3aWxsIGFkZCBhIHNlY29uZCBpbmZlcmVuY2Ugb2YgdGhlIGRpcmVjdGl2ZVxuICogdHlwZSB0byB0aGUgdHlwZS1jaGVjayBibG9jaywgdGhpcyB0aW1lIGNhbGxpbmcgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgY29uc3RydWN0b3Igd2l0aG91dCBhbnlcbiAqIGlucHV0IGV4cHJlc3Npb25zLiBUaGlzIGluZmVycyB0aGUgd2lkZXN0IHBvc3NpYmxlIHN1cGVydHlwZSBmb3IgdGhlIGRpcmVjdGl2ZSwgd2hpY2ggaXMgdXNlZCB0b1xuICogcmVzb2x2ZSBhbnkgcmVjdXJzaXZlIHJlZmVyZW5jZXMgcmVxdWlyZWQgdG8gaW5mZXIgdGhlIHJlYWwgdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IHR5cGVDdG9yID0gdGhpcy50Y2IuZW52LnR5cGVDdG9yRm9yKHRoaXMuZGlyKTtcbiAgICBjb25zdCBjaXJjdWxhclBsYWNlaG9sZGVyID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgdHlwZUN0b3IsIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKV0pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGNpcmN1bGFyUGxhY2Vob2xkZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZmVlZHMgZWxlbWVudHMgYW5kIHVuY2xhaW1lZCBwcm9wZXJ0aWVzIHRvIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAuXG4gKlxuICogVGhlIERPTSBzY2hlbWEgaXMgbm90IGNoZWNrZWQgdmlhIFRDQiBjb2RlIGdlbmVyYXRpb24uIEluc3RlYWQsIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW5nZXN0c1xuICogZWxlbWVudHMgYW5kIHByb3BlcnR5IGJpbmRpbmdzIGFuZCBhY2N1bXVsYXRlcyBzeW50aGV0aWMgYHRzLkRpYWdub3N0aWNgcyBvdXQtb2YtYmFuZC4gVGhlc2UgYXJlXG4gKiBsYXRlciBtZXJnZWQgd2l0aCB0aGUgZGlhZ25vc3RpY3MgZ2VuZXJhdGVkIGZyb20gdGhlIFRDQi5cbiAqXG4gKiBGb3IgY29udmVuaWVuY2UsIHRoZSBUQ0IgaXRlcmF0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpcyB1c2VkIHRvIGRyaXZlIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgdmlhXG4gKiB0aGUgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKi9cbmNsYXNzIFRjYkRvbVNjaGVtYUNoZWNrZXJPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgcHJpdmF0ZSBjaGVja0VsZW1lbnQ6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHRoaXMuY2hlY2tFbGVtZW50KSB7XG4gICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrRWxlbWVudCh0aGlzLnRjYi5pZCwgdGhpcy5lbGVtZW50LCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrUHJvcGVydHkoXG4gICAgICAgICAgICAgIHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHByb3BlcnR5TmFtZSwgYmluZGluZy5zb3VyY2VTcGFuLCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5cbi8qKlxuICogTWFwcGluZyBiZXR3ZWVuIGF0dHJpYnV0ZXMgbmFtZXMgdGhhdCBkb24ndCBjb3JyZXNwb25kIHRvIHRoZWlyIGVsZW1lbnQgcHJvcGVydHkgbmFtZXMuXG4gKiBOb3RlOiB0aGlzIG1hcHBpbmcgaGFzIHRvIGJlIGtlcHQgaW4gc3luYyB3aXRoIHRoZSBlcXVhbGx5IG5hbWVkIG1hcHBpbmcgaW4gdGhlIHJ1bnRpbWUuXG4gKi9cbmNvbnN0IEFUVFJfVE9fUFJPUDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2Zvcm1hY3Rpb24nOiAnZm9ybUFjdGlvbicsXG4gICdpbm5lckh0bWwnOiAnaW5uZXJIVE1MJyxcbiAgJ3JlYWRvbmx5JzogJ3JlYWRPbmx5JyxcbiAgJ3RhYmluZGV4JzogJ3RhYkluZGV4Jyxcbn07XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIGlucHV0c1wiIC0gYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaCB3ZXJlXG4gKiBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MIGVsZW1lbnRcbiAqIGl0c2VsZi5cbiAqXG4gKiBDdXJyZW50bHksIG9ubHkgdGhlIGV4cHJlc3Npb25zIG9mIHRoZXNlIGJpbmRpbmdzIGFyZSBjaGVja2VkLiBUaGUgdGFyZ2V0cyBvZiB0aGUgYmluZGluZ3MgYXJlXG4gKiBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEgdmlhIGEgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkSW5wdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkSW5wdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBgdGhpcy5pbnB1dHNgIGNvbnRhaW5zIG9ubHkgdGhvc2UgYmluZGluZ3Mgbm90IG1hdGNoZWQgYnkgYW55IGRpcmVjdGl2ZS4gVGhlc2UgYmluZGluZ3MgZ28gdG9cbiAgICAvLyB0aGUgZWxlbWVudCBpdHNlbGYuXG4gICAgbGV0IGVsSWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBleHByID0gdGNiRXhwcmVzc2lvbihiaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIGNoZWNraW5nIHRoZSB0eXBlIG9mIGJpbmRpbmdzIGlzIGRpc2FibGVkLCBjYXN0IHRoZSByZXN1bHRpbmcgZXhwcmVzc2lvbiB0byAnYW55J1xuICAgICAgICAvLyBiZWZvcmUgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgIGV4cHIgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tQmluZGluZ3MgJiYgYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgICBpZiAoYmluZGluZy5uYW1lICE9PSAnc3R5bGUnICYmIGJpbmRpbmcubmFtZSAhPT0gJ2NsYXNzJykge1xuICAgICAgICAgIGlmIChlbElkID09PSBudWxsKSB7XG4gICAgICAgICAgICBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEEgZGlyZWN0IGJpbmRpbmcgdG8gYSBwcm9wZXJ0eS5cbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSBBVFRSX1RPX1BST1BbYmluZGluZy5uYW1lXSB8fCBiaW5kaW5nLm5hbWU7XG4gICAgICAgICAgY29uc3QgcHJvcCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZWxJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChwcm9wZXJ0eU5hbWUpKTtcbiAgICAgICAgICBjb25zdCBzdG10ID0gdHMuY3JlYXRlQmluYXJ5KHByb3AsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhzdG10LCBiaW5kaW5nLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBIGJpbmRpbmcgdG8gYW4gYW5pbWF0aW9uLCBhdHRyaWJ1dGUsIGNsYXNzIG9yIHN0eWxlLiBGb3Igbm93LCBvbmx5IHZhbGlkYXRlIHRoZSByaWdodC1cbiAgICAgICAgLy8gaGFuZCBzaWRlIG9mIHRoZSBleHByZXNzaW9uLlxuICAgICAgICAvLyBUT0RPOiBwcm9wZXJseSBjaGVjayBjbGFzcyBhbmQgc3R5bGUgYmluZGluZ3MuXG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBvdXRwdXRzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZGlySWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgY29uc3Qgb3V0cHV0cyA9IHRoaXMuZGlyLm91dHB1dHM7XG5cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiB0aGlzLm5vZGUub3V0cHV0cykge1xuICAgICAgaWYgKG91dHB1dC50eXBlICE9PSBQYXJzZWRFdmVudFR5cGUuUmVndWxhciB8fCAhb3V0cHV0cy5oYXNCaW5kaW5nUHJvcGVydHlOYW1lKG91dHB1dC5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogY29uc2lkZXIgc3VwcG9ydGluZyBtdWx0aXBsZSBmaWVsZHMgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eSBuYW1lIGZvciBvdXRwdXRzLlxuICAgICAgY29uc3QgZmllbGQgPSBvdXRwdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShvdXRwdXQubmFtZSkhWzBdLmNsYXNzUHJvcGVydHlOYW1lO1xuXG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cykge1xuICAgICAgICAvLyBGb3Igc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMsIGdlbmVyYXRlIGEgY2FsbCB0byB0aGUgYHN1YnNjcmliZWAgbWV0aG9kXG4gICAgICAgIC8vIG9uIHRoZSBkaXJlY3RpdmUncyBvdXRwdXQgZmllbGQgdG8gbGV0IHR5cGUgaW5mb3JtYXRpb24gZmxvdyBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uJ3NcbiAgICAgICAgLy8gYCRldmVudGAgcGFyYW1ldGVyLlxuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlIHRoYXQgdGhlIGBFdmVudEVtaXR0ZXI8VD5gIHR5cGUgZnJvbSAnQGFuZ3VsYXIvY29yZScgdGhhdCBpcyB0eXBpY2FsbHkgdXNlZCBmb3JcbiAgICAgICAgLy8gb3V0cHV0cyBoYXMgYSB0eXBpbmdzIGRlZmljaWVuY3kgaW4gaXRzIGBzdWJzY3JpYmVgIG1ldGhvZC4gVGhlIGdlbmVyaWMgdHlwZSBgVGAgaXMgbm90XG4gICAgICAgIC8vIGNhcnJpZWQgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbiwgd2hpY2ggaXMgdml0YWwgZm9yIGluZmVyZW5jZSBvZiB0aGUgdHlwZSBvZiBgJGV2ZW50YC5cbiAgICAgICAgLy8gQXMgYSB3b3JrYXJvdW5kLCB0aGUgZGlyZWN0aXZlJ3MgZmllbGQgaXMgcGFzc2VkIGludG8gYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBoYXMgYVxuICAgICAgICAvLyBzcGVjaWFsbHkgY3JhZnRlZCBzZXQgb2Ygc2lnbmF0dXJlcywgdG8gZWZmZWN0aXZlbHkgY2FzdCBgRXZlbnRFbWl0dGVyPFQ+YCB0byBzb21ldGhpbmdcbiAgICAgICAgLy8gdGhhdCBoYXMgYSBgc3Vic2NyaWJlYCBtZXRob2QgdGhhdCBwcm9wZXJseSBjYXJyaWVzIHRoZSBgVGAgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG5cbiAgICAgICAgaWYgKGRpcklkID09PSBudWxsKSB7XG4gICAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3V0cHV0RmllbGQgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkKSk7XG4gICAgICAgIGNvbnN0IG91dHB1dEhlbHBlciA9XG4gICAgICAgICAgICB0cy5jcmVhdGVDYWxsKHRoaXMudGNiLmVudi5kZWNsYXJlT3V0cHV0SGVscGVyKCksIHVuZGVmaW5lZCwgW291dHB1dEZpZWxkXSk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmliZUZuID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3Mob3V0cHV0SGVscGVyLCAnc3Vic2NyaWJlJyk7XG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKHN1YnNjcmliZUZuLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCwgW2hhbmRsZXJdKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhjYWxsLCBvdXRwdXQuc291cmNlU3Bhbik7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoY2FsbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMgaXMgZGlzYWJsZWQsIGVtaXQgYSBoYW5kbGVyIGZ1bmN0aW9uIHdoZXJlIHRoZVxuICAgICAgICAvLyBgJGV2ZW50YCBwYXJhbWV0ZXIgaGFzIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuQW55KTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9XG5cbiAgICAgIEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IudmlzaXQoXG4gICAgICAgICAgb3V0cHV0LmhhbmRsZXIsIHRoaXMudGNiLmlkLCB0aGlzLnRjYi5ib3VuZFRhcmdldCwgdGhpcy50Y2Iub29iUmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIE91dHB1dHMgYXJlIGEgYHRzLkNhbGxFeHByZXNzaW9uYCB0aGF0IGxvb2sgbGlrZSBvbmUgb2YgdGhlIHR3bzpcbiAgICogIC0gYF9vdXRwdXRIZWxwZXIoX3QxW1wib3V0cHV0RmllbGRcIl0pLnN1YnNjcmliZShoYW5kbGVyKTtgXG4gICAqICAtIGBfdDEuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyKTtgXG4gICAqIFRoaXMgbWV0aG9kIHJldmVyc2VzIHRoZSBvcGVyYXRpb25zIHRvIGNyZWF0ZSBhIGNhbGwgZXhwcmVzc2lvbiBmb3IgYSBkaXJlY3RpdmUgb3V0cHV0LlxuICAgKiBJdCB1bnBhY2tzIHRoZSBnaXZlbiBjYWxsIGV4cHJlc3Npb24gYW5kIHJldHVybnMgdGhlIG9yaWdpbmFsIGVsZW1lbnQgYWNjZXNzIChpLmUuXG4gICAqIGBfdDFbXCJvdXRwdXRGaWVsZFwiXWAgaW4gdGhlIGV4YW1wbGUgYWJvdmUpLiBSZXR1cm5zIGBudWxsYCBpZiB0aGUgZ2l2ZW4gY2FsbCBleHByZXNzaW9uIGlzIG5vdFxuICAgKiB0aGUgZXhwZWN0ZWQgc3RydWN0dXJlIG9mIGFuIG91dHB1dCBiaW5kaW5nXG4gICAqL1xuICBzdGF0aWMgZGVjb2RlT3V0cHV0Q2FsbEV4cHJlc3Npb24obm9kZTogdHMuQ2FsbEV4cHJlc3Npb24pOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBgbm9kZS5leHByZXNzaW9uYCA9PT0gYF9vdXRwdXRIZWxwZXIoX3QxW1wib3V0cHV0RmllbGRcIl0pLnN1YnNjcmliZWAgb3IgYF90MS5hZGRFdmVudExpc3RlbmVyYFxuICAgIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSB8fFxuICAgICAgICBub2RlLmV4cHJlc3Npb24ubmFtZS50ZXh0ID09PSAnYWRkRXZlbnRMaXN0ZW5lcicpIHtcbiAgICAgIC8vIGBhZGRFdmVudExpc3RlbmVyYCBvdXRwdXRzIGRvIG5vdCBoYXZlIGFuIGBFbGVtZW50QWNjZXNzRXhwcmVzc2lvbmAgZm9yIHRoZSBvdXRwdXQgZmllbGQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBgbm9kZS5leHByZXNzaW9uLmV4cHJlc3Npb25gID09PSBgX291dHB1dEhlbHBlcihfdDFbXCJvdXRwdXRGaWVsZFwiXSlgXG4gICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IFtvdXRwdXRGaWVsZEFjY2Vzc10gPSBub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5hcmd1bWVudHM7XG4gICAgaWYgKCF0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXRGaWVsZEFjY2VzcztcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBcInVuY2xhaW1lZCBvdXRwdXRzXCIgLSBldmVudCBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHdoaWNoXG4gKiB3ZXJlIG5vdCBhdHRyaWJ1dGVkIHRvIGFueSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBhbmQgYXJlIGluc3RlYWQgcHJvY2Vzc2VkIGFnYWluc3QgdGhlIEhUTUxcbiAqIGVsZW1lbnQgaXRzZWxmLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlVuY2xhaW1lZE91dHB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGNsYWltZWRPdXRwdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZWxJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiB0aGlzLmVsZW1lbnQub3V0cHV0cykge1xuICAgICAgaWYgKHRoaXMuY2xhaW1lZE91dHB1dHMuaGFzKG91dHB1dC5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgZXZlbnQgaGFuZGxlciBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChvdXRwdXQudHlwZSA9PT0gUGFyc2VkRXZlbnRUeXBlLkFuaW1hdGlvbikge1xuICAgICAgICAvLyBBbmltYXRpb24gb3V0cHV0IGJpbmRpbmdzIGFsd2F5cyBoYXZlIGFuIGAkZXZlbnRgIHBhcmFtZXRlciBvZiB0eXBlIGBBbmltYXRpb25FdmVudGAuXG4gICAgICAgIGNvbnN0IGV2ZW50VHlwZSA9IHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHMgP1xuICAgICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZUV4dGVybmFsVHlwZSgnQGFuZ3VsYXIvYW5pbWF0aW9ucycsICdBbmltYXRpb25FdmVudCcpIDpcbiAgICAgICAgICAgIEV2ZW50UGFyYW1UeXBlLkFueTtcblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIGV2ZW50VHlwZSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gZXZlbnRzIGlzIGVuYWJsZWQsIGdlbmVyYXRlIGEgY2FsbCB0byBgYWRkRXZlbnRMaXN0ZW5lcmAgb25cbiAgICAgICAgLy8gdGhlIGVsZW1lbnQgaW5zdGFuY2Ugc28gdGhhdCBUeXBlU2NyaXB0J3MgdHlwZSBpbmZlcmVuY2UgZm9yXG4gICAgICAgIC8vIGBIVE1MRWxlbWVudC5hZGRFdmVudExpc3RlbmVyYCB1c2luZyBgSFRNTEVsZW1lbnRFdmVudE1hcGAgdG8gaW5mZXIgYW4gYWNjdXJhdGUgdHlwZSBmb3JcbiAgICAgICAgLy8gYCRldmVudGAgZGVwZW5kaW5nIG9uIHRoZSBldmVudCBuYW1lLiBGb3IgdW5rbm93biBldmVudCBuYW1lcywgVHlwZVNjcmlwdCByZXNvcnRzIHRvIHRoZVxuICAgICAgICAvLyBiYXNlIGBFdmVudGAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG5cbiAgICAgICAgaWYgKGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgICBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICAvKiBleHByZXNzaW9uICovIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGVsSWQsICdhZGRFdmVudExpc3RlbmVyJyksXG4gICAgICAgICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGFyZ3VtZW50cyAqL1t0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKG91dHB1dC5uYW1lKSwgaGFuZGxlcl0pO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGNhbGwsIG91dHB1dC5zb3VyY2VTcGFuKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjYWxsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgRE9NIGlucHV0cyBpcyBkaXNhYmxlZCwgZW1pdCBhIGhhbmRsZXIgZnVuY3Rpb24gd2hlcmUgdGhlIGAkZXZlbnRgXG4gICAgICAgIC8vIHBhcmFtZXRlciBoYXMgYW4gZXhwbGljaXQgYGFueWAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5BbnkpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH1cblxuICAgICAgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvci52aXNpdChcbiAgICAgICAgICBvdXRwdXQuaGFuZGxlciwgdGhpcy50Y2IuaWQsIHRoaXMudGNiLmJvdW5kVGFyZ2V0LCB0aGlzLnRjYi5vb2JSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWx1ZSB1c2VkIHRvIGJyZWFrIGEgY2lyY3VsYXIgcmVmZXJlbmNlIGJldHdlZW4gYFRjYk9wYHMuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyByZXR1cm5lZCB3aGVuZXZlciBgVGNiT3BgcyBoYXZlIGEgY2lyY3VsYXIgZGVwZW5kZW5jeS4gVGhlIGV4cHJlc3Npb24gaXMgYSBub24tbnVsbFxuICogYXNzZXJ0aW9uIG9mIHRoZSBudWxsIHZhbHVlIChpbiBUeXBlU2NyaXB0LCB0aGUgZXhwcmVzc2lvbiBgbnVsbCFgKS4gVGhpcyBjb25zdHJ1Y3Rpb24gd2lsbCBpbmZlclxuICogdGhlIGxlYXN0IG5hcnJvdyB0eXBlIGZvciB3aGF0ZXZlciBpdCdzIGFzc2lnbmVkIHRvLlxuICovXG5jb25zdCBJTkZFUl9UWVBFX0ZPUl9DSVJDVUxBUl9PUF9FWFBSID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKTtcblxuLyoqXG4gKiBPdmVyYWxsIGdlbmVyYXRpb24gY29udGV4dCBmb3IgdGhlIHR5cGUgY2hlY2sgYmxvY2suXG4gKlxuICogYENvbnRleHRgIGhhbmRsZXMgb3BlcmF0aW9ucyBkdXJpbmcgY29kZSBnZW5lcmF0aW9uIHdoaWNoIGFyZSBnbG9iYWwgd2l0aCByZXNwZWN0IHRvIHRoZSB3aG9sZVxuICogYmxvY2suIEl0J3MgcmVzcG9uc2libGUgZm9yIHZhcmlhYmxlIG5hbWUgYWxsb2NhdGlvbiBhbmQgbWFuYWdlbWVudCBvZiBhbnkgaW1wb3J0cyBuZWVkZWQuIEl0XG4gKiBhbHNvIGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZSBtZXRhZGF0YSBpdHNlbGYuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb250ZXh0IHtcbiAgcHJpdmF0ZSBuZXh0SWQgPSAxO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZW52OiBFbnZpcm9ubWVudCwgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIHJlYWRvbmx5IGlkOiBUZW1wbGF0ZUlkLFxuICAgICAgcmVhZG9ubHkgYm91bmRUYXJnZXQ6IEJvdW5kVGFyZ2V0PFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPixcbiAgICAgIHByaXZhdGUgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICByZWFkb25seSBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKSB7fVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhIG5ldyB2YXJpYWJsZSBuYW1lIGZvciB1c2Ugd2l0aGluIHRoZSBgQ29udGV4dGAuXG4gICAqXG4gICAqIEN1cnJlbnRseSB0aGlzIHVzZXMgYSBtb25vdG9uaWNhbGx5IGluY3JlYXNpbmcgY291bnRlciwgYnV0IGluIHRoZSBmdXR1cmUgdGhlIHZhcmlhYmxlIG5hbWVcbiAgICogbWlnaHQgY2hhbmdlIGRlcGVuZGluZyBvbiB0aGUgdHlwZSBvZiBkYXRhIGJlaW5nIHN0b3JlZC5cbiAgICovXG4gIGFsbG9jYXRlSWQoKTogdHMuSWRlbnRpZmllciB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90JHt0aGlzLm5leHRJZCsrfWApO1xuICB9XG5cbiAgZ2V0UGlwZUJ5TmFtZShuYW1lOiBzdHJpbmcpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghdGhpcy5waXBlcy5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbnYucGlwZUluc3QodGhpcy5waXBlcy5nZXQobmFtZSkhKTtcbiAgfVxufVxuXG4vKipcbiAqIExvY2FsIHNjb3BlIHdpdGhpbiB0aGUgdHlwZSBjaGVjayBibG9jayBmb3IgYSBwYXJ0aWN1bGFyIHRlbXBsYXRlLlxuICpcbiAqIFRoZSB0b3AtbGV2ZWwgdGVtcGxhdGUgYW5kIGVhY2ggbmVzdGVkIGA8bmctdGVtcGxhdGU+YCBoYXZlIHRoZWlyIG93biBgU2NvcGVgLCB3aGljaCBleGlzdCBpbiBhXG4gKiBoaWVyYXJjaHkuIFRoZSBzdHJ1Y3R1cmUgb2YgdGhpcyBoaWVyYXJjaHkgbWlycm9ycyB0aGUgc3ludGFjdGljIHNjb3BlcyBpbiB0aGUgZ2VuZXJhdGVkIHR5cGVcbiAqIGNoZWNrIGJsb2NrLCB3aGVyZSBlYWNoIG5lc3RlZCB0ZW1wbGF0ZSBpcyBlbmNhc2VkIGluIGFuIGBpZmAgc3RydWN0dXJlLlxuICpcbiAqIEFzIGEgdGVtcGxhdGUncyBgVGNiT3BgcyBhcmUgZXhlY3V0ZWQgaW4gYSBnaXZlbiBgU2NvcGVgLCBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB2aWFcbiAqIGBhZGRTdGF0ZW1lbnQoKWAuIFdoZW4gdGhpcyBwcm9jZXNzaW5nIGlzIGNvbXBsZXRlLCB0aGUgYFNjb3BlYCBjYW4gYmUgdHVybmVkIGludG8gYSBgdHMuQmxvY2tgXG4gKiB2aWEgYHJlbmRlclRvQmxvY2soKWAuXG4gKlxuICogSWYgYSBgVGNiT3BgIHJlcXVpcmVzIHRoZSBvdXRwdXQgb2YgYW5vdGhlciwgaXQgY2FuIGNhbGwgYHJlc29sdmUoKWAuXG4gKi9cbmNsYXNzIFNjb3BlIHtcbiAgLyoqXG4gICAqIEEgcXVldWUgb2Ygb3BlcmF0aW9ucyB3aGljaCBuZWVkIHRvIGJlIHBlcmZvcm1lZCB0byBnZW5lcmF0ZSB0aGUgVENCIGNvZGUgZm9yIHRoaXMgc2NvcGUuXG4gICAqXG4gICAqIFRoaXMgYXJyYXkgY2FuIGNvbnRhaW4gZWl0aGVyIGEgYFRjYk9wYCB3aGljaCBoYXMgeWV0IHRvIGJlIGV4ZWN1dGVkLCBvciBhIGB0cy5FeHByZXNzaW9ufG51bGxgXG4gICAqIHJlcHJlc2VudGluZyB0aGUgbWVtb2l6ZWQgcmVzdWx0IG9mIGV4ZWN1dGluZyB0aGUgb3BlcmF0aW9uLiBBcyBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgdGhlaXJcbiAgICogcmVzdWx0cyBhcmUgd3JpdHRlbiBpbnRvIHRoZSBgb3BRdWV1ZWAsIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBvcGVyYXRpb24uXG4gICAqXG4gICAqIElmIGFuIG9wZXJhdGlvbiBpcyBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBleGVjdXRlZCwgaXQgaXMgdGVtcG9yYXJpbHkgb3ZlcndyaXR0ZW4gaGVyZSB3aXRoXG4gICAqIGBJTkZFUl9UWVBFX0ZPUl9DSVJDVUxBUl9PUF9FWFBSYC4gVGhpcyB3YXksIGlmIGEgY3ljbGUgaXMgZW5jb3VudGVyZWQgd2hlcmUgYW4gb3BlcmF0aW9uXG4gICAqIGRlcGVuZHMgdHJhbnNpdGl2ZWx5IG9uIGl0cyBvd24gcmVzdWx0LCB0aGUgaW5uZXIgb3BlcmF0aW9uIHdpbGwgaW5mZXIgdGhlIGxlYXN0IG5hcnJvdyB0eXBlXG4gICAqIHRoYXQgZml0cyBpbnN0ZWFkLiBUaGlzIGhhcyB0aGUgc2FtZSBzZW1hbnRpY3MgYXMgVHlwZVNjcmlwdCBpdHNlbGYgd2hlbiB0eXBlcyBhcmUgcmVmZXJlbmNlZFxuICAgKiBjaXJjdWxhcmx5LlxuICAgKi9cbiAgcHJpdmF0ZSBvcFF1ZXVlOiAoVGNiT3B8dHMuRXhwcmVzc2lvbnxudWxsKVtdID0gW107XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGBUbXBsQXN0RWxlbWVudGBzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiRWxlbWVudE9wYCBpbiB0aGUgYG9wUXVldWVgXG4gICAqL1xuICBwcml2YXRlIGVsZW1lbnRPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdEVsZW1lbnQsIG51bWJlcj4oKTtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIG1hcHMgd2hpY2ggdHJhY2tzIHRoZSBpbmRleCBvZiBgVGNiRGlyZWN0aXZlQ3Rvck9wYHMgaW4gdGhlIGBvcFF1ZXVlYCBmb3IgZWFjaFxuICAgKiBkaXJlY3RpdmUgb24gYSBgVG1wbEFzdEVsZW1lbnRgIG9yIGBUbXBsQXN0VGVtcGxhdGVgIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIGRpcmVjdGl2ZU9wTWFwID1cbiAgICAgIG5ldyBNYXA8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIG51bWJlcj4+KCk7XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGBUbXBsQXN0UmVmZXJlbmNlYHMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JSZWZlcmVuY2VPcGAgaW4gdGhlIGBvcFF1ZXVlYFxuICAgKi9cbiAgcHJpdmF0ZSByZWZlcmVuY2VPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdFJlZmVyZW5jZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW1tZWRpYXRlbHkgbmVzdGVkIDxuZy10ZW1wbGF0ZT5zICh3aXRoaW4gdGhpcyBgU2NvcGVgKSByZXByZXNlbnRlZCBieSBgVG1wbEFzdFRlbXBsYXRlYFxuICAgKiBub2RlcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYlRlbXBsYXRlQ29udGV4dE9wYHMgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICovXG4gIHByaXZhdGUgdGVtcGxhdGVDdHhPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdFRlbXBsYXRlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiB2YXJpYWJsZXMgZGVjbGFyZWQgb24gdGhlIHRlbXBsYXRlIHRoYXQgY3JlYXRlZCB0aGlzIGBTY29wZWAgKHJlcHJlc2VudGVkIGJ5XG4gICAqIGBUbXBsQXN0VmFyaWFibGVgIG5vZGVzKSB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYlZhcmlhYmxlT3BgcyBpbiB0aGUgYG9wUXVldWVgLlxuICAgKi9cbiAgcHJpdmF0ZSB2YXJNYXAgPSBuZXcgTWFwPFRtcGxBc3RWYXJpYWJsZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBTdGF0ZW1lbnRzIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgKlxuICAgKiBFeGVjdXRpbmcgdGhlIGBUY2JPcGBzIGluIHRoZSBgb3BRdWV1ZWAgcG9wdWxhdGVzIHRoaXMgYXJyYXkuXG4gICAqL1xuICBwcml2YXRlIHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHBhcmVudDogU2NvcGV8bnVsbCA9IG51bGwsXG4gICAgICBwcml2YXRlIGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgYFNjb3BlYCBnaXZlbiBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCBvciBhIGxpc3Qgb2YgYFRtcGxBc3ROb2RlYHMuXG4gICAqXG4gICAqIEBwYXJhbSB0Y2IgdGhlIG92ZXJhbGwgY29udGV4dCBvZiBUQ0IgZ2VuZXJhdGlvbi5cbiAgICogQHBhcmFtIHBhcmVudCB0aGUgYFNjb3BlYCBvZiB0aGUgcGFyZW50IHRlbXBsYXRlIChpZiBhbnkpIG9yIGBudWxsYCBpZiB0aGlzIGlzIHRoZSByb290XG4gICAqIGBTY29wZWAuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZU9yTm9kZXMgZWl0aGVyIGEgYFRtcGxBc3RUZW1wbGF0ZWAgcmVwcmVzZW50aW5nIHRoZSB0ZW1wbGF0ZSBmb3Igd2hpY2ggdG9cbiAgICogY2FsY3VsYXRlIHRoZSBgU2NvcGVgLCBvciBhIGxpc3Qgb2Ygbm9kZXMgaWYgbm8gb3V0ZXIgdGVtcGxhdGUgb2JqZWN0IGlzIGF2YWlsYWJsZS5cbiAgICogQHBhcmFtIGd1YXJkIGFuIGV4cHJlc3Npb24gdGhhdCBpcyBhcHBsaWVkIHRvIHRoaXMgc2NvcGUgZm9yIHR5cGUgbmFycm93aW5nIHB1cnBvc2VzLlxuICAgKi9cbiAgc3RhdGljIGZvck5vZGVzKFxuICAgICAgdGNiOiBDb250ZXh0LCBwYXJlbnQ6IFNjb3BlfG51bGwsIHRlbXBsYXRlT3JOb2RlczogVG1wbEFzdFRlbXBsYXRlfChUbXBsQXN0Tm9kZVtdKSxcbiAgICAgIGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwpOiBTY29wZSB7XG4gICAgY29uc3Qgc2NvcGUgPSBuZXcgU2NvcGUodGNiLCBwYXJlbnQsIGd1YXJkKTtcblxuICAgIGxldCBjaGlsZHJlbjogVG1wbEFzdE5vZGVbXTtcblxuICAgIC8vIElmIGdpdmVuIGFuIGFjdHVhbCBgVG1wbEFzdFRlbXBsYXRlYCBpbnN0YW5jZSwgdGhlbiBwcm9jZXNzIGFueSBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGl0XG4gICAgLy8gaGFzLlxuICAgIGlmICh0ZW1wbGF0ZU9yTm9kZXMgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIFRoZSB0ZW1wbGF0ZSdzIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBuZWVkIHRvIGJlIGFkZGVkIGFzIGBUY2JWYXJpYWJsZU9wYHMuXG4gICAgICBjb25zdCB2YXJNYXAgPSBuZXcgTWFwPHN0cmluZywgVG1wbEFzdFZhcmlhYmxlPigpO1xuXG4gICAgICBmb3IgKGNvbnN0IHYgb2YgdGVtcGxhdGVPck5vZGVzLnZhcmlhYmxlcykge1xuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHZhcmlhYmxlcyBvbiB0aGUgYFRtcGxBc3RUZW1wbGF0ZWAgYXJlIG9ubHkgZGVjbGFyZWQgb25jZS5cbiAgICAgICAgaWYgKCF2YXJNYXAuaGFzKHYubmFtZSkpIHtcbiAgICAgICAgICB2YXJNYXAuc2V0KHYubmFtZSwgdik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZmlyc3REZWNsID0gdmFyTWFwLmdldCh2Lm5hbWUpITtcbiAgICAgICAgICB0Y2Iub29iUmVjb3JkZXIuZHVwbGljYXRlVGVtcGxhdGVWYXIodGNiLmlkLCB2LCBmaXJzdERlY2wpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3BJbmRleCA9IHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiVmFyaWFibGVPcCh0Y2IsIHNjb3BlLCB0ZW1wbGF0ZU9yTm9kZXMsIHYpKSAtIDE7XG4gICAgICAgIHNjb3BlLnZhck1hcC5zZXQodiwgb3BJbmRleCk7XG4gICAgICB9XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2Rlcy5jaGlsZHJlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXM7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBjaGlsZHJlbikge1xuICAgICAgc2NvcGUuYXBwZW5kTm9kZShub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgYSBgdHMuRXhwcmVzc2lvbmAgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiBzb21lIG9wZXJhdGlvbiBpbiB0aGUgY3VycmVudCBgU2NvcGVgLFxuICAgKiBpbmNsdWRpbmcgYW55IHBhcmVudCBzY29wZShzKS5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBgVG1wbEFzdE5vZGVgIG9mIHRoZSBvcGVyYXRpb24gaW4gcXVlc3Rpb24uIFRoZSBsb29rdXAgcGVyZm9ybWVkIHdpbGwgZGVwZW5kIG9uXG4gICAqIHRoZSB0eXBlIG9mIHRoaXMgbm9kZTpcbiAgICpcbiAgICogQXNzdW1pbmcgYGRpcmVjdGl2ZWAgaXMgbm90IHByZXNlbnQsIHRoZW4gYHJlc29sdmVgIHdpbGwgcmV0dXJuOlxuICAgKlxuICAgKiAqIGBUbXBsQXN0RWxlbWVudGAgLSByZXRyaWV2ZSB0aGUgZXhwcmVzc2lvbiBmb3IgdGhlIGVsZW1lbnQgRE9NIG5vZGVcbiAgICogKiBgVG1wbEFzdFRlbXBsYXRlYCAtIHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHZhcmlhYmxlXG4gICAqICogYFRtcGxBc3RWYXJpYWJsZWAgLSByZXRyaWV2ZSBhIHRlbXBsYXRlIGxldC0gdmFyaWFibGVcbiAgICogKiBgVG1wbEFzdFJlZmVyZW5jZWAgLSByZXRyaWV2ZSB2YXJpYWJsZSBjcmVhdGVkIGZvciB0aGUgbG9jYWwgcmVmXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RpdmUgaWYgcHJlc2VudCwgYSBkaXJlY3RpdmUgdHlwZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgdG9cbiAgICogbG9vayB1cCBpbnN0ZWFkIG9mIHRoZSBkZWZhdWx0IGZvciBhbiBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICByZXNvbHZlKFxuICAgICAgbm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZXxUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG9wZXJhdGlvbiBsb2NhbGx5LlxuICAgIGNvbnN0IHJlcyA9IHRoaXMucmVzb2x2ZUxvY2FsKG5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgaWYgKHJlcyAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2UgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBDaGVjayB3aXRoIHRoZSBwYXJlbnQuXG4gICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZShub2RlLCBkaXJlY3RpdmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICR7bm9kZX0gLyAke2RpcmVjdGl2ZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgc3RhdGVtZW50IHRvIHRoaXMgc2NvcGUuXG4gICAqL1xuICBhZGRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgdGhpcy5zdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzdGF0ZW1lbnRzLlxuICAgKi9cbiAgcmVuZGVyKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub3BRdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gT3B0aW9uYWwgc3RhdGVtZW50cyBjYW5ub3QgYmUgc2tpcHBlZCB3aGVuIHdlIGFyZSBnZW5lcmF0aW5nIHRoZSBUQ0IgZm9yIHVzZVxuICAgICAgLy8gYnkgdGhlIFRlbXBsYXRlVHlwZUNoZWNrZXIuXG4gICAgICBjb25zdCBza2lwT3B0aW9uYWwgPSAhdGhpcy50Y2IuZW52LmNvbmZpZy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyO1xuICAgICAgdGhpcy5leGVjdXRlT3AoaSwgc2tpcE9wdGlvbmFsKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVtZW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGV4cHJlc3Npb24gb2YgYWxsIHRlbXBsYXRlIGd1YXJkcyB0aGF0IGFwcGx5IHRvIHRoaXMgc2NvcGUsIGluY2x1ZGluZyB0aG9zZSBvZlxuICAgKiBwYXJlbnQgc2NvcGVzLiBJZiBubyBndWFyZHMgaGF2ZSBiZWVuIGFwcGxpZWQsIG51bGwgaXMgcmV0dXJuZWQuXG4gICAqL1xuICBndWFyZHMoKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBsZXQgcGFyZW50R3VhcmRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLnBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgZ3VhcmRzIGZyb20gdGhlIHBhcmVudCBzY29wZSwgaWYgcHJlc2VudC5cbiAgICAgIHBhcmVudEd1YXJkcyA9IHRoaXMucGFyZW50Lmd1YXJkcygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmd1YXJkID09PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIHNjb3BlIGRvZXMgbm90IGhhdmUgYSBndWFyZCwgc28gcmV0dXJuIHRoZSBwYXJlbnQncyBndWFyZHMgYXMgaXMuXG4gICAgICByZXR1cm4gcGFyZW50R3VhcmRzO1xuICAgIH0gZWxzZSBpZiAocGFyZW50R3VhcmRzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSdzIG5vIGd1YXJkcyBmcm9tIHRoZSBwYXJlbnQgc2NvcGUsIHNvIHRoaXMgc2NvcGUncyBndWFyZCByZXByZXNlbnRzIGFsbCBhdmFpbGFibGVcbiAgICAgIC8vIGd1YXJkcy5cbiAgICAgIHJldHVybiB0aGlzLmd1YXJkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBCb3RoIHRoZSBwYXJlbnQgc2NvcGUgYW5kIHRoaXMgc2NvcGUgcHJvdmlkZSBhIGd1YXJkLCBzbyBjcmVhdGUgYSBjb21iaW5hdGlvbiBvZiB0aGUgdHdvLlxuICAgICAgLy8gSXQgaXMgaW1wb3J0YW50IHRoYXQgdGhlIHBhcmVudCBndWFyZCBpcyB1c2VkIGFzIGxlZnQgb3BlcmFuZCwgZ2l2ZW4gdGhhdCBpdCBtYXkgcHJvdmlkZVxuICAgICAgLy8gbmFycm93aW5nIHRoYXQgaXMgcmVxdWlyZWQgZm9yIHRoaXMgc2NvcGUncyBndWFyZCB0byBiZSB2YWxpZC5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVCaW5hcnkocGFyZW50R3VhcmRzLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCB0aGlzLmd1YXJkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVMb2NhbChcbiAgICAgIHJlZjogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZXxUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlICYmIHRoaXMucmVmZXJlbmNlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnJlZmVyZW5jZU9wTWFwLmdldChyZWYpISk7XG4gICAgfSBlbHNlIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUgJiYgdGhpcy52YXJNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBgVGNiVmFyaWFibGVPcGAgYXNzb2NpYXRlZCB3aXRoIHRoZSBgVG1wbEFzdFZhcmlhYmxlYC5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnZhck1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSAmJiBkaXJlY3RpdmUgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyB0aGUgY29udGV4dCBvZiB0aGUgZ2l2ZW4gc3ViLXRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlRlbXBsYXRlQ29udGV4dE9wYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudGVtcGxhdGVDdHhPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpICYmXG4gICAgICAgIGRpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuZGlyZWN0aXZlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGRpcmVjdGl2ZSBvbiBhbiBlbGVtZW50IG9yIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIGNvbnN0IGRpck1hcCA9IHRoaXMuZGlyZWN0aXZlT3BNYXAuZ2V0KHJlZikhO1xuICAgICAgaWYgKGRpck1hcC5oYXMoZGlyZWN0aXZlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AoZGlyTWFwLmdldChkaXJlY3RpdmUpISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmIHRoaXMuZWxlbWVudE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIERPTSBub2RlIG9mIGFuIGVsZW1lbnQgaW4gdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLmVsZW1lbnRPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgZXhlY3V0ZU9wYCwgYnV0IGFzc2VydCB0aGF0IHRoZSBvcGVyYXRpb24gYWN0dWFsbHkgcmV0dXJuZWQgYHRzLkV4cHJlc3Npb25gLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlT3Aob3BJbmRleDogbnVtYmVyKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVzID0gdGhpcy5leGVjdXRlT3Aob3BJbmRleCwgLyogc2tpcE9wdGlvbmFsICovIGZhbHNlKTtcbiAgICBpZiAocmVzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIHJlc29sdmluZyBvcGVyYXRpb24sIGdvdCBudWxsYCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIHBhcnRpY3VsYXIgYFRjYk9wYCBpbiB0aGUgYG9wUXVldWVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCByZXBsYWNlcyB0aGUgb3BlcmF0aW9uIGluIHRoZSBgb3BRdWV1ZWAgd2l0aCB0aGUgcmVzdWx0IG9mIGV4ZWN1dGlvbiAob25jZSBkb25lKVxuICAgKiBhbmQgYWxzbyBwcm90ZWN0cyBhZ2FpbnN0IGEgY2lyY3VsYXIgZGVwZW5kZW5jeSBmcm9tIHRoZSBvcGVyYXRpb24gdG8gaXRzZWxmIGJ5IHRlbXBvcmFyaWx5XG4gICAqIHNldHRpbmcgdGhlIG9wZXJhdGlvbidzIHJlc3VsdCB0byBhIHNwZWNpYWwgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZXhlY3V0ZU9wKG9wSW5kZXg6IG51bWJlciwgc2tpcE9wdGlvbmFsOiBib29sZWFuKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBvcCA9IHRoaXMub3BRdWV1ZVtvcEluZGV4XTtcbiAgICBpZiAoIShvcCBpbnN0YW5jZW9mIFRjYk9wKSkge1xuICAgICAgcmV0dXJuIG9wO1xuICAgIH1cblxuICAgIGlmIChza2lwT3B0aW9uYWwgJiYgb3Aub3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24gaW4gdGhlIHF1ZXVlIHRvIGl0cyBjaXJjdWxhciBmYWxsYmFjay4gSWYgZXhlY3V0aW5nIHRoaXNcbiAgICAvLyBvcGVyYXRpb24gcmVzdWx0cyBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3ksIHRoaXMgd2lsbCBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AgYW5kIGFsbG93IGZvclxuICAgIC8vIHRoZSByZXNvbHV0aW9uIG9mIHN1Y2ggY3ljbGVzLlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IG9wLmNpcmN1bGFyRmFsbGJhY2soKTtcbiAgICBjb25zdCByZXMgPSBvcC5leGVjdXRlKCk7XG4gICAgLy8gT25jZSB0aGUgb3BlcmF0aW9uIGhhcyBmaW5pc2hlZCBleGVjdXRpbmcsIGl0J3Mgc2FmZSB0byBjYWNoZSB0aGUgcmVhbCByZXN1bHQuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gcmVzO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE5vZGUobm9kZTogVG1wbEFzdE5vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBjb25zdCBvcEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkVsZW1lbnRPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpIC0gMTtcbiAgICAgIHRoaXMuZWxlbWVudE9wTWFwLnNldChub2RlLCBvcEluZGV4KTtcbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICB0aGlzLmFwcGVuZE5vZGUoY2hpbGQpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUZW1wbGF0ZSBjaGlsZHJlbiBhcmUgcmVuZGVyZWQgaW4gYSBjaGlsZCBzY29wZS5cbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGNvbnN0IGN0eEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQ29udGV4dE9wKHRoaXMudGNiLCB0aGlzKSkgLSAxO1xuICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLnNldChub2RlLCBjdHhJbmRleCk7XG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1RlbXBsYXRlQm9kaWVzKSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUJvZHlPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRleHRJbnRlcnBvbGF0aW9uT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNoZWNrQW5kQXBwZW5kUmVmZXJlbmNlc09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiBub2RlLnJlZmVyZW5jZXMpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRjYi5vb2JSZWNvcmRlci5taXNzaW5nUmVmZXJlbmNlVGFyZ2V0KHRoaXMudGNiLmlkLCByZWYpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGN0eEluZGV4OiBudW1iZXI7XG4gICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIGN0eEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlJlZmVyZW5jZU9wKHRoaXMudGNiLCB0aGlzLCByZWYsIG5vZGUsIHRhcmdldCkpIC0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eEluZGV4ID1cbiAgICAgICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JSZWZlcmVuY2VPcCh0aGlzLnRjYiwgdGhpcywgcmVmLCBub2RlLCB0YXJnZXQuZGlyZWN0aXZlKSkgLSAxO1xuICAgICAgfVxuICAgICAgdGhpcy5yZWZlcmVuY2VPcE1hcC5zZXQocmVmLCBjdHhJbmRleCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmREaXJlY3RpdmVzQW5kSW5wdXRzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBpbnB1dHMgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgY2xhaW1lZElucHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKG5vZGUpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsIHx8IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcywgdGhlbiBhbGwgaW5wdXRzIGFyZSB1bmNsYWltZWQgaW5wdXRzLCBzbyBxdWV1ZSBhbiBvcGVyYXRpb25cbiAgICAgIC8vIHRvIGFkZCB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZElucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKFxuICAgICAgICAgICAgbmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgLyogY2hlY2tFbGVtZW50ICovIHRydWUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJNYXAgPSBuZXcgTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgY29uc3QgZGlyZWN0aXZlT3AgPSBkaXIuaXNHZW5lcmljID8gbmV3IFRjYkRpcmVjdGl2ZUN0b3JPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgVGNiRGlyZWN0aXZlVHlwZU9wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBkaXIpO1xuICAgICAgY29uc3QgZGlySW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChkaXJlY3RpdmVPcCkgLSAxO1xuICAgICAgZGlyTWFwLnNldChkaXIsIGRpckluZGV4KTtcblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRpcmVjdGl2ZUlucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBkaXIpKTtcbiAgICB9XG4gICAgdGhpcy5kaXJlY3RpdmVPcE1hcC5zZXQobm9kZSwgZGlyTWFwKTtcblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIGlucHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZW1vdmUgYW55IGlucHV0cyB0aGF0IGl0IGNsYWltcyBmcm9tIGBlbGVtZW50SW5wdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wZXJ0eU5hbWUgb2YgZGlyLmlucHV0cy5wcm9wZXJ0eU5hbWVzKSB7XG4gICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQocHJvcGVydHlOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkSW5wdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIHRoaXMgZWxlbWVudCwgdGhlbiBpdCdzIGEgXCJwbGFpblwiIERPTSBlbGVtZW50IChvciBhXG4gICAgICAvLyB3ZWIgY29tcG9uZW50KSwgYW5kIHNob3VsZCBiZSBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuIElmIGFueSBkaXJlY3RpdmVzIG1hdGNoLFxuICAgICAgLy8gd2UgbXVzdCBhc3N1bWUgdGhhdCB0aGUgZWxlbWVudCBjb3VsZCBiZSBjdXN0b20gKGVpdGhlciBhIGNvbXBvbmVudCwgb3IgYSBkaXJlY3RpdmUgbGlrZVxuICAgICAgLy8gPHJvdXRlci1vdXRsZXQ+KSBhbmQgc2hvdWxkbid0IHZhbGlkYXRlIHRoZSBlbGVtZW50IG5hbWUgaXRzZWxmLlxuICAgICAgY29uc3QgY2hlY2tFbGVtZW50ID0gZGlyZWN0aXZlcy5sZW5ndGggPT09IDA7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCBjaGVja0VsZW1lbnQsIGNsYWltZWRJbnB1dHMpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE91dHB1dHNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIG91dHB1dHMgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgY2xhaW1lZE91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIG91dHB1dHMgYXJlIHVuY2xhaW1lZCBvdXRwdXRzLCBzbyBxdWV1ZSBhbiBvcGVyYXRpb25cbiAgICAgIC8vIHRvIGFkZCB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZE91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZE91dHB1dHMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBRdWV1ZSBvcGVyYXRpb25zIGZvciBhbGwgZGlyZWN0aXZlcyB0byBjaGVjayB0aGUgcmVsZXZhbnQgb3V0cHV0cyBmb3IgYSBkaXJlY3RpdmUuXG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRpcmVjdGl2ZU91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgZXhwYW5kaW5nIHRoZSBkaXJlY3RpdmVzLCB3ZSBtaWdodCBuZWVkIHRvIHF1ZXVlIGFuIG9wZXJhdGlvbiB0byBjaGVjayBhbnkgdW5jbGFpbWVkXG4gICAgLy8gb3V0cHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZWdpc3RlciBhbnkgb3V0cHV0cyB0aGF0IGl0IGNsYWltcyBpbiBgY2xhaW1lZE91dHB1dHNgLlxuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dFByb3BlcnR5IG9mIGRpci5vdXRwdXRzLnByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgICBjbGFpbWVkT3V0cHV0cy5hZGQob3V0cHV0UHJvcGVydHkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBUY2JCb3VuZElucHV0IHtcbiAgYXR0cmlidXRlOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGU7XG4gIGZpZWxkTmFtZXM6IENsYXNzUHJvcGVydHlOYW1lW107XG59XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBgY3R4YCBwYXJhbWV0ZXIgdG8gdGhlIHRvcC1sZXZlbCBUQ0IgZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBhIHBhcmFtZXRlciB3aXRoIGEgdHlwZSBlcXVpdmFsZW50IHRvIHRoZSBjb21wb25lbnQgdHlwZSwgd2l0aCBhbGwgZ2VuZXJpYyB0eXBlXG4gKiBwYXJhbWV0ZXJzIGxpc3RlZCAod2l0aG91dCB0aGVpciBnZW5lcmljIGJvdW5kcykuXG4gKi9cbmZ1bmN0aW9uIHRjYkN0eFBhcmFtKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG5hbWU6IHRzLkVudGl0eU5hbWUsXG4gICAgdXNlR2VuZXJpY1R5cGU6IGJvb2xlYW4pOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiB7XG4gIGxldCB0eXBlQXJndW1lbnRzOiB0cy5UeXBlTm9kZVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgLy8gQ2hlY2sgaWYgdGhlIGNvbXBvbmVudCBpcyBnZW5lcmljLCBhbmQgcGFzcyBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBpZiBzby5cbiAgaWYgKG5vZGUudHlwZVBhcmFtZXRlcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh1c2VHZW5lcmljVHlwZSkge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUocGFyYW0ubmFtZSwgdW5kZWZpbmVkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVBcmd1bWVudHMgPVxuICAgICAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKCgpID0+IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKG5hbWUsIHR5cGVBcmd1bWVudHMpO1xuICByZXR1cm4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyAnY3R4JyxcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFuIGBBU1RgIGV4cHJlc3Npb24gYW5kIGNvbnZlcnQgaXQgaW50byBhIGB0cy5FeHByZXNzaW9uYCwgZ2VuZXJhdGluZyByZWZlcmVuY2VzIHRvIHRoZVxuICogY29ycmVjdCBpZGVudGlmaWVycyBpbiB0aGUgY3VycmVudCBzY29wZS5cbiAqL1xuZnVuY3Rpb24gdGNiRXhwcmVzc2lvbihhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvcih0Y2IsIHNjb3BlKTtcbiAgcmV0dXJuIHRyYW5zbGF0b3IudHJhbnNsYXRlKGFzdCk7XG59XG5cbmNsYXNzIFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHRjYjogQ29udGV4dCwgcHJvdGVjdGVkIHNjb3BlOiBTY29wZSkge31cblxuICB0cmFuc2xhdGUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBgYXN0VG9UeXBlc2NyaXB0YCBhY3R1YWxseSBkb2VzIHRoZSBjb252ZXJzaW9uLiBBIHNwZWNpYWwgcmVzb2x2ZXIgYHRjYlJlc29sdmVgIGlzIHBhc3NlZFxuICAgIC8vIHdoaWNoIGludGVycHJldHMgc3BlY2lmaWMgZXhwcmVzc2lvbiBub2RlcyB0aGF0IGludGVyYWN0IHdpdGggdGhlIGBJbXBsaWNpdFJlY2VpdmVyYC4gVGhlc2VcbiAgICAvLyBub2RlcyBhY3R1YWxseSByZWZlciB0byBpZGVudGlmaWVycyB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICAgcmV0dXJuIGFzdFRvVHlwZXNjcmlwdChhc3QsIGFzdCA9PiB0aGlzLnJlc29sdmUoYXN0KSwgdGhpcy50Y2IuZW52LmNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhbiBgQVNUYCBleHByZXNzaW9uIHdpdGhpbiB0aGUgZ2l2ZW4gc2NvcGUuXG4gICAqXG4gICAqIFNvbWUgYEFTVGAgZXhwcmVzc2lvbnMgcmVmZXIgdG8gdG9wLWxldmVsIGNvbmNlcHRzIChyZWZlcmVuY2VzLCB2YXJpYWJsZXMsIHRoZSBjb21wb25lbnRcbiAgICogY29udGV4dCkuIFRoaXMgbWV0aG9kIGFzc2lzdHMgaW4gcmVzb2x2aW5nIHRob3NlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgLy8gVHJ5IHRvIHJlc29sdmUgYSBib3VuZCB0YXJnZXQgZm9yIHRoaXMgZXhwcmVzc2lvbi4gSWYgbm8gc3VjaCB0YXJnZXQgaXMgYXZhaWxhYmxlLCB0aGVuXG4gICAgICAvLyB0aGUgZXhwcmVzc2lvbiBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsIGNvbXBvbmVudCBjb250ZXh0LiBJbiB0aGF0IGNhc2UsIGBudWxsYCBpc1xuICAgICAgLy8gcmV0dXJuZWQgaGVyZSB0byBsZXQgaXQgZmFsbCB0aHJvdWdoIHJlc29sdXRpb24gc28gaXQgd2lsbCBiZSBjYXVnaHQgd2hlbiB0aGVcbiAgICAgIC8vIGBJbXBsaWNpdFJlY2VpdmVyYCBpcyByZXNvbHZlZCBpbiB0aGUgYnJhbmNoIGJlbG93LlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnJlc29sdmVUYXJnZXQoYXN0KTtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QudmFsdWUpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQmluYXJ5KHRhcmdldCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgZXhwcikpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXN1bHQsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBBU1QgaW5zdGFuY2VzIHJlcHJlc2VudGluZyB2YXJpYWJsZXMgYW5kIHJlZmVyZW5jZXMgbG9vayB2ZXJ5IHNpbWlsYXIgdG8gcHJvcGVydHkgcmVhZHNcbiAgICAgIC8vIG9yIG1ldGhvZCBjYWxscyBmcm9tIHRoZSBjb21wb25lbnQgY29udGV4dDogYm90aCBoYXZlIHRoZSBzaGFwZVxuICAgICAgLy8gUHJvcGVydHlSZWFkKEltcGxpY2l0UmVjZWl2ZXIsICdwcm9wTmFtZScpIG9yIE1ldGhvZENhbGwoSW1wbGljaXRSZWNlaXZlciwgJ21ldGhvZE5hbWUnKS5cbiAgICAgIC8vXG4gICAgICAvLyBgdHJhbnNsYXRlYCB3aWxsIGZpcnN0IHRyeSB0byBgcmVzb2x2ZWAgdGhlIG91dGVyIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsLiBJZiB0aGlzIHdvcmtzLFxuICAgICAgLy8gaXQncyBiZWNhdXNlIHRoZSBgQm91bmRUYXJnZXRgIGZvdW5kIGFuIGV4cHJlc3Npb24gdGFyZ2V0IGZvciB0aGUgd2hvbGUgZXhwcmVzc2lvbiwgYW5kXG4gICAgICAvLyB0aGVyZWZvcmUgYHRyYW5zbGF0ZWAgd2lsbCBuZXZlciBhdHRlbXB0IHRvIGByZXNvbHZlYCB0aGUgSW1wbGljaXRSZWNlaXZlciBvZiB0aGF0XG4gICAgICAvLyBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbC5cbiAgICAgIC8vXG4gICAgICAvLyBUaGVyZWZvcmUgaWYgYHJlc29sdmVgIGlzIGNhbGxlZCBvbiBhbiBgSW1wbGljaXRSZWNlaXZlcmAsIGl0J3MgYmVjYXVzZSBubyBvdXRlclxuICAgICAgLy8gUHJvcGVydHlSZWFkL01ldGhvZENhbGwgcmVzb2x2ZWQgdG8gYSB2YXJpYWJsZSBvciByZWZlcmVuY2UsIGFuZCB0aGVyZWZvcmUgdGhpcyBpcyBhXG4gICAgICAvLyBwcm9wZXJ0eSByZWFkIG9yIG1ldGhvZCBjYWxsIG9uIHRoZSBjb21wb25lbnQgY29udGV4dCBpdHNlbGYuXG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignY3R4Jyk7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSkge1xuICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5leHApO1xuICAgICAgbGV0IHBpcGU6IHRzLkV4cHJlc3Npb258bnVsbDtcbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mUGlwZXMpIHtcbiAgICAgICAgcGlwZSA9IHRoaXMudGNiLmdldFBpcGVCeU5hbWUoYXN0Lm5hbWUpO1xuICAgICAgICBpZiAocGlwZSA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIE5vIHBpcGUgYnkgdGhhdCBuYW1lIGV4aXN0cyBpbiBzY29wZS4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IuXG4gICAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1BpcGUodGhpcy50Y2IuaWQsIGFzdCk7XG5cbiAgICAgICAgICAvLyBSZXR1cm4gYW4gJ2FueScgdmFsdWUgdG8gYXQgbGVhc3QgYWxsb3cgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24gdG8gYmUgY2hlY2tlZC5cbiAgICAgICAgICBwaXBlID0gTlVMTF9BU19BTlk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBpcGUgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVBc0V4cHJlc3Npb24oXG4gICAgICAgICAgICB0cy5jcmVhdGVOdWxsKCksIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLnRyYW5zbGF0ZShhcmcpKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzQ2FsbE1ldGhvZChwaXBlLCAndHJhbnNmb3JtJywgW2V4cHIsIC4uLmFyZ3NdKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgTWV0aG9kQ2FsbCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBSZXNvbHZlIHRoZSBzcGVjaWFsIGAkYW55KGV4cHIpYCBzeW50YXggdG8gaW5zZXJ0IGEgY2FzdCBvZiB0aGUgYXJndW1lbnQgdG8gdHlwZSBgYW55YC5cbiAgICAgIC8vIGAkYW55KGV4cHIpYCAtPiBgZXhwciBhcyBhbnlgXG4gICAgICBpZiAoYXN0Lm5hbWUgPT09ICckYW55JyAmJiBhc3QuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5hcmdzWzBdKTtcbiAgICAgICAgY29uc3QgZXhwckFzQW55ID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihleHByLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZVBhcmVuKGV4cHJBc0FueSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhlIG1ldGhvZCwgYW5kIGdlbmVyYXRlIHRoZSBtZXRob2QgY2FsbCBpZiBhIHRhcmdldFxuICAgICAgLy8gY291bGQgYmUgcmVzb2x2ZWQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW4gdGhlIG1ldGhvZCBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsXG4gICAgICAvLyBjb21wb25lbnQgY29udGV4dCwgaW4gd2hpY2ggY2FzZSBgbnVsbGAgaXMgcmV0dXJuZWQgdG8gbGV0IHRoZSBgSW1wbGljaXRSZWNlaXZlcmAgYmVpbmdcbiAgICAgIC8vIHJlc29sdmVkIHRvIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgIGNvbnN0IHJlY2VpdmVyID0gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1ldGhvZCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHdyYXBGb3JEaWFnbm9zdGljcyhyZWNlaXZlciksIGFzdC5uYW1lKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8obWV0aG9kLCBhc3QubmFtZVNwYW4pO1xuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlQ2FsbChtZXRob2QsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIEFTVCBpc24ndCBzcGVjaWFsIGFmdGVyIGFsbC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZXNvbHZlIGEgYm91bmQgdGFyZ2V0IGZvciBhIGdpdmVuIGV4cHJlc3Npb24sIGFuZCB0cmFuc2xhdGVzIGl0IGludG8gdGhlXG4gICAqIGFwcHJvcHJpYXRlIGB0cy5FeHByZXNzaW9uYCB0aGF0IHJlcHJlc2VudHMgdGhlIGJvdW5kIHRhcmdldC4gSWYgbm8gdGFyZ2V0IGlzIGF2YWlsYWJsZSxcbiAgICogYG51bGxgIGlzIHJldHVybmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVUYXJnZXQoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGJpbmRpbmcgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGFzdCk7XG4gICAgaWYgKGJpbmRpbmcgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHIgPSB0cy5nZXRNdXRhYmxlQ2xvbmUodGhpcy5zY29wZS5yZXNvbHZlKGJpbmRpbmcpKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxufVxuXG4vKipcbiAqIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgYSBkaXJlY3RpdmUgaW5zdGFuY2Ugb24gYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLCBpbmZlcnJpbmcgYSB0eXBlIGZvclxuICogdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBmcm9tIGFueSBib3VuZCBpbnB1dHMuXG4gKi9cbmZ1bmN0aW9uIHRjYkNhbGxUeXBlQ3RvcihcbiAgICBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsIGlucHV0czogVGNiRGlyZWN0aXZlSW5wdXRbXSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0eXBlQ3RvciA9IHRjYi5lbnYudHlwZUN0b3JGb3IoZGlyKTtcblxuICAvLyBDb25zdHJ1Y3QgYW4gYXJyYXkgb2YgYHRzLlByb3BlcnR5QXNzaWdubWVudGBzIGZvciBlYWNoIG9mIHRoZSBkaXJlY3RpdmUncyBpbnB1dHMuXG4gIGNvbnN0IG1lbWJlcnMgPSBpbnB1dHMubWFwKGlucHV0ID0+IHtcbiAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGlucHV0LmZpZWxkKTtcblxuICAgIGlmIChpbnB1dC50eXBlID09PSAnYmluZGluZycpIHtcbiAgICAgIC8vIEZvciBib3VuZCBpbnB1dHMsIHRoZSBwcm9wZXJ0eSBpcyBhc3NpZ25lZCB0aGUgYmluZGluZyBleHByZXNzaW9uLlxuICAgICAgbGV0IGV4cHIgPSBpbnB1dC5leHByZXNzaW9uO1xuICAgICAgaWYgKCF0Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcGVydHlOYW1lLCB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcikpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhhc3NpZ25tZW50LCBpbnB1dC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBhc3NpZ25tZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBIHR5cGUgY29uc3RydWN0b3IgaXMgcmVxdWlyZWQgdG8gYmUgY2FsbGVkIHdpdGggYWxsIGlucHV0IHByb3BlcnRpZXMsIHNvIGFueSB1bnNldFxuICAgICAgLy8gaW5wdXRzIGFyZSBzaW1wbHkgYXNzaWduZWQgYSB2YWx1ZSBvZiB0eXBlIGBhbnlgIHRvIGlnbm9yZSB0aGVtLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIE5VTExfQVNfQU5ZKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENhbGwgdGhlIGBuZ1R5cGVDdG9yYCBtZXRob2Qgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcywgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCBhcmd1bWVudCBjcmVhdGVkXG4gIC8vIGZyb20gdGhlIG1hdGNoZWQgaW5wdXRzLlxuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHlwZUN0b3IsXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW3RzLmNyZWF0ZU9iamVjdExpdGVyYWwobWVtYmVycyldKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm91bmRJbnB1dHMoXG4gICAgZGlyZWN0aXZlOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgIHRjYjogQ29udGV4dCk6IFRjYkJvdW5kSW5wdXRbXSB7XG4gIGNvbnN0IGJvdW5kSW5wdXRzOiBUY2JCb3VuZElucHV0W10gPSBbXTtcblxuICBjb25zdCBwcm9jZXNzQXR0cmlidXRlID0gKGF0dHI6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgPT4ge1xuICAgIC8vIFNraXAgbm9uLXByb3BlcnR5IGJpbmRpbmdzLlxuICAgIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGF0dHIudHlwZSAhPT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTa2lwIHRleHQgYXR0cmlidXRlcyBpZiBjb25maWd1cmVkIHRvIGRvIHNvLlxuICAgIGlmICghdGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzICYmIGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNraXAgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgZGlyZWN0aXZlIGRvZXMgbm90IGhhdmUgYW4gaW5wdXQgZm9yIGl0LlxuICAgIGNvbnN0IGlucHV0cyA9IGRpcmVjdGl2ZS5pbnB1dHMuZ2V0QnlCaW5kaW5nUHJvcGVydHlOYW1lKGF0dHIubmFtZSk7XG4gICAgaWYgKGlucHV0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWVsZE5hbWVzID0gaW5wdXRzLm1hcChpbnB1dCA9PiBpbnB1dC5jbGFzc1Byb3BlcnR5TmFtZSk7XG4gICAgYm91bmRJbnB1dHMucHVzaCh7YXR0cmlidXRlOiBhdHRyLCBmaWVsZE5hbWVzfSk7XG4gIH07XG5cbiAgbm9kZS5pbnB1dHMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgbm9kZS5hdHRyaWJ1dGVzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgbm9kZS50ZW1wbGF0ZUF0dHJzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIH1cblxuICByZXR1cm4gYm91bmRJbnB1dHM7XG59XG5cbi8qKlxuICogVHJhbnNsYXRlcyB0aGUgZ2l2ZW4gYXR0cmlidXRlIGJpbmRpbmcgdG8gYSBgdHMuRXhwcmVzc2lvbmAuXG4gKi9cbmZ1bmN0aW9uIHRyYW5zbGF0ZUlucHV0KFxuICAgIGF0dHI6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAvLyBQcm9kdWNlIGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiB0aGUgYmluZGluZy5cbiAgICByZXR1cm4gdGNiRXhwcmVzc2lvbihhdHRyLnZhbHVlLCB0Y2IsIHNjb3BlKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBGb3IgcmVndWxhciBhdHRyaWJ1dGVzIHdpdGggYSBzdGF0aWMgc3RyaW5nIHZhbHVlLCB1c2UgdGhlIHJlcHJlc2VudGVkIHN0cmluZyBsaXRlcmFsLlxuICAgIHJldHVybiB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGF0dHIudmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQW4gaW5wdXQgYmluZGluZyB0aGF0IGNvcnJlc3BvbmRzIHdpdGggYSBmaWVsZCBvZiBhIGRpcmVjdGl2ZS5cbiAqL1xuaW50ZXJmYWNlIFRjYkRpcmVjdGl2ZUJvdW5kSW5wdXQge1xuICB0eXBlOiAnYmluZGluZyc7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIGEgZmllbGQgb24gdGhlIGRpcmVjdGl2ZSB0aGF0IGlzIHNldC5cbiAgICovXG4gIGZpZWxkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuRXhwcmVzc2lvbmAgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBpbnB1dCBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAqL1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgc291cmNlIHNwYW4gb2YgdGhlIGZ1bGwgYXR0cmlidXRlIGJpbmRpbmcuXG4gICAqL1xuICBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW47XG59XG5cbi8qKlxuICogSW5kaWNhdGVzIHRoYXQgYSBjZXJ0YWluIGZpZWxkIG9mIGEgZGlyZWN0aXZlIGRvZXMgbm90IGhhdmUgYSBjb3JyZXNwb25kaW5nIGlucHV0IGJpbmRpbmcuXG4gKi9cbmludGVyZmFjZSBUY2JEaXJlY3RpdmVVbnNldElucHV0IHtcbiAgdHlwZTogJ3Vuc2V0JztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgYSBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlIGZvciB3aGljaCBubyBpbnB1dCBiaW5kaW5nIGlzIHByZXNlbnQuXG4gICAqL1xuICBmaWVsZDogc3RyaW5nO1xufVxuXG50eXBlIFRjYkRpcmVjdGl2ZUlucHV0ID0gVGNiRGlyZWN0aXZlQm91bmRJbnB1dHxUY2JEaXJlY3RpdmVVbnNldElucHV0O1xuXG5jb25zdCBFVkVOVF9QQVJBTUVURVIgPSAnJGV2ZW50JztcblxuY29uc3QgZW51bSBFdmVudFBhcmFtVHlwZSB7XG4gIC8qIEdlbmVyYXRlcyBjb2RlIHRvIGluZmVyIHRoZSB0eXBlIG9mIGAkZXZlbnRgIGJhc2VkIG9uIGhvdyB0aGUgbGlzdGVuZXIgaXMgcmVnaXN0ZXJlZC4gKi9cbiAgSW5mZXIsXG5cbiAgLyogRGVjbGFyZXMgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciBhcyBgYW55YC4gKi9cbiAgQW55LFxufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyb3cgZnVuY3Rpb24gdG8gYmUgdXNlZCBhcyBoYW5kbGVyIGZ1bmN0aW9uIGZvciBldmVudCBiaW5kaW5ncy4gVGhlIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZSBwYXJhbWV0ZXIgYCRldmVudGAgYW5kIHRoZSBib3VuZCBldmVudCdzIGhhbmRsZXIgYEFTVGAgcmVwcmVzZW50ZWQgYXMgYVxuICogVHlwZVNjcmlwdCBleHByZXNzaW9uIGFzIGl0cyBib2R5LlxuICpcbiAqIFdoZW4gYGV2ZW50VHlwZWAgaXMgc2V0IHRvIGBJbmZlcmAsIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIgd2lsbCBub3QgaGF2ZSBhbiBleHBsaWNpdCB0eXBlLiBUaGlzXG4gKiBhbGxvd3MgZm9yIHRoZSBjcmVhdGVkIGhhbmRsZXIgZnVuY3Rpb24gdG8gaGF2ZSBpdHMgYCRldmVudGAgcGFyYW1ldGVyJ3MgdHlwZSBpbmZlcnJlZCBiYXNlZCBvblxuICogaG93IGl0J3MgdXNlZCwgdG8gZW5hYmxlIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50IGJpbmRpbmdzLiBXaGVuIHNldCB0byBgQW55YCwgdGhlIGAkZXZlbnRgXG4gKiBwYXJhbWV0ZXIgd2lsbCBoYXZlIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUsIGVmZmVjdGl2ZWx5IGRpc2FibGluZyBzdHJpY3QgdHlwZSBjaGVja2luZyBvZiBldmVudFxuICogYmluZGluZ3MuIEFsdGVybmF0aXZlbHksIGFuIGV4cGxpY2l0IHR5cGUgY2FuIGJlIHBhc3NlZCBmb3IgdGhlIGAkZXZlbnRgIHBhcmFtZXRlci5cbiAqL1xuZnVuY3Rpb24gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKFxuICAgIGV2ZW50OiBUbXBsQXN0Qm91bmRFdmVudCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUsXG4gICAgZXZlbnRUeXBlOiBFdmVudFBhcmFtVHlwZXx0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCBoYW5kbGVyID0gdGNiRXZlbnRIYW5kbGVyRXhwcmVzc2lvbihldmVudC5oYW5kbGVyLCB0Y2IsIHNjb3BlKTtcblxuICBsZXQgZXZlbnRQYXJhbVR5cGU6IHRzLlR5cGVOb2RlfHVuZGVmaW5lZDtcbiAgaWYgKGV2ZW50VHlwZSA9PT0gRXZlbnRQYXJhbVR5cGUuSW5mZXIpIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChldmVudFR5cGUgPT09IEV2ZW50UGFyYW1UeXBlLkFueSkge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSBldmVudFR5cGU7XG4gIH1cblxuICAvLyBPYnRhaW4gYWxsIGd1YXJkcyB0aGF0IGhhdmUgYmVlbiBhcHBsaWVkIHRvIHRoZSBzY29wZSBhbmQgaXRzIHBhcmVudHMsIGFzIHRoZXkgaGF2ZSB0byBiZVxuICAvLyByZXBlYXRlZCB3aXRoaW4gdGhlIGhhbmRsZXIgZnVuY3Rpb24gZm9yIHRoZWlyIG5hcnJvd2luZyB0byBiZSBpbiBlZmZlY3Qgd2l0aGluIHRoZSBoYW5kbGVyLlxuICBjb25zdCBndWFyZHMgPSBzY29wZS5ndWFyZHMoKTtcblxuICBsZXQgYm9keTogdHMuU3RhdGVtZW50ID0gdHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKTtcbiAgaWYgKGd1YXJkcyAhPT0gbnVsbCkge1xuICAgIC8vIFdyYXAgdGhlIGJvZHkgaW4gYW4gYGlmYCBzdGF0ZW1lbnQgY29udGFpbmluZyBhbGwgZ3VhcmRzIHRoYXQgaGF2ZSB0byBiZSBhcHBsaWVkLlxuICAgIGJvZHkgPSB0cy5jcmVhdGVJZihndWFyZHMsIGJvZHkpO1xuICB9XG5cbiAgY29uc3QgZXZlbnRQYXJhbSA9IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gRVZFTlRfUEFSQU1FVEVSLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIGV2ZW50UGFyYW1UeXBlKTtcblxuICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKFxuICAgICAgLyogbW9kaWZpZXIgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi9bZXZlbnRQYXJhbV0sXG4gICAgICAvKiB0eXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpLFxuICAgICAgLyogYm9keSAqLyB0cy5jcmVhdGVCbG9jayhbYm9keV0pKTtcbn1cblxuLyoqXG4gKiBTaW1pbGFyIHRvIGB0Y2JFeHByZXNzaW9uYCwgdGhpcyBmdW5jdGlvbiBjb252ZXJ0cyB0aGUgcHJvdmlkZWQgYEFTVGAgZXhwcmVzc2lvbiBpbnRvIGFcbiAqIGB0cy5FeHByZXNzaW9uYCwgd2l0aCBzcGVjaWFsIGhhbmRsaW5nIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSB0aGF0IGNhbiBiZSB1c2VkIHdpdGhpbiBldmVudFxuICogYmluZGluZ3MuXG4gKi9cbmZ1bmN0aW9uIHRjYkV2ZW50SGFuZGxlckV4cHJlc3Npb24oYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHRyYW5zbGF0b3IgPSBuZXcgVGNiRXZlbnRIYW5kbGVyVHJhbnNsYXRvcih0Y2IsIHNjb3BlKTtcbiAgcmV0dXJuIHRyYW5zbGF0b3IudHJhbnNsYXRlKGFzdCk7XG59XG5cbmNsYXNzIFRjYkV2ZW50SGFuZGxlclRyYW5zbGF0b3IgZXh0ZW5kcyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvciB7XG4gIHByb3RlY3RlZCByZXNvbHZlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBSZWNvZ25pemUgYSBwcm9wZXJ0eSByZWFkIG9uIHRoZSBpbXBsaWNpdCByZWNlaXZlciBjb3JyZXNwb25kaW5nIHdpdGggdGhlIGV2ZW50IHBhcmFtZXRlclxuICAgIC8vIHRoYXQgaXMgYXZhaWxhYmxlIGluIGV2ZW50IGJpbmRpbmdzLiBTaW5jZSB0aGlzIHZhcmlhYmxlIGlzIGEgcGFyYW1ldGVyIG9mIHRoZSBoYW5kbGVyXG4gICAgLy8gZnVuY3Rpb24gdGhhdCB0aGUgY29udmVydGVkIGV4cHJlc3Npb24gYmVjb21lcyBhIGNoaWxkIG9mLCBqdXN0IGNyZWF0ZSBhIHJlZmVyZW5jZSB0byB0aGVcbiAgICAvLyBwYXJhbWV0ZXIgYnkgaXRzIG5hbWUuXG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyICYmXG4gICAgICAgIGFzdC5uYW1lID09PSBFVkVOVF9QQVJBTUVURVIpIHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcihFVkVOVF9QQVJBTUVURVIpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhldmVudCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVzb2x2ZShhc3QpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBib29sZWFuIHtcbiAgLy8gSW4gb3JkZXIgdG8gcXVhbGlmeSBmb3IgYSBkZWNsYXJlZCBUQ0IgKG5vdCBpbmxpbmUpIHR3byBjb25kaXRpb25zIG11c3QgYmUgbWV0OlxuICAvLyAxKSB0aGUgY2xhc3MgbXVzdCBiZSBleHBvcnRlZFxuICAvLyAyKSBpdCBtdXN0IG5vdCBoYXZlIGNvbnN0cmFpbmVkIGdlbmVyaWMgdHlwZXNcbiAgaWYgKCFjaGVja0lmQ2xhc3NJc0V4cG9ydGVkKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDEgaXMgZmFsc2UsIHRoZSBjbGFzcyBpcyBub3QgZXhwb3J0ZWQuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoIWNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDIgaXMgZmFsc2UsIHRoZSBjbGFzcyBoYXMgY29uc3RyYWluZWQgZ2VuZXJpYyB0eXBlc1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19