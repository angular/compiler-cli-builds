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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclksK0JBQWlDO0lBT2pDLG1GQUFnRztJQUNoRyx5RkFBa0Y7SUFHbEYsdUZBQTBEO0lBRTFELHVHQUErRDtJQUMvRCxpRkFBbU07SUFFbk07Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFCRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxHQUFnQixFQUFFLEdBQXFELEVBQUUsSUFBbUIsRUFDNUYsSUFBNEIsRUFBRSxnQkFBa0MsRUFDaEUsV0FBd0M7UUFDMUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQ25CLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdGLElBQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFVLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUNYLG1FQUFpRSxHQUFHLENBQUMsU0FBVyxDQUFDLENBQUM7U0FDdkY7UUFDRCxJQUFNLFNBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFakcsSUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZDLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxXQUFXLGtCQUMzQixHQUFHLENBQUMsb0JBQW9CLEVBQUUsRUFDMUIsZUFBZSxFQUNsQixDQUFDO1FBRUgsZ0dBQWdHO1FBQ2hHLDBEQUEwRDtRQUMxRCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRixJQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMseUJBQXlCO1FBQ3ZDLGdCQUFnQixDQUFDLFNBQVM7UUFDMUIsZUFBZSxDQUFDLFNBQVM7UUFDekIsbUJBQW1CLENBQUMsU0FBUztRQUM3QixVQUFVLENBQUMsSUFBSTtRQUNmLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTO1FBQzNGLGdCQUFnQixDQUFDLFNBQVM7UUFDMUIsVUFBVSxDQUFDLFNBQVM7UUFDcEIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLDJCQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBbENELHdEQWtDQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBQ0g7UUFBQTtRQXFCQSxDQUFDO1FBWEM7Ozs7Ozs7V0FPRztRQUNILGdDQUFnQixHQUFoQjtZQUNFLE9BQU8sK0JBQStCLENBQUM7UUFDekMsQ0FBQztRQUNILFlBQUM7SUFBRCxDQUFDLEFBckJELElBcUJDO0lBRUQ7Ozs7O09BS0c7SUFDSDtRQUEyQix3Q0FBSztRQUM5QixzQkFBb0IsR0FBWSxFQUFVLEtBQVksRUFBVSxPQUF1QjtZQUF2RixZQUNFLGlCQUFPLFNBQ1I7WUFGbUIsU0FBRyxHQUFILEdBQUcsQ0FBUztZQUFVLFdBQUssR0FBTCxLQUFLLENBQU87WUFBVSxhQUFPLEdBQVAsT0FBTyxDQUFnQjs7UUFFdkYsQ0FBQztRQUVELHNCQUFJLGtDQUFRO2lCQUFaO2dCQUNFLHVGQUF1RjtnQkFDdkYsZ0dBQWdHO2dCQUNoRyw2RUFBNkU7Z0JBQzdFLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQzs7O1dBQUE7UUFFRCw4QkFBTyxHQUFQO1lBQ0UsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQyxtRUFBbUU7WUFDbkUsSUFBTSxXQUFXLEdBQUcseUJBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZELDhCQUFnQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZGLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLDBCQUFnQixDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUNILG1CQUFDO0lBQUQsQ0FBQyxBQXBCRCxDQUEyQixLQUFLLEdBb0IvQjtJQUVEOzs7OztPQUtHO0lBQ0g7UUFBNEIseUNBQUs7UUFDL0IsdUJBQ1ksR0FBWSxFQUFVLEtBQVksRUFBVSxRQUF5QixFQUNyRSxRQUF5QjtZQUZyQyxZQUdFLGlCQUFPLFNBQ1I7WUFIVyxTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLGNBQVEsR0FBUixRQUFRLENBQWlCO1lBQ3JFLGNBQVEsR0FBUixRQUFRLENBQWlCOztRQUVyQyxDQUFDO1FBRUQsc0JBQUksbUNBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELCtCQUFPLEdBQVA7WUFDRSxnREFBZ0Q7WUFDaEQsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTlDLDhGQUE4RjtZQUM5RiwyQkFBMkI7WUFDM0IsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQyxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsb0JBQW9CO1lBQ3ZDLGdCQUFnQixDQUFDLEdBQUc7WUFDcEIsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLFdBQVcsQ0FBQyxDQUFDO1lBQ25ELDhCQUFnQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXhELG1EQUFtRDtZQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQywwQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUEzQkQsQ0FBNEIsS0FBSyxHQTJCaEM7SUFFRDs7OztPQUlHO0lBQ0g7UUFBbUMsZ0RBQUs7UUFDdEMsOEJBQW9CLEdBQVksRUFBVSxLQUFZO1lBQXRELFlBQ0UsaUJBQU8sU0FDUjtZQUZtQixTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTzs7UUFFdEQsQ0FBQztRQUVELHNCQUFJLDBDQUFRO2lCQUFaO2dCQUNFLE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQzs7O1dBQUE7UUFFRCxzQ0FBTyxHQUFQO1lBQ0UsZ0dBQWdHO1lBQ2hHLDREQUE0RDtZQUM1RCxJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLDJCQUFpQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQWpCRCxDQUFtQyxLQUFLLEdBaUJ2QztJQUVEOzs7Ozs7T0FNRztJQUNIO1FBQWdDLDZDQUFLO1FBQ25DLDJCQUFvQixHQUFZLEVBQVUsS0FBWSxFQUFVLFFBQXlCO1lBQXpGLFlBQ0UsaUJBQU8sU0FDUjtZQUZtQixTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLGNBQVEsR0FBUixRQUFRLENBQWlCOztRQUV6RixDQUFDO1FBRUQsc0JBQUksdUNBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELG1DQUFPLEdBQVA7O1lBQUEsaUJBcUdDO1lBcEdDLDhGQUE4RjtZQUM5RiwrRkFBK0Y7WUFDL0YsOEZBQThGO1lBQzlGLDZFQUE2RTtZQUM3RSxFQUFFO1lBQ0YsZ0dBQWdHO1lBQ2hHLDRGQUE0RjtZQUM1Riw2RkFBNkY7WUFDN0YsNERBQTREO1lBQzVELElBQU0sZUFBZSxHQUFvQixFQUFFLENBQUM7WUFFNUMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTt3Q0FDWixHQUFHO29CQUNaLElBQU0sU0FBUyxHQUFHLE9BQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFLLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDekQsSUFBTSxLQUFLLEdBQ1AsT0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBdUQsQ0FBQyxDQUFDO29CQUV4Riw0RkFBNEY7b0JBQzVGLDJGQUEyRjtvQkFDM0Ysb0RBQW9EO29CQUNwRCxHQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSzt3QkFDaEMsdUZBQXVGO3dCQUN2RixJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxTQUFTLEVBQTFCLENBQTBCLENBQUM7NEJBQ3pFLEtBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FDNUIsVUFBQyxDQUE2QztnQ0FDMUMsT0FBQSxDQUFDLFlBQVksZ0NBQXFCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsU0FBUzs0QkFBaEUsQ0FBZ0UsQ0FBQyxDQUFDO3dCQUM5RSxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7NEJBQzVCLDZEQUE2RDs0QkFDN0QsSUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSSxDQUFDLEdBQUcsRUFBRSxLQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7NEJBRW5FLGlGQUFpRjs0QkFDakYsMERBQTBEOzRCQUMxRCxnQ0FBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFFNUIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtnQ0FDNUIsOENBQThDO2dDQUM5QyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzZCQUM1QjtpQ0FBTTtnQ0FDTCxnRkFBZ0Y7Z0NBQ2hGLGNBQWM7Z0NBQ2QsSUFBTSxXQUFXLEdBQUcsc0JBQVksQ0FBQyxLQUFLLEVBQUUscUJBQW1CLEtBQUssQ0FBQyxTQUFXLEVBQUU7b0NBQzVFLFNBQVM7b0NBQ1QsSUFBSTtpQ0FDTCxDQUFDLENBQUM7Z0NBQ0gsOEJBQWdCLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7Z0NBQzNELGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7NkJBQ25DO3lCQUNGO29CQUNILENBQUMsQ0FBQyxDQUFDO29CQUVILHdGQUF3RjtvQkFDeEYsb0NBQW9DO29CQUNwQyxJQUFJLEdBQUcsQ0FBQyx5QkFBeUIsSUFBSSxPQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFO3dCQUNuRixJQUFNLEdBQUcsR0FBRyxPQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBSyxRQUFRLENBQUMsQ0FBQzt3QkFDOUMsSUFBTSxXQUFXLEdBQUcsc0JBQVksQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDcEYsOEJBQWdCLENBQUMsV0FBVyxFQUFFLE9BQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN4RCxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO3FCQUNuQzs7OztvQkE3Q0gsS0FBa0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQTt3QkFBdkIsSUFBTSxHQUFHLHVCQUFBO2dDQUFILEdBQUc7cUJBOENiOzs7Ozs7Ozs7YUFDRjtZQUVELHlDQUF5QztZQUN6QyxJQUFJLEtBQUssR0FBdUIsSUFBSSxDQUFDO1lBRXJDLDZEQUE2RDtZQUM3RCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QiwwRkFBMEY7Z0JBQzFGLHlGQUF5RjtnQkFDekYsS0FBSyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQzFCLFVBQUMsSUFBSSxFQUFFLFFBQVE7b0JBQ1gsT0FBQSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQztnQkFBdEUsQ0FBc0UsRUFDMUUsZUFBZSxDQUFDLEdBQUcsRUFBRyxDQUFDLENBQUM7YUFDN0I7WUFFRCwrRkFBK0Y7WUFDL0YsNERBQTREO1lBQzVELElBQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFN0UscURBQXFEO1lBQ3JELElBQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUMzQix3RkFBd0Y7Z0JBQ3hGLDRGQUE0RjtnQkFDNUYsc0ZBQXNGO2dCQUN0Riw0RkFBNEY7Z0JBQzVGLDRFQUE0RTtnQkFDNUUsc0JBQXNCO2dCQUN0QixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxTQUFTLEdBQWlCLEVBQUUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekQsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO2dCQUNsQiwwRkFBMEY7Z0JBQzFGLDZDQUE2QztnQkFDN0MsU0FBUyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ2hGO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFbkMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBL0dELENBQWdDLEtBQUssR0ErR3BDO0lBRUQ7Ozs7T0FJRztJQUNIO1FBQXFDLGtEQUFLO1FBQ3hDLGdDQUFvQixHQUFZLEVBQVUsS0FBWSxFQUFVLE9BQXlCO1lBQXpGLFlBQ0UsaUJBQU8sU0FDUjtZQUZtQixTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLGFBQU8sR0FBUCxPQUFPLENBQWtCOztRQUV6RixDQUFDO1FBRUQsc0JBQUksNENBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELHdDQUFPLEdBQVA7WUFDRSxJQUFNLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDNUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBZEQsQ0FBcUMsS0FBSyxHQWN6QztJQUVEOzs7Ozs7OztPQVFHO0lBQ0g7UUFBaUMsOENBQUs7UUFDcEMsNEJBQ1ksR0FBWSxFQUFVLEtBQVksRUFBVSxJQUFvQyxFQUNoRixHQUErQjtZQUYzQyxZQUdFLGlCQUFPLFNBQ1I7WUFIVyxTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLFVBQUksR0FBSixJQUFJLENBQWdDO1lBQ2hGLFNBQUcsR0FBSCxHQUFHLENBQTRCOztRQUUzQyxDQUFDO1FBRUQsc0JBQUksd0NBQVE7aUJBQVo7Z0JBQ0UsNkZBQTZGO2dCQUM3RixzRkFBc0Y7Z0JBQ3RGLDZFQUE2RTtnQkFDN0UsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDOzs7V0FBQTtRQUVELG9DQUFPLEdBQVA7WUFDRSxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBRWpDLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RELGtDQUF1QixDQUFDLElBQUksRUFBRSwrQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5RCw4QkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMxRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQywyQkFBaUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUF2QkQsQ0FBaUMsS0FBSyxHQXVCckM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW1CRztJQUNIO1FBQTZCLDBDQUFLO1FBQ2hDLHdCQUNxQixHQUFZLEVBQW1CLEtBQVksRUFDM0MsSUFBc0IsRUFDdEIsSUFBb0MsRUFDcEMsTUFBaUU7WUFKdEYsWUFLRSxpQkFBTyxTQUNSO1lBTG9CLFNBQUcsR0FBSCxHQUFHLENBQVM7WUFBbUIsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUMzQyxVQUFJLEdBQUosSUFBSSxDQUFrQjtZQUN0QixVQUFJLEdBQUosSUFBSSxDQUFnQztZQUNwQyxZQUFNLEdBQU4sTUFBTSxDQUEyRDtZQUl0RixpRkFBaUY7WUFDakYsb0ZBQW9GO1lBQzNFLGNBQVEsR0FBRyxJQUFJLENBQUM7O1FBSnpCLENBQUM7UUFNRCxnQ0FBTyxHQUFQO1lBQ0UsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQyxJQUFJLFdBQVcsR0FDWCxJQUFJLENBQUMsTUFBTSxZQUFZLDBCQUFlLElBQUksSUFBSSxDQUFDLE1BQU0sWUFBWSx5QkFBYyxDQUFDLENBQUM7Z0JBQ2pGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUvQyx3RkFBd0Y7WUFDeEYsdUJBQXVCO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxZQUFZLHlCQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUM7Z0JBQ3hGLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFO2dCQUNwRCwwRkFBMEY7Z0JBQzFGLHVFQUF1RTtnQkFDdkUsNENBQTRDO2dCQUM1QyxXQUFXO29CQUNQLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUM1RjtpQkFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLFlBQVksMEJBQWUsRUFBRTtnQkFDakQsNEVBQTRFO2dCQUM1RSw2REFBNkQ7Z0JBQzdELHFEQUFxRDtnQkFDckQsV0FBVztvQkFDUCxFQUFFLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNGLFdBQVcsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQy9CLFdBQVcsRUFDWCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLENBQUMsdUJBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEYsV0FBVyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDM0M7WUFDRCw4QkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVwRCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQywwQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUE3Q0QsQ0FBNkIsS0FBSyxHQTZDakM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNIO1FBQWlDLDhDQUFLO1FBQ3BDLDRCQUNZLEdBQVksRUFBVSxLQUFZLEVBQVUsSUFBb0MsRUFDaEYsR0FBK0I7WUFGM0MsWUFHRSxpQkFBTyxTQUNSO1lBSFcsU0FBRyxHQUFILEdBQUcsQ0FBUztZQUFVLFdBQUssR0FBTCxLQUFLLENBQU87WUFBVSxVQUFJLEdBQUosSUFBSSxDQUFnQztZQUNoRixTQUFHLEdBQUgsR0FBRyxDQUE0Qjs7UUFFM0MsQ0FBQztRQUVELHNCQUFJLHdDQUFRO2lCQUFaO2dCQUNFLDJGQUEyRjtnQkFDM0YsOEVBQThFO2dCQUM5RSxPQUFPLElBQUksQ0FBQztZQUNkLENBQUM7OztXQUFBO1FBRUQsb0NBQU8sR0FBUDs7WUFDRSxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pDLGtDQUF1QixDQUFDLEVBQUUsRUFBRSwrQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1RCw4QkFBZ0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUV4RSxJQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztZQUUzRCxJQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7Z0JBQzdELEtBQW9CLElBQUEsV0FBQSxpQkFBQSxNQUFNLENBQUEsOEJBQUEsa0RBQUU7b0JBQXZCLElBQU0sS0FBSyxtQkFBQTs7d0JBQ2QsS0FBd0IsSUFBQSxvQkFBQSxpQkFBQSxLQUFLLENBQUMsVUFBVSxDQUFBLENBQUEsZ0JBQUEsNEJBQUU7NEJBQXJDLElBQU0sU0FBUyxXQUFBOzRCQUNsQix5RkFBeUY7NEJBQ3pGLG9DQUFvQzs0QkFDcEMsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dDQUNoQyxTQUFTOzZCQUNWOzRCQUVELElBQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUN6RSxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtnQ0FDM0IsSUFBSSxFQUFFLFNBQVM7Z0NBQ2YsS0FBSyxFQUFFLFNBQVM7Z0NBQ2hCLFVBQVUsWUFBQTtnQ0FDVixVQUFVLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVOzZCQUN2QyxDQUFDLENBQUM7eUJBQ0o7Ozs7Ozs7OztpQkFDRjs7Ozs7Ozs7OztnQkFFRCxxRUFBcUU7Z0JBQ3JFLEtBQTBCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBaEMsSUFBQSxLQUFBLDJCQUFXLEVBQVYsU0FBUyxRQUFBO29CQUNuQixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTt3QkFDakMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDO3FCQUNqRTtpQkFDRjs7Ozs7Ozs7O1lBRUQsdUZBQXVGO1lBQ3ZGLFlBQVk7WUFDWixJQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RixnQ0FBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQywwQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN4RCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCw2Q0FBZ0IsR0FBaEI7WUFDRSxPQUFPLElBQUksa0NBQWtDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUF6REQsQ0FBaUMsS0FBSyxHQXlEckM7SUFFRDs7Ozs7T0FLRztJQUNIO1FBQW1DLGdEQUFLO1FBQ3RDLDhCQUNZLEdBQVksRUFBVSxLQUFZLEVBQVUsSUFBb0MsRUFDaEYsR0FBK0I7WUFGM0MsWUFHRSxpQkFBTyxTQUNSO1lBSFcsU0FBRyxHQUFILEdBQUcsQ0FBUztZQUFVLFdBQUssR0FBTCxLQUFLLENBQU87WUFBVSxVQUFJLEdBQUosSUFBSSxDQUFnQztZQUNoRixTQUFHLEdBQUgsR0FBRyxDQUE0Qjs7UUFFM0MsQ0FBQztRQUVELHNCQUFJLDBDQUFRO2lCQUFaO2dCQUNFLE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQzs7O1dBQUE7UUFFRCxzQ0FBTyxHQUFQOztZQUNFLElBQUksS0FBSyxHQUF1QixJQUFJLENBQUM7WUFFckMsMkNBQTJDO1lBRTNDLElBQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOztnQkFDN0QsS0FBb0IsSUFBQSxXQUFBLGlCQUFBLE1BQU0sQ0FBQSw4QkFBQSxrREFBRTtvQkFBdkIsSUFBTSxLQUFLLG1CQUFBO29CQUNkLHFFQUFxRTtvQkFDckUsSUFBSSxJQUFJLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLEVBQUU7d0JBQ2pELHVGQUF1Rjt3QkFDdkYseUJBQXlCO3dCQUN6QixJQUFJLEdBQUcscUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDMUI7eUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRTt3QkFDdkQsb0ZBQW9GO3dCQUNwRixtREFBbUQ7d0JBQ25ELElBQUksR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3pDO29CQUVELElBQUksVUFBVSxHQUFrQixnQ0FBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7d0JBRXpELEtBQXdCLElBQUEsb0JBQUEsaUJBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQSxDQUFBLGdCQUFBLDRCQUFFOzRCQUFyQyxJQUFNLFNBQVMsV0FBQTs0QkFDbEIsSUFBSSxNQUFNLFNBQTJCLENBQUM7NEJBQ3RDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0NBQzlDLHFGQUFxRjtnQ0FDckYsb0ZBQW9GO2dDQUNwRixzRkFBc0Y7Z0NBQ3RGLDRCQUE0QjtnQ0FDNUIsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQzVELElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUU7b0NBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsa0RBQWdELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO2lDQUMvRTtnQ0FFRCxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dDQUNqQyxJQUFNLElBQUksR0FBRywwQ0FBZ0MsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dDQUM5RSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQywyQkFBaUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztnQ0FFckQsTUFBTSxHQUFHLEVBQUUsQ0FBQzs2QkFDYjtpQ0FBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dDQUN4RCxxRkFBcUY7Z0NBQ3JGLHdGQUF3RjtnQ0FDeEYseURBQXlEO2dDQUN6RCxTQUFTOzZCQUNWO2lDQUFNLElBQ0gsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsb0NBQW9DO2dDQUN6RCxJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQ0FDakQsaUZBQWlGO2dDQUNqRixzRkFBc0Y7Z0NBQ3RGLHlGQUF5RjtnQ0FDekYsYUFBYTtnQ0FDYixJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7b0NBQ2xCLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQ0FDakQ7Z0NBRUQsSUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQ0FDakMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQzVELElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUU7b0NBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsa0RBQWdELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO2lDQUMvRTtnQ0FDRCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsMkJBQTJCLENBQ3ZDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFzQixDQUFDLEVBQzlDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNqRSxJQUFNLElBQUksR0FBRywyQkFBaUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQ3pDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUM5QixNQUFNLEdBQUcsRUFBRSxDQUFDOzZCQUNiO2lDQUFNO2dDQUNMLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtvQ0FDbEIsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lDQUNqRDtnQ0FFRCxxRkFBcUY7Z0NBQ3JGLGlGQUFpRjtnQ0FDakYsa0RBQWtEO2dDQUNsRCxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQ0FDdkQsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUNsRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOzZCQUNwRTs0QkFFRCxpRkFBaUY7NEJBQ2pGLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQzt5QkFDN0U7Ozs7Ozs7OztvQkFFRCw4QkFBZ0IsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDekQsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7aUJBQ25FOzs7Ozs7Ozs7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFyR0QsQ0FBbUMsS0FBSyxHQXFHdkM7SUFFRDs7Ozs7Ozs7Ozs7OztPQWFHO0lBQ0g7UUFBaUQsOERBQUs7UUFDcEQsNENBQ1ksR0FBWSxFQUFVLEtBQVksRUFBVSxJQUFvQyxFQUNoRixHQUErQjtZQUYzQyxZQUdFLGlCQUFPLFNBQ1I7WUFIVyxTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLFVBQUksR0FBSixJQUFJLENBQWdDO1lBQ2hGLFNBQUcsR0FBSCxHQUFHLENBQTRCOztRQUUzQyxDQUFDO1FBRUQsc0JBQUksd0RBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELG9EQUFPLEdBQVA7WUFDRSxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEQsSUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUNyQyxRQUFRLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQywwQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQ25FLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUNILHlDQUFDO0lBQUQsQ0FBQyxBQW5CRCxDQUFpRCxLQUFLLEdBbUJyRDtJQUVEOzs7Ozs7Ozs7T0FTRztJQUNIO1FBQW9DLGlEQUFLO1FBQ3ZDLCtCQUNZLEdBQVksRUFBVSxPQUF1QixFQUFVLFlBQXFCLEVBQzVFLGFBQTBCO1lBRnRDLFlBR0UsaUJBQU8sU0FDUjtZQUhXLFNBQUcsR0FBSCxHQUFHLENBQVM7WUFBVSxhQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGtCQUFZLEdBQVosWUFBWSxDQUFTO1lBQzVFLG1CQUFhLEdBQWIsYUFBYSxDQUFhOztRQUV0QyxDQUFDO1FBRUQsc0JBQUksMkNBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELHVDQUFPLEdBQVA7O1lBQ0UsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDckY7O2dCQUVELDhDQUE4QztnQkFDOUMsS0FBc0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO29CQUF0QyxJQUFNLE9BQU8sV0FBQTtvQkFDaEIsSUFBSSxPQUFPLENBQUMsSUFBSSxxQkFBeUIsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ2pGLHNEQUFzRDt3QkFDdEQsU0FBUztxQkFDVjtvQkFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLHFCQUF5QixFQUFFO3dCQUN6QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFOzRCQUN4RCxrQ0FBa0M7NEJBQ2xDLElBQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQzs0QkFDaEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQzt5QkFDcEY7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWxDRCxDQUFvQyxLQUFLLEdBa0N4QztJQUdEOzs7T0FHRztJQUNILElBQU0sWUFBWSxHQUE2QjtRQUM3QyxPQUFPLEVBQUUsV0FBVztRQUNwQixLQUFLLEVBQUUsU0FBUztRQUNoQixZQUFZLEVBQUUsWUFBWTtRQUMxQixXQUFXLEVBQUUsV0FBVztRQUN4QixVQUFVLEVBQUUsVUFBVTtRQUN0QixVQUFVLEVBQUUsVUFBVTtLQUN2QixDQUFDO0lBRUY7Ozs7Ozs7OztPQVNHO0lBQ0g7UUFBbUMsZ0RBQUs7UUFDdEMsOEJBQ1ksR0FBWSxFQUFVLEtBQVksRUFBVSxPQUF1QixFQUNuRSxhQUEwQjtZQUZ0QyxZQUdFLGlCQUFPLFNBQ1I7WUFIVyxTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLGFBQU8sR0FBUCxPQUFPLENBQWdCO1lBQ25FLG1CQUFhLEdBQWIsYUFBYSxDQUFhOztRQUV0QyxDQUFDO1FBRUQsc0JBQUksMENBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELHNDQUFPLEdBQVA7O1lBQ0UsZ0dBQWdHO1lBQ2hHLHNCQUFzQjtZQUN0QixJQUFJLElBQUksR0FBdUIsSUFBSSxDQUFDOztnQkFFcEMsOENBQThDO2dCQUM5QyxLQUFzQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXRDLElBQU0sT0FBTyxXQUFBO29CQUNoQixJQUFJLE9BQU8sQ0FBQyxJQUFJLHFCQUF5QixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDakYsc0RBQXNEO3dCQUN0RCxTQUFTO3FCQUNWO29CQUVELElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFO3dCQUNqRCx1RkFBdUY7d0JBQ3ZGLHlCQUF5Qjt3QkFDekIsSUFBSSxHQUFHLHFCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQzFCO3lCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUU7d0JBQ3ZELG9GQUFvRjt3QkFDcEYsbURBQW1EO3dCQUNuRCxJQUFJLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN6QztvQkFFRCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsSUFBSSxPQUFPLENBQUMsSUFBSSxxQkFBeUIsRUFBRTt3QkFDdkYsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTs0QkFDeEQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO2dDQUNqQixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzZCQUN6Qzs0QkFDRCxrQ0FBa0M7NEJBQ2xDLElBQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQzs0QkFDaEUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzs0QkFDaEYsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsZ0NBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs0QkFDeEYsOEJBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzs0QkFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7eUJBQzdEOzZCQUFNOzRCQUNMLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3lCQUM3RDtxQkFDRjt5QkFBTTt3QkFDTCwwRkFBMEY7d0JBQzFGLCtCQUErQjt3QkFDL0IsaURBQWlEO3dCQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDN0Q7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQTFERCxDQUFtQyxLQUFLLEdBMER2QztJQUVEOzs7OztPQUtHO0lBQ0g7UUFBMkMsaURBQUs7UUFDOUMsK0JBQ1ksR0FBWSxFQUFVLEtBQVksRUFBVSxJQUFvQyxFQUNoRixHQUErQjtZQUYzQyxZQUdFLGlCQUFPLFNBQ1I7WUFIVyxTQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVUsV0FBSyxHQUFMLEtBQUssQ0FBTztZQUFVLFVBQUksR0FBSixJQUFJLENBQWdDO1lBQ2hGLFNBQUcsR0FBSCxHQUFHLENBQTRCOztRQUUzQyxDQUFDO1FBRUQsc0JBQUksMkNBQVE7aUJBQVo7Z0JBQ0UsT0FBTyxLQUFLLENBQUM7WUFDZixDQUFDOzs7V0FBQTtRQUVELHVDQUFPLEdBQVA7O1lBQ0UsSUFBSSxLQUFLLEdBQXVCLElBQUksQ0FBQztZQUNyQyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQzs7Z0JBRWpDLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbkMsSUFBTSxNQUFNLFdBQUE7b0JBQ2YsSUFBSSxNQUFNLENBQUMsSUFBSSxvQkFBNEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQzNGLFNBQVM7cUJBQ1Y7b0JBQ0QsNkZBQTZGO29CQUM3RixJQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO29CQUVsRixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRTt3QkFDL0MscUZBQXFGO3dCQUNyRiwyRkFBMkY7d0JBQzNGLHNCQUFzQjt3QkFDdEIsRUFBRTt3QkFDRix1RkFBdUY7d0JBQ3ZGLDBGQUEwRjt3QkFDMUYsMkZBQTJGO3dCQUMzRixxRkFBcUY7d0JBQ3JGLDBGQUEwRjt3QkFDMUYseUZBQXlGO3dCQUN6RixJQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxnQkFBdUIsQ0FBQzt3QkFFMUYsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFOzRCQUNsQixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQ2pEO3dCQUNELElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ2pGLElBQU0sWUFBWSxHQUNkLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO3dCQUNoRixJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO3dCQUN2RSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNsRiw4QkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUMxQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDN0Q7eUJBQU07d0JBQ0wsd0ZBQXdGO3dCQUN4RixpREFBaUQ7d0JBQ2pELElBQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLGNBQXFCLENBQUM7d0JBQ3hGLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNoRTtvQkFFRCw4Q0FBeUIsQ0FBQyxLQUFLLENBQzNCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDOUU7Ozs7Ozs7OztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVEOzs7Ozs7OztXQVFHO1FBQ0ksZ0RBQTBCLEdBQWpDLFVBQWtDLElBQXVCO1lBQ3ZELGdHQUFnRztZQUNoRyxJQUFJLENBQUMsRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxrQkFBa0IsRUFBRTtnQkFDcEQsNEZBQTRGO2dCQUM1RixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNwRCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsdUVBQXVFO1lBQ3ZFLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3JELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFSyxJQUFBLEtBQUEsZUFBc0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxJQUFBLEVBQXpELGlCQUFpQixRQUF3QyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDcEQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8saUJBQWlCLENBQUM7UUFDM0IsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQTNGRCxDQUEyQyxLQUFLLEdBMkYvQztJQTNGWSxzREFBcUI7SUE2RmxDOzs7Ozs7T0FNRztJQUNIO1FBQW9DLGlEQUFLO1FBQ3ZDLCtCQUNZLEdBQVksRUFBVSxLQUFZLEVBQVUsT0FBdUIsRUFDbkUsY0FBMkI7WUFGdkMsWUFHRSxpQkFBTyxTQUNSO1lBSFcsU0FBRyxHQUFILEdBQUcsQ0FBUztZQUFVLFdBQUssR0FBTCxLQUFLLENBQU87WUFBVSxhQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUNuRSxvQkFBYyxHQUFkLGNBQWMsQ0FBYTs7UUFFdkMsQ0FBQztRQUVELHNCQUFJLDJDQUFRO2lCQUFaO2dCQUNFLE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQzs7O1dBQUE7UUFFRCx1Q0FBTyxHQUFQOztZQUNFLElBQUksSUFBSSxHQUF1QixJQUFJLENBQUM7O2dCQUVwQyw4Q0FBOEM7Z0JBQzlDLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBdEMsSUFBTSxNQUFNLFdBQUE7b0JBQ2YsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3hDLDREQUE0RDt3QkFDNUQsU0FBUztxQkFDVjtvQkFFRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLHNCQUE4QixFQUFFO3dCQUM3Qyx3RkFBd0Y7d0JBQ3hGLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDOzRCQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7dUNBQzNELENBQUM7d0JBRXZCLElBQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQy9FLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNoRTt5QkFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRTt3QkFDbkQsd0ZBQXdGO3dCQUN4RiwrREFBK0Q7d0JBQy9ELDJGQUEyRjt3QkFDM0YsMkZBQTJGO3dCQUMzRixxQkFBcUI7d0JBQ3JCLElBQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLGdCQUF1QixDQUFDO3dCQUUxRixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7NEJBQ2pCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQ3pDO3dCQUNELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVO3dCQUN0QixnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDO3dCQUNsRSxtQkFBbUIsQ0FBQyxTQUFTO3dCQUM3QixlQUFlLENBQUEsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ25FLDhCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUM3RDt5QkFBTTt3QkFDTCwyRkFBMkY7d0JBQzNGLHdDQUF3Qzt3QkFDeEMsSUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssY0FBcUIsQ0FBQzt3QkFDeEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2hFO29CQUVELDhDQUF5QixDQUFDLEtBQUssQ0FDM0IsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUM5RTs7Ozs7Ozs7O1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBM0RELENBQW9DLEtBQUssR0EyRHhDO0lBRUQ7Ozs7OztPQU1HO0lBQ0g7UUFBOEMsMkRBQUs7UUFDakQseUNBQW9CLEtBQVk7WUFBaEMsWUFDRSxpQkFBTyxTQUNSO1lBRm1CLFdBQUssR0FBTCxLQUFLLENBQU87WUFJdkIsY0FBUSxHQUFHLEtBQUssQ0FBQzs7UUFGMUIsQ0FBQztRQUlELGlEQUFPLEdBQVA7WUFDRSxJQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRCxnQ0FBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QixrQ0FBdUIsQ0FBQyxNQUFNLEVBQUUsK0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUMzRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5RCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCxzQ0FBQztJQUFELENBQUMsQUFmRCxDQUE4QyxLQUFLLEdBZWxEO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsSUFBTSwrQkFBK0IsR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFFcEY7Ozs7OztPQU1HO0lBQ0g7UUFHRSxpQkFDYSxHQUFnQixFQUFXLGdCQUFrQyxFQUM3RCxXQUF3QyxFQUFXLEVBQWMsRUFDakUsV0FBb0QsRUFDckQsS0FBb0UsRUFDbkUsT0FBeUI7WUFKekIsUUFBRyxHQUFILEdBQUcsQ0FBYTtZQUFXLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7WUFDN0QsZ0JBQVcsR0FBWCxXQUFXLENBQTZCO1lBQVcsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUNqRSxnQkFBVyxHQUFYLFdBQVcsQ0FBeUM7WUFDckQsVUFBSyxHQUFMLEtBQUssQ0FBK0Q7WUFDbkUsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7WUFQOUIsV0FBTSxHQUFHLENBQUMsQ0FBQztRQU9zQixDQUFDO1FBRTFDOzs7OztXQUtHO1FBQ0gsNEJBQVUsR0FBVjtZQUNFLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQUssSUFBSSxDQUFDLE1BQU0sRUFBSSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELCtCQUFhLEdBQWIsVUFBYyxJQUFZO1lBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBQ0gsY0FBQztJQUFELENBQUMsQUExQkQsSUEwQkM7SUExQlksMEJBQU87SUE0QnBCOzs7Ozs7Ozs7Ozs7T0FZRztJQUNIO1FBbURFLGVBQ1ksR0FBWSxFQUFVLE1BQXlCLEVBQy9DLEtBQWdDO1lBRFYsdUJBQUEsRUFBQSxhQUF5QjtZQUMvQyxzQkFBQSxFQUFBLFlBQWdDO1lBRGhDLFFBQUcsR0FBSCxHQUFHLENBQVM7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFtQjtZQUMvQyxVQUFLLEdBQUwsS0FBSyxDQUEyQjtZQXBENUM7Ozs7Ozs7Ozs7OztlQVlHO1lBQ0ssWUFBTyxHQUFpQyxFQUFFLENBQUM7WUFFbkQ7O2VBRUc7WUFDSyxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO1lBQ3pEOzs7ZUFHRztZQUNLLG1CQUFjLEdBQ2xCLElBQUksR0FBRyxFQUEyRSxDQUFDO1lBRXZGOztlQUVHO1lBQ0ssbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztZQUU3RDs7O2VBR0c7WUFDSyxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUU5RDs7O2VBR0c7WUFDSyxXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUM7WUFFcEQ7Ozs7ZUFJRztZQUNLLGVBQVUsR0FBbUIsRUFBRSxDQUFDO1FBSU8sQ0FBQztRQUVoRDs7Ozs7Ozs7O1dBU0c7UUFDSSxjQUFRLEdBQWYsVUFDSSxHQUFZLEVBQUUsTUFBa0IsRUFBRSxlQUFnRCxFQUNsRixLQUF5Qjs7WUFDM0IsSUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUU1QyxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUU7Z0JBQy9ELHlEQUF5RDtnQkFDekQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSwrQkFBK0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQ2hFO1lBRUQsSUFBSSxRQUF1QixDQUFDO1lBRTVCLDRGQUE0RjtZQUM1RixPQUFPO1lBQ1AsSUFBSSxlQUFlLFlBQVksMEJBQWUsRUFBRTtnQkFDOUMsNkVBQTZFO2dCQUM3RSxJQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQzs7b0JBRWxELEtBQWdCLElBQUEsS0FBQSxpQkFBQSxlQUFlLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO3dCQUF0QyxJQUFNLENBQUMsV0FBQTt3QkFDViwyRUFBMkU7d0JBQzNFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTs0QkFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO3lCQUN2Qjs2QkFBTTs0QkFDTCxJQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBQzs0QkFDdEMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQzt5QkFDNUQ7d0JBRUQsSUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQzFGLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDOUI7Ozs7Ozs7OztnQkFDRCxRQUFRLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQzthQUNyQztpQkFBTTtnQkFDTCxRQUFRLEdBQUcsZUFBZSxDQUFDO2FBQzVCOztnQkFDRCxLQUFtQixJQUFBLGFBQUEsaUJBQUEsUUFBUSxDQUFBLGtDQUFBLHdEQUFFO29CQUF4QixJQUFNLElBQUkscUJBQUE7b0JBQ2IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDeEI7Ozs7Ozs7OztZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztXQWlCRztRQUNILHVCQUFPLEdBQVAsVUFDSSxJQUFxRSxFQUNyRSxTQUFzQztZQUN4Qyw0Q0FBNEM7WUFDNUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDL0MsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO2dCQUNoQixvRkFBb0Y7Z0JBQ3BGLDBFQUEwRTtnQkFDMUUsK0NBQStDO2dCQUMvQyx5Q0FBeUM7Z0JBQ3pDLDBDQUEwQztnQkFDMUMsRUFBRTtnQkFDRiwrRUFBK0U7Z0JBQy9FLDhDQUE4QztnQkFFOUMsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdEMsRUFBRSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDM0MsT0FBTyxLQUFLLENBQUM7YUFDZDtpQkFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUMvQix5QkFBeUI7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzdDO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXFCLElBQUksV0FBTSxTQUFXLENBQUMsQ0FBQzthQUM3RDtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNILDRCQUFZLEdBQVosVUFBYSxJQUFrQjtZQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQ7O1dBRUc7UUFDSCxzQkFBTSxHQUFOO1lBQ0UsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM1QywrRUFBK0U7Z0JBQy9FLDhCQUE4QjtnQkFDOUIsSUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUM7Z0JBQ3BFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ2pDO1lBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3pCLENBQUM7UUFFRDs7O1dBR0c7UUFDSCxzQkFBTSxHQUFOO1lBQ0UsSUFBSSxZQUFZLEdBQXVCLElBQUksQ0FBQztZQUM1QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUN4QiwyREFBMkQ7Z0JBQzNELFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3JDO1lBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksRUFBRTtnQkFDdkIseUVBQXlFO2dCQUN6RSxPQUFPLFlBQVksQ0FBQzthQUNyQjtpQkFBTSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQ2hDLDBGQUEwRjtnQkFDMUYsVUFBVTtnQkFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7YUFDbkI7aUJBQU07Z0JBQ0wsNEZBQTRGO2dCQUM1RiwyRkFBMkY7Z0JBQzNGLGlFQUFpRTtnQkFDakUsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN6RjtRQUNILENBQUM7UUFFTyw0QkFBWSxHQUFwQixVQUNJLEdBQW9FLEVBQ3BFLFNBQXNDO1lBQ3hDLElBQUksR0FBRyxZQUFZLDJCQUFnQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNuRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBQzthQUN0RDtpQkFBTSxJQUFJLEdBQUcsWUFBWSwwQkFBZSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNqRSxrREFBa0Q7Z0JBQ2xELHFFQUFxRTtnQkFDckUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUM7YUFDOUM7aUJBQU0sSUFDSCxHQUFHLFlBQVksMEJBQWUsSUFBSSxTQUFTLEtBQUssU0FBUztnQkFDekQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDbEMsbURBQW1EO2dCQUNuRCx1REFBdUQ7Z0JBQ3ZELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUM7YUFDeEQ7aUJBQU0sSUFDSCxDQUFDLEdBQUcsWUFBWSx5QkFBYyxJQUFJLEdBQUcsWUFBWSwwQkFBZSxDQUFDO2dCQUNqRSxTQUFTLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMzRCx1REFBdUQ7Z0JBQ3ZELElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDO2dCQUM3QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7b0JBQ3pCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDLENBQUM7aUJBQy9DO3FCQUFNO29CQUNMLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2FBQ0Y7aUJBQU0sSUFBSSxHQUFHLFlBQVkseUJBQWMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdEUseURBQXlEO2dCQUN6RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBQzthQUNwRDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0sseUJBQVMsR0FBakIsVUFBa0IsT0FBZTtZQUMvQixJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5RCxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQzthQUN4RDtZQUNELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNLLHlCQUFTLEdBQWpCLFVBQWtCLE9BQWUsRUFBRSxZQUFxQjtZQUN0RCxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxDQUFDLEVBQUUsWUFBWSxLQUFLLENBQUMsRUFBRTtnQkFDMUIsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUVELElBQUksWUFBWSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCwyRkFBMkY7WUFDM0YsK0ZBQStGO1lBQy9GLGlDQUFpQztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlDLElBQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixpRkFBaUY7WUFDakYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDNUIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBRU8sMEJBQVUsR0FBbEIsVUFBbUIsSUFBaUI7O1lBQ2xDLElBQUksSUFBSSxZQUFZLHlCQUFjLEVBQUU7Z0JBQ2xDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFDL0IsS0FBb0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxRQUFRLENBQUEsZ0JBQUEsNEJBQUU7d0JBQTlCLElBQU0sS0FBSyxXQUFBO3dCQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ3hCOzs7Ozs7Ozs7Z0JBQ0QsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNDO2lCQUFNLElBQUksSUFBSSxZQUFZLDBCQUFlLEVBQUU7Z0JBQzFDLG1EQUFtRDtnQkFDbkQsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9CLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFO29CQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQ2hFO3FCQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxFQUFFO29CQUNoRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUM1QztnQkFDRCxJQUFJLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDM0M7aUJBQU0sSUFBSSxJQUFJLFlBQVksMkJBQWdCLEVBQUU7Z0JBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUNyRTtpQkFBTSxJQUFJLElBQUksWUFBWSxxQkFBVSxFQUFFO2dCQUNyQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakM7UUFDSCxDQUFDO1FBRU8sOENBQThCLEdBQXRDLFVBQXVDLElBQW9DOzs7Z0JBQ3pFLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUE5QixJQUFNLEdBQUcsV0FBQTtvQkFDWixJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDNUQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO3dCQUNuQixJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQzt3QkFDOUQsU0FBUztxQkFDVjtvQkFFRCxJQUFJLFFBQVEsU0FBUSxDQUFDO29CQUNyQixJQUFJLE1BQU0sWUFBWSwwQkFBZSxJQUFJLE1BQU0sWUFBWSx5QkFBYyxFQUFFO3dCQUN6RSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDekY7eUJBQU07d0JBQ0wsUUFBUTs0QkFDSixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDNUY7b0JBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUN4Qzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVPLCtDQUErQixHQUF2QyxVQUF3QyxJQUFvQzs7WUFDMUUseUNBQXlDO1lBQ3pDLElBQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDeEMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEUsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNsRCwwRkFBMEY7Z0JBQzFGLHlCQUF5QjtnQkFDekIsSUFBSSxJQUFJLFlBQVkseUJBQWMsRUFBRTtvQkFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDakYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ2IsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztpQkFDeEY7Z0JBQ0QsT0FBTzthQUNSO1lBRUQsSUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7O2dCQUM3RCxLQUFrQixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO29CQUF6QixJQUFNLEdBQUcsdUJBQUE7b0JBQ1osSUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDbkQsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3RGLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBRTFCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQ3hFOzs7Ozs7Ozs7WUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFdEMsNkZBQTZGO1lBQzdGLFVBQVU7WUFDVixJQUFJLElBQUksWUFBWSx5QkFBYyxFQUFFOztvQkFDbEMsdUZBQXVGO29CQUN2RixLQUFrQixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO3dCQUF6QixJQUFNLEdBQUcsdUJBQUE7OzRCQUNaLEtBQTJCLElBQUEscUJBQUEsaUJBQUEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtnQ0FBaEQsSUFBTSxZQUFZLFdBQUE7Z0NBQ3JCLGFBQWEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7NkJBQ2pDOzs7Ozs7Ozs7cUJBQ0Y7Ozs7Ozs7OztnQkFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNqRiw2RkFBNkY7Z0JBQzdGLHlGQUF5RjtnQkFDekYsMkZBQTJGO2dCQUMzRixtRUFBbUU7Z0JBQ25FLElBQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2FBQzNGO1FBQ0gsQ0FBQztRQUVPLG1DQUFtQixHQUEzQixVQUE0QixJQUFvQzs7WUFDOUQsMENBQTBDO1lBQzFDLElBQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDekMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEUsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNsRCw0RkFBNEY7Z0JBQzVGLHlCQUF5QjtnQkFDekIsSUFBSSxJQUFJLFlBQVkseUJBQWMsRUFBRTtvQkFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztpQkFDcEY7Z0JBQ0QsT0FBTzthQUNSOztnQkFFRCxxRkFBcUY7Z0JBQ3JGLEtBQWtCLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7b0JBQXpCLElBQU0sR0FBRyx1QkFBQTtvQkFDWixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUN6RTs7Ozs7Ozs7O1lBRUQsNkZBQTZGO1lBQzdGLFdBQVc7WUFDWCxJQUFJLElBQUksWUFBWSx5QkFBYyxFQUFFOztvQkFDbEMseUZBQXlGO29CQUN6RixLQUFrQixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO3dCQUF6QixJQUFNLEdBQUcsdUJBQUE7OzRCQUNaLEtBQTZCLElBQUEscUJBQUEsaUJBQUEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtnQ0FBbkQsSUFBTSxjQUFjLFdBQUE7Z0NBQ3ZCLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7NkJBQ3BDOzs7Ozs7Ozs7cUJBQ0Y7Ozs7Ozs7OztnQkFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2FBQ3BGO1FBQ0gsQ0FBQztRQUVPLHNDQUFzQixHQUE5QixVQUErQixLQUFvQjs7O2dCQUNqRCxLQUFtQixJQUFBLFVBQUEsaUJBQUEsS0FBSyxDQUFBLDRCQUFBLCtDQUFFO29CQUFyQixJQUFNLElBQUksa0JBQUE7b0JBQ2IsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLHlCQUFjLElBQUksSUFBSSxZQUFZLDBCQUFlLENBQUMsRUFBRTt3QkFDeEUsU0FBUztxQkFDVjtvQkFFRCxJQUFJLElBQUksWUFBWSx5QkFBYyxFQUFFO3dCQUNsQyxJQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO3dCQUN4QyxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEUsSUFBSSxhQUFhLFNBQVMsQ0FBQzt3QkFDM0IsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFOzRCQUNsRCxhQUFhLEdBQUcsS0FBSyxDQUFDO3lCQUN2Qjs2QkFBTTs0QkFDTCxhQUFhLEdBQUcsSUFBSSxDQUFDOztnQ0FDckIsS0FBa0IsSUFBQSwrQkFBQSxpQkFBQSxVQUFVLENBQUEsQ0FBQSxzQ0FBQSw4REFBRTtvQ0FBekIsSUFBTSxHQUFHLHVCQUFBOzt3Q0FDWixLQUEyQixJQUFBLHFCQUFBLGlCQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFBLENBQUEsZ0JBQUEsNEJBQUU7NENBQWhELElBQU0sWUFBWSxXQUFBOzRDQUNyQixhQUFhLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO3lDQUNqQzs7Ozs7Ozs7O2lDQUNGOzs7Ozs7Ozs7eUJBQ0Y7d0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO3FCQUM3RjtvQkFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUM1Qzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVPLG9DQUFvQixHQUE1QixVQUE2QixJQUFnQjs7O2dCQUMzQyxLQUF1QixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTVDLElBQU0sUUFBUSxXQUFBO29CQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7aUJBQ3pFOzs7Ozs7Ozs7O2dCQUNELEtBQTBCLElBQUEsS0FBQSxpQkFBQSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBdkQsSUFBTSxXQUFXLFdBQUE7b0JBQ3BCLElBQUksV0FBVyxZQUFZLDJCQUFnQixFQUFFO3dCQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7cUJBQzVFO2lCQUNGOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBQ0gsWUFBQztJQUFELENBQUMsQUE3YUQsSUE2YUM7SUFPRDs7Ozs7T0FLRztJQUNILFNBQVMsV0FBVyxDQUNoQixJQUEyQyxFQUFFLElBQW1CLEVBQ2hFLGNBQXVCO1FBQ3pCLElBQUksYUFBYSxHQUE0QixTQUFTLENBQUM7UUFDdkQsNkVBQTZFO1FBQzdFLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7WUFDckMsSUFBSSxjQUFjLEVBQUU7Z0JBQ2xCLGFBQWE7b0JBQ1QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxFQUFFLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO2FBQ3pGO2lCQUFNO2dCQUNMLGFBQWE7b0JBQ1QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBTSxPQUFBLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFsRCxDQUFrRCxDQUFDLENBQUM7YUFDdkY7U0FDRjtRQUNELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDN0QsT0FBTyxFQUFFLENBQUMsZUFBZTtRQUNyQixnQkFBZ0IsQ0FBQyxTQUFTO1FBQzFCLGVBQWUsQ0FBQyxTQUFTO1FBQ3pCLG9CQUFvQixDQUFDLFNBQVM7UUFDOUIsVUFBVSxDQUFDLEtBQUs7UUFDaEIsbUJBQW1CLENBQUMsU0FBUztRQUM3QixVQUFVLENBQUMsSUFBSTtRQUNmLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLGFBQWEsQ0FBQyxHQUFRLEVBQUUsR0FBWSxFQUFFLEtBQVk7UUFDekQsSUFBTSxVQUFVLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsT0FBTyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRDtRQUNFLGlDQUFzQixHQUFZLEVBQVksS0FBWTtZQUFwQyxRQUFHLEdBQUgsR0FBRyxDQUFTO1lBQVksVUFBSyxHQUFMLEtBQUssQ0FBTztRQUFHLENBQUM7UUFFOUQsMkNBQVMsR0FBVCxVQUFVLEdBQVE7WUFBbEIsaUJBS0M7WUFKQyw0RkFBNEY7WUFDNUYsOEZBQThGO1lBQzlGLGdFQUFnRTtZQUNoRSxPQUFPLDRCQUFlLENBQUMsR0FBRyxFQUFFLFVBQUEsR0FBRyxJQUFJLE9BQUEsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBakIsQ0FBaUIsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDTyx5Q0FBTyxHQUFqQixVQUFrQixHQUFRO1lBQTFCLGlCQW9GQztZQW5GQyxJQUFJLEdBQUcsWUFBWSx1QkFBWSxJQUFJLEdBQUcsQ0FBQyxRQUFRLFlBQVksMkJBQWdCLEVBQUU7Z0JBQzNFLDBGQUEwRjtnQkFDMUYseUZBQXlGO2dCQUN6RixnRkFBZ0Y7Z0JBQ2hGLHNEQUFzRDtnQkFDdEQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hDO2lCQUFNLElBQUksR0FBRyxZQUFZLHdCQUFhLElBQUksR0FBRyxDQUFDLFFBQVEsWUFBWSwyQkFBZ0IsRUFBRTtnQkFDbkYsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO29CQUNuQixPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdkMsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN4Riw4QkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN6QyxPQUFPLE1BQU0sQ0FBQzthQUNmO2lCQUFNLElBQUksR0FBRyxZQUFZLDJCQUFnQixFQUFFO2dCQUMxQywwRkFBMEY7Z0JBQzFGLGtFQUFrRTtnQkFDbEUsNEZBQTRGO2dCQUM1RixFQUFFO2dCQUNGLDRGQUE0RjtnQkFDNUYsMEZBQTBGO2dCQUMxRixxRkFBcUY7Z0JBQ3JGLDJCQUEyQjtnQkFDM0IsRUFBRTtnQkFDRixtRkFBbUY7Z0JBQ25GLHVGQUF1RjtnQkFDdkYsZ0VBQWdFO2dCQUNoRSxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNuQztpQkFBTSxJQUFJLEdBQUcsWUFBWSxzQkFBVyxFQUFFO2dCQUNyQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxJQUFJLFNBQW9CLENBQUM7Z0JBQzdCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFO29CQUN4QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN4QyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7d0JBQ2pCLGlFQUFpRTt3QkFDakUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUVuRCxvRkFBb0Y7d0JBQ3BGLElBQUksR0FBRyx3QkFBVyxDQUFDO3FCQUNwQjtpQkFDRjtxQkFBTTtvQkFDTCxJQUFJLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQ3ZDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzNFO2dCQUNELElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBbkIsQ0FBbUIsQ0FBQyxDQUFDO2dCQUN0RCxJQUFNLE1BQU0sR0FBRyxzQkFBWSxDQUFDLElBQUksRUFBRSxXQUFXLG9CQUFHLElBQUksR0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDaEUsOEJBQWdCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDekMsT0FBTyxNQUFNLENBQUM7YUFDZjtpQkFBTSxJQUNILEdBQUcsWUFBWSxxQkFBVSxJQUFJLEdBQUcsQ0FBQyxRQUFRLFlBQVksMkJBQWdCO2dCQUNyRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsWUFBWSx1QkFBWSxDQUFDLEVBQUU7Z0JBQzNDLDBGQUEwRjtnQkFDMUYsZ0NBQWdDO2dCQUNoQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDaEQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLElBQU0sU0FBUyxHQUNYLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDcEYsSUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDekMsOEJBQWdCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDekMsT0FBTyxNQUFNLENBQUM7aUJBQ2Y7Z0JBRUQsNkZBQTZGO2dCQUM3Riw2RkFBNkY7Z0JBQzdGLDBGQUEwRjtnQkFDMUYscUNBQXFDO2dCQUNyQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7b0JBQ3JCLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVELElBQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9FLDhCQUFnQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZDLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBbkIsQ0FBbUIsQ0FBQyxDQUFDO2dCQUN0RCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3BELDhCQUFnQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7aUJBQU07Z0JBQ0wsb0NBQW9DO2dCQUNwQyxPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0gsQ0FBQztRQUVEOzs7O1dBSUc7UUFDTywrQ0FBYSxHQUF2QixVQUF3QixHQUFRO1lBQzlCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtnQkFDcEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLDhCQUFnQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBckhELElBcUhDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxlQUFlLENBQ3BCLEdBQStCLEVBQUUsR0FBWSxFQUFFLE1BQTJCO1FBQzVFLElBQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTFDLHFGQUFxRjtRQUNyRixJQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSztZQUM5QixJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXpELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLHFFQUFxRTtnQkFDckUsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFO29CQUM1Qyx1RkFBdUY7b0JBQ3ZGLHlCQUF5QjtvQkFDekIsSUFBSSxHQUFHLHFCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzFCO3FCQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRTtvQkFDbEQsb0ZBQW9GO29CQUNwRixtREFBbUQ7b0JBQ25ELElBQUksR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3pDO2dCQUVELElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsZ0NBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdkYsOEJBQWdCLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDL0MsT0FBTyxVQUFVLENBQUM7YUFDbkI7aUJBQU07Z0JBQ0wsc0ZBQXNGO2dCQUN0RixtRUFBbUU7Z0JBQ25FLE9BQU8sRUFBRSxDQUFDLHdCQUF3QixDQUFDLFlBQVksRUFBRSx3QkFBVyxDQUFDLENBQUM7YUFDL0Q7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILCtGQUErRjtRQUMvRiwyQkFBMkI7UUFDM0IsT0FBTyxFQUFFLENBQUMsVUFBVTtRQUNoQixnQkFBZ0IsQ0FBQyxRQUFRO1FBQ3pCLG1CQUFtQixDQUFDLFNBQVM7UUFDN0Isb0JBQW9CLENBQUEsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FDbkIsU0FBcUMsRUFBRSxJQUFvQyxFQUMzRSxHQUFZO1FBQ2QsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztRQUV4QyxJQUFNLGdCQUFnQixHQUFHLFVBQUMsSUFBZ0Q7WUFDeEUsOEJBQThCO1lBQzlCLElBQUksSUFBSSxZQUFZLGdDQUFxQixJQUFJLElBQUksQ0FBQyxJQUFJLHFCQUF5QixFQUFFO2dCQUMvRSxPQUFPO2FBQ1I7WUFFRCwrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHFCQUFxQixJQUFJLElBQUksWUFBWSwrQkFBb0IsRUFBRTtnQkFDakYsT0FBTzthQUNSO1lBRUQscUVBQXFFO1lBQ3JFLElBQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BFLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDbkIsT0FBTzthQUNSO1lBQ0QsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUssQ0FBQyxpQkFBaUIsRUFBdkIsQ0FBdUIsQ0FBQyxDQUFDO1lBQ2hFLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFVBQVUsWUFBQSxFQUFDLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDMUMsSUFBSSxJQUFJLFlBQVksMEJBQWUsRUFBRTtZQUNuQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQzlDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxjQUFjLENBQ25CLElBQWdELEVBQUUsR0FBWSxFQUFFLEtBQVk7UUFDOUUsSUFBSSxJQUFJLFlBQVksZ0NBQXFCLEVBQUU7WUFDekMsK0RBQStEO1lBQy9ELE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzlDO2FBQU07WUFDTCx5RkFBeUY7WUFDekYsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzNDO0lBQ0gsQ0FBQztJQXNDRCxJQUFNLGVBQWUsR0FBRyxRQUFRLENBQUM7SUFVakM7Ozs7Ozs7Ozs7T0FVRztJQUNILFNBQVMscUJBQXFCLENBQzFCLEtBQXdCLEVBQUUsR0FBWSxFQUFFLEtBQVksRUFDcEQsU0FBcUM7UUFDdkMsSUFBTSxPQUFPLEdBQUcseUJBQXlCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFckUsSUFBSSxjQUFxQyxDQUFDO1FBQzFDLElBQUksU0FBUyxrQkFBeUIsRUFBRTtZQUN0QyxjQUFjLEdBQUcsU0FBUyxDQUFDO1NBQzVCO2FBQU0sSUFBSSxTQUFTLGdCQUF1QixFQUFFO1lBQzNDLGNBQWMsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNyRTthQUFNO1lBQ0wsY0FBYyxHQUFHLFNBQVMsQ0FBQztTQUM1QjtRQUVELDRGQUE0RjtRQUM1RiwrRkFBK0Y7UUFDL0YsSUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTlCLElBQUksSUFBSSxHQUFpQixFQUFFLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ25CLG9GQUFvRjtZQUNwRixJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDbEM7UUFFRCxJQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsZUFBZTtRQUNqQyxnQkFBZ0IsQ0FBQyxTQUFTO1FBQzFCLGVBQWUsQ0FBQyxTQUFTO1FBQ3pCLG9CQUFvQixDQUFDLFNBQVM7UUFDOUIsVUFBVSxDQUFDLGVBQWU7UUFDMUIsbUJBQW1CLENBQUMsU0FBUztRQUM3QixVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFL0IsT0FBTyxFQUFFLENBQUMsd0JBQXdCO1FBQzlCLGNBQWMsQ0FBQyxTQUFTO1FBQ3hCLG1CQUFtQixDQUFDLFNBQVM7UUFDN0IsVUFBVSxDQUFDLFNBQVM7UUFDcEIsb0JBQW9CLENBQUMsU0FBUztRQUM5QixnQkFBZ0IsQ0FBQSxDQUFDLFVBQVUsQ0FBQztRQUM1QixVQUFVLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQzdELFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxHQUFRLEVBQUUsR0FBWSxFQUFFLEtBQVk7UUFDckUsSUFBTSxVQUFVLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsT0FBTyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRDtRQUF3QyxxREFBdUI7UUFBL0Q7O1FBZUEsQ0FBQztRQWRXLDJDQUFPLEdBQWpCLFVBQWtCLEdBQVE7WUFDeEIsNEZBQTRGO1lBQzVGLHlGQUF5RjtZQUN6Riw0RkFBNEY7WUFDNUYseUJBQXlCO1lBQ3pCLElBQUksR0FBRyxZQUFZLHVCQUFZLElBQUksR0FBRyxDQUFDLFFBQVEsWUFBWSwyQkFBZ0I7Z0JBQ3ZFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxZQUFZLHVCQUFZLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBRTtnQkFDM0UsSUFBTSxPQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNuRCw4QkFBZ0IsQ0FBQyxPQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QyxPQUFPLE9BQUssQ0FBQzthQUNkO1lBRUQsT0FBTyxpQkFBTSxPQUFPLFlBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQWZELENBQXdDLHVCQUF1QixHQWU5RDtJQUVELFNBQWdCLDRCQUE0QixDQUFDLElBQTJDO1FBQ3RGLGtGQUFrRjtRQUNsRixnQ0FBZ0M7UUFDaEMsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxnQ0FBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQyxtREFBbUQ7WUFDbkQsT0FBTyxJQUFJLENBQUM7U0FDYjthQUFNLElBQUksQ0FBQyx1Q0FBNkIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvQyxnRUFBZ0U7WUFDaEUsT0FBTyxJQUFJLENBQUM7U0FDYjthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7SUFiRCxvRUFhQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1BpcGUsIEJpbmRpbmdUeXBlLCBCb3VuZFRhcmdldCwgRFlOQU1JQ19UWVBFLCBJbXBsaWNpdFJlY2VpdmVyLCBNZXRob2RDYWxsLCBQYXJzZWRFdmVudFR5cGUsIFBhcnNlU291cmNlU3BhbiwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBTY2hlbWFNZXRhZGF0YSwgVGhpc1JlY2VpdmVyLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Qm91bmRUZXh0LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdEljdSwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NQcm9wZXJ0eU5hbWV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1RlbXBsYXRlSWQsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2FkZEV4cHJlc3Npb25JZGVudGlmaWVyLCBFeHByZXNzaW9uSWRlbnRpZmllciwgbWFya0lnbm9yZURpYWdub3N0aWNzfSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7YWRkUGFyc2VTcGFuSW5mbywgYWRkVGVtcGxhdGVJZCwgd3JhcEZvckRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlcn0gZnJvbSAnLi9kb20nO1xuaW1wb3J0IHtFbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge2FzdFRvVHlwZXNjcmlwdCwgTlVMTF9BU19BTll9IGZyb20gJy4vZXhwcmVzc2lvbic7XG5pbXBvcnQge091dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcn0gZnJvbSAnLi9vb2InO1xuaW1wb3J0IHtFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yfSBmcm9tICcuL3RlbXBsYXRlX3NlbWFudGljcyc7XG5pbXBvcnQge2NoZWNrSWZDbGFzc0lzRXhwb3J0ZWQsIGNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kLCB0c0NhbGxNZXRob2QsIHRzQ2FzdFRvQW55LCB0c0NyZWF0ZUVsZW1lbnQsIHRzQ3JlYXRlVHlwZVF1ZXJ5Rm9yQ29lcmNlZElucHV0LCB0c0NyZWF0ZVZhcmlhYmxlLCB0c0RlY2xhcmVWYXJpYWJsZX0gZnJvbSAnLi90c191dGlsJztcblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBmb3IgYSBjb21wb25lbnQsIGFuZCBtZXRhZGF0YSByZWdhcmRpbmcgdGhhdCBjb21wb25lbnQsIGNvbXBvc2UgYVxuICogXCJ0eXBlIGNoZWNrIGJsb2NrXCIgZnVuY3Rpb24uXG4gKlxuICogV2hlbiBwYXNzZWQgdGhyb3VnaCBUeXBlU2NyaXB0J3MgVHlwZUNoZWNrZXIsIHR5cGUgZXJyb3JzIHRoYXQgYXJpc2Ugd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrXG4gKiBmdW5jdGlvbiBpbmRpY2F0ZSBpc3N1ZXMgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAqXG4gKiBBcyBhIHNpZGUgZWZmZWN0IG9mIGdlbmVyYXRpbmcgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQsIGB0cy5EaWFnbm9zdGljYHMgbWF5IGFsc28gYmUgcHJvZHVjZWRcbiAqIGRpcmVjdGx5IGZvciBpc3N1ZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSB3aGljaCBhcmUgaWRlbnRpZmllZCBkdXJpbmcgZ2VuZXJhdGlvbi4gVGhlc2UgaXNzdWVzIGFyZVxuICogcmVjb3JkZWQgaW4gZWl0aGVyIHRoZSBgZG9tU2NoZW1hQ2hlY2tlcmAgKHdoaWNoIGNoZWNrcyB1c2FnZSBvZiBET00gZWxlbWVudHMgYW5kIGJpbmRpbmdzKSBhc1xuICogd2VsbCBhcyB0aGUgYG9vYlJlY29yZGVyYCAod2hpY2ggcmVjb3JkcyBlcnJvcnMgd2hlbiB0aGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRvciBpcyB1bmFibGVcbiAqIHRvIHN1ZmZpY2llbnRseSB1bmRlcnN0YW5kIGEgdGVtcGxhdGUpLlxuICpcbiAqIEBwYXJhbSBlbnYgYW4gYEVudmlyb25tZW50YCBpbnRvIHdoaWNoIHR5cGUtY2hlY2tpbmcgY29kZSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSByZWYgYSBgUmVmZXJlbmNlYCB0byB0aGUgY29tcG9uZW50IGNsYXNzIHdoaWNoIHNob3VsZCBiZSB0eXBlLWNoZWNrZWQuXG4gKiBAcGFyYW0gbmFtZSBhIGB0cy5JZGVudGlmaWVyYCB0byB1c2UgZm9yIHRoZSBnZW5lcmF0ZWQgYHRzLkZ1bmN0aW9uRGVjbGFyYXRpb25gLlxuICogQHBhcmFtIG1ldGEgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGFuZCB0aGUgZnVuY3Rpb24gYmVpbmcgZ2VuZXJhdGVkLlxuICogQHBhcmFtIGRvbVNjaGVtYUNoZWNrZXIgdXNlZCB0byBjaGVjayBhbmQgcmVjb3JkIGVycm9ycyByZWdhcmRpbmcgaW1wcm9wZXIgdXNhZ2Ugb2YgRE9NIGVsZW1lbnRzXG4gKiBhbmQgYmluZGluZ3MuXG4gKiBAcGFyYW0gb29iUmVjb3JkZXIgdXNlZCB0byByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyB0ZW1wbGF0ZSBlbGVtZW50cyB3aGljaCBjb3VsZCBub3QgYmUgY29ycmVjdGx5XG4gKiB0cmFuc2xhdGVkIGludG8gdHlwZXMgZHVyaW5nIFRDQiBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICBlbnY6IEVudmlyb25tZW50LCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgbmFtZTogdHMuSWRlbnRpZmllcixcbiAgICBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgY29uc3QgdGNiID0gbmV3IENvbnRleHQoXG4gICAgICBlbnYsIGRvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyLCBtZXRhLmlkLCBtZXRhLmJvdW5kVGFyZ2V0LCBtZXRhLnBpcGVzLCBtZXRhLnNjaGVtYXMpO1xuICBjb25zdCBzY29wZSA9IFNjb3BlLmZvck5vZGVzKHRjYiwgbnVsbCwgdGNiLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCAvKiBndWFyZCAqLyBudWxsKTtcbiAgY29uc3QgY3R4UmF3VHlwZSA9IGVudi5yZWZlcmVuY2VUeXBlKHJlZik7XG4gIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShjdHhSYXdUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIHdoZW4gcmVmZXJlbmNpbmcgdGhlIGN0eCBwYXJhbSBmb3IgJHtyZWYuZGVidWdOYW1lfWApO1xuICB9XG4gIGNvbnN0IHBhcmFtTGlzdCA9IFt0Y2JDdHhQYXJhbShyZWYubm9kZSwgY3R4UmF3VHlwZS50eXBlTmFtZSwgZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUpXTtcblxuICBjb25zdCBzY29wZVN0YXRlbWVudHMgPSBzY29wZS5yZW5kZXIoKTtcbiAgY29uc3QgaW5uZXJCb2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgIC4uLmVudi5nZXRQcmVsdWRlU3RhdGVtZW50cygpLFxuICAgIC4uLnNjb3BlU3RhdGVtZW50cyxcbiAgXSk7XG5cbiAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBcImlmICh0cnVlKVwiIGV4cHJlc3Npb24uIFRoaXMgaXMgdW5uZWNlc3NhcnkgYnV0IGhhcyB0aGUgZWZmZWN0IG9mIGNhdXNpbmdcbiAgLy8gdGhlIGB0cy5QcmludGVyYCB0byBmb3JtYXQgdGhlIHR5cGUtY2hlY2sgYmxvY2sgbmljZWx5LlxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgaW5uZXJCb2R5LCB1bmRlZmluZWQpXSk7XG4gIGNvbnN0IGZuRGVjbCA9IHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gbmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVudi5jb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID8gcmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgOiB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovIHBhcmFtTGlzdCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbiAgYWRkVGVtcGxhdGVJZChmbkRlY2wsIG1ldGEuaWQpO1xuICByZXR1cm4gZm5EZWNsO1xufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0J3MgaW52b2x2ZWQgaW4gdGhlIGNvbnN0cnVjdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2suXG4gKlxuICogVGhlIGdlbmVyYXRpb24gb2YgYSBUQ0IgaXMgbm9uLWxpbmVhci4gQmluZGluZ3Mgd2l0aGluIGEgdGVtcGxhdGUgbWF5IHJlc3VsdCBpbiB0aGUgbmVlZCB0b1xuICogY29uc3RydWN0IGNlcnRhaW4gdHlwZXMgZWFybGllciB0aGFuIHRoZXkgb3RoZXJ3aXNlIHdvdWxkIGJlIGNvbnN0cnVjdGVkLiBUaGF0IGlzLCBpZiB0aGVcbiAqIGdlbmVyYXRpb24gb2YgYSBUQ0IgZm9yIGEgdGVtcGxhdGUgaXMgYnJva2VuIGRvd24gaW50byBzcGVjaWZpYyBvcGVyYXRpb25zIChjb25zdHJ1Y3RpbmcgYVxuICogZGlyZWN0aXZlLCBleHRyYWN0aW5nIGEgdmFyaWFibGUgZnJvbSBhIGxldC0gb3BlcmF0aW9uLCBldGMpLCB0aGVuIGl0J3MgcG9zc2libGUgZm9yIG9wZXJhdGlvbnNcbiAqIGVhcmxpZXIgaW4gdGhlIHNlcXVlbmNlIHRvIGRlcGVuZCBvbiBvcGVyYXRpb25zIHdoaWNoIG9jY3VyIGxhdGVyIGluIHRoZSBzZXF1ZW5jZS5cbiAqXG4gKiBgVGNiT3BgIGFic3RyYWN0cyB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIG9wZXJhdGlvbnMgd2hpY2ggYXJlIHJlcXVpcmVkIHRvIGNvbnZlcnQgYSB0ZW1wbGF0ZSBpbnRvXG4gKiBhIFRDQi4gVGhpcyBhbGxvd3MgZm9yIHR3byBwaGFzZXMgb2YgcHJvY2Vzc2luZyBmb3IgdGhlIHRlbXBsYXRlLCB3aGVyZSAxKSBhIGxpbmVhciBzZXF1ZW5jZSBvZlxuICogYFRjYk9wYHMgaXMgZ2VuZXJhdGVkLCBhbmQgdGhlbiAyKSB0aGVzZSBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgbm90IG5lY2Vzc2FyaWx5IGluIGxpbmVhclxuICogb3JkZXIuXG4gKlxuICogRWFjaCBgVGNiT3BgIG1heSBpbnNlcnQgc3RhdGVtZW50cyBpbnRvIHRoZSBib2R5IG9mIHRoZSBUQ0IsIGFuZCBhbHNvIG9wdGlvbmFsbHkgcmV0dXJuIGFcbiAqIGB0cy5FeHByZXNzaW9uYCB3aGljaCBjYW4gYmUgdXNlZCB0byByZWZlcmVuY2UgdGhlIG9wZXJhdGlvbidzIHJlc3VsdC5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgVGNiT3Age1xuICAvKipcbiAgICogU2V0IHRvIHRydWUgaWYgdGhpcyBvcGVyYXRpb24gY2FuIGJlIGNvbnNpZGVyZWQgb3B0aW9uYWwuIE9wdGlvbmFsIG9wZXJhdGlvbnMgYXJlIG9ubHkgZXhlY3V0ZWRcbiAgICogd2hlbiBkZXBlbmRlZCB1cG9uIGJ5IG90aGVyIG9wZXJhdGlvbnMsIG90aGVyd2lzZSB0aGV5IGFyZSBkaXNyZWdhcmRlZC4gVGhpcyBhbGxvd3MgZm9yIGxlc3NcbiAgICogY29kZSB0byBnZW5lcmF0ZSwgcGFyc2UgYW5kIHR5cGUtY2hlY2ssIG92ZXJhbGwgcG9zaXRpdmVseSBjb250cmlidXRpbmcgdG8gcGVyZm9ybWFuY2UuXG4gICAqL1xuICBhYnN0cmFjdCByZWFkb25seSBvcHRpb25hbDogYm9vbGVhbjtcblxuICBhYnN0cmFjdCBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbDtcblxuICAvKipcbiAgICogUmVwbGFjZW1lbnQgdmFsdWUgb3Igb3BlcmF0aW9uIHVzZWQgd2hpbGUgdGhpcyBgVGNiT3BgIGlzIGV4ZWN1dGluZyAoaS5lLiB0byByZXNvbHZlIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMgZHVyaW5nIGl0cyBleGVjdXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzdWFsbHkgYSBgbnVsbCFgIGV4cHJlc3Npb24gKHdoaWNoIGFza3MgVFMgdG8gaW5mZXIgYW4gYXBwcm9wcmlhdGUgdHlwZSksIGJ1dCBhbm90aGVyXG4gICAqIGBUY2JPcGAgY2FuIGJlIHJldHVybmVkIGluIGNhc2VzIHdoZXJlIGFkZGl0aW9uYWwgY29kZSBnZW5lcmF0aW9uIGlzIG5lY2Vzc2FyeSB0byBkZWFsIHdpdGhcbiAgICogY2lyY3VsYXIgcmVmZXJlbmNlcy5cbiAgICovXG4gIGNpcmN1bGFyRmFsbGJhY2soKTogVGNiT3B8dHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBhIG5hdGl2ZSBET00gZWxlbWVudCAob3Igd2ViIGNvbXBvbmVudCkgZnJvbSBhXG4gKiBgVG1wbEFzdEVsZW1lbnRgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JFbGVtZW50T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIGZvciB0eXBlLWluZmVyZW5jZSBvZiB0aGUgRE9NXG4gICAgLy8gZWxlbWVudCdzIHR5cGUgYW5kIHdvbid0IHJlcG9ydCBkaWFnbm9zdGljcyBieSBpdHNlbGYsIHNvIHRoZSBvcGVyYXRpb24gaXMgbWFya2VkIGFzIG9wdGlvbmFsXG4gICAgLy8gdG8gYXZvaWQgZ2VuZXJhdGluZyBzdGF0ZW1lbnRzIGZvciBET00gZWxlbWVudHMgdGhhdCBhcmUgbmV2ZXIgcmVmZXJlbmNlZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgLy8gQWRkIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZWxlbWVudCB1c2luZyBkb2N1bWVudC5jcmVhdGVFbGVtZW50LlxuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHNDcmVhdGVFbGVtZW50KHRoaXMuZWxlbWVudC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLmVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMuZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIHBhcnRpY3VsYXIgbGV0LSBgVG1wbEFzdFZhcmlhYmxlYCBvbiBhXG4gKiBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHZhcmlhYmxlIHZhcmlhYmxlIChsb2wpLlxuICovXG5jbGFzcyBUY2JWYXJpYWJsZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlLFxuICAgICAgcHJpdmF0ZSB2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgZm9yIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcblxuICAgIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGVcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY29udGV4dC5cbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAvKiBleHByZXNzaW9uICovIGN0eCxcbiAgICAgICAgLyogbmFtZSAqLyB0aGlzLnZhcmlhYmxlLnZhbHVlIHx8ICckaW1wbGljaXQnKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLnZhcmlhYmxlLnNvdXJjZVNwYW4pO1xuXG4gICAgLy8gRGVjbGFyZSB0aGUgdmFyaWFibGUsIGFuZCByZXR1cm4gaXRzIGlkZW50aWZpZXIuXG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGEgdmFyaWFibGUgZm9yIGEgYFRtcGxBc3RUZW1wbGF0ZWAncyBjb250ZXh0LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQ29udGV4dE9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gQWxsb2NhdGUgYSB0ZW1wbGF0ZSBjdHggdmFyaWFibGUgYW5kIGRlY2xhcmUgaXQgd2l0aCBhbiAnYW55JyB0eXBlLiBUaGUgdHlwZSBvZiB0aGlzIHZhcmlhYmxlXG4gICAgLy8gbWF5IGJlIG5hcnJvd2VkIGFzIGEgcmVzdWx0IG9mIHRlbXBsYXRlIGd1YXJkIGNvbmRpdGlvbnMuXG4gICAgY29uc3QgY3R4ID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShjdHgsIHR5cGUpKTtcbiAgICByZXR1cm4gY3R4O1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGRlc2NlbmRzIGludG8gYSBgVG1wbEFzdFRlbXBsYXRlYCdzIGNoaWxkcmVuIGFuZCBnZW5lcmF0ZXMgdHlwZS1jaGVja2luZyBjb2RlIGZvclxuICogdGhlbS5cbiAqXG4gKiBUaGlzIG9wZXJhdGlvbiB3cmFwcyB0aGUgY2hpbGRyZW4ncyB0eXBlLWNoZWNraW5nIGNvZGUgaW4gYW4gYGlmYCBibG9jaywgd2hpY2ggbWF5IGluY2x1ZGUgb25lXG4gKiBvciBtb3JlIHR5cGUgZ3VhcmQgY29uZGl0aW9ucyB0aGF0IG5hcnJvdyB0eXBlcyB3aXRoaW4gdGhlIHRlbXBsYXRlIGJvZHkuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQm9keU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgdGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBBbiBgaWZgIHdpbGwgYmUgY29uc3RydWN0ZWQsIHdpdGhpbiB3aGljaCB0aGUgdGVtcGxhdGUncyBjaGlsZHJlbiB3aWxsIGJlIHR5cGUgY2hlY2tlZC4gVGhlXG4gICAgLy8gYGlmYCBpcyB1c2VkIGZvciB0d28gcmVhc29uczogaXQgY3JlYXRlcyBhIG5ldyBzeW50YWN0aWMgc2NvcGUsIGlzb2xhdGluZyB2YXJpYWJsZXMgZGVjbGFyZWRcbiAgICAvLyBpbiB0aGUgdGVtcGxhdGUncyBUQ0IgZnJvbSB0aGUgb3V0ZXIgY29udGV4dCwgYW5kIGl0IGFsbG93cyBhbnkgZGlyZWN0aXZlcyBvbiB0aGUgdGVtcGxhdGVzXG4gICAgLy8gdG8gcGVyZm9ybSB0eXBlIG5hcnJvd2luZyBvZiBlaXRoZXIgZXhwcmVzc2lvbnMgb3IgdGhlIHRlbXBsYXRlJ3MgY29udGV4dC5cbiAgICAvL1xuICAgIC8vIFRoZSBndWFyZCBpcyB0aGUgYGlmYCBibG9jaydzIGNvbmRpdGlvbi4gSXQncyB1c3VhbGx5IHNldCB0byBgdHJ1ZWAgYnV0IGRpcmVjdGl2ZXMgdGhhdCBleGlzdFxuICAgIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjYW4gdHJpZ2dlciBleHRyYSBndWFyZCBleHByZXNzaW9ucyB0aGF0IHNlcnZlIHRvIG5hcnJvdyB0eXBlcyB3aXRoaW4gdGhlXG4gICAgLy8gYGlmYC4gYGd1YXJkYCBpcyBjYWxjdWxhdGVkIGJ5IHN0YXJ0aW5nIHdpdGggYHRydWVgIGFuZCBhZGRpbmcgb3RoZXIgY29uZGl0aW9ucyBhcyBuZWVkZWQuXG4gICAgLy8gQ29sbGVjdCB0aGVzZSBpbnRvIGBndWFyZHNgIGJ5IHByb2Nlc3NpbmcgdGhlIGRpcmVjdGl2ZXMuXG4gICAgY29uc3QgZGlyZWN0aXZlR3VhcmRzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKHRoaXMudGVtcGxhdGUpO1xuICAgIGlmIChkaXJlY3RpdmVzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IGRpckluc3RJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlLCBkaXIpO1xuICAgICAgICBjb25zdCBkaXJJZCA9XG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlKGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+KTtcblxuICAgICAgICAvLyBUaGVyZSBhcmUgdHdvIGtpbmRzIG9mIGd1YXJkcy4gVGVtcGxhdGUgZ3VhcmRzIChuZ1RlbXBsYXRlR3VhcmRzKSBhbGxvdyB0eXBlIG5hcnJvd2luZyBvZlxuICAgICAgICAvLyB0aGUgZXhwcmVzc2lvbiBwYXNzZWQgdG8gYW4gQElucHV0IG9mIHRoZSBkaXJlY3RpdmUuIFNjYW4gdGhlIGRpcmVjdGl2ZSB0byBzZWUgaWYgaXQgaGFzXG4gICAgICAgIC8vIGFueSB0ZW1wbGF0ZSBndWFyZHMsIGFuZCBnZW5lcmF0ZSB0aGVtIGlmIG5lZWRlZC5cbiAgICAgICAgZGlyLm5nVGVtcGxhdGVHdWFyZHMuZm9yRWFjaChndWFyZCA9PiB7XG4gICAgICAgICAgLy8gRm9yIGVhY2ggdGVtcGxhdGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSwgbG9vayBmb3IgYSBiaW5kaW5nIHRvIHRoYXQgaW5wdXQuXG4gICAgICAgICAgY29uc3QgYm91bmRJbnB1dCA9IHRoaXMudGVtcGxhdGUuaW5wdXRzLmZpbmQoaSA9PiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSkgfHxcbiAgICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAoaTogVG1wbEFzdFRleHRBdHRyaWJ1dGV8VG1wbEFzdEJvdW5kQXR0cmlidXRlKTogaSBpcyBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgPT5cbiAgICAgICAgICAgICAgICAgICAgICBpIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGkubmFtZSA9PT0gZ3VhcmQuaW5wdXROYW1lKTtcbiAgICAgICAgICBpZiAoYm91bmRJbnB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBzdWNoIGEgYmluZGluZywgZ2VuZXJhdGUgYW4gZXhwcmVzc2lvbiBmb3IgaXQuXG4gICAgICAgICAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihib3VuZElucHV0LnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG5cbiAgICAgICAgICAgIC8vIFRoZSBleHByZXNzaW9uIGhhcyBhbHJlYWR5IGJlZW4gY2hlY2tlZCBpbiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBpbnZvY2F0aW9uLCBzb1xuICAgICAgICAgICAgLy8gaXQgc2hvdWxkIGJlIGlnbm9yZWQgd2hlbiB1c2VkIHdpdGhpbiBhIHRlbXBsYXRlIGd1YXJkLlxuICAgICAgICAgICAgbWFya0lnbm9yZURpYWdub3N0aWNzKGV4cHIpO1xuXG4gICAgICAgICAgICBpZiAoZ3VhcmQudHlwZSA9PT0gJ2JpbmRpbmcnKSB7XG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgYmluZGluZyBleHByZXNzaW9uIGl0c2VsZiBhcyBndWFyZC5cbiAgICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlIHdpdGggdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBhbmQgdGhhdFxuICAgICAgICAgICAgICAvLyBleHByZXNzaW9uLlxuICAgICAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgYG5nVGVtcGxhdGVHdWFyZF8ke2d1YXJkLmlucHV0TmFtZX1gLCBbXG4gICAgICAgICAgICAgICAgZGlySW5zdElkLFxuICAgICAgICAgICAgICAgIGV4cHIsXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCBib3VuZElucHV0LnZhbHVlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaGUgc2Vjb25kIGtpbmQgb2YgZ3VhcmQgaXMgYSB0ZW1wbGF0ZSBjb250ZXh0IGd1YXJkLiBUaGlzIGd1YXJkIG5hcnJvd3MgdGhlIHRlbXBsYXRlXG4gICAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgICBpZiAoZGlyLmhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQgJiYgdGhpcy50Y2IuZW52LmNvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcykge1xuICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgJ25nVGVtcGxhdGVDb250ZXh0R3VhcmQnLCBbZGlySW5zdElkLCBjdHhdKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCB0aGlzLnRlbXBsYXRlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJ5IGRlZmF1bHQgdGhlIGd1YXJkIGlzIHNpbXBseSBgdHJ1ZWAuXG4gICAgbGV0IGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSBndWFyZHMgZnJvbSBkaXJlY3RpdmVzLCB1c2UgdGhlbSBpbnN0ZWFkLlxuICAgIGlmIChkaXJlY3RpdmVHdWFyZHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gUG9wIHRoZSBmaXJzdCB2YWx1ZSBhbmQgdXNlIGl0IGFzIHRoZSBpbml0aWFsaXplciB0byByZWR1Y2UoKS4gVGhpcyB3YXksIGEgc2luZ2xlIGd1YXJkXG4gICAgICAvLyB3aWxsIGJlIHVzZWQgb24gaXRzIG93biwgYnV0IHR3byBvciBtb3JlIHdpbGwgYmUgY29tYmluZWQgaW50byBiaW5hcnkgQU5EIGV4cHJlc3Npb25zLlxuICAgICAgZ3VhcmQgPSBkaXJlY3RpdmVHdWFyZHMucmVkdWNlKFxuICAgICAgICAgIChleHByLCBkaXJHdWFyZCkgPT5cbiAgICAgICAgICAgICAgdHMuY3JlYXRlQmluYXJ5KGV4cHIsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIGRpckd1YXJkKSxcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucG9wKCkhKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgU2NvcGUgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBjb25zdHJ1Y3RzIHRoZSBsaXN0IG9mIG9wZXJhdGlvbnMgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgIC8vIGNoaWxkcmVuLCBhcyB3ZWxsIGFzIHRyYWNrcyBiaW5kaW5ncyB3aXRoaW4gdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IHRtcGxTY29wZSA9IFNjb3BlLmZvck5vZGVzKHRoaXMudGNiLCB0aGlzLnNjb3BlLCB0aGlzLnRlbXBsYXRlLCBndWFyZCk7XG5cbiAgICAvLyBSZW5kZXIgdGhlIHRlbXBsYXRlJ3MgYFNjb3BlYCBpbnRvIGl0cyBzdGF0ZW1lbnRzLlxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSB0bXBsU2NvcGUucmVuZGVyKCk7XG4gICAgaWYgKHN0YXRlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBBcyBhbiBvcHRpbWl6YXRpb24sIGRvbid0IGdlbmVyYXRlIHRoZSBzY29wZSdzIGJsb2NrIGlmIGl0IGhhcyBubyBzdGF0ZW1lbnRzLiBUaGlzIGlzXG4gICAgICAvLyBiZW5lZmljaWFsIGZvciB0ZW1wbGF0ZXMgdGhhdCBjb250YWluIGZvciBleGFtcGxlIGA8c3BhbiAqbmdJZj1cImZpcnN0XCI+PC9zcGFuPmAsIGluIHdoaWNoXG4gICAgICAvLyBjYXNlIHRoZXJlJ3Mgbm8gbmVlZCB0byByZW5kZXIgdGhlIGBOZ0lmYCBndWFyZCBleHByZXNzaW9uLiBUaGlzIHNlZW1zIGxpa2UgYSBtaW5vclxuICAgICAgLy8gaW1wcm92ZW1lbnQsIGhvd2V2ZXIgaXQgcmVkdWNlcyB0aGUgbnVtYmVyIG9mIGZsb3ctbm9kZSBhbnRlY2VkZW50cyB0aGF0IFR5cGVTY3JpcHQgbmVlZHNcbiAgICAgIC8vIHRvIGtlZXAgaW50byBhY2NvdW50IGZvciBzdWNoIGNhc2VzLCByZXN1bHRpbmcgaW4gYW4gb3ZlcmFsbCByZWR1Y3Rpb24gb2ZcbiAgICAgIC8vIHR5cGUtY2hlY2tpbmcgdGltZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCB0bXBsQmxvY2s6IHRzLlN0YXRlbWVudCA9IHRzLmNyZWF0ZUJsb2NrKHN0YXRlbWVudHMpO1xuICAgIGlmIChndWFyZCAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhlIHNjb3BlIGhhcyBhIGd1YXJkIHRoYXQgbmVlZHMgdG8gYmUgYXBwbGllZCwgc28gd3JhcCB0aGUgdGVtcGxhdGUgYmxvY2sgaW50byBhbiBgaWZgXG4gICAgICAvLyBzdGF0ZW1lbnQgY29udGFpbmluZyB0aGUgZ3VhcmQgZXhwcmVzc2lvbi5cbiAgICAgIHRtcGxCbG9jayA9IHRzLmNyZWF0ZUlmKC8qIGV4cHJlc3Npb24gKi8gZ3VhcmQsIC8qIHRoZW5TdGF0ZW1lbnQgKi8gdG1wbEJsb2NrKTtcbiAgICB9XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodG1wbEJsb2NrKTtcblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIHJlbmRlcnMgYSB0ZXh0IGJpbmRpbmcgKGludGVycG9sYXRpb24pIGludG8gdGhlIFRDQi5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JUZXh0SW50ZXJwb2xhdGlvbk9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgYmluZGluZzogVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbih0aGlzLmJpbmRpbmcudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjb25zdHJ1Y3RzIGFuIGluc3RhbmNlIG9mIGEgZGlyZWN0aXZlIF93aXRob3V0XyBzZXR0aW5nIGFueSBvZiBpdHMgaW5wdXRzLiBJbnB1dHNcbiAqIGFyZSBsYXRlciBzZXQgaW4gdGhlIGBUY2JEaXJlY3RpdmVJbnB1dHNPcGAuIFR5cGUgY2hlY2tpbmcgd2FzIGZvdW5kIHRvIGJlIGZhc3RlciB3aGVuIGRvbmUgaW5cbiAqIHRoaXMgd2F5IGFzIG9wcG9zZWQgdG8gYFRjYkRpcmVjdGl2ZUN0b3JPcGAgd2hpY2ggaXMgb25seSBuZWNlc3Nhcnkgd2hlbiB0aGUgZGlyZWN0aXZlIGlzXG4gKiBnZW5lcmljLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZVR5cGVPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgdG8gZGVjbGFyZSB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBhbmRcbiAgICAvLyB3b24ndCByZXBvcnQgZGlhZ25vc3RpY3MgYnkgaXRzZWxmLCBzbyB0aGUgb3BlcmF0aW9uIGlzIG1hcmtlZCBhcyBvcHRpb25hbCB0byBhdm9pZFxuICAgIC8vIGdlbmVyYXRpbmcgZGVjbGFyYXRpb25zIGZvciBkaXJlY3RpdmVzIHRoYXQgZG9uJ3QgaGF2ZSBhbnkgaW5wdXRzL291dHB1dHMuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuXG4gICAgY29uc3QgdHlwZSA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG4gICAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIodHlwZSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKHR5cGUsIHRoaXMubm9kZS5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGlkLCB0eXBlKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNyZWF0ZXMgYSB2YXJpYWJsZSBmb3IgYSBsb2NhbCByZWYgaW4gYSB0ZW1wbGF0ZS5cbiAqIFRoZSBpbml0aWFsaXplciBmb3IgdGhlIHZhcmlhYmxlIGlzIHRoZSB2YXJpYWJsZSBleHByZXNzaW9uIGZvciB0aGUgZGlyZWN0aXZlLCB0ZW1wbGF0ZSwgb3JcbiAqIGVsZW1lbnQgdGhlIHJlZiByZWZlcnMgdG8uIFdoZW4gdGhlIHJlZmVyZW5jZSBpcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSwgdGhvc2UgVENCIHN0YXRlbWVudHMgd2lsbFxuICogYWNjZXNzIHRoaXMgdmFyaWFibGUgYXMgd2VsbC4gRm9yIGV4YW1wbGU6XG4gKiBgYGBcbiAqIHZhciBfdDEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAqIHZhciBfdDIgPSBfdDE7XG4gKiBfdDIudmFsdWVcbiAqIGBgYFxuICogVGhpcyBvcGVyYXRpb24gc3VwcG9ydHMgbW9yZSBmbHVlbnQgbG9va3VwcyBmb3IgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VyYCB3aGVuIGdldHRpbmcgYSBzeW1ib2xcbiAqIGZvciBhIHJlZmVyZW5jZS4gSW4gbW9zdCBjYXNlcywgdGhpcyBpc24ndCBlc3NlbnRpYWw7IHRoYXQgaXMsIHRoZSBpbmZvcm1hdGlvbiBmb3IgdGhlIHN5bWJvbFxuICogY291bGQgYmUgZ2F0aGVyZWQgd2l0aG91dCB0aGlzIG9wZXJhdGlvbiB1c2luZyB0aGUgYEJvdW5kVGFyZ2V0YC4gSG93ZXZlciwgZm9yIHRoZSBjYXNlIG9mXG4gKiBuZy10ZW1wbGF0ZSByZWZlcmVuY2VzLCB3ZSB3aWxsIG5lZWQgdGhpcyByZWZlcmVuY2UgdmFyaWFibGUgdG8gbm90IG9ubHkgcHJvdmlkZSBhIGxvY2F0aW9uIGluXG4gKiB0aGUgc2hpbSBmaWxlLCBidXQgYWxzbyB0byBuYXJyb3cgdGhlIHZhcmlhYmxlIHRvIHRoZSBjb3JyZWN0IGBUZW1wbGF0ZVJlZjxUPmAgdHlwZSByYXRoZXIgdGhhblxuICogYFRlbXBsYXRlUmVmPGFueT5gICh0aGlzIHdvcmsgaXMgc3RpbGwgVE9ETykuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB2YXJpYWJsZSB3aXRoIGl0cyBpbmZlcnJlZFxuICogdHlwZS5cbiAqL1xuY2xhc3MgVGNiUmVmZXJlbmNlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0Y2I6IENvbnRleHQsIHByaXZhdGUgcmVhZG9ubHkgc2NvcGU6IFNjb3BlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBub2RlOiBUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBob3N0OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldDogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGF8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIC8vIFRoZSBzdGF0ZW1lbnQgZ2VuZXJhdGVkIGJ5IHRoaXMgb3BlcmF0aW9uIGlzIG9ubHkgdXNlZCB0byBmb3IgdGhlIFR5cGUgQ2hlY2tlclxuICAvLyBzbyBpdCBjYW4gbWFwIGEgcmVmZXJlbmNlIHZhcmlhYmxlIGluIHRoZSB0ZW1wbGF0ZSBkaXJlY3RseSB0byBhIG5vZGUgaW4gdGhlIFRDQi5cbiAgcmVhZG9ubHkgb3B0aW9uYWwgPSB0cnVlO1xuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgbGV0IGluaXRpYWxpemVyID1cbiAgICAgICAgdGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgdGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCA/XG4gICAgICAgIHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRhcmdldCkgOlxuICAgICAgICB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ob3N0LCB0aGlzLnRhcmdldCk7XG5cbiAgICAvLyBUaGUgcmVmZXJlbmNlIGlzIGVpdGhlciB0byBhbiBlbGVtZW50LCBhbiA8bmctdGVtcGxhdGU+IG5vZGUsIG9yIHRvIGEgZGlyZWN0aXZlIG9uIGFuXG4gICAgLy8gZWxlbWVudCBvciB0ZW1wbGF0ZS5cbiAgICBpZiAoKHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgJiYgIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzKSB8fFxuICAgICAgICAhdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXMpIHtcbiAgICAgIC8vIFJlZmVyZW5jZXMgdG8gRE9NIG5vZGVzIGFyZSBwaW5uZWQgdG8gJ2FueScgd2hlbiBgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzYCBpcyBgZmFsc2VgLlxuICAgICAgLy8gUmVmZXJlbmNlcyB0byBgVGVtcGxhdGVSZWZgcyBhbmQgZGlyZWN0aXZlcyBhcmUgcGlubmVkIHRvICdhbnknIHdoZW5cbiAgICAgIC8vIGBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXNgIGlzIGBmYWxzZWAuXG4gICAgICBpbml0aWFsaXplciA9XG4gICAgICAgICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKGluaXRpYWxpemVyLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gRGlyZWN0IHJlZmVyZW5jZXMgdG8gYW4gPG5nLXRlbXBsYXRlPiBub2RlIHNpbXBseSByZXF1aXJlIGEgdmFsdWUgb2YgdHlwZVxuICAgICAgLy8gYFRlbXBsYXRlUmVmPGFueT5gLiBUbyBnZXQgdGhpcywgYW4gZXhwcmVzc2lvbiBvZiB0aGUgZm9ybVxuICAgICAgLy8gYChfdDEgYXMgYW55IGFzIFRlbXBsYXRlUmVmPGFueT4pYCBpcyBjb25zdHJ1Y3RlZC5cbiAgICAgIGluaXRpYWxpemVyID1cbiAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24oaW5pdGlhbGl6ZXIsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICAgIGluaXRpYWxpemVyID0gdHMuY3JlYXRlQXNFeHByZXNzaW9uKFxuICAgICAgICAgIGluaXRpYWxpemVyLFxuICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoJ0Bhbmd1bGFyL2NvcmUnLCAnVGVtcGxhdGVSZWYnLCBbRFlOQU1JQ19UWVBFXSkpO1xuICAgICAgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVQYXJlbihpbml0aWFsaXplcik7XG4gICAgfVxuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMubm9kZS5zb3VyY2VTcGFuKTtcblxuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUgd2l0aCB0eXBlcyBpbmZlcnJlZCBmcm9tIGl0cyBpbnB1dHMuIFRoZVxuICogaW5wdXRzIHRoZW1zZWx2ZXMgYXJlIG5vdCBjaGVja2VkIGhlcmU7IGNoZWNraW5nIG9mIGlucHV0cyBpcyBhY2hpZXZlZCBpbiBgVGNiRGlyZWN0aXZlSW5wdXRzT3BgLlxuICogQW55IGVycm9ycyByZXBvcnRlZCBpbiB0aGlzIHN0YXRlbWVudCBhcmUgaWdub3JlZCwgYXMgdGhlIHR5cGUgY29uc3RydWN0b3IgY2FsbCBpcyBvbmx5IHByZXNlbnRcbiAqIGZvciB0eXBlLWluZmVyZW5jZS5cbiAqXG4gKiBXaGVuIGEgRGlyZWN0aXZlIGlzIGdlbmVyaWMsIGl0IGlzIHJlcXVpcmVkIHRoYXQgdGhlIFRDQiBnZW5lcmF0ZXMgdGhlIGluc3RhbmNlIHVzaW5nIHRoaXMgbWV0aG9kXG4gKiBpbiBvcmRlciB0byBpbmZlciB0aGUgdHlwZSBpbmZvcm1hdGlvbiBjb3JyZWN0bHkuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB2YXJpYWJsZSB3aXRoIGl0cyBpbmZlcnJlZFxuICogdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3Rvck9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgZ2VuZXJhdGVkIGJ5IHRoaXMgb3BlcmF0aW9uIGlzIG9ubHkgdXNlZCB0byBpbmZlciB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBhbmRcbiAgICAvLyB3b24ndCByZXBvcnQgZGlhZ25vc3RpY3MgYnkgaXRzZWxmLCBzbyB0aGUgb3BlcmF0aW9uIGlzIG1hcmtlZCBhcyBvcHRpb25hbC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIoaWQsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpZCwgdGhpcy5ub2RlLnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG5cbiAgICBjb25zdCBnZW5lcmljSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIFRjYkRpcmVjdGl2ZUlucHV0PigpO1xuXG4gICAgY29uc3QgaW5wdXRzID0gZ2V0Qm91bmRJbnB1dHModGhpcy5kaXIsIHRoaXMubm9kZSwgdGhpcy50Y2IpO1xuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IGZpZWxkTmFtZSBvZiBpbnB1dC5maWVsZE5hbWVzKSB7XG4gICAgICAgIC8vIFNraXAgdGhlIGZpZWxkIGlmIGFuIGF0dHJpYnV0ZSBoYXMgYWxyZWFkeSBiZWVuIGJvdW5kIHRvIGl0OyB3ZSBjYW4ndCBoYXZlIGEgZHVwbGljYXRlXG4gICAgICAgIC8vIGtleSBpbiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBjYWxsLlxuICAgICAgICBpZiAoZ2VuZXJpY0lucHV0cy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHRyYW5zbGF0ZUlucHV0KGlucHV0LmF0dHJpYnV0ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgICBnZW5lcmljSW5wdXRzLnNldChmaWVsZE5hbWUsIHtcbiAgICAgICAgICB0eXBlOiAnYmluZGluZycsXG4gICAgICAgICAgZmllbGQ6IGZpZWxkTmFtZSxcbiAgICAgICAgICBleHByZXNzaW9uLFxuICAgICAgICAgIHNvdXJjZVNwYW46IGlucHV0LmF0dHJpYnV0ZS5zb3VyY2VTcGFuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCB1bnNldCBkaXJlY3RpdmUgaW5wdXRzIGZvciBlYWNoIG9mIHRoZSByZW1haW5pbmcgdW5zZXQgZmllbGRzLlxuICAgIGZvciAoY29uc3QgW2ZpZWxkTmFtZV0gb2YgdGhpcy5kaXIuaW5wdXRzKSB7XG4gICAgICBpZiAoIWdlbmVyaWNJbnB1dHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgZ2VuZXJpY0lucHV0cy5zZXQoZmllbGROYW1lLCB7dHlwZTogJ3Vuc2V0JywgZmllbGQ6IGZpZWxkTmFtZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgdGhlIGRpcmVjdGl2ZSB0byBpbmZlciBhIHR5cGUsIGFuZCBhc3NpZ24gdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGluc3RhbmNlLlxuICAgIGNvbnN0IHR5cGVDdG9yID0gdGNiQ2FsbFR5cGVDdG9yKHRoaXMuZGlyLCB0aGlzLnRjYiwgQXJyYXkuZnJvbShnZW5lcmljSW5wdXRzLnZhbHVlcygpKSk7XG4gICAgbWFya0lnbm9yZURpYWdub3N0aWNzKHR5cGVDdG9yKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCB0eXBlQ3RvcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIGNpcmN1bGFyRmFsbGJhY2soKTogVGNiT3Age1xuICAgIHJldHVybiBuZXcgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcCh0aGlzLnRjYiwgdGhpcy5zY29wZSwgdGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgaW5wdXQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB0aGF0IGNvcnJlc3BvbmQgd2l0aCB0aGVcbiAqIG1lbWJlcnMgb2YgYSBkaXJlY3RpdmUuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlSW5wdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZGlySWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGpvb3N0KTogcmVwb3J0IGR1cGxpY2F0ZSBwcm9wZXJ0aWVzXG5cbiAgICBjb25zdCBpbnB1dHMgPSBnZXRCb3VuZElucHV0cyh0aGlzLmRpciwgdGhpcy5ub2RlLCB0aGlzLnRjYik7XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBpbnB1dHMpIHtcbiAgICAgIC8vIEZvciBib3VuZCBpbnB1dHMsIHRoZSBwcm9wZXJ0eSBpcyBhc3NpZ25lZCB0aGUgYmluZGluZyBleHByZXNzaW9uLlxuICAgICAgbGV0IGV4cHIgPSB0cmFuc2xhdGVJbnB1dChpbnB1dC5hdHRyaWJ1dGUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGFzc2lnbm1lbnQ6IHRzLkV4cHJlc3Npb24gPSB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcik7XG5cbiAgICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIGlucHV0LmZpZWxkTmFtZXMpIHtcbiAgICAgICAgbGV0IHRhcmdldDogdHMuTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKHRoaXMuZGlyLmNvZXJjZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIFRoZSBpbnB1dCBoYXMgYSBjb2VyY2lvbiBkZWNsYXJhdGlvbiB3aGljaCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkIG9mIGFzc2lnbmluZyB0aGVcbiAgICAgICAgICAvLyBleHByZXNzaW9uIGludG8gdGhlIGlucHV0IGZpZWxkIGRpcmVjdGx5LiBUbyBhY2hpZXZlIHRoaXMsIGEgdmFyaWFibGUgaXMgZGVjbGFyZWRcbiAgICAgICAgICAvLyB3aXRoIGEgdHlwZSBvZiBgdHlwZW9mIERpcmVjdGl2ZS5uZ0FjY2VwdElucHV0VHlwZV9maWVsZE5hbWVgIHdoaWNoIGlzIHRoZW4gdXNlZCBhc1xuICAgICAgICAgIC8vIHRhcmdldCBvZiB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgICBjb25zdCBkaXJUeXBlUmVmID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICAgICAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGlyVHlwZVJlZikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgZnJvbSByZWZlcmVuY2UgdG8gJHt0aGlzLmRpci5yZWYuZGVidWdOYW1lfWApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgICAgICAgIGNvbnN0IHR5cGUgPSB0c0NyZWF0ZVR5cGVRdWVyeUZvckNvZXJjZWRJbnB1dChkaXJUeXBlUmVmLnR5cGVOYW1lLCBmaWVsZE5hbWUpO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGlkLCB0eXBlKSk7XG5cbiAgICAgICAgICB0YXJnZXQgPSBpZDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmRpci51bmRlY2xhcmVkSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAvLyBJZiBubyBjb2VyY2lvbiBkZWNsYXJhdGlvbiBpcyBwcmVzZW50IG5vciBpcyB0aGUgZmllbGQgZGVjbGFyZWQgKGkuZS4gdGhlIGlucHV0IGlzXG4gICAgICAgICAgLy8gZGVjbGFyZWQgaW4gYSBgQERpcmVjdGl2ZWAgb3IgYEBDb21wb25lbnRgIGRlY29yYXRvcidzIGBpbnB1dHNgIHByb3BlcnR5KSB0aGVyZSBpcyBub1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgdGFyZ2V0IGF2YWlsYWJsZSwgc28gdGhpcyBmaWVsZCBpcyBza2lwcGVkLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgIXRoaXMudGNiLmVudi5jb25maWcuaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzICYmXG4gICAgICAgICAgICB0aGlzLmRpci5yZXN0cmljdGVkSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgYWNjZXNzIG1vZGlmaWVycyBpcyBkaXNhYmxlZCBhbmQgdGhlIGZpZWxkIGlzIHJlc3RyaWN0ZWRcbiAgICAgICAgICAvLyAoaS5lLiBwcml2YXRlL3Byb3RlY3RlZC9yZWFkb25seSksIGdlbmVyYXRlIGFuIGFzc2lnbm1lbnQgaW50byBhIHRlbXBvcmFyeSB2YXJpYWJsZVxuICAgICAgICAgIC8vIHRoYXQgaGFzIHRoZSB0eXBlIG9mIHRoZSBmaWVsZC4gVGhpcyBhY2hpZXZlcyB0eXBlLWNoZWNraW5nIGJ1dCBjaXJjdW12ZW50cyB0aGUgYWNjZXNzXG4gICAgICAgICAgLy8gbW9kaWZpZXJzLlxuICAgICAgICAgIGlmIChkaXJJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgICAgICAgY29uc3QgZGlyVHlwZVJlZiA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG4gICAgICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRpclR5cGVSZWYpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7dGhpcy5kaXIucmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUluZGV4ZWRBY2Nlc3NUeXBlTm9kZShcbiAgICAgICAgICAgICAgdHMuY3JlYXRlVHlwZVF1ZXJ5Tm9kZShkaXJJZCBhcyB0cy5JZGVudGlmaWVyKSxcbiAgICAgICAgICAgICAgdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGROYW1lKSkpO1xuICAgICAgICAgIGNvbnN0IHRlbXAgPSB0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSk7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodGVtcCk7XG4gICAgICAgICAgdGFyZ2V0ID0gaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGRpcklkID09PSBudWxsKSB7XG4gICAgICAgICAgICBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBUbyBnZXQgZXJyb3JzIGFzc2lnbiBkaXJlY3RseSB0byB0aGUgZmllbGRzIG9uIHRoZSBpbnN0YW5jZSwgdXNpbmcgcHJvcGVydHkgYWNjZXNzXG4gICAgICAgICAgLy8gd2hlbiBwb3NzaWJsZS4gU3RyaW5nIGxpdGVyYWwgZmllbGRzIG1heSBub3QgYmUgdmFsaWQgSlMgaWRlbnRpZmllcnMgc28gd2UgdXNlXG4gICAgICAgICAgLy8gbGl0ZXJhbCBlbGVtZW50IGFjY2VzcyBpbnN0ZWFkIGZvciB0aG9zZSBjYXNlcy5cbiAgICAgICAgICB0YXJnZXQgPSB0aGlzLmRpci5zdHJpbmdMaXRlcmFsSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkgP1xuICAgICAgICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkTmFtZSkpIDpcbiAgICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZUlkZW50aWZpZXIoZmllbGROYW1lKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5hbGx5IHRoZSBhc3NpZ25tZW50IGlzIGV4dGVuZGVkIGJ5IGFzc2lnbmluZyBpdCBpbnRvIHRoZSB0YXJnZXQgZXhwcmVzc2lvbi5cbiAgICAgICAgYXNzaWdubWVudCA9IHRzLmNyZWF0ZUJpbmFyeSh0YXJnZXQsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGFzc2lnbm1lbnQpO1xuICAgICAgfVxuXG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LmF0dHJpYnV0ZS5zb3VyY2VTcGFuKTtcbiAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoYXNzaWdubWVudCkpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGlzIHVzZWQgdG8gZ2VuZXJhdGUgYSBmYWxsYmFjayBleHByZXNzaW9uIGlmIHRoZSBpbmZlcmVuY2Ugb2YgYSBkaXJlY3RpdmUgdHlwZVxuICogdmlhIGBUY2JEaXJlY3RpdmVDdG9yT3BgIHJlcXVpcmVzIGEgcmVmZXJlbmNlIHRvIGl0cyBvd24gdHlwZS4gVGhpcyBjYW4gaGFwcGVuIHVzaW5nIGEgdGVtcGxhdGVcbiAqIHJlZmVyZW5jZTpcbiAqXG4gKiBgYGBodG1sXG4gKiA8c29tZS1jbXAgI3JlZiBbcHJvcF09XCJyZWYuZm9vXCI+PC9zb21lLWNtcD5cbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgYFRjYkRpcmVjdGl2ZUN0b3JDaXJjdWxhckZhbGxiYWNrT3BgIHdpbGwgYWRkIGEgc2Vjb25kIGluZmVyZW5jZSBvZiB0aGUgZGlyZWN0aXZlXG4gKiB0eXBlIHRvIHRoZSB0eXBlLWNoZWNrIGJsb2NrLCB0aGlzIHRpbWUgY2FsbGluZyB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBjb25zdHJ1Y3RvciB3aXRob3V0IGFueVxuICogaW5wdXQgZXhwcmVzc2lvbnMuIFRoaXMgaW5mZXJzIHRoZSB3aWRlc3QgcG9zc2libGUgc3VwZXJ0eXBlIGZvciB0aGUgZGlyZWN0aXZlLCB3aGljaCBpcyB1c2VkIHRvXG4gKiByZXNvbHZlIGFueSByZWN1cnNpdmUgcmVmZXJlbmNlcyByZXF1aXJlZCB0byBpbmZlciB0aGUgcmVhbCB0eXBlLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZUN0b3IgPSB0aGlzLnRjYi5lbnYudHlwZUN0b3JGb3IodGhpcy5kaXIpO1xuICAgIGNvbnN0IGNpcmN1bGFyUGxhY2Vob2xkZXIgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICB0eXBlQ3RvciwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIFt0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpXSk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgY2lyY3VsYXJQbGFjZWhvbGRlcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBmZWVkcyBlbGVtZW50cyBhbmQgdW5jbGFpbWVkIHByb3BlcnRpZXMgdG8gdGhlIGBEb21TY2hlbWFDaGVja2VyYC5cbiAqXG4gKiBUaGUgRE9NIHNjaGVtYSBpcyBub3QgY2hlY2tlZCB2aWEgVENCIGNvZGUgZ2VuZXJhdGlvbi4gSW5zdGVhZCwgdGhlIGBEb21TY2hlbWFDaGVja2VyYCBpbmdlc3RzXG4gKiBlbGVtZW50cyBhbmQgcHJvcGVydHkgYmluZGluZ3MgYW5kIGFjY3VtdWxhdGVzIHN5bnRoZXRpYyBgdHMuRGlhZ25vc3RpY2BzIG91dC1vZi1iYW5kLiBUaGVzZSBhcmVcbiAqIGxhdGVyIG1lcmdlZCB3aXRoIHRoZSBkaWFnbm9zdGljcyBnZW5lcmF0ZWQgZnJvbSB0aGUgVENCLlxuICpcbiAqIEZvciBjb252ZW5pZW5jZSwgdGhlIFRDQiBpdGVyYXRpb24gb2YgdGhlIHRlbXBsYXRlIGlzIHVzZWQgdG8gZHJpdmUgdGhlIGBEb21TY2hlbWFDaGVja2VyYCB2aWFcbiAqIHRoZSBgVGNiRG9tU2NoZW1hQ2hlY2tlck9wYC5cbiAqL1xuY2xhc3MgVGNiRG9tU2NoZW1hQ2hlY2tlck9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBwcml2YXRlIGNoZWNrRWxlbWVudDogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgY2xhaW1lZElucHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAodGhpcy5jaGVja0VsZW1lbnQpIHtcbiAgICAgIHRoaXMudGNiLmRvbVNjaGVtYUNoZWNrZXIuY2hlY2tFbGVtZW50KHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHRoaXMudGNiLnNjaGVtYXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgdGhpcy5lbGVtZW50LmlucHV0cykge1xuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkgJiYgdGhpcy5jbGFpbWVkSW5wdXRzLmhhcyhiaW5kaW5nLm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBiaW5kaW5nIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgICAgaWYgKGJpbmRpbmcubmFtZSAhPT0gJ3N0eWxlJyAmJiBiaW5kaW5nLm5hbWUgIT09ICdjbGFzcycpIHtcbiAgICAgICAgICAvLyBBIGRpcmVjdCBiaW5kaW5nIHRvIGEgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3QgcHJvcGVydHlOYW1lID0gQVRUUl9UT19QUk9QW2JpbmRpbmcubmFtZV0gfHwgYmluZGluZy5uYW1lO1xuICAgICAgICAgIHRoaXMudGNiLmRvbVNjaGVtYUNoZWNrZXIuY2hlY2tQcm9wZXJ0eShcbiAgICAgICAgICAgICAgdGhpcy50Y2IuaWQsIHRoaXMuZWxlbWVudCwgcHJvcGVydHlOYW1lLCBiaW5kaW5nLnNvdXJjZVNwYW4sIHRoaXMudGNiLnNjaGVtYXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cblxuLyoqXG4gKiBNYXBwaW5nIGJldHdlZW4gYXR0cmlidXRlcyBuYW1lcyB0aGF0IGRvbid0IGNvcnJlc3BvbmQgdG8gdGhlaXIgZWxlbWVudCBwcm9wZXJ0eSBuYW1lcy5cbiAqIE5vdGU6IHRoaXMgbWFwcGluZyBoYXMgdG8gYmUga2VwdCBpbiBzeW5jIHdpdGggdGhlIGVxdWFsbHkgbmFtZWQgbWFwcGluZyBpbiB0aGUgcnVudGltZS5cbiAqL1xuY29uc3QgQVRUUl9UT19QUk9QOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICdjbGFzcyc6ICdjbGFzc05hbWUnLFxuICAnZm9yJzogJ2h0bWxGb3InLFxuICAnZm9ybWFjdGlvbic6ICdmb3JtQWN0aW9uJyxcbiAgJ2lubmVySHRtbCc6ICdpbm5lckhUTUwnLFxuICAncmVhZG9ubHknOiAncmVhZE9ubHknLFxuICAndGFiaW5kZXgnOiAndGFiSW5kZXgnLFxufTtcblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgXCJ1bmNsYWltZWQgaW5wdXRzXCIgLSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHdoaWNoIHdlcmVcbiAqIG5vdCBhdHRyaWJ1dGVkIHRvIGFueSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBhbmQgYXJlIGluc3RlYWQgcHJvY2Vzc2VkIGFnYWluc3QgdGhlIEhUTUwgZWxlbWVudFxuICogaXRzZWxmLlxuICpcbiAqIEN1cnJlbnRseSwgb25seSB0aGUgZXhwcmVzc2lvbnMgb2YgdGhlc2UgYmluZGluZ3MgYXJlIGNoZWNrZWQuIFRoZSB0YXJnZXRzIG9mIHRoZSBiaW5kaW5ncyBhcmVcbiAqIGNoZWNrZWQgYWdhaW5zdCB0aGUgRE9NIHNjaGVtYSB2aWEgYSBgVGNiRG9tU2NoZW1hQ2hlY2tlck9wYC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JVbmNsYWltZWRJbnB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIC8vIGB0aGlzLmlucHV0c2AgY29udGFpbnMgb25seSB0aG9zZSBiaW5kaW5ncyBub3QgbWF0Y2hlZCBieSBhbnkgZGlyZWN0aXZlLiBUaGVzZSBiaW5kaW5ncyBnbyB0b1xuICAgIC8vIHRoZSBlbGVtZW50IGl0c2VsZi5cbiAgICBsZXQgZWxJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgdGhpcy5lbGVtZW50LmlucHV0cykge1xuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkgJiYgdGhpcy5jbGFpbWVkSW5wdXRzLmhhcyhiaW5kaW5nLm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBiaW5kaW5nIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJpbmRpbmcudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21CaW5kaW5ncyAmJiBiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgaWYgKGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGVsSWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5lbGVtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICBjb25zdCBwcm9wID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhlbElkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHByb3BlcnR5TmFtZSkpO1xuICAgICAgICAgIGNvbnN0IHN0bXQgPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgd3JhcEZvckRpYWdub3N0aWNzKGV4cHIpKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHN0bXQsIGJpbmRpbmcuc291cmNlU3Bhbik7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChzdG10KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEEgYmluZGluZyB0byBhbiBhbmltYXRpb24sIGF0dHJpYnV0ZSwgY2xhc3Mgb3Igc3R5bGUuIEZvciBub3csIG9ubHkgdmFsaWRhdGUgdGhlIHJpZ2h0LVxuICAgICAgICAvLyBoYW5kIHNpZGUgb2YgdGhlIGV4cHJlc3Npb24uXG4gICAgICAgIC8vIFRPRE86IHByb3Blcmx5IGNoZWNrIGNsYXNzIGFuZCBzdHlsZSBiaW5kaW5ncy5cbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgZXZlbnQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB0aGF0IGNvcnJlc3BvbmQgd2l0aCB0aGVcbiAqIG91dHB1dHMgb2YgYSBkaXJlY3RpdmUuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRjYkRpcmVjdGl2ZU91dHB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGxldCBkaXJJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBjb25zdCBvdXRwdXRzID0gdGhpcy5kaXIub3V0cHV0cztcblxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMubm9kZS5vdXRwdXRzKSB7XG4gICAgICBpZiAob3V0cHV0LnR5cGUgIT09IFBhcnNlZEV2ZW50VHlwZS5SZWd1bGFyIHx8ICFvdXRwdXRzLmhhc0JpbmRpbmdQcm9wZXJ0eU5hbWUob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gVE9ETyhhbHhodWIpOiBjb25zaWRlciBzdXBwb3J0aW5nIG11bHRpcGxlIGZpZWxkcyB3aXRoIHRoZSBzYW1lIHByb3BlcnR5IG5hbWUgZm9yIG91dHB1dHMuXG4gICAgICBjb25zdCBmaWVsZCA9IG91dHB1dHMuZ2V0QnlCaW5kaW5nUHJvcGVydHlOYW1lKG91dHB1dC5uYW1lKSFbMF0uY2xhc3NQcm9wZXJ0eU5hbWU7XG5cbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzKSB7XG4gICAgICAgIC8vIEZvciBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cywgZ2VuZXJhdGUgYSBjYWxsIHRvIHRoZSBgc3Vic2NyaWJlYCBtZXRob2RcbiAgICAgICAgLy8gb24gdGhlIGRpcmVjdGl2ZSdzIG91dHB1dCBmaWVsZCB0byBsZXQgdHlwZSBpbmZvcm1hdGlvbiBmbG93IGludG8gdGhlIGhhbmRsZXIgZnVuY3Rpb24nc1xuICAgICAgICAvLyBgJGV2ZW50YCBwYXJhbWV0ZXIuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0aGUgYEV2ZW50RW1pdHRlcjxUPmAgdHlwZSBmcm9tICdAYW5ndWxhci9jb3JlJyB0aGF0IGlzIHR5cGljYWxseSB1c2VkIGZvclxuICAgICAgICAvLyBvdXRwdXRzIGhhcyBhIHR5cGluZ3MgZGVmaWNpZW5jeSBpbiBpdHMgYHN1YnNjcmliZWAgbWV0aG9kLiBUaGUgZ2VuZXJpYyB0eXBlIGBUYCBpcyBub3RcbiAgICAgICAgLy8gY2FycmllZCBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uLCB3aGljaCBpcyB2aXRhbCBmb3IgaW5mZXJlbmNlIG9mIHRoZSB0eXBlIG9mIGAkZXZlbnRgLlxuICAgICAgICAvLyBBcyBhIHdvcmthcm91bmQsIHRoZSBkaXJlY3RpdmUncyBmaWVsZCBpcyBwYXNzZWQgaW50byBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IGhhcyBhXG4gICAgICAgIC8vIHNwZWNpYWxseSBjcmFmdGVkIHNldCBvZiBzaWduYXR1cmVzLCB0byBlZmZlY3RpdmVseSBjYXN0IGBFdmVudEVtaXR0ZXI8VD5gIHRvIHNvbWV0aGluZ1xuICAgICAgICAvLyB0aGF0IGhhcyBhIGBzdWJzY3JpYmVgIG1ldGhvZCB0aGF0IHByb3Blcmx5IGNhcnJpZXMgdGhlIGBUYCBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkluZmVyKTtcblxuICAgICAgICBpZiAoZGlySWQgPT09IG51bGwpIHtcbiAgICAgICAgICBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvdXRwdXRGaWVsZCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGQpKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0SGVscGVyID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUNhbGwodGhpcy50Y2IuZW52LmRlY2xhcmVPdXRwdXRIZWxwZXIoKSwgdW5kZWZpbmVkLCBbb3V0cHV0RmllbGRdKTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaWJlRm4gPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhvdXRwdXRIZWxwZXIsICdzdWJzY3JpYmUnKTtcbiAgICAgICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwoc3Vic2NyaWJlRm4sIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbaGFuZGxlcl0pO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGNhbGwsIG91dHB1dC5zb3VyY2VTcGFuKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjYWxsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cyBpcyBkaXNhYmxlZCwgZW1pdCBhIGhhbmRsZXIgZnVuY3Rpb24gd2hlcmUgdGhlXG4gICAgICAgIC8vIGAkZXZlbnRgIHBhcmFtZXRlciBoYXMgYW4gZXhwbGljaXQgYGFueWAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5BbnkpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH1cblxuICAgICAgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvci52aXNpdChcbiAgICAgICAgICBvdXRwdXQuaGFuZGxlciwgdGhpcy50Y2IuaWQsIHRoaXMudGNiLmJvdW5kVGFyZ2V0LCB0aGlzLnRjYi5vb2JSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogT3V0cHV0cyBhcmUgYSBgdHMuQ2FsbEV4cHJlc3Npb25gIHRoYXQgbG9vayBsaWtlIG9uZSBvZiB0aGUgdHdvOlxuICAgKiAgLSBgX291dHB1dEhlbHBlcihfdDFbXCJvdXRwdXRGaWVsZFwiXSkuc3Vic2NyaWJlKGhhbmRsZXIpO2BcbiAgICogIC0gYF90MS5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIpO2BcbiAgICogVGhpcyBtZXRob2QgcmV2ZXJzZXMgdGhlIG9wZXJhdGlvbnMgdG8gY3JlYXRlIGEgY2FsbCBleHByZXNzaW9uIGZvciBhIGRpcmVjdGl2ZSBvdXRwdXQuXG4gICAqIEl0IHVucGFja3MgdGhlIGdpdmVuIGNhbGwgZXhwcmVzc2lvbiBhbmQgcmV0dXJucyB0aGUgb3JpZ2luYWwgZWxlbWVudCBhY2Nlc3MgKGkuZS5cbiAgICogYF90MVtcIm91dHB1dEZpZWxkXCJdYCBpbiB0aGUgZXhhbXBsZSBhYm92ZSkuIFJldHVybnMgYG51bGxgIGlmIHRoZSBnaXZlbiBjYWxsIGV4cHJlc3Npb24gaXMgbm90XG4gICAqIHRoZSBleHBlY3RlZCBzdHJ1Y3R1cmUgb2YgYW4gb3V0cHV0IGJpbmRpbmdcbiAgICovXG4gIHN0YXRpYyBkZWNvZGVPdXRwdXRDYWxsRXhwcmVzc2lvbihub2RlOiB0cy5DYWxsRXhwcmVzc2lvbik6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufG51bGwge1xuICAgIC8vIGBub2RlLmV4cHJlc3Npb25gID09PSBgX291dHB1dEhlbHBlcihfdDFbXCJvdXRwdXRGaWVsZFwiXSkuc3Vic2NyaWJlYCBvciBgX3QxLmFkZEV2ZW50TGlzdGVuZXJgXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pIHx8XG4gICAgICAgIG5vZGUuZXhwcmVzc2lvbi5uYW1lLnRleHQgPT09ICdhZGRFdmVudExpc3RlbmVyJykge1xuICAgICAgLy8gYGFkZEV2ZW50TGlzdGVuZXJgIG91dHB1dHMgZG8gbm90IGhhdmUgYW4gYEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uYCBmb3IgdGhlIG91dHB1dCBmaWVsZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIGBub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbmAgPT09IGBfb3V0cHV0SGVscGVyKF90MVtcIm91dHB1dEZpZWxkXCJdKWBcbiAgICBpZiAobm9kZS5leHByZXNzaW9uLmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgW291dHB1dEZpZWxkQWNjZXNzXSA9IG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uLmFyZ3VtZW50cztcbiAgICBpZiAoIXRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dEZpZWxkQWNjZXNzO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIG91dHB1dHNcIiAtIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgd2hpY2hcbiAqIHdlcmUgbm90IGF0dHJpYnV0ZWQgdG8gYW55IGRpcmVjdGl2ZSBvciBjb21wb25lbnQsIGFuZCBhcmUgaW5zdGVhZCBwcm9jZXNzZWQgYWdhaW5zdCB0aGUgSFRNTFxuICogZWxlbWVudCBpdHNlbGYuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkT3V0cHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgY2xhaW1lZE91dHB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGxldCBlbElkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMuZWxlbWVudC5vdXRwdXRzKSB7XG4gICAgICBpZiAodGhpcy5jbGFpbWVkT3V0cHV0cy5oYXMob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBldmVudCBoYW5kbGVyIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG91dHB1dC50eXBlID09PSBQYXJzZWRFdmVudFR5cGUuQW5pbWF0aW9uKSB7XG4gICAgICAgIC8vIEFuaW1hdGlvbiBvdXRwdXQgYmluZGluZ3MgYWx3YXlzIGhhdmUgYW4gYCRldmVudGAgcGFyYW1ldGVyIG9mIHR5cGUgYEFuaW1hdGlvbkV2ZW50YC5cbiAgICAgICAgY29uc3QgZXZlbnRUeXBlID0gdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA/XG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9hbmltYXRpb25zJywgJ0FuaW1hdGlvbkV2ZW50JykgOlxuICAgICAgICAgICAgRXZlbnRQYXJhbVR5cGUuQW55O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgZXZlbnRUeXBlKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIERPTSBldmVudHMgaXMgZW5hYmxlZCwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBhZGRFdmVudExpc3RlbmVyYCBvblxuICAgICAgICAvLyB0aGUgZWxlbWVudCBpbnN0YW5jZSBzbyB0aGF0IFR5cGVTY3JpcHQncyB0eXBlIGluZmVyZW5jZSBmb3JcbiAgICAgICAgLy8gYEhUTUxFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXJgIHVzaW5nIGBIVE1MRWxlbWVudEV2ZW50TWFwYCB0byBpbmZlciBhbiBhY2N1cmF0ZSB0eXBlIGZvclxuICAgICAgICAvLyBgJGV2ZW50YCBkZXBlbmRpbmcgb24gdGhlIGV2ZW50IG5hbWUuIEZvciB1bmtub3duIGV2ZW50IG5hbWVzLCBUeXBlU2NyaXB0IHJlc29ydHMgdG8gdGhlXG4gICAgICAgIC8vIGJhc2UgYEV2ZW50YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkluZmVyKTtcblxuICAgICAgICBpZiAoZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICAgIGVsSWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZWxJZCwgJ2FkZEV2ZW50TGlzdGVuZXInKSxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogYXJndW1lbnRzICovW3RzLmNyZWF0ZVN0cmluZ0xpdGVyYWwob3V0cHV0Lm5hbWUpLCBoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gaW5wdXRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGUgYCRldmVudGBcbiAgICAgICAgLy8gcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuXG4gICAgICBFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yLnZpc2l0KFxuICAgICAgICAgIG91dHB1dC5oYW5kbGVyLCB0aGlzLnRjYi5pZCwgdGhpcy50Y2IuYm91bmRUYXJnZXQsIHRoaXMudGNiLm9vYlJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgYSBjb21wbGV0aW9uIHBvaW50IGZvciB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gKlxuICogVGhpcyBjb21wbGV0aW9uIHBvaW50IGxvb2tzIGxpa2UgYGN0eC4gO2AgaW4gdGhlIFRDQiBvdXRwdXQsIGFuZCBkb2VzIG5vdCBwcm9kdWNlIGRpYWdub3N0aWNzLlxuICogVHlwZVNjcmlwdCBhdXRvY29tcGxldGlvbiBBUElzIGNhbiBiZSB1c2VkIGF0IHRoaXMgY29tcGxldGlvbiBwb2ludCAoYWZ0ZXIgdGhlICcuJykgdG8gcHJvZHVjZVxuICogYXV0b2NvbXBsZXRpb24gcmVzdWx0cyBvZiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzIGZyb20gdGhlIHRlbXBsYXRlJ3MgY29tcG9uZW50IGNvbnRleHQuXG4gKi9cbmNsYXNzIFRjYkNvbXBvbmVudENvbnRleHRDb21wbGV0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2NvcGU6IFNjb3BlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gZmFsc2U7XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBjdHggPSB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICBjb25zdCBjdHhEb3QgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhjdHgsICcnKTtcbiAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3MoY3R4RG90KTtcbiAgICBhZGRFeHByZXNzaW9uSWRlbnRpZmllcihjdHhEb3QsIEV4cHJlc3Npb25JZGVudGlmaWVyLkNPTVBPTkVOVF9DT01QTEVUSU9OKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGN0eERvdCkpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVmFsdWUgdXNlZCB0byBicmVhayBhIGNpcmN1bGFyIHJlZmVyZW5jZSBiZXR3ZWVuIGBUY2JPcGBzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgcmV0dXJuZWQgd2hlbmV2ZXIgYFRjYk9wYHMgaGF2ZSBhIGNpcmN1bGFyIGRlcGVuZGVuY3kuIFRoZSBleHByZXNzaW9uIGlzIGEgbm9uLW51bGxcbiAqIGFzc2VydGlvbiBvZiB0aGUgbnVsbCB2YWx1ZSAoaW4gVHlwZVNjcmlwdCwgdGhlIGV4cHJlc3Npb24gYG51bGwhYCkuIFRoaXMgY29uc3RydWN0aW9uIHdpbGwgaW5mZXJcbiAqIHRoZSBsZWFzdCBuYXJyb3cgdHlwZSBmb3Igd2hhdGV2ZXIgaXQncyBhc3NpZ25lZCB0by5cbiAqL1xuY29uc3QgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUiA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSk7XG5cbi8qKlxuICogT3ZlcmFsbCBnZW5lcmF0aW9uIGNvbnRleHQgZm9yIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICpcbiAqIGBDb250ZXh0YCBoYW5kbGVzIG9wZXJhdGlvbnMgZHVyaW5nIGNvZGUgZ2VuZXJhdGlvbiB3aGljaCBhcmUgZ2xvYmFsIHdpdGggcmVzcGVjdCB0byB0aGUgd2hvbGVcbiAqIGJsb2NrLiBJdCdzIHJlc3BvbnNpYmxlIGZvciB2YXJpYWJsZSBuYW1lIGFsbG9jYXRpb24gYW5kIG1hbmFnZW1lbnQgb2YgYW55IGltcG9ydHMgbmVlZGVkLiBJdFxuICogYWxzbyBjb250YWlucyB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaXRzZWxmLlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIHByaXZhdGUgbmV4dElkID0gMTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudjogRW52aXJvbm1lbnQsIHJlYWRvbmx5IGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgICByZWFkb25seSBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCByZWFkb25seSBpZDogVGVtcGxhdGVJZCxcbiAgICAgIHJlYWRvbmx5IGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwcml2YXRlIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgcmVhZG9ubHkgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSkge31cblxuICAvKipcbiAgICogQWxsb2NhdGUgYSBuZXcgdmFyaWFibGUgbmFtZSBmb3IgdXNlIHdpdGhpbiB0aGUgYENvbnRleHRgLlxuICAgKlxuICAgKiBDdXJyZW50bHkgdGhpcyB1c2VzIGEgbW9ub3RvbmljYWxseSBpbmNyZWFzaW5nIGNvdW50ZXIsIGJ1dCBpbiB0aGUgZnV0dXJlIHRoZSB2YXJpYWJsZSBuYW1lXG4gICAqIG1pZ2h0IGNoYW5nZSBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgZGF0YSBiZWluZyBzdG9yZWQuXG4gICAqL1xuICBhbGxvY2F0ZUlkKCk6IHRzLklkZW50aWZpZXIge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdCR7dGhpcy5uZXh0SWQrK31gKTtcbiAgfVxuXG4gIGdldFBpcGVCeU5hbWUobmFtZTogc3RyaW5nKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIXRoaXMucGlwZXMuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZW52LnBpcGVJbnN0KHRoaXMucGlwZXMuZ2V0KG5hbWUpISk7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2NhbCBzY29wZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2sgZm9yIGEgcGFydGljdWxhciB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGUgdG9wLWxldmVsIHRlbXBsYXRlIGFuZCBlYWNoIG5lc3RlZCBgPG5nLXRlbXBsYXRlPmAgaGF2ZSB0aGVpciBvd24gYFNjb3BlYCwgd2hpY2ggZXhpc3QgaW4gYVxuICogaGllcmFyY2h5LiBUaGUgc3RydWN0dXJlIG9mIHRoaXMgaGllcmFyY2h5IG1pcnJvcnMgdGhlIHN5bnRhY3RpYyBzY29wZXMgaW4gdGhlIGdlbmVyYXRlZCB0eXBlXG4gKiBjaGVjayBibG9jaywgd2hlcmUgZWFjaCBuZXN0ZWQgdGVtcGxhdGUgaXMgZW5jYXNlZCBpbiBhbiBgaWZgIHN0cnVjdHVyZS5cbiAqXG4gKiBBcyBhIHRlbXBsYXRlJ3MgYFRjYk9wYHMgYXJlIGV4ZWN1dGVkIGluIGEgZ2l2ZW4gYFNjb3BlYCwgc3RhdGVtZW50cyBhcmUgYWRkZWQgdmlhXG4gKiBgYWRkU3RhdGVtZW50KClgLiBXaGVuIHRoaXMgcHJvY2Vzc2luZyBpcyBjb21wbGV0ZSwgdGhlIGBTY29wZWAgY2FuIGJlIHR1cm5lZCBpbnRvIGEgYHRzLkJsb2NrYFxuICogdmlhIGByZW5kZXJUb0Jsb2NrKClgLlxuICpcbiAqIElmIGEgYFRjYk9wYCByZXF1aXJlcyB0aGUgb3V0cHV0IG9mIGFub3RoZXIsIGl0IGNhbiBjYWxsIGByZXNvbHZlKClgLlxuICovXG5jbGFzcyBTY29wZSB7XG4gIC8qKlxuICAgKiBBIHF1ZXVlIG9mIG9wZXJhdGlvbnMgd2hpY2ggbmVlZCB0byBiZSBwZXJmb3JtZWQgdG8gZ2VuZXJhdGUgdGhlIFRDQiBjb2RlIGZvciB0aGlzIHNjb3BlLlxuICAgKlxuICAgKiBUaGlzIGFycmF5IGNhbiBjb250YWluIGVpdGhlciBhIGBUY2JPcGAgd2hpY2ggaGFzIHlldCB0byBiZSBleGVjdXRlZCwgb3IgYSBgdHMuRXhwcmVzc2lvbnxudWxsYFxuICAgKiByZXByZXNlbnRpbmcgdGhlIG1lbW9pemVkIHJlc3VsdCBvZiBleGVjdXRpbmcgdGhlIG9wZXJhdGlvbi4gQXMgb3BlcmF0aW9ucyBhcmUgZXhlY3V0ZWQsIHRoZWlyXG4gICAqIHJlc3VsdHMgYXJlIHdyaXR0ZW4gaW50byB0aGUgYG9wUXVldWVgLCBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBJZiBhbiBvcGVyYXRpb24gaXMgaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgZXhlY3V0ZWQsIGl0IGlzIHRlbXBvcmFyaWx5IG92ZXJ3cml0dGVuIGhlcmUgd2l0aFxuICAgKiBgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUmAuIFRoaXMgd2F5LCBpZiBhIGN5Y2xlIGlzIGVuY291bnRlcmVkIHdoZXJlIGFuIG9wZXJhdGlvblxuICAgKiBkZXBlbmRzIHRyYW5zaXRpdmVseSBvbiBpdHMgb3duIHJlc3VsdCwgdGhlIGlubmVyIG9wZXJhdGlvbiB3aWxsIGluZmVyIHRoZSBsZWFzdCBuYXJyb3cgdHlwZVxuICAgKiB0aGF0IGZpdHMgaW5zdGVhZC4gVGhpcyBoYXMgdGhlIHNhbWUgc2VtYW50aWNzIGFzIFR5cGVTY3JpcHQgaXRzZWxmIHdoZW4gdHlwZXMgYXJlIHJlZmVyZW5jZWRcbiAgICogY2lyY3VsYXJseS5cbiAgICovXG4gIHByaXZhdGUgb3BRdWV1ZTogKFRjYk9wfHRzLkV4cHJlc3Npb258bnVsbClbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBgVG1wbEFzdEVsZW1lbnRgcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYkVsZW1lbnRPcGAgaW4gdGhlIGBvcFF1ZXVlYFxuICAgKi9cbiAgcHJpdmF0ZSBlbGVtZW50T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RFbGVtZW50LCBudW1iZXI+KCk7XG4gIC8qKlxuICAgKiBBIG1hcCBvZiBtYXBzIHdoaWNoIHRyYWNrcyB0aGUgaW5kZXggb2YgYFRjYkRpcmVjdGl2ZUN0b3JPcGBzIGluIHRoZSBgb3BRdWV1ZWAgZm9yIGVhY2hcbiAgICogZGlyZWN0aXZlIG9uIGEgYFRtcGxBc3RFbGVtZW50YCBvciBgVG1wbEFzdFRlbXBsYXRlYCBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSBkaXJlY3RpdmVPcE1hcCA9XG4gICAgICBuZXcgTWFwPFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBudW1iZXI+PigpO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBgVG1wbEFzdFJlZmVyZW5jZWBzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiUmVmZXJlbmNlT3BgIGluIHRoZSBgb3BRdWV1ZWBcbiAgICovXG4gIHByaXZhdGUgcmVmZXJlbmNlT3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RSZWZlcmVuY2UsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGltbWVkaWF0ZWx5IG5lc3RlZCA8bmctdGVtcGxhdGU+cyAod2l0aGluIHRoaXMgYFNjb3BlYCkgcmVwcmVzZW50ZWQgYnkgYFRtcGxBc3RUZW1wbGF0ZWBcbiAgICogbm9kZXMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlQ3R4T3BNYXAgPSBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgdmFyaWFibGVzIGRlY2xhcmVkIG9uIHRoZSB0ZW1wbGF0ZSB0aGF0IGNyZWF0ZWQgdGhpcyBgU2NvcGVgIChyZXByZXNlbnRlZCBieVxuICAgKiBgVG1wbEFzdFZhcmlhYmxlYCBub2RlcykgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JWYXJpYWJsZU9wYHMgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICovXG4gIHByaXZhdGUgdmFyTWFwID0gbmV3IE1hcDxUbXBsQXN0VmFyaWFibGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICpcbiAgICogRXhlY3V0aW5nIHRoZSBgVGNiT3BgcyBpbiB0aGUgYG9wUXVldWVgIHBvcHVsYXRlcyB0aGlzIGFycmF5LlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBwYXJlbnQ6IFNjb3BlfG51bGwgPSBudWxsLFxuICAgICAgcHJpdmF0ZSBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIGBTY29wZWAgZ2l2ZW4gZWl0aGVyIGEgYFRtcGxBc3RUZW1wbGF0ZWAgb3IgYSBsaXN0IG9mIGBUbXBsQXN0Tm9kZWBzLlxuICAgKlxuICAgKiBAcGFyYW0gdGNiIHRoZSBvdmVyYWxsIGNvbnRleHQgb2YgVENCIGdlbmVyYXRpb24uXG4gICAqIEBwYXJhbSBwYXJlbnQgdGhlIGBTY29wZWAgb2YgdGhlIHBhcmVudCB0ZW1wbGF0ZSAoaWYgYW55KSBvciBgbnVsbGAgaWYgdGhpcyBpcyB0aGUgcm9vdFxuICAgKiBgU2NvcGVgLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVPck5vZGVzIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIHJlcHJlc2VudGluZyB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIHRvXG4gICAqIGNhbGN1bGF0ZSB0aGUgYFNjb3BlYCwgb3IgYSBsaXN0IG9mIG5vZGVzIGlmIG5vIG91dGVyIHRlbXBsYXRlIG9iamVjdCBpcyBhdmFpbGFibGUuXG4gICAqIEBwYXJhbSBndWFyZCBhbiBleHByZXNzaW9uIHRoYXQgaXMgYXBwbGllZCB0byB0aGlzIHNjb3BlIGZvciB0eXBlIG5hcnJvd2luZyBwdXJwb3Nlcy5cbiAgICovXG4gIHN0YXRpYyBmb3JOb2RlcyhcbiAgICAgIHRjYjogQ29udGV4dCwgcGFyZW50OiBTY29wZXxudWxsLCB0ZW1wbGF0ZU9yTm9kZXM6IFRtcGxBc3RUZW1wbGF0ZXwoVG1wbEFzdE5vZGVbXSksXG4gICAgICBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsKTogU2NvcGUge1xuICAgIGNvbnN0IHNjb3BlID0gbmV3IFNjb3BlKHRjYiwgcGFyZW50LCBndWFyZCk7XG5cbiAgICBpZiAocGFyZW50ID09PSBudWxsICYmIHRjYi5lbnYuY29uZmlnLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIpIHtcbiAgICAgIC8vIEFkZCBhbiBhdXRvY29tcGxldGlvbiBwb2ludCBmb3IgdGhlIGNvbXBvbmVudCBjb250ZXh0LlxuICAgICAgc2NvcGUub3BRdWV1ZS5wdXNoKG5ldyBUY2JDb21wb25lbnRDb250ZXh0Q29tcGxldGlvbk9wKHNjb3BlKSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuOiBUbXBsQXN0Tm9kZVtdO1xuXG4gICAgLy8gSWYgZ2l2ZW4gYW4gYWN0dWFsIGBUbXBsQXN0VGVtcGxhdGVgIGluc3RhbmNlLCB0aGVuIHByb2Nlc3MgYW55IGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gaXRcbiAgICAvLyBoYXMuXG4gICAgaWYgKHRlbXBsYXRlT3JOb2RlcyBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlJ3MgdmFyaWFibGUgZGVjbGFyYXRpb25zIG5lZWQgdG8gYmUgYWRkZWQgYXMgYFRjYlZhcmlhYmxlT3Bgcy5cbiAgICAgIGNvbnN0IHZhck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUbXBsQXN0VmFyaWFibGU+KCk7XG5cbiAgICAgIGZvciAoY29uc3QgdiBvZiB0ZW1wbGF0ZU9yTm9kZXMudmFyaWFibGVzKSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgdmFyaWFibGVzIG9uIHRoZSBgVG1wbEFzdFRlbXBsYXRlYCBhcmUgb25seSBkZWNsYXJlZCBvbmNlLlxuICAgICAgICBpZiAoIXZhck1hcC5oYXModi5uYW1lKSkge1xuICAgICAgICAgIHZhck1hcC5zZXQodi5uYW1lLCB2KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBmaXJzdERlY2wgPSB2YXJNYXAuZ2V0KHYubmFtZSkhO1xuICAgICAgICAgIHRjYi5vb2JSZWNvcmRlci5kdXBsaWNhdGVUZW1wbGF0ZVZhcih0Y2IuaWQsIHYsIGZpcnN0RGVjbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcEluZGV4ID0gc2NvcGUub3BRdWV1ZS5wdXNoKG5ldyBUY2JWYXJpYWJsZU9wKHRjYiwgc2NvcGUsIHRlbXBsYXRlT3JOb2RlcywgdikpIC0gMTtcbiAgICAgICAgc2NvcGUudmFyTWFwLnNldCh2LCBvcEluZGV4KTtcbiAgICAgIH1cbiAgICAgIGNoaWxkcmVuID0gdGVtcGxhdGVPck5vZGVzLmNoaWxkcmVuO1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2RlcztcbiAgICB9XG4gICAgZm9yIChjb25zdCBub2RlIG9mIGNoaWxkcmVuKSB7XG4gICAgICBzY29wZS5hcHBlbmROb2RlKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogTG9vayB1cCBhIGB0cy5FeHByZXNzaW9uYCByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHNvbWUgb3BlcmF0aW9uIGluIHRoZSBjdXJyZW50IGBTY29wZWAsXG4gICAqIGluY2x1ZGluZyBhbnkgcGFyZW50IHNjb3BlKHMpLiBUaGlzIG1ldGhvZCBhbHdheXMgcmV0dXJucyBhIG11dGFibGUgY2xvbmUgb2YgdGhlXG4gICAqIGB0cy5FeHByZXNzaW9uYCB3aXRoIHRoZSBjb21tZW50cyBjbGVhcmVkLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBhIGBUbXBsQXN0Tm9kZWAgb2YgdGhlIG9wZXJhdGlvbiBpbiBxdWVzdGlvbi4gVGhlIGxvb2t1cCBwZXJmb3JtZWQgd2lsbCBkZXBlbmQgb25cbiAgICogdGhlIHR5cGUgb2YgdGhpcyBub2RlOlxuICAgKlxuICAgKiBBc3N1bWluZyBgZGlyZWN0aXZlYCBpcyBub3QgcHJlc2VudCwgdGhlbiBgcmVzb2x2ZWAgd2lsbCByZXR1cm46XG4gICAqXG4gICAqICogYFRtcGxBc3RFbGVtZW50YCAtIHJldHJpZXZlIHRoZSBleHByZXNzaW9uIGZvciB0aGUgZWxlbWVudCBET00gbm9kZVxuICAgKiAqIGBUbXBsQXN0VGVtcGxhdGVgIC0gcmV0cmlldmUgdGhlIHRlbXBsYXRlIGNvbnRleHQgdmFyaWFibGVcbiAgICogKiBgVG1wbEFzdFZhcmlhYmxlYCAtIHJldHJpZXZlIGEgdGVtcGxhdGUgbGV0LSB2YXJpYWJsZVxuICAgKiAqIGBUbXBsQXN0UmVmZXJlbmNlYCAtIHJldHJpZXZlIHZhcmlhYmxlIGNyZWF0ZWQgZm9yIHRoZSBsb2NhbCByZWZcbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBpZiBwcmVzZW50LCBhIGRpcmVjdGl2ZSB0eXBlIG9uIGEgYFRtcGxBc3RFbGVtZW50YCBvciBgVG1wbEFzdFRlbXBsYXRlYCB0b1xuICAgKiBsb29rIHVwIGluc3RlYWQgb2YgdGhlIGRlZmF1bHQgZm9yIGFuIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZS5cbiAgICovXG4gIHJlc29sdmUoXG4gICAgICBub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlfFRtcGxBc3RSZWZlcmVuY2UsXG4gICAgICBkaXJlY3RpdmU/OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgb3BlcmF0aW9uIGxvY2FsbHkuXG4gICAgY29uc3QgcmVzID0gdGhpcy5yZXNvbHZlTG9jYWwobm9kZSwgZGlyZWN0aXZlKTtcbiAgICBpZiAocmVzICE9PSBudWxsKSB7XG4gICAgICAvLyBXZSB3YW50IHRvIGdldCBhIGNsb25lIG9mIHRoZSByZXNvbHZlZCBleHByZXNzaW9uIGFuZCBjbGVhciB0aGUgdHJhaWxpbmcgY29tbWVudHNcbiAgICAgIC8vIHNvIHRoZXkgZG9uJ3QgY29udGludWUgdG8gYXBwZWFyIGluIGV2ZXJ5IHBsYWNlIHRoZSBleHByZXNzaW9uIGlzIHVzZWQuXG4gICAgICAvLyBBcyBhbiBleGFtcGxlLCB0aGlzIHdvdWxkIG90aGVyd2lzZSBwcm9kdWNlOlxuICAgICAgLy8gdmFyIF90MSAvKipUOkRJUiovIC8qMSwyKi8gPSBfY3RvcjEoKTtcbiAgICAgIC8vIF90MSAvKipUOkRJUiovIC8qMSwyKi8uaW5wdXQgPSAndmFsdWUnO1xuICAgICAgLy9cbiAgICAgIC8vIEluIGFkZGl0aW9uLCByZXR1cm5pbmcgYSBjbG9uZSBwcmV2ZW50cyB0aGUgY29uc3VtZXIgb2YgYFNjb3BlI3Jlc29sdmVgIGZyb21cbiAgICAgIC8vIGF0dGFjaGluZyBjb21tZW50cyBhdCB0aGUgZGVjbGFyYXRpb24gc2l0ZS5cblxuICAgICAgY29uc3QgY2xvbmUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUocmVzKTtcbiAgICAgIHRzLnNldFN5bnRoZXRpY1RyYWlsaW5nQ29tbWVudHMoY2xvbmUsIFtdKTtcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBDaGVjayB3aXRoIHRoZSBwYXJlbnQuXG4gICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZShub2RlLCBkaXJlY3RpdmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlICR7bm9kZX0gLyAke2RpcmVjdGl2ZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgc3RhdGVtZW50IHRvIHRoaXMgc2NvcGUuXG4gICAqL1xuICBhZGRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgdGhpcy5zdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzdGF0ZW1lbnRzLlxuICAgKi9cbiAgcmVuZGVyKCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub3BRdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gT3B0aW9uYWwgc3RhdGVtZW50cyBjYW5ub3QgYmUgc2tpcHBlZCB3aGVuIHdlIGFyZSBnZW5lcmF0aW5nIHRoZSBUQ0IgZm9yIHVzZVxuICAgICAgLy8gYnkgdGhlIFRlbXBsYXRlVHlwZUNoZWNrZXIuXG4gICAgICBjb25zdCBza2lwT3B0aW9uYWwgPSAhdGhpcy50Y2IuZW52LmNvbmZpZy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyO1xuICAgICAgdGhpcy5leGVjdXRlT3AoaSwgc2tpcE9wdGlvbmFsKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVtZW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGV4cHJlc3Npb24gb2YgYWxsIHRlbXBsYXRlIGd1YXJkcyB0aGF0IGFwcGx5IHRvIHRoaXMgc2NvcGUsIGluY2x1ZGluZyB0aG9zZSBvZlxuICAgKiBwYXJlbnQgc2NvcGVzLiBJZiBubyBndWFyZHMgaGF2ZSBiZWVuIGFwcGxpZWQsIG51bGwgaXMgcmV0dXJuZWQuXG4gICAqL1xuICBndWFyZHMoKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBsZXQgcGFyZW50R3VhcmRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLnBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gU3RhcnQgd2l0aCB0aGUgZ3VhcmRzIGZyb20gdGhlIHBhcmVudCBzY29wZSwgaWYgcHJlc2VudC5cbiAgICAgIHBhcmVudEd1YXJkcyA9IHRoaXMucGFyZW50Lmd1YXJkcygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmd1YXJkID09PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIHNjb3BlIGRvZXMgbm90IGhhdmUgYSBndWFyZCwgc28gcmV0dXJuIHRoZSBwYXJlbnQncyBndWFyZHMgYXMgaXMuXG4gICAgICByZXR1cm4gcGFyZW50R3VhcmRzO1xuICAgIH0gZWxzZSBpZiAocGFyZW50R3VhcmRzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSdzIG5vIGd1YXJkcyBmcm9tIHRoZSBwYXJlbnQgc2NvcGUsIHNvIHRoaXMgc2NvcGUncyBndWFyZCByZXByZXNlbnRzIGFsbCBhdmFpbGFibGVcbiAgICAgIC8vIGd1YXJkcy5cbiAgICAgIHJldHVybiB0aGlzLmd1YXJkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBCb3RoIHRoZSBwYXJlbnQgc2NvcGUgYW5kIHRoaXMgc2NvcGUgcHJvdmlkZSBhIGd1YXJkLCBzbyBjcmVhdGUgYSBjb21iaW5hdGlvbiBvZiB0aGUgdHdvLlxuICAgICAgLy8gSXQgaXMgaW1wb3J0YW50IHRoYXQgdGhlIHBhcmVudCBndWFyZCBpcyB1c2VkIGFzIGxlZnQgb3BlcmFuZCwgZ2l2ZW4gdGhhdCBpdCBtYXkgcHJvdmlkZVxuICAgICAgLy8gbmFycm93aW5nIHRoYXQgaXMgcmVxdWlyZWQgZm9yIHRoaXMgc2NvcGUncyBndWFyZCB0byBiZSB2YWxpZC5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVCaW5hcnkocGFyZW50R3VhcmRzLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCB0aGlzLmd1YXJkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVMb2NhbChcbiAgICAgIHJlZjogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZXxUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlICYmIHRoaXMucmVmZXJlbmNlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnJlZmVyZW5jZU9wTWFwLmdldChyZWYpISk7XG4gICAgfSBlbHNlIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUgJiYgdGhpcy52YXJNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBgVGNiVmFyaWFibGVPcGAgYXNzb2NpYXRlZCB3aXRoIHRoZSBgVG1wbEFzdFZhcmlhYmxlYC5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnZhck1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSAmJiBkaXJlY3RpdmUgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyB0aGUgY29udGV4dCBvZiB0aGUgZ2l2ZW4gc3ViLXRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlRlbXBsYXRlQ29udGV4dE9wYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudGVtcGxhdGVDdHhPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpICYmXG4gICAgICAgIGRpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuZGlyZWN0aXZlT3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyBhIGRpcmVjdGl2ZSBvbiBhbiBlbGVtZW50IG9yIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIGNvbnN0IGRpck1hcCA9IHRoaXMuZGlyZWN0aXZlT3BNYXAuZ2V0KHJlZikhO1xuICAgICAgaWYgKGRpck1hcC5oYXMoZGlyZWN0aXZlKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AoZGlyTWFwLmdldChkaXJlY3RpdmUpISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmIHRoaXMuZWxlbWVudE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIERPTSBub2RlIG9mIGFuIGVsZW1lbnQgaW4gdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLmVsZW1lbnRPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTGlrZSBgZXhlY3V0ZU9wYCwgYnV0IGFzc2VydCB0aGF0IHRoZSBvcGVyYXRpb24gYWN0dWFsbHkgcmV0dXJuZWQgYHRzLkV4cHJlc3Npb25gLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlT3Aob3BJbmRleDogbnVtYmVyKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVzID0gdGhpcy5leGVjdXRlT3Aob3BJbmRleCwgLyogc2tpcE9wdGlvbmFsICovIGZhbHNlKTtcbiAgICBpZiAocmVzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIHJlc29sdmluZyBvcGVyYXRpb24sIGdvdCBudWxsYCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIHBhcnRpY3VsYXIgYFRjYk9wYCBpbiB0aGUgYG9wUXVldWVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCByZXBsYWNlcyB0aGUgb3BlcmF0aW9uIGluIHRoZSBgb3BRdWV1ZWAgd2l0aCB0aGUgcmVzdWx0IG9mIGV4ZWN1dGlvbiAob25jZSBkb25lKVxuICAgKiBhbmQgYWxzbyBwcm90ZWN0cyBhZ2FpbnN0IGEgY2lyY3VsYXIgZGVwZW5kZW5jeSBmcm9tIHRoZSBvcGVyYXRpb24gdG8gaXRzZWxmIGJ5IHRlbXBvcmFyaWx5XG4gICAqIHNldHRpbmcgdGhlIG9wZXJhdGlvbidzIHJlc3VsdCB0byBhIHNwZWNpYWwgZXhwcmVzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgZXhlY3V0ZU9wKG9wSW5kZXg6IG51bWJlciwgc2tpcE9wdGlvbmFsOiBib29sZWFuKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBvcCA9IHRoaXMub3BRdWV1ZVtvcEluZGV4XTtcbiAgICBpZiAoIShvcCBpbnN0YW5jZW9mIFRjYk9wKSkge1xuICAgICAgcmV0dXJuIG9wO1xuICAgIH1cblxuICAgIGlmIChza2lwT3B0aW9uYWwgJiYgb3Aub3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFNldCB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24gaW4gdGhlIHF1ZXVlIHRvIGl0cyBjaXJjdWxhciBmYWxsYmFjay4gSWYgZXhlY3V0aW5nIHRoaXNcbiAgICAvLyBvcGVyYXRpb24gcmVzdWx0cyBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3ksIHRoaXMgd2lsbCBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AgYW5kIGFsbG93IGZvclxuICAgIC8vIHRoZSByZXNvbHV0aW9uIG9mIHN1Y2ggY3ljbGVzLlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IG9wLmNpcmN1bGFyRmFsbGJhY2soKTtcbiAgICBjb25zdCByZXMgPSBvcC5leGVjdXRlKCk7XG4gICAgLy8gT25jZSB0aGUgb3BlcmF0aW9uIGhhcyBmaW5pc2hlZCBleGVjdXRpbmcsIGl0J3Mgc2FmZSB0byBjYWNoZSB0aGUgcmVhbCByZXN1bHQuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gcmVzO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE5vZGUobm9kZTogVG1wbEFzdE5vZGUpOiB2b2lkIHtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBjb25zdCBvcEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkVsZW1lbnRPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpIC0gMTtcbiAgICAgIHRoaXMuZWxlbWVudE9wTWFwLnNldChub2RlLCBvcEluZGV4KTtcbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICB0aGlzLmFwcGVuZE5vZGUoY2hpbGQpO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUZW1wbGF0ZSBjaGlsZHJlbiBhcmUgcmVuZGVyZWQgaW4gYSBjaGlsZCBzY29wZS5cbiAgICAgIHRoaXMuYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlKTtcbiAgICAgIHRoaXMuYXBwZW5kT3V0cHV0c09mTm9kZShub2RlKTtcbiAgICAgIGNvbnN0IGN0eEluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQ29udGV4dE9wKHRoaXMudGNiLCB0aGlzKSkgLSAxO1xuICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLnNldChub2RlLCBjdHhJbmRleCk7XG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1RlbXBsYXRlQm9kaWVzKSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUJvZHlPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmFsd2F5c0NoZWNrU2NoZW1hSW5UZW1wbGF0ZUJvZGllcykge1xuICAgICAgICB0aGlzLmFwcGVuZERlZXBTY2hlbWFDaGVja3Mobm9kZS5jaGlsZHJlbik7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrQW5kQXBwZW5kUmVmZXJlbmNlc09mTm9kZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgbm9kZSkpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RJY3UpIHtcbiAgICAgIHRoaXMuYXBwZW5kSWN1RXhwcmVzc2lvbnMobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByZWYgb2Ygbm9kZS5yZWZlcmVuY2VzKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXRSZWZlcmVuY2VUYXJnZXQocmVmKTtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1JlZmVyZW5jZVRhcmdldCh0aGlzLnRjYi5pZCwgcmVmKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBjdHhJbmRleDogbnVtYmVyO1xuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JSZWZlcmVuY2VPcCh0aGlzLnRjYiwgdGhpcywgcmVmLCBub2RlLCB0YXJnZXQpKSAtIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHhJbmRleCA9XG4gICAgICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMsIHJlZiwgbm9kZSwgdGFyZ2V0LmRpcmVjdGl2ZSkpIC0gMTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVmZXJlbmNlT3BNYXAuc2V0KHJlZiwgY3R4SW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgaW5wdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIGlucHV0cyBhcmUgdW5jbGFpbWVkIGlucHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChcbiAgICAgICAgICAgIG5ldyBUY2JEb21TY2hlbWFDaGVja2VyT3AodGhpcy50Y2IsIG5vZGUsIC8qIGNoZWNrRWxlbWVudCAqLyB0cnVlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlyTWFwID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZU9wID0gZGlyLmlzR2VuZXJpYyA/IG5ldyBUY2JEaXJlY3RpdmVDdG9yT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFRjYkRpcmVjdGl2ZVR5cGVPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIGNvbnN0IGRpckluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2goZGlyZWN0aXZlT3ApIC0gMTtcbiAgICAgIGRpck1hcC5zZXQoZGlyLCBkaXJJbmRleCk7XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuICAgIHRoaXMuZGlyZWN0aXZlT3BNYXAuc2V0KG5vZGUsIGRpck1hcCk7XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBpbnB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVtb3ZlIGFueSBpbnB1dHMgdGhhdCBpdCBjbGFpbXMgZnJvbSBgZWxlbWVudElucHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIG9mIGRpci5pbnB1dHMucHJvcGVydHlOYW1lcykge1xuICAgICAgICAgIGNsYWltZWRJbnB1dHMuYWRkKHByb3BlcnR5TmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZElucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcyB3aGljaCBtYXRjaCB0aGlzIGVsZW1lbnQsIHRoZW4gaXQncyBhIFwicGxhaW5cIiBET00gZWxlbWVudCAob3IgYVxuICAgICAgLy8gd2ViIGNvbXBvbmVudCksIGFuZCBzaG91bGQgYmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLiBJZiBhbnkgZGlyZWN0aXZlcyBtYXRjaCxcbiAgICAgIC8vIHdlIG11c3QgYXNzdW1lIHRoYXQgdGhlIGVsZW1lbnQgY291bGQgYmUgY3VzdG9tIChlaXRoZXIgYSBjb21wb25lbnQsIG9yIGEgZGlyZWN0aXZlIGxpa2VcbiAgICAgIC8vIDxyb3V0ZXItb3V0bGV0PikgYW5kIHNob3VsZG4ndCB2YWxpZGF0ZSB0aGUgZWxlbWVudCBuYW1lIGl0c2VsZi5cbiAgICAgIGNvbnN0IGNoZWNrRWxlbWVudCA9IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwO1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgY2hlY2tFbGVtZW50LCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBvdXRwdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRPdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwgfHwgZGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzLCB0aGVuIGFsbCBvdXRwdXRzIGFyZSB1bmNsYWltZWQgb3V0cHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUXVldWUgb3BlcmF0aW9ucyBmb3IgYWxsIGRpcmVjdGl2ZXMgdG8gY2hlY2sgdGhlIHJlbGV2YW50IG91dHB1dHMgZm9yIGEgZGlyZWN0aXZlLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikpO1xuICAgIH1cblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIG91dHB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVnaXN0ZXIgYW55IG91dHB1dHMgdGhhdCBpdCBjbGFpbXMgaW4gYGNsYWltZWRPdXRwdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBvdXRwdXRQcm9wZXJ0eSBvZiBkaXIub3V0cHV0cy5wcm9wZXJ0eU5hbWVzKSB7XG4gICAgICAgICAgY2xhaW1lZE91dHB1dHMuYWRkKG91dHB1dFByb3BlcnR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkT3V0cHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkT3V0cHV0cykpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGVlcFNjaGVtYUNoZWNrcyhub2RlczogVG1wbEFzdE5vZGVbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgICAgIGxldCBoYXNEaXJlY3RpdmVzOiBib29sZWFuO1xuICAgICAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGhhc0RpcmVjdGl2ZXMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBvZiBkaXIuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQocHJvcGVydHlOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgIWhhc0RpcmVjdGl2ZXMsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kSWN1RXhwcmVzc2lvbnMobm9kZTogVG1wbEFzdEljdSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgT2JqZWN0LnZhbHVlcyhub2RlLnZhcnMpKSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgdmFyaWFibGUpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwbGFjZWhvbGRlciBvZiBPYmplY3QudmFsdWVzKG5vZGUucGxhY2Vob2xkZXJzKSkge1xuICAgICAgaWYgKHBsYWNlaG9sZGVyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgcGxhY2Vob2xkZXIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRjYkJvdW5kSW5wdXQge1xuICBhdHRyaWJ1dGU6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZTtcbiAgZmllbGROYW1lczogQ2xhc3NQcm9wZXJ0eU5hbWVbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGBjdHhgIHBhcmFtZXRlciB0byB0aGUgdG9wLWxldmVsIFRDQiBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgcGFyYW1ldGVyIHdpdGggYSB0eXBlIGVxdWl2YWxlbnQgdG8gdGhlIGNvbXBvbmVudCB0eXBlLCB3aXRoIGFsbCBnZW5lcmljIHR5cGVcbiAqIHBhcmFtZXRlcnMgbGlzdGVkICh3aXRob3V0IHRoZWlyIGdlbmVyaWMgYm91bmRzKS5cbiAqL1xuZnVuY3Rpb24gdGNiQ3R4UGFyYW0oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbmFtZTogdHMuRW50aXR5TmFtZSxcbiAgICB1c2VHZW5lcmljVHlwZTogYm9vbGVhbik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uIHtcbiAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLlR5cGVOb2RlW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvLyBDaGVjayBpZiB0aGUgY29tcG9uZW50IGlzIGdlbmVyaWMsIGFuZCBwYXNzIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGlmIHNvLlxuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHVzZUdlbmVyaWNUeXBlKSB7XG4gICAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAoKCkgPT4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH1cbiAgfVxuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovICdjdHgnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gYEFTVGAgZXhwcmVzc2lvbiBhbmQgY29udmVydCBpdCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLCBnZW5lcmF0aW5nIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBjb3JyZWN0IGlkZW50aWZpZXJzIGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICovXG5mdW5jdGlvbiB0Y2JFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdGNiOiBDb250ZXh0LCBwcm90ZWN0ZWQgc2NvcGU6IFNjb3BlKSB7fVxuXG4gIHRyYW5zbGF0ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkXG4gICAgLy8gd2hpY2ggaW50ZXJwcmV0cyBzcGVjaWZpYyBleHByZXNzaW9uIG5vZGVzIHRoYXQgaW50ZXJhY3Qgd2l0aCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgLiBUaGVzZVxuICAgIC8vIG5vZGVzIGFjdHVhbGx5IHJlZmVyIHRvIGlkZW50aWZpZXJzIHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KGFzdCwgYXN0ID0+IHRoaXMucmVzb2x2ZShhc3QpLCB0aGlzLnRjYi5lbnYuY29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFuIGBBU1RgIGV4cHJlc3Npb24gd2l0aGluIHRoZSBnaXZlbiBzY29wZS5cbiAgICpcbiAgICogU29tZSBgQVNUYCBleHByZXNzaW9ucyByZWZlciB0byB0b3AtbGV2ZWwgY29uY2VwdHMgKHJlZmVyZW5jZXMsIHZhcmlhYmxlcywgdGhlIGNvbXBvbmVudFxuICAgKiBjb250ZXh0KS4gVGhpcyBtZXRob2QgYXNzaXN0cyBpbiByZXNvbHZpbmcgdGhvc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhpcyBleHByZXNzaW9uLiBJZiBubyBzdWNoIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW5cbiAgICAgIC8vIHRoZSBleHByZXNzaW9uIGlzIHJlZmVyZW5jaW5nIHRoZSB0b3AtbGV2ZWwgY29tcG9uZW50IGNvbnRleHQuIEluIHRoYXQgY2FzZSwgYG51bGxgIGlzXG4gICAgICAvLyByZXR1cm5lZCBoZXJlIHRvIGxldCBpdCBmYWxsIHRocm91Z2ggcmVzb2x1dGlvbiBzbyBpdCB3aWxsIGJlIGNhdWdodCB3aGVuIHRoZVxuICAgICAgLy8gYEltcGxpY2l0UmVjZWl2ZXJgIGlzIHJlc29sdmVkIGluIHRoZSBicmFuY2ggYmVsb3cuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC52YWx1ZSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIC8vIEFTVCBpbnN0YW5jZXMgcmVwcmVzZW50aW5nIHZhcmlhYmxlcyBhbmQgcmVmZXJlbmNlcyBsb29rIHZlcnkgc2ltaWxhciB0byBwcm9wZXJ0eSByZWFkc1xuICAgICAgLy8gb3IgbWV0aG9kIGNhbGxzIGZyb20gdGhlIGNvbXBvbmVudCBjb250ZXh0OiBib3RoIGhhdmUgdGhlIHNoYXBlXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlciwgJ3Byb3BOYW1lJykgb3IgTWV0aG9kQ2FsbChJbXBsaWNpdFJlY2VpdmVyLCAnbWV0aG9kTmFtZScpLlxuICAgICAgLy9cbiAgICAgIC8vIGB0cmFuc2xhdGVgIHdpbGwgZmlyc3QgdHJ5IHRvIGByZXNvbHZlYCB0aGUgb3V0ZXIgUHJvcGVydHlSZWFkL01ldGhvZENhbGwuIElmIHRoaXMgd29ya3MsXG4gICAgICAvLyBpdCdzIGJlY2F1c2UgdGhlIGBCb3VuZFRhcmdldGAgZm91bmQgYW4gZXhwcmVzc2lvbiB0YXJnZXQgZm9yIHRoZSB3aG9sZSBleHByZXNzaW9uLCBhbmRcbiAgICAgIC8vIHRoZXJlZm9yZSBgdHJhbnNsYXRlYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXRcbiAgICAgIC8vIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsLlxuICAgICAgLy9cbiAgICAgIC8vIFRoZXJlZm9yZSBpZiBgcmVzb2x2ZWAgaXMgY2FsbGVkIG9uIGFuIGBJbXBsaWNpdFJlY2VpdmVyYCwgaXQncyBiZWNhdXNlIG5vIG91dGVyXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbCByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSwgYW5kIHRoZXJlZm9yZSB0aGlzIGlzIGFcbiAgICAgIC8vIHByb3BlcnR5IHJlYWQgb3IgbWV0aG9kIGNhbGwgb24gdGhlIGNvbXBvbmVudCBjb250ZXh0IGl0c2VsZi5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlKSB7XG4gICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmV4cCk7XG4gICAgICBsZXQgcGlwZTogdHMuRXhwcmVzc2lvbnxudWxsO1xuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZQaXBlcykge1xuICAgICAgICBwaXBlID0gdGhpcy50Y2IuZ2V0UGlwZUJ5TmFtZShhc3QubmFtZSk7XG4gICAgICAgIGlmIChwaXBlID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gTm8gcGlwZSBieSB0aGF0IG5hbWUgZXhpc3RzIGluIHNjb3BlLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvci5cbiAgICAgICAgICB0aGlzLnRjYi5vb2JSZWNvcmRlci5taXNzaW5nUGlwZSh0aGlzLnRjYi5pZCwgYXN0KTtcblxuICAgICAgICAgIC8vIFJldHVybiBhbiAnYW55JyB2YWx1ZSB0byBhdCBsZWFzdCBhbGxvdyB0aGUgcmVzdCBvZiB0aGUgZXhwcmVzc2lvbiB0byBiZSBjaGVja2VkLlxuICAgICAgICAgIHBpcGUgPSBOVUxMX0FTX0FOWTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGlwZSA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihcbiAgICAgICAgICAgIHRzLmNyZWF0ZU51bGwoKSwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMudHJhbnNsYXRlKGFyZykpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHNDYWxsTWV0aG9kKHBpcGUsICd0cmFuc2Zvcm0nLCBbZXhwciwgLi4uYXJnc10pO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXN1bHQsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgYXN0IGluc3RhbmNlb2YgTWV0aG9kQ2FsbCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyICYmXG4gICAgICAgICEoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgVGhpc1JlY2VpdmVyKSkge1xuICAgICAgLy8gUmVzb2x2ZSB0aGUgc3BlY2lhbCBgJGFueShleHByKWAgc3ludGF4IHRvIGluc2VydCBhIGNhc3Qgb2YgdGhlIGFyZ3VtZW50IHRvIHR5cGUgYGFueWAuXG4gICAgICAvLyBgJGFueShleHByKWAgLT4gYGV4cHIgYXMgYW55YFxuICAgICAgaWYgKGFzdC5uYW1lID09PSAnJGFueScgJiYgYXN0LmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuYXJnc1swXSk7XG4gICAgICAgIGNvbnN0IGV4cHJBc0FueSA9XG4gICAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24oZXhwciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbihleHByQXNBbnkpO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgYSBib3VuZCB0YXJnZXQgZm9yIHRoZSBtZXRob2QsIGFuZCBnZW5lcmF0ZSB0aGUgbWV0aG9kIGNhbGwgaWYgYSB0YXJnZXRcbiAgICAgIC8vIGNvdWxkIGJlIHJlc29sdmVkLiBJZiBubyB0YXJnZXQgaXMgYXZhaWxhYmxlLCB0aGVuIHRoZSBtZXRob2QgaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbFxuICAgICAgLy8gY29tcG9uZW50IGNvbnRleHQsIGluIHdoaWNoIGNhc2UgYG51bGxgIGlzIHJldHVybmVkIHRvIGxldCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgIGJlaW5nXG4gICAgICAvLyByZXNvbHZlZCB0byB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gICAgICBjb25zdCByZWNlaXZlciA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHJlY2VpdmVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRob2QgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh3cmFwRm9yRGlhZ25vc3RpY3MocmVjZWl2ZXIpLCBhc3QubmFtZSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMudHJhbnNsYXRlKGFyZykpO1xuICAgICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUNhbGwobWV0aG9kLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBBU1QgaXNuJ3Qgc3BlY2lhbCBhZnRlciBhbGwuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgYSBnaXZlbiBleHByZXNzaW9uLCBhbmQgdHJhbnNsYXRlcyBpdCBpbnRvIHRoZVxuICAgKiBhcHByb3ByaWF0ZSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZXByZXNlbnRzIHRoZSBib3VuZCB0YXJnZXQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVGFyZ2V0KGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBiaW5kaW5nID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmIChiaW5kaW5nID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByID0gdGhpcy5zY29wZS5yZXNvbHZlKGJpbmRpbmcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUsIGluZmVycmluZyBhIHR5cGUgZm9yXG4gKiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGZyb20gYW55IGJvdW5kIGlucHV0cy5cbiAqL1xuZnVuY3Rpb24gdGNiQ2FsbFR5cGVDdG9yKFxuICAgIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCwgaW5wdXRzOiBUY2JEaXJlY3RpdmVJbnB1dFtdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHR5cGVDdG9yID0gdGNiLmVudi50eXBlQ3RvckZvcihkaXIpO1xuXG4gIC8vIENvbnN0cnVjdCBhbiBhcnJheSBvZiBgdHMuUHJvcGVydHlBc3NpZ25tZW50YHMgZm9yIGVhY2ggb2YgdGhlIGRpcmVjdGl2ZSdzIGlucHV0cy5cbiAgY29uc3QgbWVtYmVycyA9IGlucHV0cy5tYXAoaW5wdXQgPT4ge1xuICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoaW5wdXQuZmllbGQpO1xuXG4gICAgaWYgKGlucHV0LnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IGlucHV0LmV4cHJlc3Npb247XG4gICAgICBpZiAoIXRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYXNzaWdubWVudCA9IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIGFzc2lnbm1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEEgdHlwZSBjb25zdHJ1Y3RvciBpcyByZXF1aXJlZCB0byBiZSBjYWxsZWQgd2l0aCBhbGwgaW5wdXQgcHJvcGVydGllcywgc28gYW55IHVuc2V0XG4gICAgICAvLyBpbnB1dHMgYXJlIHNpbXBseSBhc3NpZ25lZCBhIHZhbHVlIG9mIHR5cGUgYGFueWAgdG8gaWdub3JlIHRoZW0uXG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5TmFtZSwgTlVMTF9BU19BTlkpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2FsbCB0aGUgYG5nVHlwZUN0b3JgIG1ldGhvZCBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzLCB3aXRoIGFuIG9iamVjdCBsaXRlcmFsIGFyZ3VtZW50IGNyZWF0ZWRcbiAgLy8gZnJvbSB0aGUgbWF0Y2hlZCBpbnB1dHMuXG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyB0eXBlQ3RvcixcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9bdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKV0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb3VuZElucHV0cyhcbiAgICBkaXJlY3RpdmU6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgdGNiOiBDb250ZXh0KTogVGNiQm91bmRJbnB1dFtdIHtcbiAgY29uc3QgYm91bmRJbnB1dHM6IFRjYkJvdW5kSW5wdXRbXSA9IFtdO1xuXG4gIGNvbnN0IHByb2Nlc3NBdHRyaWJ1dGUgPSAoYXR0cjogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlKSA9PiB7XG4gICAgLy8gU2tpcCBub24tcHJvcGVydHkgYmluZGluZ3MuXG4gICAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgYXR0ci50eXBlICE9PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNraXAgdGV4dCBhdHRyaWJ1dGVzIGlmIGNvbmZpZ3VyZWQgdG8gZG8gc28uXG4gICAgaWYgKCF0Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgJiYgYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2tpcCB0aGUgYXR0cmlidXRlIGlmIHRoZSBkaXJlY3RpdmUgZG9lcyBub3QgaGF2ZSBhbiBpbnB1dCBmb3IgaXQuXG4gICAgY29uc3QgaW5wdXRzID0gZGlyZWN0aXZlLmlucHV0cy5nZXRCeUJpbmRpbmdQcm9wZXJ0eU5hbWUoYXR0ci5uYW1lKTtcbiAgICBpZiAoaW5wdXRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZpZWxkTmFtZXMgPSBpbnB1dHMubWFwKGlucHV0ID0+IGlucHV0LmNsYXNzUHJvcGVydHlOYW1lKTtcbiAgICBib3VuZElucHV0cy5wdXNoKHthdHRyaWJ1dGU6IGF0dHIsIGZpZWxkTmFtZXN9KTtcbiAgfTtcblxuICBub2RlLmlucHV0cy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICBub2RlLmF0dHJpYnV0ZXMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICBub2RlLnRlbXBsYXRlQXR0cnMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgfVxuXG4gIHJldHVybiBib3VuZElucHV0cztcbn1cblxuLyoqXG4gKiBUcmFuc2xhdGVzIHRoZSBnaXZlbiBhdHRyaWJ1dGUgYmluZGluZyB0byBhIGB0cy5FeHByZXNzaW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNsYXRlSW5wdXQoXG4gICAgYXR0cjogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBpZiAoYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkge1xuICAgIC8vIFByb2R1Y2UgYW4gZXhwcmVzc2lvbiByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHRoZSBiaW5kaW5nLlxuICAgIHJldHVybiB0Y2JFeHByZXNzaW9uKGF0dHIudmFsdWUsIHRjYiwgc2NvcGUpO1xuICB9IGVsc2Uge1xuICAgIC8vIEZvciByZWd1bGFyIGF0dHJpYnV0ZXMgd2l0aCBhIHN0YXRpYyBzdHJpbmcgdmFsdWUsIHVzZSB0aGUgcmVwcmVzZW50ZWQgc3RyaW5nIGxpdGVyYWwuXG4gICAgcmV0dXJuIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoYXR0ci52YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBpbnB1dCBiaW5kaW5nIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIGZpZWxkIG9mIGEgZGlyZWN0aXZlLlxuICovXG5pbnRlcmZhY2UgVGNiRGlyZWN0aXZlQm91bmRJbnB1dCB7XG4gIHR5cGU6ICdiaW5kaW5nJztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgYSBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlIHRoYXQgaXMgc2V0LlxuICAgKi9cbiAgZmllbGQ6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGB0cy5FeHByZXNzaW9uYCBjb3JyZXNwb25kaW5nIHdpdGggdGhlIGlucHV0IGJpbmRpbmcgZXhwcmVzc2lvbi5cbiAgICovXG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG5cbiAgLyoqXG4gICAqIFRoZSBzb3VyY2Ugc3BhbiBvZiB0aGUgZnVsbCBhdHRyaWJ1dGUgYmluZGluZy5cbiAgICovXG4gIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbjtcbn1cblxuLyoqXG4gKiBJbmRpY2F0ZXMgdGhhdCBhIGNlcnRhaW4gZmllbGQgb2YgYSBkaXJlY3RpdmUgZG9lcyBub3QgaGF2ZSBhIGNvcnJlc3BvbmRpbmcgaW5wdXQgYmluZGluZy5cbiAqL1xuaW50ZXJmYWNlIFRjYkRpcmVjdGl2ZVVuc2V0SW5wdXQge1xuICB0eXBlOiAndW5zZXQnO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiBhIGZpZWxkIG9uIHRoZSBkaXJlY3RpdmUgZm9yIHdoaWNoIG5vIGlucHV0IGJpbmRpbmcgaXMgcHJlc2VudC5cbiAgICovXG4gIGZpZWxkOiBzdHJpbmc7XG59XG5cbnR5cGUgVGNiRGlyZWN0aXZlSW5wdXQgPSBUY2JEaXJlY3RpdmVCb3VuZElucHV0fFRjYkRpcmVjdGl2ZVVuc2V0SW5wdXQ7XG5cbmNvbnN0IEVWRU5UX1BBUkFNRVRFUiA9ICckZXZlbnQnO1xuXG5jb25zdCBlbnVtIEV2ZW50UGFyYW1UeXBlIHtcbiAgLyogR2VuZXJhdGVzIGNvZGUgdG8gaW5mZXIgdGhlIHR5cGUgb2YgYCRldmVudGAgYmFzZWQgb24gaG93IHRoZSBsaXN0ZW5lciBpcyByZWdpc3RlcmVkLiAqL1xuICBJbmZlcixcblxuICAvKiBEZWNsYXJlcyB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgcGFyYW1ldGVyIGFzIGBhbnlgLiAqL1xuICBBbnksXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJvdyBmdW5jdGlvbiB0byBiZSB1c2VkIGFzIGhhbmRsZXIgZnVuY3Rpb24gZm9yIGV2ZW50IGJpbmRpbmdzLiBUaGUgaGFuZGxlclxuICogZnVuY3Rpb24gaGFzIGEgc2luZ2xlIHBhcmFtZXRlciBgJGV2ZW50YCBhbmQgdGhlIGJvdW5kIGV2ZW50J3MgaGFuZGxlciBgQVNUYCByZXByZXNlbnRlZCBhcyBhXG4gKiBUeXBlU2NyaXB0IGV4cHJlc3Npb24gYXMgaXRzIGJvZHkuXG4gKlxuICogV2hlbiBgZXZlbnRUeXBlYCBpcyBzZXQgdG8gYEluZmVyYCwgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciB3aWxsIG5vdCBoYXZlIGFuIGV4cGxpY2l0IHR5cGUuIFRoaXNcbiAqIGFsbG93cyBmb3IgdGhlIGNyZWF0ZWQgaGFuZGxlciBmdW5jdGlvbiB0byBoYXZlIGl0cyBgJGV2ZW50YCBwYXJhbWV0ZXIncyB0eXBlIGluZmVycmVkIGJhc2VkIG9uXG4gKiBob3cgaXQncyB1c2VkLCB0byBlbmFibGUgc3RyaWN0IHR5cGUgY2hlY2tpbmcgb2YgZXZlbnQgYmluZGluZ3MuIFdoZW4gc2V0IHRvIGBBbnlgLCB0aGUgYCRldmVudGBcbiAqIHBhcmFtZXRlciB3aWxsIGhhdmUgYW4gZXhwbGljaXQgYGFueWAgdHlwZSwgZWZmZWN0aXZlbHkgZGlzYWJsaW5nIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50XG4gKiBiaW5kaW5ncy4gQWx0ZXJuYXRpdmVseSwgYW4gZXhwbGljaXQgdHlwZSBjYW4gYmUgcGFzc2VkIGZvciB0aGUgYCRldmVudGAgcGFyYW1ldGVyLlxuICovXG5mdW5jdGlvbiB0Y2JDcmVhdGVFdmVudEhhbmRsZXIoXG4gICAgZXZlbnQ6IFRtcGxBc3RCb3VuZEV2ZW50LCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSxcbiAgICBldmVudFR5cGU6IEV2ZW50UGFyYW1UeXBlfHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGhhbmRsZXIgPSB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGV2ZW50LmhhbmRsZXIsIHRjYiwgc2NvcGUpO1xuXG4gIGxldCBldmVudFBhcmFtVHlwZTogdHMuVHlwZU5vZGV8dW5kZWZpbmVkO1xuICBpZiAoZXZlbnRUeXBlID09PSBFdmVudFBhcmFtVHlwZS5JbmZlcikge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKGV2ZW50VHlwZSA9PT0gRXZlbnRQYXJhbVR5cGUuQW55KSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgfSBlbHNlIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IGV2ZW50VHlwZTtcbiAgfVxuXG4gIC8vIE9idGFpbiBhbGwgZ3VhcmRzIHRoYXQgaGF2ZSBiZWVuIGFwcGxpZWQgdG8gdGhlIHNjb3BlIGFuZCBpdHMgcGFyZW50cywgYXMgdGhleSBoYXZlIHRvIGJlXG4gIC8vIHJlcGVhdGVkIHdpdGhpbiB0aGUgaGFuZGxlciBmdW5jdGlvbiBmb3IgdGhlaXIgbmFycm93aW5nIHRvIGJlIGluIGVmZmVjdCB3aXRoaW4gdGhlIGhhbmRsZXIuXG4gIGNvbnN0IGd1YXJkcyA9IHNjb3BlLmd1YXJkcygpO1xuXG4gIGxldCBib2R5OiB0cy5TdGF0ZW1lbnQgPSB0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpO1xuICBpZiAoZ3VhcmRzICE9PSBudWxsKSB7XG4gICAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBgaWZgIHN0YXRlbWVudCBjb250YWluaW5nIGFsbCBndWFyZHMgdGhhdCBoYXZlIHRvIGJlIGFwcGxpZWQuXG4gICAgYm9keSA9IHRzLmNyZWF0ZUlmKGd1YXJkcywgYm9keSk7XG4gIH1cblxuICBjb25zdCBldmVudFBhcmFtID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBFVkVOVF9QQVJBTUVURVIsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gZXZlbnRQYXJhbVR5cGUpO1xuXG4gIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkV4cHJlc3Npb24oXG4gICAgICAvKiBtb2RpZmllciAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tldmVudFBhcmFtXSxcbiAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCksXG4gICAgICAvKiBib2R5ICovIHRzLmNyZWF0ZUJsb2NrKFtib2R5XSkpO1xufVxuXG4vKipcbiAqIFNpbWlsYXIgdG8gYHRjYkV4cHJlc3Npb25gLCB0aGlzIGZ1bmN0aW9uIGNvbnZlcnRzIHRoZSBwcm92aWRlZCBgQVNUYCBleHByZXNzaW9uIGludG8gYVxuICogYHRzLkV4cHJlc3Npb25gLCB3aXRoIHNwZWNpYWwgaGFuZGxpbmcgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHRoYXQgY2FuIGJlIHVzZWQgd2l0aGluIGV2ZW50XG4gKiBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gdGNiRXZlbnRIYW5kbGVyRXhwcmVzc2lvbihhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXZlbnRIYW5kbGVyVHJhbnNsYXRvciBleHRlbmRzIFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yIHtcbiAgcHJvdGVjdGVkIHJlc29sdmUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIC8vIFJlY29nbml6ZSBhIHByb3BlcnR5IHJlYWQgb24gdGhlIGltcGxpY2l0IHJlY2VpdmVyIGNvcnJlc3BvbmRpbmcgd2l0aCB0aGUgZXZlbnQgcGFyYW1ldGVyXG4gICAgLy8gdGhhdCBpcyBhdmFpbGFibGUgaW4gZXZlbnQgYmluZGluZ3MuIFNpbmNlIHRoaXMgdmFyaWFibGUgaXMgYSBwYXJhbWV0ZXIgb2YgdGhlIGhhbmRsZXJcbiAgICAvLyBmdW5jdGlvbiB0aGF0IHRoZSBjb252ZXJ0ZWQgZXhwcmVzc2lvbiBiZWNvbWVzIGEgY2hpbGQgb2YsIGp1c3QgY3JlYXRlIGEgcmVmZXJlbmNlIHRvIHRoZVxuICAgIC8vIHBhcmFtZXRlciBieSBpdHMgbmFtZS5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBUaGlzUmVjZWl2ZXIpICYmIGFzdC5uYW1lID09PSBFVkVOVF9QQVJBTUVURVIpIHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcihFVkVOVF9QQVJBTUVURVIpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhldmVudCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVzb2x2ZShhc3QpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOiBib29sZWFuIHtcbiAgLy8gSW4gb3JkZXIgdG8gcXVhbGlmeSBmb3IgYSBkZWNsYXJlZCBUQ0IgKG5vdCBpbmxpbmUpIHR3byBjb25kaXRpb25zIG11c3QgYmUgbWV0OlxuICAvLyAxKSB0aGUgY2xhc3MgbXVzdCBiZSBleHBvcnRlZFxuICAvLyAyKSBpdCBtdXN0IG5vdCBoYXZlIGNvbnN0cmFpbmVkIGdlbmVyaWMgdHlwZXNcbiAgaWYgKCFjaGVja0lmQ2xhc3NJc0V4cG9ydGVkKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDEgaXMgZmFsc2UsIHRoZSBjbGFzcyBpcyBub3QgZXhwb3J0ZWQuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoIWNoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kKG5vZGUpKSB7XG4gICAgLy8gQ29uZGl0aW9uIDIgaXMgZmFsc2UsIHRoZSBjbGFzcyBoYXMgY29uc3RyYWluZWQgZ2VuZXJpYyB0eXBlc1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19