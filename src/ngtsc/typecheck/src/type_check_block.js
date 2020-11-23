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
    exports.Context = exports.TcbDirectiveOutputsOp = exports.generateTypeCheckBlock = void 0;
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
            diagnostics_1.addParseSpanInfo(id, this.variable.keySpan);
            // Declare the variable, and return its identifier.
            var variable;
            if (this.variable.valueSpan !== undefined) {
                diagnostics_1.addParseSpanInfo(initializer, this.variable.valueSpan);
                variable = ts_util_1.tsCreateVariable(id, diagnostics_1.wrapForTypeChecker(initializer));
            }
            else {
                variable = ts_util_1.tsCreateVariable(id, initializer);
            }
            diagnostics_1.addParseSpanInfo(variable.declarationList.declarations[0], this.variable.sourceSpan);
            this.scope.addStatement(variable);
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
            diagnostics_1.addParseSpanInfo(id, this.node.keySpan);
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, initializer));
            return id;
        };
        return TcbReferenceOp;
    }(TcbOp));
    /**
     * A `TcbOp` which is used when the target of a reference is missing. This operation generates a
     * variable of type any for usages of the invalid reference to resolve to. The invalid reference
     * itself is recorded out-of-band.
     */
    var TcbInvalidReferenceOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbInvalidReferenceOp, _super);
        function TcbInvalidReferenceOp(tcb, scope) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            // The declaration of a missing reference is only needed when the reference is resolved.
            _this.optional = true;
            return _this;
        }
        TcbInvalidReferenceOp.prototype.execute = function () {
            var id = this.tcb.allocateId();
            this.scope.addStatement(ts_util_1.tsCreateVariable(id, expression_1.NULL_AS_ANY));
            return id;
        };
        return TcbInvalidReferenceOp;
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
                            if (input.attribute.keySpan !== undefined) {
                                diagnostics_1.addParseSpanInfo(target, input.attribute.keySpan);
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
                        diagnostics_1.addParseSpanInfo(outputField, output.keySpan);
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
                    var ctxIndex = void 0;
                    if (target === null) {
                        // The reference is invalid if it doesn't have a target, so report it as an error.
                        this.tcb.oobRecorder.missingReferenceTarget(this.tcb.id, ref);
                        // Any usages of the invalid reference will be resolved to a variable of type any.
                        ctxIndex = this.opQueue.push(new TcbInvalidReferenceOp(this.tcb, this)) - 1;
                    }
                    else if (target instanceof compiler_1.TmplAstTemplate || target instanceof compiler_1.TmplAstElement) {
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
                var method = diagnostics_1.wrapForDiagnostics(receiver);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclksK0JBQWlDO0lBT2pDLG1GQUFnRztJQUNoRyx5RkFBc0c7SUFHdEcsdUZBQTBEO0lBRTFELHVHQUErRDtJQUMvRCxpRkFBNEk7SUFFNUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXFCRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxHQUFnQixFQUFFLEdBQXFELEVBQUUsSUFBbUIsRUFDNUYsSUFBNEIsRUFBRSxnQkFBa0MsRUFDaEUsV0FBd0M7UUFDMUMsSUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQ25CLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdGLElBQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFVLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUNYLG1FQUFpRSxHQUFHLENBQUMsU0FBVyxDQUFDLENBQUM7U0FDdkY7UUFDRCxJQUFNLFNBQVMsR0FBRyxD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QztRQUM3RCxPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVEO1FBQXdDLHFEQUF1QjtRQUEvRDs7UUFlQSxDQUFDO1FBZFcsMkNBQU8sR0FBakIsVUFBa0IsR0FBUTtZQUN4Qiw0RkFBNEY7WUFDNUYseUZBQXlGO1lBQ3pGLDRGQUE0RjtZQUM1Rix5QkFBeUI7WUFDekIsSUFBSSxHQUFHLFlBQVksdUJBQVksSUFBSSxHQUFHLENBQUMsUUFBUSxZQUFZLDJCQUFnQjtnQkFDdkUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLFlBQVksdUJBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO2dCQUMzRSxJQUFNLE9BQUssR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ25ELDhCQUFnQixDQUFDLE9BQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sT0FBSyxDQUFDO2FBQ2Q7WUFFRCxPQUFPLGlCQUFNLE9BQU8sWUFBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBZkQsQ0FBd0MsdUJBQXVCLEdBZTlEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBEWU5BTUlDX1RZUEUsIEltcGxpY2l0UmVjZWl2ZXIsIE1ldGhvZENhbGwsIFBhcnNlZEV2ZW50VHlwZSwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNjaGVtYU1ldGFkYXRhLCBUaGlzUmVjZWl2ZXIsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0SWN1LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc1Byb3BlcnR5TmFtZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7VGVtcGxhdGVJZCwgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGF9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7YWRkRXhwcmVzc2lvbklkZW50aWZpZXIsIEV4cHJlc3Npb25JZGVudGlmaWVyLCBtYXJrSWdub3JlRGlhZ25vc3RpY3N9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHthZGRQYXJzZVNwYW5JbmZvLCBhZGRUZW1wbGF0ZUlkLCB3cmFwRm9yRGlhZ25vc3RpY3MsIHdyYXBGb3JUeXBlQ2hlY2tlcn0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHthc3RUb1R5cGVzY3JpcHQsIE5VTExfQVNfQU5ZfSBmcm9tICcuL2V4cHJlc3Npb24nO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJ9IGZyb20gJy4vb29iJztcbmltcG9ydCB7RXhwcmVzc2lvblNlbWFudGljVmlzaXRvcn0gZnJvbSAnLi90ZW1wbGF0ZV9zZW1hbnRpY3MnO1xuaW1wb3J0IHt0c0NhbGxNZXRob2QsIHRzQ2FzdFRvQW55LCB0c0NyZWF0ZUVsZW1lbnQsIHRzQ3JlYXRlVHlwZVF1ZXJ5Rm9yQ29lcmNlZElucHV0LCB0c0NyZWF0ZVZhcmlhYmxlLCB0c0RlY2xhcmVWYXJpYWJsZX0gZnJvbSAnLi90c191dGlsJztcblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBmb3IgYSBjb21wb25lbnQsIGFuZCBtZXRhZGF0YSByZWdhcmRpbmcgdGhhdCBjb21wb25lbnQsIGNvbXBvc2UgYVxuICogXCJ0eXBlIGNoZWNrIGJsb2NrXCIgZnVuY3Rpb24uXG4gKlxuICogV2hlbiBwYXNzZWQgdGhyb3VnaCBUeXBlU2NyaXB0J3MgVHlwZUNoZWNrZXIsIHR5cGUgZXJyb3JzIHRoYXQgYXJpc2Ugd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrXG4gKiBmdW5jdGlvbiBpbmRpY2F0ZSBpc3N1ZXMgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAqXG4gKiBBcyBhIHNpZGUgZWZmZWN0IG9mIGdlbmVyYXRpbmcgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQsIGB0cy5EaWFnbm9zdGljYHMgbWF5IGFsc28gYmUgcHJvZHVjZWRcbiAqIGRpcmVjdGx5IGZvciBpc3N1ZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSB3aGljaCBhcmUgaWRlbnRpZmllZCBkdXJpbmcgZ2VuZXJhdGlvbi4gVGhlc2UgaXNzdWVzIGFyZVxuICogcmVjb3JkZWQgaW4gZWl0aGVyIHRoZSBgZG9tU2NoZW1hQ2hlY2tlcmAgKHdoaWNoIGNoZWNrcyB1c2FnZSBvZiBET00gZWxlbWVudHMgYW5kIGJpbmRpbmdzKSBhc1xuICogd2VsbCBhcyB0aGUgYG9vYlJlY29yZGVyYCAod2hpY2ggcmVjb3JkcyBlcnJvcnMgd2hlbiB0aGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRvciBpcyB1bmFibGVcbiAqIHRvIHN1ZmZpY2llbnRseSB1bmRlcnN0YW5kIGEgdGVtcGxhdGUpLlxuICpcbiAqIEBwYXJhbSBlbnYgYW4gYEVudmlyb25tZW50YCBpbnRvIHdoaWNoIHR5cGUtY2hlY2tpbmcgY29kZSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSByZWYgYSBgUmVmZXJlbmNlYCB0byB0aGUgY29tcG9uZW50IGNsYXNzIHdoaWNoIHNob3VsZCBiZSB0eXBlLWNoZWNrZWQuXG4gKiBAcGFyYW0gbmFtZSBhIGB0cy5JZGVudGlmaWVyYCB0byB1c2UgZm9yIHRoZSBnZW5lcmF0ZWQgYHRzLkZ1bmN0aW9uRGVjbGFyYXRpb25gLlxuICogQHBhcmFtIG1ldGEgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGFuZCB0aGUgZnVuY3Rpb24gYmVpbmcgZ2VuZXJhdGVkLlxuICogQHBhcmFtIGRvbVNjaGVtYUNoZWNrZXIgdXNlZCB0byBjaGVjayBhbmQgcmVjb3JkIGVycm9ycyByZWdhcmRpbmcgaW1wcm9wZXIgdXNhZ2Ugb2YgRE9NIGVsZW1lbnRzXG4gKiBhbmQgYmluZGluZ3MuXG4gKiBAcGFyYW0gb29iUmVjb3JkZXIgdXNlZCB0byByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyB0ZW1wbGF0ZSBlbGVtZW50cyB3aGljaCBjb3VsZCBub3QgYmUgY29ycmVjdGx5XG4gKiB0cmFuc2xhdGVkIGludG8gdHlwZXMgZHVyaW5nIFRDQiBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICBlbnY6IEVudmlyb25tZW50LCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgbmFtZTogdHMuSWRlbnRpZmllcixcbiAgICBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgY29uc3QgdGNiID0gbmV3IENvbnRleHQoXG4gICAgICBlbnYsIGRvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyLCBtZXRhLmlkLCBtZXRhLmJvdW5kVGFyZ2V0LCBtZXRhLnBpcGVzLCBtZXRhLnNjaGVtYXMpO1xuICBjb25zdCBzY29wZSA9IFNjb3BlLmZvck5vZGVzKHRjYiwgbnVsbCwgdGNiLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCAvKiBndWFyZCAqLyBudWxsKTtcbiAgY29uc3QgY3R4UmF3VHlwZSA9IGVudi5yZWZlcmVuY2VUeXBlKHJlZik7XG4gIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShjdHhSYXdUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIHdoZW4gcmVmZXJlbmNpbmcgdGhlIGN0eCBwYXJhbSBmb3IgJHtyZWYuZGVidWdOYW1lfWApO1xuICB9XG4gIGNvbnN0IHBhcmFtTGlzdCA9IFt0Y2JDdHhQYXJhbShyZWYubm9kZSwgY3R4UmF3VHlwZS50eXBlTmFtZSwgZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUpXTtcblxuICBjb25zdCBzY29wZVN0YXRlbWVudHMgPSBzY29wZS5yZW5kZXIoKTtcbiAgY29uc3QgaW5uZXJCb2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgIC4uLmVudi5nZXRQcmVsdWRlU3RhdGVtZW50cygpLFxuICAgIC4uLnNjb3BlU3RhdGVtZW50cyxcbiAgXSk7XG5cbiAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBcImlmICh0cnVlKVwiIGV4cHJlc3Npb24uIFRoaXMgaXMgdW5uZWNlc3NhcnkgYnV0IGhhcyB0aGUgZWZmZWN0IG9mIGNhdXNpbmdcbiAgLy8gdGhlIGB0cy5QcmludGVyYCB0byBmb3JtYXQgdGhlIHR5cGUtY2hlY2sgYmxvY2sgbmljZWx5LlxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgaW5uZXJCb2R5LCB1bmRlZmluZWQpXSk7XG4gIGNvbnN0IGZuRGVjbCA9IHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gbmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVudi5jb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID8gcmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgOiB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovIHBhcmFtTGlzdCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbiAgYWRkVGVtcGxhdGVJZChmbkRlY2wsIG1ldGEuaWQpO1xuICByZXR1cm4gZm5EZWNsO1xufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0J3MgaW52b2x2ZWQgaW4gdGhlIGNvbnN0cnVjdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2suXG4gKlxuICogVGhlIGdlbmVyYXRpb24gb2YgYSBUQ0IgaXMgbm9uLWxpbmVhci4gQmluZGluZ3Mgd2l0aGluIGEgdGVtcGxhdGUgbWF5IHJlc3VsdCBpbiB0aGUgbmVlZCB0b1xuICogY29uc3RydWN0IGNlcnRhaW4gdHlwZXMgZWFybGllciB0aGFuIHRoZXkgb3RoZXJ3aXNlIHdvdWxkIGJlIGNvbnN0cnVjdGVkLiBUaGF0IGlzLCBpZiB0aGVcbiAqIGdlbmVyYXRpb24gb2YgYSBUQ0IgZm9yIGEgdGVtcGxhdGUgaXMgYnJva2VuIGRvd24gaW50byBzcGVjaWZpYyBvcGVyYXRpb25zIChjb25zdHJ1Y3RpbmcgYVxuICogZGlyZWN0aXZlLCBleHRyYWN0aW5nIGEgdmFyaWFibGUgZnJvbSBhIGxldC0gb3BlcmF0aW9uLCBldGMpLCB0aGVuIGl0J3MgcG9zc2libGUgZm9yIG9wZXJhdGlvbnNcbiAqIGVhcmxpZXIgaW4gdGhlIHNlcXVlbmNlIHRvIGRlcGVuZCBvbiBvcGVyYXRpb25zIHdoaWNoIG9jY3VyIGxhdGVyIGluIHRoZSBzZXF1ZW5jZS5cbiAqXG4gKiBgVGNiT3BgIGFic3RyYWN0cyB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIG9wZXJhdGlvbnMgd2hpY2ggYXJlIHJlcXVpcmVkIHRvIGNvbnZlcnQgYSB0ZW1wbGF0ZSBpbnRvXG4gKiBhIFRDQi4gVGhpcyBhbGxvd3MgZm9yIHR3byBwaGFzZXMgb2YgcHJvY2Vzc2luZyBmb3IgdGhlIHRlbXBsYXRlLCB3aGVyZSAxKSBhIGxpbmVhciBzZXF1ZW5jZSBvZlxuICogYFRjYk9wYHMgaXMgZ2VuZXJhdGVkLCBhbmQgdGhlbiAyKSB0aGVzZSBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgbm90IG5lY2Vzc2FyaWx5IGluIGxpbmVhclxuICogb3JkZXIuXG4gKlxuICogRWFjaCBgVGNiT3BgIG1heSBpbnNlcnQgc3RhdGVtZW50cyBpbnRvIHRoZSBib2R5IG9mIHRoZSBUQ0IsIGFuZCBhbHNvIG9wdGlvbmFsbHkgcmV0dXJuIGFcbiAqIGB0cy5FeHByZXNzaW9uYCB3aGljaCBjYW4gYmUgdXNlZCB0byByZWZlcmVuY2UgdGhlIG9wZXJhdGlvbidzIHJlc3VsdC5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgVGNiT3Age1xuICAvKipcbiAgICogU2V0IHRvIHRydWUgaWYgdGhpcyBvcGVyYXRpb24gY2FuIGJlIGNvbnNpZGVyZWQgb3B0aW9uYWwuIE9wdGlvbmFsIG9wZXJhdGlvbnMgYXJlIG9ubHkgZXhlY3V0ZWRcbiAgICogd2hlbiBkZXBlbmRlZCB1cG9uIGJ5IG90aGVyIG9wZXJhdGlvbnMsIG90aGVyd2lzZSB0aGV5IGFyZSBkaXNyZWdhcmRlZC4gVGhpcyBhbGxvd3MgZm9yIGxlc3NcbiAgICogY29kZSB0byBnZW5lcmF0ZSwgcGFyc2UgYW5kIHR5cGUtY2hlY2ssIG92ZXJhbGwgcG9zaXRpdmVseSBjb250cmlidXRpbmcgdG8gcGVyZm9ybWFuY2UuXG4gICAqL1xuICBhYnN0cmFjdCByZWFkb25seSBvcHRpb25hbDogYm9vbGVhbjtcblxuICBhYnN0cmFjdCBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbDtcblxuICAvKipcbiAgICogUmVwbGFjZW1lbnQgdmFsdWUgb3Igb3BlcmF0aW9uIHVzZWQgd2hpbGUgdGhpcyBgVGNiT3BgIGlzIGV4ZWN1dGluZyAoaS5lLiB0byByZXNvbHZlIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMgZHVyaW5nIGl0cyBleGVjdXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzdWFsbHkgYSBgbnVsbCFgIGV4cHJlc3Npb24gKHdoaWNoIGFza3MgVFMgdG8gaW5mZXIgYW4gYXBwcm9wcmlhdGUgdHlwZSksIGJ1dCBhbm90aGVyXG4gICAqIGBUY2JPcGAgY2FuIGJlIHJldHVybmVkIGluIGNhc2VzIHdoZXJlIGFkZGl0aW9uYWwgY29kZSBnZW5lcmF0aW9uIGlzIG5lY2Vzc2FyeSB0byBkZWFsIHdpdGhcbiAgICogY2lyY3VsYXIgcmVmZXJlbmNlcy5cbiAgICovXG4gIGNpcmN1bGFyRmFsbGJhY2soKTogVGNiT3B8dHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBhIG5hdGl2ZSBET00gZWxlbWVudCAob3Igd2ViIGNvbXBvbmVudCkgZnJvbSBhXG4gKiBgVG1wbEFzdEVsZW1lbnRgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JFbGVtZW50T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIGZvciB0eXBlLWluZmVyZW5jZSBvZiB0aGUgRE9NXG4gICAgLy8gZWxlbWVudCdzIHR5cGUgYW5kIHdvbid0IHJlcG9ydCBkaWFnbm9zdGljcyBieSBpdHNlbGYsIHNvIHRoZSBvcGVyYXRpb24gaXMgbWFya2VkIGFzIG9wdGlvbmFsXG4gICAgLy8gdG8gYXZvaWQgZ2VuZXJhdGluZyBzdGF0ZW1lbnRzIGZvciBET00gZWxlbWVudHMgdGhhdCBhcmUgbmV2ZXIgcmVmZXJlbmNlZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgLy8gQWRkIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZWxlbWVudCB1c2luZyBkb2N1bWVudC5jcmVhdGVFbGVtZW50LlxuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHNDcmVhdGVFbGVtZW50KHRoaXMuZWxlbWVudC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLmVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMuZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIHBhcnRpY3VsYXIgbGV0LSBgVG1wbEFzdFZhcmlhYmxlYCBvbiBhXG4gKiBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHZhcmlhYmxlIHZhcmlhYmxlIChsb2wpLlxuICovXG5jbGFzcyBUY2JWYXJpYWJsZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlLFxuICAgICAgcHJpdmF0ZSB2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgZm9yIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcblxuICAgIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGVcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY29udGV4dC5cbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAvKiBleHByZXNzaW9uICovIGN0eCxcbiAgICAgICAgLyogbmFtZSAqLyB0aGlzLnZhcmlhYmxlLnZhbHVlIHx8ICckaW1wbGljaXQnKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGlkLCB0aGlzLnZhcmlhYmxlLmtleVNwYW4pO1xuXG4gICAgLy8gRGVjbGFyZSB0aGUgdmFyaWFibGUsIGFuZCByZXR1cm4gaXRzIGlkZW50aWZpZXIuXG4gICAgbGV0IHZhcmlhYmxlOiB0cy5WYXJpYWJsZVN0YXRlbWVudDtcbiAgICBpZiAodGhpcy52YXJpYWJsZS52YWx1ZVNwYW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhpbml0aWFsaXplciwgdGhpcy52YXJpYWJsZS52YWx1ZVNwYW4pO1xuICAgICAgdmFyaWFibGUgPSB0c0NyZWF0ZVZhcmlhYmxlKGlkLCB3cmFwRm9yVHlwZUNoZWNrZXIoaW5pdGlhbGl6ZXIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGUgPSB0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcik7XG4gICAgfVxuICAgIGFkZFBhcnNlU3BhbkluZm8odmFyaWFibGUuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1swXSwgdGhpcy52YXJpYWJsZS5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh2YXJpYWJsZSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBhIHZhcmlhYmxlIGZvciBhIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY29udGV4dC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgdGVtcGxhdGUncyBjb250ZXh0IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JUZW1wbGF0ZUNvbnRleHRPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIC8vIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY29udGV4dCB2YXJpYWJsZSBpcyBvbmx5IG5lZWRlZCB3aGVuIHRoZSBjb250ZXh0IGlzIGFjdHVhbGx5IHJlZmVyZW5jZWQuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gdHJ1ZTtcblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIEFsbG9jYXRlIGEgdGVtcGxhdGUgY3R4IHZhcmlhYmxlIGFuZCBkZWNsYXJlIGl0IHdpdGggYW4gJ2FueScgdHlwZS4gVGhlIHR5cGUgb2YgdGhpcyB2YXJpYWJsZVxuICAgIC8vIG1heSBiZSBuYXJyb3dlZCBhcyBhIHJlc3VsdCBvZiB0ZW1wbGF0ZSBndWFyZCBjb25kaXRpb25zLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCB0eXBlID0gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoY3R4LCB0eXBlKSk7XG4gICAgcmV0dXJuIGN0eDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBkZXNjZW5kcyBpbnRvIGEgYFRtcGxBc3RUZW1wbGF0ZWAncyBjaGlsZHJlbiBhbmQgZ2VuZXJhdGVzIHR5cGUtY2hlY2tpbmcgY29kZSBmb3JcbiAqIHRoZW0uXG4gKlxuICogVGhpcyBvcGVyYXRpb24gd3JhcHMgdGhlIGNoaWxkcmVuJ3MgdHlwZS1jaGVja2luZyBjb2RlIGluIGFuIGBpZmAgYmxvY2ssIHdoaWNoIG1heSBpbmNsdWRlIG9uZVxuICogb3IgbW9yZSB0eXBlIGd1YXJkIGNvbmRpdGlvbnMgdGhhdCBuYXJyb3cgdHlwZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSBib2R5LlxuICovXG5jbGFzcyBUY2JUZW1wbGF0ZUJvZHlPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgLy8gQW4gYGlmYCB3aWxsIGJlIGNvbnN0cnVjdGVkLCB3aXRoaW4gd2hpY2ggdGhlIHRlbXBsYXRlJ3MgY2hpbGRyZW4gd2lsbCBiZSB0eXBlIGNoZWNrZWQuIFRoZVxuICAgIC8vIGBpZmAgaXMgdXNlZCBmb3IgdHdvIHJlYXNvbnM6IGl0IGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljIHNjb3BlLCBpc29sYXRpbmcgdmFyaWFibGVzIGRlY2xhcmVkXG4gICAgLy8gaW4gdGhlIHRlbXBsYXRlJ3MgVENCIGZyb20gdGhlIG91dGVyIGNvbnRleHQsIGFuZCBpdCBhbGxvd3MgYW55IGRpcmVjdGl2ZXMgb24gdGhlIHRlbXBsYXRlc1xuICAgIC8vIHRvIHBlcmZvcm0gdHlwZSBuYXJyb3dpbmcgb2YgZWl0aGVyIGV4cHJlc3Npb25zIG9yIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQuXG4gICAgLy9cbiAgICAvLyBUaGUgZ3VhcmQgaXMgdGhlIGBpZmAgYmxvY2sncyBjb25kaXRpb24uIEl0J3MgdXN1YWxseSBzZXQgdG8gYHRydWVgIGJ1dCBkaXJlY3RpdmVzIHRoYXQgZXhpc3RcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY2FuIHRyaWdnZXIgZXh0cmEgZ3VhcmQgZXhwcmVzc2lvbnMgdGhhdCBzZXJ2ZSB0byBuYXJyb3cgdHlwZXMgd2l0aGluIHRoZVxuICAgIC8vIGBpZmAuIGBndWFyZGAgaXMgY2FsY3VsYXRlZCBieSBzdGFydGluZyB3aXRoIGB0cnVlYCBhbmQgYWRkaW5nIG90aGVyIGNvbmRpdGlvbnMgYXMgbmVlZGVkLlxuICAgIC8vIENvbGxlY3QgdGhlc2UgaW50byBgZ3VhcmRzYCBieSBwcm9jZXNzaW5nIHRoZSBkaXJlY3RpdmVzLlxuICAgIGNvbnN0IGRpcmVjdGl2ZUd1YXJkczogdHMuRXhwcmVzc2lvbltdID0gW107XG5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZSh0aGlzLnRlbXBsYXRlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCBkaXJJbnN0SWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50ZW1wbGF0ZSwgZGlyKTtcbiAgICAgICAgY29uc3QgZGlySWQgPVxuICAgICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZShkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik7XG5cbiAgICAgICAgLy8gVGhlcmUgYXJlIHR3byBraW5kcyBvZiBndWFyZHMuIFRlbXBsYXRlIGd1YXJkcyAobmdUZW1wbGF0ZUd1YXJkcykgYWxsb3cgdHlwZSBuYXJyb3dpbmcgb2ZcbiAgICAgICAgLy8gdGhlIGV4cHJlc3Npb24gcGFzc2VkIHRvIGFuIEBJbnB1dCBvZiB0aGUgZGlyZWN0aXZlLiBTY2FuIHRoZSBkaXJlY3RpdmUgdG8gc2VlIGlmIGl0IGhhc1xuICAgICAgICAvLyBhbnkgdGVtcGxhdGUgZ3VhcmRzLCBhbmQgZ2VuZXJhdGUgdGhlbSBpZiBuZWVkZWQuXG4gICAgICAgIGRpci5uZ1RlbXBsYXRlR3VhcmRzLmZvckVhY2goZ3VhcmQgPT4ge1xuICAgICAgICAgIC8vIEZvciBlYWNoIHRlbXBsYXRlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUsIGxvb2sgZm9yIGEgYmluZGluZyB0byB0aGF0IGlucHV0LlxuICAgICAgICAgIGNvbnN0IGJvdW5kSW5wdXQgPSB0aGlzLnRlbXBsYXRlLmlucHV0cy5maW5kKGkgPT4gaS5uYW1lID09PSBndWFyZC5pbnB1dE5hbWUpIHx8XG4gICAgICAgICAgICAgIHRoaXMudGVtcGxhdGUudGVtcGxhdGVBdHRycy5maW5kKFxuICAgICAgICAgICAgICAgICAgKGk6IFRtcGxBc3RUZXh0QXR0cmlidXRlfFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSk6IGkgaXMgVG1wbEFzdEJvdW5kQXR0cmlidXRlID0+XG4gICAgICAgICAgICAgICAgICAgICAgaSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSk7XG4gICAgICAgICAgaWYgKGJvdW5kSW5wdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYm91bmRJbnB1dC52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuXG4gICAgICAgICAgICAvLyBUaGUgZXhwcmVzc2lvbiBoYXMgYWxyZWFkeSBiZWVuIGNoZWNrZWQgaW4gdGhlIHR5cGUgY29uc3RydWN0b3IgaW52b2NhdGlvbiwgc29cbiAgICAgICAgICAgIC8vIGl0IHNob3VsZCBiZSBpZ25vcmVkIHdoZW4gdXNlZCB3aXRoaW4gYSB0ZW1wbGF0ZSBndWFyZC5cbiAgICAgICAgICAgIG1hcmtJZ25vcmVEaWFnbm9zdGljcyhleHByKTtcblxuICAgICAgICAgICAgaWYgKGd1YXJkLnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgICAgICAgICAvLyBVc2UgdGhlIGJpbmRpbmcgZXhwcmVzc2lvbiBpdHNlbGYgYXMgZ3VhcmQuXG4gICAgICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSB3aXRoIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgYW5kIHRoYXRcbiAgICAgICAgICAgICAgLy8gZXhwcmVzc2lvbi5cbiAgICAgICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsIGBuZ1RlbXBsYXRlR3VhcmRfJHtndWFyZC5pbnB1dE5hbWV9YCwgW1xuICAgICAgICAgICAgICAgIGRpckluc3RJZCxcbiAgICAgICAgICAgICAgICBleHByLFxuICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhndWFyZEludm9rZSwgYm91bmRJbnB1dC52YWx1ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGhlIHNlY29uZCBraW5kIG9mIGd1YXJkIGlzIGEgdGVtcGxhdGUgY29udGV4dCBndWFyZC4gVGhpcyBndWFyZCBuYXJyb3dzIHRoZSB0ZW1wbGF0ZVxuICAgICAgICAvLyByZW5kZXJpbmcgY29udGV4dCB2YXJpYWJsZSBgY3R4YC5cbiAgICAgICAgaWYgKGRpci5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkICYmIHRoaXMudGNiLmVudi5jb25maWcuYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHMpIHtcbiAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsICduZ1RlbXBsYXRlQ29udGV4dEd1YXJkJywgW2Rpckluc3RJZCwgY3R4XSk7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhndWFyZEludm9rZSwgdGhpcy50ZW1wbGF0ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCeSBkZWZhdWx0IHRoZSBndWFyZCBpcyBzaW1wbHkgYHRydWVgLlxuICAgIGxldCBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgZ3VhcmRzIGZyb20gZGlyZWN0aXZlcywgdXNlIHRoZW0gaW5zdGVhZC5cbiAgICBpZiAoZGlyZWN0aXZlR3VhcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIFBvcCB0aGUgZmlyc3QgdmFsdWUgYW5kIHVzZSBpdCBhcyB0aGUgaW5pdGlhbGl6ZXIgdG8gcmVkdWNlKCkuIFRoaXMgd2F5LCBhIHNpbmdsZSBndWFyZFxuICAgICAgLy8gd2lsbCBiZSB1c2VkIG9uIGl0cyBvd24sIGJ1dCB0d28gb3IgbW9yZSB3aWxsIGJlIGNvbWJpbmVkIGludG8gYmluYXJ5IEFORCBleHByZXNzaW9ucy5cbiAgICAgIGd1YXJkID0gZGlyZWN0aXZlR3VhcmRzLnJlZHVjZShcbiAgICAgICAgICAoZXhwciwgZGlyR3VhcmQpID0+XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUJpbmFyeShleHByLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCBkaXJHdWFyZCksXG4gICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnBvcCgpISk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IFNjb3BlIGZvciB0aGUgdGVtcGxhdGUuIFRoaXMgY29uc3RydWN0cyB0aGUgbGlzdCBvZiBvcGVyYXRpb25zIGZvciB0aGUgdGVtcGxhdGVcbiAgICAvLyBjaGlsZHJlbiwgYXMgd2VsbCBhcyB0cmFja3MgYmluZGluZ3Mgd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICBjb25zdCB0bXBsU2NvcGUgPSBTY29wZS5mb3JOb2Rlcyh0aGlzLnRjYiwgdGhpcy5zY29wZSwgdGhpcy50ZW1wbGF0ZSwgZ3VhcmQpO1xuXG4gICAgLy8gUmVuZGVyIHRoZSB0ZW1wbGF0ZSdzIGBTY29wZWAgaW50byBpdHMgc3RhdGVtZW50cy5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gdG1wbFNjb3BlLnJlbmRlcigpO1xuICAgIGlmIChzdGF0ZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gQXMgYW4gb3B0aW1pemF0aW9uLCBkb24ndCBnZW5lcmF0ZSB0aGUgc2NvcGUncyBibG9jayBpZiBpdCBoYXMgbm8gc3RhdGVtZW50cy4gVGhpcyBpc1xuICAgICAgLy8gYmVuZWZpY2lhbCBmb3IgdGVtcGxhdGVzIHRoYXQgY29udGFpbiBmb3IgZXhhbXBsZSBgPHNwYW4gKm5nSWY9XCJmaXJzdFwiPjwvc3Bhbj5gLCBpbiB3aGljaFxuICAgICAgLy8gY2FzZSB0aGVyZSdzIG5vIG5lZWQgdG8gcmVuZGVyIHRoZSBgTmdJZmAgZ3VhcmQgZXhwcmVzc2lvbi4gVGhpcyBzZWVtcyBsaWtlIGEgbWlub3JcbiAgICAgIC8vIGltcHJvdmVtZW50LCBob3dldmVyIGl0IHJlZHVjZXMgdGhlIG51bWJlciBvZiBmbG93LW5vZGUgYW50ZWNlZGVudHMgdGhhdCBUeXBlU2NyaXB0IG5lZWRzXG4gICAgICAvLyB0byBrZWVwIGludG8gYWNjb3VudCBmb3Igc3VjaCBjYXNlcywgcmVzdWx0aW5nIGluIGFuIG92ZXJhbGwgcmVkdWN0aW9uIG9mXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIHRpbWUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgdG1wbEJsb2NrOiB0cy5TdGF0ZW1lbnQgPSB0cy5jcmVhdGVCbG9jayhzdGF0ZW1lbnRzKTtcbiAgICBpZiAoZ3VhcmQgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBzY29wZSBoYXMgYSBndWFyZCB0aGF0IG5lZWRzIHRvIGJlIGFwcGxpZWQsIHNvIHdyYXAgdGhlIHRlbXBsYXRlIGJsb2NrIGludG8gYW4gYGlmYFxuICAgICAgLy8gc3RhdGVtZW50IGNvbnRhaW5pbmcgdGhlIGd1YXJkIGV4cHJlc3Npb24uXG4gICAgICB0bXBsQmxvY2sgPSB0cy5jcmVhdGVJZigvKiBleHByZXNzaW9uICovIGd1YXJkLCAvKiB0aGVuU3RhdGVtZW50ICovIHRtcGxCbG9jayk7XG4gICAgfVxuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRtcGxCbG9jayk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCByZW5kZXJzIGEgdGV4dCBiaW5kaW5nIChpbnRlcnBvbGF0aW9uKSBpbnRvIHRoZSBUQ0IuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVGV4dEludGVycG9sYXRpb25PcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGJpbmRpbmc6IFRtcGxBc3RCb3VuZFRleHQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24odGhpcy5iaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiBhIGRpcmVjdGl2ZSBfd2l0aG91dF8gc2V0dGluZyBhbnkgb2YgaXRzIGlucHV0cy4gSW5wdXRzXG4gKiBhcmUgbGF0ZXIgc2V0IGluIHRoZSBgVGNiRGlyZWN0aXZlSW5wdXRzT3BgLiBUeXBlIGNoZWNraW5nIHdhcyBmb3VuZCB0byBiZSBmYXN0ZXIgd2hlbiBkb25lIGluXG4gKiB0aGlzIHdheSBhcyBvcHBvc2VkIHRvIGBUY2JEaXJlY3RpdmVDdG9yT3BgIHdoaWNoIGlzIG9ubHkgbmVjZXNzYXJ5IHdoZW4gdGhlIGRpcmVjdGl2ZSBpc1xuICogZ2VuZXJpYy5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVUeXBlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIHRvIGRlY2xhcmUgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgYW5kXG4gICAgLy8gd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWwgdG8gYXZvaWRcbiAgICAvLyBnZW5lcmF0aW5nIGRlY2xhcmF0aW9ucyBmb3IgZGlyZWN0aXZlcyB0aGF0IGRvbid0IGhhdmUgYW55IGlucHV0cy9vdXRwdXRzLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcblxuICAgIGNvbnN0IHR5cGUgPSB0aGlzLnRjYi5lbnYucmVmZXJlbmNlVHlwZSh0aGlzLmRpci5yZWYpO1xuICAgIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKHR5cGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyh0eXBlLCB0aGlzLm5vZGUuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMubm9kZS5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGEgdmFyaWFibGUgZm9yIGEgbG9jYWwgcmVmIGluIGEgdGVtcGxhdGUuXG4gKiBUaGUgaW5pdGlhbGl6ZXIgZm9yIHRoZSB2YXJpYWJsZSBpcyB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBmb3IgdGhlIGRpcmVjdGl2ZSwgdGVtcGxhdGUsIG9yXG4gKiBlbGVtZW50IHRoZSByZWYgcmVmZXJzIHRvLiBXaGVuIHRoZSByZWZlcmVuY2UgaXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUsIHRob3NlIFRDQiBzdGF0ZW1lbnRzIHdpbGxcbiAqIGFjY2VzcyB0aGlzIHZhcmlhYmxlIGFzIHdlbGwuIEZvciBleGFtcGxlOlxuICogYGBgXG4gKiB2YXIgX3QxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gKiB2YXIgX3QyID0gX3QxO1xuICogX3QyLnZhbHVlXG4gKiBgYGBcbiAqIFRoaXMgb3BlcmF0aW9uIHN1cHBvcnRzIG1vcmUgZmx1ZW50IGxvb2t1cHMgZm9yIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlcmAgd2hlbiBnZXR0aW5nIGEgc3ltYm9sXG4gKiBmb3IgYSByZWZlcmVuY2UuIEluIG1vc3QgY2FzZXMsIHRoaXMgaXNuJ3QgZXNzZW50aWFsOyB0aGF0IGlzLCB0aGUgaW5mb3JtYXRpb24gZm9yIHRoZSBzeW1ib2xcbiAqIGNvdWxkIGJlIGdhdGhlcmVkIHdpdGhvdXQgdGhpcyBvcGVyYXRpb24gdXNpbmcgdGhlIGBCb3VuZFRhcmdldGAuIEhvd2V2ZXIsIGZvciB0aGUgY2FzZSBvZlxuICogbmctdGVtcGxhdGUgcmVmZXJlbmNlcywgd2Ugd2lsbCBuZWVkIHRoaXMgcmVmZXJlbmNlIHZhcmlhYmxlIHRvIG5vdCBvbmx5IHByb3ZpZGUgYSBsb2NhdGlvbiBpblxuICogdGhlIHNoaW0gZmlsZSwgYnV0IGFsc28gdG8gbmFycm93IHRoZSB2YXJpYWJsZSB0byB0aGUgY29ycmVjdCBgVGVtcGxhdGVSZWY8VD5gIHR5cGUgcmF0aGVyIHRoYW5cbiAqIGBUZW1wbGF0ZVJlZjxhbnk+YCAodGhpcyB3b3JrIGlzIHN0aWxsIFRPRE8pLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYlJlZmVyZW5jZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGNiOiBDb250ZXh0LCBwcml2YXRlIHJlYWRvbmx5IHNjb3BlOiBTY29wZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgbm9kZTogVG1wbEFzdFJlZmVyZW5jZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaG9zdDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXQ6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgdG8gZm9yIHRoZSBUeXBlIENoZWNrZXJcbiAgLy8gc28gaXQgY2FuIG1hcCBhIHJlZmVyZW5jZSB2YXJpYWJsZSBpbiB0aGUgdGVtcGxhdGUgZGlyZWN0bHkgdG8gYSBub2RlIGluIHRoZSBUQ0IuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gdHJ1ZTtcblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGxldCBpbml0aWFsaXplciA9XG4gICAgICAgIHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgP1xuICAgICAgICB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50YXJnZXQpIDpcbiAgICAgICAgdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuaG9zdCwgdGhpcy50YXJnZXQpO1xuXG4gICAgLy8gVGhlIHJlZmVyZW5jZSBpcyBlaXRoZXIgdG8gYW4gZWxlbWVudCwgYW4gPG5nLXRlbXBsYXRlPiBub2RlLCBvciB0byBhIGRpcmVjdGl2ZSBvbiBhblxuICAgIC8vIGVsZW1lbnQgb3IgdGVtcGxhdGUuXG4gICAgaWYgKCh0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmICF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcykgfHxcbiAgICAgICAgIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzKSB7XG4gICAgICAvLyBSZWZlcmVuY2VzIHRvIERPTSBub2RlcyBhcmUgcGlubmVkIHRvICdhbnknIHdoZW4gYGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlc2AgaXMgYGZhbHNlYC5cbiAgICAgIC8vIFJlZmVyZW5jZXMgdG8gYFRlbXBsYXRlUmVmYHMgYW5kIGRpcmVjdGl2ZXMgYXJlIHBpbm5lZCB0byAnYW55JyB3aGVuXG4gICAgICAvLyBgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzYCBpcyBgZmFsc2VgLlxuICAgICAgaW5pdGlhbGl6ZXIgPVxuICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihpbml0aWFsaXplciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIERpcmVjdCByZWZlcmVuY2VzIHRvIGFuIDxuZy10ZW1wbGF0ZT4gbm9kZSBzaW1wbHkgcmVxdWlyZSBhIHZhbHVlIG9mIHR5cGVcbiAgICAgIC8vIGBUZW1wbGF0ZVJlZjxhbnk+YC4gVG8gZ2V0IHRoaXMsIGFuIGV4cHJlc3Npb24gb2YgdGhlIGZvcm1cbiAgICAgIC8vIGAoX3QxIGFzIGFueSBhcyBUZW1wbGF0ZVJlZjxhbnk+KWAgaXMgY29uc3RydWN0ZWQuXG4gICAgICBpbml0aWFsaXplciA9XG4gICAgICAgICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKGluaXRpYWxpemVyLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICBpbml0aWFsaXplciA9IHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihcbiAgICAgICAgICBpbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9jb3JlJywgJ1RlbXBsYXRlUmVmJywgW0RZTkFNSUNfVFlQRV0pKTtcbiAgICAgIGluaXRpYWxpemVyID0gdHMuY3JlYXRlUGFyZW4oaW5pdGlhbGl6ZXIpO1xuICAgIH1cbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpZCwgdGhpcy5ub2RlLmtleVNwYW4pO1xuXG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggaXMgdXNlZCB3aGVuIHRoZSB0YXJnZXQgb2YgYSByZWZlcmVuY2UgaXMgbWlzc2luZy4gVGhpcyBvcGVyYXRpb24gZ2VuZXJhdGVzIGFcbiAqIHZhcmlhYmxlIG9mIHR5cGUgYW55IGZvciB1c2FnZXMgb2YgdGhlIGludmFsaWQgcmVmZXJlbmNlIHRvIHJlc29sdmUgdG8uIFRoZSBpbnZhbGlkIHJlZmVyZW5jZVxuICogaXRzZWxmIGlzIHJlY29yZGVkIG91dC1vZi1iYW5kLlxuICovXG5jbGFzcyBUY2JJbnZhbGlkUmVmZXJlbmNlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgdGNiOiBDb250ZXh0LCBwcml2YXRlIHJlYWRvbmx5IHNjb3BlOiBTY29wZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvLyBUaGUgZGVjbGFyYXRpb24gb2YgYSBtaXNzaW5nIHJlZmVyZW5jZSBpcyBvbmx5IG5lZWRlZCB3aGVuIHRoZSByZWZlcmVuY2UgaXMgcmVzb2x2ZWQuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gdHJ1ZTtcblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIE5VTExfQVNfQU5ZKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUgd2l0aCB0eXBlcyBpbmZlcnJlZCBmcm9tIGl0cyBpbnB1dHMuIFRoZVxuICogaW5wdXRzIHRoZW1zZWx2ZXMgYXJlIG5vdCBjaGVja2VkIGhlcmU7IGNoZWNraW5nIG9mIGlucHV0cyBpcyBhY2hpZXZlZCBpbiBgVGNiRGlyZWN0aXZlSW5wdXRzT3BgLlxuICogQW55IGVycm9ycyByZXBvcnRlZCBpbiB0aGlzIHN0YXRlbWVudCBhcmUgaWdub3JlZCwgYXMgdGhlIHR5cGUgY29uc3RydWN0b3IgY2FsbCBpcyBvbmx5IHByZXNlbnRcbiAqIGZvciB0eXBlLWluZmVyZW5jZS5cbiAqXG4gKiBXaGVuIGEgRGlyZWN0aXZlIGlzIGdlbmVyaWMsIGl0IGlzIHJlcXVpcmVkIHRoYXQgdGhlIFRDQiBnZW5lcmF0ZXMgdGhlIGluc3RhbmNlIHVzaW5nIHRoaXMgbWV0aG9kXG4gKiBpbiBvcmRlciB0byBpbmZlciB0aGUgdHlwZSBpbmZvcm1hdGlvbiBjb3JyZWN0bHkuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB2YXJpYWJsZSB3aXRoIGl0cyBpbmZlcnJlZFxuICogdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3Rvck9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgZ2VuZXJhdGVkIGJ5IHRoaXMgb3BlcmF0aW9uIGlzIG9ubHkgdXNlZCB0byBpbmZlciB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBhbmRcbiAgICAvLyB3b24ndCByZXBvcnQgZGlhZ25vc3RpY3MgYnkgaXRzZWxmLCBzbyB0aGUgb3BlcmF0aW9uIGlzIG1hcmtlZCBhcyBvcHRpb25hbC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIoaWQsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpZCwgdGhpcy5ub2RlLnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG5cbiAgICBjb25zdCBnZW5lcmljSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIFRjYkRpcmVjdGl2ZUlucHV0PigpO1xuXG4gICAgY29uc3QgaW5wdXRzID0gZ2V0Qm91bmRJbnB1dHModGhpcy5kaXIsIHRoaXMubm9kZSwgdGhpcy50Y2IpO1xuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XG4gICAgICBmb3IgKGNvbnN0IGZpZWxkTmFtZSBvZiBpbnB1dC5maWVsZE5hbWVzKSB7XG4gICAgICAgIC8vIFNraXAgdGhlIGZpZWxkIGlmIGFuIGF0dHJpYnV0ZSBoYXMgYWxyZWFkeSBiZWVuIGJvdW5kIHRvIGl0OyB3ZSBjYW4ndCBoYXZlIGEgZHVwbGljYXRlXG4gICAgICAgIC8vIGtleSBpbiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBjYWxsLlxuICAgICAgICBpZiAoZ2VuZXJpY0lucHV0cy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHRyYW5zbGF0ZUlucHV0KGlucHV0LmF0dHJpYnV0ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgICBnZW5lcmljSW5wdXRzLnNldChmaWVsZE5hbWUsIHtcbiAgICAgICAgICB0eXBlOiAnYmluZGluZycsXG4gICAgICAgICAgZmllbGQ6IGZpZWxkTmFtZSxcbiAgICAgICAgICBleHByZXNzaW9uLFxuICAgICAgICAgIHNvdXJjZVNwYW46IGlucHV0LmF0dHJpYnV0ZS5zb3VyY2VTcGFuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCB1bnNldCBkaXJlY3RpdmUgaW5wdXRzIGZvciBlYWNoIG9mIHRoZSByZW1haW5pbmcgdW5zZXQgZmllbGRzLlxuICAgIGZvciAoY29uc3QgW2ZpZWxkTmFtZV0gb2YgdGhpcy5kaXIuaW5wdXRzKSB7XG4gICAgICBpZiAoIWdlbmVyaWNJbnB1dHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgZ2VuZXJpY0lucHV0cy5zZXQoZmllbGROYW1lLCB7dHlwZTogJ3Vuc2V0JywgZmllbGQ6IGZpZWxkTmFtZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgdGhlIGRpcmVjdGl2ZSB0byBpbmZlciBhIHR5cGUsIGFuZCBhc3NpZ24gdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGluc3RhbmNlLlxuICAgIGNvbnN0IHR5cGVDdG9yID0gdGNiQ2FsbFR5cGVDdG9yKHRoaXMuZGlyLCB0aGlzLnRjYiwgQXJyYXkuZnJvbShnZW5lcmljSW5wdXRzLnZhbHVlcygpKSk7XG4gICAgbWFya0lnbm9yZURpYWdub3N0aWNzKHR5cGVDdG9yKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCB0eXBlQ3RvcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIGNpcmN1bGFyRmFsbGJhY2soKTogVGNiT3Age1xuICAgIHJldHVybiBuZXcgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcCh0aGlzLnRjYiwgdGhpcy5zY29wZSwgdGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgaW5wdXQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB0aGF0IGNvcnJlc3BvbmQgd2l0aCB0aGVcbiAqIG1lbWJlcnMgb2YgYSBkaXJlY3RpdmUuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlSW5wdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZGlySWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGpvb3N0KTogcmVwb3J0IGR1cGxpY2F0ZSBwcm9wZXJ0aWVzXG5cbiAgICBjb25zdCBpbnB1dHMgPSBnZXRCb3VuZElucHV0cyh0aGlzLmRpciwgdGhpcy5ub2RlLCB0aGlzLnRjYik7XG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiBpbnB1dHMpIHtcbiAgICAgIC8vIEZvciBib3VuZCBpbnB1dHMsIHRoZSBwcm9wZXJ0eSBpcyBhc3NpZ25lZCB0aGUgYmluZGluZyBleHByZXNzaW9uLlxuICAgICAgbGV0IGV4cHIgPSB0cmFuc2xhdGVJbnB1dChpbnB1dC5hdHRyaWJ1dGUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGFzc2lnbm1lbnQ6IHRzLkV4cHJlc3Npb24gPSB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcik7XG5cbiAgICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIGlucHV0LmZpZWxkTmFtZXMpIHtcbiAgICAgICAgbGV0IHRhcmdldDogdHMuTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKHRoaXMuZGlyLmNvZXJjZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIFRoZSBpbnB1dCBoYXMgYSBjb2VyY2lvbiBkZWNsYXJhdGlvbiB3aGljaCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkIG9mIGFzc2lnbmluZyB0aGVcbiAgICAgICAgICAvLyBleHByZXNzaW9uIGludG8gdGhlIGlucHV0IGZpZWxkIGRpcmVjdGx5LiBUbyBhY2hpZXZlIHRoaXMsIGEgdmFyaWFibGUgaXMgZGVjbGFyZWRcbiAgICAgICAgICAvLyB3aXRoIGEgdHlwZSBvZiBgdHlwZW9mIERpcmVjdGl2ZS5uZ0FjY2VwdElucHV0VHlwZV9maWVsZE5hbWVgIHdoaWNoIGlzIHRoZW4gdXNlZCBhc1xuICAgICAgICAgIC8vIHRhcmdldCBvZiB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgICBjb25zdCBkaXJUeXBlUmVmID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICAgICAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGlyVHlwZVJlZikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgZnJvbSByZWZlcmVuY2UgdG8gJHt0aGlzLmRpci5yZWYuZGVidWdOYW1lfWApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgICAgICAgIGNvbnN0IHR5cGUgPSB0c0NyZWF0ZVR5cGVRdWVyeUZvckNvZXJjZWRJbnB1dChkaXJUeXBlUmVmLnR5cGVOYW1lLCBmaWVsZE5hbWUpO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGlkLCB0eXBlKSk7XG5cbiAgICAgICAgICB0YXJnZXQgPSBpZDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmRpci51bmRlY2xhcmVkSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAvLyBJZiBubyBjb2VyY2lvbiBkZWNsYXJhdGlvbiBpcyBwcmVzZW50IG5vciBpcyB0aGUgZmllbGQgZGVjbGFyZWQgKGkuZS4gdGhlIGlucHV0IGlzXG4gICAgICAgICAgLy8gZGVjbGFyZWQgaW4gYSBgQERpcmVjdGl2ZWAgb3IgYEBDb21wb25lbnRgIGRlY29yYXRvcidzIGBpbnB1dHNgIHByb3BlcnR5KSB0aGVyZSBpcyBub1xuICAgICAgICAgIC8vIGFzc2lnbm1lbnQgdGFyZ2V0IGF2YWlsYWJsZSwgc28gdGhpcyBmaWVsZCBpcyBza2lwcGVkLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgIXRoaXMudGNiLmVudi5jb25maWcuaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzICYmXG4gICAgICAgICAgICB0aGlzLmRpci5yZXN0cmljdGVkSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgYWNjZXNzIG1vZGlmaWVycyBpcyBkaXNhYmxlZCBhbmQgdGhlIGZpZWxkIGlzIHJlc3RyaWN0ZWRcbiAgICAgICAgICAvLyAoaS5lLiBwcml2YXRlL3Byb3RlY3RlZC9yZWFkb25seSksIGdlbmVyYXRlIGFuIGFzc2lnbm1lbnQgaW50byBhIHRlbXBvcmFyeSB2YXJpYWJsZVxuICAgICAgICAgIC8vIHRoYXQgaGFzIHRoZSB0eXBlIG9mIHRoZSBmaWVsZC4gVGhpcyBhY2hpZXZlcyB0eXBlLWNoZWNraW5nIGJ1dCBjaXJjdW12ZW50cyB0aGUgYWNjZXNzXG4gICAgICAgICAgLy8gbW9kaWZpZXJzLlxuICAgICAgICAgIGlmIChkaXJJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgICAgICAgY29uc3QgZGlyVHlwZVJlZiA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG4gICAgICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRpclR5cGVSZWYpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7dGhpcy5kaXIucmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUluZGV4ZWRBY2Nlc3NUeXBlTm9kZShcbiAgICAgICAgICAgICAgdHMuY3JlYXRlVHlwZVF1ZXJ5Tm9kZShkaXJJZCBhcyB0cy5JZGVudGlmaWVyKSxcbiAgICAgICAgICAgICAgdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGROYW1lKSkpO1xuICAgICAgICAgIGNvbnN0IHRlbXAgPSB0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSk7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodGVtcCk7XG4gICAgICAgICAgdGFyZ2V0ID0gaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGRpcklkID09PSBudWxsKSB7XG4gICAgICAgICAgICBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBUbyBnZXQgZXJyb3JzIGFzc2lnbiBkaXJlY3RseSB0byB0aGUgZmllbGRzIG9uIHRoZSBpbnN0YW5jZSwgdXNpbmcgcHJvcGVydHkgYWNjZXNzXG4gICAgICAgICAgLy8gd2hlbiBwb3NzaWJsZS4gU3RyaW5nIGxpdGVyYWwgZmllbGRzIG1heSBub3QgYmUgdmFsaWQgSlMgaWRlbnRpZmllcnMgc28gd2UgdXNlXG4gICAgICAgICAgLy8gbGl0ZXJhbCBlbGVtZW50IGFjY2VzcyBpbnN0ZWFkIGZvciB0aG9zZSBjYXNlcy5cbiAgICAgICAgICB0YXJnZXQgPSB0aGlzLmRpci5zdHJpbmdMaXRlcmFsSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkgP1xuICAgICAgICAgICAgICB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkTmFtZSkpIDpcbiAgICAgICAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZUlkZW50aWZpZXIoZmllbGROYW1lKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5wdXQuYXR0cmlidXRlLmtleVNwYW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGFkZFBhcnNlU3BhbkluZm8odGFyZ2V0LCBpbnB1dC5hdHRyaWJ1dGUua2V5U3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmluYWxseSB0aGUgYXNzaWdubWVudCBpcyBleHRlbmRlZCBieSBhc3NpZ25pbmcgaXQgaW50byB0aGUgdGFyZ2V0IGV4cHJlc3Npb24uXG4gICAgICAgIGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBhc3NpZ25tZW50KTtcbiAgICAgIH1cblxuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhhc3NpZ25tZW50LCBpbnB1dC5hdHRyaWJ1dGUuc291cmNlU3Bhbik7XG4gICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGFzc2lnbm1lbnQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgZmFsbGJhY2sgZXhwcmVzc2lvbiBpZiB0aGUgaW5mZXJlbmNlIG9mIGEgZGlyZWN0aXZlIHR5cGVcbiAqIHZpYSBgVGNiRGlyZWN0aXZlQ3Rvck9wYCByZXF1aXJlcyBhIHJlZmVyZW5jZSB0byBpdHMgb3duIHR5cGUuIFRoaXMgY2FuIGhhcHBlbiB1c2luZyBhIHRlbXBsYXRlXG4gKiByZWZlcmVuY2U6XG4gKlxuICogYGBgaHRtbFxuICogPHNvbWUtY21wICNyZWYgW3Byb3BdPVwicmVmLmZvb1wiPjwvc29tZS1jbXA+XG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wYCB3aWxsIGFkZCBhIHNlY29uZCBpbmZlcmVuY2Ugb2YgdGhlIGRpcmVjdGl2ZVxuICogdHlwZSB0byB0aGUgdHlwZS1jaGVjayBibG9jaywgdGhpcyB0aW1lIGNhbGxpbmcgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgY29uc3RydWN0b3Igd2l0aG91dCBhbnlcbiAqIGlucHV0IGV4cHJlc3Npb25zLiBUaGlzIGluZmVycyB0aGUgd2lkZXN0IHBvc3NpYmxlIHN1cGVydHlwZSBmb3IgdGhlIGRpcmVjdGl2ZSwgd2hpY2ggaXMgdXNlZCB0b1xuICogcmVzb2x2ZSBhbnkgcmVjdXJzaXZlIHJlZmVyZW5jZXMgcmVxdWlyZWQgdG8gaW5mZXIgdGhlIHJlYWwgdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IHR5cGVDdG9yID0gdGhpcy50Y2IuZW52LnR5cGVDdG9yRm9yKHRoaXMuZGlyKTtcbiAgICBjb25zdCBjaXJjdWxhclBsYWNlaG9sZGVyID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgdHlwZUN0b3IsIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKV0pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGNpcmN1bGFyUGxhY2Vob2xkZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZmVlZHMgZWxlbWVudHMgYW5kIHVuY2xhaW1lZCBwcm9wZXJ0aWVzIHRvIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAuXG4gKlxuICogVGhlIERPTSBzY2hlbWEgaXMgbm90IGNoZWNrZWQgdmlhIFRDQiBjb2RlIGdlbmVyYXRpb24uIEluc3RlYWQsIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW5nZXN0c1xuICogZWxlbWVudHMgYW5kIHByb3BlcnR5IGJpbmRpbmdzIGFuZCBhY2N1bXVsYXRlcyBzeW50aGV0aWMgYHRzLkRpYWdub3N0aWNgcyBvdXQtb2YtYmFuZC4gVGhlc2UgYXJlXG4gKiBsYXRlciBtZXJnZWQgd2l0aCB0aGUgZGlhZ25vc3RpY3MgZ2VuZXJhdGVkIGZyb20gdGhlIFRDQi5cbiAqXG4gKiBGb3IgY29udmVuaWVuY2UsIHRoZSBUQ0IgaXRlcmF0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpcyB1c2VkIHRvIGRyaXZlIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgdmlhXG4gKiB0aGUgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKi9cbmNsYXNzIFRjYkRvbVNjaGVtYUNoZWNrZXJPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgcHJpdmF0ZSBjaGVja0VsZW1lbnQ6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHRoaXMuY2hlY2tFbGVtZW50KSB7XG4gICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrRWxlbWVudCh0aGlzLnRjYi5pZCwgdGhpcy5lbGVtZW50LCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrUHJvcGVydHkoXG4gICAgICAgICAgICAgIHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHByb3BlcnR5TmFtZSwgYmluZGluZy5zb3VyY2VTcGFuLCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5cbi8qKlxuICogTWFwcGluZyBiZXR3ZWVuIGF0dHJpYnV0ZXMgbmFtZXMgdGhhdCBkb24ndCBjb3JyZXNwb25kIHRvIHRoZWlyIGVsZW1lbnQgcHJvcGVydHkgbmFtZXMuXG4gKiBOb3RlOiB0aGlzIG1hcHBpbmcgaGFzIHRvIGJlIGtlcHQgaW4gc3luYyB3aXRoIHRoZSBlcXVhbGx5IG5hbWVkIG1hcHBpbmcgaW4gdGhlIHJ1bnRpbWUuXG4gKi9cbmNvbnN0IEFUVFJfVE9fUFJPUDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2Zvcm1hY3Rpb24nOiAnZm9ybUFjdGlvbicsXG4gICdpbm5lckh0bWwnOiAnaW5uZXJIVE1MJyxcbiAgJ3JlYWRvbmx5JzogJ3JlYWRPbmx5JyxcbiAgJ3RhYmluZGV4JzogJ3RhYkluZGV4Jyxcbn07XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIGlucHV0c1wiIC0gYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaCB3ZXJlXG4gKiBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MIGVsZW1lbnRcbiAqIGl0c2VsZi5cbiAqXG4gKiBDdXJyZW50bHksIG9ubHkgdGhlIGV4cHJlc3Npb25zIG9mIHRoZXNlIGJpbmRpbmdzIGFyZSBjaGVja2VkLiBUaGUgdGFyZ2V0cyBvZiB0aGUgYmluZGluZ3MgYXJlXG4gKiBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEgdmlhIGEgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkSW5wdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkSW5wdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBgdGhpcy5pbnB1dHNgIGNvbnRhaW5zIG9ubHkgdGhvc2UgYmluZGluZ3Mgbm90IG1hdGNoZWQgYnkgYW55IGRpcmVjdGl2ZS4gVGhlc2UgYmluZGluZ3MgZ28gdG9cbiAgICAvLyB0aGUgZWxlbWVudCBpdHNlbGYuXG4gICAgbGV0IGVsSWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBleHByID0gdGNiRXhwcmVzc2lvbihiaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIGNoZWNraW5nIHRoZSB0eXBlIG9mIGJpbmRpbmdzIGlzIGRpc2FibGVkLCBjYXN0IHRoZSByZXN1bHRpbmcgZXhwcmVzc2lvbiB0byAnYW55J1xuICAgICAgICAvLyBiZWZvcmUgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgIGV4cHIgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tQmluZGluZ3MgJiYgYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgICBpZiAoYmluZGluZy5uYW1lICE9PSAnc3R5bGUnICYmIGJpbmRpbmcubmFtZSAhPT0gJ2NsYXNzJykge1xuICAgICAgICAgIGlmIChlbElkID09PSBudWxsKSB7XG4gICAgICAgICAgICBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEEgZGlyZWN0IGJpbmRpbmcgdG8gYSBwcm9wZXJ0eS5cbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSBBVFRSX1RPX1BST1BbYmluZGluZy5uYW1lXSB8fCBiaW5kaW5nLm5hbWU7XG4gICAgICAgICAgY29uc3QgcHJvcCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZWxJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChwcm9wZXJ0eU5hbWUpKTtcbiAgICAgICAgICBjb25zdCBzdG10ID0gdHMuY3JlYXRlQmluYXJ5KHByb3AsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhzdG10LCBiaW5kaW5nLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBIGJpbmRpbmcgdG8gYW4gYW5pbWF0aW9uLCBhdHRyaWJ1dGUsIGNsYXNzIG9yIHN0eWxlLiBGb3Igbm93LCBvbmx5IHZhbGlkYXRlIHRoZSByaWdodC1cbiAgICAgICAgLy8gaGFuZCBzaWRlIG9mIHRoZSBleHByZXNzaW9uLlxuICAgICAgICAvLyBUT0RPOiBwcm9wZXJseSBjaGVjayBjbGFzcyBhbmQgc3R5bGUgYmluZGluZ3MuXG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBvdXRwdXRzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZGlySWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgY29uc3Qgb3V0cHV0cyA9IHRoaXMuZGlyLm91dHB1dHM7XG5cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiB0aGlzLm5vZGUub3V0cHV0cykge1xuICAgICAgaWYgKG91dHB1dC50eXBlICE9PSBQYXJzZWRFdmVudFR5cGUuUmVndWxhciB8fCAhb3V0cHV0cy5oYXNCaW5kaW5nUHJvcGVydHlOYW1lKG91dHB1dC5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogY29uc2lkZXIgc3VwcG9ydGluZyBtdWx0aXBsZSBmaWVsZHMgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eSBuYW1lIGZvciBvdXRwdXRzLlxuICAgICAgY29uc3QgZmllbGQgPSBvdXRwdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShvdXRwdXQubmFtZSkhWzBdLmNsYXNzUHJvcGVydHlOYW1lO1xuXG4gICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cykge1xuICAgICAgICAvLyBGb3Igc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMsIGdlbmVyYXRlIGEgY2FsbCB0byB0aGUgYHN1YnNjcmliZWAgbWV0aG9kXG4gICAgICAgIC8vIG9uIHRoZSBkaXJlY3RpdmUncyBvdXRwdXQgZmllbGQgdG8gbGV0IHR5cGUgaW5mb3JtYXRpb24gZmxvdyBpbnRvIHRoZSBoYW5kbGVyIGZ1bmN0aW9uJ3NcbiAgICAgICAgLy8gYCRldmVudGAgcGFyYW1ldGVyLlxuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlIHRoYXQgdGhlIGBFdmVudEVtaXR0ZXI8VD5gIHR5cGUgZnJvbSAnQGFuZ3VsYXIvY29yZScgdGhhdCBpcyB0eXBpY2FsbHkgdXNlZCBmb3JcbiAgICAgICAgLy8gb3V0cHV0cyBoYXMgYSB0eXBpbmdzIGRlZmljaWVuY3kgaW4gaXRzIGBzdWJzY3JpYmVgIG1ldGhvZC4gVGhlIGdlbmVyaWMgdHlwZSBgVGAgaXMgbm90XG4gICAgICAgIC8vIGNhcnJpZWQgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbiwgd2hpY2ggaXMgdml0YWwgZm9yIGluZmVyZW5jZSBvZiB0aGUgdHlwZSBvZiBgJGV2ZW50YC5cbiAgICAgICAgLy8gQXMgYSB3b3JrYXJvdW5kLCB0aGUgZGlyZWN0aXZlJ3MgZmllbGQgaXMgcGFzc2VkIGludG8gYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBoYXMgYVxuICAgICAgICAvLyBzcGVjaWFsbHkgY3JhZnRlZCBzZXQgb2Ygc2lnbmF0dXJlcywgdG8gZWZmZWN0aXZlbHkgY2FzdCBgRXZlbnRFbWl0dGVyPFQ+YCB0byBzb21ldGhpbmdcbiAgICAgICAgLy8gdGhhdCBoYXMgYSBgc3Vic2NyaWJlYCBtZXRob2QgdGhhdCBwcm9wZXJseSBjYXJyaWVzIHRoZSBgVGAgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG5cbiAgICAgICAgaWYgKGRpcklkID09PSBudWxsKSB7XG4gICAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3V0cHV0RmllbGQgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkKSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8ob3V0cHV0RmllbGQsIG91dHB1dC5rZXlTcGFuKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0SGVscGVyID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUNhbGwodGhpcy50Y2IuZW52LmRlY2xhcmVPdXRwdXRIZWxwZXIoKSwgdW5kZWZpbmVkLCBbb3V0cHV0RmllbGRdKTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaWJlRm4gPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhvdXRwdXRIZWxwZXIsICdzdWJzY3JpYmUnKTtcbiAgICAgICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwoc3Vic2NyaWJlRm4sIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbaGFuZGxlcl0pO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGNhbGwsIG91dHB1dC5zb3VyY2VTcGFuKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjYWxsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cyBpcyBkaXNhYmxlZCwgZW1pdCBhIGhhbmRsZXIgZnVuY3Rpb24gd2hlcmUgdGhlXG4gICAgICAgIC8vIGAkZXZlbnRgIHBhcmFtZXRlciBoYXMgYW4gZXhwbGljaXQgYGFueWAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5BbnkpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH1cblxuICAgICAgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvci52aXNpdChcbiAgICAgICAgICBvdXRwdXQuaGFuZGxlciwgdGhpcy50Y2IuaWQsIHRoaXMudGNiLmJvdW5kVGFyZ2V0LCB0aGlzLnRjYi5vb2JSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogT3V0cHV0cyBhcmUgYSBgdHMuQ2FsbEV4cHJlc3Npb25gIHRoYXQgbG9vayBsaWtlIG9uZSBvZiB0aGUgdHdvOlxuICAgKiAgLSBgX291dHB1dEhlbHBlcihfdDFbXCJvdXRwdXRGaWVsZFwiXSkuc3Vic2NyaWJlKGhhbmRsZXIpO2BcbiAgICogIC0gYF90MS5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIpO2BcbiAgICogVGhpcyBtZXRob2QgcmV2ZXJzZXMgdGhlIG9wZXJhdGlvbnMgdG8gY3JlYXRlIGEgY2FsbCBleHByZXNzaW9uIGZvciBhIGRpcmVjdGl2ZSBvdXRwdXQuXG4gICAqIEl0IHVucGFja3MgdGhlIGdpdmVuIGNhbGwgZXhwcmVzc2lvbiBhbmQgcmV0dXJucyB0aGUgb3JpZ2luYWwgZWxlbWVudCBhY2Nlc3MgKGkuZS5cbiAgICogYF90MVtcIm91dHB1dEZpZWxkXCJdYCBpbiB0aGUgZXhhbXBsZSBhYm92ZSkuIFJldHVybnMgYG51bGxgIGlmIHRoZSBnaXZlbiBjYWxsIGV4cHJlc3Npb24gaXMgbm90XG4gICAqIHRoZSBleHBlY3RlZCBzdHJ1Y3R1cmUgb2YgYW4gb3V0cHV0IGJpbmRpbmdcbiAgICovXG4gIHN0YXRpYyBkZWNvZGVPdXRwdXRDYWxsRXhwcmVzc2lvbihub2RlOiB0cy5DYWxsRXhwcmVzc2lvbik6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufG51bGwge1xuICAgIC8vIGBub2RlLmV4cHJlc3Npb25gID09PSBgX291dHB1dEhlbHBlcihfdDFbXCJvdXRwdXRGaWVsZFwiXSkuc3Vic2NyaWJlYCBvciBgX3QxLmFkZEV2ZW50TGlzdGVuZXJgXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pIHx8XG4gICAgICAgIG5vZGUuZXhwcmVzc2lvbi5uYW1lLnRleHQgPT09ICdhZGRFdmVudExpc3RlbmVyJykge1xuICAgICAgLy8gYGFkZEV2ZW50TGlzdGVuZXJgIG91dHB1dHMgZG8gbm90IGhhdmUgYW4gYEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uYCBmb3IgdGhlIG91dHB1dCBmaWVsZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIGBub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbmAgPT09IGBfb3V0cHV0SGVscGVyKF90MVtcIm91dHB1dEZpZWxkXCJdKWBcbiAgICBpZiAobm9kZS5leHByZXNzaW9uLmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgW291dHB1dEZpZWxkQWNjZXNzXSA9IG5vZGUuZXhwcmVzc2lvbi5leHByZXNzaW9uLmFyZ3VtZW50cztcbiAgICBpZiAoIXRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dEZpZWxkQWNjZXNzO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIG91dHB1dHNcIiAtIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgd2hpY2hcbiAqIHdlcmUgbm90IGF0dHJpYnV0ZWQgdG8gYW55IGRpcmVjdGl2ZSBvciBjb21wb25lbnQsIGFuZCBhcmUgaW5zdGVhZCBwcm9jZXNzZWQgYWdhaW5zdCB0aGUgSFRNTFxuICogZWxlbWVudCBpdHNlbGYuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkT3V0cHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgY2xhaW1lZE91dHB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGxldCBlbElkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB0aGlzIGNvdWxkIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMuZWxlbWVudC5vdXRwdXRzKSB7XG4gICAgICBpZiAodGhpcy5jbGFpbWVkT3V0cHV0cy5oYXMob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBldmVudCBoYW5kbGVyIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG91dHB1dC50eXBlID09PSBQYXJzZWRFdmVudFR5cGUuQW5pbWF0aW9uKSB7XG4gICAgICAgIC8vIEFuaW1hdGlvbiBvdXRwdXQgYmluZGluZ3MgYWx3YXlzIGhhdmUgYW4gYCRldmVudGAgcGFyYW1ldGVyIG9mIHR5cGUgYEFuaW1hdGlvbkV2ZW50YC5cbiAgICAgICAgY29uc3QgZXZlbnRUeXBlID0gdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA/XG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9hbmltYXRpb25zJywgJ0FuaW1hdGlvbkV2ZW50JykgOlxuICAgICAgICAgICAgRXZlbnRQYXJhbVR5cGUuQW55O1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgZXZlbnRUeXBlKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIERPTSBldmVudHMgaXMgZW5hYmxlZCwgZ2VuZXJhdGUgYSBjYWxsIHRvIGBhZGRFdmVudExpc3RlbmVyYCBvblxuICAgICAgICAvLyB0aGUgZWxlbWVudCBpbnN0YW5jZSBzbyB0aGF0IFR5cGVTY3JpcHQncyB0eXBlIGluZmVyZW5jZSBmb3JcbiAgICAgICAgLy8gYEhUTUxFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXJgIHVzaW5nIGBIVE1MRWxlbWVudEV2ZW50TWFwYCB0byBpbmZlciBhbiBhY2N1cmF0ZSB0eXBlIGZvclxuICAgICAgICAvLyBgJGV2ZW50YCBkZXBlbmRpbmcgb24gdGhlIGV2ZW50IG5hbWUuIEZvciB1bmtub3duIGV2ZW50IG5hbWVzLCBUeXBlU2NyaXB0IHJlc29ydHMgdG8gdGhlXG4gICAgICAgIC8vIGJhc2UgYEV2ZW50YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkluZmVyKTtcblxuICAgICAgICBpZiAoZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICAgIGVsSWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZWxJZCwgJ2FkZEV2ZW50TGlzdGVuZXInKSxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogYXJndW1lbnRzICovW3RzLmNyZWF0ZVN0cmluZ0xpdGVyYWwob3V0cHV0Lm5hbWUpLCBoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gaW5wdXRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGUgYCRldmVudGBcbiAgICAgICAgLy8gcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuXG4gICAgICBFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yLnZpc2l0KFxuICAgICAgICAgIG91dHB1dC5oYW5kbGVyLCB0aGlzLnRjYi5pZCwgdGhpcy50Y2IuYm91bmRUYXJnZXQsIHRoaXMudGNiLm9vYlJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgYSBjb21wbGV0aW9uIHBvaW50IGZvciB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gKlxuICogVGhpcyBjb21wbGV0aW9uIHBvaW50IGxvb2tzIGxpa2UgYGN0eC4gO2AgaW4gdGhlIFRDQiBvdXRwdXQsIGFuZCBkb2VzIG5vdCBwcm9kdWNlIGRpYWdub3N0aWNzLlxuICogVHlwZVNjcmlwdCBhdXRvY29tcGxldGlvbiBBUElzIGNhbiBiZSB1c2VkIGF0IHRoaXMgY29tcGxldGlvbiBwb2ludCAoYWZ0ZXIgdGhlICcuJykgdG8gcHJvZHVjZVxuICogYXV0b2NvbXBsZXRpb24gcmVzdWx0cyBvZiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzIGZyb20gdGhlIHRlbXBsYXRlJ3MgY29tcG9uZW50IGNvbnRleHQuXG4gKi9cbmNsYXNzIFRjYkNvbXBvbmVudENvbnRleHRDb21wbGV0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2NvcGU6IFNjb3BlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gZmFsc2U7XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBjdHggPSB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICBjb25zdCBjdHhEb3QgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhjdHgsICcnKTtcbiAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3MoY3R4RG90KTtcbiAgICBhZGRFeHByZXNzaW9uSWRlbnRpZmllcihjdHhEb3QsIEV4cHJlc3Npb25JZGVudGlmaWVyLkNPTVBPTkVOVF9DT01QTEVUSU9OKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGN0eERvdCkpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVmFsdWUgdXNlZCB0byBicmVhayBhIGNpcmN1bGFyIHJlZmVyZW5jZSBiZXR3ZWVuIGBUY2JPcGBzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgcmV0dXJuZWQgd2hlbmV2ZXIgYFRjYk9wYHMgaGF2ZSBhIGNpcmN1bGFyIGRlcGVuZGVuY3kuIFRoZSBleHByZXNzaW9uIGlzIGEgbm9uLW51bGxcbiAqIGFzc2VydGlvbiBvZiB0aGUgbnVsbCB2YWx1ZSAoaW4gVHlwZVNjcmlwdCwgdGhlIGV4cHJlc3Npb24gYG51bGwhYCkuIFRoaXMgY29uc3RydWN0aW9uIHdpbGwgaW5mZXJcbiAqIHRoZSBsZWFzdCBuYXJyb3cgdHlwZSBmb3Igd2hhdGV2ZXIgaXQncyBhc3NpZ25lZCB0by5cbiAqL1xuY29uc3QgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUiA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSk7XG5cbi8qKlxuICogT3ZlcmFsbCBnZW5lcmF0aW9uIGNvbnRleHQgZm9yIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICpcbiAqIGBDb250ZXh0YCBoYW5kbGVzIG9wZXJhdGlvbnMgZHVyaW5nIGNvZGUgZ2VuZXJhdGlvbiB3aGljaCBhcmUgZ2xvYmFsIHdpdGggcmVzcGVjdCB0byB0aGUgd2hvbGVcbiAqIGJsb2NrLiBJdCdzIHJlc3BvbnNpYmxlIGZvciB2YXJpYWJsZSBuYW1lIGFsbG9jYXRpb24gYW5kIG1hbmFnZW1lbnQgb2YgYW55IGltcG9ydHMgbmVlZGVkLiBJdFxuICogYWxzbyBjb250YWlucyB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaXRzZWxmLlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIHByaXZhdGUgbmV4dElkID0gMTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudjogRW52aXJvbm1lbnQsIHJlYWRvbmx5IGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgICByZWFkb25seSBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCByZWFkb25seSBpZDogVGVtcGxhdGVJZCxcbiAgICAgIHJlYWRvbmx5IGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwcml2YXRlIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgcmVhZG9ubHkgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSkge31cblxuICAvKipcbiAgICogQWxsb2NhdGUgYSBuZXcgdmFyaWFibGUgbmFtZSBmb3IgdXNlIHdpdGhpbiB0aGUgYENvbnRleHRgLlxuICAgKlxuICAgKiBDdXJyZW50bHkgdGhpcyB1c2VzIGEgbW9ub3RvbmljYWxseSBpbmNyZWFzaW5nIGNvdW50ZXIsIGJ1dCBpbiB0aGUgZnV0dXJlIHRoZSB2YXJpYWJsZSBuYW1lXG4gICAqIG1pZ2h0IGNoYW5nZSBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgZGF0YSBiZWluZyBzdG9yZWQuXG4gICAqL1xuICBhbGxvY2F0ZUlkKCk6IHRzLklkZW50aWZpZXIge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdCR7dGhpcy5uZXh0SWQrK31gKTtcbiAgfVxuXG4gIGdldFBpcGVCeU5hbWUobmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+fG51bGwge1xuICAgIGlmICghdGhpcy5waXBlcy5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5waXBlcy5nZXQobmFtZSkhO1xuICB9XG59XG5cbi8qKlxuICogTG9jYWwgc2NvcGUgd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrIGZvciBhIHBhcnRpY3VsYXIgdGVtcGxhdGUuXG4gKlxuICogVGhlIHRvcC1sZXZlbCB0ZW1wbGF0ZSBhbmQgZWFjaCBuZXN0ZWQgYDxuZy10ZW1wbGF0ZT5gIGhhdmUgdGhlaXIgb3duIGBTY29wZWAsIHdoaWNoIGV4aXN0IGluIGFcbiAqIGhpZXJhcmNoeS4gVGhlIHN0cnVjdHVyZSBvZiB0aGlzIGhpZXJhcmNoeSBtaXJyb3JzIHRoZSBzeW50YWN0aWMgc2NvcGVzIGluIHRoZSBnZW5lcmF0ZWQgdHlwZVxuICogY2hlY2sgYmxvY2ssIHdoZXJlIGVhY2ggbmVzdGVkIHRlbXBsYXRlIGlzIGVuY2FzZWQgaW4gYW4gYGlmYCBzdHJ1Y3R1cmUuXG4gKlxuICogQXMgYSB0ZW1wbGF0ZSdzIGBUY2JPcGBzIGFyZSBleGVjdXRlZCBpbiBhIGdpdmVuIGBTY29wZWAsIHN0YXRlbWVudHMgYXJlIGFkZGVkIHZpYVxuICogYGFkZFN0YXRlbWVudCgpYC4gV2hlbiB0aGlzIHByb2Nlc3NpbmcgaXMgY29tcGxldGUsIHRoZSBgU2NvcGVgIGNhbiBiZSB0dXJuZWQgaW50byBhIGB0cy5CbG9ja2BcbiAqIHZpYSBgcmVuZGVyVG9CbG9jaygpYC5cbiAqXG4gKiBJZiBhIGBUY2JPcGAgcmVxdWlyZXMgdGhlIG91dHB1dCBvZiBhbm90aGVyLCBpdCBjYW4gY2FsbCBgcmVzb2x2ZSgpYC5cbiAqL1xuY2xhc3MgU2NvcGUge1xuICAvKipcbiAgICogQSBxdWV1ZSBvZiBvcGVyYXRpb25zIHdoaWNoIG5lZWQgdG8gYmUgcGVyZm9ybWVkIHRvIGdlbmVyYXRlIHRoZSBUQ0IgY29kZSBmb3IgdGhpcyBzY29wZS5cbiAgICpcbiAgICogVGhpcyBhcnJheSBjYW4gY29udGFpbiBlaXRoZXIgYSBgVGNiT3BgIHdoaWNoIGhhcyB5ZXQgdG8gYmUgZXhlY3V0ZWQsIG9yIGEgYHRzLkV4cHJlc3Npb258bnVsbGBcbiAgICogcmVwcmVzZW50aW5nIHRoZSBtZW1vaXplZCByZXN1bHQgb2YgZXhlY3V0aW5nIHRoZSBvcGVyYXRpb24uIEFzIG9wZXJhdGlvbnMgYXJlIGV4ZWN1dGVkLCB0aGVpclxuICAgKiByZXN1bHRzIGFyZSB3cml0dGVuIGludG8gdGhlIGBvcFF1ZXVlYCwgb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIG9wZXJhdGlvbi5cbiAgICpcbiAgICogSWYgYW4gb3BlcmF0aW9uIGlzIGluIHRoZSBwcm9jZXNzIG9mIGJlaW5nIGV4ZWN1dGVkLCBpdCBpcyB0ZW1wb3JhcmlseSBvdmVyd3JpdHRlbiBoZXJlIHdpdGhcbiAgICogYElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFJgLiBUaGlzIHdheSwgaWYgYSBjeWNsZSBpcyBlbmNvdW50ZXJlZCB3aGVyZSBhbiBvcGVyYXRpb25cbiAgICogZGVwZW5kcyB0cmFuc2l0aXZlbHkgb24gaXRzIG93biByZXN1bHQsIHRoZSBpbm5lciBvcGVyYXRpb24gd2lsbCBpbmZlciB0aGUgbGVhc3QgbmFycm93IHR5cGVcbiAgICogdGhhdCBmaXRzIGluc3RlYWQuIFRoaXMgaGFzIHRoZSBzYW1lIHNlbWFudGljcyBhcyBUeXBlU2NyaXB0IGl0c2VsZiB3aGVuIHR5cGVzIGFyZSByZWZlcmVuY2VkXG4gICAqIGNpcmN1bGFybHkuXG4gICAqL1xuICBwcml2YXRlIG9wUXVldWU6IChUY2JPcHx0cy5FeHByZXNzaW9ufG51bGwpW10gPSBbXTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgYFRtcGxBc3RFbGVtZW50YHMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JFbGVtZW50T3BgIGluIHRoZSBgb3BRdWV1ZWBcbiAgICovXG4gIHByaXZhdGUgZWxlbWVudE9wTWFwID0gbmV3IE1hcDxUbXBsQXN0RWxlbWVudCwgbnVtYmVyPigpO1xuICAvKipcbiAgICogQSBtYXAgb2YgbWFwcyB3aGljaCB0cmFja3MgdGhlIGluZGV4IG9mIGBUY2JEaXJlY3RpdmVDdG9yT3BgcyBpbiB0aGUgYG9wUXVldWVgIGZvciBlYWNoXG4gICAqIGRpcmVjdGl2ZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgZGlyZWN0aXZlT3BNYXAgPVxuICAgICAgbmV3IE1hcDxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPj4oKTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgYFRtcGxBc3RSZWZlcmVuY2VgcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYlJlZmVyZW5jZU9wYCBpbiB0aGUgYG9wUXVldWVgXG4gICAqL1xuICBwcml2YXRlIHJlZmVyZW5jZU9wTWFwID0gbmV3IE1hcDxUbXBsQXN0UmVmZXJlbmNlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbW1lZGlhdGVseSBuZXN0ZWQgPG5nLXRlbXBsYXRlPnMgKHdpdGhpbiB0aGlzIGBTY29wZWApIHJlcHJlc2VudGVkIGJ5IGBUbXBsQXN0VGVtcGxhdGVgXG4gICAqIG5vZGVzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiVGVtcGxhdGVDb250ZXh0T3BgcyBpbiB0aGUgYG9wUXVldWVgLlxuICAgKi9cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUN0eE9wTWFwID0gbmV3IE1hcDxUbXBsQXN0VGVtcGxhdGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHZhcmlhYmxlcyBkZWNsYXJlZCBvbiB0aGUgdGVtcGxhdGUgdGhhdCBjcmVhdGVkIHRoaXMgYFNjb3BlYCAocmVwcmVzZW50ZWQgYnlcbiAgICogYFRtcGxBc3RWYXJpYWJsZWAgbm9kZXMpIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiVmFyaWFibGVPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHZhck1hcCA9IG5ldyBNYXA8VG1wbEFzdFZhcmlhYmxlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIFN0YXRlbWVudHMgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqXG4gICAqIEV4ZWN1dGluZyB0aGUgYFRjYk9wYHMgaW4gdGhlIGBvcFF1ZXVlYCBwb3B1bGF0ZXMgdGhpcyBhcnJheS5cbiAgICovXG4gIHByaXZhdGUgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgcGFyZW50OiBTY29wZXxudWxsID0gbnVsbCxcbiAgICAgIHByaXZhdGUgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBgU2NvcGVgIGdpdmVuIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIG9yIGEgbGlzdCBvZiBgVG1wbEFzdE5vZGVgcy5cbiAgICpcbiAgICogQHBhcmFtIHRjYiB0aGUgb3ZlcmFsbCBjb250ZXh0IG9mIFRDQiBnZW5lcmF0aW9uLlxuICAgKiBAcGFyYW0gcGFyZW50IHRoZSBgU2NvcGVgIG9mIHRoZSBwYXJlbnQgdGVtcGxhdGUgKGlmIGFueSkgb3IgYG51bGxgIGlmIHRoaXMgaXMgdGhlIHJvb3RcbiAgICogYFNjb3BlYC5cbiAgICogQHBhcmFtIHRlbXBsYXRlT3JOb2RlcyBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCByZXByZXNlbnRpbmcgdGhlIHRlbXBsYXRlIGZvciB3aGljaCB0b1xuICAgKiBjYWxjdWxhdGUgdGhlIGBTY29wZWAsIG9yIGEgbGlzdCBvZiBub2RlcyBpZiBubyBvdXRlciB0ZW1wbGF0ZSBvYmplY3QgaXMgYXZhaWxhYmxlLlxuICAgKiBAcGFyYW0gZ3VhcmQgYW4gZXhwcmVzc2lvbiB0aGF0IGlzIGFwcGxpZWQgdG8gdGhpcyBzY29wZSBmb3IgdHlwZSBuYXJyb3dpbmcgcHVycG9zZXMuXG4gICAqL1xuICBzdGF0aWMgZm9yTm9kZXMoXG4gICAgICB0Y2I6IENvbnRleHQsIHBhcmVudDogU2NvcGV8bnVsbCwgdGVtcGxhdGVPck5vZGVzOiBUbXBsQXN0VGVtcGxhdGV8KFRtcGxBc3ROb2RlW10pLFxuICAgICAgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCk6IFNjb3BlIHtcbiAgICBjb25zdCBzY29wZSA9IG5ldyBTY29wZSh0Y2IsIHBhcmVudCwgZ3VhcmQpO1xuXG4gICAgaWYgKHBhcmVudCA9PT0gbnVsbCAmJiB0Y2IuZW52LmNvbmZpZy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyKSB7XG4gICAgICAvLyBBZGQgYW4gYXV0b2NvbXBsZXRpb24gcG9pbnQgZm9yIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgIHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiQ29tcG9uZW50Q29udGV4dENvbXBsZXRpb25PcChzY29wZSkpO1xuICAgIH1cblxuICAgIGxldCBjaGlsZHJlbjogVG1wbEFzdE5vZGVbXTtcblxuICAgIC8vIElmIGdpdmVuIGFuIGFjdHVhbCBgVG1wbEFzdFRlbXBsYXRlYCBpbnN0YW5jZSwgdGhlbiBwcm9jZXNzIGFueSBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGl0XG4gICAgLy8gaGFzLlxuICAgIGlmICh0ZW1wbGF0ZU9yTm9kZXMgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIFRoZSB0ZW1wbGF0ZSdzIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBuZWVkIHRvIGJlIGFkZGVkIGFzIGBUY2JWYXJpYWJsZU9wYHMuXG4gICAgICBjb25zdCB2YXJNYXAgPSBuZXcgTWFwPHN0cmluZywgVG1wbEFzdFZhcmlhYmxlPigpO1xuXG4gICAgICBmb3IgKGNvbnN0IHYgb2YgdGVtcGxhdGVPck5vZGVzLnZhcmlhYmxlcykge1xuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHZhcmlhYmxlcyBvbiB0aGUgYFRtcGxBc3RUZW1wbGF0ZWAgYXJlIG9ubHkgZGVjbGFyZWQgb25jZS5cbiAgICAgICAgaWYgKCF2YXJNYXAuaGFzKHYubmFtZSkpIHtcbiAgICAgICAgICB2YXJNYXAuc2V0KHYubmFtZSwgdik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZmlyc3REZWNsID0gdmFyTWFwLmdldCh2Lm5hbWUpITtcbiAgICAgICAgICB0Y2Iub29iUmVjb3JkZXIuZHVwbGljYXRlVGVtcGxhdGVWYXIodGNiLmlkLCB2LCBmaXJzdERlY2wpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3BJbmRleCA9IHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiVmFyaWFibGVPcCh0Y2IsIHNjb3BlLCB0ZW1wbGF0ZU9yTm9kZXMsIHYpKSAtIDE7XG4gICAgICAgIHNjb3BlLnZhck1hcC5zZXQodiwgb3BJbmRleCk7XG4gICAgICB9XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2Rlcy5jaGlsZHJlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXM7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBjaGlsZHJlbikge1xuICAgICAgc2NvcGUuYXBwZW5kTm9kZShub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgYSBgdHMuRXhwcmVzc2lvbmAgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiBzb21lIG9wZXJhdGlvbiBpbiB0aGUgY3VycmVudCBgU2NvcGVgLFxuICAgKiBpbmNsdWRpbmcgYW55IHBhcmVudCBzY29wZShzKS4gVGhpcyBtZXRob2QgYWx3YXlzIHJldHVybnMgYSBtdXRhYmxlIGNsb25lIG9mIHRoZVxuICAgKiBgdHMuRXhwcmVzc2lvbmAgd2l0aCB0aGUgY29tbWVudHMgY2xlYXJlZC5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBgVG1wbEFzdE5vZGVgIG9mIHRoZSBvcGVyYXRpb24gaW4gcXVlc3Rpb24uIFRoZSBsb29rdXAgcGVyZm9ybWVkIHdpbGwgZGVwZW5kIG9uXG4gICAqIHRoZSB0eXBlIG9mIHRoaXMgbm9kZTpcbiAgICpcbiAgICogQXNzdW1pbmcgYGRpcmVjdGl2ZWAgaXMgbm90IHByZXNlbnQsIHRoZW4gYHJlc29sdmVgIHdpbGwgcmV0dXJuOlxuICAgKlxuICAgKiAqIGBUbXBsQXN0RWxlbWVudGAgLSByZXRyaWV2ZSB0aGUgZXhwcmVzc2lvbiBmb3IgdGhlIGVsZW1lbnQgRE9NIG5vZGVcbiAgICogKiBgVG1wbEFzdFRlbXBsYXRlYCAtIHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHZhcmlhYmxlXG4gICAqICogYFRtcGxBc3RWYXJpYWJsZWAgLSByZXRyaWV2ZSBhIHRlbXBsYXRlIGxldC0gdmFyaWFibGVcbiAgICogKiBgVG1wbEFzdFJlZmVyZW5jZWAgLSByZXRyaWV2ZSB2YXJpYWJsZSBjcmVhdGVkIGZvciB0aGUgbG9jYWwgcmVmXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RpdmUgaWYgcHJlc2VudCwgYSBkaXJlY3RpdmUgdHlwZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgdG9cbiAgICogbG9vayB1cCBpbnN0ZWFkIG9mIHRoZSBkZWZhdWx0IGZvciBhbiBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICByZXNvbHZlKFxuICAgICAgbm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZXxUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG9wZXJhdGlvbiBsb2NhbGx5LlxuICAgIGNvbnN0IHJlcyA9IHRoaXMucmVzb2x2ZUxvY2FsKG5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgaWYgKHJlcyAhPT0gbnVsbCkge1xuICAgICAgLy8gV2Ugd2FudCB0byBnZXQgYSBjbG9uZSBvZiB0aGUgcmVzb2x2ZWQgZXhwcmVzc2lvbiBhbmQgY2xlYXIgdGhlIHRyYWlsaW5nIGNvbW1lbnRzXG4gICAgICAvLyBzbyB0aGV5IGRvbid0IGNvbnRpbnVlIHRvIGFwcGVhciBpbiBldmVyeSBwbGFjZSB0aGUgZXhwcmVzc2lvbiBpcyB1c2VkLlxuICAgICAgLy8gQXMgYW4gZXhhbXBsZSwgdGhpcyB3b3VsZCBvdGhlcndpc2UgcHJvZHVjZTpcbiAgICAgIC8vIHZhciBfdDEgLyoqVDpESVIqLyAvKjEsMiovID0gX2N0b3IxKCk7XG4gICAgICAvLyBfdDEgLyoqVDpESVIqLyAvKjEsMiovLmlucHV0ID0gJ3ZhbHVlJztcbiAgICAgIC8vXG4gICAgICAvLyBJbiBhZGRpdGlvbiwgcmV0dXJuaW5nIGEgY2xvbmUgcHJldmVudHMgdGhlIGNvbnN1bWVyIG9mIGBTY29wZSNyZXNvbHZlYCBmcm9tXG4gICAgICAvLyBhdHRhY2hpbmcgY29tbWVudHMgYXQgdGhlIGRlY2xhcmF0aW9uIHNpdGUuXG5cbiAgICAgIGNvbnN0IGNsb25lID0gdHMuZ2V0TXV0YWJsZUNsb25lKHJlcyk7XG4gICAgICB0cy5zZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGNsb25lLCBbXSk7XG4gICAgICByZXR1cm4gY2xvbmU7XG4gICAgfSBlbHNlIGlmICh0aGlzLnBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gQ2hlY2sgd2l0aCB0aGUgcGFyZW50LlxuICAgICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmUobm9kZSwgZGlyZWN0aXZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSAke25vZGV9IC8gJHtkaXJlY3RpdmV9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHN0YXRlbWVudCB0byB0aGlzIHNjb3BlLlxuICAgKi9cbiAgYWRkU3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc3RhdGVtZW50cy5cbiAgICovXG4gIHJlbmRlcigpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm9wUXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIE9wdGlvbmFsIHN0YXRlbWVudHMgY2Fubm90IGJlIHNraXBwZWQgd2hlbiB3ZSBhcmUgZ2VuZXJhdGluZyB0aGUgVENCIGZvciB1c2VcbiAgICAgIC8vIGJ5IHRoZSBUZW1wbGF0ZVR5cGVDaGVja2VyLlxuICAgICAgY29uc3Qgc2tpcE9wdGlvbmFsID0gIXRoaXMudGNiLmVudi5jb25maWcuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgICAgIHRoaXMuZXhlY3V0ZU9wKGksIHNraXBPcHRpb25hbCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXRlbWVudHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBleHByZXNzaW9uIG9mIGFsbCB0ZW1wbGF0ZSBndWFyZHMgdGhhdCBhcHBseSB0byB0aGlzIHNjb3BlLCBpbmNsdWRpbmcgdGhvc2Ugb2ZcbiAgICogcGFyZW50IHNjb3Blcy4gSWYgbm8gZ3VhcmRzIGhhdmUgYmVlbiBhcHBsaWVkLCBudWxsIGlzIHJldHVybmVkLlxuICAgKi9cbiAgZ3VhcmRzKCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgbGV0IHBhcmVudEd1YXJkczogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5wYXJlbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIGd1YXJkcyBmcm9tIHRoZSBwYXJlbnQgc2NvcGUsIGlmIHByZXNlbnQuXG4gICAgICBwYXJlbnRHdWFyZHMgPSB0aGlzLnBhcmVudC5ndWFyZHMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ndWFyZCA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhpcyBzY29wZSBkb2VzIG5vdCBoYXZlIGEgZ3VhcmQsIHNvIHJldHVybiB0aGUgcGFyZW50J3MgZ3VhcmRzIGFzIGlzLlxuICAgICAgcmV0dXJuIHBhcmVudEd1YXJkcztcbiAgICB9IGVsc2UgaWYgKHBhcmVudEd1YXJkcyA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUncyBubyBndWFyZHMgZnJvbSB0aGUgcGFyZW50IHNjb3BlLCBzbyB0aGlzIHNjb3BlJ3MgZ3VhcmQgcmVwcmVzZW50cyBhbGwgYXZhaWxhYmxlXG4gICAgICAvLyBndWFyZHMuXG4gICAgICByZXR1cm4gdGhpcy5ndWFyZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQm90aCB0aGUgcGFyZW50IHNjb3BlIGFuZCB0aGlzIHNjb3BlIHByb3ZpZGUgYSBndWFyZCwgc28gY3JlYXRlIGEgY29tYmluYXRpb24gb2YgdGhlIHR3by5cbiAgICAgIC8vIEl0IGlzIGltcG9ydGFudCB0aGF0IHRoZSBwYXJlbnQgZ3VhcmQgaXMgdXNlZCBhcyBsZWZ0IG9wZXJhbmQsIGdpdmVuIHRoYXQgaXQgbWF5IHByb3ZpZGVcbiAgICAgIC8vIG5hcnJvd2luZyB0aGF0IGlzIHJlcXVpcmVkIGZvciB0aGlzIHNjb3BlJ3MgZ3VhcmQgdG8gYmUgdmFsaWQuXG4gICAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KHBhcmVudEd1YXJkcywgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgdGhpcy5ndWFyZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTG9jYWwoXG4gICAgICByZWY6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0VmFyaWFibGV8VG1wbEFzdFJlZmVyZW5jZSxcbiAgICAgIGRpcmVjdGl2ZT86IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAocmVmIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSAmJiB0aGlzLnJlZmVyZW5jZU9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy5yZWZlcmVuY2VPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAocmVmIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlICYmIHRoaXMudmFyTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlZhcmlhYmxlT3BgIGFzc29jaWF0ZWQgd2l0aCB0aGUgYFRtcGxBc3RWYXJpYWJsZWAuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy52YXJNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgJiYgZGlyZWN0aXZlID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIGNvbnRleHQgb2YgdGhlIGdpdmVuIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAocmVmIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgcmVmIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSAmJlxuICAgICAgICBkaXJlY3RpdmUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmRpcmVjdGl2ZU9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgYSBkaXJlY3RpdmUgb24gYW4gZWxlbWVudCBvciBzdWItdGVtcGxhdGUuXG4gICAgICBjb25zdCBkaXJNYXAgPSB0aGlzLmRpcmVjdGl2ZU9wTWFwLmdldChyZWYpITtcbiAgICAgIGlmIChkaXJNYXAuaGFzKGRpcmVjdGl2ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKGRpck1hcC5nZXQoZGlyZWN0aXZlKSEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCAmJiB0aGlzLmVsZW1lbnRPcE1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIHRoZSBET00gbm9kZSBvZiBhbiBlbGVtZW50IGluIHRoaXMgdGVtcGxhdGUuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy5lbGVtZW50T3BNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExpa2UgYGV4ZWN1dGVPcGAsIGJ1dCBhc3NlcnQgdGhhdCB0aGUgb3BlcmF0aW9uIGFjdHVhbGx5IHJldHVybmVkIGB0cy5FeHByZXNzaW9uYC5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZU9wKG9wSW5kZXg6IG51bWJlcik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlcyA9IHRoaXMuZXhlY3V0ZU9wKG9wSW5kZXgsIC8qIHNraXBPcHRpb25hbCAqLyBmYWxzZSk7XG4gICAgaWYgKHJlcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvciByZXNvbHZpbmcgb3BlcmF0aW9uLCBnb3QgbnVsbGApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYSBwYXJ0aWN1bGFyIGBUY2JPcGAgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgcmVwbGFjZXMgdGhlIG9wZXJhdGlvbiBpbiB0aGUgYG9wUXVldWVgIHdpdGggdGhlIHJlc3VsdCBvZiBleGVjdXRpb24gKG9uY2UgZG9uZSlcbiAgICogYW5kIGFsc28gcHJvdGVjdHMgYWdhaW5zdCBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgZnJvbSB0aGUgb3BlcmF0aW9uIHRvIGl0c2VsZiBieSB0ZW1wb3JhcmlseVxuICAgKiBzZXR0aW5nIHRoZSBvcGVyYXRpb24ncyByZXN1bHQgdG8gYSBzcGVjaWFsIGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGV4ZWN1dGVPcChvcEluZGV4OiBudW1iZXIsIHNraXBPcHRpb25hbDogYm9vbGVhbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3Qgb3AgPSB0aGlzLm9wUXVldWVbb3BJbmRleF07XG4gICAgaWYgKCEob3AgaW5zdGFuY2VvZiBUY2JPcCkpIHtcbiAgICAgIHJldHVybiBvcDtcbiAgICB9XG5cbiAgICBpZiAoc2tpcE9wdGlvbmFsICYmIG9wLm9wdGlvbmFsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uIGluIHRoZSBxdWV1ZSB0byBpdHMgY2lyY3VsYXIgZmFsbGJhY2suIElmIGV4ZWN1dGluZyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIHJlc3VsdHMgaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5LCB0aGlzIHdpbGwgcHJldmVudCBhbiBpbmZpbml0ZSBsb29wIGFuZCBhbGxvdyBmb3JcbiAgICAvLyB0aGUgcmVzb2x1dGlvbiBvZiBzdWNoIGN5Y2xlcy5cbiAgICB0aGlzLm9wUXVldWVbb3BJbmRleF0gPSBvcC5jaXJjdWxhckZhbGxiYWNrKCk7XG4gICAgY29uc3QgcmVzID0gb3AuZXhlY3V0ZSgpO1xuICAgIC8vIE9uY2UgdGhlIG9wZXJhdGlvbiBoYXMgZmluaXNoZWQgZXhlY3V0aW5nLCBpdCdzIHNhZmUgdG8gY2FjaGUgdGhlIHJlYWwgcmVzdWx0LlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IHJlcztcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmROb2RlKG5vZGU6IFRtcGxBc3ROb2RlKTogdm9pZCB7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgY29uc3Qgb3BJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JFbGVtZW50T3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKSAtIDE7XG4gICAgICB0aGlzLmVsZW1lbnRPcE1hcC5zZXQobm9kZSwgb3BJbmRleCk7XG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgdGhpcy5hcHBlbmROb2RlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tBbmRBcHBlbmRSZWZlcmVuY2VzT2ZOb2RlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gVGVtcGxhdGUgY2hpbGRyZW4gYXJlIHJlbmRlcmVkIGluIGEgY2hpbGQgc2NvcGUuXG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBjb25zdCBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUNvbnRleHRPcCh0aGlzLnRjYiwgdGhpcykpIC0gMTtcbiAgICAgIHRoaXMudGVtcGxhdGVDdHhPcE1hcC5zZXQobm9kZSwgY3R4SW5kZXgpO1xuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUZW1wbGF0ZUJvZGllcykge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGVtcGxhdGVCb2R5T3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5hbHdheXNDaGVja1NjaGVtYUluVGVtcGxhdGVCb2RpZXMpIHtcbiAgICAgICAgdGhpcy5hcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRleHRJbnRlcnBvbGF0aW9uT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0SWN1KSB7XG4gICAgICB0aGlzLmFwcGVuZEljdUV4cHJlc3Npb25zKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tBbmRBcHBlbmRSZWZlcmVuY2VzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcmVmIG9mIG5vZGUucmVmZXJlbmNlcykge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0UmVmZXJlbmNlVGFyZ2V0KHJlZik7XG5cbiAgICAgIGxldCBjdHhJbmRleDogbnVtYmVyO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgcmVmZXJlbmNlIGlzIGludmFsaWQgaWYgaXQgZG9lc24ndCBoYXZlIGEgdGFyZ2V0LCBzbyByZXBvcnQgaXQgYXMgYW4gZXJyb3IuXG4gICAgICAgIHRoaXMudGNiLm9vYlJlY29yZGVyLm1pc3NpbmdSZWZlcmVuY2VUYXJnZXQodGhpcy50Y2IuaWQsIHJlZik7XG5cbiAgICAgICAgLy8gQW55IHVzYWdlcyBvZiB0aGUgaW52YWxpZCByZWZlcmVuY2Ugd2lsbCBiZSByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9mIHR5cGUgYW55LlxuICAgICAgICBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JJbnZhbGlkUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMpKSAtIDE7XG4gICAgICB9IGVsc2UgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JSZWZlcmVuY2VPcCh0aGlzLnRjYiwgdGhpcywgcmVmLCBub2RlLCB0YXJnZXQpKSAtIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHhJbmRleCA9XG4gICAgICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMsIHJlZiwgbm9kZSwgdGFyZ2V0LmRpcmVjdGl2ZSkpIC0gMTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVmZXJlbmNlT3BNYXAuc2V0KHJlZiwgY3R4SW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgaW5wdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIGlucHV0cyBhcmUgdW5jbGFpbWVkIGlucHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChcbiAgICAgICAgICAgIG5ldyBUY2JEb21TY2hlbWFDaGVja2VyT3AodGhpcy50Y2IsIG5vZGUsIC8qIGNoZWNrRWxlbWVudCAqLyB0cnVlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlyTWFwID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZU9wID0gZGlyLmlzR2VuZXJpYyA/IG5ldyBUY2JEaXJlY3RpdmVDdG9yT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFRjYkRpcmVjdGl2ZVR5cGVPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIGNvbnN0IGRpckluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2goZGlyZWN0aXZlT3ApIC0gMTtcbiAgICAgIGRpck1hcC5zZXQoZGlyLCBkaXJJbmRleCk7XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuICAgIHRoaXMuZGlyZWN0aXZlT3BNYXAuc2V0KG5vZGUsIGRpck1hcCk7XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBpbnB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVtb3ZlIGFueSBpbnB1dHMgdGhhdCBpdCBjbGFpbXMgZnJvbSBgZWxlbWVudElucHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIG9mIGRpci5pbnB1dHMucHJvcGVydHlOYW1lcykge1xuICAgICAgICAgIGNsYWltZWRJbnB1dHMuYWRkKHByb3BlcnR5TmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZElucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcyB3aGljaCBtYXRjaCB0aGlzIGVsZW1lbnQsIHRoZW4gaXQncyBhIFwicGxhaW5cIiBET00gZWxlbWVudCAob3IgYVxuICAgICAgLy8gd2ViIGNvbXBvbmVudCksIGFuZCBzaG91bGQgYmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLiBJZiBhbnkgZGlyZWN0aXZlcyBtYXRjaCxcbiAgICAgIC8vIHdlIG11c3QgYXNzdW1lIHRoYXQgdGhlIGVsZW1lbnQgY291bGQgYmUgY3VzdG9tIChlaXRoZXIgYSBjb21wb25lbnQsIG9yIGEgZGlyZWN0aXZlIGxpa2VcbiAgICAgIC8vIDxyb3V0ZXItb3V0bGV0PikgYW5kIHNob3VsZG4ndCB2YWxpZGF0ZSB0aGUgZWxlbWVudCBuYW1lIGl0c2VsZi5cbiAgICAgIGNvbnN0IGNoZWNrRWxlbWVudCA9IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwO1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgY2hlY2tFbGVtZW50LCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBvdXRwdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRPdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwgfHwgZGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzLCB0aGVuIGFsbCBvdXRwdXRzIGFyZSB1bmNsYWltZWQgb3V0cHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUXVldWUgb3BlcmF0aW9ucyBmb3IgYWxsIGRpcmVjdGl2ZXMgdG8gY2hlY2sgdGhlIHJlbGV2YW50IG91dHB1dHMgZm9yIGEgZGlyZWN0aXZlLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikpO1xuICAgIH1cblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIG91dHB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVnaXN0ZXIgYW55IG91dHB1dHMgdGhhdCBpdCBjbGFpbXMgaW4gYGNsYWltZWRPdXRwdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBvdXRwdXRQcm9wZXJ0eSBvZiBkaXIub3V0cHV0cy5wcm9wZXJ0eU5hbWVzKSB7XG4gICAgICAgICAgY2xhaW1lZE91dHB1dHMuYWRkKG91dHB1dFByb3BlcnR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkT3V0cHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkT3V0cHV0cykpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGVlcFNjaGVtYUNoZWNrcyhub2RlczogVG1wbEFzdE5vZGVbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgICAgIGxldCBoYXNEaXJlY3RpdmVzOiBib29sZWFuO1xuICAgICAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGhhc0RpcmVjdGl2ZXMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBvZiBkaXIuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQocHJvcGVydHlOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgIWhhc0RpcmVjdGl2ZXMsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kSWN1RXhwcmVzc2lvbnMobm9kZTogVG1wbEFzdEljdSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgT2JqZWN0LnZhbHVlcyhub2RlLnZhcnMpKSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgdmFyaWFibGUpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwbGFjZWhvbGRlciBvZiBPYmplY3QudmFsdWVzKG5vZGUucGxhY2Vob2xkZXJzKSkge1xuICAgICAgaWYgKHBsYWNlaG9sZGVyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgcGxhY2Vob2xkZXIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRjYkJvdW5kSW5wdXQge1xuICBhdHRyaWJ1dGU6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZTtcbiAgZmllbGROYW1lczogQ2xhc3NQcm9wZXJ0eU5hbWVbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGBjdHhgIHBhcmFtZXRlciB0byB0aGUgdG9wLWxldmVsIFRDQiBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgcGFyYW1ldGVyIHdpdGggYSB0eXBlIGVxdWl2YWxlbnQgdG8gdGhlIGNvbXBvbmVudCB0eXBlLCB3aXRoIGFsbCBnZW5lcmljIHR5cGVcbiAqIHBhcmFtZXRlcnMgbGlzdGVkICh3aXRob3V0IHRoZWlyIGdlbmVyaWMgYm91bmRzKS5cbiAqL1xuZnVuY3Rpb24gdGNiQ3R4UGFyYW0oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbmFtZTogdHMuRW50aXR5TmFtZSxcbiAgICB1c2VHZW5lcmljVHlwZTogYm9vbGVhbik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uIHtcbiAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLlR5cGVOb2RlW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvLyBDaGVjayBpZiB0aGUgY29tcG9uZW50IGlzIGdlbmVyaWMsIGFuZCBwYXNzIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGlmIHNvLlxuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHVzZUdlbmVyaWNUeXBlKSB7XG4gICAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAoKCkgPT4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH1cbiAgfVxuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovICdjdHgnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gYEFTVGAgZXhwcmVzc2lvbiBhbmQgY29udmVydCBpdCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLCBnZW5lcmF0aW5nIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBjb3JyZWN0IGlkZW50aWZpZXJzIGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICovXG5mdW5jdGlvbiB0Y2JFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdGNiOiBDb250ZXh0LCBwcm90ZWN0ZWQgc2NvcGU6IFNjb3BlKSB7fVxuXG4gIHRyYW5zbGF0ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkXG4gICAgLy8gd2hpY2ggaW50ZXJwcmV0cyBzcGVjaWZpYyBleHByZXNzaW9uIG5vZGVzIHRoYXQgaW50ZXJhY3Qgd2l0aCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgLiBUaGVzZVxuICAgIC8vIG5vZGVzIGFjdHVhbGx5IHJlZmVyIHRvIGlkZW50aWZpZXJzIHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KGFzdCwgYXN0ID0+IHRoaXMucmVzb2x2ZShhc3QpLCB0aGlzLnRjYi5lbnYuY29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFuIGBBU1RgIGV4cHJlc3Npb24gd2l0aGluIHRoZSBnaXZlbiBzY29wZS5cbiAgICpcbiAgICogU29tZSBgQVNUYCBleHByZXNzaW9ucyByZWZlciB0byB0b3AtbGV2ZWwgY29uY2VwdHMgKHJlZmVyZW5jZXMsIHZhcmlhYmxlcywgdGhlIGNvbXBvbmVudFxuICAgKiBjb250ZXh0KS4gVGhpcyBtZXRob2QgYXNzaXN0cyBpbiByZXNvbHZpbmcgdGhvc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhpcyBleHByZXNzaW9uLiBJZiBubyBzdWNoIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW5cbiAgICAgIC8vIHRoZSBleHByZXNzaW9uIGlzIHJlZmVyZW5jaW5nIHRoZSB0b3AtbGV2ZWwgY29tcG9uZW50IGNvbnRleHQuIEluIHRoYXQgY2FzZSwgYG51bGxgIGlzXG4gICAgICAvLyByZXR1cm5lZCBoZXJlIHRvIGxldCBpdCBmYWxsIHRocm91Z2ggcmVzb2x1dGlvbiBzbyBpdCB3aWxsIGJlIGNhdWdodCB3aGVuIHRoZVxuICAgICAgLy8gYEltcGxpY2l0UmVjZWl2ZXJgIGlzIHJlc29sdmVkIGluIHRoZSBicmFuY2ggYmVsb3cuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC52YWx1ZSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIC8vIEFTVCBpbnN0YW5jZXMgcmVwcmVzZW50aW5nIHZhcmlhYmxlcyBhbmQgcmVmZXJlbmNlcyBsb29rIHZlcnkgc2ltaWxhciB0byBwcm9wZXJ0eSByZWFkc1xuICAgICAgLy8gb3IgbWV0aG9kIGNhbGxzIGZyb20gdGhlIGNvbXBvbmVudCBjb250ZXh0OiBib3RoIGhhdmUgdGhlIHNoYXBlXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlciwgJ3Byb3BOYW1lJykgb3IgTWV0aG9kQ2FsbChJbXBsaWNpdFJlY2VpdmVyLCAnbWV0aG9kTmFtZScpLlxuICAgICAgLy9cbiAgICAgIC8vIGB0cmFuc2xhdGVgIHdpbGwgZmlyc3QgdHJ5IHRvIGByZXNvbHZlYCB0aGUgb3V0ZXIgUHJvcGVydHlSZWFkL01ldGhvZENhbGwuIElmIHRoaXMgd29ya3MsXG4gICAgICAvLyBpdCdzIGJlY2F1c2UgdGhlIGBCb3VuZFRhcmdldGAgZm91bmQgYW4gZXhwcmVzc2lvbiB0YXJnZXQgZm9yIHRoZSB3aG9sZSBleHByZXNzaW9uLCBhbmRcbiAgICAgIC8vIHRoZXJlZm9yZSBgdHJhbnNsYXRlYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXRcbiAgICAgIC8vIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsLlxuICAgICAgLy9cbiAgICAgIC8vIFRoZXJlZm9yZSBpZiBgcmVzb2x2ZWAgaXMgY2FsbGVkIG9uIGFuIGBJbXBsaWNpdFJlY2VpdmVyYCwgaXQncyBiZWNhdXNlIG5vIG91dGVyXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbCByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSwgYW5kIHRoZXJlZm9yZSB0aGlzIGlzIGFcbiAgICAgIC8vIHByb3BlcnR5IHJlYWQgb3IgbWV0aG9kIGNhbGwgb24gdGhlIGNvbXBvbmVudCBjb250ZXh0IGl0c2VsZi5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlKSB7XG4gICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmV4cCk7XG4gICAgICBjb25zdCBwaXBlUmVmID0gdGhpcy50Y2IuZ2V0UGlwZUJ5TmFtZShhc3QubmFtZSk7XG4gICAgICBsZXQgcGlwZTogdHMuRXhwcmVzc2lvbnxudWxsO1xuICAgICAgaWYgKHBpcGVSZWYgPT09IG51bGwpIHtcbiAgICAgICAgLy8gTm8gcGlwZSBieSB0aGF0IG5hbWUgZXhpc3RzIGluIHNjb3BlLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvci5cbiAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1BpcGUodGhpcy50Y2IuaWQsIGFzdCk7XG5cbiAgICAgICAgLy8gVXNlIGFuICdhbnknIHZhbHVlIHRvIGF0IGxlYXN0IGFsbG93IHRoZSByZXN0IG9mIHRoZSBleHByZXNzaW9uIHRvIGJlIGNoZWNrZWQuXG4gICAgICAgIHBpcGUgPSBOVUxMX0FTX0FOWTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZlBpcGVzKSB7XG4gICAgICAgIC8vIFVzZSBhIHZhcmlhYmxlIGRlY2xhcmVkIGFzIHRoZSBwaXBlJ3MgdHlwZS5cbiAgICAgICAgcGlwZSA9IHRoaXMudGNiLmVudi5waXBlSW5zdChwaXBlUmVmKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFVzZSBhbiAnYW55JyB2YWx1ZSB3aGVuIG5vdCBjaGVja2luZyB0aGUgdHlwZSBvZiB0aGUgcGlwZS5cbiAgICAgICAgcGlwZSA9IE5VTExfQVNfQU5ZO1xuICAgICAgfVxuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0c0NhbGxNZXRob2QocGlwZSwgJ3RyYW5zZm9ybScsIFtleHByLCAuLi5hcmdzXSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBhc3QgaW5zdGFuY2VvZiBNZXRob2RDYWxsICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBUaGlzUmVjZWl2ZXIpKSB7XG4gICAgICAvLyBSZXNvbHZlIHRoZSBzcGVjaWFsIGAkYW55KGV4cHIpYCBzeW50YXggdG8gaW5zZXJ0IGEgY2FzdCBvZiB0aGUgYXJndW1lbnQgdG8gdHlwZSBgYW55YC5cbiAgICAgIC8vIGAkYW55KGV4cHIpYCAtPiBgZXhwciBhcyBhbnlgXG4gICAgICBpZiAoYXN0Lm5hbWUgPT09ICckYW55JyAmJiBhc3QuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5hcmdzWzBdKTtcbiAgICAgICAgY29uc3QgZXhwckFzQW55ID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihleHByLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZVBhcmVuKGV4cHJBc0FueSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhlIG1ldGhvZCwgYW5kIGdlbmVyYXRlIHRoZSBtZXRob2QgY2FsbCBpZiBhIHRhcmdldFxuICAgICAgLy8gY291bGQgYmUgcmVzb2x2ZWQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW4gdGhlIG1ldGhvZCBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsXG4gICAgICAvLyBjb21wb25lbnQgY29udGV4dCwgaW4gd2hpY2ggY2FzZSBgbnVsbGAgaXMgcmV0dXJuZWQgdG8gbGV0IHRoZSBgSW1wbGljaXRSZWNlaXZlcmAgYmVpbmdcbiAgICAgIC8vIHJlc29sdmVkIHRvIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgIGNvbnN0IHJlY2VpdmVyID0gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1ldGhvZCA9IHdyYXBGb3JEaWFnbm9zdGljcyhyZWNlaXZlcik7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMudHJhbnNsYXRlKGFyZykpO1xuICAgICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUNhbGwobWV0aG9kLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBBU1QgaXNuJ3Qgc3BlY2lhbCBhZnRlciBhbGwuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgYSBnaXZlbiBleHByZXNzaW9uLCBhbmQgdHJhbnNsYXRlcyBpdCBpbnRvIHRoZVxuICAgKiBhcHByb3ByaWF0ZSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZXByZXNlbnRzIHRoZSBib3VuZCB0YXJnZXQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVGFyZ2V0KGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBiaW5kaW5nID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmIChiaW5kaW5nID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByID0gdGhpcy5zY29wZS5yZXNvbHZlKGJpbmRpbmcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUsIGluZmVycmluZyBhIHR5cGUgZm9yXG4gKiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGZyb20gYW55IGJvdW5kIGlucHV0cy5cbiAqL1xuZnVuY3Rpb24gdGNiQ2FsbFR5cGVDdG9yKFxuICAgIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCwgaW5wdXRzOiBUY2JEaXJlY3RpdmVJbnB1dFtdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHR5cGVDdG9yID0gdGNiLmVudi50eXBlQ3RvckZvcihkaXIpO1xuXG4gIC8vIENvbnN0cnVjdCBhbiBhcnJheSBvZiBgdHMuUHJvcGVydHlBc3NpZ25tZW50YHMgZm9yIGVhY2ggb2YgdGhlIGRpcmVjdGl2ZSdzIGlucHV0cy5cbiAgY29uc3QgbWVtYmVycyA9IGlucHV0cy5tYXAoaW5wdXQgPT4ge1xuICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoaW5wdXQuZmllbGQpO1xuXG4gICAgaWYgKGlucHV0LnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IGlucHV0LmV4cHJlc3Npb247XG4gICAgICBpZiAoIXRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYXNzaWdubWVudCA9IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIGFzc2lnbm1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEEgdHlwZSBjb25zdHJ1Y3RvciBpcyByZXF1aXJlZCB0byBiZSBjYWxsZWQgd2l0aCBhbGwgaW5wdXQgcHJvcGVydGllcywgc28gYW55IHVuc2V0XG4gICAgICAvLyBpbnB1dHMgYXJlIHNpbXBseSBhc3NpZ25lZCBhIHZhbHVlIG9mIHR5cGUgYGFueWAgdG8gaWdub3JlIHRoZW0uXG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5TmFtZSwgTlVMTF9BU19BTlkpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2FsbCB0aGUgYG5nVHlwZUN0b3JgIG1ldGhvZCBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzLCB3aXRoIGFuIG9iamVjdCBsaXRlcmFsIGFyZ3VtZW50IGNyZWF0ZWRcbiAgLy8gZnJvbSB0aGUgbWF0Y2hlZCBpbnB1dHMuXG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyB0eXBlQ3RvcixcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9bdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKV0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb3VuZElucHV0cyhcbiAgICBkaXJlY3RpdmU6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgdGNiOiBDb250ZXh0KTogVGNiQm91bmRJbnB1dFtdIHtcbiAgY29uc3QgYm91bmRJbnB1dHM6IFRjYkJvdW5kSW5wdXRbXSA9IFtdO1xuXG4gIGNvbnN0IHByb2Nlc3NBdHRyaWJ1dGUgPSAoYXR0cjogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlKSA9PiB7XG4gICAgLy8gU2tpcCBub24tcHJvcGVydHkgYmluZGluZ3MuXG4gICAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgYXR0ci50eXBlICE9PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNraXAgdGV4dCBhdHRyaWJ1dGVzIGlmIGNvbmZpZ3VyZWQgdG8gZG8gc28uXG4gICAgaWYgKCF0Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgJiYgYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2tpcCB0aGUgYXR0cmlidXRlIGlmIHRoZSBkaXJlY3RpdmUgZG9lcyBub3QgaGF2ZSBhbiBpbnB1dCBmb3IgaXQuXG4gICAgY29uc3QgaW5wdXRzID0gZGlyZWN0aXZlLmlucHV0cy5nZXRCeUJpbmRpbmdQcm9wZXJ0eU5hbWUoYXR0ci5uYW1lKTtcbiAgICBpZiAoaW5wdXRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGZpZWxkTmFtZXMgPSBpbnB1dHMubWFwKGlucHV0ID0+IGlucHV0LmNsYXNzUHJvcGVydHlOYW1lKTtcbiAgICBib3VuZElucHV0cy5wdXNoKHthdHRyaWJ1dGU6IGF0dHIsIGZpZWxkTmFtZXN9KTtcbiAgfTtcblxuICBub2RlLmlucHV0cy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICBub2RlLmF0dHJpYnV0ZXMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICBub2RlLnRlbXBsYXRlQXR0cnMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgfVxuXG4gIHJldHVybiBib3VuZElucHV0cztcbn1cblxuLyoqXG4gKiBUcmFuc2xhdGVzIHRoZSBnaXZlbiBhdHRyaWJ1dGUgYmluZGluZyB0byBhIGB0cy5FeHByZXNzaW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNsYXRlSW5wdXQoXG4gICAgYXR0cjogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBpZiAoYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSkge1xuICAgIC8vIFByb2R1Y2UgYW4gZXhwcmVzc2lvbiByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHRoZSBiaW5kaW5nLlxuICAgIHJldHVybiB0Y2JFeHByZXNzaW9uKGF0dHIudmFsdWUsIHRjYiwgc2NvcGUpO1xuICB9IGVsc2Uge1xuICAgIC8vIEZvciByZWd1bGFyIGF0dHJpYnV0ZXMgd2l0aCBhIHN0YXRpYyBzdHJpbmcgdmFsdWUsIHVzZSB0aGUgcmVwcmVzZW50ZWQgc3RyaW5nIGxpdGVyYWwuXG4gICAgcmV0dXJuIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoYXR0ci52YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBpbnB1dCBiaW5kaW5nIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIGZpZWxkIG9mIGEgZGlyZWN0aXZlLlxuICovXG5pbnRlcmZhY2UgVGNiRGlyZWN0aXZlQm91bmRJbnB1dCB7XG4gIHR5cGU6ICdiaW5kaW5nJztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgYSBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlIHRoYXQgaXMgc2V0LlxuICAgKi9cbiAgZmllbGQ6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGB0cy5FeHByZXNzaW9uYCBjb3JyZXNwb25kaW5nIHdpdGggdGhlIGlucHV0IGJpbmRpbmcgZXhwcmVzc2lvbi5cbiAgICovXG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG5cbiAgLyoqXG4gICAqIFRoZSBzb3VyY2Ugc3BhbiBvZiB0aGUgZnVsbCBhdHRyaWJ1dGUgYmluZGluZy5cbiAgICovXG4gIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3Bhbjtcbn1cblxuLyoqXG4gKiBJbmRpY2F0ZXMgdGhhdCBhIGNlcnRhaW4gZmllbGQgb2YgYSBkaXJlY3RpdmUgZG9lcyBub3QgaGF2ZSBhIGNvcnJlc3BvbmRpbmcgaW5wdXQgYmluZGluZy5cbiAqL1xuaW50ZXJmYWNlIFRjYkRpcmVjdGl2ZVVuc2V0SW5wdXQge1xuICB0eXBlOiAndW5zZXQnO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiBhIGZpZWxkIG9uIHRoZSBkaXJlY3RpdmUgZm9yIHdoaWNoIG5vIGlucHV0IGJpbmRpbmcgaXMgcHJlc2VudC5cbiAgICovXG4gIGZpZWxkOiBzdHJpbmc7XG59XG5cbnR5cGUgVGNiRGlyZWN0aXZlSW5wdXQgPSBUY2JEaXJlY3RpdmVCb3VuZElucHV0fFRjYkRpcmVjdGl2ZVVuc2V0SW5wdXQ7XG5cbmNvbnN0IEVWRU5UX1BBUkFNRVRFUiA9ICckZXZlbnQnO1xuXG5jb25zdCBlbnVtIEV2ZW50UGFyYW1UeXBlIHtcbiAgLyogR2VuZXJhdGVzIGNvZGUgdG8gaW5mZXIgdGhlIHR5cGUgb2YgYCRldmVudGAgYmFzZWQgb24gaG93IHRoZSBsaXN0ZW5lciBpcyByZWdpc3RlcmVkLiAqL1xuICBJbmZlcixcblxuICAvKiBEZWNsYXJlcyB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgcGFyYW1ldGVyIGFzIGBhbnlgLiAqL1xuICBBbnksXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJvdyBmdW5jdGlvbiB0byBiZSB1c2VkIGFzIGhhbmRsZXIgZnVuY3Rpb24gZm9yIGV2ZW50IGJpbmRpbmdzLiBUaGUgaGFuZGxlclxuICogZnVuY3Rpb24gaGFzIGEgc2luZ2xlIHBhcmFtZXRlciBgJGV2ZW50YCBhbmQgdGhlIGJvdW5kIGV2ZW50J3MgaGFuZGxlciBgQVNUYCByZXByZXNlbnRlZCBhcyBhXG4gKiBUeXBlU2NyaXB0IGV4cHJlc3Npb24gYXMgaXRzIGJvZHkuXG4gKlxuICogV2hlbiBgZXZlbnRUeXBlYCBpcyBzZXQgdG8gYEluZmVyYCwgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciB3aWxsIG5vdCBoYXZlIGFuIGV4cGxpY2l0IHR5cGUuIFRoaXNcbiAqIGFsbG93cyBmb3IgdGhlIGNyZWF0ZWQgaGFuZGxlciBmdW5jdGlvbiB0byBoYXZlIGl0cyBgJGV2ZW50YCBwYXJhbWV0ZXIncyB0eXBlIGluZmVycmVkIGJhc2VkIG9uXG4gKiBob3cgaXQncyB1c2VkLCB0byBlbmFibGUgc3RyaWN0IHR5cGUgY2hlY2tpbmcgb2YgZXZlbnQgYmluZGluZ3MuIFdoZW4gc2V0IHRvIGBBbnlgLCB0aGUgYCRldmVudGBcbiAqIHBhcmFtZXRlciB3aWxsIGhhdmUgYW4gZXhwbGljaXQgYGFueWAgdHlwZSwgZWZmZWN0aXZlbHkgZGlzYWJsaW5nIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50XG4gKiBiaW5kaW5ncy4gQWx0ZXJuYXRpdmVseSwgYW4gZXhwbGljaXQgdHlwZSBjYW4gYmUgcGFzc2VkIGZvciB0aGUgYCRldmVudGAgcGFyYW1ldGVyLlxuICovXG5mdW5jdGlvbiB0Y2JDcmVhdGVFdmVudEhhbmRsZXIoXG4gICAgZXZlbnQ6IFRtcGxBc3RCb3VuZEV2ZW50LCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSxcbiAgICBldmVudFR5cGU6IEV2ZW50UGFyYW1UeXBlfHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGhhbmRsZXIgPSB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGV2ZW50LmhhbmRsZXIsIHRjYiwgc2NvcGUpO1xuXG4gIGxldCBldmVudFBhcmFtVHlwZTogdHMuVHlwZU5vZGV8dW5kZWZpbmVkO1xuICBpZiAoZXZlbnRUeXBlID09PSBFdmVudFBhcmFtVHlwZS5JbmZlcikge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKGV2ZW50VHlwZSA9PT0gRXZlbnRQYXJhbVR5cGUuQW55KSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgfSBlbHNlIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IGV2ZW50VHlwZTtcbiAgfVxuXG4gIC8vIE9idGFpbiBhbGwgZ3VhcmRzIHRoYXQgaGF2ZSBiZWVuIGFwcGxpZWQgdG8gdGhlIHNjb3BlIGFuZCBpdHMgcGFyZW50cywgYXMgdGhleSBoYXZlIHRvIGJlXG4gIC8vIHJlcGVhdGVkIHdpdGhpbiB0aGUgaGFuZGxlciBmdW5jdGlvbiBmb3IgdGhlaXIgbmFycm93aW5nIHRvIGJlIGluIGVmZmVjdCB3aXRoaW4gdGhlIGhhbmRsZXIuXG4gIGNvbnN0IGd1YXJkcyA9IHNjb3BlLmd1YXJkcygpO1xuXG4gIGxldCBib2R5OiB0cy5TdGF0ZW1lbnQgPSB0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpO1xuICBpZiAoZ3VhcmRzICE9PSBudWxsKSB7XG4gICAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBgaWZgIHN0YXRlbWVudCBjb250YWluaW5nIGFsbCBndWFyZHMgdGhhdCBoYXZlIHRvIGJlIGFwcGxpZWQuXG4gICAgYm9keSA9IHRzLmNyZWF0ZUlmKGd1YXJkcywgYm9keSk7XG4gIH1cblxuICBjb25zdCBldmVudFBhcmFtID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBFVkVOVF9QQVJBTUVURVIsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gZXZlbnRQYXJhbVR5cGUpO1xuXG4gIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkV4cHJlc3Npb24oXG4gICAgICAvKiBtb2RpZmllciAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1tldmVudFBhcmFtXSxcbiAgICAgIC8qIHR5cGUgKi8gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCksXG4gICAgICAvKiBib2R5ICovIHRzLmNyZWF0ZUJsb2NrKFtib2R5XSkpO1xufVxuXG4vKipcbiAqIFNpbWlsYXIgdG8gYHRjYkV4cHJlc3Npb25gLCB0aGlzIGZ1bmN0aW9uIGNvbnZlcnRzIHRoZSBwcm92aWRlZCBgQVNUYCBleHByZXNzaW9uIGludG8gYVxuICogYHRzLkV4cHJlc3Npb25gLCB3aXRoIHNwZWNpYWwgaGFuZGxpbmcgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHRoYXQgY2FuIGJlIHVzZWQgd2l0aGluIGV2ZW50XG4gKiBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gdGNiRXZlbnRIYW5kbGVyRXhwcmVzc2lvbihhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXZlbnRIYW5kbGVyVHJhbnNsYXRvciBleHRlbmRzIFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yIHtcbiAgcHJvdGVjdGVkIHJlc29sdmUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIC8vIFJlY29nbml6ZSBhIHByb3BlcnR5IHJlYWQgb24gdGhlIGltcGxpY2l0IHJlY2VpdmVyIGNvcnJlc3BvbmRpbmcgd2l0aCB0aGUgZXZlbnQgcGFyYW1ldGVyXG4gICAgLy8gdGhhdCBpcyBhdmFpbGFibGUgaW4gZXZlbnQgYmluZGluZ3MuIFNpbmNlIHRoaXMgdmFyaWFibGUgaXMgYSBwYXJhbWV0ZXIgb2YgdGhlIGhhbmRsZXJcbiAgICAvLyBmdW5jdGlvbiB0aGF0IHRoZSBjb252ZXJ0ZWQgZXhwcmVzc2lvbiBiZWNvbWVzIGEgY2hpbGQgb2YsIGp1c3QgY3JlYXRlIGEgcmVmZXJlbmNlIHRvIHRoZVxuICAgIC8vIHBhcmFtZXRlciBieSBpdHMgbmFtZS5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBUaGlzUmVjZWl2ZXIpICYmIGFzdC5uYW1lID09PSBFVkVOVF9QQVJBTUVURVIpIHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gdHMuY3JlYXRlSWRlbnRpZmllcihFVkVOVF9QQVJBTUVURVIpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhldmVudCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIucmVzb2x2ZShhc3QpO1xuICB9XG59XG4iXX0=