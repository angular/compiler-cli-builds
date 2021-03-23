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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/expression", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
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
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
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
                    if (dir.hasNgTemplateContextGuard) {
                        if (this_1.tcb.env.config.applyTemplateContextGuards) {
                            var ctx = this_1.scope.resolve(this_1.template);
                            var guardInvoke = ts_util_1.tsCallMethod(dirId, 'ngTemplateContextGuard', [dirInstId, ctx]);
                            diagnostics_1.addParseSpanInfo(guardInvoke, this_1.template.sourceSpan);
                            directiveGuards.push(guardInvoke);
                        }
                        else if (this_1.template.variables.length > 0 &&
                            this_1.tcb.env.config.suggestionsForSuboptimalTypeInference) {
                            // The compiler could have inferred a better type for the variables in this template,
                            // but was prevented from doing so by the type-checking configuration. Issue a warning
                            // diagnostic.
                            this_1.tcb.oobRecorder.suboptimalTypeInference(this_1.tcb.id, this_1.template.variables);
                        }
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
     * A `TcbOp` which constructs an instance of a directive. For generic directives, generic
     * parameters are set to `any` type.
     */
    var TcbDirectiveTypeOpBase = /** @class */ (function (_super) {
        tslib_1.__extends(TcbDirectiveTypeOpBase, _super);
        function TcbDirectiveTypeOpBase(tcb, scope, node, dir) {
            var _this = _super.call(this) || this;
            _this.tcb = tcb;
            _this.scope = scope;
            _this.node = node;
            _this.dir = dir;
            return _this;
        }
        Object.defineProperty(TcbDirectiveTypeOpBase.prototype, "optional", {
            get: function () {
                // The statement generated by this operation is only used to declare the directive's type and
                // won't report diagnostics by itself, so the operation is marked as optional to avoid
                // generating declarations for directives that don't have any inputs/outputs.
                return true;
            },
            enumerable: false,
            configurable: true
        });
        TcbDirectiveTypeOpBase.prototype.execute = function () {
            var dirRef = this.dir.ref;
            var rawType = this.tcb.env.referenceType(this.dir.ref);
            var type;
            if (this.dir.isGeneric === false || dirRef.node.typeParameters === undefined) {
                type = rawType;
            }
            else {
                if (!ts.isTypeReferenceNode(rawType)) {
                    throw new Error("Expected TypeReferenceNode when referencing the type for " + this.dir.ref.debugName);
                }
                var typeArguments = dirRef.node.typeParameters.map(function () { return ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword); });
                type = ts.factory.createTypeReferenceNode(rawType.typeName, typeArguments);
            }
            var id = this.tcb.allocateId();
            comments_1.addExpressionIdentifier(type, comments_1.ExpressionIdentifier.DIRECTIVE);
            diagnostics_1.addParseSpanInfo(type, this.node.startSourceSpan || this.node.sourceSpan);
            this.scope.addStatement(ts_util_1.tsDeclareVariable(id, type));
            return id;
        };
        return TcbDirectiveTypeOpBase;
    }(TcbOp));
    /**
     * A `TcbOp` which constructs an instance of a non-generic directive _without_ setting any of its
     * inputs. Inputs  are later set in the `TcbDirectiveInputsOp`. Type checking was found to be
     * faster when done in this way as opposed to `TcbDirectiveCtorOp` which is only necessary when the
     * directive is generic.
     *
     * Executing this operation returns a reference to the directive instance variable with its inferred
     * type.
     */
    var TcbNonGenericDirectiveTypeOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbNonGenericDirectiveTypeOp, _super);
        function TcbNonGenericDirectiveTypeOp() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Creates a variable declaration for this op's directive of the argument type. Returns the id of
         * the newly created variable.
         */
        TcbNonGenericDirectiveTypeOp.prototype.execute = function () {
            var dirRef = this.dir.ref;
            if (this.dir.isGeneric) {
                throw new Error("Assertion Error: expected " + dirRef.debugName + " not to be generic.");
            }
            return _super.prototype.execute.call(this);
        };
        return TcbNonGenericDirectiveTypeOp;
    }(TcbDirectiveTypeOpBase));
    /**
     * A `TcbOp` which constructs an instance of a generic directive with its generic parameters set
     * to `any` type. This op is like `TcbDirectiveTypeOp`, except that generic parameters are set to
     * `any` type. This is used for situations where we want to avoid inlining.
     *
     * Executing this operation returns a reference to the directive instance variable with its generic
     * type parameters set to `any`.
     */
    var TcbGenericDirectiveTypeWithAnyParamsOp = /** @class */ (function (_super) {
        tslib_1.__extends(TcbGenericDirectiveTypeWithAnyParamsOp, _super);
        function TcbGenericDirectiveTypeWithAnyParamsOp() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        TcbGenericDirectiveTypeWithAnyParamsOp.prototype.execute = function () {
            var dirRef = this.dir.ref;
            if (dirRef.node.typeParameters === undefined) {
                throw new Error("Assertion Error: expected typeParameters when creating a declaration for " + dirRef.debugName);
            }
            return _super.prototype.execute.call(this);
        };
        return TcbGenericDirectiveTypeWithAnyParamsOp;
    }(TcbDirectiveTypeOpBase));
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
                    // Skip text attributes if configured to do so.
                    if (!this.tcb.env.config.checkTypeOfAttributes &&
                        input.attribute instanceof compiler_1.TmplAstTextAttribute) {
                        continue;
                    }
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
                    // Ignore diagnostics for text attributes if configured to do so.
                    if (!this.tcb.env.config.checkTypeOfAttributes &&
                        input.attribute instanceof compiler_1.TmplAstTextAttribute) {
                        comments_1.markIgnoreDiagnostics(assignment);
                    }
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
                    if (dirId === null) {
                        dirId = this.scope.resolve(this.node, this.dir);
                    }
                    var outputField = ts.createElementAccess(dirId, ts.createStringLiteral(field));
                    diagnostics_1.addParseSpanInfo(outputField, output.keySpan);
                    if (this.tcb.env.config.checkTypeOfOutputEvents) {
                        // For strict checking of directive events, generate a call to the `subscribe` method
                        // on the directive's output field to let type information flow into the handler function's
                        // `$event` parameter.
                        var handler = tcbCreateEventHandler(output, this.tcb, this.scope, 0 /* Infer */);
                        var subscribeFn = ts.createPropertyAccess(outputField, 'subscribe');
                        var call = ts.createCall(subscribeFn, /* typeArguments */ undefined, [handler]);
                        diagnostics_1.addParseSpanInfo(call, output.sourceSpan);
                        this.scope.addStatement(ts.createExpressionStatement(call));
                    }
                    else {
                        // If strict checking of directive events is disabled:
                        //
                        // * We still generate the access to the output field as a statement in the TCB so consumers
                        //   of the `TemplateTypeChecker` can still find the node for the class member for the
                        //   output.
                        // * Emit a handler function where the `$event` parameter has an explicit `any` type.
                        this.scope.addStatement(ts.createExpressionStatement(outputField));
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
                        var propertyAccess = ts.createPropertyAccess(elId, 'addEventListener');
                        diagnostics_1.addParseSpanInfo(propertyAccess, output.keySpan);
                        var call = ts.createCall(
                        /* expression */ propertyAccess, 
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
                    var directiveOp = void 0;
                    var host = this.tcb.env.reflector;
                    var dirRef = dir.ref;
                    if (!dir.isGeneric) {
                        // The most common case is that when a directive is not generic, we use the normal
                        // `TcbNonDirectiveTypeOp`.
                        directiveOp = new TcbNonGenericDirectiveTypeOp(this.tcb, this, node, dir);
                    }
                    else if (!type_constructor_1.requiresInlineTypeCtor(dirRef.node, host) ||
                        this.tcb.env.config.useInlineTypeConstructors) {
                        // For generic directives, we use a type constructor to infer types. If a directive requires
                        // an inline type constructor, then inlining must be available to use the
                        // `TcbDirectiveCtorOp`. If not we, we fallback to using `any` – see below.
                        directiveOp = new TcbDirectiveCtorOp(this.tcb, this, node, dir);
                    }
                    else {
                        // If inlining is not available, then we give up on infering the generic params, and use
                        // `any` type for the directive's generic parameters.
                        directiveOp = new TcbGenericDirectiveTypeWithAnyParamsOp(this.tcb, this, node, dir);
                    }
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
                    pipe = ts.createAsExpression(this.tcb.env.pipeInst(pipeRef), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                }
                var args = ast.args.map(function (arg) { return _this.translate(arg); });
                var methodAccess = ts.createPropertyAccess(pipe, 'transform');
                diagnostics_1.addParseSpanInfo(methodAccess, ast.nameSpan);
                var result = ts.createCall(
                /* expression */ methodAccess, 
                /* typeArguments */ undefined, tslib_1.__spread([expr], args));
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
        comments_1.addExpressionIdentifier(eventParam, comments_1.ExpressionIdentifier.EVENT_PARAMETER);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclksK0JBQWlDO0lBT2pDLG1GQUFnRztJQUNoRyx5RkFBc0c7SUFHdEcsdUZBQTBEO0lBRTFELHVHQUErRDtJQUMvRCxpRkFBMks7SUFDM0ssbUdBQTBEO0lBRTFEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQkc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsR0FBZ0IsRUFBRSxHQUFxRCxFQUFFLElBQW1CLEVBQzVGLElBQTRCLEVBQUUsZ0JBQWtDLEVBQ2hFLFdBQXdDO1FBQzFDLElBQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUNuQixHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3RixJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBVSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3RixJQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxtRUFBaUUsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO1NBQ3ZGO1FBQ0QsSUFB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RSxHQUFZLEVBQUUsS0FBWTtRQUNyRSxJQUFNLFVBQVUsR0FBRyxJQUFJLHlCQUF5QixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVEO1FBQXdDLHFEQUF1QjtRQUEvRDs7UUFlQSxDQUFDO1FBZFcsMkNBQU8sR0FBakIsVUFBa0IsR0FBUTtZQUN4Qiw0RkFBNEY7WUFDNUYseUZBQXlGO1lBQ3pGLDRGQUE0RjtZQUM1Rix5QkFBeUI7WUFDekIsSUFBSSxHQUFHLFlBQVksdUJBQVksSUFBSSxHQUFHLENBQUMsUUFBUSxZQUFZLDJCQUFnQjtnQkFDdkUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLFlBQVksdUJBQVksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO2dCQUMzRSxJQUFNLE9BQUssR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ25ELDhCQUFnQixDQUFDLE9BQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RDLE9BQU8sT0FBSyxDQUFDO2FBQ2Q7WUFFRCxPQUFPLGlCQUFNLE9BQU8sWUFBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBZkQsQ0FBd0MsdUJBQXVCLEdBZTlEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5kaW5nUGlwZSwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBEWU5BTUlDX1RZUEUsIEltcGxpY2l0UmVjZWl2ZXIsIE1ldGhvZENhbGwsIFBhcnNlZEV2ZW50VHlwZSwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFNjaGVtYU1ldGFkYXRhLCBUaGlzUmVjZWl2ZXIsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0SWN1LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc1Byb3BlcnR5TmFtZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1RlbXBsYXRlSWQsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2FkZEV4cHJlc3Npb25JZGVudGlmaWVyLCBFeHByZXNzaW9uSWRlbnRpZmllciwgbWFya0lnbm9yZURpYWdub3N0aWNzfSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7YWRkUGFyc2VTcGFuSW5mbywgYWRkVGVtcGxhdGVJZCwgd3JhcEZvckRpYWdub3N0aWNzLCB3cmFwRm9yVHlwZUNoZWNrZXJ9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7YXN0VG9UeXBlc2NyaXB0LCBOVUxMX0FTX0FOWX0gZnJvbSAnLi9leHByZXNzaW9uJztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5pbXBvcnQge0V4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3J9IGZyb20gJy4vdGVtcGxhdGVfc2VtYW50aWNzJztcbmltcG9ydCB7Y2hlY2tJZkdlbmVyaWNUeXBlc0FyZVVuYm91bmQsIHRzQ2FsbE1ldGhvZCwgdHNDYXN0VG9BbnksIHRzQ3JlYXRlRWxlbWVudCwgdHNDcmVhdGVUeXBlUXVlcnlGb3JDb2VyY2VkSW5wdXQsIHRzQ3JlYXRlVmFyaWFibGUsIHRzRGVjbGFyZVZhcmlhYmxlfSBmcm9tICcuL3RzX3V0aWwnO1xuaW1wb3J0IHtyZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG4vKipcbiAqIEdpdmVuIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIGZvciBhIGNvbXBvbmVudCwgYW5kIG1ldGFkYXRhIHJlZ2FyZGluZyB0aGF0IGNvbXBvbmVudCwgY29tcG9zZSBhXG4gKiBcInR5cGUgY2hlY2sgYmxvY2tcIiBmdW5jdGlvbi5cbiAqXG4gKiBXaGVuIHBhc3NlZCB0aHJvdWdoIFR5cGVTY3JpcHQncyBUeXBlQ2hlY2tlciwgdHlwZSBlcnJvcnMgdGhhdCBhcmlzZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2tcbiAqIGZ1bmN0aW9uIGluZGljYXRlIGlzc3VlcyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICpcbiAqIEFzIGEgc2lkZSBlZmZlY3Qgb2YgZ2VuZXJhdGluZyBhIFRDQiBmb3IgdGhlIGNvbXBvbmVudCwgYHRzLkRpYWdub3N0aWNgcyBtYXkgYWxzbyBiZSBwcm9kdWNlZFxuICogZGlyZWN0bHkgZm9yIGlzc3VlcyB3aXRoaW4gdGhlIHRlbXBsYXRlIHdoaWNoIGFyZSBpZGVudGlmaWVkIGR1cmluZyBnZW5lcmF0aW9uLiBUaGVzZSBpc3N1ZXMgYXJlXG4gKiByZWNvcmRlZCBpbiBlaXRoZXIgdGhlIGBkb21TY2hlbWFDaGVja2VyYCAod2hpY2ggY2hlY2tzIHVzYWdlIG9mIERPTSBlbGVtZW50cyBhbmQgYmluZGluZ3MpIGFzXG4gKiB3ZWxsIGFzIHRoZSBgb29iUmVjb3JkZXJgICh3aGljaCByZWNvcmRzIGVycm9ycyB3aGVuIHRoZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdG9yIGlzIHVuYWJsZVxuICogdG8gc3VmZmljaWVudGx5IHVuZGVyc3RhbmQgYSB0ZW1wbGF0ZSkuXG4gKlxuICogQHBhcmFtIGVudiBhbiBgRW52aXJvbm1lbnRgIGludG8gd2hpY2ggdHlwZS1jaGVja2luZyBjb2RlIHdpbGwgYmUgZ2VuZXJhdGVkLlxuICogQHBhcmFtIHJlZiBhIGBSZWZlcmVuY2VgIHRvIHRoZSBjb21wb25lbnQgY2xhc3Mgd2hpY2ggc2hvdWxkIGJlIHR5cGUtY2hlY2tlZC5cbiAqIEBwYXJhbSBuYW1lIGEgYHRzLklkZW50aWZpZXJgIHRvIHVzZSBmb3IgdGhlIGdlbmVyYXRlZCBgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbmAuXG4gKiBAcGFyYW0gbWV0YSBtZXRhZGF0YSBhYm91dCB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgYW5kIHRoZSBmdW5jdGlvbiBiZWluZyBnZW5lcmF0ZWQuXG4gKiBAcGFyYW0gZG9tU2NoZW1hQ2hlY2tlciB1c2VkIHRvIGNoZWNrIGFuZCByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyBpbXByb3BlciB1c2FnZSBvZiBET00gZWxlbWVudHNcbiAqIGFuZCBiaW5kaW5ncy5cbiAqIEBwYXJhbSBvb2JSZWNvcmRlciB1c2VkIHRvIHJlY29yZCBlcnJvcnMgcmVnYXJkaW5nIHRlbXBsYXRlIGVsZW1lbnRzIHdoaWNoIGNvdWxkIG5vdCBiZSBjb3JyZWN0bHlcbiAqIHRyYW5zbGF0ZWQgaW50byB0eXBlcyBkdXJpbmcgVENCIGdlbmVyYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgIGVudjogRW52aXJvbm1lbnQsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBuYW1lOiB0cy5JZGVudGlmaWVyLFxuICAgIG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICBjb25zdCB0Y2IgPSBuZXcgQ29udGV4dChcbiAgICAgIGVudiwgZG9tU2NoZW1hQ2hlY2tlciwgb29iUmVjb3JkZXIsIG1ldGEuaWQsIG1ldGEuYm91bmRUYXJnZXQsIG1ldGEucGlwZXMsIG1ldGEuc2NoZW1hcyk7XG4gIGNvbnN0IHNjb3BlID0gU2NvcGUuZm9yTm9kZXModGNiLCBudWxsLCB0Y2IuYm91bmRUYXJnZXQudGFyZ2V0LnRlbXBsYXRlICEsIC8qIGd1YXJkICovIG51bGwpO1xuICBjb25zdCBjdHhSYXdUeXBlID0gZW52LnJlZmVyZW5jZVR5cGUocmVmKTtcbiAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGN0eFJhd1R5cGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgd2hlbiByZWZlcmVuY2luZyB0aGUgY3R4IHBhcmFtIGZvciAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gIH1cbiAgY29uc3QgcGFyYW1MaXN0ID0gW3RjYkN0eFBhcmFtKHJlZi5ub2RlLCBjdHhSYXdUeXBlLnR5cGVOYW1lLCBlbnYuY29uZmlnLnVzZUNvbnRleHRHZW5lcmljVHlwZSldO1xuXG4gIGNvbnN0IHNjb3BlU3RhdGVtZW50cyA9IHNjb3BlLnJlbmRlcigpO1xuICBjb25zdCBpbm5lckJvZHkgPSB0cy5jcmVhdGVCbG9jayhbXG4gICAgLi4uZW52LmdldFByZWx1ZGVTdGF0ZW1lbnRzKCksXG4gICAgLi4uc2NvcGVTdGF0ZW1lbnRzLFxuICBdKTtcblxuICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIFwiaWYgKHRydWUpXCIgZXhwcmVzc2lvbi4gVGhpcyBpcyB1bm5lY2Vzc2FyeSBidXQgaGFzIHRoZSBlZmZlY3Qgb2YgY2F1c2luZ1xuICAvLyB0aGUgYHRzLlByaW50ZXJgIHRvIGZvcm1hdCB0aGUgdHlwZS1jaGVjayBibG9jayBuaWNlbHkuXG4gIGNvbnN0IGJvZHkgPSB0cy5jcmVhdGVCbG9jayhbdHMuY3JlYXRlSWYodHMuY3JlYXRlVHJ1ZSgpLCBpbm5lckJvZHksIHVuZGVmaW5lZCldKTtcbiAgY29uc3QgZm5EZWNsID0gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBuYW1lLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPyByZWYubm9kZS50eXBlUGFyYW1ldGVycyA6IHVuZGVmaW5lZCxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi8gcGFyYW1MaXN0LFxuICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBib2R5ICovIGJvZHkpO1xuICBhZGRUZW1wbGF0ZUlkKGZuRGVjbCwgbWV0YS5pZCk7XG4gIHJldHVybiBmbkRlY2w7XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQncyBpbnZvbHZlZCBpbiB0aGUgY29uc3RydWN0aW9uIG9mIGEgVHlwZSBDaGVjayBCbG9jay5cbiAqXG4gKiBUaGUgZ2VuZXJhdGlvbiBvZiBhIFRDQiBpcyBub24tbGluZWFyLiBCaW5kaW5ncyB3aXRoaW4gYSB0ZW1wbGF0ZSBtYXkgcmVzdWx0IGluIHRoZSBuZWVkIHRvXG4gKiBjb25zdHJ1Y3QgY2VydGFpbiB0eXBlcyBlYXJsaWVyIHRoYW4gdGhleSBvdGhlcndpc2Ugd291bGQgYmUgY29uc3RydWN0ZWQuIFRoYXQgaXMsIGlmIHRoZVxuICogZ2VuZXJhdGlvbiBvZiBhIFRDQiBmb3IgYSB0ZW1wbGF0ZSBpcyBicm9rZW4gZG93biBpbnRvIHNwZWNpZmljIG9wZXJhdGlvbnMgKGNvbnN0cnVjdGluZyBhXG4gKiBkaXJlY3RpdmUsIGV4dHJhY3RpbmcgYSB2YXJpYWJsZSBmcm9tIGEgbGV0LSBvcGVyYXRpb24sIGV0YyksIHRoZW4gaXQncyBwb3NzaWJsZSBmb3Igb3BlcmF0aW9uc1xuICogZWFybGllciBpbiB0aGUgc2VxdWVuY2UgdG8gZGVwZW5kIG9uIG9wZXJhdGlvbnMgd2hpY2ggb2NjdXIgbGF0ZXIgaW4gdGhlIHNlcXVlbmNlLlxuICpcbiAqIGBUY2JPcGAgYWJzdHJhY3RzIHRoZSBkaWZmZXJlbnQgdHlwZXMgb2Ygb3BlcmF0aW9ucyB3aGljaCBhcmUgcmVxdWlyZWQgdG8gY29udmVydCBhIHRlbXBsYXRlIGludG9cbiAqIGEgVENCLiBUaGlzIGFsbG93cyBmb3IgdHdvIHBoYXNlcyBvZiBwcm9jZXNzaW5nIGZvciB0aGUgdGVtcGxhdGUsIHdoZXJlIDEpIGEgbGluZWFyIHNlcXVlbmNlIG9mXG4gKiBgVGNiT3BgcyBpcyBnZW5lcmF0ZWQsIGFuZCB0aGVuIDIpIHRoZXNlIG9wZXJhdGlvbnMgYXJlIGV4ZWN1dGVkLCBub3QgbmVjZXNzYXJpbHkgaW4gbGluZWFyXG4gKiBvcmRlci5cbiAqXG4gKiBFYWNoIGBUY2JPcGAgbWF5IGluc2VydCBzdGF0ZW1lbnRzIGludG8gdGhlIGJvZHkgb2YgdGhlIFRDQiwgYW5kIGFsc28gb3B0aW9uYWxseSByZXR1cm4gYVxuICogYHRzLkV4cHJlc3Npb25gIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHJlZmVyZW5jZSB0aGUgb3BlcmF0aW9uJ3MgcmVzdWx0LlxuICovXG5hYnN0cmFjdCBjbGFzcyBUY2JPcCB7XG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBpZiB0aGlzIG9wZXJhdGlvbiBjYW4gYmUgY29uc2lkZXJlZCBvcHRpb25hbC4gT3B0aW9uYWwgb3BlcmF0aW9ucyBhcmUgb25seSBleGVjdXRlZFxuICAgKiB3aGVuIGRlcGVuZGVkIHVwb24gYnkgb3RoZXIgb3BlcmF0aW9ucywgb3RoZXJ3aXNlIHRoZXkgYXJlIGRpc3JlZ2FyZGVkLiBUaGlzIGFsbG93cyBmb3IgbGVzc1xuICAgKiBjb2RlIHRvIGdlbmVyYXRlLCBwYXJzZSBhbmQgdHlwZS1jaGVjaywgb3ZlcmFsbCBwb3NpdGl2ZWx5IGNvbnRyaWJ1dGluZyB0byBwZXJmb3JtYW5jZS5cbiAgICovXG4gIGFic3RyYWN0IHJlYWRvbmx5IG9wdGlvbmFsOiBib29sZWFuO1xuXG4gIGFic3RyYWN0IGV4ZWN1dGUoKTogdHMuRXhwcmVzc2lvbnxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXBsYWNlbWVudCB2YWx1ZSBvciBvcGVyYXRpb24gdXNlZCB3aGlsZSB0aGlzIGBUY2JPcGAgaXMgZXhlY3V0aW5nIChpLmUuIHRvIHJlc29sdmUgY2lyY3VsYXJcbiAgICogcmVmZXJlbmNlcyBkdXJpbmcgaXRzIGV4ZWN1dGlvbikuXG4gICAqXG4gICAqIFRoaXMgaXMgdXN1YWxseSBhIGBudWxsIWAgZXhwcmVzc2lvbiAod2hpY2ggYXNrcyBUUyB0byBpbmZlciBhbiBhcHByb3ByaWF0ZSB0eXBlKSwgYnV0IGFub3RoZXJcbiAgICogYFRjYk9wYCBjYW4gYmUgcmV0dXJuZWQgaW4gY2FzZXMgd2hlcmUgYWRkaXRpb25hbCBjb2RlIGdlbmVyYXRpb24gaXMgbmVjZXNzYXJ5IHRvIGRlYWwgd2l0aFxuICAgKiBjaXJjdWxhciByZWZlcmVuY2VzLlxuICAgKi9cbiAgY2lyY3VsYXJGYWxsYmFjaygpOiBUY2JPcHx0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUjtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIGEgbmF0aXZlIERPTSBlbGVtZW50IChvciB3ZWIgY29tcG9uZW50KSBmcm9tIGFcbiAqIGBUbXBsQXN0RWxlbWVudGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGVsZW1lbnQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYkVsZW1lbnRPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgZm9yIHR5cGUtaW5mZXJlbmNlIG9mIHRoZSBET01cbiAgICAvLyBlbGVtZW50J3MgdHlwZSBhbmQgd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWxcbiAgICAvLyB0byBhdm9pZCBnZW5lcmF0aW5nIHN0YXRlbWVudHMgZm9yIERPTSBlbGVtZW50cyB0aGF0IGFyZSBuZXZlciByZWZlcmVuY2VkLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAvLyBBZGQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBlbGVtZW50IHVzaW5nIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQuXG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0c0NyZWF0ZUVsZW1lbnQodGhpcy5lbGVtZW50Lm5hbWUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaW5pdGlhbGl6ZXIsIHRoaXMuZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5lbGVtZW50LnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNyZWF0ZXMgYW4gZXhwcmVzc2lvbiBmb3IgcGFydGljdWxhciBsZXQtIGBUbXBsQXN0VmFyaWFibGVgIG9uIGFcbiAqIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY29udGV4dC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgdmFyaWFibGUgdmFyaWFibGUgKGxvbCkuXG4gKi9cbmNsYXNzIFRjYlZhcmlhYmxlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUsXG4gICAgICBwcml2YXRlIHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gTG9vayBmb3IgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuXG4gICAgLy8gQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIFRtcGxBc3RWYXJpYWJsZSwgYW5kIGluaXRpYWxpemUgaXQgdG8gYSByZWFkIG9mIHRoZSB2YXJpYWJsZVxuICAgIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjb250ZXh0LlxuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgIC8qIGV4cHJlc3Npb24gKi8gY3R4LFxuICAgICAgICAvKiBuYW1lICovIHRoaXMudmFyaWFibGUudmFsdWUgfHwgJyRpbXBsaWNpdCcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaWQsIHRoaXMudmFyaWFibGUua2V5U3Bhbik7XG5cbiAgICAvLyBEZWNsYXJlIHRoZSB2YXJpYWJsZSwgYW5kIHJldHVybiBpdHMgaWRlbnRpZmllci5cbiAgICBsZXQgdmFyaWFibGU6IHRzLlZhcmlhYmxlU3RhdGVtZW50O1xuICAgIGlmICh0aGlzLnZhcmlhYmxlLnZhbHVlU3BhbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLnZhcmlhYmxlLnZhbHVlU3Bhbik7XG4gICAgICB2YXJpYWJsZSA9IHRzQ3JlYXRlVmFyaWFibGUoaWQsIHdyYXBGb3JUeXBlQ2hlY2tlcihpbml0aWFsaXplcikpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXJpYWJsZSA9IHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyh2YXJpYWJsZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zWzBdLCB0aGlzLnZhcmlhYmxlLnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHZhcmlhYmxlKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGEgdmFyaWFibGUgZm9yIGEgYFRtcGxBc3RUZW1wbGF0ZWAncyBjb250ZXh0LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQgdmFyaWFibGUuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQ29udGV4dE9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLy8gVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBjb250ZXh0IHZhcmlhYmxlIGlzIG9ubHkgbmVlZGVkIHdoZW4gdGhlIGNvbnRleHQgaXMgYWN0dWFsbHkgcmVmZXJlbmNlZC5cbiAgcmVhZG9ubHkgb3B0aW9uYWwgPSB0cnVlO1xuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgLy8gQWxsb2NhdGUgYSB0ZW1wbGF0ZSBjdHggdmFyaWFibGUgYW5kIGRlY2xhcmUgaXQgd2l0aCBhbiAnYW55JyB0eXBlLiBUaGUgdHlwZSBvZiB0aGlzIHZhcmlhYmxlXG4gICAgLy8gbWF5IGJlIG5hcnJvd2VkIGFzIGEgcmVzdWx0IG9mIHRlbXBsYXRlIGd1YXJkIGNvbmRpdGlvbnMuXG4gICAgY29uc3QgY3R4ID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShjdHgsIHR5cGUpKTtcbiAgICByZXR1cm4gY3R4O1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGRlc2NlbmRzIGludG8gYSBgVG1wbEFzdFRlbXBsYXRlYCdzIGNoaWxkcmVuIGFuZCBnZW5lcmF0ZXMgdHlwZS1jaGVja2luZyBjb2RlIGZvclxuICogdGhlbS5cbiAqXG4gKiBUaGlzIG9wZXJhdGlvbiB3cmFwcyB0aGUgY2hpbGRyZW4ncyB0eXBlLWNoZWNraW5nIGNvZGUgaW4gYW4gYGlmYCBibG9jaywgd2hpY2ggbWF5IGluY2x1ZGUgb25lXG4gKiBvciBtb3JlIHR5cGUgZ3VhcmQgY29uZGl0aW9ucyB0aGF0IG5hcnJvdyB0eXBlcyB3aXRoaW4gdGhlIHRlbXBsYXRlIGJvZHkuXG4gKi9cbmNsYXNzIFRjYlRlbXBsYXRlQm9keU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgdGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBBbiBgaWZgIHdpbGwgYmUgY29uc3RydWN0ZWQsIHdpdGhpbiB3aGljaCB0aGUgdGVtcGxhdGUncyBjaGlsZHJlbiB3aWxsIGJlIHR5cGUgY2hlY2tlZC4gVGhlXG4gICAgLy8gYGlmYCBpcyB1c2VkIGZvciB0d28gcmVhc29uczogaXQgY3JlYXRlcyBhIG5ldyBzeW50YWN0aWMgc2NvcGUsIGlzb2xhdGluZyB2YXJpYWJsZXMgZGVjbGFyZWRcbiAgICAvLyBpbiB0aGUgdGVtcGxhdGUncyBUQ0IgZnJvbSB0aGUgb3V0ZXIgY29udGV4dCwgYW5kIGl0IGFsbG93cyBhbnkgZGlyZWN0aXZlcyBvbiB0aGUgdGVtcGxhdGVzXG4gICAgLy8gdG8gcGVyZm9ybSB0eXBlIG5hcnJvd2luZyBvZiBlaXRoZXIgZXhwcmVzc2lvbnMgb3IgdGhlIHRlbXBsYXRlJ3MgY29udGV4dC5cbiAgICAvL1xuICAgIC8vIFRoZSBndWFyZCBpcyB0aGUgYGlmYCBibG9jaydzIGNvbmRpdGlvbi4gSXQncyB1c3VhbGx5IHNldCB0byBgdHJ1ZWAgYnV0IGRpcmVjdGl2ZXMgdGhhdCBleGlzdFxuICAgIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjYW4gdHJpZ2dlciBleHRyYSBndWFyZCBleHByZXNzaW9ucyB0aGF0IHNlcnZlIHRvIG5hcnJvdyB0eXBlcyB3aXRoaW4gdGhlXG4gICAgLy8gYGlmYC4gYGd1YXJkYCBpcyBjYWxjdWxhdGVkIGJ5IHN0YXJ0aW5nIHdpdGggYHRydWVgIGFuZCBhZGRpbmcgb3RoZXIgY29uZGl0aW9ucyBhcyBuZWVkZWQuXG4gICAgLy8gQ29sbGVjdCB0aGVzZSBpbnRvIGBndWFyZHNgIGJ5IHByb2Nlc3NpbmcgdGhlIGRpcmVjdGl2ZXMuXG4gICAgY29uc3QgZGlyZWN0aXZlR3VhcmRzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKHRoaXMudGVtcGxhdGUpO1xuICAgIGlmIChkaXJlY3RpdmVzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IGRpckluc3RJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlLCBkaXIpO1xuICAgICAgICBjb25zdCBkaXJJZCA9XG4gICAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlKGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+KTtcblxuICAgICAgICAvLyBUaGVyZSBhcmUgdHdvIGtpbmRzIG9mIGd1YXJkcy4gVGVtcGxhdGUgZ3VhcmRzIChuZ1RlbXBsYXRlR3VhcmRzKSBhbGxvdyB0eXBlIG5hcnJvd2luZyBvZlxuICAgICAgICAvLyB0aGUgZXhwcmVzc2lvbiBwYXNzZWQgdG8gYW4gQElucHV0IG9mIHRoZSBkaXJlY3RpdmUuIFNjYW4gdGhlIGRpcmVjdGl2ZSB0byBzZWUgaWYgaXQgaGFzXG4gICAgICAgIC8vIGFueSB0ZW1wbGF0ZSBndWFyZHMsIGFuZCBnZW5lcmF0ZSB0aGVtIGlmIG5lZWRlZC5cbiAgICAgICAgZGlyLm5nVGVtcGxhdGVHdWFyZHMuZm9yRWFjaChndWFyZCA9PiB7XG4gICAgICAgICAgLy8gRm9yIGVhY2ggdGVtcGxhdGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSwgbG9vayBmb3IgYSBiaW5kaW5nIHRvIHRoYXQgaW5wdXQuXG4gICAgICAgICAgY29uc3QgYm91bmRJbnB1dCA9IHRoaXMudGVtcGxhdGUuaW5wdXRzLmZpbmQoaSA9PiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSkgfHxcbiAgICAgICAgICAgICAgdGhpcy50ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAoaTogVG1wbEFzdFRleHRBdHRyaWJ1dGV8VG1wbEFzdEJvdW5kQXR0cmlidXRlKTogaSBpcyBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgPT5cbiAgICAgICAgICAgICAgICAgICAgICBpIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGkubmFtZSA9PT0gZ3VhcmQuaW5wdXROYW1lKTtcbiAgICAgICAgICBpZiAoYm91bmRJbnB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBzdWNoIGEgYmluZGluZywgZ2VuZXJhdGUgYW4gZXhwcmVzc2lvbiBmb3IgaXQuXG4gICAgICAgICAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihib3VuZElucHV0LnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG5cbiAgICAgICAgICAgIC8vIFRoZSBleHByZXNzaW9uIGhhcyBhbHJlYWR5IGJlZW4gY2hlY2tlZCBpbiB0aGUgdHlwZSBjb25zdHJ1Y3RvciBpbnZvY2F0aW9uLCBzb1xuICAgICAgICAgICAgLy8gaXQgc2hvdWxkIGJlIGlnbm9yZWQgd2hlbiB1c2VkIHdpdGhpbiBhIHRlbXBsYXRlIGd1YXJkLlxuICAgICAgICAgICAgbWFya0lnbm9yZURpYWdub3N0aWNzKGV4cHIpO1xuXG4gICAgICAgICAgICBpZiAoZ3VhcmQudHlwZSA9PT0gJ2JpbmRpbmcnKSB7XG4gICAgICAgICAgICAgIC8vIFVzZSB0aGUgYmluZGluZyBleHByZXNzaW9uIGl0c2VsZiBhcyBndWFyZC5cbiAgICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlIHdpdGggdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBhbmQgdGhhdFxuICAgICAgICAgICAgICAvLyBleHByZXNzaW9uLlxuICAgICAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgYG5nVGVtcGxhdGVHdWFyZF8ke2d1YXJkLmlucHV0TmFtZX1gLCBbXG4gICAgICAgICAgICAgICAgZGlySW5zdElkLFxuICAgICAgICAgICAgICAgIGV4cHIsXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCBib3VuZElucHV0LnZhbHVlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaGUgc2Vjb25kIGtpbmQgb2YgZ3VhcmQgaXMgYSB0ZW1wbGF0ZSBjb250ZXh0IGd1YXJkLiBUaGlzIGd1YXJkIG5hcnJvd3MgdGhlIHRlbXBsYXRlXG4gICAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgICBpZiAoZGlyLmhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQpIHtcbiAgICAgICAgICBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcykge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsICduZ1RlbXBsYXRlQ29udGV4dEd1YXJkJywgW2Rpckluc3RJZCwgY3R4XSk7XG4gICAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGd1YXJkSW52b2tlLCB0aGlzLnRlbXBsYXRlLnNvdXJjZVNwYW4pO1xuICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgIHRoaXMudGVtcGxhdGUudmFyaWFibGVzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgdGhpcy50Y2IuZW52LmNvbmZpZy5zdWdnZXN0aW9uc0ZvclN1Ym9wdGltYWxUeXBlSW5mZXJlbmNlKSB7XG4gICAgICAgICAgICAvLyBUaGUgY29tcGlsZXIgY291bGQgaGF2ZSBpbmZlcnJlZCBhIGJldHRlciB0eXBlIGZvciB0aGUgdmFyaWFibGVzIGluIHRoaXMgdGVtcGxhdGUsXG4gICAgICAgICAgICAvLyBidXQgd2FzIHByZXZlbnRlZCBmcm9tIGRvaW5nIHNvIGJ5IHRoZSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24uIElzc3VlIGEgd2FybmluZ1xuICAgICAgICAgICAgLy8gZGlhZ25vc3RpYy5cbiAgICAgICAgICAgIHRoaXMudGNiLm9vYlJlY29yZGVyLnN1Ym9wdGltYWxUeXBlSW5mZXJlbmNlKHRoaXMudGNiLmlkLCB0aGlzLnRlbXBsYXRlLnZhcmlhYmxlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQnkgZGVmYXVsdCB0aGUgZ3VhcmQgaXMgc2ltcGx5IGB0cnVlYC5cbiAgICBsZXQgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGd1YXJkcyBmcm9tIGRpcmVjdGl2ZXMsIHVzZSB0aGVtIGluc3RlYWQuXG4gICAgaWYgKGRpcmVjdGl2ZUd1YXJkcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBQb3AgdGhlIGZpcnN0IHZhbHVlIGFuZCB1c2UgaXQgYXMgdGhlIGluaXRpYWxpemVyIHRvIHJlZHVjZSgpLiBUaGlzIHdheSwgYSBzaW5nbGUgZ3VhcmRcbiAgICAgIC8vIHdpbGwgYmUgdXNlZCBvbiBpdHMgb3duLCBidXQgdHdvIG9yIG1vcmUgd2lsbCBiZSBjb21iaW5lZCBpbnRvIGJpbmFyeSBBTkQgZXhwcmVzc2lvbnMuXG4gICAgICBndWFyZCA9IGRpcmVjdGl2ZUd1YXJkcy5yZWR1Y2UoXG4gICAgICAgICAgKGV4cHIsIGRpckd1YXJkKSA9PlxuICAgICAgICAgICAgICB0cy5jcmVhdGVCaW5hcnkoZXhwciwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgZGlyR3VhcmQpLFxuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wb3AoKSEpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBTY29wZSBmb3IgdGhlIHRlbXBsYXRlLiBUaGlzIGNvbnN0cnVjdHMgdGhlIGxpc3Qgb2Ygb3BlcmF0aW9ucyBmb3IgdGhlIHRlbXBsYXRlXG4gICAgLy8gY2hpbGRyZW4sIGFzIHdlbGwgYXMgdHJhY2tzIGJpbmRpbmdzIHdpdGhpbiB0aGUgdGVtcGxhdGUuXG4gICAgY29uc3QgdG1wbFNjb3BlID0gU2NvcGUuZm9yTm9kZXModGhpcy50Y2IsIHRoaXMuc2NvcGUsIHRoaXMudGVtcGxhdGUsIGd1YXJkKTtcblxuICAgIC8vIFJlbmRlciB0aGUgdGVtcGxhdGUncyBgU2NvcGVgIGludG8gaXRzIHN0YXRlbWVudHMuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHRtcGxTY29wZS5yZW5kZXIoKTtcbiAgICBpZiAoc3RhdGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIEFzIGFuIG9wdGltaXphdGlvbiwgZG9uJ3QgZ2VuZXJhdGUgdGhlIHNjb3BlJ3MgYmxvY2sgaWYgaXQgaGFzIG5vIHN0YXRlbWVudHMuIFRoaXMgaXNcbiAgICAgIC8vIGJlbmVmaWNpYWwgZm9yIHRlbXBsYXRlcyB0aGF0IGNvbnRhaW4gZm9yIGV4YW1wbGUgYDxzcGFuICpuZ0lmPVwiZmlyc3RcIj48L3NwYW4+YCwgaW4gd2hpY2hcbiAgICAgIC8vIGNhc2UgdGhlcmUncyBubyBuZWVkIHRvIHJlbmRlciB0aGUgYE5nSWZgIGd1YXJkIGV4cHJlc3Npb24uIFRoaXMgc2VlbXMgbGlrZSBhIG1pbm9yXG4gICAgICAvLyBpbXByb3ZlbWVudCwgaG93ZXZlciBpdCByZWR1Y2VzIHRoZSBudW1iZXIgb2YgZmxvdy1ub2RlIGFudGVjZWRlbnRzIHRoYXQgVHlwZVNjcmlwdCBuZWVkc1xuICAgICAgLy8gdG8ga2VlcCBpbnRvIGFjY291bnQgZm9yIHN1Y2ggY2FzZXMsIHJlc3VsdGluZyBpbiBhbiBvdmVyYWxsIHJlZHVjdGlvbiBvZlxuICAgICAgLy8gdHlwZS1jaGVja2luZyB0aW1lLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHRtcGxCbG9jazogdHMuU3RhdGVtZW50ID0gdHMuY3JlYXRlQmxvY2soc3RhdGVtZW50cyk7XG4gICAgaWYgKGd1YXJkICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGUgc2NvcGUgaGFzIGEgZ3VhcmQgdGhhdCBuZWVkcyB0byBiZSBhcHBsaWVkLCBzbyB3cmFwIHRoZSB0ZW1wbGF0ZSBibG9jayBpbnRvIGFuIGBpZmBcbiAgICAgIC8vIHN0YXRlbWVudCBjb250YWluaW5nIHRoZSBndWFyZCBleHByZXNzaW9uLlxuICAgICAgdG1wbEJsb2NrID0gdHMuY3JlYXRlSWYoLyogZXhwcmVzc2lvbiAqLyBndWFyZCwgLyogdGhlblN0YXRlbWVudCAqLyB0bXBsQmxvY2spO1xuICAgIH1cbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0bXBsQmxvY2spO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggcmVuZGVycyBhIHRleHQgYmluZGluZyAoaW50ZXJwb2xhdGlvbikgaW50byB0aGUgVENCLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlRleHRJbnRlcnBvbGF0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBiaW5kaW5nOiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKHRoaXMuYmluZGluZy52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUuIEZvciBnZW5lcmljIGRpcmVjdGl2ZXMsIGdlbmVyaWNcbiAqIHBhcmFtZXRlcnMgYXJlIHNldCB0byBgYW55YCB0eXBlLlxuICovXG5hYnN0cmFjdCBjbGFzcyBUY2JEaXJlY3RpdmVUeXBlT3BCYXNlIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCB0Y2I6IENvbnRleHQsIHByb3RlY3RlZCBzY29wZTogU2NvcGUsXG4gICAgICBwcm90ZWN0ZWQgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LCBwcm90ZWN0ZWQgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIHRvIGRlY2xhcmUgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgYW5kXG4gICAgLy8gd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWwgdG8gYXZvaWRcbiAgICAvLyBnZW5lcmF0aW5nIGRlY2xhcmF0aW9ucyBmb3IgZGlyZWN0aXZlcyB0aGF0IGRvbid0IGhhdmUgYW55IGlucHV0cy9vdXRwdXRzLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBkaXJSZWYgPSB0aGlzLmRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuXG4gICAgY29uc3QgcmF3VHlwZSA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG5cbiAgICBsZXQgdHlwZTogdHMuVHlwZU5vZGU7XG4gICAgaWYgKHRoaXMuZGlyLmlzR2VuZXJpYyA9PT0gZmFsc2UgfHwgZGlyUmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZSA9IHJhd1R5cGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShyYXdUeXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgd2hlbiByZWZlcmVuY2luZyB0aGUgdHlwZSBmb3IgJHt0aGlzLmRpci5yZWYuZGVidWdOYW1lfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZUFyZ3VtZW50cyA9IGRpclJlZi5ub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcChcbiAgICAgICAgICAoKSA9PiB0cy5mYWN0b3J5LmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICAgIHR5cGUgPSB0cy5mYWN0b3J5LmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHJhd1R5cGUudHlwZU5hbWUsIHR5cGVBcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKHR5cGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyh0eXBlLCB0aGlzLm5vZGUuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMubm9kZS5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjb25zdHJ1Y3RzIGFuIGluc3RhbmNlIG9mIGEgbm9uLWdlbmVyaWMgZGlyZWN0aXZlIF93aXRob3V0XyBzZXR0aW5nIGFueSBvZiBpdHNcbiAqIGlucHV0cy4gSW5wdXRzICBhcmUgbGF0ZXIgc2V0IGluIHRoZSBgVGNiRGlyZWN0aXZlSW5wdXRzT3BgLiBUeXBlIGNoZWNraW5nIHdhcyBmb3VuZCB0byBiZVxuICogZmFzdGVyIHdoZW4gZG9uZSBpbiB0aGlzIHdheSBhcyBvcHBvc2VkIHRvIGBUY2JEaXJlY3RpdmVDdG9yT3BgIHdoaWNoIGlzIG9ubHkgbmVjZXNzYXJ5IHdoZW4gdGhlXG4gKiBkaXJlY3RpdmUgaXMgZ2VuZXJpYy5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JOb25HZW5lcmljRGlyZWN0aXZlVHlwZU9wIGV4dGVuZHMgVGNiRGlyZWN0aXZlVHlwZU9wQmFzZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gZm9yIHRoaXMgb3AncyBkaXJlY3RpdmUgb2YgdGhlIGFyZ3VtZW50IHR5cGUuIFJldHVybnMgdGhlIGlkIG9mXG4gICAqIHRoZSBuZXdseSBjcmVhdGVkIHZhcmlhYmxlLlxuICAgKi9cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBkaXJSZWYgPSB0aGlzLmRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgIGlmICh0aGlzLmRpci5pc0dlbmVyaWMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIEVycm9yOiBleHBlY3RlZCAke2RpclJlZi5kZWJ1Z05hbWV9IG5vdCB0byBiZSBnZW5lcmljLmApO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuZXhlY3V0ZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBnZW5lcmljIGRpcmVjdGl2ZSB3aXRoIGl0cyBnZW5lcmljIHBhcmFtZXRlcnMgc2V0XG4gKiB0byBgYW55YCB0eXBlLiBUaGlzIG9wIGlzIGxpa2UgYFRjYkRpcmVjdGl2ZVR5cGVPcGAsIGV4Y2VwdCB0aGF0IGdlbmVyaWMgcGFyYW1ldGVycyBhcmUgc2V0IHRvXG4gKiBgYW55YCB0eXBlLiBUaGlzIGlzIHVzZWQgZm9yIHNpdHVhdGlvbnMgd2hlcmUgd2Ugd2FudCB0byBhdm9pZCBpbmxpbmluZy5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGdlbmVyaWNcbiAqIHR5cGUgcGFyYW1ldGVycyBzZXQgdG8gYGFueWAuXG4gKi9cbmNsYXNzIFRjYkdlbmVyaWNEaXJlY3RpdmVUeXBlV2l0aEFueVBhcmFtc09wIGV4dGVuZHMgVGNiRGlyZWN0aXZlVHlwZU9wQmFzZSB7XG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgZGlyUmVmID0gdGhpcy5kaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcbiAgICBpZiAoZGlyUmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gRXJyb3I6IGV4cGVjdGVkIHR5cGVQYXJhbWV0ZXJzIHdoZW4gY3JlYXRpbmcgYSBkZWNsYXJhdGlvbiBmb3IgJHtcbiAgICAgICAgICBkaXJSZWYuZGVidWdOYW1lfWApO1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5leGVjdXRlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhIHZhcmlhYmxlIGZvciBhIGxvY2FsIHJlZiBpbiBhIHRlbXBsYXRlLlxuICogVGhlIGluaXRpYWxpemVyIGZvciB0aGUgdmFyaWFibGUgaXMgdGhlIHZhcmlhYmxlIGV4cHJlc3Npb24gZm9yIHRoZSBkaXJlY3RpdmUsIHRlbXBsYXRlLCBvclxuICogZWxlbWVudCB0aGUgcmVmIHJlZmVycyB0by4gV2hlbiB0aGUgcmVmZXJlbmNlIGlzIHVzZWQgaW4gdGhlIHRlbXBsYXRlLCB0aG9zZSBUQ0Igc3RhdGVtZW50cyB3aWxsXG4gKiBhY2Nlc3MgdGhpcyB2YXJpYWJsZSBhcyB3ZWxsLiBGb3IgZXhhbXBsZTpcbiAqIGBgYFxuICogdmFyIF90MSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICogdmFyIF90MiA9IF90MTtcbiAqIF90Mi52YWx1ZVxuICogYGBgXG4gKiBUaGlzIG9wZXJhdGlvbiBzdXBwb3J0cyBtb3JlIGZsdWVudCBsb29rdXBzIGZvciB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIHdoZW4gZ2V0dGluZyBhIHN5bWJvbFxuICogZm9yIGEgcmVmZXJlbmNlLiBJbiBtb3N0IGNhc2VzLCB0aGlzIGlzbid0IGVzc2VudGlhbDsgdGhhdCBpcywgdGhlIGluZm9ybWF0aW9uIGZvciB0aGUgc3ltYm9sXG4gKiBjb3VsZCBiZSBnYXRoZXJlZCB3aXRob3V0IHRoaXMgb3BlcmF0aW9uIHVzaW5nIHRoZSBgQm91bmRUYXJnZXRgLiBIb3dldmVyLCBmb3IgdGhlIGNhc2Ugb2ZcbiAqIG5nLXRlbXBsYXRlIHJlZmVyZW5jZXMsIHdlIHdpbGwgbmVlZCB0aGlzIHJlZmVyZW5jZSB2YXJpYWJsZSB0byBub3Qgb25seSBwcm92aWRlIGEgbG9jYXRpb24gaW5cbiAqIHRoZSBzaGltIGZpbGUsIGJ1dCBhbHNvIHRvIG5hcnJvdyB0aGUgdmFyaWFibGUgdG8gdGhlIGNvcnJlY3QgYFRlbXBsYXRlUmVmPFQ+YCB0eXBlIHJhdGhlciB0aGFuXG4gKiBgVGVtcGxhdGVSZWY8YW55PmAgKHRoaXMgd29yayBpcyBzdGlsbCBUT0RPKS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIHZhcmlhYmxlIHdpdGggaXRzIGluZmVycmVkXG4gKiB0eXBlLlxuICovXG5jbGFzcyBUY2JSZWZlcmVuY2VPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRjYjogQ29udGV4dCwgcHJpdmF0ZSByZWFkb25seSBzY29wZTogU2NvcGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IG5vZGU6IFRtcGxBc3RSZWZlcmVuY2UsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGhvc3Q6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIHRvIGZvciB0aGUgVHlwZSBDaGVja2VyXG4gIC8vIHNvIGl0IGNhbiBtYXAgYSByZWZlcmVuY2UgdmFyaWFibGUgaW4gdGhlIHRlbXBsYXRlIGRpcmVjdGx5IHRvIGEgbm9kZSBpbiB0aGUgVENCLlxuICByZWFkb25seSBvcHRpb25hbCA9IHRydWU7XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBsZXQgaW5pdGlhbGl6ZXIgPVxuICAgICAgICB0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ID9cbiAgICAgICAgdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMudGFyZ2V0KSA6XG4gICAgICAgIHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmhvc3QsIHRoaXMudGFyZ2V0KTtcblxuICAgIC8vIFRoZSByZWZlcmVuY2UgaXMgZWl0aGVyIHRvIGFuIGVsZW1lbnQsIGFuIDxuZy10ZW1wbGF0ZT4gbm9kZSwgb3IgdG8gYSBkaXJlY3RpdmUgb24gYW5cbiAgICAvLyBlbGVtZW50IG9yIHRlbXBsYXRlLlxuICAgIGlmICgodGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCAmJiAhdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMpIHx8XG4gICAgICAgICF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlcykge1xuICAgICAgLy8gUmVmZXJlbmNlcyB0byBET00gbm9kZXMgYXJlIHBpbm5lZCB0byAnYW55JyB3aGVuIGBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXNgIGlzIGBmYWxzZWAuXG4gICAgICAvLyBSZWZlcmVuY2VzIHRvIGBUZW1wbGF0ZVJlZmBzIGFuZCBkaXJlY3RpdmVzIGFyZSBwaW5uZWQgdG8gJ2FueScgd2hlblxuICAgICAgLy8gYGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlc2AgaXMgYGZhbHNlYC5cbiAgICAgIGluaXRpYWxpemVyID1cbiAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24oaW5pdGlhbGl6ZXIsIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBEaXJlY3QgcmVmZXJlbmNlcyB0byBhbiA8bmctdGVtcGxhdGU+IG5vZGUgc2ltcGx5IHJlcXVpcmUgYSB2YWx1ZSBvZiB0eXBlXG4gICAgICAvLyBgVGVtcGxhdGVSZWY8YW55PmAuIFRvIGdldCB0aGlzLCBhbiBleHByZXNzaW9uIG9mIHRoZSBmb3JtXG4gICAgICAvLyBgKF90MSBhcyBhbnkgYXMgVGVtcGxhdGVSZWY8YW55PilgIGlzIGNvbnN0cnVjdGVkLlxuICAgICAgaW5pdGlhbGl6ZXIgPVxuICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihpbml0aWFsaXplciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVBc0V4cHJlc3Npb24oXG4gICAgICAgICAgaW5pdGlhbGl6ZXIsXG4gICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZUV4dGVybmFsVHlwZSgnQGFuZ3VsYXIvY29yZScsICdUZW1wbGF0ZVJlZicsIFtEWU5BTUlDX1RZUEVdKSk7XG4gICAgICBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVBhcmVuKGluaXRpYWxpemVyKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpbml0aWFsaXplciwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaWQsIHRoaXMubm9kZS5rZXlTcGFuKTtcblxuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGlzIHVzZWQgd2hlbiB0aGUgdGFyZ2V0IG9mIGEgcmVmZXJlbmNlIGlzIG1pc3NpbmcuIFRoaXMgb3BlcmF0aW9uIGdlbmVyYXRlcyBhXG4gKiB2YXJpYWJsZSBvZiB0eXBlIGFueSBmb3IgdXNhZ2VzIG9mIHRoZSBpbnZhbGlkIHJlZmVyZW5jZSB0byByZXNvbHZlIHRvLiBUaGUgaW52YWxpZCByZWZlcmVuY2VcbiAqIGl0c2VsZiBpcyByZWNvcmRlZCBvdXQtb2YtYmFuZC5cbiAqL1xuY2xhc3MgVGNiSW52YWxpZFJlZmVyZW5jZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHRjYjogQ29udGV4dCwgcHJpdmF0ZSByZWFkb25seSBzY29wZTogU2NvcGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLy8gVGhlIGRlY2xhcmF0aW9uIG9mIGEgbWlzc2luZyByZWZlcmVuY2UgaXMgb25seSBuZWVkZWQgd2hlbiB0aGUgcmVmZXJlbmNlIGlzIHJlc29sdmVkLlxuICByZWFkb25seSBvcHRpb25hbCA9IHRydWU7XG5cbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBOVUxMX0FTX0FOWSkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjb25zdHJ1Y3RzIGFuIGluc3RhbmNlIG9mIGEgZGlyZWN0aXZlIHdpdGggdHlwZXMgaW5mZXJyZWQgZnJvbSBpdHMgaW5wdXRzLiBUaGVcbiAqIGlucHV0cyB0aGVtc2VsdmVzIGFyZSBub3QgY2hlY2tlZCBoZXJlOyBjaGVja2luZyBvZiBpbnB1dHMgaXMgYWNoaWV2ZWQgaW4gYFRjYkRpcmVjdGl2ZUlucHV0c09wYC5cbiAqIEFueSBlcnJvcnMgcmVwb3J0ZWQgaW4gdGhpcyBzdGF0ZW1lbnQgYXJlIGlnbm9yZWQsIGFzIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGNhbGwgaXMgb25seSBwcmVzZW50XG4gKiBmb3IgdHlwZS1pbmZlcmVuY2UuXG4gKlxuICogV2hlbiBhIERpcmVjdGl2ZSBpcyBnZW5lcmljLCBpdCBpcyByZXF1aXJlZCB0aGF0IHRoZSBUQ0IgZ2VuZXJhdGVzIHRoZSBpbnN0YW5jZSB1c2luZyB0aGlzIG1ldGhvZFxuICogaW4gb3JkZXIgdG8gaW5mZXIgdGhlIHR5cGUgaW5mb3JtYXRpb24gY29ycmVjdGx5LlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUN0b3JPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgdG8gaW5mZXIgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgYW5kXG4gICAgLy8gd29uJ3QgcmVwb3J0IGRpYWdub3N0aWNzIGJ5IGl0c2VsZiwgc28gdGhlIG9wZXJhdGlvbiBpcyBtYXJrZWQgYXMgb3B0aW9uYWwuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKGlkLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oaWQsIHRoaXMubm9kZS5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuXG4gICAgY29uc3QgZ2VuZXJpY0lucHV0cyA9IG5ldyBNYXA8c3RyaW5nLCBUY2JEaXJlY3RpdmVJbnB1dD4oKTtcblxuICAgIGNvbnN0IGlucHV0cyA9IGdldEJvdW5kSW5wdXRzKHRoaXMuZGlyLCB0aGlzLm5vZGUsIHRoaXMudGNiKTtcbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIGlucHV0cykge1xuICAgICAgLy8gU2tpcCB0ZXh0IGF0dHJpYnV0ZXMgaWYgY29uZmlndXJlZCB0byBkbyBzby5cbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgJiZcbiAgICAgICAgICBpbnB1dC5hdHRyaWJ1dGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZmllbGROYW1lIG9mIGlucHV0LmZpZWxkTmFtZXMpIHtcbiAgICAgICAgLy8gU2tpcCB0aGUgZmllbGQgaWYgYW4gYXR0cmlidXRlIGhhcyBhbHJlYWR5IGJlZW4gYm91bmQgdG8gaXQ7IHdlIGNhbid0IGhhdmUgYSBkdXBsaWNhdGVcbiAgICAgICAgLy8ga2V5IGluIHRoZSB0eXBlIGNvbnN0cnVjdG9yIGNhbGwuXG4gICAgICAgIGlmIChnZW5lcmljSW5wdXRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdHJhbnNsYXRlSW5wdXQoaW5wdXQuYXR0cmlidXRlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICAgIGdlbmVyaWNJbnB1dHMuc2V0KGZpZWxkTmFtZSwge1xuICAgICAgICAgIHR5cGU6ICdiaW5kaW5nJyxcbiAgICAgICAgICBmaWVsZDogZmllbGROYW1lLFxuICAgICAgICAgIGV4cHJlc3Npb24sXG4gICAgICAgICAgc291cmNlU3BhbjogaW5wdXQuYXR0cmlidXRlLnNvdXJjZVNwYW5cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIHVuc2V0IGRpcmVjdGl2ZSBpbnB1dHMgZm9yIGVhY2ggb2YgdGhlIHJlbWFpbmluZyB1bnNldCBmaWVsZHMuXG4gICAgZm9yIChjb25zdCBbZmllbGROYW1lXSBvZiB0aGlzLmRpci5pbnB1dHMpIHtcbiAgICAgIGlmICghZ2VuZXJpY0lucHV0cy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICBnZW5lcmljSW5wdXRzLnNldChmaWVsZE5hbWUsIHt0eXBlOiAndW5zZXQnLCBmaWVsZDogZmllbGROYW1lfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiB0aGUgZGlyZWN0aXZlIHRvIGluZmVyIGEgdHlwZSwgYW5kIGFzc2lnbiB0aGUgZGlyZWN0aXZlXG4gICAgLy8gaW5zdGFuY2UuXG4gICAgY29uc3QgdHlwZUN0b3IgPSB0Y2JDYWxsVHlwZUN0b3IodGhpcy5kaXIsIHRoaXMudGNiLCBBcnJheS5mcm9tKGdlbmVyaWNJbnB1dHMudmFsdWVzKCkpKTtcbiAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3ModHlwZUN0b3IpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIHR5cGVDdG9yKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgY2lyY3VsYXJGYWxsYmFjaygpOiBUY2JPcCB7XG4gICAgcmV0dXJuIG5ldyBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wKHRoaXMudGNiLCB0aGlzLnNjb3BlLCB0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBpbnB1dCBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHRoYXQgY29ycmVzcG9uZCB3aXRoIHRoZVxuICogbWVtYmVycyBvZiBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVJbnB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGxldCBkaXJJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIFRPRE8oam9vc3QpOiByZXBvcnQgZHVwbGljYXRlIHByb3BlcnRpZXNcblxuICAgIGNvbnN0IGlucHV0cyA9IGdldEJvdW5kSW5wdXRzKHRoaXMuZGlyLCB0aGlzLm5vZGUsIHRoaXMudGNiKTtcbiAgICBmb3IgKGNvbnN0IGlucHV0IG9mIGlucHV0cykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IHRyYW5zbGF0ZUlucHV0KGlucHV0LmF0dHJpYnV0ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBudWxsIGNoZWNrcyBhcmUgZGlzYWJsZWQsIGVyYXNlIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgZnJvbSB0aGUgdHlwZSBieVxuICAgICAgICAvLyB3cmFwcGluZyB0aGUgZXhwcmVzc2lvbiBpbiBhIG5vbi1udWxsIGFzc2VydGlvbi5cbiAgICAgICAgZXhwciA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgYXNzaWdubWVudDogdHMuRXhwcmVzc2lvbiA9IHdyYXBGb3JEaWFnbm9zdGljcyhleHByKTtcblxuICAgICAgZm9yIChjb25zdCBmaWVsZE5hbWUgb2YgaW5wdXQuZmllbGROYW1lcykge1xuICAgICAgICBsZXQgdGFyZ2V0OiB0cy5MZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICBpZiAodGhpcy5kaXIuY29lcmNlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGlucHV0IGhhcyBhIGNvZXJjaW9uIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSB1c2VkIGluc3RlYWQgb2YgYXNzaWduaW5nIHRoZVxuICAgICAgICAgIC8vIGV4cHJlc3Npb24gaW50byB0aGUgaW5wdXQgZmllbGQgZGlyZWN0bHkuIFRvIGFjaGlldmUgdGhpcywgYSB2YXJpYWJsZSBpcyBkZWNsYXJlZFxuICAgICAgICAgIC8vIHdpdGggYSB0eXBlIG9mIGB0eXBlb2YgRGlyZWN0aXZlLm5nQWNjZXB0SW5wdXRUeXBlX2ZpZWxkTmFtZWAgd2hpY2ggaXMgdGhlbiB1c2VkIGFzXG4gICAgICAgICAgLy8gdGFyZ2V0IG9mIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICAgIGNvbnN0IGRpclR5cGVSZWYgPSB0aGlzLnRjYi5lbnYucmVmZXJlbmNlVHlwZSh0aGlzLmRpci5yZWYpO1xuICAgICAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkaXJUeXBlUmVmKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke3RoaXMuZGlyLnJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgICAgICAgY29uc3QgdHlwZSA9IHRzQ3JlYXRlVHlwZVF1ZXJ5Rm9yQ29lcmNlZElucHV0KGRpclR5cGVSZWYudHlwZU5hbWUsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpKTtcblxuICAgICAgICAgIHRhcmdldCA9IGlkO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZGlyLnVuZGVjbGFyZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIElmIG5vIGNvZXJjaW9uIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQgbm9yIGlzIHRoZSBmaWVsZCBkZWNsYXJlZCAoaS5lLiB0aGUgaW5wdXQgaXNcbiAgICAgICAgICAvLyBkZWNsYXJlZCBpbiBhIGBARGlyZWN0aXZlYCBvciBgQENvbXBvbmVudGAgZGVjb3JhdG9yJ3MgYGlucHV0c2AgcHJvcGVydHkpIHRoZXJlIGlzIG5vXG4gICAgICAgICAgLy8gYXNzaWdubWVudCB0YXJnZXQgYXZhaWxhYmxlLCBzbyB0aGlzIGZpZWxkIGlzIHNraXBwZWQuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAhdGhpcy50Y2IuZW52LmNvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgJiZcbiAgICAgICAgICAgIHRoaXMuZGlyLnJlc3RyaWN0ZWRJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSkge1xuICAgICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBhY2Nlc3MgbW9kaWZpZXJzIGlzIGRpc2FibGVkIGFuZCB0aGUgZmllbGQgaXMgcmVzdHJpY3RlZFxuICAgICAgICAgIC8vIChpLmUuIHByaXZhdGUvcHJvdGVjdGVkL3JlYWRvbmx5KSwgZ2VuZXJhdGUgYW4gYXNzaWdubWVudCBpbnRvIGEgdGVtcG9yYXJ5IHZhcmlhYmxlXG4gICAgICAgICAgLy8gdGhhdCBoYXMgdGhlIHR5cGUgb2YgdGhlIGZpZWxkLiBUaGlzIGFjaGlldmVzIHR5cGUtY2hlY2tpbmcgYnV0IGNpcmN1bXZlbnRzIHRoZSBhY2Nlc3NcbiAgICAgICAgICAvLyBtb2RpZmllcnMuXG4gICAgICAgICAgaWYgKGRpcklkID09PSBudWxsKSB7XG4gICAgICAgICAgICBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAgICAgICBjb25zdCBkaXJUeXBlUmVmID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcbiAgICAgICAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGlyVHlwZVJlZikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGUgZnJvbSByZWZlcmVuY2UgdG8gJHt0aGlzLmRpci5yZWYuZGVidWdOYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB0eXBlID0gdHMuY3JlYXRlSW5kZXhlZEFjY2Vzc1R5cGVOb2RlKFxuICAgICAgICAgICAgICB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKGRpcklkIGFzIHRzLklkZW50aWZpZXIpLFxuICAgICAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZE5hbWUpKSk7XG4gICAgICAgICAgY29uc3QgdGVtcCA9IHRzRGVjbGFyZVZhcmlhYmxlKGlkLCB0eXBlKTtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0ZW1wKTtcbiAgICAgICAgICB0YXJnZXQgPSBpZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZGlySWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRpcklkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRvIGdldCBlcnJvcnMgYXNzaWduIGRpcmVjdGx5IHRvIHRoZSBmaWVsZHMgb24gdGhlIGluc3RhbmNlLCB1c2luZyBwcm9wZXJ0eSBhY2Nlc3NcbiAgICAgICAgICAvLyB3aGVuIHBvc3NpYmxlLiBTdHJpbmcgbGl0ZXJhbCBmaWVsZHMgbWF5IG5vdCBiZSB2YWxpZCBKUyBpZGVudGlmaWVycyBzbyB3ZSB1c2VcbiAgICAgICAgICAvLyBsaXRlcmFsIGVsZW1lbnQgYWNjZXNzIGluc3RlYWQgZm9yIHRob3NlIGNhc2VzLlxuICAgICAgICAgIHRhcmdldCA9IHRoaXMuZGlyLnN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcy5oYXMoZmllbGROYW1lKSA/XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGROYW1lKSkgOlxuICAgICAgICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlSWRlbnRpZmllcihmaWVsZE5hbWUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbnB1dC5hdHRyaWJ1dGUua2V5U3BhbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyh0YXJnZXQsIGlucHV0LmF0dHJpYnV0ZS5rZXlTcGFuKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGaW5hbGx5IHRoZSBhc3NpZ25tZW50IGlzIGV4dGVuZGVkIGJ5IGFzc2lnbmluZyBpdCBpbnRvIHRoZSB0YXJnZXQgZXhwcmVzc2lvbi5cbiAgICAgICAgYXNzaWdubWVudCA9IHRzLmNyZWF0ZUJpbmFyeSh0YXJnZXQsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGFzc2lnbm1lbnQpO1xuICAgICAgfVxuXG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LmF0dHJpYnV0ZS5zb3VyY2VTcGFuKTtcbiAgICAgIC8vIElnbm9yZSBkaWFnbm9zdGljcyBmb3IgdGV4dCBhdHRyaWJ1dGVzIGlmIGNvbmZpZ3VyZWQgdG8gZG8gc28uXG4gICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzICYmXG4gICAgICAgICAgaW5wdXQuYXR0cmlidXRlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpIHtcbiAgICAgICAgbWFya0lnbm9yZURpYWdub3N0aWNzKGFzc2lnbm1lbnQpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGFzc2lnbm1lbnQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgZmFsbGJhY2sgZXhwcmVzc2lvbiBpZiB0aGUgaW5mZXJlbmNlIG9mIGEgZGlyZWN0aXZlIHR5cGVcbiAqIHZpYSBgVGNiRGlyZWN0aXZlQ3Rvck9wYCByZXF1aXJlcyBhIHJlZmVyZW5jZSB0byBpdHMgb3duIHR5cGUuIFRoaXMgY2FuIGhhcHBlbiB1c2luZyBhIHRlbXBsYXRlXG4gKiByZWZlcmVuY2U6XG4gKlxuICogYGBgaHRtbFxuICogPHNvbWUtY21wICNyZWYgW3Byb3BdPVwicmVmLmZvb1wiPjwvc29tZS1jbXA+XG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wYCB3aWxsIGFkZCBhIHNlY29uZCBpbmZlcmVuY2Ugb2YgdGhlIGRpcmVjdGl2ZVxuICogdHlwZSB0byB0aGUgdHlwZS1jaGVjayBibG9jaywgdGhpcyB0aW1lIGNhbGxpbmcgdGhlIGRpcmVjdGl2ZSdzIHR5cGUgY29uc3RydWN0b3Igd2l0aG91dCBhbnlcbiAqIGlucHV0IGV4cHJlc3Npb25zLiBUaGlzIGluZmVycyB0aGUgd2lkZXN0IHBvc3NpYmxlIHN1cGVydHlwZSBmb3IgdGhlIGRpcmVjdGl2ZSwgd2hpY2ggaXMgdXNlZCB0b1xuICogcmVzb2x2ZSBhbnkgcmVjdXJzaXZlIHJlZmVyZW5jZXMgcmVxdWlyZWQgdG8gaW5mZXIgdGhlIHJlYWwgdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3RvckNpcmN1bGFyRmFsbGJhY2tPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGNvbnN0IHR5cGVDdG9yID0gdGhpcy50Y2IuZW52LnR5cGVDdG9yRm9yKHRoaXMuZGlyKTtcbiAgICBjb25zdCBjaXJjdWxhclBsYWNlaG9sZGVyID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgdHlwZUN0b3IsIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKV0pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGNpcmN1bGFyUGxhY2Vob2xkZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZmVlZHMgZWxlbWVudHMgYW5kIHVuY2xhaW1lZCBwcm9wZXJ0aWVzIHRvIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAuXG4gKlxuICogVGhlIERPTSBzY2hlbWEgaXMgbm90IGNoZWNrZWQgdmlhIFRDQiBjb2RlIGdlbmVyYXRpb24uIEluc3RlYWQsIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW5nZXN0c1xuICogZWxlbWVudHMgYW5kIHByb3BlcnR5IGJpbmRpbmdzIGFuZCBhY2N1bXVsYXRlcyBzeW50aGV0aWMgYHRzLkRpYWdub3N0aWNgcyBvdXQtb2YtYmFuZC4gVGhlc2UgYXJlXG4gKiBsYXRlciBtZXJnZWQgd2l0aCB0aGUgZGlhZ25vc3RpY3MgZ2VuZXJhdGVkIGZyb20gdGhlIFRDQi5cbiAqXG4gKiBGb3IgY29udmVuaWVuY2UsIHRoZSBUQ0IgaXRlcmF0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpcyB1c2VkIHRvIGRyaXZlIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgdmlhXG4gKiB0aGUgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKi9cbmNsYXNzIFRjYkRvbVNjaGVtYUNoZWNrZXJPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgcHJpdmF0ZSBjaGVja0VsZW1lbnQ6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHRoaXMuY2hlY2tFbGVtZW50KSB7XG4gICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrRWxlbWVudCh0aGlzLnRjYi5pZCwgdGhpcy5lbGVtZW50LCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICB0aGlzLnRjYi5kb21TY2hlbWFDaGVja2VyLmNoZWNrUHJvcGVydHkoXG4gICAgICAgICAgICAgIHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHByb3BlcnR5TmFtZSwgYmluZGluZy5zb3VyY2VTcGFuLCB0aGlzLnRjYi5zY2hlbWFzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5cbi8qKlxuICogTWFwcGluZyBiZXR3ZWVuIGF0dHJpYnV0ZXMgbmFtZXMgdGhhdCBkb24ndCBjb3JyZXNwb25kIHRvIHRoZWlyIGVsZW1lbnQgcHJvcGVydHkgbmFtZXMuXG4gKiBOb3RlOiB0aGlzIG1hcHBpbmcgaGFzIHRvIGJlIGtlcHQgaW4gc3luYyB3aXRoIHRoZSBlcXVhbGx5IG5hbWVkIG1hcHBpbmcgaW4gdGhlIHJ1bnRpbWUuXG4gKi9cbmNvbnN0IEFUVFJfVE9fUFJPUDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2Zvcm1hY3Rpb24nOiAnZm9ybUFjdGlvbicsXG4gICdpbm5lckh0bWwnOiAnaW5uZXJIVE1MJyxcbiAgJ3JlYWRvbmx5JzogJ3JlYWRPbmx5JyxcbiAgJ3RhYmluZGV4JzogJ3RhYkluZGV4Jyxcbn07XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIFwidW5jbGFpbWVkIGlucHV0c1wiIC0gYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaCB3ZXJlXG4gKiBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MIGVsZW1lbnRcbiAqIGl0c2VsZi5cbiAqXG4gKiBDdXJyZW50bHksIG9ubHkgdGhlIGV4cHJlc3Npb25zIG9mIHRoZXNlIGJpbmRpbmdzIGFyZSBjaGVja2VkLiBUaGUgdGFyZ2V0cyBvZiB0aGUgYmluZGluZ3MgYXJlXG4gKiBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEgdmlhIGEgYFRjYkRvbVNjaGVtYUNoZWNrZXJPcGAuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVW5jbGFpbWVkSW5wdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkSW5wdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICAvLyBgdGhpcy5pbnB1dHNgIGNvbnRhaW5zIG9ubHkgdGhvc2UgYmluZGluZ3Mgbm90IG1hdGNoZWQgYnkgYW55IGRpcmVjdGl2ZS4gVGhlc2UgYmluZGluZ3MgZ28gdG9cbiAgICAvLyB0aGUgZWxlbWVudCBpdHNlbGYuXG4gICAgbGV0IGVsSWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIHRoaXMuZWxlbWVudC5pbnB1dHMpIHtcbiAgICAgIGlmIChiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5ICYmIHRoaXMuY2xhaW1lZElucHV0cy5oYXMoYmluZGluZy5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgYmluZGluZyBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBleHByID0gdGNiRXhwcmVzc2lvbihiaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIGNoZWNraW5nIHRoZSB0eXBlIG9mIGJpbmRpbmdzIGlzIGRpc2FibGVkLCBjYXN0IHRoZSByZXN1bHRpbmcgZXhwcmVzc2lvbiB0byAnYW55J1xuICAgICAgICAvLyBiZWZvcmUgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgIGV4cHIgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tQmluZGluZ3MgJiYgYmluZGluZy50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgICBpZiAoYmluZGluZy5uYW1lICE9PSAnc3R5bGUnICYmIGJpbmRpbmcubmFtZSAhPT0gJ2NsYXNzJykge1xuICAgICAgICAgIGlmIChlbElkID09PSBudWxsKSB7XG4gICAgICAgICAgICBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEEgZGlyZWN0IGJpbmRpbmcgdG8gYSBwcm9wZXJ0eS5cbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSBBVFRSX1RPX1BST1BbYmluZGluZy5uYW1lXSB8fCBiaW5kaW5nLm5hbWU7XG4gICAgICAgICAgY29uc3QgcHJvcCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZWxJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChwcm9wZXJ0eU5hbWUpKTtcbiAgICAgICAgICBjb25zdCBzdG10ID0gdHMuY3JlYXRlQmluYXJ5KHByb3AsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhzdG10LCBiaW5kaW5nLnNvdXJjZVNwYW4pO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoc3RtdCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBIGJpbmRpbmcgdG8gYW4gYW5pbWF0aW9uLCBhdHRyaWJ1dGUsIGNsYXNzIG9yIHN0eWxlLiBGb3Igbm93LCBvbmx5IHZhbGlkYXRlIHRoZSByaWdodC1cbiAgICAgICAgLy8gaGFuZCBzaWRlIG9mIHRoZSBleHByZXNzaW9uLlxuICAgICAgICAvLyBUT0RPOiBwcm9wZXJseSBjaGVjayBjbGFzcyBhbmQgc3R5bGUgYmluZGluZ3MuXG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGV2ZW50IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBvdXRwdXRzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIHByaXZhdGUgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZGlySWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgY29uc3Qgb3V0cHV0cyA9IHRoaXMuZGlyLm91dHB1dHM7XG5cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiB0aGlzLm5vZGUub3V0cHV0cykge1xuICAgICAgaWYgKG91dHB1dC50eXBlICE9PSBQYXJzZWRFdmVudFR5cGUuUmVndWxhciB8fCAhb3V0cHV0cy5oYXNCaW5kaW5nUHJvcGVydHlOYW1lKG91dHB1dC5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogY29uc2lkZXIgc3VwcG9ydGluZyBtdWx0aXBsZSBmaWVsZHMgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eSBuYW1lIGZvciBvdXRwdXRzLlxuICAgICAgY29uc3QgZmllbGQgPSBvdXRwdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShvdXRwdXQubmFtZSkhWzBdLmNsYXNzUHJvcGVydHlOYW1lO1xuXG4gICAgICBpZiAoZGlySWQgPT09IG51bGwpIHtcbiAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICB9XG4gICAgICBjb25zdCBvdXRwdXRGaWVsZCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoZGlySWQsIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoZmllbGQpKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8ob3V0cHV0RmllbGQsIG91dHB1dC5rZXlTcGFuKTtcbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzKSB7XG4gICAgICAgIC8vIEZvciBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cywgZ2VuZXJhdGUgYSBjYWxsIHRvIHRoZSBgc3Vic2NyaWJlYCBtZXRob2RcbiAgICAgICAgLy8gb24gdGhlIGRpcmVjdGl2ZSdzIG91dHB1dCBmaWVsZCB0byBsZXQgdHlwZSBpbmZvcm1hdGlvbiBmbG93IGludG8gdGhlIGhhbmRsZXIgZnVuY3Rpb24nc1xuICAgICAgICAvLyBgJGV2ZW50YCBwYXJhbWV0ZXIuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuSW5mZXIpO1xuICAgICAgICBjb25zdCBzdWJzY3JpYmVGbiA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKG91dHB1dEZpZWxkLCAnc3Vic2NyaWJlJyk7XG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKHN1YnNjcmliZUZuLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCwgW2hhbmRsZXJdKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhjYWxsLCBvdXRwdXQuc291cmNlU3Bhbik7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoY2FsbCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIGRpcmVjdGl2ZSBldmVudHMgaXMgZGlzYWJsZWQ6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICogV2Ugc3RpbGwgZ2VuZXJhdGUgdGhlIGFjY2VzcyB0byB0aGUgb3V0cHV0IGZpZWxkIGFzIGEgc3RhdGVtZW50IGluIHRoZSBUQ0Igc28gY29uc3VtZXJzXG4gICAgICAgIC8vICAgb2YgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VyYCBjYW4gc3RpbGwgZmluZCB0aGUgbm9kZSBmb3IgdGhlIGNsYXNzIG1lbWJlciBmb3IgdGhlXG4gICAgICAgIC8vICAgb3V0cHV0LlxuICAgICAgICAvLyAqIEVtaXQgYSBoYW5kbGVyIGZ1bmN0aW9uIHdoZXJlIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIgaGFzIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUuXG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQob3V0cHV0RmllbGQpKTtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5BbnkpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH1cblxuICAgICAgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvci52aXNpdChcbiAgICAgICAgICBvdXRwdXQuaGFuZGxlciwgdGhpcy50Y2IuaWQsIHRoaXMudGNiLmJvdW5kVGFyZ2V0LCB0aGlzLnRjYi5vb2JSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgXCJ1bmNsYWltZWQgb3V0cHV0c1wiIC0gZXZlbnQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB3aGljaFxuICogd2VyZSBub3QgYXR0cmlidXRlZCB0byBhbnkgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCwgYW5kIGFyZSBpbnN0ZWFkIHByb2Nlc3NlZCBhZ2FpbnN0IHRoZSBIVE1MXG4gKiBlbGVtZW50IGl0c2VsZi5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JVbmNsYWltZWRPdXRwdXRzT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBjbGFpbWVkT3V0cHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgbGV0IGVsSWQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHRoaXMgY291bGQgYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgZm9yIChjb25zdCBvdXRwdXQgb2YgdGhpcy5lbGVtZW50Lm91dHB1dHMpIHtcbiAgICAgIGlmICh0aGlzLmNsYWltZWRPdXRwdXRzLmhhcyhvdXRwdXQubmFtZSkpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGV2ZW50IGhhbmRsZXIgYXMgaXQgd2FzIGNsYWltZWQgYnkgYSBkaXJlY3RpdmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAob3V0cHV0LnR5cGUgPT09IFBhcnNlZEV2ZW50VHlwZS5BbmltYXRpb24pIHtcbiAgICAgICAgLy8gQW5pbWF0aW9uIG91dHB1dCBiaW5kaW5ncyBhbHdheXMgaGF2ZSBhbiBgJGV2ZW50YCBwYXJhbWV0ZXIgb2YgdHlwZSBgQW5pbWF0aW9uRXZlbnRgLlxuICAgICAgICBjb25zdCBldmVudFR5cGUgPSB0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID9cbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5yZWZlcmVuY2VFeHRlcm5hbFR5cGUoJ0Bhbmd1bGFyL2FuaW1hdGlvbnMnLCAnQW5pbWF0aW9uRXZlbnQnKSA6XG4gICAgICAgICAgICBFdmVudFBhcmFtVHlwZS5Bbnk7XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBldmVudFR5cGUpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgRE9NIGV2ZW50cyBpcyBlbmFibGVkLCBnZW5lcmF0ZSBhIGNhbGwgdG8gYGFkZEV2ZW50TGlzdGVuZXJgIG9uXG4gICAgICAgIC8vIHRoZSBlbGVtZW50IGluc3RhbmNlIHNvIHRoYXQgVHlwZVNjcmlwdCdzIHR5cGUgaW5mZXJlbmNlIGZvclxuICAgICAgICAvLyBgSFRNTEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcmAgdXNpbmcgYEhUTUxFbGVtZW50RXZlbnRNYXBgIHRvIGluZmVyIGFuIGFjY3VyYXRlIHR5cGUgZm9yXG4gICAgICAgIC8vIGAkZXZlbnRgIGRlcGVuZGluZyBvbiB0aGUgZXZlbnQgbmFtZS4gRm9yIHVua25vd24gZXZlbnQgbmFtZXMsIFR5cGVTY3JpcHQgcmVzb3J0cyB0byB0aGVcbiAgICAgICAgLy8gYmFzZSBgRXZlbnRgIHR5cGUuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0Y2JDcmVhdGVFdmVudEhhbmRsZXIob3V0cHV0LCB0aGlzLnRjYiwgdGhpcy5zY29wZSwgRXZlbnRQYXJhbVR5cGUuSW5mZXIpO1xuXG4gICAgICAgIGlmIChlbElkID09PSBudWxsKSB7XG4gICAgICAgICAgZWxJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3BlcnR5QWNjZXNzID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZWxJZCwgJ2FkZEV2ZW50TGlzdGVuZXInKTtcbiAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhwcm9wZXJ0eUFjY2Vzcywgb3V0cHV0LmtleVNwYW4pO1xuICAgICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gcHJvcGVydHlBY2Nlc3MsXG4gICAgICAgICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGFyZ3VtZW50cyAqL1t0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKG91dHB1dC5uYW1lKSwgaGFuZGxlcl0pO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGNhbGwsIG91dHB1dC5zb3VyY2VTcGFuKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjYWxsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgRE9NIGlucHV0cyBpcyBkaXNhYmxlZCwgZW1pdCBhIGhhbmRsZXIgZnVuY3Rpb24gd2hlcmUgdGhlIGAkZXZlbnRgXG4gICAgICAgIC8vIHBhcmFtZXRlciBoYXMgYW4gZXhwbGljaXQgYGFueWAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5BbnkpO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGhhbmRsZXIpKTtcbiAgICAgIH1cblxuICAgICAgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvci52aXNpdChcbiAgICAgICAgICBvdXRwdXQuaGFuZGxlciwgdGhpcy50Y2IuaWQsIHRoaXMudGNiLmJvdW5kVGFyZ2V0LCB0aGlzLnRjYi5vb2JSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGEgY29tcGxldGlvbiBwb2ludCBmb3IgdGhlIGNvbXBvbmVudCBjb250ZXh0LlxuICpcbiAqIFRoaXMgY29tcGxldGlvbiBwb2ludCBsb29rcyBsaWtlIGBjdHguIDtgIGluIHRoZSBUQ0Igb3V0cHV0LCBhbmQgZG9lcyBub3QgcHJvZHVjZSBkaWFnbm9zdGljcy5cbiAqIFR5cGVTY3JpcHQgYXV0b2NvbXBsZXRpb24gQVBJcyBjYW4gYmUgdXNlZCBhdCB0aGlzIGNvbXBsZXRpb24gcG9pbnQgKGFmdGVyIHRoZSAnLicpIHRvIHByb2R1Y2VcbiAqIGF1dG9jb21wbGV0aW9uIHJlc3VsdHMgb2YgcHJvcGVydGllcyBhbmQgbWV0aG9kcyBmcm9tIHRoZSB0ZW1wbGF0ZSdzIGNvbXBvbmVudCBjb250ZXh0LlxuICovXG5jbGFzcyBUY2JDb21wb25lbnRDb250ZXh0Q29tcGxldGlvbk9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNjb3BlOiBTY29wZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICByZWFkb25seSBvcHRpb25hbCA9IGZhbHNlO1xuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgY3R4ID0gdHMuY3JlYXRlSWRlbnRpZmllcignY3R4Jyk7XG4gICAgY29uc3QgY3R4RG90ID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoY3R4LCAnJyk7XG4gICAgbWFya0lnbm9yZURpYWdub3N0aWNzKGN0eERvdCk7XG4gICAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIoY3R4RG90LCBFeHByZXNzaW9uSWRlbnRpZmllci5DT01QT05FTlRfQ09NUExFVElPTik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjdHhEb3QpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFZhbHVlIHVzZWQgdG8gYnJlYWsgYSBjaXJjdWxhciByZWZlcmVuY2UgYmV0d2VlbiBgVGNiT3Bgcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIHJldHVybmVkIHdoZW5ldmVyIGBUY2JPcGBzIGhhdmUgYSBjaXJjdWxhciBkZXBlbmRlbmN5LiBUaGUgZXhwcmVzc2lvbiBpcyBhIG5vbi1udWxsXG4gKiBhc3NlcnRpb24gb2YgdGhlIG51bGwgdmFsdWUgKGluIFR5cGVTY3JpcHQsIHRoZSBleHByZXNzaW9uIGBudWxsIWApLiBUaGlzIGNvbnN0cnVjdGlvbiB3aWxsIGluZmVyXG4gKiB0aGUgbGVhc3QgbmFycm93IHR5cGUgZm9yIHdoYXRldmVyIGl0J3MgYXNzaWduZWQgdG8uXG4gKi9cbmNvbnN0IElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpO1xuXG4vKipcbiAqIE92ZXJhbGwgZ2VuZXJhdGlvbiBjb250ZXh0IGZvciB0aGUgdHlwZSBjaGVjayBibG9jay5cbiAqXG4gKiBgQ29udGV4dGAgaGFuZGxlcyBvcGVyYXRpb25zIGR1cmluZyBjb2RlIGdlbmVyYXRpb24gd2hpY2ggYXJlIGdsb2JhbCB3aXRoIHJlc3BlY3QgdG8gdGhlIHdob2xlXG4gKiBibG9jay4gSXQncyByZXNwb25zaWJsZSBmb3IgdmFyaWFibGUgbmFtZSBhbGxvY2F0aW9uIGFuZCBtYW5hZ2VtZW50IG9mIGFueSBpbXBvcnRzIG5lZWRlZC4gSXRcbiAqIGFsc28gY29udGFpbnMgdGhlIHRlbXBsYXRlIG1ldGFkYXRhIGl0c2VsZi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBwcml2YXRlIG5leHRJZCA9IDE7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBlbnY6IEVudmlyb25tZW50LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciwgcmVhZG9ubHkgaWQ6IFRlbXBsYXRlSWQsXG4gICAgICByZWFkb25seSBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LFxuICAgICAgcHJpdmF0ZSBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PixcbiAgICAgIHJlYWRvbmx5IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pIHt9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGEgbmV3IHZhcmlhYmxlIG5hbWUgZm9yIHVzZSB3aXRoaW4gdGhlIGBDb250ZXh0YC5cbiAgICpcbiAgICogQ3VycmVudGx5IHRoaXMgdXNlcyBhIG1vbm90b25pY2FsbHkgaW5jcmVhc2luZyBjb3VudGVyLCBidXQgaW4gdGhlIGZ1dHVyZSB0aGUgdmFyaWFibGUgbmFtZVxuICAgKiBtaWdodCBjaGFuZ2UgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGRhdGEgYmVpbmcgc3RvcmVkLlxuICAgKi9cbiAgYWxsb2NhdGVJZCgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihgX3Qke3RoaXMubmV4dElkKyt9YCk7XG4gIH1cblxuICBnZXRQaXBlQnlOYW1lKG5hbWU6IHN0cmluZyk6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PnxudWxsIHtcbiAgICBpZiAoIXRoaXMucGlwZXMuaGFzKG5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGlwZXMuZ2V0KG5hbWUpITtcbiAgfVxufVxuXG4vKipcbiAqIExvY2FsIHNjb3BlIHdpdGhpbiB0aGUgdHlwZSBjaGVjayBibG9jayBmb3IgYSBwYXJ0aWN1bGFyIHRlbXBsYXRlLlxuICpcbiAqIFRoZSB0b3AtbGV2ZWwgdGVtcGxhdGUgYW5kIGVhY2ggbmVzdGVkIGA8bmctdGVtcGxhdGU+YCBoYXZlIHRoZWlyIG93biBgU2NvcGVgLCB3aGljaCBleGlzdCBpbiBhXG4gKiBoaWVyYXJjaHkuIFRoZSBzdHJ1Y3R1cmUgb2YgdGhpcyBoaWVyYXJjaHkgbWlycm9ycyB0aGUgc3ludGFjdGljIHNjb3BlcyBpbiB0aGUgZ2VuZXJhdGVkIHR5cGVcbiAqIGNoZWNrIGJsb2NrLCB3aGVyZSBlYWNoIG5lc3RlZCB0ZW1wbGF0ZSBpcyBlbmNhc2VkIGluIGFuIGBpZmAgc3RydWN0dXJlLlxuICpcbiAqIEFzIGEgdGVtcGxhdGUncyBgVGNiT3BgcyBhcmUgZXhlY3V0ZWQgaW4gYSBnaXZlbiBgU2NvcGVgLCBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB2aWFcbiAqIGBhZGRTdGF0ZW1lbnQoKWAuIFdoZW4gdGhpcyBwcm9jZXNzaW5nIGlzIGNvbXBsZXRlLCB0aGUgYFNjb3BlYCBjYW4gYmUgdHVybmVkIGludG8gYSBgdHMuQmxvY2tgXG4gKiB2aWEgYHJlbmRlclRvQmxvY2soKWAuXG4gKlxuICogSWYgYSBgVGNiT3BgIHJlcXVpcmVzIHRoZSBvdXRwdXQgb2YgYW5vdGhlciwgaXQgY2FuIGNhbGwgYHJlc29sdmUoKWAuXG4gKi9cbmNsYXNzIFNjb3BlIHtcbiAgLyoqXG4gICAqIEEgcXVldWUgb2Ygb3BlcmF0aW9ucyB3aGljaCBuZWVkIHRvIGJlIHBlcmZvcm1lZCB0byBnZW5lcmF0ZSB0aGUgVENCIGNvZGUgZm9yIHRoaXMgc2NvcGUuXG4gICAqXG4gICAqIFRoaXMgYXJyYXkgY2FuIGNvbnRhaW4gZWl0aGVyIGEgYFRjYk9wYCB3aGljaCBoYXMgeWV0IHRvIGJlIGV4ZWN1dGVkLCBvciBhIGB0cy5FeHByZXNzaW9ufG51bGxgXG4gICAqIHJlcHJlc2VudGluZyB0aGUgbWVtb2l6ZWQgcmVzdWx0IG9mIGV4ZWN1dGluZyB0aGUgb3BlcmF0aW9uLiBBcyBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgdGhlaXJcbiAgICogcmVzdWx0cyBhcmUgd3JpdHRlbiBpbnRvIHRoZSBgb3BRdWV1ZWAsIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBvcGVyYXRpb24uXG4gICAqXG4gICAqIElmIGFuIG9wZXJhdGlvbiBpcyBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBleGVjdXRlZCwgaXQgaXMgdGVtcG9yYXJpbHkgb3ZlcndyaXR0ZW4gaGVyZSB3aXRoXG4gICAqIGBJTkZFUl9UWVBFX0ZPUl9DSVJDVUxBUl9PUF9FWFBSYC4gVGhpcyB3YXksIGlmIGEgY3ljbGUgaXMgZW5jb3VudGVyZWQgd2hlcmUgYW4gb3BlcmF0aW9uXG4gICAqIGRlcGVuZHMgdHJhbnNpdGl2ZWx5IG9uIGl0cyBvd24gcmVzdWx0LCB0aGUgaW5uZXIgb3BlcmF0aW9uIHdpbGwgaW5mZXIgdGhlIGxlYXN0IG5hcnJvdyB0eXBlXG4gICAqIHRoYXQgZml0cyBpbnN0ZWFkLiBUaGlzIGhhcyB0aGUgc2FtZSBzZW1hbnRpY3MgYXMgVHlwZVNjcmlwdCBpdHNlbGYgd2hlbiB0eXBlcyBhcmUgcmVmZXJlbmNlZFxuICAgKiBjaXJjdWxhcmx5LlxuICAgKi9cbiAgcHJpdmF0ZSBvcFF1ZXVlOiAoVGNiT3B8dHMuRXhwcmVzc2lvbnxudWxsKVtdID0gW107XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGBUbXBsQXN0RWxlbWVudGBzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiRWxlbWVudE9wYCBpbiB0aGUgYG9wUXVldWVgXG4gICAqL1xuICBwcml2YXRlIGVsZW1lbnRPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdEVsZW1lbnQsIG51bWJlcj4oKTtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIG1hcHMgd2hpY2ggdHJhY2tzIHRoZSBpbmRleCBvZiBgVGNiRGlyZWN0aXZlQ3Rvck9wYHMgaW4gdGhlIGBvcFF1ZXVlYCBmb3IgZWFjaFxuICAgKiBkaXJlY3RpdmUgb24gYSBgVG1wbEFzdEVsZW1lbnRgIG9yIGBUbXBsQXN0VGVtcGxhdGVgIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIGRpcmVjdGl2ZU9wTWFwID1cbiAgICAgIG5ldyBNYXA8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIG51bWJlcj4+KCk7XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGBUbXBsQXN0UmVmZXJlbmNlYHMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JSZWZlcmVuY2VPcGAgaW4gdGhlIGBvcFF1ZXVlYFxuICAgKi9cbiAgcHJpdmF0ZSByZWZlcmVuY2VPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdFJlZmVyZW5jZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW1tZWRpYXRlbHkgbmVzdGVkIDxuZy10ZW1wbGF0ZT5zICh3aXRoaW4gdGhpcyBgU2NvcGVgKSByZXByZXNlbnRlZCBieSBgVG1wbEFzdFRlbXBsYXRlYFxuICAgKiBub2RlcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYlRlbXBsYXRlQ29udGV4dE9wYHMgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICovXG4gIHByaXZhdGUgdGVtcGxhdGVDdHhPcE1hcCA9IG5ldyBNYXA8VG1wbEFzdFRlbXBsYXRlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiB2YXJpYWJsZXMgZGVjbGFyZWQgb24gdGhlIHRlbXBsYXRlIHRoYXQgY3JlYXRlZCB0aGlzIGBTY29wZWAgKHJlcHJlc2VudGVkIGJ5XG4gICAqIGBUbXBsQXN0VmFyaWFibGVgIG5vZGVzKSB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYlZhcmlhYmxlT3BgcyBpbiB0aGUgYG9wUXVldWVgLlxuICAgKi9cbiAgcHJpdmF0ZSB2YXJNYXAgPSBuZXcgTWFwPFRtcGxBc3RWYXJpYWJsZSwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBTdGF0ZW1lbnRzIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgKlxuICAgKiBFeGVjdXRpbmcgdGhlIGBUY2JPcGBzIGluIHRoZSBgb3BRdWV1ZWAgcG9wdWxhdGVzIHRoaXMgYXJyYXkuXG4gICAqL1xuICBwcml2YXRlIHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHBhcmVudDogU2NvcGV8bnVsbCA9IG51bGwsXG4gICAgICBwcml2YXRlIGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgYFNjb3BlYCBnaXZlbiBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCBvciBhIGxpc3Qgb2YgYFRtcGxBc3ROb2RlYHMuXG4gICAqXG4gICAqIEBwYXJhbSB0Y2IgdGhlIG92ZXJhbGwgY29udGV4dCBvZiBUQ0IgZ2VuZXJhdGlvbi5cbiAgICogQHBhcmFtIHBhcmVudCB0aGUgYFNjb3BlYCBvZiB0aGUgcGFyZW50IHRlbXBsYXRlIChpZiBhbnkpIG9yIGBudWxsYCBpZiB0aGlzIGlzIHRoZSByb290XG4gICAqIGBTY29wZWAuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZU9yTm9kZXMgZWl0aGVyIGEgYFRtcGxBc3RUZW1wbGF0ZWAgcmVwcmVzZW50aW5nIHRoZSB0ZW1wbGF0ZSBmb3Igd2hpY2ggdG9cbiAgICogY2FsY3VsYXRlIHRoZSBgU2NvcGVgLCBvciBhIGxpc3Qgb2Ygbm9kZXMgaWYgbm8gb3V0ZXIgdGVtcGxhdGUgb2JqZWN0IGlzIGF2YWlsYWJsZS5cbiAgICogQHBhcmFtIGd1YXJkIGFuIGV4cHJlc3Npb24gdGhhdCBpcyBhcHBsaWVkIHRvIHRoaXMgc2NvcGUgZm9yIHR5cGUgbmFycm93aW5nIHB1cnBvc2VzLlxuICAgKi9cbiAgc3RhdGljIGZvck5vZGVzKFxuICAgICAgdGNiOiBDb250ZXh0LCBwYXJlbnQ6IFNjb3BlfG51bGwsIHRlbXBsYXRlT3JOb2RlczogVG1wbEFzdFRlbXBsYXRlfChUbXBsQXN0Tm9kZVtdKSxcbiAgICAgIGd1YXJkOiB0cy5FeHByZXNzaW9ufG51bGwpOiBTY29wZSB7XG4gICAgY29uc3Qgc2NvcGUgPSBuZXcgU2NvcGUodGNiLCBwYXJlbnQsIGd1YXJkKTtcblxuICAgIGlmIChwYXJlbnQgPT09IG51bGwgJiYgdGNiLmVudi5jb25maWcuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcikge1xuICAgICAgLy8gQWRkIGFuIGF1dG9jb21wbGV0aW9uIHBvaW50IGZvciB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gICAgICBzY29wZS5vcFF1ZXVlLnB1c2gobmV3IFRjYkNvbXBvbmVudENvbnRleHRDb21wbGV0aW9uT3Aoc2NvcGUpKTtcbiAgICB9XG5cbiAgICBsZXQgY2hpbGRyZW46IFRtcGxBc3ROb2RlW107XG5cbiAgICAvLyBJZiBnaXZlbiBhbiBhY3R1YWwgYFRtcGxBc3RUZW1wbGF0ZWAgaW5zdGFuY2UsIHRoZW4gcHJvY2VzcyBhbnkgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBpdFxuICAgIC8vIGhhcy5cbiAgICBpZiAodGVtcGxhdGVPck5vZGVzIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUncyB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgbmVlZCB0byBiZSBhZGRlZCBhcyBgVGNiVmFyaWFibGVPcGBzLlxuICAgICAgY29uc3QgdmFyTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRtcGxBc3RWYXJpYWJsZT4oKTtcblxuICAgICAgZm9yIChjb25zdCB2IG9mIHRlbXBsYXRlT3JOb2Rlcy52YXJpYWJsZXMpIHtcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCB2YXJpYWJsZXMgb24gdGhlIGBUbXBsQXN0VGVtcGxhdGVgIGFyZSBvbmx5IGRlY2xhcmVkIG9uY2UuXG4gICAgICAgIGlmICghdmFyTWFwLmhhcyh2Lm5hbWUpKSB7XG4gICAgICAgICAgdmFyTWFwLnNldCh2Lm5hbWUsIHYpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGZpcnN0RGVjbCA9IHZhck1hcC5nZXQodi5uYW1lKSE7XG4gICAgICAgICAgdGNiLm9vYlJlY29yZGVyLmR1cGxpY2F0ZVRlbXBsYXRlVmFyKHRjYi5pZCwgdiwgZmlyc3REZWNsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wSW5kZXggPSBzY29wZS5vcFF1ZXVlLnB1c2gobmV3IFRjYlZhcmlhYmxlT3AodGNiLCBzY29wZSwgdGVtcGxhdGVPck5vZGVzLCB2KSkgLSAxO1xuICAgICAgICBzY29wZS52YXJNYXAuc2V0KHYsIG9wSW5kZXgpO1xuICAgICAgfVxuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXMuY2hpbGRyZW47XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkcmVuID0gdGVtcGxhdGVPck5vZGVzO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgY2hpbGRyZW4pIHtcbiAgICAgIHNjb3BlLmFwcGVuZE5vZGUobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIHVwIGEgYHRzLkV4cHJlc3Npb25gIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2Ygc29tZSBvcGVyYXRpb24gaW4gdGhlIGN1cnJlbnQgYFNjb3BlYCxcbiAgICogaW5jbHVkaW5nIGFueSBwYXJlbnQgc2NvcGUocykuIFRoaXMgbWV0aG9kIGFsd2F5cyByZXR1cm5zIGEgbXV0YWJsZSBjbG9uZSBvZiB0aGVcbiAgICogYHRzLkV4cHJlc3Npb25gIHdpdGggdGhlIGNvbW1lbnRzIGNsZWFyZWQuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGEgYFRtcGxBc3ROb2RlYCBvZiB0aGUgb3BlcmF0aW9uIGluIHF1ZXN0aW9uLiBUaGUgbG9va3VwIHBlcmZvcm1lZCB3aWxsIGRlcGVuZCBvblxuICAgKiB0aGUgdHlwZSBvZiB0aGlzIG5vZGU6XG4gICAqXG4gICAqIEFzc3VtaW5nIGBkaXJlY3RpdmVgIGlzIG5vdCBwcmVzZW50LCB0aGVuIGByZXNvbHZlYCB3aWxsIHJldHVybjpcbiAgICpcbiAgICogKiBgVG1wbEFzdEVsZW1lbnRgIC0gcmV0cmlldmUgdGhlIGV4cHJlc3Npb24gZm9yIHRoZSBlbGVtZW50IERPTSBub2RlXG4gICAqICogYFRtcGxBc3RUZW1wbGF0ZWAgLSByZXRyaWV2ZSB0aGUgdGVtcGxhdGUgY29udGV4dCB2YXJpYWJsZVxuICAgKiAqIGBUbXBsQXN0VmFyaWFibGVgIC0gcmV0cmlldmUgYSB0ZW1wbGF0ZSBsZXQtIHZhcmlhYmxlXG4gICAqICogYFRtcGxBc3RSZWZlcmVuY2VgIC0gcmV0cmlldmUgdmFyaWFibGUgY3JlYXRlZCBmb3IgdGhlIGxvY2FsIHJlZlxuICAgKlxuICAgKiBAcGFyYW0gZGlyZWN0aXZlIGlmIHByZXNlbnQsIGEgZGlyZWN0aXZlIHR5cGUgb24gYSBgVG1wbEFzdEVsZW1lbnRgIG9yIGBUbXBsQXN0VGVtcGxhdGVgIHRvXG4gICAqIGxvb2sgdXAgaW5zdGVhZCBvZiB0aGUgZGVmYXVsdCBmb3IgYW4gZWxlbWVudCBvciB0ZW1wbGF0ZSBub2RlLlxuICAgKi9cbiAgcmVzb2x2ZShcbiAgICAgIG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0VmFyaWFibGV8VG1wbEFzdFJlZmVyZW5jZSxcbiAgICAgIGRpcmVjdGl2ZT86IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIHRoZSBvcGVyYXRpb24gbG9jYWxseS5cbiAgICBjb25zdCByZXMgPSB0aGlzLnJlc29sdmVMb2NhbChub2RlLCBkaXJlY3RpdmUpO1xuICAgIGlmIChyZXMgIT09IG51bGwpIHtcbiAgICAgIC8vIFdlIHdhbnQgdG8gZ2V0IGEgY2xvbmUgb2YgdGhlIHJlc29sdmVkIGV4cHJlc3Npb24gYW5kIGNsZWFyIHRoZSB0cmFpbGluZyBjb21tZW50c1xuICAgICAgLy8gc28gdGhleSBkb24ndCBjb250aW51ZSB0byBhcHBlYXIgaW4gZXZlcnkgcGxhY2UgdGhlIGV4cHJlc3Npb24gaXMgdXNlZC5cbiAgICAgIC8vIEFzIGFuIGV4YW1wbGUsIHRoaXMgd291bGQgb3RoZXJ3aXNlIHByb2R1Y2U6XG4gICAgICAvLyB2YXIgX3QxIC8qKlQ6RElSKi8gLyoxLDIqLyA9IF9jdG9yMSgpO1xuICAgICAgLy8gX3QxIC8qKlQ6RElSKi8gLyoxLDIqLy5pbnB1dCA9ICd2YWx1ZSc7XG4gICAgICAvL1xuICAgICAgLy8gSW4gYWRkaXRpb24sIHJldHVybmluZyBhIGNsb25lIHByZXZlbnRzIHRoZSBjb25zdW1lciBvZiBgU2NvcGUjcmVzb2x2ZWAgZnJvbVxuICAgICAgLy8gYXR0YWNoaW5nIGNvbW1lbnRzIGF0IHRoZSBkZWNsYXJhdGlvbiBzaXRlLlxuXG4gICAgICBjb25zdCBjbG9uZSA9IHRzLmdldE11dGFibGVDbG9uZShyZXMpO1xuICAgICAgdHMuc2V0U3ludGhldGljVHJhaWxpbmdDb21tZW50cyhjbG9uZSwgW10pO1xuICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH0gZWxzZSBpZiAodGhpcy5wYXJlbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIENoZWNrIHdpdGggdGhlIHBhcmVudC5cbiAgICAgIHJldHVybiB0aGlzLnBhcmVudC5yZXNvbHZlKG5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgJHtub2RlfSAvICR7ZGlyZWN0aXZlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBzdGF0ZW1lbnQgdG8gdGhpcyBzY29wZS5cbiAgICovXG4gIGFkZFN0YXRlbWVudChzdG10OiB0cy5TdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHN0YXRlbWVudHMuXG4gICAqL1xuICByZW5kZXIoKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5vcFF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBPcHRpb25hbCBzdGF0ZW1lbnRzIGNhbm5vdCBiZSBza2lwcGVkIHdoZW4gd2UgYXJlIGdlbmVyYXRpbmcgdGhlIFRDQiBmb3IgdXNlXG4gICAgICAvLyBieSB0aGUgVGVtcGxhdGVUeXBlQ2hlY2tlci5cbiAgICAgIGNvbnN0IHNraXBPcHRpb25hbCA9ICF0aGlzLnRjYi5lbnYuY29uZmlnLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI7XG4gICAgICB0aGlzLmV4ZWN1dGVPcChpLCBza2lwT3B0aW9uYWwpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZW1lbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gZXhwcmVzc2lvbiBvZiBhbGwgdGVtcGxhdGUgZ3VhcmRzIHRoYXQgYXBwbHkgdG8gdGhpcyBzY29wZSwgaW5jbHVkaW5nIHRob3NlIG9mXG4gICAqIHBhcmVudCBzY29wZXMuIElmIG5vIGd1YXJkcyBoYXZlIGJlZW4gYXBwbGllZCwgbnVsbCBpcyByZXR1cm5lZC5cbiAgICovXG4gIGd1YXJkcygpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGxldCBwYXJlbnRHdWFyZHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAvLyBTdGFydCB3aXRoIHRoZSBndWFyZHMgZnJvbSB0aGUgcGFyZW50IHNjb3BlLCBpZiBwcmVzZW50LlxuICAgICAgcGFyZW50R3VhcmRzID0gdGhpcy5wYXJlbnQuZ3VhcmRzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ3VhcmQgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoaXMgc2NvcGUgZG9lcyBub3QgaGF2ZSBhIGd1YXJkLCBzbyByZXR1cm4gdGhlIHBhcmVudCdzIGd1YXJkcyBhcyBpcy5cbiAgICAgIHJldHVybiBwYXJlbnRHdWFyZHM7XG4gICAgfSBlbHNlIGlmIChwYXJlbnRHdWFyZHMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlJ3Mgbm8gZ3VhcmRzIGZyb20gdGhlIHBhcmVudCBzY29wZSwgc28gdGhpcyBzY29wZSdzIGd1YXJkIHJlcHJlc2VudHMgYWxsIGF2YWlsYWJsZVxuICAgICAgLy8gZ3VhcmRzLlxuICAgICAgcmV0dXJuIHRoaXMuZ3VhcmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEJvdGggdGhlIHBhcmVudCBzY29wZSBhbmQgdGhpcyBzY29wZSBwcm92aWRlIGEgZ3VhcmQsIHNvIGNyZWF0ZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB0d28uXG4gICAgICAvLyBJdCBpcyBpbXBvcnRhbnQgdGhhdCB0aGUgcGFyZW50IGd1YXJkIGlzIHVzZWQgYXMgbGVmdCBvcGVyYW5kLCBnaXZlbiB0aGF0IGl0IG1heSBwcm92aWRlXG4gICAgICAvLyBuYXJyb3dpbmcgdGhhdCBpcyByZXF1aXJlZCBmb3IgdGhpcyBzY29wZSdzIGd1YXJkIHRvIGJlIHZhbGlkLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShwYXJlbnRHdWFyZHMsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIHRoaXMuZ3VhcmQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUxvY2FsKFxuICAgICAgcmVmOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdFZhcmlhYmxlfFRtcGxBc3RSZWZlcmVuY2UsXG4gICAgICBkaXJlY3RpdmU/OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RSZWZlcmVuY2UgJiYgdGhpcy5yZWZlcmVuY2VPcE1hcC5oYXMocmVmKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMucmVmZXJlbmNlT3BNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2UgaWYgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSAmJiB0aGlzLnZhck1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGBUY2JWYXJpYWJsZU9wYCBhc3NvY2lhdGVkIHdpdGggdGhlIGBUbXBsQXN0VmFyaWFibGVgLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMudmFyTWFwLmdldChyZWYpISk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgcmVmIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlICYmIGRpcmVjdGl2ZSA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgIHRoaXMudGVtcGxhdGVDdHhPcE1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIHRoZSBjb250ZXh0IG9mIHRoZSBnaXZlbiBzdWItdGVtcGxhdGUuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBgVGNiVGVtcGxhdGVDb250ZXh0T3BgIGZvciB0aGUgdGVtcGxhdGUuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy50ZW1wbGF0ZUN0eE9wTWFwLmdldChyZWYpISk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgKHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHJlZiBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkgJiZcbiAgICAgICAgZGlyZWN0aXZlICE9PSB1bmRlZmluZWQgJiYgdGhpcy5kaXJlY3RpdmVPcE1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIGEgZGlyZWN0aXZlIG9uIGFuIGVsZW1lbnQgb3Igc3ViLXRlbXBsYXRlLlxuICAgICAgY29uc3QgZGlyTWFwID0gdGhpcy5kaXJlY3RpdmVPcE1hcC5nZXQocmVmKSE7XG4gICAgICBpZiAoZGlyTWFwLmhhcyhkaXJlY3RpdmUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcChkaXJNYXAuZ2V0KGRpcmVjdGl2ZSkhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVmIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgJiYgdGhpcy5lbGVtZW50T3BNYXAuaGFzKHJlZikpIHtcbiAgICAgIC8vIFJlc29sdmluZyB0aGUgRE9NIG5vZGUgb2YgYW4gZWxlbWVudCBpbiB0aGlzIHRlbXBsYXRlLlxuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKHRoaXMuZWxlbWVudE9wTWFwLmdldChyZWYpISk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBMaWtlIGBleGVjdXRlT3BgLCBidXQgYXNzZXJ0IHRoYXQgdGhlIG9wZXJhdGlvbiBhY3R1YWxseSByZXR1cm5lZCBgdHMuRXhwcmVzc2lvbmAuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVPcChvcEluZGV4OiBudW1iZXIpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCByZXMgPSB0aGlzLmV4ZWN1dGVPcChvcEluZGV4LCAvKiBza2lwT3B0aW9uYWwgKi8gZmFsc2UpO1xuICAgIGlmIChyZXMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3IgcmVzb2x2aW5nIG9wZXJhdGlvbiwgZ290IG51bGxgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGEgcGFydGljdWxhciBgVGNiT3BgIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHJlcGxhY2VzIHRoZSBvcGVyYXRpb24gaW4gdGhlIGBvcFF1ZXVlYCB3aXRoIHRoZSByZXN1bHQgb2YgZXhlY3V0aW9uIChvbmNlIGRvbmUpXG4gICAqIGFuZCBhbHNvIHByb3RlY3RzIGFnYWluc3QgYSBjaXJjdWxhciBkZXBlbmRlbmN5IGZyb20gdGhlIG9wZXJhdGlvbiB0byBpdHNlbGYgYnkgdGVtcG9yYXJpbHlcbiAgICogc2V0dGluZyB0aGUgb3BlcmF0aW9uJ3MgcmVzdWx0IHRvIGEgc3BlY2lhbCBleHByZXNzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBleGVjdXRlT3Aob3BJbmRleDogbnVtYmVyLCBza2lwT3B0aW9uYWw6IGJvb2xlYW4pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IG9wID0gdGhpcy5vcFF1ZXVlW29wSW5kZXhdO1xuICAgIGlmICghKG9wIGluc3RhbmNlb2YgVGNiT3ApKSB7XG4gICAgICByZXR1cm4gb3A7XG4gICAgfVxuXG4gICAgaWYgKHNraXBPcHRpb25hbCAmJiBvcC5vcHRpb25hbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbiBpbiB0aGUgcXVldWUgdG8gaXRzIGNpcmN1bGFyIGZhbGxiYWNrLiBJZiBleGVjdXRpbmcgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiByZXN1bHRzIGluIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSwgdGhpcyB3aWxsIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcCBhbmQgYWxsb3cgZm9yXG4gICAgLy8gdGhlIHJlc29sdXRpb24gb2Ygc3VjaCBjeWNsZXMuXG4gICAgdGhpcy5vcFF1ZXVlW29wSW5kZXhdID0gb3AuY2lyY3VsYXJGYWxsYmFjaygpO1xuICAgIGNvbnN0IHJlcyA9IG9wLmV4ZWN1dGUoKTtcbiAgICAvLyBPbmNlIHRoZSBvcGVyYXRpb24gaGFzIGZpbmlzaGVkIGV4ZWN1dGluZywgaXQncyBzYWZlIHRvIGNhY2hlIHRoZSByZWFsIHJlc3VsdC5cbiAgICB0aGlzLm9wUXVldWVbb3BJbmRleF0gPSByZXM7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kTm9kZShub2RlOiBUbXBsQXN0Tm9kZSk6IHZvaWQge1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IG9wSW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRWxlbWVudE9wKHRoaXMudGNiLCB0aGlzLCBub2RlKSkgLSAxO1xuICAgICAgdGhpcy5lbGVtZW50T3BNYXAuc2V0KG5vZGUsIG9wSW5kZXgpO1xuICAgICAgdGhpcy5hcHBlbmREaXJlY3RpdmVzQW5kSW5wdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgdGhpcy5hcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kTm9kZShjaGlsZCk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrQW5kQXBwZW5kUmVmZXJlbmNlc09mTm9kZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIFRlbXBsYXRlIGNoaWxkcmVuIGFyZSByZW5kZXJlZCBpbiBhIGNoaWxkIHNjb3BlLlxuICAgICAgdGhpcy5hcHBlbmREaXJlY3RpdmVzQW5kSW5wdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgdGhpcy5hcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGUpO1xuICAgICAgY29uc3QgY3R4SW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGVtcGxhdGVDb250ZXh0T3AodGhpcy50Y2IsIHRoaXMpKSAtIDE7XG4gICAgICB0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuc2V0KG5vZGUsIGN0eEluZGV4KTtcbiAgICAgIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVGVtcGxhdGVCb2RpZXMpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRlbXBsYXRlQm9keU9wKHRoaXMudGNiLCB0aGlzLCBub2RlKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGNiLmVudi5jb25maWcuYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kRGVlcFNjaGVtYUNoZWNrcyhub2RlLmNoaWxkcmVuKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tBbmRBcHBlbmRSZWZlcmVuY2VzT2ZOb2RlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZFRleHQpIHtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZXh0SW50ZXJwb2xhdGlvbk9wKHRoaXMudGNiLCB0aGlzLCBub2RlKSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEljdSkge1xuICAgICAgdGhpcy5hcHBlbmRJY3VFeHByZXNzaW9ucyhub2RlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNoZWNrQW5kQXBwZW5kUmVmZXJlbmNlc09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJlZiBvZiBub2RlLnJlZmVyZW5jZXMpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuXG4gICAgICBsZXQgY3R4SW5kZXg6IG51bWJlcjtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhlIHJlZmVyZW5jZSBpcyBpbnZhbGlkIGlmIGl0IGRvZXNuJ3QgaGF2ZSBhIHRhcmdldCwgc28gcmVwb3J0IGl0IGFzIGFuIGVycm9yLlxuICAgICAgICB0aGlzLnRjYi5vb2JSZWNvcmRlci5taXNzaW5nUmVmZXJlbmNlVGFyZ2V0KHRoaXMudGNiLmlkLCByZWYpO1xuXG4gICAgICAgIC8vIEFueSB1c2FnZXMgb2YgdGhlIGludmFsaWQgcmVmZXJlbmNlIHdpbGwgYmUgcmVzb2x2ZWQgdG8gYSB2YXJpYWJsZSBvZiB0eXBlIGFueS5cbiAgICAgICAgY3R4SW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiSW52YWxpZFJlZmVyZW5jZU9wKHRoaXMudGNiLCB0aGlzKSkgLSAxO1xuICAgICAgfSBlbHNlIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgdGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgY3R4SW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMsIHJlZiwgbm9kZSwgdGFyZ2V0KSkgLSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4SW5kZXggPVxuICAgICAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlJlZmVyZW5jZU9wKHRoaXMudGNiLCB0aGlzLCByZWYsIG5vZGUsIHRhcmdldC5kaXJlY3RpdmUpKSAtIDE7XG4gICAgICB9XG4gICAgICB0aGlzLnJlZmVyZW5jZU9wTWFwLnNldChyZWYsIGN0eEluZGV4KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIGlucHV0cyBvbiB0aGUgZWxlbWVudC5cbiAgICBjb25zdCBjbGFpbWVkSW5wdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwgfHwgZGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzLCB0aGVuIGFsbCBpbnB1dHMgYXJlIHVuY2xhaW1lZCBpbnB1dHMsIHNvIHF1ZXVlIGFuIG9wZXJhdGlvblxuICAgICAgLy8gdG8gYWRkIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkSW5wdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2goXG4gICAgICAgICAgICBuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCAvKiBjaGVja0VsZW1lbnQgKi8gdHJ1ZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRpck1hcCA9IG5ldyBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICBsZXQgZGlyZWN0aXZlT3A6IFRjYk9wO1xuICAgICAgY29uc3QgaG9zdCA9IHRoaXMudGNiLmVudi5yZWZsZWN0b3I7XG4gICAgICBjb25zdCBkaXJSZWYgPSBkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcblxuICAgICAgaWYgKCFkaXIuaXNHZW5lcmljKSB7XG4gICAgICAgIC8vIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIHRoYXQgd2hlbiBhIGRpcmVjdGl2ZSBpcyBub3QgZ2VuZXJpYywgd2UgdXNlIHRoZSBub3JtYWxcbiAgICAgICAgLy8gYFRjYk5vbkRpcmVjdGl2ZVR5cGVPcGAuXG4gICAgICAgIGRpcmVjdGl2ZU9wID0gbmV3IFRjYk5vbkdlbmVyaWNEaXJlY3RpdmVUeXBlT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcik7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICFyZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpclJlZi5ub2RlLCBob3N0KSB8fFxuICAgICAgICAgIHRoaXMudGNiLmVudi5jb25maWcudXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycykge1xuICAgICAgICAvLyBGb3IgZ2VuZXJpYyBkaXJlY3RpdmVzLCB3ZSB1c2UgYSB0eXBlIGNvbnN0cnVjdG9yIHRvIGluZmVyIHR5cGVzLiBJZiBhIGRpcmVjdGl2ZSByZXF1aXJlc1xuICAgICAgICAvLyBhbiBpbmxpbmUgdHlwZSBjb25zdHJ1Y3RvciwgdGhlbiBpbmxpbmluZyBtdXN0IGJlIGF2YWlsYWJsZSB0byB1c2UgdGhlXG4gICAgICAgIC8vIGBUY2JEaXJlY3RpdmVDdG9yT3BgLiBJZiBub3Qgd2UsIHdlIGZhbGxiYWNrIHRvIHVzaW5nIGBhbnlgIOKAkyBzZWUgYmVsb3cuXG4gICAgICAgIGRpcmVjdGl2ZU9wID0gbmV3IFRjYkRpcmVjdGl2ZUN0b3JPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIGlubGluaW5nIGlzIG5vdCBhdmFpbGFibGUsIHRoZW4gd2UgZ2l2ZSB1cCBvbiBpbmZlcmluZyB0aGUgZ2VuZXJpYyBwYXJhbXMsIGFuZCB1c2VcbiAgICAgICAgLy8gYGFueWAgdHlwZSBmb3IgdGhlIGRpcmVjdGl2ZSdzIGdlbmVyaWMgcGFyYW1ldGVycy5cbiAgICAgICAgZGlyZWN0aXZlT3AgPSBuZXcgVGNiR2VuZXJpY0RpcmVjdGl2ZVR5cGVXaXRoQW55UGFyYW1zT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRpckluZGV4ID0gdGhpcy5vcFF1ZXVlLnB1c2goZGlyZWN0aXZlT3ApIC0gMTtcbiAgICAgIGRpck1hcC5zZXQoZGlyLCBkaXJJbmRleCk7XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuICAgIHRoaXMuZGlyZWN0aXZlT3BNYXAuc2V0KG5vZGUsIGRpck1hcCk7XG5cbiAgICAvLyBBZnRlciBleHBhbmRpbmcgdGhlIGRpcmVjdGl2ZXMsIHdlIG1pZ2h0IG5lZWQgdG8gcXVldWUgYW4gb3BlcmF0aW9uIHRvIGNoZWNrIGFueSB1bmNsYWltZWRcbiAgICAvLyBpbnB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVtb3ZlIGFueSBpbnB1dHMgdGhhdCBpdCBjbGFpbXMgZnJvbSBgZWxlbWVudElucHV0c2AuXG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIG9mIGRpci5pbnB1dHMucHJvcGVydHlOYW1lcykge1xuICAgICAgICAgIGNsYWltZWRJbnB1dHMuYWRkKHByb3BlcnR5TmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZElucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gZGlyZWN0aXZlcyB3aGljaCBtYXRjaCB0aGlzIGVsZW1lbnQsIHRoZW4gaXQncyBhIFwicGxhaW5cIiBET00gZWxlbWVudCAob3IgYVxuICAgICAgLy8gd2ViIGNvbXBvbmVudCksIGFuZCBzaG91bGQgYmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSBET00gc2NoZW1hLiBJZiBhbnkgZGlyZWN0aXZlcyBtYXRjaCxcbiAgICAgIC8vIHdlIG11c3QgYXNzdW1lIHRoYXQgdGhlIGVsZW1lbnQgY291bGQgYmUgY3VzdG9tIChlaXRoZXIgYSBjb21wb25lbnQsIG9yIGEgZGlyZWN0aXZlIGxpa2VcbiAgICAgIC8vIDxyb3V0ZXItb3V0bGV0PikgYW5kIHNob3VsZG4ndCB2YWxpZGF0ZSB0aGUgZWxlbWVudCBuYW1lIGl0c2VsZi5cbiAgICAgIGNvbnN0IGNoZWNrRWxlbWVudCA9IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwO1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgY2hlY2tFbGVtZW50LCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmRPdXRwdXRzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIC8vIENvbGxlY3QgYWxsIHRoZSBvdXRwdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRPdXRwdXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwgfHwgZGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzLCB0aGVuIGFsbCBvdXRwdXRzIGFyZSB1bmNsYWltZWQgb3V0cHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUXVldWUgb3BlcmF0aW9ucyBmb3IgYWxsIGRpcmVjdGl2ZXMgdG8gY2hlY2sgdGhlIHJlbGV2YW50IG91dHB1dHMgZm9yIGEgZGlyZWN0aXZlLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JEaXJlY3RpdmVPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGRpcikpO1xuICAgIH1cblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIG91dHB1dHMuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gR28gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcyBhbmQgcmVnaXN0ZXIgYW55IG91dHB1dHMgdGhhdCBpdCBjbGFpbXMgaW4gYGNsYWltZWRPdXRwdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBvdXRwdXRQcm9wZXJ0eSBvZiBkaXIub3V0cHV0cy5wcm9wZXJ0eU5hbWVzKSB7XG4gICAgICAgICAgY2xhaW1lZE91dHB1dHMuYWRkKG91dHB1dFByb3BlcnR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkT3V0cHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBjbGFpbWVkT3V0cHV0cykpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGVlcFNjaGVtYUNoZWNrcyhub2RlczogVG1wbEFzdE5vZGVbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSk7XG4gICAgICAgIGxldCBoYXNEaXJlY3RpdmVzOiBib29sZWFuO1xuICAgICAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGhhc0RpcmVjdGl2ZXMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3RpdmVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBvZiBkaXIuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQocHJvcGVydHlOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRvbVNjaGVtYUNoZWNrZXJPcCh0aGlzLnRjYiwgbm9kZSwgIWhhc0RpcmVjdGl2ZXMsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kSWN1RXhwcmVzc2lvbnMobm9kZTogVG1wbEFzdEljdSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgT2JqZWN0LnZhbHVlcyhub2RlLnZhcnMpKSB7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgdmFyaWFibGUpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwbGFjZWhvbGRlciBvZiBPYmplY3QudmFsdWVzKG5vZGUucGxhY2Vob2xkZXJzKSkge1xuICAgICAgaWYgKHBsYWNlaG9sZGVyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGV4dEludGVycG9sYXRpb25PcCh0aGlzLnRjYiwgdGhpcywgcGxhY2Vob2xkZXIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIFRjYkJvdW5kSW5wdXQge1xuICBhdHRyaWJ1dGU6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZTtcbiAgZmllbGROYW1lczogQ2xhc3NQcm9wZXJ0eU5hbWVbXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGBjdHhgIHBhcmFtZXRlciB0byB0aGUgdG9wLWxldmVsIFRDQiBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgcGFyYW1ldGVyIHdpdGggYSB0eXBlIGVxdWl2YWxlbnQgdG8gdGhlIGNvbXBvbmVudCB0eXBlLCB3aXRoIGFsbCBnZW5lcmljIHR5cGVcbiAqIHBhcmFtZXRlcnMgbGlzdGVkICh3aXRob3V0IHRoZWlyIGdlbmVyaWMgYm91bmRzKS5cbiAqL1xuZnVuY3Rpb24gdGNiQ3R4UGFyYW0oXG4gICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiwgbmFtZTogdHMuRW50aXR5TmFtZSxcbiAgICB1c2VHZW5lcmljVHlwZTogYm9vbGVhbik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uIHtcbiAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLlR5cGVOb2RlW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvLyBDaGVjayBpZiB0aGUgY29tcG9uZW50IGlzIGdlbmVyaWMsIGFuZCBwYXNzIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGlmIHNvLlxuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHVzZUdlbmVyaWNUeXBlKSB7XG4gICAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAoKCkgPT4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH1cbiAgfVxuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovICdjdHgnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gYEFTVGAgZXhwcmVzc2lvbiBhbmQgY29udmVydCBpdCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLCBnZW5lcmF0aW5nIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBjb3JyZWN0IGlkZW50aWZpZXJzIGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICovXG5mdW5jdGlvbiB0Y2JFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV4cHJlc3Npb25UcmFuc2xhdG9yKHRjYiwgc2NvcGUpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgdGNiOiBDb250ZXh0LCBwcm90ZWN0ZWQgc2NvcGU6IFNjb3BlKSB7fVxuXG4gIHRyYW5zbGF0ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkXG4gICAgLy8gd2hpY2ggaW50ZXJwcmV0cyBzcGVjaWZpYyBleHByZXNzaW9uIG5vZGVzIHRoYXQgaW50ZXJhY3Qgd2l0aCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgLiBUaGVzZVxuICAgIC8vIG5vZGVzIGFjdHVhbGx5IHJlZmVyIHRvIGlkZW50aWZpZXJzIHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KGFzdCwgYXN0ID0+IHRoaXMucmVzb2x2ZShhc3QpLCB0aGlzLnRjYi5lbnYuY29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFuIGBBU1RgIGV4cHJlc3Npb24gd2l0aGluIHRoZSBnaXZlbiBzY29wZS5cbiAgICpcbiAgICogU29tZSBgQVNUYCBleHByZXNzaW9ucyByZWZlciB0byB0b3AtbGV2ZWwgY29uY2VwdHMgKHJlZmVyZW5jZXMsIHZhcmlhYmxlcywgdGhlIGNvbXBvbmVudFxuICAgKiBjb250ZXh0KS4gVGhpcyBtZXRob2QgYXNzaXN0cyBpbiByZXNvbHZpbmcgdGhvc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgICAvLyBUcnkgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhpcyBleHByZXNzaW9uLiBJZiBubyBzdWNoIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW5cbiAgICAgIC8vIHRoZSBleHByZXNzaW9uIGlzIHJlZmVyZW5jaW5nIHRoZSB0b3AtbGV2ZWwgY29tcG9uZW50IGNvbnRleHQuIEluIHRoYXQgY2FzZSwgYG51bGxgIGlzXG4gICAgICAvLyByZXR1cm5lZCBoZXJlIHRvIGxldCBpdCBmYWxsIHRocm91Z2ggcmVzb2x1dGlvbiBzbyBpdCB3aWxsIGJlIGNhdWdodCB3aGVuIHRoZVxuICAgICAgLy8gYEltcGxpY2l0UmVjZWl2ZXJgIGlzIHJlc29sdmVkIGluIHRoZSBicmFuY2ggYmVsb3cuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC52YWx1ZSk7XG4gICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVCaW5hcnkodGFyZ2V0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIC8vIEFTVCBpbnN0YW5jZXMgcmVwcmVzZW50aW5nIHZhcmlhYmxlcyBhbmQgcmVmZXJlbmNlcyBsb29rIHZlcnkgc2ltaWxhciB0byBwcm9wZXJ0eSByZWFkc1xuICAgICAgLy8gb3IgbWV0aG9kIGNhbGxzIGZyb20gdGhlIGNvbXBvbmVudCBjb250ZXh0OiBib3RoIGhhdmUgdGhlIHNoYXBlXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlciwgJ3Byb3BOYW1lJykgb3IgTWV0aG9kQ2FsbChJbXBsaWNpdFJlY2VpdmVyLCAnbWV0aG9kTmFtZScpLlxuICAgICAgLy9cbiAgICAgIC8vIGB0cmFuc2xhdGVgIHdpbGwgZmlyc3QgdHJ5IHRvIGByZXNvbHZlYCB0aGUgb3V0ZXIgUHJvcGVydHlSZWFkL01ldGhvZENhbGwuIElmIHRoaXMgd29ya3MsXG4gICAgICAvLyBpdCdzIGJlY2F1c2UgdGhlIGBCb3VuZFRhcmdldGAgZm91bmQgYW4gZXhwcmVzc2lvbiB0YXJnZXQgZm9yIHRoZSB3aG9sZSBleHByZXNzaW9uLCBhbmRcbiAgICAgIC8vIHRoZXJlZm9yZSBgdHJhbnNsYXRlYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXRcbiAgICAgIC8vIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsLlxuICAgICAgLy9cbiAgICAgIC8vIFRoZXJlZm9yZSBpZiBgcmVzb2x2ZWAgaXMgY2FsbGVkIG9uIGFuIGBJbXBsaWNpdFJlY2VpdmVyYCwgaXQncyBiZWNhdXNlIG5vIG91dGVyXG4gICAgICAvLyBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbCByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSwgYW5kIHRoZXJlZm9yZSB0aGlzIGlzIGFcbiAgICAgIC8vIHByb3BlcnR5IHJlYWQgb3IgbWV0aG9kIGNhbGwgb24gdGhlIGNvbXBvbmVudCBjb250ZXh0IGl0c2VsZi5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlKSB7XG4gICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmV4cCk7XG4gICAgICBjb25zdCBwaXBlUmVmID0gdGhpcy50Y2IuZ2V0UGlwZUJ5TmFtZShhc3QubmFtZSk7XG4gICAgICBsZXQgcGlwZTogdHMuRXhwcmVzc2lvbnxudWxsO1xuICAgICAgaWYgKHBpcGVSZWYgPT09IG51bGwpIHtcbiAgICAgICAgLy8gTm8gcGlwZSBieSB0aGF0IG5hbWUgZXhpc3RzIGluIHNjb3BlLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvci5cbiAgICAgICAgdGhpcy50Y2Iub29iUmVjb3JkZXIubWlzc2luZ1BpcGUodGhpcy50Y2IuaWQsIGFzdCk7XG5cbiAgICAgICAgLy8gVXNlIGFuICdhbnknIHZhbHVlIHRvIGF0IGxlYXN0IGFsbG93IHRoZSByZXN0IG9mIHRoZSBleHByZXNzaW9uIHRvIGJlIGNoZWNrZWQuXG4gICAgICAgIHBpcGUgPSBOVUxMX0FTX0FOWTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZlBpcGVzKSB7XG4gICAgICAgIC8vIFVzZSBhIHZhcmlhYmxlIGRlY2xhcmVkIGFzIHRoZSBwaXBlJ3MgdHlwZS5cbiAgICAgICAgcGlwZSA9IHRoaXMudGNiLmVudi5waXBlSW5zdChwaXBlUmVmKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFVzZSBhbiAnYW55JyB2YWx1ZSB3aGVuIG5vdCBjaGVja2luZyB0aGUgdHlwZSBvZiB0aGUgcGlwZS5cbiAgICAgICAgcGlwZSA9IHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihcbiAgICAgICAgICAgIHRoaXMudGNiLmVudi5waXBlSW5zdChwaXBlUmVmKSwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgfVxuICAgICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChhcmcgPT4gdGhpcy50cmFuc2xhdGUoYXJnKSk7XG4gICAgICBjb25zdCBtZXRob2RBY2Nlc3MgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhwaXBlLCAndHJhbnNmb3JtJyk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZEFjY2VzcywgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgLyogZXhwcmVzc2lvbiAqLyBtZXRob2RBY2Nlc3MsXG4gICAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9bZXhwciwgLi4uYXJnc10pO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXN1bHQsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgYXN0IGluc3RhbmNlb2YgTWV0aG9kQ2FsbCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyICYmXG4gICAgICAgICEoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgVGhpc1JlY2VpdmVyKSkge1xuICAgICAgLy8gUmVzb2x2ZSB0aGUgc3BlY2lhbCBgJGFueShleHByKWAgc3ludGF4IHRvIGluc2VydCBhIGNhc3Qgb2YgdGhlIGFyZ3VtZW50IHRvIHR5cGUgYGFueWAuXG4gICAgICAvLyBgJGFueShleHByKWAgLT4gYGV4cHIgYXMgYW55YFxuICAgICAgaWYgKGFzdC5uYW1lID09PSAnJGFueScgJiYgYXN0LmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuYXJnc1swXSk7XG4gICAgICAgIGNvbnN0IGV4cHJBc0FueSA9XG4gICAgICAgICAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24oZXhwciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0cy5jcmVhdGVQYXJlbihleHByQXNBbnkpO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgYSBib3VuZCB0YXJnZXQgZm9yIHRoZSBtZXRob2QsIGFuZCBnZW5lcmF0ZSB0aGUgbWV0aG9kIGNhbGwgaWYgYSB0YXJnZXRcbiAgICAgIC8vIGNvdWxkIGJlIHJlc29sdmVkLiBJZiBubyB0YXJnZXQgaXMgYXZhaWxhYmxlLCB0aGVuIHRoZSBtZXRob2QgaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbFxuICAgICAgLy8gY29tcG9uZW50IGNvbnRleHQsIGluIHdoaWNoIGNhc2UgYG51bGxgIGlzIHJldHVybmVkIHRvIGxldCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgIGJlaW5nXG4gICAgICAvLyByZXNvbHZlZCB0byB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gICAgICBjb25zdCByZWNlaXZlciA9IHRoaXMucmVzb2x2ZVRhcmdldChhc3QpO1xuICAgICAgaWYgKHJlY2VpdmVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRob2QgPSB3cmFwRm9yRGlhZ25vc3RpY3MocmVjZWl2ZXIpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhtZXRob2QsIGFzdC5uYW1lU3Bhbik7XG4gICAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLnRyYW5zbGF0ZShhcmcpKTtcbiAgICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVDYWxsKG1ldGhvZCwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgQVNUIGlzbid0IHNwZWNpYWwgYWZ0ZXIgYWxsLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIHJlc29sdmUgYSBib3VuZCB0YXJnZXQgZm9yIGEgZ2l2ZW4gZXhwcmVzc2lvbiwgYW5kIHRyYW5zbGF0ZXMgaXQgaW50byB0aGVcbiAgICogYXBwcm9wcmlhdGUgYHRzLkV4cHJlc3Npb25gIHRoYXQgcmVwcmVzZW50cyB0aGUgYm91bmQgdGFyZ2V0LiBJZiBubyB0YXJnZXQgaXMgYXZhaWxhYmxlLFxuICAgKiBgbnVsbGAgaXMgcmV0dXJuZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZVRhcmdldChhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgYmluZGluZyA9IHRoaXMudGNiLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoYXN0KTtcbiAgICBpZiAoYmluZGluZyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwciA9IHRoaXMuc2NvcGUucmVzb2x2ZShiaW5kaW5nKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxufVxuXG4vKipcbiAqIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgYSBkaXJlY3RpdmUgaW5zdGFuY2Ugb24gYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLCBpbmZlcnJpbmcgYSB0eXBlIGZvclxuICogdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBmcm9tIGFueSBib3VuZCBpbnB1dHMuXG4gKi9cbmZ1bmN0aW9uIHRjYkNhbGxUeXBlQ3RvcihcbiAgICBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsIGlucHV0czogVGNiRGlyZWN0aXZlSW5wdXRbXSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0eXBlQ3RvciA9IHRjYi5lbnYudHlwZUN0b3JGb3IoZGlyKTtcblxuICAvLyBDb25zdHJ1Y3QgYW4gYXJyYXkgb2YgYHRzLlByb3BlcnR5QXNzaWdubWVudGBzIGZvciBlYWNoIG9mIHRoZSBkaXJlY3RpdmUncyBpbnB1dHMuXG4gIGNvbnN0IG1lbWJlcnMgPSBpbnB1dHMubWFwKGlucHV0ID0+IHtcbiAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGlucHV0LmZpZWxkKTtcblxuICAgIGlmIChpbnB1dC50eXBlID09PSAnYmluZGluZycpIHtcbiAgICAgIC8vIEZvciBib3VuZCBpbnB1dHMsIHRoZSBwcm9wZXJ0eSBpcyBhc3NpZ25lZCB0aGUgYmluZGluZyBleHByZXNzaW9uLlxuICAgICAgbGV0IGV4cHIgPSBpbnB1dC5leHByZXNzaW9uO1xuICAgICAgaWYgKCF0Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcGVydHlOYW1lLCB3cmFwRm9yRGlhZ25vc3RpY3MoZXhwcikpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhhc3NpZ25tZW50LCBpbnB1dC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiBhc3NpZ25tZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBIHR5cGUgY29uc3RydWN0b3IgaXMgcmVxdWlyZWQgdG8gYmUgY2FsbGVkIHdpdGggYWxsIGlucHV0IHByb3BlcnRpZXMsIHNvIGFueSB1bnNldFxuICAgICAgLy8gaW5wdXRzIGFyZSBzaW1wbHkgYXNzaWduZWQgYSB2YWx1ZSBvZiB0eXBlIGBhbnlgIHRvIGlnbm9yZSB0aGVtLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIE5VTExfQVNfQU5ZKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENhbGwgdGhlIGBuZ1R5cGVDdG9yYCBtZXRob2Qgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcywgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCBhcmd1bWVudCBjcmVhdGVkXG4gIC8vIGZyb20gdGhlIG1hdGNoZWQgaW5wdXRzLlxuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHlwZUN0b3IsXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW3RzLmNyZWF0ZU9iamVjdExpdGVyYWwobWVtYmVycyldKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm91bmRJbnB1dHMoXG4gICAgZGlyZWN0aXZlOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgIHRjYjogQ29udGV4dCk6IFRjYkJvdW5kSW5wdXRbXSB7XG4gIGNvbnN0IGJvdW5kSW5wdXRzOiBUY2JCb3VuZElucHV0W10gPSBbXTtcblxuICBjb25zdCBwcm9jZXNzQXR0cmlidXRlID0gKGF0dHI6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZSkgPT4ge1xuICAgIC8vIFNraXAgbm9uLXByb3BlcnR5IGJpbmRpbmdzLlxuICAgIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGF0dHIudHlwZSAhPT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTa2lwIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGFuIGlucHV0IGZvciBpdC5cbiAgICBjb25zdCBpbnB1dHMgPSBkaXJlY3RpdmUuaW5wdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShhdHRyLm5hbWUpO1xuICAgIGlmIChpbnB1dHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZmllbGROYW1lcyA9IGlucHV0cy5tYXAoaW5wdXQgPT4gaW5wdXQuY2xhc3NQcm9wZXJ0eU5hbWUpO1xuICAgIGJvdW5kSW5wdXRzLnB1c2goe2F0dHJpYnV0ZTogYXR0ciwgZmllbGROYW1lc30pO1xuICB9O1xuXG4gIG5vZGUuaW5wdXRzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIG5vZGUuYXR0cmlidXRlcy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIG5vZGUudGVtcGxhdGVBdHRycy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICB9XG5cbiAgcmV0dXJuIGJvdW5kSW5wdXRzO1xufVxuXG4vKipcbiAqIFRyYW5zbGF0ZXMgdGhlIGdpdmVuIGF0dHJpYnV0ZSBiaW5kaW5nIHRvIGEgYHRzLkV4cHJlc3Npb25gLlxuICovXG5mdW5jdGlvbiB0cmFuc2xhdGVJbnB1dChcbiAgICBhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8VG1wbEFzdFRleHRBdHRyaWJ1dGUsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSB7XG4gICAgLy8gUHJvZHVjZSBhbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgdGhlIGJpbmRpbmcuXG4gICAgcmV0dXJuIHRjYkV4cHJlc3Npb24oYXR0ci52YWx1ZSwgdGNiLCBzY29wZSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRm9yIHJlZ3VsYXIgYXR0cmlidXRlcyB3aXRoIGEgc3RhdGljIHN0cmluZyB2YWx1ZSwgdXNlIHRoZSByZXByZXNlbnRlZCBzdHJpbmcgbGl0ZXJhbC5cbiAgICByZXR1cm4gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChhdHRyLnZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGlucHV0IGJpbmRpbmcgdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgZmllbGQgb2YgYSBkaXJlY3RpdmUuXG4gKi9cbmludGVyZmFjZSBUY2JEaXJlY3RpdmVCb3VuZElucHV0IHtcbiAgdHlwZTogJ2JpbmRpbmcnO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiBhIGZpZWxkIG9uIHRoZSBkaXJlY3RpdmUgdGhhdCBpcyBzZXQuXG4gICAqL1xuICBmaWVsZDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLkV4cHJlc3Npb25gIGNvcnJlc3BvbmRpbmcgd2l0aCB0aGUgaW5wdXQgYmluZGluZyBleHByZXNzaW9uLlxuICAgKi9cbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcblxuICAvKipcbiAgICogVGhlIHNvdXJjZSBzcGFuIG9mIHRoZSBmdWxsIGF0dHJpYnV0ZSBiaW5kaW5nLlxuICAgKi9cbiAgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuO1xufVxuXG4vKipcbiAqIEluZGljYXRlcyB0aGF0IGEgY2VydGFpbiBmaWVsZCBvZiBhIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGEgY29ycmVzcG9uZGluZyBpbnB1dCBiaW5kaW5nLlxuICovXG5pbnRlcmZhY2UgVGNiRGlyZWN0aXZlVW5zZXRJbnB1dCB7XG4gIHR5cGU6ICd1bnNldCc7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIGEgZmllbGQgb24gdGhlIGRpcmVjdGl2ZSBmb3Igd2hpY2ggbm8gaW5wdXQgYmluZGluZyBpcyBwcmVzZW50LlxuICAgKi9cbiAgZmllbGQ6IHN0cmluZztcbn1cblxudHlwZSBUY2JEaXJlY3RpdmVJbnB1dCA9IFRjYkRpcmVjdGl2ZUJvdW5kSW5wdXR8VGNiRGlyZWN0aXZlVW5zZXRJbnB1dDtcblxuY29uc3QgRVZFTlRfUEFSQU1FVEVSID0gJyRldmVudCc7XG5cbmNvbnN0IGVudW0gRXZlbnRQYXJhbVR5cGUge1xuICAvKiBHZW5lcmF0ZXMgY29kZSB0byBpbmZlciB0aGUgdHlwZSBvZiBgJGV2ZW50YCBiYXNlZCBvbiBob3cgdGhlIGxpc3RlbmVyIGlzIHJlZ2lzdGVyZWQuICovXG4gIEluZmVyLFxuXG4gIC8qIERlY2xhcmVzIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIgYXMgYGFueWAuICovXG4gIEFueSxcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycm93IGZ1bmN0aW9uIHRvIGJlIHVzZWQgYXMgaGFuZGxlciBmdW5jdGlvbiBmb3IgZXZlbnQgYmluZGluZ3MuIFRoZSBoYW5kbGVyXG4gKiBmdW5jdGlvbiBoYXMgYSBzaW5nbGUgcGFyYW1ldGVyIGAkZXZlbnRgIGFuZCB0aGUgYm91bmQgZXZlbnQncyBoYW5kbGVyIGBBU1RgIHJlcHJlc2VudGVkIGFzIGFcbiAqIFR5cGVTY3JpcHQgZXhwcmVzc2lvbiBhcyBpdHMgYm9keS5cbiAqXG4gKiBXaGVuIGBldmVudFR5cGVgIGlzIHNldCB0byBgSW5mZXJgLCB0aGUgYCRldmVudGAgcGFyYW1ldGVyIHdpbGwgbm90IGhhdmUgYW4gZXhwbGljaXQgdHlwZS4gVGhpc1xuICogYWxsb3dzIGZvciB0aGUgY3JlYXRlZCBoYW5kbGVyIGZ1bmN0aW9uIHRvIGhhdmUgaXRzIGAkZXZlbnRgIHBhcmFtZXRlcidzIHR5cGUgaW5mZXJyZWQgYmFzZWQgb25cbiAqIGhvdyBpdCdzIHVzZWQsIHRvIGVuYWJsZSBzdHJpY3QgdHlwZSBjaGVja2luZyBvZiBldmVudCBiaW5kaW5ncy4gV2hlbiBzZXQgdG8gYEFueWAsIHRoZSBgJGV2ZW50YFxuICogcGFyYW1ldGVyIHdpbGwgaGF2ZSBhbiBleHBsaWNpdCBgYW55YCB0eXBlLCBlZmZlY3RpdmVseSBkaXNhYmxpbmcgc3RyaWN0IHR5cGUgY2hlY2tpbmcgb2YgZXZlbnRcbiAqIGJpbmRpbmdzLiBBbHRlcm5hdGl2ZWx5LCBhbiBleHBsaWNpdCB0eXBlIGNhbiBiZSBwYXNzZWQgZm9yIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIuXG4gKi9cbmZ1bmN0aW9uIHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihcbiAgICBldmVudDogVG1wbEFzdEJvdW5kRXZlbnQsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlLFxuICAgIGV2ZW50VHlwZTogRXZlbnRQYXJhbVR5cGV8dHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgaGFuZGxlciA9IHRjYkV2ZW50SGFuZGxlckV4cHJlc3Npb24oZXZlbnQuaGFuZGxlciwgdGNiLCBzY29wZSk7XG5cbiAgbGV0IGV2ZW50UGFyYW1UeXBlOiB0cy5UeXBlTm9kZXx1bmRlZmluZWQ7XG4gIGlmIChldmVudFR5cGUgPT09IEV2ZW50UGFyYW1UeXBlLkluZmVyKSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSBFdmVudFBhcmFtVHlwZS5BbnkpIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICB9IGVsc2Uge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gZXZlbnRUeXBlO1xuICB9XG5cbiAgLy8gT2J0YWluIGFsbCBndWFyZHMgdGhhdCBoYXZlIGJlZW4gYXBwbGllZCB0byB0aGUgc2NvcGUgYW5kIGl0cyBwYXJlbnRzLCBhcyB0aGV5IGhhdmUgdG8gYmVcbiAgLy8gcmVwZWF0ZWQgd2l0aGluIHRoZSBoYW5kbGVyIGZ1bmN0aW9uIGZvciB0aGVpciBuYXJyb3dpbmcgdG8gYmUgaW4gZWZmZWN0IHdpdGhpbiB0aGUgaGFuZGxlci5cbiAgY29uc3QgZ3VhcmRzID0gc2NvcGUuZ3VhcmRzKCk7XG5cbiAgbGV0IGJvZHk6IHRzLlN0YXRlbWVudCA9IHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcik7XG4gIGlmIChndWFyZHMgIT09IG51bGwpIHtcbiAgICAvLyBXcmFwIHRoZSBib2R5IGluIGFuIGBpZmAgc3RhdGVtZW50IGNvbnRhaW5pbmcgYWxsIGd1YXJkcyB0aGF0IGhhdmUgdG8gYmUgYXBwbGllZC5cbiAgICBib2R5ID0gdHMuY3JlYXRlSWYoZ3VhcmRzLCBib2R5KTtcbiAgfVxuXG4gIGNvbnN0IGV2ZW50UGFyYW0gPSB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIEVWRU5UX1BBUkFNRVRFUixcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZSAqLyBldmVudFBhcmFtVHlwZSk7XG4gIGFkZEV4cHJlc3Npb25JZGVudGlmaWVyKGV2ZW50UGFyYW0sIEV4cHJlc3Npb25JZGVudGlmaWVyLkVWRU5UX1BBUkFNRVRFUik7XG5cbiAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgIC8qIG1vZGlmaWVyICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovW2V2ZW50UGFyYW1dLFxuICAgICAgLyogdHlwZSAqLyB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSxcbiAgICAgIC8qIGJvZHkgKi8gdHMuY3JlYXRlQmxvY2soW2JvZHldKSk7XG59XG5cbi8qKlxuICogU2ltaWxhciB0byBgdGNiRXhwcmVzc2lvbmAsIHRoaXMgZnVuY3Rpb24gY29udmVydHMgdGhlIHByb3ZpZGVkIGBBU1RgIGV4cHJlc3Npb24gaW50byBhXG4gKiBgdHMuRXhwcmVzc2lvbmAsIHdpdGggc3BlY2lhbCBoYW5kbGluZyBvZiB0aGUgYCRldmVudGAgdmFyaWFibGUgdGhhdCBjYW4gYmUgdXNlZCB3aXRoaW4gZXZlbnRcbiAqIGJpbmRpbmdzLlxuICovXG5mdW5jdGlvbiB0Y2JFdmVudEhhbmRsZXJFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IFRjYkV2ZW50SGFuZGxlclRyYW5zbGF0b3IodGNiLCBzY29wZSk7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBUY2JFdmVudEhhbmRsZXJUcmFuc2xhdG9yIGV4dGVuZHMgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3Ige1xuICBwcm90ZWN0ZWQgcmVzb2x2ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gUmVjb2duaXplIGEgcHJvcGVydHkgcmVhZCBvbiB0aGUgaW1wbGljaXQgcmVjZWl2ZXIgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBldmVudCBwYXJhbWV0ZXJcbiAgICAvLyB0aGF0IGlzIGF2YWlsYWJsZSBpbiBldmVudCBiaW5kaW5ncy4gU2luY2UgdGhpcyB2YXJpYWJsZSBpcyBhIHBhcmFtZXRlciBvZiB0aGUgaGFuZGxlclxuICAgIC8vIGZ1bmN0aW9uIHRoYXQgdGhlIGNvbnZlcnRlZCBleHByZXNzaW9uIGJlY29tZXMgYSBjaGlsZCBvZiwganVzdCBjcmVhdGUgYSByZWZlcmVuY2UgdG8gdGhlXG4gICAgLy8gcGFyYW1ldGVyIGJ5IGl0cyBuYW1lLlxuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlciAmJlxuICAgICAgICAhKGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIFRoaXNSZWNlaXZlcikgJiYgYXN0Lm5hbWUgPT09IEVWRU5UX1BBUkFNRVRFUikge1xuICAgICAgY29uc3QgZXZlbnQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKEVWRU5UX1BBUkFNRVRFUik7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGV2ZW50LCBhc3QubmFtZVNwYW4pO1xuICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZXNvbHZlKGFzdCk7XG4gIH1cbn1cbiJdfQ==