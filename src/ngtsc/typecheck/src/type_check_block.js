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
        var innerBody = ts.createBlock(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(env.getPreludeStatements())), tslib_1.__read(scopeStatements)));
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
                /* typeArguments */ undefined, tslib_1.__spreadArray([expr], tslib_1.__read(args)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcVk7SUFDclksK0JBQWlDO0lBT2pDLG1GQUFnRztJQUNoRyx5RkFBc0c7SUFHdEcsdUZBQTBEO0lBRTFELHVHQUErRDtJQUMvRCxpRkFBMks7SUFDM0ssbUdBQTBEO0lBRTFEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FxQkc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsR0FBZ0IsRUFBRSxHQUFxRCxFQUFFLElBQW1CLEVBQzVGLElBQTRCLEVBQUUsZ0JBQWtDLEVBQ2hFLFdBQXdDO1FBQzFDLElBQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUNuQixHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3RixJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBVSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3RixJQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxtRUFBaUUsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO1NBQ3ZGO1FBQ0QsSUFB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RyxZQUFZLHVCQUFZLElBQUksR0FBRyxDQUFDLFFBQVEsWUFBWSwyQkFBZ0I7Z0JBQ3ZFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxZQUFZLHVCQUFZLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBRTtnQkFDM0UsSUFBTSxPQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNuRCw4QkFBZ0IsQ0FBQyxPQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QyxPQUFPLE9BQUssQ0FBQzthQUNkO1lBRUQsT0FBTyxpQkFBTSxPQUFPLFlBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQWZELENBQXdDLHVCQUF1QixHQWU5RCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1BpcGUsIEJpbmRpbmdUeXBlLCBCb3VuZFRhcmdldCwgRFlOQU1JQ19UWVBFLCBJbXBsaWNpdFJlY2VpdmVyLCBNZXRob2RDYWxsLCBQYXJzZWRFdmVudFR5cGUsIFBhcnNlU291cmNlU3BhbiwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBTY2hlbWFNZXRhZGF0YSwgVGhpc1JlY2VpdmVyLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Qm91bmRUZXh0LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdEljdSwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NQcm9wZXJ0eU5hbWV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUZW1wbGF0ZUlkLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHthZGRFeHByZXNzaW9uSWRlbnRpZmllciwgRXhwcmVzc2lvbklkZW50aWZpZXIsIG1hcmtJZ25vcmVEaWFnbm9zdGljc30gZnJvbSAnLi9jb21tZW50cyc7XG5pbXBvcnQge2FkZFBhcnNlU3BhbkluZm8sIGFkZFRlbXBsYXRlSWQsIHdyYXBGb3JEaWFnbm9zdGljcywgd3JhcEZvclR5cGVDaGVja2VyfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlcn0gZnJvbSAnLi9kb20nO1xuaW1wb3J0IHtFbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge2FzdFRvVHlwZXNjcmlwdCwgTlVMTF9BU19BTll9IGZyb20gJy4vZXhwcmVzc2lvbic7XG5pbXBvcnQge091dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcn0gZnJvbSAnLi9vb2InO1xuaW1wb3J0IHtFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yfSBmcm9tICcuL3RlbXBsYXRlX3NlbWFudGljcyc7XG5pbXBvcnQge2NoZWNrSWZHZW5lcmljVHlwZXNBcmVVbmJvdW5kLCB0c0NhbGxNZXRob2QsIHRzQ2FzdFRvQW55LCB0c0NyZWF0ZUVsZW1lbnQsIHRzQ3JlYXRlVHlwZVF1ZXJ5Rm9yQ29lcmNlZElucHV0LCB0c0NyZWF0ZVZhcmlhYmxlLCB0c0RlY2xhcmVWYXJpYWJsZX0gZnJvbSAnLi90c191dGlsJztcbmltcG9ydCB7cmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcn0gZnJvbSAnLi90eXBlX2NvbnN0cnVjdG9yJztcblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBmb3IgYSBjb21wb25lbnQsIGFuZCBtZXRhZGF0YSByZWdhcmRpbmcgdGhhdCBjb21wb25lbnQsIGNvbXBvc2UgYVxuICogXCJ0eXBlIGNoZWNrIGJsb2NrXCIgZnVuY3Rpb24uXG4gKlxuICogV2hlbiBwYXNzZWQgdGhyb3VnaCBUeXBlU2NyaXB0J3MgVHlwZUNoZWNrZXIsIHR5cGUgZXJyb3JzIHRoYXQgYXJpc2Ugd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrXG4gKiBmdW5jdGlvbiBpbmRpY2F0ZSBpc3N1ZXMgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAqXG4gKiBBcyBhIHNpZGUgZWZmZWN0IG9mIGdlbmVyYXRpbmcgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQsIGB0cy5EaWFnbm9zdGljYHMgbWF5IGFsc28gYmUgcHJvZHVjZWRcbiAqIGRpcmVjdGx5IGZvciBpc3N1ZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSB3aGljaCBhcmUgaWRlbnRpZmllZCBkdXJpbmcgZ2VuZXJhdGlvbi4gVGhlc2UgaXNzdWVzIGFyZVxuICogcmVjb3JkZWQgaW4gZWl0aGVyIHRoZSBgZG9tU2NoZW1hQ2hlY2tlcmAgKHdoaWNoIGNoZWNrcyB1c2FnZSBvZiBET00gZWxlbWVudHMgYW5kIGJpbmRpbmdzKSBhc1xuICogd2VsbCBhcyB0aGUgYG9vYlJlY29yZGVyYCAod2hpY2ggcmVjb3JkcyBlcnJvcnMgd2hlbiB0aGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRvciBpcyB1bmFibGVcbiAqIHRvIHN1ZmZpY2llbnRseSB1bmRlcnN0YW5kIGEgdGVtcGxhdGUpLlxuICpcbiAqIEBwYXJhbSBlbnYgYW4gYEVudmlyb25tZW50YCBpbnRvIHdoaWNoIHR5cGUtY2hlY2tpbmcgY29kZSB3aWxsIGJlIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSByZWYgYSBgUmVmZXJlbmNlYCB0byB0aGUgY29tcG9uZW50IGNsYXNzIHdoaWNoIHNob3VsZCBiZSB0eXBlLWNoZWNrZWQuXG4gKiBAcGFyYW0gbmFtZSBhIGB0cy5JZGVudGlmaWVyYCB0byB1c2UgZm9yIHRoZSBnZW5lcmF0ZWQgYHRzLkZ1bmN0aW9uRGVjbGFyYXRpb25gLlxuICogQHBhcmFtIG1ldGEgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGFuZCB0aGUgZnVuY3Rpb24gYmVpbmcgZ2VuZXJhdGVkLlxuICogQHBhcmFtIGRvbVNjaGVtYUNoZWNrZXIgdXNlZCB0byBjaGVjayBhbmQgcmVjb3JkIGVycm9ycyByZWdhcmRpbmcgaW1wcm9wZXIgdXNhZ2Ugb2YgRE9NIGVsZW1lbnRzXG4gKiBhbmQgYmluZGluZ3MuXG4gKiBAcGFyYW0gb29iUmVjb3JkZXIgdXNlZCB0byByZWNvcmQgZXJyb3JzIHJlZ2FyZGluZyB0ZW1wbGF0ZSBlbGVtZW50cyB3aGljaCBjb3VsZCBub3QgYmUgY29ycmVjdGx5XG4gKiB0cmFuc2xhdGVkIGludG8gdHlwZXMgZHVyaW5nIFRDQiBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICBlbnY6IEVudmlyb25tZW50LCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgbmFtZTogdHMuSWRlbnRpZmllcixcbiAgICBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgY29uc3QgdGNiID0gbmV3IENvbnRleHQoXG4gICAgICBlbnYsIGRvbVNjaGVtYUNoZWNrZXIsIG9vYlJlY29yZGVyLCBtZXRhLmlkLCBtZXRhLmJvdW5kVGFyZ2V0LCBtZXRhLnBpcGVzLCBtZXRhLnNjaGVtYXMpO1xuICBjb25zdCBzY29wZSA9IFNjb3BlLmZvck5vZGVzKHRjYiwgbnVsbCwgdGNiLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCAvKiBndWFyZCAqLyBudWxsKTtcbiAgY29uc3QgY3R4UmF3VHlwZSA9IGVudi5yZWZlcmVuY2VUeXBlKHJlZik7XG4gIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShjdHhSYXdUeXBlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIHdoZW4gcmVmZXJlbmNpbmcgdGhlIGN0eCBwYXJhbSBmb3IgJHtyZWYuZGVidWdOYW1lfWApO1xuICB9XG4gIGNvbnN0IHBhcmFtTGlzdCA9IFt0Y2JDdHhQYXJhbShyZWYubm9kZSwgY3R4UmF3VHlwZS50eXBlTmFtZSwgZW52LmNvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUpXTtcblxuICBjb25zdCBzY29wZVN0YXRlbWVudHMgPSBzY29wZS5yZW5kZXIoKTtcbiAgY29uc3QgaW5uZXJCb2R5ID0gdHMuY3JlYXRlQmxvY2soW1xuICAgIC4uLmVudi5nZXRQcmVsdWRlU3RhdGVtZW50cygpLFxuICAgIC4uLnNjb3BlU3RhdGVtZW50cyxcbiAgXSk7XG5cbiAgLy8gV3JhcCB0aGUgYm9keSBpbiBhbiBcImlmICh0cnVlKVwiIGV4cHJlc3Npb24uIFRoaXMgaXMgdW5uZWNlc3NhcnkgYnV0IGhhcyB0aGUgZWZmZWN0IG9mIGNhdXNpbmdcbiAgLy8gdGhlIGB0cy5QcmludGVyYCB0byBmb3JtYXQgdGhlIHR5cGUtY2hlY2sgYmxvY2sgbmljZWx5LlxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgaW5uZXJCb2R5LCB1bmRlZmluZWQpXSk7XG4gIGNvbnN0IGZuRGVjbCA9IHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gbmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIGVudi5jb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID8gcmVmLm5vZGUudHlwZVBhcmFtZXRlcnMgOiB1bmRlZmluZWQsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovIHBhcmFtTGlzdCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbiAgYWRkVGVtcGxhdGVJZChmbkRlY2wsIG1ldGEuaWQpO1xuICByZXR1cm4gZm5EZWNsO1xufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0J3MgaW52b2x2ZWQgaW4gdGhlIGNvbnN0cnVjdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2suXG4gKlxuICogVGhlIGdlbmVyYXRpb24gb2YgYSBUQ0IgaXMgbm9uLWxpbmVhci4gQmluZGluZ3Mgd2l0aGluIGEgdGVtcGxhdGUgbWF5IHJlc3VsdCBpbiB0aGUgbmVlZCB0b1xuICogY29uc3RydWN0IGNlcnRhaW4gdHlwZXMgZWFybGllciB0aGFuIHRoZXkgb3RoZXJ3aXNlIHdvdWxkIGJlIGNvbnN0cnVjdGVkLiBUaGF0IGlzLCBpZiB0aGVcbiAqIGdlbmVyYXRpb24gb2YgYSBUQ0IgZm9yIGEgdGVtcGxhdGUgaXMgYnJva2VuIGRvd24gaW50byBzcGVjaWZpYyBvcGVyYXRpb25zIChjb25zdHJ1Y3RpbmcgYVxuICogZGlyZWN0aXZlLCBleHRyYWN0aW5nIGEgdmFyaWFibGUgZnJvbSBhIGxldC0gb3BlcmF0aW9uLCBldGMpLCB0aGVuIGl0J3MgcG9zc2libGUgZm9yIG9wZXJhdGlvbnNcbiAqIGVhcmxpZXIgaW4gdGhlIHNlcXVlbmNlIHRvIGRlcGVuZCBvbiBvcGVyYXRpb25zIHdoaWNoIG9jY3VyIGxhdGVyIGluIHRoZSBzZXF1ZW5jZS5cbiAqXG4gKiBgVGNiT3BgIGFic3RyYWN0cyB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIG9wZXJhdGlvbnMgd2hpY2ggYXJlIHJlcXVpcmVkIHRvIGNvbnZlcnQgYSB0ZW1wbGF0ZSBpbnRvXG4gKiBhIFRDQi4gVGhpcyBhbGxvd3MgZm9yIHR3byBwaGFzZXMgb2YgcHJvY2Vzc2luZyBmb3IgdGhlIHRlbXBsYXRlLCB3aGVyZSAxKSBhIGxpbmVhciBzZXF1ZW5jZSBvZlxuICogYFRjYk9wYHMgaXMgZ2VuZXJhdGVkLCBhbmQgdGhlbiAyKSB0aGVzZSBvcGVyYXRpb25zIGFyZSBleGVjdXRlZCwgbm90IG5lY2Vzc2FyaWx5IGluIGxpbmVhclxuICogb3JkZXIuXG4gKlxuICogRWFjaCBgVGNiT3BgIG1heSBpbnNlcnQgc3RhdGVtZW50cyBpbnRvIHRoZSBib2R5IG9mIHRoZSBUQ0IsIGFuZCBhbHNvIG9wdGlvbmFsbHkgcmV0dXJuIGFcbiAqIGB0cy5FeHByZXNzaW9uYCB3aGljaCBjYW4gYmUgdXNlZCB0byByZWZlcmVuY2UgdGhlIG9wZXJhdGlvbidzIHJlc3VsdC5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgVGNiT3Age1xuICAvKipcbiAgICogU2V0IHRvIHRydWUgaWYgdGhpcyBvcGVyYXRpb24gY2FuIGJlIGNvbnNpZGVyZWQgb3B0aW9uYWwuIE9wdGlvbmFsIG9wZXJhdGlvbnMgYXJlIG9ubHkgZXhlY3V0ZWRcbiAgICogd2hlbiBkZXBlbmRlZCB1cG9uIGJ5IG90aGVyIG9wZXJhdGlvbnMsIG90aGVyd2lzZSB0aGV5IGFyZSBkaXNyZWdhcmRlZC4gVGhpcyBhbGxvd3MgZm9yIGxlc3NcbiAgICogY29kZSB0byBnZW5lcmF0ZSwgcGFyc2UgYW5kIHR5cGUtY2hlY2ssIG92ZXJhbGwgcG9zaXRpdmVseSBjb250cmlidXRpbmcgdG8gcGVyZm9ybWFuY2UuXG4gICAqL1xuICBhYnN0cmFjdCByZWFkb25seSBvcHRpb25hbDogYm9vbGVhbjtcblxuICBhYnN0cmFjdCBleGVjdXRlKCk6IHRzLkV4cHJlc3Npb258bnVsbDtcblxuICAvKipcbiAgICogUmVwbGFjZW1lbnQgdmFsdWUgb3Igb3BlcmF0aW9uIHVzZWQgd2hpbGUgdGhpcyBgVGNiT3BgIGlzIGV4ZWN1dGluZyAoaS5lLiB0byByZXNvbHZlIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMgZHVyaW5nIGl0cyBleGVjdXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzdWFsbHkgYSBgbnVsbCFgIGV4cHJlc3Npb24gKHdoaWNoIGFza3MgVFMgdG8gaW5mZXIgYW4gYXBwcm9wcmlhdGUgdHlwZSksIGJ1dCBhbm90aGVyXG4gICAqIGBUY2JPcGAgY2FuIGJlIHJldHVybmVkIGluIGNhc2VzIHdoZXJlIGFkZGl0aW9uYWwgY29kZSBnZW5lcmF0aW9uIGlzIG5lY2Vzc2FyeSB0byBkZWFsIHdpdGhcbiAgICogY2lyY3VsYXIgcmVmZXJlbmNlcy5cbiAgICovXG4gIGNpcmN1bGFyRmFsbGJhY2soKTogVGNiT3B8dHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY3JlYXRlcyBhbiBleHByZXNzaW9uIGZvciBhIG5hdGl2ZSBET00gZWxlbWVudCAob3Igd2ViIGNvbXBvbmVudCkgZnJvbSBhXG4gKiBgVG1wbEFzdEVsZW1lbnRgLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JFbGVtZW50T3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBnZW5lcmF0ZWQgYnkgdGhpcyBvcGVyYXRpb24gaXMgb25seSB1c2VkIGZvciB0eXBlLWluZmVyZW5jZSBvZiB0aGUgRE9NXG4gICAgLy8gZWxlbWVudCdzIHR5cGUgYW5kIHdvbid0IHJlcG9ydCBkaWFnbm9zdGljcyBieSBpdHNlbGYsIHNvIHRoZSBvcGVyYXRpb24gaXMgbWFya2VkIGFzIG9wdGlvbmFsXG4gICAgLy8gdG8gYXZvaWQgZ2VuZXJhdGluZyBzdGF0ZW1lbnRzIGZvciBET00gZWxlbWVudHMgdGhhdCBhcmUgbmV2ZXIgcmVmZXJlbmNlZC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgLy8gQWRkIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZWxlbWVudCB1c2luZyBkb2N1bWVudC5jcmVhdGVFbGVtZW50LlxuICAgIGNvbnN0IGluaXRpYWxpemVyID0gdHNDcmVhdGVFbGVtZW50KHRoaXMuZWxlbWVudC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLmVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuIHx8IHRoaXMuZWxlbWVudC5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGFuIGV4cHJlc3Npb24gZm9yIHBhcnRpY3VsYXIgbGV0LSBgVG1wbEFzdFZhcmlhYmxlYCBvbiBhXG4gKiBgVG1wbEFzdFRlbXBsYXRlYCdzIGNvbnRleHQuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIHZhcmlhYmxlIHZhcmlhYmxlIChsb2wpLlxuICovXG5jbGFzcyBUY2JWYXJpYWJsZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSB0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlLFxuICAgICAgcHJpdmF0ZSB2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgZm9yIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhlIHRlbXBsYXRlLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLnRlbXBsYXRlKTtcblxuICAgIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGVcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY29udGV4dC5cbiAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAvKiBleHByZXNzaW9uICovIGN0eCxcbiAgICAgICAgLyogbmFtZSAqLyB0aGlzLnZhcmlhYmxlLnZhbHVlIHx8ICckaW1wbGljaXQnKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGlkLCB0aGlzLnZhcmlhYmxlLmtleVNwYW4pO1xuXG4gICAgLy8gRGVjbGFyZSB0aGUgdmFyaWFibGUsIGFuZCByZXR1cm4gaXRzIGlkZW50aWZpZXIuXG4gICAgbGV0IHZhcmlhYmxlOiB0cy5WYXJpYWJsZVN0YXRlbWVudDtcbiAgICBpZiAodGhpcy52YXJpYWJsZS52YWx1ZVNwYW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhpbml0aWFsaXplciwgdGhpcy52YXJpYWJsZS52YWx1ZVNwYW4pO1xuICAgICAgdmFyaWFibGUgPSB0c0NyZWF0ZVZhcmlhYmxlKGlkLCB3cmFwRm9yVHlwZUNoZWNrZXIoaW5pdGlhbGl6ZXIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyaWFibGUgPSB0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcik7XG4gICAgfVxuICAgIGFkZFBhcnNlU3BhbkluZm8odmFyaWFibGUuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1swXSwgdGhpcy52YXJpYWJsZS5zb3VyY2VTcGFuKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh2YXJpYWJsZSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBhIHZhcmlhYmxlIGZvciBhIGBUbXBsQXN0VGVtcGxhdGVgJ3MgY29udGV4dC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgdGVtcGxhdGUncyBjb250ZXh0IHZhcmlhYmxlLlxuICovXG5jbGFzcyBUY2JUZW1wbGF0ZUNvbnRleHRPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIC8vIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY29udGV4dCB2YXJpYWJsZSBpcyBvbmx5IG5lZWRlZCB3aGVuIHRoZSBjb250ZXh0IGlzIGFjdHVhbGx5IHJlZmVyZW5jZWQuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gdHJ1ZTtcblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIC8vIEFsbG9jYXRlIGEgdGVtcGxhdGUgY3R4IHZhcmlhYmxlIGFuZCBkZWNsYXJlIGl0IHdpdGggYW4gJ2FueScgdHlwZS4gVGhlIHR5cGUgb2YgdGhpcyB2YXJpYWJsZVxuICAgIC8vIG1heSBiZSBuYXJyb3dlZCBhcyBhIHJlc3VsdCBvZiB0ZW1wbGF0ZSBndWFyZCBjb25kaXRpb25zLlxuICAgIGNvbnN0IGN0eCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICBjb25zdCB0eXBlID0gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoY3R4LCB0eXBlKSk7XG4gICAgcmV0dXJuIGN0eDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBkZXNjZW5kcyBpbnRvIGEgYFRtcGxBc3RUZW1wbGF0ZWAncyBjaGlsZHJlbiBhbmQgZ2VuZXJhdGVzIHR5cGUtY2hlY2tpbmcgY29kZSBmb3JcbiAqIHRoZW0uXG4gKlxuICogVGhpcyBvcGVyYXRpb24gd3JhcHMgdGhlIGNoaWxkcmVuJ3MgdHlwZS1jaGVja2luZyBjb2RlIGluIGFuIGBpZmAgYmxvY2ssIHdoaWNoIG1heSBpbmNsdWRlIG9uZVxuICogb3IgbW9yZSB0eXBlIGd1YXJkIGNvbmRpdGlvbnMgdGhhdCBuYXJyb3cgdHlwZXMgd2l0aGluIHRoZSB0ZW1wbGF0ZSBib2R5LlxuICovXG5jbGFzcyBUY2JUZW1wbGF0ZUJvZHlPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgLy8gQW4gYGlmYCB3aWxsIGJlIGNvbnN0cnVjdGVkLCB3aXRoaW4gd2hpY2ggdGhlIHRlbXBsYXRlJ3MgY2hpbGRyZW4gd2lsbCBiZSB0eXBlIGNoZWNrZWQuIFRoZVxuICAgIC8vIGBpZmAgaXMgdXNlZCBmb3IgdHdvIHJlYXNvbnM6IGl0IGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljIHNjb3BlLCBpc29sYXRpbmcgdmFyaWFibGVzIGRlY2xhcmVkXG4gICAgLy8gaW4gdGhlIHRlbXBsYXRlJ3MgVENCIGZyb20gdGhlIG91dGVyIGNvbnRleHQsIGFuZCBpdCBhbGxvd3MgYW55IGRpcmVjdGl2ZXMgb24gdGhlIHRlbXBsYXRlc1xuICAgIC8vIHRvIHBlcmZvcm0gdHlwZSBuYXJyb3dpbmcgb2YgZWl0aGVyIGV4cHJlc3Npb25zIG9yIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQuXG4gICAgLy9cbiAgICAvLyBUaGUgZ3VhcmQgaXMgdGhlIGBpZmAgYmxvY2sncyBjb25kaXRpb24uIEl0J3MgdXN1YWxseSBzZXQgdG8gYHRydWVgIGJ1dCBkaXJlY3RpdmVzIHRoYXQgZXhpc3RcbiAgICAvLyBvbiB0aGUgdGVtcGxhdGUgY2FuIHRyaWdnZXIgZXh0cmEgZ3VhcmQgZXhwcmVzc2lvbnMgdGhhdCBzZXJ2ZSB0byBuYXJyb3cgdHlwZXMgd2l0aGluIHRoZVxuICAgIC8vIGBpZmAuIGBndWFyZGAgaXMgY2FsY3VsYXRlZCBieSBzdGFydGluZyB3aXRoIGB0cnVlYCBhbmQgYWRkaW5nIG90aGVyIGNvbmRpdGlvbnMgYXMgbmVlZGVkLlxuICAgIC8vIENvbGxlY3QgdGhlc2UgaW50byBgZ3VhcmRzYCBieSBwcm9jZXNzaW5nIHRoZSBkaXJlY3RpdmVzLlxuICAgIGNvbnN0IGRpcmVjdGl2ZUd1YXJkczogdHMuRXhwcmVzc2lvbltdID0gW107XG5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZSh0aGlzLnRlbXBsYXRlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCBkaXJJbnN0SWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50ZW1wbGF0ZSwgZGlyKTtcbiAgICAgICAgY29uc3QgZGlySWQgPVxuICAgICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZShkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pik7XG5cbiAgICAgICAgLy8gVGhlcmUgYXJlIHR3byBraW5kcyBvZiBndWFyZHMuIFRlbXBsYXRlIGd1YXJkcyAobmdUZW1wbGF0ZUd1YXJkcykgYWxsb3cgdHlwZSBuYXJyb3dpbmcgb2ZcbiAgICAgICAgLy8gdGhlIGV4cHJlc3Npb24gcGFzc2VkIHRvIGFuIEBJbnB1dCBvZiB0aGUgZGlyZWN0aXZlLiBTY2FuIHRoZSBkaXJlY3RpdmUgdG8gc2VlIGlmIGl0IGhhc1xuICAgICAgICAvLyBhbnkgdGVtcGxhdGUgZ3VhcmRzLCBhbmQgZ2VuZXJhdGUgdGhlbSBpZiBuZWVkZWQuXG4gICAgICAgIGRpci5uZ1RlbXBsYXRlR3VhcmRzLmZvckVhY2goZ3VhcmQgPT4ge1xuICAgICAgICAgIC8vIEZvciBlYWNoIHRlbXBsYXRlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUsIGxvb2sgZm9yIGEgYmluZGluZyB0byB0aGF0IGlucHV0LlxuICAgICAgICAgIGNvbnN0IGJvdW5kSW5wdXQgPSB0aGlzLnRlbXBsYXRlLmlucHV0cy5maW5kKGkgPT4gaS5uYW1lID09PSBndWFyZC5pbnB1dE5hbWUpIHx8XG4gICAgICAgICAgICAgIHRoaXMudGVtcGxhdGUudGVtcGxhdGVBdHRycy5maW5kKFxuICAgICAgICAgICAgICAgICAgKGk6IFRtcGxBc3RUZXh0QXR0cmlidXRlfFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSk6IGkgaXMgVG1wbEFzdEJvdW5kQXR0cmlidXRlID0+XG4gICAgICAgICAgICAgICAgICAgICAgaSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBpLm5hbWUgPT09IGd1YXJkLmlucHV0TmFtZSk7XG4gICAgICAgICAgaWYgKGJvdW5kSW5wdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYm91bmRJbnB1dC52YWx1ZSwgdGhpcy50Y2IsIHRoaXMuc2NvcGUpO1xuXG4gICAgICAgICAgICAvLyBUaGUgZXhwcmVzc2lvbiBoYXMgYWxyZWFkeSBiZWVuIGNoZWNrZWQgaW4gdGhlIHR5cGUgY29uc3RydWN0b3IgaW52b2NhdGlvbiwgc29cbiAgICAgICAgICAgIC8vIGl0IHNob3VsZCBiZSBpZ25vcmVkIHdoZW4gdXNlZCB3aXRoaW4gYSB0ZW1wbGF0ZSBndWFyZC5cbiAgICAgICAgICAgIG1hcmtJZ25vcmVEaWFnbm9zdGljcyhleHByKTtcblxuICAgICAgICAgICAgaWYgKGd1YXJkLnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgICAgICAgICAvLyBVc2UgdGhlIGJpbmRpbmcgZXhwcmVzc2lvbiBpdHNlbGYgYXMgZ3VhcmQuXG4gICAgICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSB3aXRoIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgYW5kIHRoYXRcbiAgICAgICAgICAgICAgLy8gZXhwcmVzc2lvbi5cbiAgICAgICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsIGBuZ1RlbXBsYXRlR3VhcmRfJHtndWFyZC5pbnB1dE5hbWV9YCwgW1xuICAgICAgICAgICAgICAgIGRpckluc3RJZCxcbiAgICAgICAgICAgICAgICBleHByLFxuICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhndWFyZEludm9rZSwgYm91bmRJbnB1dC52YWx1ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGhlIHNlY29uZCBraW5kIG9mIGd1YXJkIGlzIGEgdGVtcGxhdGUgY29udGV4dCBndWFyZC4gVGhpcyBndWFyZCBuYXJyb3dzIHRoZSB0ZW1wbGF0ZVxuICAgICAgICAvLyByZW5kZXJpbmcgY29udGV4dCB2YXJpYWJsZSBgY3R4YC5cbiAgICAgICAgaWYgKGRpci5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkICYmIHRoaXMudGNiLmVudi5jb25maWcuYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHMpIHtcbiAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsICduZ1RlbXBsYXRlQ29udGV4dEd1YXJkJywgW2Rpckluc3RJZCwgY3R4XSk7XG4gICAgICAgICAgYWRkUGFyc2VTcGFuSW5mbyhndWFyZEludm9rZSwgdGhpcy50ZW1wbGF0ZS5zb3VyY2VTcGFuKTtcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCeSBkZWZhdWx0IHRoZSBndWFyZCBpcyBzaW1wbHkgYHRydWVgLlxuICAgIGxldCBndWFyZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgZ3VhcmRzIGZyb20gZGlyZWN0aXZlcywgdXNlIHRoZW0gaW5zdGVhZC5cbiAgICBpZiAoZGlyZWN0aXZlR3VhcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIFBvcCB0aGUgZmlyc3QgdmFsdWUgYW5kIHVzZSBpdCBhcyB0aGUgaW5pdGlhbGl6ZXIgdG8gcmVkdWNlKCkuIFRoaXMgd2F5LCBhIHNpbmdsZSBndWFyZFxuICAgICAgLy8gd2lsbCBiZSB1c2VkIG9uIGl0cyBvd24sIGJ1dCB0d28gb3IgbW9yZSB3aWxsIGJlIGNvbWJpbmVkIGludG8gYmluYXJ5IEFORCBleHByZXNzaW9ucy5cbiAgICAgIGd1YXJkID0gZGlyZWN0aXZlR3VhcmRzLnJlZHVjZShcbiAgICAgICAgICAoZXhwciwgZGlyR3VhcmQpID0+XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUJpbmFyeShleHByLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCBkaXJHdWFyZCksXG4gICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnBvcCgpISk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IFNjb3BlIGZvciB0aGUgdGVtcGxhdGUuIFRoaXMgY29uc3RydWN0cyB0aGUgbGlzdCBvZiBvcGVyYXRpb25zIGZvciB0aGUgdGVtcGxhdGVcbiAgICAvLyBjaGlsZHJlbiwgYXMgd2VsbCBhcyB0cmFja3MgYmluZGluZ3Mgd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICBjb25zdCB0bXBsU2NvcGUgPSBTY29wZS5mb3JOb2Rlcyh0aGlzLnRjYiwgdGhpcy5zY29wZSwgdGhpcy50ZW1wbGF0ZSwgZ3VhcmQpO1xuXG4gICAgLy8gUmVuZGVyIHRoZSB0ZW1wbGF0ZSdzIGBTY29wZWAgaW50byBpdHMgc3RhdGVtZW50cy5cbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gdG1wbFNjb3BlLnJlbmRlcigpO1xuICAgIGlmIChzdGF0ZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gQXMgYW4gb3B0aW1pemF0aW9uLCBkb24ndCBnZW5lcmF0ZSB0aGUgc2NvcGUncyBibG9jayBpZiBpdCBoYXMgbm8gc3RhdGVtZW50cy4gVGhpcyBpc1xuICAgICAgLy8gYmVuZWZpY2lhbCBmb3IgdGVtcGxhdGVzIHRoYXQgY29udGFpbiBmb3IgZXhhbXBsZSBgPHNwYW4gKm5nSWY9XCJmaXJzdFwiPjwvc3Bhbj5gLCBpbiB3aGljaFxuICAgICAgLy8gY2FzZSB0aGVyZSdzIG5vIG5lZWQgdG8gcmVuZGVyIHRoZSBgTmdJZmAgZ3VhcmQgZXhwcmVzc2lvbi4gVGhpcyBzZWVtcyBsaWtlIGEgbWlub3JcbiAgICAgIC8vIGltcHJvdmVtZW50LCBob3dldmVyIGl0IHJlZHVjZXMgdGhlIG51bWJlciBvZiBmbG93LW5vZGUgYW50ZWNlZGVudHMgdGhhdCBUeXBlU2NyaXB0IG5lZWRzXG4gICAgICAvLyB0byBrZWVwIGludG8gYWNjb3VudCBmb3Igc3VjaCBjYXNlcywgcmVzdWx0aW5nIGluIGFuIG92ZXJhbGwgcmVkdWN0aW9uIG9mXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIHRpbWUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgdG1wbEJsb2NrOiB0cy5TdGF0ZW1lbnQgPSB0cy5jcmVhdGVCbG9jayhzdGF0ZW1lbnRzKTtcbiAgICBpZiAoZ3VhcmQgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBzY29wZSBoYXMgYSBndWFyZCB0aGF0IG5lZWRzIHRvIGJlIGFwcGxpZWQsIHNvIHdyYXAgdGhlIHRlbXBsYXRlIGJsb2NrIGludG8gYW4gYGlmYFxuICAgICAgLy8gc3RhdGVtZW50IGNvbnRhaW5pbmcgdGhlIGd1YXJkIGV4cHJlc3Npb24uXG4gICAgICB0bXBsQmxvY2sgPSB0cy5jcmVhdGVJZigvKiBleHByZXNzaW9uICovIGd1YXJkLCAvKiB0aGVuU3RhdGVtZW50ICovIHRtcGxCbG9jayk7XG4gICAgfVxuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRtcGxCbG9jayk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCByZW5kZXJzIGEgdGV4dCBiaW5kaW5nIChpbnRlcnBvbGF0aW9uKSBpbnRvIHRoZSBUQ0IuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuY2xhc3MgVGNiVGV4dEludGVycG9sYXRpb25PcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgc2NvcGU6IFNjb3BlLCBwcml2YXRlIGJpbmRpbmc6IFRtcGxBc3RCb3VuZFRleHQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24odGhpcy5iaW5kaW5nLnZhbHVlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiBhIGRpcmVjdGl2ZS4gRm9yIGdlbmVyaWMgZGlyZWN0aXZlcywgZ2VuZXJpY1xuICogcGFyYW1ldGVycyBhcmUgc2V0IHRvIGBhbnlgIHR5cGUuXG4gKi9cbmFic3RyYWN0IGNsYXNzIFRjYkRpcmVjdGl2ZVR5cGVPcEJhc2UgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIHRjYjogQ29udGV4dCwgcHJvdGVjdGVkIHNjb3BlOiBTY29wZSxcbiAgICAgIHByb3RlY3RlZCBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsIHByb3RlY3RlZCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgdG8gZGVjbGFyZSB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBhbmRcbiAgICAvLyB3b24ndCByZXBvcnQgZGlhZ25vc3RpY3MgYnkgaXRzZWxmLCBzbyB0aGUgb3BlcmF0aW9uIGlzIG1hcmtlZCBhcyBvcHRpb25hbCB0byBhdm9pZFxuICAgIC8vIGdlbmVyYXRpbmcgZGVjbGFyYXRpb25zIGZvciBkaXJlY3RpdmVzIHRoYXQgZG9uJ3QgaGF2ZSBhbnkgaW5wdXRzL291dHB1dHMuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGRpclJlZiA9IHRoaXMuZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgICBjb25zdCByYXdUeXBlID0gdGhpcy50Y2IuZW52LnJlZmVyZW5jZVR5cGUodGhpcy5kaXIucmVmKTtcblxuICAgIGxldCB0eXBlOiB0cy5UeXBlTm9kZTtcbiAgICBpZiAodGhpcy5kaXIuaXNHZW5lcmljID09PSBmYWxzZSB8fCBkaXJSZWYubm9kZS50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlID0gcmF3VHlwZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHJhd1R5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSB3aGVuIHJlZmVyZW5jaW5nIHRoZSB0eXBlIGZvciAke3RoaXMuZGlyLnJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCB0eXBlQXJndW1lbnRzID0gZGlyUmVmLm5vZGUudHlwZVBhcmFtZXRlcnMubWFwKFxuICAgICAgICAgICgpID0+IHRzLmZhY3RvcnkuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgICAgdHlwZSA9IHRzLmZhY3RvcnkuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUocmF3VHlwZS50eXBlTmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIodHlwZSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKHR5cGUsIHRoaXMubm9kZS5zdGFydFNvdXJjZVNwYW4gfHwgdGhpcy5ub2RlLnNvdXJjZVNwYW4pO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGlkLCB0eXBlKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBub24tZ2VuZXJpYyBkaXJlY3RpdmUgX3dpdGhvdXRfIHNldHRpbmcgYW55IG9mIGl0c1xuICogaW5wdXRzLiBJbnB1dHMgIGFyZSBsYXRlciBzZXQgaW4gdGhlIGBUY2JEaXJlY3RpdmVJbnB1dHNPcGAuIFR5cGUgY2hlY2tpbmcgd2FzIGZvdW5kIHRvIGJlXG4gKiBmYXN0ZXIgd2hlbiBkb25lIGluIHRoaXMgd2F5IGFzIG9wcG9zZWQgdG8gYFRjYkRpcmVjdGl2ZUN0b3JPcGAgd2hpY2ggaXMgb25seSBuZWNlc3Nhcnkgd2hlbiB0aGVcbiAqIGRpcmVjdGl2ZSBpcyBnZW5lcmljLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYk5vbkdlbmVyaWNEaXJlY3RpdmVUeXBlT3AgZXh0ZW5kcyBUY2JEaXJlY3RpdmVUeXBlT3BCYXNlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBmb3IgdGhpcyBvcCdzIGRpcmVjdGl2ZSBvZiB0aGUgYXJndW1lbnQgdHlwZS4gUmV0dXJucyB0aGUgaWQgb2ZcbiAgICogdGhlIG5ld2x5IGNyZWF0ZWQgdmFyaWFibGUuXG4gICAqL1xuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGRpclJlZiA9IHRoaXMuZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgaWYgKHRoaXMuZGlyLmlzR2VuZXJpYykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gRXJyb3I6IGV4cGVjdGVkICR7ZGlyUmVmLmRlYnVnTmFtZX0gbm90IHRvIGJlIGdlbmVyaWMuYCk7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5leGVjdXRlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiBhIGdlbmVyaWMgZGlyZWN0aXZlIHdpdGggaXRzIGdlbmVyaWMgcGFyYW1ldGVycyBzZXRcbiAqIHRvIGBhbnlgIHR5cGUuIFRoaXMgb3AgaXMgbGlrZSBgVGNiRGlyZWN0aXZlVHlwZU9wYCwgZXhjZXB0IHRoYXQgZ2VuZXJpYyBwYXJhbWV0ZXJzIGFyZSBzZXQgdG9cbiAqIGBhbnlgIHR5cGUuIFRoaXMgaXMgdXNlZCBmb3Igc2l0dWF0aW9ucyB3aGVyZSB3ZSB3YW50IHRvIGF2b2lkIGlubGluaW5nLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgZ2VuZXJpY1xuICogdHlwZSBwYXJhbWV0ZXJzIHNldCB0byBgYW55YC5cbiAqL1xuY2xhc3MgVGNiR2VuZXJpY0RpcmVjdGl2ZVR5cGVXaXRoQW55UGFyYW1zT3AgZXh0ZW5kcyBUY2JEaXJlY3RpdmVUeXBlT3BCYXNlIHtcbiAgZXhlY3V0ZSgpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBkaXJSZWYgPSB0aGlzLmRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgIGlmIChkaXJSZWYubm9kZS50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbiBFcnJvcjogZXhwZWN0ZWQgdHlwZVBhcmFtZXRlcnMgd2hlbiBjcmVhdGluZyBhIGRlY2xhcmF0aW9uIGZvciAke1xuICAgICAgICAgIGRpclJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLmV4ZWN1dGUoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBjcmVhdGVzIGEgdmFyaWFibGUgZm9yIGEgbG9jYWwgcmVmIGluIGEgdGVtcGxhdGUuXG4gKiBUaGUgaW5pdGlhbGl6ZXIgZm9yIHRoZSB2YXJpYWJsZSBpcyB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBmb3IgdGhlIGRpcmVjdGl2ZSwgdGVtcGxhdGUsIG9yXG4gKiBlbGVtZW50IHRoZSByZWYgcmVmZXJzIHRvLiBXaGVuIHRoZSByZWZlcmVuY2UgaXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUsIHRob3NlIFRDQiBzdGF0ZW1lbnRzIHdpbGxcbiAqIGFjY2VzcyB0aGlzIHZhcmlhYmxlIGFzIHdlbGwuIEZvciBleGFtcGxlOlxuICogYGBgXG4gKiB2YXIgX3QxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gKiB2YXIgX3QyID0gX3QxO1xuICogX3QyLnZhbHVlXG4gKiBgYGBcbiAqIFRoaXMgb3BlcmF0aW9uIHN1cHBvcnRzIG1vcmUgZmx1ZW50IGxvb2t1cHMgZm9yIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlcmAgd2hlbiBnZXR0aW5nIGEgc3ltYm9sXG4gKiBmb3IgYSByZWZlcmVuY2UuIEluIG1vc3QgY2FzZXMsIHRoaXMgaXNuJ3QgZXNzZW50aWFsOyB0aGF0IGlzLCB0aGUgaW5mb3JtYXRpb24gZm9yIHRoZSBzeW1ib2xcbiAqIGNvdWxkIGJlIGdhdGhlcmVkIHdpdGhvdXQgdGhpcyBvcGVyYXRpb24gdXNpbmcgdGhlIGBCb3VuZFRhcmdldGAuIEhvd2V2ZXIsIGZvciB0aGUgY2FzZSBvZlxuICogbmctdGVtcGxhdGUgcmVmZXJlbmNlcywgd2Ugd2lsbCBuZWVkIHRoaXMgcmVmZXJlbmNlIHZhcmlhYmxlIHRvIG5vdCBvbmx5IHByb3ZpZGUgYSBsb2NhdGlvbiBpblxuICogdGhlIHNoaW0gZmlsZSwgYnV0IGFsc28gdG8gbmFycm93IHRoZSB2YXJpYWJsZSB0byB0aGUgY29ycmVjdCBgVGVtcGxhdGVSZWY8VD5gIHR5cGUgcmF0aGVyIHRoYW5cbiAqIGBUZW1wbGF0ZVJlZjxhbnk+YCAodGhpcyB3b3JrIGlzIHN0aWxsIFRPRE8pLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgdmFyaWFibGUgd2l0aCBpdHMgaW5mZXJyZWRcbiAqIHR5cGUuXG4gKi9cbmNsYXNzIFRjYlJlZmVyZW5jZU9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGNiOiBDb250ZXh0LCBwcml2YXRlIHJlYWRvbmx5IHNjb3BlOiBTY29wZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgbm9kZTogVG1wbEFzdFJlZmVyZW5jZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgaG9zdDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXQ6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvLyBUaGUgc3RhdGVtZW50IGdlbmVyYXRlZCBieSB0aGlzIG9wZXJhdGlvbiBpcyBvbmx5IHVzZWQgdG8gZm9yIHRoZSBUeXBlIENoZWNrZXJcbiAgLy8gc28gaXQgY2FuIG1hcCBhIHJlZmVyZW5jZSB2YXJpYWJsZSBpbiB0aGUgdGVtcGxhdGUgZGlyZWN0bHkgdG8gYSBub2RlIGluIHRoZSBUQ0IuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gdHJ1ZTtcblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIGxldCBpbml0aWFsaXplciA9XG4gICAgICAgIHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgP1xuICAgICAgICB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy50YXJnZXQpIDpcbiAgICAgICAgdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuaG9zdCwgdGhpcy50YXJnZXQpO1xuXG4gICAgLy8gVGhlIHJlZmVyZW5jZSBpcyBlaXRoZXIgdG8gYW4gZWxlbWVudCwgYW4gPG5nLXRlbXBsYXRlPiBub2RlLCBvciB0byBhIGRpcmVjdGl2ZSBvbiBhblxuICAgIC8vIGVsZW1lbnQgb3IgdGVtcGxhdGUuXG4gICAgaWYgKCh0aGlzLnRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50ICYmICF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcykgfHxcbiAgICAgICAgIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzKSB7XG4gICAgICAvLyBSZWZlcmVuY2VzIHRvIERPTSBub2RlcyBhcmUgcGlubmVkIHRvICdhbnknIHdoZW4gYGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlc2AgaXMgYGZhbHNlYC5cbiAgICAgIC8vIFJlZmVyZW5jZXMgdG8gYFRlbXBsYXRlUmVmYHMgYW5kIGRpcmVjdGl2ZXMgYXJlIHBpbm5lZCB0byAnYW55JyB3aGVuXG4gICAgICAvLyBgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzYCBpcyBgZmFsc2VgLlxuICAgICAgaW5pdGlhbGl6ZXIgPVxuICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihpbml0aWFsaXplciwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy50YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIERpcmVjdCByZWZlcmVuY2VzIHRvIGFuIDxuZy10ZW1wbGF0ZT4gbm9kZSBzaW1wbHkgcmVxdWlyZSBhIHZhbHVlIG9mIHR5cGVcbiAgICAgIC8vIGBUZW1wbGF0ZVJlZjxhbnk+YC4gVG8gZ2V0IHRoaXMsIGFuIGV4cHJlc3Npb24gb2YgdGhlIGZvcm1cbiAgICAgIC8vIGAoX3QxIGFzIGFueSBhcyBUZW1wbGF0ZVJlZjxhbnk+KWAgaXMgY29uc3RydWN0ZWQuXG4gICAgICBpbml0aWFsaXplciA9XG4gICAgICAgICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKGluaXRpYWxpemVyLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICBpbml0aWFsaXplciA9IHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihcbiAgICAgICAgICBpbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLnRjYi5lbnYucmVmZXJlbmNlRXh0ZXJuYWxUeXBlKCdAYW5ndWxhci9jb3JlJywgJ1RlbXBsYXRlUmVmJywgW0RZTkFNSUNfVFlQRV0pKTtcbiAgICAgIGluaXRpYWxpemVyID0gdHMuY3JlYXRlUGFyZW4oaW5pdGlhbGl6ZXIpO1xuICAgIH1cbiAgICBhZGRQYXJzZVNwYW5JbmZvKGluaXRpYWxpemVyLCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpZCwgdGhpcy5ub2RlLmtleVNwYW4pO1xuXG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggaXMgdXNlZCB3aGVuIHRoZSB0YXJnZXQgb2YgYSByZWZlcmVuY2UgaXMgbWlzc2luZy4gVGhpcyBvcGVyYXRpb24gZ2VuZXJhdGVzIGFcbiAqIHZhcmlhYmxlIG9mIHR5cGUgYW55IGZvciB1c2FnZXMgb2YgdGhlIGludmFsaWQgcmVmZXJlbmNlIHRvIHJlc29sdmUgdG8uIFRoZSBpbnZhbGlkIHJlZmVyZW5jZVxuICogaXRzZWxmIGlzIHJlY29yZGVkIG91dC1vZi1iYW5kLlxuICovXG5jbGFzcyBUY2JJbnZhbGlkUmVmZXJlbmNlT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgdGNiOiBDb250ZXh0LCBwcml2YXRlIHJlYWRvbmx5IHNjb3BlOiBTY29wZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvLyBUaGUgZGVjbGFyYXRpb24gb2YgYSBtaXNzaW5nIHJlZmVyZW5jZSBpcyBvbmx5IG5lZWRlZCB3aGVuIHRoZSByZWZlcmVuY2UgaXMgcmVzb2x2ZWQuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gdHJ1ZTtcblxuICBleGVjdXRlKCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIE5VTExfQVNfQU5ZKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGNvbnN0cnVjdHMgYW4gaW5zdGFuY2Ugb2YgYSBkaXJlY3RpdmUgd2l0aCB0eXBlcyBpbmZlcnJlZCBmcm9tIGl0cyBpbnB1dHMuIFRoZVxuICogaW5wdXRzIHRoZW1zZWx2ZXMgYXJlIG5vdCBjaGVja2VkIGhlcmU7IGNoZWNraW5nIG9mIGlucHV0cyBpcyBhY2hpZXZlZCBpbiBgVGNiRGlyZWN0aXZlSW5wdXRzT3BgLlxuICogQW55IGVycm9ycyByZXBvcnRlZCBpbiB0aGlzIHN0YXRlbWVudCBhcmUgaWdub3JlZCwgYXMgdGhlIHR5cGUgY29uc3RydWN0b3IgY2FsbCBpcyBvbmx5IHByZXNlbnRcbiAqIGZvciB0eXBlLWluZmVyZW5jZS5cbiAqXG4gKiBXaGVuIGEgRGlyZWN0aXZlIGlzIGdlbmVyaWMsIGl0IGlzIHJlcXVpcmVkIHRoYXQgdGhlIFRDQiBnZW5lcmF0ZXMgdGhlIGluc3RhbmNlIHVzaW5nIHRoaXMgbWV0aG9kXG4gKiBpbiBvcmRlciB0byBpbmZlciB0aGUgdHlwZSBpbmZvcm1hdGlvbiBjb3JyZWN0bHkuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB2YXJpYWJsZSB3aXRoIGl0cyBpbmZlcnJlZFxuICogdHlwZS5cbiAqL1xuY2xhc3MgVGNiRGlyZWN0aXZlQ3Rvck9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgZ2VuZXJhdGVkIGJ5IHRoaXMgb3BlcmF0aW9uIGlzIG9ubHkgdXNlZCB0byBpbmZlciB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBhbmRcbiAgICAvLyB3b24ndCByZXBvcnQgZGlhZ25vc3RpY3MgYnkgaXRzZWxmLCBzbyB0aGUgb3BlcmF0aW9uIGlzIG1hcmtlZCBhcyBvcHRpb25hbC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIoaWQsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhpZCwgdGhpcy5ub2RlLnN0YXJ0U291cmNlU3BhbiB8fCB0aGlzLm5vZGUuc291cmNlU3Bhbik7XG5cbiAgICBjb25zdCBnZW5lcmljSW5wdXRzID0gbmV3IE1hcDxzdHJpbmcsIFRjYkRpcmVjdGl2ZUlucHV0PigpO1xuXG4gICAgY29uc3QgaW5wdXRzID0gZ2V0Qm91bmRJbnB1dHModGhpcy5kaXIsIHRoaXMubm9kZSwgdGhpcy50Y2IpO1xuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XG4gICAgICAvLyBTa2lwIHRleHQgYXR0cmlidXRlcyBpZiBjb25maWd1cmVkIHRvIGRvIHNvLlxuICAgICAgaWYgKCF0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyAmJlxuICAgICAgICAgIGlucHV0LmF0dHJpYnV0ZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBmaWVsZE5hbWUgb2YgaW5wdXQuZmllbGROYW1lcykge1xuICAgICAgICAvLyBTa2lwIHRoZSBmaWVsZCBpZiBhbiBhdHRyaWJ1dGUgaGFzIGFscmVhZHkgYmVlbiBib3VuZCB0byBpdDsgd2UgY2FuJ3QgaGF2ZSBhIGR1cGxpY2F0ZVxuICAgICAgICAvLyBrZXkgaW4gdGhlIHR5cGUgY29uc3RydWN0b3IgY2FsbC5cbiAgICAgICAgaWYgKGdlbmVyaWNJbnB1dHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0cmFuc2xhdGVJbnB1dChpbnB1dC5hdHRyaWJ1dGUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgICAgZ2VuZXJpY0lucHV0cy5zZXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgdHlwZTogJ2JpbmRpbmcnLFxuICAgICAgICAgIGZpZWxkOiBmaWVsZE5hbWUsXG4gICAgICAgICAgZXhwcmVzc2lvbixcbiAgICAgICAgICBzb3VyY2VTcGFuOiBpbnB1dC5hdHRyaWJ1dGUuc291cmNlU3BhblxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgdW5zZXQgZGlyZWN0aXZlIGlucHV0cyBmb3IgZWFjaCBvZiB0aGUgcmVtYWluaW5nIHVuc2V0IGZpZWxkcy5cbiAgICBmb3IgKGNvbnN0IFtmaWVsZE5hbWVdIG9mIHRoaXMuZGlyLmlucHV0cykge1xuICAgICAgaWYgKCFnZW5lcmljSW5wdXRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgIGdlbmVyaWNJbnB1dHMuc2V0KGZpZWxkTmFtZSwge3R5cGU6ICd1bnNldCcsIGZpZWxkOiBmaWVsZE5hbWV9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIHRoZSBkaXJlY3RpdmUgdG8gaW5mZXIgYSB0eXBlLCBhbmQgYXNzaWduIHRoZSBkaXJlY3RpdmVcbiAgICAvLyBpbnN0YW5jZS5cbiAgICBjb25zdCB0eXBlQ3RvciA9IHRjYkNhbGxUeXBlQ3Rvcih0aGlzLmRpciwgdGhpcy50Y2IsIEFycmF5LmZyb20oZ2VuZXJpY0lucHV0cy52YWx1ZXMoKSkpO1xuICAgIG1hcmtJZ25vcmVEaWFnbm9zdGljcyh0eXBlQ3Rvcik7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdHlwZUN0b3IpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBjaXJjdWxhckZhbGxiYWNrKCk6IFRjYk9wIHtcbiAgICByZXR1cm4gbmV3IFRjYkRpcmVjdGl2ZUN0b3JDaXJjdWxhckZhbGxiYWNrT3AodGhpcy50Y2IsIHRoaXMuc2NvcGUsIHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGdlbmVyYXRlcyBjb2RlIHRvIGNoZWNrIGlucHV0IGJpbmRpbmdzIG9uIGFuIGVsZW1lbnQgdGhhdCBjb3JyZXNwb25kIHdpdGggdGhlXG4gKiBtZW1iZXJzIG9mIGEgZGlyZWN0aXZlLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYkRpcmVjdGl2ZUlucHV0c09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogbnVsbCB7XG4gICAgbGV0IGRpcklkOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgLy8gVE9ETyhqb29zdCk6IHJlcG9ydCBkdXBsaWNhdGUgcHJvcGVydGllc1xuXG4gICAgY29uc3QgaW5wdXRzID0gZ2V0Qm91bmRJbnB1dHModGhpcy5kaXIsIHRoaXMubm9kZSwgdGhpcy50Y2IpO1xuICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XG4gICAgICAvLyBGb3IgYm91bmQgaW5wdXRzLCB0aGUgcHJvcGVydHkgaXMgYXNzaWduZWQgdGhlIGJpbmRpbmcgZXhwcmVzc2lvbi5cbiAgICAgIGxldCBleHByID0gdHJhbnNsYXRlSW5wdXQoaW5wdXQuYXR0cmlidXRlLCB0aGlzLnRjYiwgdGhpcy5zY29wZSk7XG4gICAgICBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzKSB7XG4gICAgICAgIC8vIElmIGNoZWNraW5nIHRoZSB0eXBlIG9mIGJpbmRpbmdzIGlzIGRpc2FibGVkLCBjYXN0IHRoZSByZXN1bHRpbmcgZXhwcmVzc2lvbiB0byAnYW55J1xuICAgICAgICAvLyBiZWZvcmUgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgIGV4cHIgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMudGNiLmVudi5jb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgc3RyaWN0IG51bGwgY2hlY2tzIGFyZSBkaXNhYmxlZCwgZXJhc2UgYG51bGxgIGFuZCBgdW5kZWZpbmVkYCBmcm9tIHRoZSB0eXBlIGJ5XG4gICAgICAgIC8vIHdyYXBwaW5nIHRoZSBleHByZXNzaW9uIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uLlxuICAgICAgICBleHByID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgICB9XG5cbiAgICAgIGxldCBhc3NpZ25tZW50OiB0cy5FeHByZXNzaW9uID0gd3JhcEZvckRpYWdub3N0aWNzKGV4cHIpO1xuXG4gICAgICBmb3IgKGNvbnN0IGZpZWxkTmFtZSBvZiBpbnB1dC5maWVsZE5hbWVzKSB7XG4gICAgICAgIGxldCB0YXJnZXQ6IHRzLkxlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgIGlmICh0aGlzLmRpci5jb2VyY2VkSW5wdXRGaWVsZHMuaGFzKGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAvLyBUaGUgaW5wdXQgaGFzIGEgY29lcmNpb24gZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIHVzZWQgaW5zdGVhZCBvZiBhc3NpZ25pbmcgdGhlXG4gICAgICAgICAgLy8gZXhwcmVzc2lvbiBpbnRvIHRoZSBpbnB1dCBmaWVsZCBkaXJlY3RseS4gVG8gYWNoaWV2ZSB0aGlzLCBhIHZhcmlhYmxlIGlzIGRlY2xhcmVkXG4gICAgICAgICAgLy8gd2l0aCBhIHR5cGUgb2YgYHR5cGVvZiBEaXJlY3RpdmUubmdBY2NlcHRJbnB1dFR5cGVfZmllbGROYW1lYCB3aGljaCBpcyB0aGVuIHVzZWQgYXNcbiAgICAgICAgICAvLyB0YXJnZXQgb2YgdGhlIGFzc2lnbm1lbnQuXG4gICAgICAgICAgY29uc3QgZGlyVHlwZVJlZiA9IHRoaXMudGNiLmVudi5yZWZlcmVuY2VUeXBlKHRoaXMuZGlyLnJlZik7XG4gICAgICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRpclR5cGVSZWYpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFR5cGVSZWZlcmVuY2VOb2RlIGZyb20gcmVmZXJlbmNlIHRvICR7dGhpcy5kaXIucmVmLmRlYnVnTmFtZX1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBpZCA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICAgICAgICBjb25zdCB0eXBlID0gdHNDcmVhdGVUeXBlUXVlcnlGb3JDb2VyY2VkSW5wdXQoZGlyVHlwZVJlZi50eXBlTmFtZSwgZmllbGROYW1lKTtcbiAgICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShpZCwgdHlwZSkpO1xuXG4gICAgICAgICAgdGFyZ2V0ID0gaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5kaXIudW5kZWNsYXJlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gSWYgbm8gY29lcmNpb24gZGVjbGFyYXRpb24gaXMgcHJlc2VudCBub3IgaXMgdGhlIGZpZWxkIGRlY2xhcmVkIChpLmUuIHRoZSBpbnB1dCBpc1xuICAgICAgICAgIC8vIGRlY2xhcmVkIGluIGEgYEBEaXJlY3RpdmVgIG9yIGBAQ29tcG9uZW50YCBkZWNvcmF0b3IncyBgaW5wdXRzYCBwcm9wZXJ0eSkgdGhlcmUgaXMgbm9cbiAgICAgICAgICAvLyBhc3NpZ25tZW50IHRhcmdldCBhdmFpbGFibGUsIHNvIHRoaXMgZmllbGQgaXMgc2tpcHBlZC5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICF0aGlzLnRjYi5lbnYuY29uZmlnLmhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5ncyAmJlxuICAgICAgICAgICAgdGhpcy5kaXIucmVzdHJpY3RlZElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgLy8gSWYgc3RyaWN0IGNoZWNraW5nIG9mIGFjY2VzcyBtb2RpZmllcnMgaXMgZGlzYWJsZWQgYW5kIHRoZSBmaWVsZCBpcyByZXN0cmljdGVkXG4gICAgICAgICAgLy8gKGkuZS4gcHJpdmF0ZS9wcm90ZWN0ZWQvcmVhZG9ubHkpLCBnZW5lcmF0ZSBhbiBhc3NpZ25tZW50IGludG8gYSB0ZW1wb3JhcnkgdmFyaWFibGVcbiAgICAgICAgICAvLyB0aGF0IGhhcyB0aGUgdHlwZSBvZiB0aGUgZmllbGQuIFRoaXMgYWNoaWV2ZXMgdHlwZS1jaGVja2luZyBidXQgY2lyY3VtdmVudHMgdGhlIGFjY2Vzc1xuICAgICAgICAgIC8vIG1vZGlmaWVycy5cbiAgICAgICAgICBpZiAoZGlySWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRpcklkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMubm9kZSwgdGhpcy5kaXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgICAgICAgIGNvbnN0IGRpclR5cGVSZWYgPSB0aGlzLnRjYi5lbnYucmVmZXJlbmNlVHlwZSh0aGlzLmRpci5yZWYpO1xuICAgICAgICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkaXJUeXBlUmVmKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBUeXBlUmVmZXJlbmNlTm9kZSBmcm9tIHJlZmVyZW5jZSB0byAke3RoaXMuZGlyLnJlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVJbmRleGVkQWNjZXNzVHlwZU5vZGUoXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZVR5cGVRdWVyeU5vZGUoZGlySWQgYXMgdHMuSWRlbnRpZmllciksXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGZpZWxkTmFtZSkpKTtcbiAgICAgICAgICBjb25zdCB0ZW1wID0gdHNEZWNsYXJlVmFyaWFibGUoaWQsIHR5cGUpO1xuICAgICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRlbXApO1xuICAgICAgICAgIHRhcmdldCA9IGlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChkaXJJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGlySWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5ub2RlLCB0aGlzLmRpcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVG8gZ2V0IGVycm9ycyBhc3NpZ24gZGlyZWN0bHkgdG8gdGhlIGZpZWxkcyBvbiB0aGUgaW5zdGFuY2UsIHVzaW5nIHByb3BlcnR5IGFjY2Vzc1xuICAgICAgICAgIC8vIHdoZW4gcG9zc2libGUuIFN0cmluZyBsaXRlcmFsIGZpZWxkcyBtYXkgbm90IGJlIHZhbGlkIEpTIGlkZW50aWZpZXJzIHNvIHdlIHVzZVxuICAgICAgICAgIC8vIGxpdGVyYWwgZWxlbWVudCBhY2Nlc3MgaW5zdGVhZCBmb3IgdGhvc2UgY2FzZXMuXG4gICAgICAgICAgdGFyZ2V0ID0gdGhpcy5kaXIuc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzLmhhcyhmaWVsZE5hbWUpID9cbiAgICAgICAgICAgICAgdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZE5hbWUpKSA6XG4gICAgICAgICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGRpcklkLCB0cy5jcmVhdGVJZGVudGlmaWVyKGZpZWxkTmFtZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlucHV0LmF0dHJpYnV0ZS5rZXlTcGFuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHRhcmdldCwgaW5wdXQuYXR0cmlidXRlLmtleVNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZpbmFsbHkgdGhlIGFzc2lnbm1lbnQgaXMgZXh0ZW5kZWQgYnkgYXNzaWduaW5nIGl0IGludG8gdGhlIHRhcmdldCBleHByZXNzaW9uLlxuICAgICAgICBhc3NpZ25tZW50ID0gdHMuY3JlYXRlQmluYXJ5KHRhcmdldCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgYXNzaWdubWVudCk7XG4gICAgICB9XG5cbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oYXNzaWdubWVudCwgaW5wdXQuYXR0cmlidXRlLnNvdXJjZVNwYW4pO1xuICAgICAgLy8gSWdub3JlIGRpYWdub3N0aWNzIGZvciB0ZXh0IGF0dHJpYnV0ZXMgaWYgY29uZmlndXJlZCB0byBkbyBzby5cbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgJiZcbiAgICAgICAgICBpbnB1dC5hdHRyaWJ1dGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3MoYXNzaWdubWVudCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoYXNzaWdubWVudCkpO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBgVGNiT3BgIHdoaWNoIGlzIHVzZWQgdG8gZ2VuZXJhdGUgYSBmYWxsYmFjayBleHByZXNzaW9uIGlmIHRoZSBpbmZlcmVuY2Ugb2YgYSBkaXJlY3RpdmUgdHlwZVxuICogdmlhIGBUY2JEaXJlY3RpdmVDdG9yT3BgIHJlcXVpcmVzIGEgcmVmZXJlbmNlIHRvIGl0cyBvd24gdHlwZS4gVGhpcyBjYW4gaGFwcGVuIHVzaW5nIGEgdGVtcGxhdGVcbiAqIHJlZmVyZW5jZTpcbiAqXG4gKiBgYGBodG1sXG4gKiA8c29tZS1jbXAgI3JlZiBbcHJvcF09XCJyZWYuZm9vXCI+PC9zb21lLWNtcD5cbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgYFRjYkRpcmVjdGl2ZUN0b3JDaXJjdWxhckZhbGxiYWNrT3BgIHdpbGwgYWRkIGEgc2Vjb25kIGluZmVyZW5jZSBvZiB0aGUgZGlyZWN0aXZlXG4gKiB0eXBlIHRvIHRoZSB0eXBlLWNoZWNrIGJsb2NrLCB0aGlzIHRpbWUgY2FsbGluZyB0aGUgZGlyZWN0aXZlJ3MgdHlwZSBjb25zdHJ1Y3RvciB3aXRob3V0IGFueVxuICogaW5wdXQgZXhwcmVzc2lvbnMuIFRoaXMgaW5mZXJzIHRoZSB3aWRlc3QgcG9zc2libGUgc3VwZXJ0eXBlIGZvciB0aGUgZGlyZWN0aXZlLCB3aGljaCBpcyB1c2VkIHRvXG4gKiByZXNvbHZlIGFueSByZWN1cnNpdmUgcmVmZXJlbmNlcyByZXF1aXJlZCB0byBpbmZlciB0aGUgcmVhbCB0eXBlLlxuICovXG5jbGFzcyBUY2JEaXJlY3RpdmVDdG9yQ2lyY3VsYXJGYWxsYmFja09wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHNjb3BlOiBTY29wZSwgcHJpdmF0ZSBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgY29uc3QgdHlwZUN0b3IgPSB0aGlzLnRjYi5lbnYudHlwZUN0b3JGb3IodGhpcy5kaXIpO1xuICAgIGNvbnN0IGNpcmN1bGFyUGxhY2Vob2xkZXIgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICB0eXBlQ3RvciwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsIFt0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpXSk7XG4gICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgY2lyY3VsYXJQbGFjZWhvbGRlcikpO1xuICAgIHJldHVybiBpZDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBmZWVkcyBlbGVtZW50cyBhbmQgdW5jbGFpbWVkIHByb3BlcnRpZXMgdG8gdGhlIGBEb21TY2hlbWFDaGVja2VyYC5cbiAqXG4gKiBUaGUgRE9NIHNjaGVtYSBpcyBub3QgY2hlY2tlZCB2aWEgVENCIGNvZGUgZ2VuZXJhdGlvbi4gSW5zdGVhZCwgdGhlIGBEb21TY2hlbWFDaGVja2VyYCBpbmdlc3RzXG4gKiBlbGVtZW50cyBhbmQgcHJvcGVydHkgYmluZGluZ3MgYW5kIGFjY3VtdWxhdGVzIHN5bnRoZXRpYyBgdHMuRGlhZ25vc3RpY2BzIG91dC1vZi1iYW5kLiBUaGVzZSBhcmVcbiAqIGxhdGVyIG1lcmdlZCB3aXRoIHRoZSBkaWFnbm9zdGljcyBnZW5lcmF0ZWQgZnJvbSB0aGUgVENCLlxuICpcbiAqIEZvciBjb252ZW5pZW5jZSwgdGhlIFRDQiBpdGVyYXRpb24gb2YgdGhlIHRlbXBsYXRlIGlzIHVzZWQgdG8gZHJpdmUgdGhlIGBEb21TY2hlbWFDaGVja2VyYCB2aWFcbiAqIHRoZSBgVGNiRG9tU2NoZW1hQ2hlY2tlck9wYC5cbiAqL1xuY2xhc3MgVGNiRG9tU2NoZW1hQ2hlY2tlck9wIGV4dGVuZHMgVGNiT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBwcml2YXRlIGNoZWNrRWxlbWVudDogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgY2xhaW1lZElucHV0czogU2V0PHN0cmluZz4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZ2V0IG9wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGV4ZWN1dGUoKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAodGhpcy5jaGVja0VsZW1lbnQpIHtcbiAgICAgIHRoaXMudGNiLmRvbVNjaGVtYUNoZWNrZXIuY2hlY2tFbGVtZW50KHRoaXMudGNiLmlkLCB0aGlzLmVsZW1lbnQsIHRoaXMudGNiLnNjaGVtYXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgdGhpcy5lbGVtZW50LmlucHV0cykge1xuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkgJiYgdGhpcy5jbGFpbWVkSW5wdXRzLmhhcyhiaW5kaW5nLm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBiaW5kaW5nIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkpIHtcbiAgICAgICAgaWYgKGJpbmRpbmcubmFtZSAhPT0gJ3N0eWxlJyAmJiBiaW5kaW5nLm5hbWUgIT09ICdjbGFzcycpIHtcbiAgICAgICAgICAvLyBBIGRpcmVjdCBiaW5kaW5nIHRvIGEgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3QgcHJvcGVydHlOYW1lID0gQVRUUl9UT19QUk9QW2JpbmRpbmcubmFtZV0gfHwgYmluZGluZy5uYW1lO1xuICAgICAgICAgIHRoaXMudGNiLmRvbVNjaGVtYUNoZWNrZXIuY2hlY2tQcm9wZXJ0eShcbiAgICAgICAgICAgICAgdGhpcy50Y2IuaWQsIHRoaXMuZWxlbWVudCwgcHJvcGVydHlOYW1lLCBiaW5kaW5nLnNvdXJjZVNwYW4sIHRoaXMudGNiLnNjaGVtYXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cblxuLyoqXG4gKiBNYXBwaW5nIGJldHdlZW4gYXR0cmlidXRlcyBuYW1lcyB0aGF0IGRvbid0IGNvcnJlc3BvbmQgdG8gdGhlaXIgZWxlbWVudCBwcm9wZXJ0eSBuYW1lcy5cbiAqIE5vdGU6IHRoaXMgbWFwcGluZyBoYXMgdG8gYmUga2VwdCBpbiBzeW5jIHdpdGggdGhlIGVxdWFsbHkgbmFtZWQgbWFwcGluZyBpbiB0aGUgcnVudGltZS5cbiAqL1xuY29uc3QgQVRUUl9UT19QUk9QOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7XG4gICdjbGFzcyc6ICdjbGFzc05hbWUnLFxuICAnZm9yJzogJ2h0bWxGb3InLFxuICAnZm9ybWFjdGlvbic6ICdmb3JtQWN0aW9uJyxcbiAgJ2lubmVySHRtbCc6ICdpbm5lckhUTUwnLFxuICAncmVhZG9ubHknOiAncmVhZE9ubHknLFxuICAndGFiaW5kZXgnOiAndGFiSW5kZXgnLFxufTtcblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgXCJ1bmNsYWltZWQgaW5wdXRzXCIgLSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHdoaWNoIHdlcmVcbiAqIG5vdCBhdHRyaWJ1dGVkIHRvIGFueSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBhbmQgYXJlIGluc3RlYWQgcHJvY2Vzc2VkIGFnYWluc3QgdGhlIEhUTUwgZWxlbWVudFxuICogaXRzZWxmLlxuICpcbiAqIEN1cnJlbnRseSwgb25seSB0aGUgZXhwcmVzc2lvbnMgb2YgdGhlc2UgYmluZGluZ3MgYXJlIGNoZWNrZWQuIFRoZSB0YXJnZXRzIG9mIHRoZSBiaW5kaW5ncyBhcmVcbiAqIGNoZWNrZWQgYWdhaW5zdCB0aGUgRE9NIHNjaGVtYSB2aWEgYSBgVGNiRG9tU2NoZW1hQ2hlY2tlck9wYC5cbiAqXG4gKiBFeGVjdXRpbmcgdGhpcyBvcGVyYXRpb24gcmV0dXJucyBub3RoaW5nLlxuICovXG5jbGFzcyBUY2JVbmNsYWltZWRJbnB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGNsYWltZWRJbnB1dHM6IFNldDxzdHJpbmc+KSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIC8vIGB0aGlzLmlucHV0c2AgY29udGFpbnMgb25seSB0aG9zZSBiaW5kaW5ncyBub3QgbWF0Y2hlZCBieSBhbnkgZGlyZWN0aXZlLiBUaGVzZSBiaW5kaW5ncyBnbyB0b1xuICAgIC8vIHRoZSBlbGVtZW50IGl0c2VsZi5cbiAgICBsZXQgZWxJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgdGhpcy5lbGVtZW50LmlucHV0cykge1xuICAgICAgaWYgKGJpbmRpbmcudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkgJiYgdGhpcy5jbGFpbWVkSW5wdXRzLmhhcyhiaW5kaW5nLm5hbWUpKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBiaW5kaW5nIGFzIGl0IHdhcyBjbGFpbWVkIGJ5IGEgZGlyZWN0aXZlLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJpbmRpbmcudmFsdWUsIHRoaXMudGNiLCB0aGlzLnNjb3BlKTtcbiAgICAgIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MpIHtcbiAgICAgICAgLy8gSWYgY2hlY2tpbmcgdGhlIHR5cGUgb2YgYmluZGluZ3MgaXMgZGlzYWJsZWQsIGNhc3QgdGhlIHJlc3VsdGluZyBleHByZXNzaW9uIHRvICdhbnknXG4gICAgICAgIC8vIGJlZm9yZSB0aGUgYXNzaWdubWVudC5cbiAgICAgICAgZXhwciA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgICAgfSBlbHNlIGlmICghdGhpcy50Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZEb21CaW5kaW5ncyAmJiBiaW5kaW5nLnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KSB7XG4gICAgICAgIGlmIChiaW5kaW5nLm5hbWUgIT09ICdzdHlsZScgJiYgYmluZGluZy5uYW1lICE9PSAnY2xhc3MnKSB7XG4gICAgICAgICAgaWYgKGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGVsSWQgPSB0aGlzLnNjb3BlLnJlc29sdmUodGhpcy5lbGVtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQSBkaXJlY3QgYmluZGluZyB0byBhIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IEFUVFJfVE9fUFJPUFtiaW5kaW5nLm5hbWVdIHx8IGJpbmRpbmcubmFtZTtcbiAgICAgICAgICBjb25zdCBwcm9wID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhlbElkLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHByb3BlcnR5TmFtZSkpO1xuICAgICAgICAgIGNvbnN0IHN0bXQgPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgd3JhcEZvckRpYWdub3N0aWNzKGV4cHIpKTtcbiAgICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHN0bXQsIGJpbmRpbmcuc291cmNlU3Bhbik7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChzdG10KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEEgYmluZGluZyB0byBhbiBhbmltYXRpb24sIGF0dHJpYnV0ZSwgY2xhc3Mgb3Igc3R5bGUuIEZvciBub3csIG9ubHkgdmFsaWRhdGUgdGhlIHJpZ2h0LVxuICAgICAgICAvLyBoYW5kIHNpZGUgb2YgdGhlIGV4cHJlc3Npb24uXG4gICAgICAgIC8vIFRPRE86IHByb3Blcmx5IGNoZWNrIGNsYXNzIGFuZCBzdHlsZSBiaW5kaW5ncy5cbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChleHByKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBUY2JPcGAgd2hpY2ggZ2VuZXJhdGVzIGNvZGUgdG8gY2hlY2sgZXZlbnQgYmluZGluZ3Mgb24gYW4gZWxlbWVudCB0aGF0IGNvcnJlc3BvbmQgd2l0aCB0aGVcbiAqIG91dHB1dHMgb2YgYSBkaXJlY3RpdmUuXG4gKlxuICogRXhlY3V0aW5nIHRoaXMgb3BlcmF0aW9uIHJldHVybnMgbm90aGluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRjYkRpcmVjdGl2ZU91dHB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgbm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50LFxuICAgICAgcHJpdmF0ZSBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIGdldCBvcHRpb25hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleGVjdXRlKCk6IG51bGwge1xuICAgIGxldCBkaXJJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBjb25zdCBvdXRwdXRzID0gdGhpcy5kaXIub3V0cHV0cztcblxuICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIHRoaXMubm9kZS5vdXRwdXRzKSB7XG4gICAgICBpZiAob3V0cHV0LnR5cGUgIT09IFBhcnNlZEV2ZW50VHlwZS5SZWd1bGFyIHx8ICFvdXRwdXRzLmhhc0JpbmRpbmdQcm9wZXJ0eU5hbWUob3V0cHV0Lm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gVE9ETyhhbHhodWIpOiBjb25zaWRlciBzdXBwb3J0aW5nIG11bHRpcGxlIGZpZWxkcyB3aXRoIHRoZSBzYW1lIHByb3BlcnR5IG5hbWUgZm9yIG91dHB1dHMuXG4gICAgICBjb25zdCBmaWVsZCA9IG91dHB1dHMuZ2V0QnlCaW5kaW5nUHJvcGVydHlOYW1lKG91dHB1dC5uYW1lKSFbMF0uY2xhc3NQcm9wZXJ0eU5hbWU7XG5cbiAgICAgIGlmIChkaXJJZCA9PT0gbnVsbCkge1xuICAgICAgICBkaXJJZCA9IHRoaXMuc2NvcGUucmVzb2x2ZSh0aGlzLm5vZGUsIHRoaXMuZGlyKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG91dHB1dEZpZWxkID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhkaXJJZCwgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChmaWVsZCkpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhvdXRwdXRGaWVsZCwgb3V0cHV0LmtleVNwYW4pO1xuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMpIHtcbiAgICAgICAgLy8gRm9yIHN0cmljdCBjaGVja2luZyBvZiBkaXJlY3RpdmUgZXZlbnRzLCBnZW5lcmF0ZSBhIGNhbGwgdG8gdGhlIGBzdWJzY3JpYmVgIG1ldGhvZFxuICAgICAgICAvLyBvbiB0aGUgZGlyZWN0aXZlJ3Mgb3V0cHV0IGZpZWxkIHRvIGxldCB0eXBlIGluZm9ybWF0aW9uIGZsb3cgaW50byB0aGUgaGFuZGxlciBmdW5jdGlvbidzXG4gICAgICAgIC8vIGAkZXZlbnRgIHBhcmFtZXRlci5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG4gICAgICAgIGNvbnN0IHN1YnNjcmliZUZuID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3Mob3V0cHV0RmllbGQsICdzdWJzY3JpYmUnKTtcbiAgICAgICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwoc3Vic2NyaWJlRm4sIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLCBbaGFuZGxlcl0pO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKGNhbGwsIG91dHB1dC5zb3VyY2VTcGFuKTtcbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChjYWxsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBzdHJpY3QgY2hlY2tpbmcgb2YgZGlyZWN0aXZlIGV2ZW50cyBpcyBkaXNhYmxlZDpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gKiBXZSBzdGlsbCBnZW5lcmF0ZSB0aGUgYWNjZXNzIHRvIHRoZSBvdXRwdXQgZmllbGQgYXMgYSBzdGF0ZW1lbnQgaW4gdGhlIFRDQiBzbyBjb25zdW1lcnNcbiAgICAgICAgLy8gICBvZiB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIGNhbiBzdGlsbCBmaW5kIHRoZSBub2RlIGZvciB0aGUgY2xhc3MgbWVtYmVyIGZvciB0aGVcbiAgICAgICAgLy8gICBvdXRwdXQuXG4gICAgICAgIC8vICogRW1pdCBhIGhhbmRsZXIgZnVuY3Rpb24gd2hlcmUgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciBoYXMgYW4gZXhwbGljaXQgYGFueWAgdHlwZS5cbiAgICAgICAgdGhpcy5zY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChvdXRwdXRGaWVsZCkpO1xuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuXG4gICAgICBFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yLnZpc2l0KFxuICAgICAgICAgIG91dHB1dC5oYW5kbGVyLCB0aGlzLnRjYi5pZCwgdGhpcy50Y2IuYm91bmRUYXJnZXQsIHRoaXMudGNiLm9vYlJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgY29kZSB0byBjaGVjayBcInVuY2xhaW1lZCBvdXRwdXRzXCIgLSBldmVudCBiaW5kaW5ncyBvbiBhbiBlbGVtZW50IHdoaWNoXG4gKiB3ZXJlIG5vdCBhdHRyaWJ1dGVkIHRvIGFueSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LCBhbmQgYXJlIGluc3RlYWQgcHJvY2Vzc2VkIGFnYWluc3QgdGhlIEhUTUxcbiAqIGVsZW1lbnQgaXRzZWxmLlxuICpcbiAqIEV4ZWN1dGluZyB0aGlzIG9wZXJhdGlvbiByZXR1cm5zIG5vdGhpbmcuXG4gKi9cbmNsYXNzIFRjYlVuY2xhaW1lZE91dHB1dHNPcCBleHRlbmRzIFRjYk9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBzY29wZTogU2NvcGUsIHByaXZhdGUgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsXG4gICAgICBwcml2YXRlIGNsYWltZWRPdXRwdXRzOiBTZXQ8c3RyaW5nPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBnZXQgb3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBsZXQgZWxJZDogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhpcyBjb3VsZCBiZSBtb3JlIGVmZmljaWVudC5cbiAgICBmb3IgKGNvbnN0IG91dHB1dCBvZiB0aGlzLmVsZW1lbnQub3V0cHV0cykge1xuICAgICAgaWYgKHRoaXMuY2xhaW1lZE91dHB1dHMuaGFzKG91dHB1dC5uYW1lKSkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgZXZlbnQgaGFuZGxlciBhcyBpdCB3YXMgY2xhaW1lZCBieSBhIGRpcmVjdGl2ZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChvdXRwdXQudHlwZSA9PT0gUGFyc2VkRXZlbnRUeXBlLkFuaW1hdGlvbikge1xuICAgICAgICAvLyBBbmltYXRpb24gb3V0cHV0IGJpbmRpbmdzIGFsd2F5cyBoYXZlIGFuIGAkZXZlbnRgIHBhcmFtZXRlciBvZiB0eXBlIGBBbmltYXRpb25FdmVudGAuXG4gICAgICAgIGNvbnN0IGV2ZW50VHlwZSA9IHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHMgP1xuICAgICAgICAgICAgdGhpcy50Y2IuZW52LnJlZmVyZW5jZUV4dGVybmFsVHlwZSgnQGFuZ3VsYXIvYW5pbWF0aW9ucycsICdBbmltYXRpb25FdmVudCcpIDpcbiAgICAgICAgICAgIEV2ZW50UGFyYW1UeXBlLkFueTtcblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIGV2ZW50VHlwZSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzKSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gZXZlbnRzIGlzIGVuYWJsZWQsIGdlbmVyYXRlIGEgY2FsbCB0byBgYWRkRXZlbnRMaXN0ZW5lcmAgb25cbiAgICAgICAgLy8gdGhlIGVsZW1lbnQgaW5zdGFuY2Ugc28gdGhhdCBUeXBlU2NyaXB0J3MgdHlwZSBpbmZlcmVuY2UgZm9yXG4gICAgICAgIC8vIGBIVE1MRWxlbWVudC5hZGRFdmVudExpc3RlbmVyYCB1c2luZyBgSFRNTEVsZW1lbnRFdmVudE1hcGAgdG8gaW5mZXIgYW4gYWNjdXJhdGUgdHlwZSBmb3JcbiAgICAgICAgLy8gYCRldmVudGAgZGVwZW5kaW5nIG9uIHRoZSBldmVudCBuYW1lLiBGb3IgdW5rbm93biBldmVudCBuYW1lcywgVHlwZVNjcmlwdCByZXNvcnRzIHRvIHRoZVxuICAgICAgICAvLyBiYXNlIGBFdmVudGAgdHlwZS5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRjYkNyZWF0ZUV2ZW50SGFuZGxlcihvdXRwdXQsIHRoaXMudGNiLCB0aGlzLnNjb3BlLCBFdmVudFBhcmFtVHlwZS5JbmZlcik7XG5cbiAgICAgICAgaWYgKGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgICBlbElkID0gdGhpcy5zY29wZS5yZXNvbHZlKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJvcGVydHlBY2Nlc3MgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhlbElkLCAnYWRkRXZlbnRMaXN0ZW5lcicpO1xuICAgICAgICBhZGRQYXJzZVNwYW5JbmZvKHByb3BlcnR5QWNjZXNzLCBvdXRwdXQua2V5U3Bhbik7XG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgLyogZXhwcmVzc2lvbiAqLyBwcm9wZXJ0eUFjY2VzcyxcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogYXJndW1lbnRzICovW3RzLmNyZWF0ZVN0cmluZ0xpdGVyYWwob3V0cHV0Lm5hbWUpLCBoYW5kbGVyXSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8oY2FsbCwgb3V0cHV0LnNvdXJjZVNwYW4pO1xuICAgICAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGNhbGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHN0cmljdCBjaGVja2luZyBvZiBET00gaW5wdXRzIGlzIGRpc2FibGVkLCBlbWl0IGEgaGFuZGxlciBmdW5jdGlvbiB3aGVyZSB0aGUgYCRldmVudGBcbiAgICAgICAgLy8gcGFyYW1ldGVyIGhhcyBhbiBleHBsaWNpdCBgYW55YCB0eXBlLlxuICAgICAgICBjb25zdCBoYW5kbGVyID0gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKG91dHB1dCwgdGhpcy50Y2IsIHRoaXMuc2NvcGUsIEV2ZW50UGFyYW1UeXBlLkFueSk7XG4gICAgICAgIHRoaXMuc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoaGFuZGxlcikpO1xuICAgICAgfVxuXG4gICAgICBFeHByZXNzaW9uU2VtYW50aWNWaXNpdG9yLnZpc2l0KFxuICAgICAgICAgIG91dHB1dC5oYW5kbGVyLCB0aGlzLnRjYi5pZCwgdGhpcy50Y2IuYm91bmRUYXJnZXQsIHRoaXMudGNiLm9vYlJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFRjYk9wYCB3aGljaCBnZW5lcmF0ZXMgYSBjb21wbGV0aW9uIHBvaW50IGZvciB0aGUgY29tcG9uZW50IGNvbnRleHQuXG4gKlxuICogVGhpcyBjb21wbGV0aW9uIHBvaW50IGxvb2tzIGxpa2UgYGN0eC4gO2AgaW4gdGhlIFRDQiBvdXRwdXQsIGFuZCBkb2VzIG5vdCBwcm9kdWNlIGRpYWdub3N0aWNzLlxuICogVHlwZVNjcmlwdCBhdXRvY29tcGxldGlvbiBBUElzIGNhbiBiZSB1c2VkIGF0IHRoaXMgY29tcGxldGlvbiBwb2ludCAoYWZ0ZXIgdGhlICcuJykgdG8gcHJvZHVjZVxuICogYXV0b2NvbXBsZXRpb24gcmVzdWx0cyBvZiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzIGZyb20gdGhlIHRlbXBsYXRlJ3MgY29tcG9uZW50IGNvbnRleHQuXG4gKi9cbmNsYXNzIFRjYkNvbXBvbmVudENvbnRleHRDb21wbGV0aW9uT3AgZXh0ZW5kcyBUY2JPcCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2NvcGU6IFNjb3BlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHJlYWRvbmx5IG9wdGlvbmFsID0gZmFsc2U7XG5cbiAgZXhlY3V0ZSgpOiBudWxsIHtcbiAgICBjb25zdCBjdHggPSB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgICBjb25zdCBjdHhEb3QgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhjdHgsICcnKTtcbiAgICBtYXJrSWdub3JlRGlhZ25vc3RpY3MoY3R4RG90KTtcbiAgICBhZGRFeHByZXNzaW9uSWRlbnRpZmllcihjdHhEb3QsIEV4cHJlc3Npb25JZGVudGlmaWVyLkNPTVBPTkVOVF9DT01QTEVUSU9OKTtcbiAgICB0aGlzLnNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KGN0eERvdCkpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogVmFsdWUgdXNlZCB0byBicmVhayBhIGNpcmN1bGFyIHJlZmVyZW5jZSBiZXR3ZWVuIGBUY2JPcGBzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgcmV0dXJuZWQgd2hlbmV2ZXIgYFRjYk9wYHMgaGF2ZSBhIGNpcmN1bGFyIGRlcGVuZGVuY3kuIFRoZSBleHByZXNzaW9uIGlzIGEgbm9uLW51bGxcbiAqIGFzc2VydGlvbiBvZiB0aGUgbnVsbCB2YWx1ZSAoaW4gVHlwZVNjcmlwdCwgdGhlIGV4cHJlc3Npb24gYG51bGwhYCkuIFRoaXMgY29uc3RydWN0aW9uIHdpbGwgaW5mZXJcbiAqIHRoZSBsZWFzdCBuYXJyb3cgdHlwZSBmb3Igd2hhdGV2ZXIgaXQncyBhc3NpZ25lZCB0by5cbiAqL1xuY29uc3QgSU5GRVJfVFlQRV9GT1JfQ0lSQ1VMQVJfT1BfRVhQUiA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSk7XG5cbi8qKlxuICogT3ZlcmFsbCBnZW5lcmF0aW9uIGNvbnRleHQgZm9yIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICpcbiAqIGBDb250ZXh0YCBoYW5kbGVzIG9wZXJhdGlvbnMgZHVyaW5nIGNvZGUgZ2VuZXJhdGlvbiB3aGljaCBhcmUgZ2xvYmFsIHdpdGggcmVzcGVjdCB0byB0aGUgd2hvbGVcbiAqIGJsb2NrLiBJdCdzIHJlc3BvbnNpYmxlIGZvciB2YXJpYWJsZSBuYW1lIGFsbG9jYXRpb24gYW5kIG1hbmFnZW1lbnQgb2YgYW55IGltcG9ydHMgbmVlZGVkLiBJdFxuICogYWxzbyBjb250YWlucyB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaXRzZWxmLlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIHByaXZhdGUgbmV4dElkID0gMTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudjogRW52aXJvbm1lbnQsIHJlYWRvbmx5IGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgICByZWFkb25seSBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCByZWFkb25seSBpZDogVGVtcGxhdGVJZCxcbiAgICAgIHJlYWRvbmx5IGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwcml2YXRlIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgcmVhZG9ubHkgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSkge31cblxuICAvKipcbiAgICogQWxsb2NhdGUgYSBuZXcgdmFyaWFibGUgbmFtZSBmb3IgdXNlIHdpdGhpbiB0aGUgYENvbnRleHRgLlxuICAgKlxuICAgKiBDdXJyZW50bHkgdGhpcyB1c2VzIGEgbW9ub3RvbmljYWxseSBpbmNyZWFzaW5nIGNvdW50ZXIsIGJ1dCBpbiB0aGUgZnV0dXJlIHRoZSB2YXJpYWJsZSBuYW1lXG4gICAqIG1pZ2h0IGNoYW5nZSBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgZGF0YSBiZWluZyBzdG9yZWQuXG4gICAqL1xuICBhbGxvY2F0ZUlkKCk6IHRzLklkZW50aWZpZXIge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdCR7dGhpcy5uZXh0SWQrK31gKTtcbiAgfVxuXG4gIGdldFBpcGVCeU5hbWUobmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+fG51bGwge1xuICAgIGlmICghdGhpcy5waXBlcy5oYXMobmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5waXBlcy5nZXQobmFtZSkhO1xuICB9XG59XG5cbi8qKlxuICogTG9jYWwgc2NvcGUgd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrIGZvciBhIHBhcnRpY3VsYXIgdGVtcGxhdGUuXG4gKlxuICogVGhlIHRvcC1sZXZlbCB0ZW1wbGF0ZSBhbmQgZWFjaCBuZXN0ZWQgYDxuZy10ZW1wbGF0ZT5gIGhhdmUgdGhlaXIgb3duIGBTY29wZWAsIHdoaWNoIGV4aXN0IGluIGFcbiAqIGhpZXJhcmNoeS4gVGhlIHN0cnVjdHVyZSBvZiB0aGlzIGhpZXJhcmNoeSBtaXJyb3JzIHRoZSBzeW50YWN0aWMgc2NvcGVzIGluIHRoZSBnZW5lcmF0ZWQgdHlwZVxuICogY2hlY2sgYmxvY2ssIHdoZXJlIGVhY2ggbmVzdGVkIHRlbXBsYXRlIGlzIGVuY2FzZWQgaW4gYW4gYGlmYCBzdHJ1Y3R1cmUuXG4gKlxuICogQXMgYSB0ZW1wbGF0ZSdzIGBUY2JPcGBzIGFyZSBleGVjdXRlZCBpbiBhIGdpdmVuIGBTY29wZWAsIHN0YXRlbWVudHMgYXJlIGFkZGVkIHZpYVxuICogYGFkZFN0YXRlbWVudCgpYC4gV2hlbiB0aGlzIHByb2Nlc3NpbmcgaXMgY29tcGxldGUsIHRoZSBgU2NvcGVgIGNhbiBiZSB0dXJuZWQgaW50byBhIGB0cy5CbG9ja2BcbiAqIHZpYSBgcmVuZGVyVG9CbG9jaygpYC5cbiAqXG4gKiBJZiBhIGBUY2JPcGAgcmVxdWlyZXMgdGhlIG91dHB1dCBvZiBhbm90aGVyLCBpdCBjYW4gY2FsbCBgcmVzb2x2ZSgpYC5cbiAqL1xuY2xhc3MgU2NvcGUge1xuICAvKipcbiAgICogQSBxdWV1ZSBvZiBvcGVyYXRpb25zIHdoaWNoIG5lZWQgdG8gYmUgcGVyZm9ybWVkIHRvIGdlbmVyYXRlIHRoZSBUQ0IgY29kZSBmb3IgdGhpcyBzY29wZS5cbiAgICpcbiAgICogVGhpcyBhcnJheSBjYW4gY29udGFpbiBlaXRoZXIgYSBgVGNiT3BgIHdoaWNoIGhhcyB5ZXQgdG8gYmUgZXhlY3V0ZWQsIG9yIGEgYHRzLkV4cHJlc3Npb258bnVsbGBcbiAgICogcmVwcmVzZW50aW5nIHRoZSBtZW1vaXplZCByZXN1bHQgb2YgZXhlY3V0aW5nIHRoZSBvcGVyYXRpb24uIEFzIG9wZXJhdGlvbnMgYXJlIGV4ZWN1dGVkLCB0aGVpclxuICAgKiByZXN1bHRzIGFyZSB3cml0dGVuIGludG8gdGhlIGBvcFF1ZXVlYCwgb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIG9wZXJhdGlvbi5cbiAgICpcbiAgICogSWYgYW4gb3BlcmF0aW9uIGlzIGluIHRoZSBwcm9jZXNzIG9mIGJlaW5nIGV4ZWN1dGVkLCBpdCBpcyB0ZW1wb3JhcmlseSBvdmVyd3JpdHRlbiBoZXJlIHdpdGhcbiAgICogYElORkVSX1RZUEVfRk9SX0NJUkNVTEFSX09QX0VYUFJgLiBUaGlzIHdheSwgaWYgYSBjeWNsZSBpcyBlbmNvdW50ZXJlZCB3aGVyZSBhbiBvcGVyYXRpb25cbiAgICogZGVwZW5kcyB0cmFuc2l0aXZlbHkgb24gaXRzIG93biByZXN1bHQsIHRoZSBpbm5lciBvcGVyYXRpb24gd2lsbCBpbmZlciB0aGUgbGVhc3QgbmFycm93IHR5cGVcbiAgICogdGhhdCBmaXRzIGluc3RlYWQuIFRoaXMgaGFzIHRoZSBzYW1lIHNlbWFudGljcyBhcyBUeXBlU2NyaXB0IGl0c2VsZiB3aGVuIHR5cGVzIGFyZSByZWZlcmVuY2VkXG4gICAqIGNpcmN1bGFybHkuXG4gICAqL1xuICBwcml2YXRlIG9wUXVldWU6IChUY2JPcHx0cy5FeHByZXNzaW9ufG51bGwpW10gPSBbXTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgYFRtcGxBc3RFbGVtZW50YHMgdG8gdGhlIGluZGV4IG9mIHRoZWlyIGBUY2JFbGVtZW50T3BgIGluIHRoZSBgb3BRdWV1ZWBcbiAgICovXG4gIHByaXZhdGUgZWxlbWVudE9wTWFwID0gbmV3IE1hcDxUbXBsQXN0RWxlbWVudCwgbnVtYmVyPigpO1xuICAvKipcbiAgICogQSBtYXAgb2YgbWFwcyB3aGljaCB0cmFja3MgdGhlIGluZGV4IG9mIGBUY2JEaXJlY3RpdmVDdG9yT3BgcyBpbiB0aGUgYG9wUXVldWVgIGZvciBlYWNoXG4gICAqIGRpcmVjdGl2ZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgZGlyZWN0aXZlT3BNYXAgPVxuICAgICAgbmV3IE1hcDxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPj4oKTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgYFRtcGxBc3RSZWZlcmVuY2VgcyB0byB0aGUgaW5kZXggb2YgdGhlaXIgYFRjYlJlZmVyZW5jZU9wYCBpbiB0aGUgYG9wUXVldWVgXG4gICAqL1xuICBwcml2YXRlIHJlZmVyZW5jZU9wTWFwID0gbmV3IE1hcDxUbXBsQXN0UmVmZXJlbmNlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbW1lZGlhdGVseSBuZXN0ZWQgPG5nLXRlbXBsYXRlPnMgKHdpdGhpbiB0aGlzIGBTY29wZWApIHJlcHJlc2VudGVkIGJ5IGBUbXBsQXN0VGVtcGxhdGVgXG4gICAqIG5vZGVzIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiVGVtcGxhdGVDb250ZXh0T3BgcyBpbiB0aGUgYG9wUXVldWVgLlxuICAgKi9cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUN0eE9wTWFwID0gbmV3IE1hcDxUbXBsQXN0VGVtcGxhdGUsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHZhcmlhYmxlcyBkZWNsYXJlZCBvbiB0aGUgdGVtcGxhdGUgdGhhdCBjcmVhdGVkIHRoaXMgYFNjb3BlYCAocmVwcmVzZW50ZWQgYnlcbiAgICogYFRtcGxBc3RWYXJpYWJsZWAgbm9kZXMpIHRvIHRoZSBpbmRleCBvZiB0aGVpciBgVGNiVmFyaWFibGVPcGBzIGluIHRoZSBgb3BRdWV1ZWAuXG4gICAqL1xuICBwcml2YXRlIHZhck1hcCA9IG5ldyBNYXA8VG1wbEFzdFZhcmlhYmxlLCBudW1iZXI+KCk7XG5cbiAgLyoqXG4gICAqIFN0YXRlbWVudHMgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqXG4gICAqIEV4ZWN1dGluZyB0aGUgYFRjYk9wYHMgaW4gdGhlIGBvcFF1ZXVlYCBwb3B1bGF0ZXMgdGhpcyBhcnJheS5cbiAgICovXG4gIHByaXZhdGUgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgcGFyZW50OiBTY29wZXxudWxsID0gbnVsbCxcbiAgICAgIHByaXZhdGUgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBgU2NvcGVgIGdpdmVuIGVpdGhlciBhIGBUbXBsQXN0VGVtcGxhdGVgIG9yIGEgbGlzdCBvZiBgVG1wbEFzdE5vZGVgcy5cbiAgICpcbiAgICogQHBhcmFtIHRjYiB0aGUgb3ZlcmFsbCBjb250ZXh0IG9mIFRDQiBnZW5lcmF0aW9uLlxuICAgKiBAcGFyYW0gcGFyZW50IHRoZSBgU2NvcGVgIG9mIHRoZSBwYXJlbnQgdGVtcGxhdGUgKGlmIGFueSkgb3IgYG51bGxgIGlmIHRoaXMgaXMgdGhlIHJvb3RcbiAgICogYFNjb3BlYC5cbiAgICogQHBhcmFtIHRlbXBsYXRlT3JOb2RlcyBlaXRoZXIgYSBgVG1wbEFzdFRlbXBsYXRlYCByZXByZXNlbnRpbmcgdGhlIHRlbXBsYXRlIGZvciB3aGljaCB0b1xuICAgKiBjYWxjdWxhdGUgdGhlIGBTY29wZWAsIG9yIGEgbGlzdCBvZiBub2RlcyBpZiBubyBvdXRlciB0ZW1wbGF0ZSBvYmplY3QgaXMgYXZhaWxhYmxlLlxuICAgKiBAcGFyYW0gZ3VhcmQgYW4gZXhwcmVzc2lvbiB0aGF0IGlzIGFwcGxpZWQgdG8gdGhpcyBzY29wZSBmb3IgdHlwZSBuYXJyb3dpbmcgcHVycG9zZXMuXG4gICAqL1xuICBzdGF0aWMgZm9yTm9kZXMoXG4gICAgICB0Y2I6IENvbnRleHQsIHBhcmVudDogU2NvcGV8bnVsbCwgdGVtcGxhdGVPck5vZGVzOiBUbXBsQXN0VGVtcGxhdGV8KFRtcGxBc3ROb2RlW10pLFxuICAgICAgZ3VhcmQ6IHRzLkV4cHJlc3Npb258bnVsbCk6IFNjb3BlIHtcbiAgICBjb25zdCBzY29wZSA9IG5ldyBTY29wZSh0Y2IsIHBhcmVudCwgZ3VhcmQpO1xuXG4gICAgaWYgKHBhcmVudCA9PT0gbnVsbCAmJiB0Y2IuZW52LmNvbmZpZy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyKSB7XG4gICAgICAvLyBBZGQgYW4gYXV0b2NvbXBsZXRpb24gcG9pbnQgZm9yIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgIHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiQ29tcG9uZW50Q29udGV4dENvbXBsZXRpb25PcChzY29wZSkpO1xuICAgIH1cblxuICAgIGxldCBjaGlsZHJlbjogVG1wbEFzdE5vZGVbXTtcblxuICAgIC8vIElmIGdpdmVuIGFuIGFjdHVhbCBgVG1wbEFzdFRlbXBsYXRlYCBpbnN0YW5jZSwgdGhlbiBwcm9jZXNzIGFueSBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGl0XG4gICAgLy8gaGFzLlxuICAgIGlmICh0ZW1wbGF0ZU9yTm9kZXMgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIC8vIFRoZSB0ZW1wbGF0ZSdzIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBuZWVkIHRvIGJlIGFkZGVkIGFzIGBUY2JWYXJpYWJsZU9wYHMuXG4gICAgICBjb25zdCB2YXJNYXAgPSBuZXcgTWFwPHN0cmluZywgVG1wbEFzdFZhcmlhYmxlPigpO1xuXG4gICAgICBmb3IgKGNvbnN0IHYgb2YgdGVtcGxhdGVPck5vZGVzLnZhcmlhYmxlcykge1xuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHZhcmlhYmxlcyBvbiB0aGUgYFRtcGxBc3RUZW1wbGF0ZWAgYXJlIG9ubHkgZGVjbGFyZWQgb25jZS5cbiAgICAgICAgaWYgKCF2YXJNYXAuaGFzKHYubmFtZSkpIHtcbiAgICAgICAgICB2YXJNYXAuc2V0KHYubmFtZSwgdik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZmlyc3REZWNsID0gdmFyTWFwLmdldCh2Lm5hbWUpITtcbiAgICAgICAgICB0Y2Iub29iUmVjb3JkZXIuZHVwbGljYXRlVGVtcGxhdGVWYXIodGNiLmlkLCB2LCBmaXJzdERlY2wpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3BJbmRleCA9IHNjb3BlLm9wUXVldWUucHVzaChuZXcgVGNiVmFyaWFibGVPcCh0Y2IsIHNjb3BlLCB0ZW1wbGF0ZU9yTm9kZXMsIHYpKSAtIDE7XG4gICAgICAgIHNjb3BlLnZhck1hcC5zZXQodiwgb3BJbmRleCk7XG4gICAgICB9XG4gICAgICBjaGlsZHJlbiA9IHRlbXBsYXRlT3JOb2Rlcy5jaGlsZHJlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW4gPSB0ZW1wbGF0ZU9yTm9kZXM7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBjaGlsZHJlbikge1xuICAgICAgc2NvcGUuYXBwZW5kTm9kZShub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgYSBgdHMuRXhwcmVzc2lvbmAgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiBzb21lIG9wZXJhdGlvbiBpbiB0aGUgY3VycmVudCBgU2NvcGVgLFxuICAgKiBpbmNsdWRpbmcgYW55IHBhcmVudCBzY29wZShzKS4gVGhpcyBtZXRob2QgYWx3YXlzIHJldHVybnMgYSBtdXRhYmxlIGNsb25lIG9mIHRoZVxuICAgKiBgdHMuRXhwcmVzc2lvbmAgd2l0aCB0aGUgY29tbWVudHMgY2xlYXJlZC5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBgVG1wbEFzdE5vZGVgIG9mIHRoZSBvcGVyYXRpb24gaW4gcXVlc3Rpb24uIFRoZSBsb29rdXAgcGVyZm9ybWVkIHdpbGwgZGVwZW5kIG9uXG4gICAqIHRoZSB0eXBlIG9mIHRoaXMgbm9kZTpcbiAgICpcbiAgICogQXNzdW1pbmcgYGRpcmVjdGl2ZWAgaXMgbm90IHByZXNlbnQsIHRoZW4gYHJlc29sdmVgIHdpbGwgcmV0dXJuOlxuICAgKlxuICAgKiAqIGBUbXBsQXN0RWxlbWVudGAgLSByZXRyaWV2ZSB0aGUgZXhwcmVzc2lvbiBmb3IgdGhlIGVsZW1lbnQgRE9NIG5vZGVcbiAgICogKiBgVG1wbEFzdFRlbXBsYXRlYCAtIHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHZhcmlhYmxlXG4gICAqICogYFRtcGxBc3RWYXJpYWJsZWAgLSByZXRyaWV2ZSBhIHRlbXBsYXRlIGxldC0gdmFyaWFibGVcbiAgICogKiBgVG1wbEFzdFJlZmVyZW5jZWAgLSByZXRyaWV2ZSB2YXJpYWJsZSBjcmVhdGVkIGZvciB0aGUgbG9jYWwgcmVmXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RpdmUgaWYgcHJlc2VudCwgYSBkaXJlY3RpdmUgdHlwZSBvbiBhIGBUbXBsQXN0RWxlbWVudGAgb3IgYFRtcGxBc3RUZW1wbGF0ZWAgdG9cbiAgICogbG9vayB1cCBpbnN0ZWFkIG9mIHRoZSBkZWZhdWx0IGZvciBhbiBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICByZXNvbHZlKFxuICAgICAgbm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RWYXJpYWJsZXxUbXBsQXN0UmVmZXJlbmNlLFxuICAgICAgZGlyZWN0aXZlPzogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG9wZXJhdGlvbiBsb2NhbGx5LlxuICAgIGNvbnN0IHJlcyA9IHRoaXMucmVzb2x2ZUxvY2FsKG5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgaWYgKHJlcyAhPT0gbnVsbCkge1xuICAgICAgLy8gV2Ugd2FudCB0byBnZXQgYSBjbG9uZSBvZiB0aGUgcmVzb2x2ZWQgZXhwcmVzc2lvbiBhbmQgY2xlYXIgdGhlIHRyYWlsaW5nIGNvbW1lbnRzXG4gICAgICAvLyBzbyB0aGV5IGRvbid0IGNvbnRpbnVlIHRvIGFwcGVhciBpbiBldmVyeSBwbGFjZSB0aGUgZXhwcmVzc2lvbiBpcyB1c2VkLlxuICAgICAgLy8gQXMgYW4gZXhhbXBsZSwgdGhpcyB3b3VsZCBvdGhlcndpc2UgcHJvZHVjZTpcbiAgICAgIC8vIHZhciBfdDEgLyoqVDpESVIqLyAvKjEsMiovID0gX2N0b3IxKCk7XG4gICAgICAvLyBfdDEgLyoqVDpESVIqLyAvKjEsMiovLmlucHV0ID0gJ3ZhbHVlJztcbiAgICAgIC8vXG4gICAgICAvLyBJbiBhZGRpdGlvbiwgcmV0dXJuaW5nIGEgY2xvbmUgcHJldmVudHMgdGhlIGNvbnN1bWVyIG9mIGBTY29wZSNyZXNvbHZlYCBmcm9tXG4gICAgICAvLyBhdHRhY2hpbmcgY29tbWVudHMgYXQgdGhlIGRlY2xhcmF0aW9uIHNpdGUuXG5cbiAgICAgIGNvbnN0IGNsb25lID0gdHMuZ2V0TXV0YWJsZUNsb25lKHJlcyk7XG4gICAgICB0cy5zZXRTeW50aGV0aWNUcmFpbGluZ0NvbW1lbnRzKGNsb25lLCBbXSk7XG4gICAgICByZXR1cm4gY2xvbmU7XG4gICAgfSBlbHNlIGlmICh0aGlzLnBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgLy8gQ2hlY2sgd2l0aCB0aGUgcGFyZW50LlxuICAgICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmUobm9kZSwgZGlyZWN0aXZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSAke25vZGV9IC8gJHtkaXJlY3RpdmV9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHN0YXRlbWVudCB0byB0aGlzIHNjb3BlLlxuICAgKi9cbiAgYWRkU3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc3RhdGVtZW50cy5cbiAgICovXG4gIHJlbmRlcigpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm9wUXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIE9wdGlvbmFsIHN0YXRlbWVudHMgY2Fubm90IGJlIHNraXBwZWQgd2hlbiB3ZSBhcmUgZ2VuZXJhdGluZyB0aGUgVENCIGZvciB1c2VcbiAgICAgIC8vIGJ5IHRoZSBUZW1wbGF0ZVR5cGVDaGVja2VyLlxuICAgICAgY29uc3Qgc2tpcE9wdGlvbmFsID0gIXRoaXMudGNiLmVudi5jb25maWcuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgICAgIHRoaXMuZXhlY3V0ZU9wKGksIHNraXBPcHRpb25hbCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXRlbWVudHM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBleHByZXNzaW9uIG9mIGFsbCB0ZW1wbGF0ZSBndWFyZHMgdGhhdCBhcHBseSB0byB0aGlzIHNjb3BlLCBpbmNsdWRpbmcgdGhvc2Ugb2ZcbiAgICogcGFyZW50IHNjb3Blcy4gSWYgbm8gZ3VhcmRzIGhhdmUgYmVlbiBhcHBsaWVkLCBudWxsIGlzIHJldHVybmVkLlxuICAgKi9cbiAgZ3VhcmRzKCk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgbGV0IHBhcmVudEd1YXJkczogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5wYXJlbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIFN0YXJ0IHdpdGggdGhlIGd1YXJkcyBmcm9tIHRoZSBwYXJlbnQgc2NvcGUsIGlmIHByZXNlbnQuXG4gICAgICBwYXJlbnRHdWFyZHMgPSB0aGlzLnBhcmVudC5ndWFyZHMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ndWFyZCA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhpcyBzY29wZSBkb2VzIG5vdCBoYXZlIGEgZ3VhcmQsIHNvIHJldHVybiB0aGUgcGFyZW50J3MgZ3VhcmRzIGFzIGlzLlxuICAgICAgcmV0dXJuIHBhcmVudEd1YXJkcztcbiAgICB9IGVsc2UgaWYgKHBhcmVudEd1YXJkcyA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUncyBubyBndWFyZHMgZnJvbSB0aGUgcGFyZW50IHNjb3BlLCBzbyB0aGlzIHNjb3BlJ3MgZ3VhcmQgcmVwcmVzZW50cyBhbGwgYXZhaWxhYmxlXG4gICAgICAvLyBndWFyZHMuXG4gICAgICByZXR1cm4gdGhpcy5ndWFyZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQm90aCB0aGUgcGFyZW50IHNjb3BlIGFuZCB0aGlzIHNjb3BlIHByb3ZpZGUgYSBndWFyZCwgc28gY3JlYXRlIGEgY29tYmluYXRpb24gb2YgdGhlIHR3by5cbiAgICAgIC8vIEl0IGlzIGltcG9ydGFudCB0aGF0IHRoZSBwYXJlbnQgZ3VhcmQgaXMgdXNlZCBhcyBsZWZ0IG9wZXJhbmQsIGdpdmVuIHRoYXQgaXQgbWF5IHByb3ZpZGVcbiAgICAgIC8vIG5hcnJvd2luZyB0aGF0IGlzIHJlcXVpcmVkIGZvciB0aGlzIHNjb3BlJ3MgZ3VhcmQgdG8gYmUgdmFsaWQuXG4gICAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KHBhcmVudEd1YXJkcywgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgdGhpcy5ndWFyZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTG9jYWwoXG4gICAgICByZWY6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0VmFyaWFibGV8VG1wbEFzdFJlZmVyZW5jZSxcbiAgICAgIGRpcmVjdGl2ZT86IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAocmVmIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSAmJiB0aGlzLnJlZmVyZW5jZU9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy5yZWZlcmVuY2VPcE1hcC5nZXQocmVmKSEpO1xuICAgIH0gZWxzZSBpZiAocmVmIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlICYmIHRoaXMudmFyTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYFRjYlZhcmlhYmxlT3BgIGFzc29jaWF0ZWQgd2l0aCB0aGUgYFRtcGxBc3RWYXJpYWJsZWAuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy52YXJNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICByZWYgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgJiYgZGlyZWN0aXZlID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgdGhpcy50ZW1wbGF0ZUN0eE9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgdGhlIGNvbnRleHQgb2YgdGhlIGdpdmVuIHN1Yi10ZW1wbGF0ZS5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGBUY2JUZW1wbGF0ZUNvbnRleHRPcGAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVPcCh0aGlzLnRlbXBsYXRlQ3R4T3BNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAocmVmIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgcmVmIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSAmJlxuICAgICAgICBkaXJlY3RpdmUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmRpcmVjdGl2ZU9wTWFwLmhhcyhyZWYpKSB7XG4gICAgICAvLyBSZXNvbHZpbmcgYSBkaXJlY3RpdmUgb24gYW4gZWxlbWVudCBvciBzdWItdGVtcGxhdGUuXG4gICAgICBjb25zdCBkaXJNYXAgPSB0aGlzLmRpcmVjdGl2ZU9wTWFwLmdldChyZWYpITtcbiAgICAgIGlmIChkaXJNYXAuaGFzKGRpcmVjdGl2ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZU9wKGRpck1hcC5nZXQoZGlyZWN0aXZlKSEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWYgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCAmJiB0aGlzLmVsZW1lbnRPcE1hcC5oYXMocmVmKSkge1xuICAgICAgLy8gUmVzb2x2aW5nIHRoZSBET00gbm9kZSBvZiBhbiBlbGVtZW50IGluIHRoaXMgdGVtcGxhdGUuXG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlT3AodGhpcy5lbGVtZW50T3BNYXAuZ2V0KHJlZikhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExpa2UgYGV4ZWN1dGVPcGAsIGJ1dCBhc3NlcnQgdGhhdCB0aGUgb3BlcmF0aW9uIGFjdHVhbGx5IHJldHVybmVkIGB0cy5FeHByZXNzaW9uYC5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZU9wKG9wSW5kZXg6IG51bWJlcik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlcyA9IHRoaXMuZXhlY3V0ZU9wKG9wSW5kZXgsIC8qIHNraXBPcHRpb25hbCAqLyBmYWxzZSk7XG4gICAgaWYgKHJlcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvciByZXNvbHZpbmcgb3BlcmF0aW9uLCBnb3QgbnVsbGApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYSBwYXJ0aWN1bGFyIGBUY2JPcGAgaW4gdGhlIGBvcFF1ZXVlYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgcmVwbGFjZXMgdGhlIG9wZXJhdGlvbiBpbiB0aGUgYG9wUXVldWVgIHdpdGggdGhlIHJlc3VsdCBvZiBleGVjdXRpb24gKG9uY2UgZG9uZSlcbiAgICogYW5kIGFsc28gcHJvdGVjdHMgYWdhaW5zdCBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgZnJvbSB0aGUgb3BlcmF0aW9uIHRvIGl0c2VsZiBieSB0ZW1wb3JhcmlseVxuICAgKiBzZXR0aW5nIHRoZSBvcGVyYXRpb24ncyByZXN1bHQgdG8gYSBzcGVjaWFsIGV4cHJlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIGV4ZWN1dGVPcChvcEluZGV4OiBudW1iZXIsIHNraXBPcHRpb25hbDogYm9vbGVhbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3Qgb3AgPSB0aGlzLm9wUXVldWVbb3BJbmRleF07XG4gICAgaWYgKCEob3AgaW5zdGFuY2VvZiBUY2JPcCkpIHtcbiAgICAgIHJldHVybiBvcDtcbiAgICB9XG5cbiAgICBpZiAoc2tpcE9wdGlvbmFsICYmIG9wLm9wdGlvbmFsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uIGluIHRoZSBxdWV1ZSB0byBpdHMgY2lyY3VsYXIgZmFsbGJhY2suIElmIGV4ZWN1dGluZyB0aGlzXG4gICAgLy8gb3BlcmF0aW9uIHJlc3VsdHMgaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5LCB0aGlzIHdpbGwgcHJldmVudCBhbiBpbmZpbml0ZSBsb29wIGFuZCBhbGxvdyBmb3JcbiAgICAvLyB0aGUgcmVzb2x1dGlvbiBvZiBzdWNoIGN5Y2xlcy5cbiAgICB0aGlzLm9wUXVldWVbb3BJbmRleF0gPSBvcC5jaXJjdWxhckZhbGxiYWNrKCk7XG4gICAgY29uc3QgcmVzID0gb3AuZXhlY3V0ZSgpO1xuICAgIC8vIE9uY2UgdGhlIG9wZXJhdGlvbiBoYXMgZmluaXNoZWQgZXhlY3V0aW5nLCBpdCdzIHNhZmUgdG8gY2FjaGUgdGhlIHJlYWwgcmVzdWx0LlxuICAgIHRoaXMub3BRdWV1ZVtvcEluZGV4XSA9IHJlcztcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmROb2RlKG5vZGU6IFRtcGxBc3ROb2RlKTogdm9pZCB7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgY29uc3Qgb3BJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JFbGVtZW50T3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKSAtIDE7XG4gICAgICB0aGlzLmVsZW1lbnRPcE1hcC5zZXQobm9kZSwgb3BJbmRleCk7XG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgdGhpcy5hcHBlbmROb2RlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tBbmRBcHBlbmRSZWZlcmVuY2VzT2ZOb2RlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgLy8gVGVtcGxhdGUgY2hpbGRyZW4gYXJlIHJlbmRlcmVkIGluIGEgY2hpbGQgc2NvcGUuXG4gICAgICB0aGlzLmFwcGVuZERpcmVjdGl2ZXNBbmRJbnB1dHNPZk5vZGUobm9kZSk7XG4gICAgICB0aGlzLmFwcGVuZE91dHB1dHNPZk5vZGUobm9kZSk7XG4gICAgICBjb25zdCBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZW1wbGF0ZUNvbnRleHRPcCh0aGlzLnRjYiwgdGhpcykpIC0gMTtcbiAgICAgIHRoaXMudGVtcGxhdGVDdHhPcE1hcC5zZXQobm9kZSwgY3R4SW5kZXgpO1xuICAgICAgaWYgKHRoaXMudGNiLmVudi5jb25maWcuY2hlY2tUZW1wbGF0ZUJvZGllcykge1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVGVtcGxhdGVCb2R5T3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy50Y2IuZW52LmNvbmZpZy5hbHdheXNDaGVja1NjaGVtYUluVGVtcGxhdGVCb2RpZXMpIHtcbiAgICAgICAgdGhpcy5hcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja0FuZEFwcGVuZFJlZmVyZW5jZXNPZk5vZGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlRleHRJbnRlcnBvbGF0aW9uT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUpKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0SWN1KSB7XG4gICAgICB0aGlzLmFwcGVuZEljdUV4cHJlc3Npb25zKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tBbmRBcHBlbmRSZWZlcmVuY2VzT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcmVmIG9mIG5vZGUucmVmZXJlbmNlcykge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0UmVmZXJlbmNlVGFyZ2V0KHJlZik7XG5cbiAgICAgIGxldCBjdHhJbmRleDogbnVtYmVyO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgcmVmZXJlbmNlIGlzIGludmFsaWQgaWYgaXQgZG9lc24ndCBoYXZlIGEgdGFyZ2V0LCBzbyByZXBvcnQgaXQgYXMgYW4gZXJyb3IuXG4gICAgICAgIHRoaXMudGNiLm9vYlJlY29yZGVyLm1pc3NpbmdSZWZlcmVuY2VUYXJnZXQodGhpcy50Y2IuaWQsIHJlZik7XG5cbiAgICAgICAgLy8gQW55IHVzYWdlcyBvZiB0aGUgaW52YWxpZCByZWZlcmVuY2Ugd2lsbCBiZSByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9mIHR5cGUgYW55LlxuICAgICAgICBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JJbnZhbGlkUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMpKSAtIDE7XG4gICAgICB9IGVsc2UgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBjdHhJbmRleCA9IHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JSZWZlcmVuY2VPcCh0aGlzLnRjYiwgdGhpcywgcmVmLCBub2RlLCB0YXJnZXQpKSAtIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHhJbmRleCA9XG4gICAgICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiUmVmZXJlbmNlT3AodGhpcy50Y2IsIHRoaXMsIHJlZiwgbm9kZSwgdGFyZ2V0LmRpcmVjdGl2ZSkpIC0gMTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVmZXJlbmNlT3BNYXAuc2V0KHJlZiwgY3R4SW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kRGlyZWN0aXZlc0FuZElucHV0c09mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiB2b2lkIHtcbiAgICAvLyBDb2xsZWN0IGFsbCB0aGUgaW5wdXRzIG9uIHRoZSBlbGVtZW50LlxuICAgIGNvbnN0IGNsYWltZWRJbnB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIGlucHV0cyBhcmUgdW5jbGFpbWVkIGlucHV0cywgc28gcXVldWUgYW4gb3BlcmF0aW9uXG4gICAgICAvLyB0byBhZGQgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRJbnB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZElucHV0cykpO1xuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChcbiAgICAgICAgICAgIG5ldyBUY2JEb21TY2hlbWFDaGVja2VyT3AodGhpcy50Y2IsIG5vZGUsIC8qIGNoZWNrRWxlbWVudCAqLyB0cnVlLCBjbGFpbWVkSW5wdXRzKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGlyTWFwID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgbnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgIGxldCBkaXJlY3RpdmVPcDogVGNiT3A7XG4gICAgICBjb25zdCBob3N0ID0gdGhpcy50Y2IuZW52LnJlZmxlY3RvcjtcbiAgICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuXG4gICAgICBpZiAoIWRpci5pc0dlbmVyaWMpIHtcbiAgICAgICAgLy8gVGhlIG1vc3QgY29tbW9uIGNhc2UgaXMgdGhhdCB3aGVuIGEgZGlyZWN0aXZlIGlzIG5vdCBnZW5lcmljLCB3ZSB1c2UgdGhlIG5vcm1hbFxuICAgICAgICAvLyBgVGNiTm9uRGlyZWN0aXZlVHlwZU9wYC5cbiAgICAgICAgZGlyZWN0aXZlT3AgPSBuZXcgVGNiTm9uR2VuZXJpY0RpcmVjdGl2ZVR5cGVPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgIXJlcXVpcmVzSW5saW5lVHlwZUN0b3IoZGlyUmVmLm5vZGUsIGhvc3QpIHx8XG4gICAgICAgICAgdGhpcy50Y2IuZW52LmNvbmZpZy51c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzKSB7XG4gICAgICAgIC8vIEZvciBnZW5lcmljIGRpcmVjdGl2ZXMsIHdlIHVzZSBhIHR5cGUgY29uc3RydWN0b3IgdG8gaW5mZXIgdHlwZXMuIElmIGEgZGlyZWN0aXZlIHJlcXVpcmVzXG4gICAgICAgIC8vIGFuIGlubGluZSB0eXBlIGNvbnN0cnVjdG9yLCB0aGVuIGlubGluaW5nIG11c3QgYmUgYXZhaWxhYmxlIHRvIHVzZSB0aGVcbiAgICAgICAgLy8gYFRjYkRpcmVjdGl2ZUN0b3JPcGAuIElmIG5vdCB3ZSwgd2UgZmFsbGJhY2sgdG8gdXNpbmcgYGFueWAg4oCTIHNlZSBiZWxvdy5cbiAgICAgICAgZGlyZWN0aXZlT3AgPSBuZXcgVGNiRGlyZWN0aXZlQ3Rvck9wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBkaXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgaW5saW5pbmcgaXMgbm90IGF2YWlsYWJsZSwgdGhlbiB3ZSBnaXZlIHVwIG9uIGluZmVyaW5nIHRoZSBnZW5lcmljIHBhcmFtcywgYW5kIHVzZVxuICAgICAgICAvLyBgYW55YCB0eXBlIGZvciB0aGUgZGlyZWN0aXZlJ3MgZ2VuZXJpYyBwYXJhbWV0ZXJzLlxuICAgICAgICBkaXJlY3RpdmVPcCA9IG5ldyBUY2JHZW5lcmljRGlyZWN0aXZlVHlwZVdpdGhBbnlQYXJhbXNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGlySW5kZXggPSB0aGlzLm9wUXVldWUucHVzaChkaXJlY3RpdmVPcCkgLSAxO1xuICAgICAgZGlyTWFwLnNldChkaXIsIGRpckluZGV4KTtcblxuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRpcmVjdGl2ZUlucHV0c09wKHRoaXMudGNiLCB0aGlzLCBub2RlLCBkaXIpKTtcbiAgICB9XG4gICAgdGhpcy5kaXJlY3RpdmVPcE1hcC5zZXQobm9kZSwgZGlyTWFwKTtcblxuICAgIC8vIEFmdGVyIGV4cGFuZGluZyB0aGUgZGlyZWN0aXZlcywgd2UgbWlnaHQgbmVlZCB0byBxdWV1ZSBhbiBvcGVyYXRpb24gdG8gY2hlY2sgYW55IHVuY2xhaW1lZFxuICAgIC8vIGlucHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZW1vdmUgYW55IGlucHV0cyB0aGF0IGl0IGNsYWltcyBmcm9tIGBlbGVtZW50SW5wdXRzYC5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wZXJ0eU5hbWUgb2YgZGlyLmlucHV0cy5wcm9wZXJ0eU5hbWVzKSB7XG4gICAgICAgICAgY2xhaW1lZElucHV0cy5hZGQocHJvcGVydHlOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiVW5jbGFpbWVkSW5wdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRJbnB1dHMpKTtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBkaXJlY3RpdmVzIHdoaWNoIG1hdGNoIHRoaXMgZWxlbWVudCwgdGhlbiBpdCdzIGEgXCJwbGFpblwiIERPTSBlbGVtZW50IChvciBhXG4gICAgICAvLyB3ZWIgY29tcG9uZW50KSwgYW5kIHNob3VsZCBiZSBjaGVja2VkIGFnYWluc3QgdGhlIERPTSBzY2hlbWEuIElmIGFueSBkaXJlY3RpdmVzIG1hdGNoLFxuICAgICAgLy8gd2UgbXVzdCBhc3N1bWUgdGhhdCB0aGUgZWxlbWVudCBjb3VsZCBiZSBjdXN0b20gKGVpdGhlciBhIGNvbXBvbmVudCwgb3IgYSBkaXJlY3RpdmUgbGlrZVxuICAgICAgLy8gPHJvdXRlci1vdXRsZXQ+KSBhbmQgc2hvdWxkbid0IHZhbGlkYXRlIHRoZSBlbGVtZW50IG5hbWUgaXRzZWxmLlxuICAgICAgY29uc3QgY2hlY2tFbGVtZW50ID0gZGlyZWN0aXZlcy5sZW5ndGggPT09IDA7XG4gICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCBjaGVja0VsZW1lbnQsIGNsYWltZWRJbnB1dHMpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZE91dHB1dHNPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogdm9pZCB7XG4gICAgLy8gQ29sbGVjdCBhbGwgdGhlIG91dHB1dHMgb24gdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgY2xhaW1lZE91dHB1dHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCB8fCBkaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGRpcmVjdGl2ZXMsIHRoZW4gYWxsIG91dHB1dHMgYXJlIHVuY2xhaW1lZCBvdXRwdXRzLCBzbyBxdWV1ZSBhbiBvcGVyYXRpb25cbiAgICAgIC8vIHRvIGFkZCB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYlVuY2xhaW1lZE91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgY2xhaW1lZE91dHB1dHMpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBRdWV1ZSBvcGVyYXRpb25zIGZvciBhbGwgZGlyZWN0aXZlcyB0byBjaGVjayB0aGUgcmVsZXZhbnQgb3V0cHV0cyBmb3IgYSBkaXJlY3RpdmUuXG4gICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgdGhpcy5vcFF1ZXVlLnB1c2gobmV3IFRjYkRpcmVjdGl2ZU91dHB1dHNPcCh0aGlzLnRjYiwgdGhpcywgbm9kZSwgZGlyKSk7XG4gICAgfVxuXG4gICAgLy8gQWZ0ZXIgZXhwYW5kaW5nIHRoZSBkaXJlY3RpdmVzLCB3ZSBtaWdodCBuZWVkIHRvIHF1ZXVlIGFuIG9wZXJhdGlvbiB0byBjaGVjayBhbnkgdW5jbGFpbWVkXG4gICAgLy8gb3V0cHV0cy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICAvLyBHbyB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzIGFuZCByZWdpc3RlciBhbnkgb3V0cHV0cyB0aGF0IGl0IGNsYWltcyBpbiBgY2xhaW1lZE91dHB1dHNgLlxuICAgICAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0aXZlcykge1xuICAgICAgICBmb3IgKGNvbnN0IG91dHB1dFByb3BlcnR5IG9mIGRpci5vdXRwdXRzLnByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgICBjbGFpbWVkT3V0cHV0cy5hZGQob3V0cHV0UHJvcGVydHkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JVbmNsYWltZWRPdXRwdXRzT3AodGhpcy50Y2IsIHRoaXMsIG5vZGUsIGNsYWltZWRPdXRwdXRzKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmREZWVwU2NoZW1hQ2hlY2tzKG5vZGVzOiBUbXBsQXN0Tm9kZVtdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAoIShub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2xhaW1lZElucHV0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKTtcbiAgICAgICAgbGV0IGhhc0RpcmVjdGl2ZXM6IGJvb2xlYW47XG4gICAgICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsIHx8IGRpcmVjdGl2ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaGFzRGlyZWN0aXZlcyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhc0RpcmVjdGl2ZXMgPSB0cnVlO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIG9mIGRpci5pbnB1dHMucHJvcGVydHlOYW1lcykge1xuICAgICAgICAgICAgICBjbGFpbWVkSW5wdXRzLmFkZChwcm9wZXJ0eU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wUXVldWUucHVzaChuZXcgVGNiRG9tU2NoZW1hQ2hlY2tlck9wKHRoaXMudGNiLCBub2RlLCAhaGFzRGlyZWN0aXZlcywgY2xhaW1lZElucHV0cykpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmFwcGVuZERlZXBTY2hlbWFDaGVja3Mobm9kZS5jaGlsZHJlbik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmRJY3VFeHByZXNzaW9ucyhub2RlOiBUbXBsQXN0SWN1KTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB2YXJpYWJsZSBvZiBPYmplY3QudmFsdWVzKG5vZGUudmFycykpIHtcbiAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZXh0SW50ZXJwb2xhdGlvbk9wKHRoaXMudGNiLCB0aGlzLCB2YXJpYWJsZSkpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBsYWNlaG9sZGVyIG9mIE9iamVjdC52YWx1ZXMobm9kZS5wbGFjZWhvbGRlcnMpKSB7XG4gICAgICBpZiAocGxhY2Vob2xkZXIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgICAgIHRoaXMub3BRdWV1ZS5wdXNoKG5ldyBUY2JUZXh0SW50ZXJwb2xhdGlvbk9wKHRoaXMudGNiLCB0aGlzLCBwbGFjZWhvbGRlcikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgVGNiQm91bmRJbnB1dCB7XG4gIGF0dHJpYnV0ZTogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlO1xuICBmaWVsZE5hbWVzOiBDbGFzc1Byb3BlcnR5TmFtZVtdO1xufVxuXG4vKipcbiAqIENyZWF0ZSB0aGUgYGN0eGAgcGFyYW1ldGVyIHRvIHRoZSB0b3AtbGV2ZWwgVENCIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBwYXJhbWV0ZXIgd2l0aCBhIHR5cGUgZXF1aXZhbGVudCB0byB0aGUgY29tcG9uZW50IHR5cGUsIHdpdGggYWxsIGdlbmVyaWMgdHlwZVxuICogcGFyYW1ldGVycyBsaXN0ZWQgKHdpdGhvdXQgdGhlaXIgZ2VuZXJpYyBib3VuZHMpLlxuICovXG5mdW5jdGlvbiB0Y2JDdHhQYXJhbShcbiAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCBuYW1lOiB0cy5FbnRpdHlOYW1lLFxuICAgIHVzZUdlbmVyaWNUeXBlOiBib29sZWFuKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICBsZXQgdHlwZUFyZ3VtZW50czogdHMuVHlwZU5vZGVbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIC8vIENoZWNrIGlmIHRoZSBjb21wb25lbnQgaXMgZ2VuZXJpYywgYW5kIHBhc3MgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgaWYgc28uXG4gIGlmIChub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodXNlR2VuZXJpY1R5cGUpIHtcbiAgICAgIHR5cGVBcmd1bWVudHMgPVxuICAgICAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcCgoKSA9PiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShuYW1lLCB0eXBlQXJndW1lbnRzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2N0eCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBgQVNUYCBleHByZXNzaW9uIGFuZCBjb252ZXJ0IGl0IGludG8gYSBgdHMuRXhwcmVzc2lvbmAsIGdlbmVyYXRpbmcgcmVmZXJlbmNlcyB0byB0aGVcbiAqIGNvcnJlY3QgaWRlbnRpZmllcnMgaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHRjYkV4cHJlc3Npb24oYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHRyYW5zbGF0b3IgPSBuZXcgVGNiRXhwcmVzc2lvblRyYW5zbGF0b3IodGNiLCBzY29wZSk7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvciB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCB0Y2I6IENvbnRleHQsIHByb3RlY3RlZCBzY29wZTogU2NvcGUpIHt9XG5cbiAgdHJhbnNsYXRlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gYGFzdFRvVHlwZXNjcmlwdGAgYWN0dWFsbHkgZG9lcyB0aGUgY29udmVyc2lvbi4gQSBzcGVjaWFsIHJlc29sdmVyIGB0Y2JSZXNvbHZlYCBpcyBwYXNzZWRcbiAgICAvLyB3aGljaCBpbnRlcnByZXRzIHNwZWNpZmljIGV4cHJlc3Npb24gbm9kZXMgdGhhdCBpbnRlcmFjdCB3aXRoIHRoZSBgSW1wbGljaXRSZWNlaXZlcmAuIFRoZXNlXG4gICAgLy8gbm9kZXMgYWN0dWFsbHkgcmVmZXIgdG8gaWRlbnRpZmllcnMgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICAgIHJldHVybiBhc3RUb1R5cGVzY3JpcHQoYXN0LCBhc3QgPT4gdGhpcy5yZXNvbHZlKGFzdCksIHRoaXMudGNiLmVudi5jb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYW4gYEFTVGAgZXhwcmVzc2lvbiB3aXRoaW4gdGhlIGdpdmVuIHNjb3BlLlxuICAgKlxuICAgKiBTb21lIGBBU1RgIGV4cHJlc3Npb25zIHJlZmVyIHRvIHRvcC1sZXZlbCBjb25jZXB0cyAocmVmZXJlbmNlcywgdmFyaWFibGVzLCB0aGUgY29tcG9uZW50XG4gICAqIGNvbnRleHQpLiBUaGlzIG1ldGhvZCBhc3Npc3RzIGluIHJlc29sdmluZyB0aG9zZS5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAgIC8vIFRyeSB0byByZXNvbHZlIGEgYm91bmQgdGFyZ2V0IGZvciB0aGlzIGV4cHJlc3Npb24uIElmIG5vIHN1Y2ggdGFyZ2V0IGlzIGF2YWlsYWJsZSwgdGhlblxuICAgICAgLy8gdGhlIGV4cHJlc3Npb24gaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbCBjb21wb25lbnQgY29udGV4dC4gSW4gdGhhdCBjYXNlLCBgbnVsbGAgaXNcbiAgICAgIC8vIHJldHVybmVkIGhlcmUgdG8gbGV0IGl0IGZhbGwgdGhyb3VnaCByZXNvbHV0aW9uIHNvIGl0IHdpbGwgYmUgY2F1Z2h0IHdoZW4gdGhlXG4gICAgICAvLyBgSW1wbGljaXRSZWNlaXZlcmAgaXMgcmVzb2x2ZWQgaW4gdGhlIGJyYW5jaCBiZWxvdy5cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVUYXJnZXQoYXN0KTtcbiAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5V3JpdGUgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LnZhbHVlKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUJpbmFyeSh0YXJnZXQsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGV4cHIpKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgICAgLy8gQVNUIGluc3RhbmNlcyByZXByZXNlbnRpbmcgdmFyaWFibGVzIGFuZCByZWZlcmVuY2VzIGxvb2sgdmVyeSBzaW1pbGFyIHRvIHByb3BlcnR5IHJlYWRzXG4gICAgICAvLyBvciBtZXRob2QgY2FsbHMgZnJvbSB0aGUgY29tcG9uZW50IGNvbnRleHQ6IGJvdGggaGF2ZSB0aGUgc2hhcGVcbiAgICAgIC8vIFByb3BlcnR5UmVhZChJbXBsaWNpdFJlY2VpdmVyLCAncHJvcE5hbWUnKSBvciBNZXRob2RDYWxsKEltcGxpY2l0UmVjZWl2ZXIsICdtZXRob2ROYW1lJykuXG4gICAgICAvL1xuICAgICAgLy8gYHRyYW5zbGF0ZWAgd2lsbCBmaXJzdCB0cnkgdG8gYHJlc29sdmVgIHRoZSBvdXRlciBQcm9wZXJ0eVJlYWQvTWV0aG9kQ2FsbC4gSWYgdGhpcyB3b3JrcyxcbiAgICAgIC8vIGl0J3MgYmVjYXVzZSB0aGUgYEJvdW5kVGFyZ2V0YCBmb3VuZCBhbiBleHByZXNzaW9uIHRhcmdldCBmb3IgdGhlIHdob2xlIGV4cHJlc3Npb24sIGFuZFxuICAgICAgLy8gdGhlcmVmb3JlIGB0cmFuc2xhdGVgIHdpbGwgbmV2ZXIgYXR0ZW1wdCB0byBgcmVzb2x2ZWAgdGhlIEltcGxpY2l0UmVjZWl2ZXIgb2YgdGhhdFxuICAgICAgLy8gUHJvcGVydHlSZWFkL01ldGhvZENhbGwuXG4gICAgICAvL1xuICAgICAgLy8gVGhlcmVmb3JlIGlmIGByZXNvbHZlYCBpcyBjYWxsZWQgb24gYW4gYEltcGxpY2l0UmVjZWl2ZXJgLCBpdCdzIGJlY2F1c2Ugbm8gb3V0ZXJcbiAgICAgIC8vIFByb3BlcnR5UmVhZC9NZXRob2RDYWxsIHJlc29sdmVkIHRvIGEgdmFyaWFibGUgb3IgcmVmZXJlbmNlLCBhbmQgdGhlcmVmb3JlIHRoaXMgaXMgYVxuICAgICAgLy8gcHJvcGVydHkgcmVhZCBvciBtZXRob2QgY2FsbCBvbiB0aGUgY29tcG9uZW50IGNvbnRleHQgaXRzZWxmLlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2N0eCcpO1xuICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuZXhwKTtcbiAgICAgIGNvbnN0IHBpcGVSZWYgPSB0aGlzLnRjYi5nZXRQaXBlQnlOYW1lKGFzdC5uYW1lKTtcbiAgICAgIGxldCBwaXBlOiB0cy5FeHByZXNzaW9ufG51bGw7XG4gICAgICBpZiAocGlwZVJlZiA9PT0gbnVsbCkge1xuICAgICAgICAvLyBObyBwaXBlIGJ5IHRoYXQgbmFtZSBleGlzdHMgaW4gc2NvcGUuIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yLlxuICAgICAgICB0aGlzLnRjYi5vb2JSZWNvcmRlci5taXNzaW5nUGlwZSh0aGlzLnRjYi5pZCwgYXN0KTtcblxuICAgICAgICAvLyBVc2UgYW4gJ2FueScgdmFsdWUgdG8gYXQgbGVhc3QgYWxsb3cgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24gdG8gYmUgY2hlY2tlZC5cbiAgICAgICAgcGlwZSA9IE5VTExfQVNfQU5ZO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mUGlwZXMpIHtcbiAgICAgICAgLy8gVXNlIGEgdmFyaWFibGUgZGVjbGFyZWQgYXMgdGhlIHBpcGUncyB0eXBlLlxuICAgICAgICBwaXBlID0gdGhpcy50Y2IuZW52LnBpcGVJbnN0KHBpcGVSZWYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVXNlIGFuICdhbnknIHZhbHVlIHdoZW4gbm90IGNoZWNraW5nIHRoZSB0eXBlIG9mIHRoZSBwaXBlLlxuICAgICAgICBwaXBlID0gdHMuY3JlYXRlQXNFeHByZXNzaW9uKFxuICAgICAgICAgICAgdGhpcy50Y2IuZW52LnBpcGVJbnN0KHBpcGVSZWYpLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICB9XG4gICAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLnRyYW5zbGF0ZShhcmcpKTtcbiAgICAgIGNvbnN0IG1ldGhvZEFjY2VzcyA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHBpcGUsICd0cmFuc2Zvcm0nKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8obWV0aG9kQWNjZXNzLCBhc3QubmFtZVNwYW4pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAvKiBleHByZXNzaW9uICovIG1ldGhvZEFjY2VzcyxcbiAgICAgICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1tleHByLCAuLi5hcmdzXSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlc3VsdCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBhc3QgaW5zdGFuY2VvZiBNZXRob2RDYWxsICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgJiZcbiAgICAgICAgIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBUaGlzUmVjZWl2ZXIpKSB7XG4gICAgICAvLyBSZXNvbHZlIHRoZSBzcGVjaWFsIGAkYW55KGV4cHIpYCBzeW50YXggdG8gaW5zZXJ0IGEgY2FzdCBvZiB0aGUgYXJndW1lbnQgdG8gdHlwZSBgYW55YC5cbiAgICAgIC8vIGAkYW55KGV4cHIpYCAtPiBgZXhwciBhcyBhbnlgXG4gICAgICBpZiAoYXN0Lm5hbWUgPT09ICckYW55JyAmJiBhc3QuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5hcmdzWzBdKTtcbiAgICAgICAgY29uc3QgZXhwckFzQW55ID1cbiAgICAgICAgICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbihleHByLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRzLmNyZWF0ZVBhcmVuKGV4cHJBc0FueSk7XG4gICAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzdWx0LCBhc3Quc291cmNlU3Bhbik7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgdGhlIG1ldGhvZCwgYW5kIGdlbmVyYXRlIHRoZSBtZXRob2QgY2FsbCBpZiBhIHRhcmdldFxuICAgICAgLy8gY291bGQgYmUgcmVzb2x2ZWQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsIHRoZW4gdGhlIG1ldGhvZCBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsXG4gICAgICAvLyBjb21wb25lbnQgY29udGV4dCwgaW4gd2hpY2ggY2FzZSBgbnVsbGAgaXMgcmV0dXJuZWQgdG8gbGV0IHRoZSBgSW1wbGljaXRSZWNlaXZlcmAgYmVpbmdcbiAgICAgIC8vIHJlc29sdmVkIHRvIHRoZSBjb21wb25lbnQgY29udGV4dC5cbiAgICAgIGNvbnN0IHJlY2VpdmVyID0gdGhpcy5yZXNvbHZlVGFyZ2V0KGFzdCk7XG4gICAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1ldGhvZCA9IHdyYXBGb3JEaWFnbm9zdGljcyhyZWNlaXZlcik7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMudHJhbnNsYXRlKGFyZykpO1xuICAgICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUNhbGwobWV0aG9kLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBBU1QgaXNuJ3Qgc3BlY2lhbCBhZnRlciBhbGwuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVzb2x2ZSBhIGJvdW5kIHRhcmdldCBmb3IgYSBnaXZlbiBleHByZXNzaW9uLCBhbmQgdHJhbnNsYXRlcyBpdCBpbnRvIHRoZVxuICAgKiBhcHByb3ByaWF0ZSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZXByZXNlbnRzIHRoZSBib3VuZCB0YXJnZXQuIElmIG5vIHRhcmdldCBpcyBhdmFpbGFibGUsXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVGFyZ2V0KGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBiaW5kaW5nID0gdGhpcy50Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmIChiaW5kaW5nID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByID0gdGhpcy5zY29wZS5yZXNvbHZlKGJpbmRpbmcpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG5cbi8qKlxuICogQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUsIGluZmVycmluZyBhIHR5cGUgZm9yXG4gKiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGZyb20gYW55IGJvdW5kIGlucHV0cy5cbiAqL1xuZnVuY3Rpb24gdGNiQ2FsbFR5cGVDdG9yKFxuICAgIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCwgaW5wdXRzOiBUY2JEaXJlY3RpdmVJbnB1dFtdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHR5cGVDdG9yID0gdGNiLmVudi50eXBlQ3RvckZvcihkaXIpO1xuXG4gIC8vIENvbnN0cnVjdCBhbiBhcnJheSBvZiBgdHMuUHJvcGVydHlBc3NpZ25tZW50YHMgZm9yIGVhY2ggb2YgdGhlIGRpcmVjdGl2ZSdzIGlucHV0cy5cbiAgY29uc3QgbWVtYmVycyA9IGlucHV0cy5tYXAoaW5wdXQgPT4ge1xuICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoaW5wdXQuZmllbGQpO1xuXG4gICAgaWYgKGlucHV0LnR5cGUgPT09ICdiaW5kaW5nJykge1xuICAgICAgLy8gRm9yIGJvdW5kIGlucHV0cywgdGhlIHByb3BlcnR5IGlzIGFzc2lnbmVkIHRoZSBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAgICBsZXQgZXhwciA9IGlucHV0LmV4cHJlc3Npb247XG4gICAgICBpZiAoIXRjYi5lbnYuY29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBjaGVja2luZyB0aGUgdHlwZSBvZiBiaW5kaW5ncyBpcyBkaXNhYmxlZCwgY2FzdCB0aGUgcmVzdWx0aW5nIGV4cHJlc3Npb24gdG8gJ2FueSdcbiAgICAgICAgLy8gYmVmb3JlIHRoZSBhc3NpZ25tZW50LlxuICAgICAgICBleHByID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKCF0Y2IuZW52LmNvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncykge1xuICAgICAgICAvLyBJZiBzdHJpY3QgbnVsbCBjaGVja3MgYXJlIGRpc2FibGVkLCBlcmFzZSBgbnVsbGAgYW5kIGB1bmRlZmluZWRgIGZyb20gdGhlIHR5cGUgYnlcbiAgICAgICAgLy8gd3JhcHBpbmcgdGhlIGV4cHJlc3Npb24gaW4gYSBub24tbnVsbCBhc3NlcnRpb24uXG4gICAgICAgIGV4cHIgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYXNzaWdubWVudCA9IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eU5hbWUsIHdyYXBGb3JEaWFnbm9zdGljcyhleHByKSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGFzc2lnbm1lbnQsIGlucHV0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIGFzc2lnbm1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEEgdHlwZSBjb25zdHJ1Y3RvciBpcyByZXF1aXJlZCB0byBiZSBjYWxsZWQgd2l0aCBhbGwgaW5wdXQgcHJvcGVydGllcywgc28gYW55IHVuc2V0XG4gICAgICAvLyBpbnB1dHMgYXJlIHNpbXBseSBhc3NpZ25lZCBhIHZhbHVlIG9mIHR5cGUgYGFueWAgdG8gaWdub3JlIHRoZW0uXG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5TmFtZSwgTlVMTF9BU19BTlkpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ2FsbCB0aGUgYG5nVHlwZUN0b3JgIG1ldGhvZCBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzLCB3aXRoIGFuIG9iamVjdCBsaXRlcmFsIGFyZ3VtZW50IGNyZWF0ZWRcbiAgLy8gZnJvbSB0aGUgbWF0Y2hlZCBpbnB1dHMuXG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyB0eXBlQ3RvcixcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9bdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKV0pO1xufVxuXG5mdW5jdGlvbiBnZXRCb3VuZElucHV0cyhcbiAgICBkaXJlY3RpdmU6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgdGNiOiBDb250ZXh0KTogVGNiQm91bmRJbnB1dFtdIHtcbiAgY29uc3QgYm91bmRJbnB1dHM6IFRjYkJvdW5kSW5wdXRbXSA9IFtdO1xuXG4gIGNvbnN0IHByb2Nlc3NBdHRyaWJ1dGUgPSAoYXR0cjogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFRtcGxBc3RUZXh0QXR0cmlidXRlKSA9PiB7XG4gICAgLy8gU2tpcCBub24tcHJvcGVydHkgYmluZGluZ3MuXG4gICAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgYXR0ci50eXBlICE9PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNraXAgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgZGlyZWN0aXZlIGRvZXMgbm90IGhhdmUgYW4gaW5wdXQgZm9yIGl0LlxuICAgIGNvbnN0IGlucHV0cyA9IGRpcmVjdGl2ZS5pbnB1dHMuZ2V0QnlCaW5kaW5nUHJvcGVydHlOYW1lKGF0dHIubmFtZSk7XG4gICAgaWYgKGlucHV0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBmaWVsZE5hbWVzID0gaW5wdXRzLm1hcChpbnB1dCA9PiBpbnB1dC5jbGFzc1Byb3BlcnR5TmFtZSk7XG4gICAgYm91bmRJbnB1dHMucHVzaCh7YXR0cmlidXRlOiBhdHRyLCBmaWVsZE5hbWVzfSk7XG4gIH07XG5cbiAgbm9kZS5pbnB1dHMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgbm9kZS5hdHRyaWJ1dGVzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgbm9kZS50ZW1wbGF0ZUF0dHJzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIH1cblxuICByZXR1cm4gYm91bmRJbnB1dHM7XG59XG5cbi8qKlxuICogVHJhbnNsYXRlcyB0aGUgZ2l2ZW4gYXR0cmlidXRlIGJpbmRpbmcgdG8gYSBgdHMuRXhwcmVzc2lvbmAuXG4gKi9cbmZ1bmN0aW9uIHRyYW5zbGF0ZUlucHV0KFxuICAgIGF0dHI6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAvLyBQcm9kdWNlIGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiB0aGUgYmluZGluZy5cbiAgICByZXR1cm4gdGNiRXhwcmVzc2lvbihhdHRyLnZhbHVlLCB0Y2IsIHNjb3BlKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBGb3IgcmVndWxhciBhdHRyaWJ1dGVzIHdpdGggYSBzdGF0aWMgc3RyaW5nIHZhbHVlLCB1c2UgdGhlIHJlcHJlc2VudGVkIHN0cmluZyBsaXRlcmFsLlxuICAgIHJldHVybiB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGF0dHIudmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQW4gaW5wdXQgYmluZGluZyB0aGF0IGNvcnJlc3BvbmRzIHdpdGggYSBmaWVsZCBvZiBhIGRpcmVjdGl2ZS5cbiAqL1xuaW50ZXJmYWNlIFRjYkRpcmVjdGl2ZUJvdW5kSW5wdXQge1xuICB0eXBlOiAnYmluZGluZyc7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIGEgZmllbGQgb24gdGhlIGRpcmVjdGl2ZSB0aGF0IGlzIHNldC5cbiAgICovXG4gIGZpZWxkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuRXhwcmVzc2lvbmAgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBpbnB1dCBiaW5kaW5nIGV4cHJlc3Npb24uXG4gICAqL1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgc291cmNlIHNwYW4gb2YgdGhlIGZ1bGwgYXR0cmlidXRlIGJpbmRpbmcuXG4gICAqL1xuICBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW47XG59XG5cbi8qKlxuICogSW5kaWNhdGVzIHRoYXQgYSBjZXJ0YWluIGZpZWxkIG9mIGEgZGlyZWN0aXZlIGRvZXMgbm90IGhhdmUgYSBjb3JyZXNwb25kaW5nIGlucHV0IGJpbmRpbmcuXG4gKi9cbmludGVyZmFjZSBUY2JEaXJlY3RpdmVVbnNldElucHV0IHtcbiAgdHlwZTogJ3Vuc2V0JztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgYSBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlIGZvciB3aGljaCBubyBpbnB1dCBiaW5kaW5nIGlzIHByZXNlbnQuXG4gICAqL1xuICBmaWVsZDogc3RyaW5nO1xufVxuXG50eXBlIFRjYkRpcmVjdGl2ZUlucHV0ID0gVGNiRGlyZWN0aXZlQm91bmRJbnB1dHxUY2JEaXJlY3RpdmVVbnNldElucHV0O1xuXG5jb25zdCBFVkVOVF9QQVJBTUVURVIgPSAnJGV2ZW50JztcblxuY29uc3QgZW51bSBFdmVudFBhcmFtVHlwZSB7XG4gIC8qIEdlbmVyYXRlcyBjb2RlIHRvIGluZmVyIHRoZSB0eXBlIG9mIGAkZXZlbnRgIGJhc2VkIG9uIGhvdyB0aGUgbGlzdGVuZXIgaXMgcmVnaXN0ZXJlZC4gKi9cbiAgSW5mZXIsXG5cbiAgLyogRGVjbGFyZXMgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHBhcmFtZXRlciBhcyBgYW55YC4gKi9cbiAgQW55LFxufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyb3cgZnVuY3Rpb24gdG8gYmUgdXNlZCBhcyBoYW5kbGVyIGZ1bmN0aW9uIGZvciBldmVudCBiaW5kaW5ncy4gVGhlIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZSBwYXJhbWV0ZXIgYCRldmVudGAgYW5kIHRoZSBib3VuZCBldmVudCdzIGhhbmRsZXIgYEFTVGAgcmVwcmVzZW50ZWQgYXMgYVxuICogVHlwZVNjcmlwdCBleHByZXNzaW9uIGFzIGl0cyBib2R5LlxuICpcbiAqIFdoZW4gYGV2ZW50VHlwZWAgaXMgc2V0IHRvIGBJbmZlcmAsIHRoZSBgJGV2ZW50YCBwYXJhbWV0ZXIgd2lsbCBub3QgaGF2ZSBhbiBleHBsaWNpdCB0eXBlLiBUaGlzXG4gKiBhbGxvd3MgZm9yIHRoZSBjcmVhdGVkIGhhbmRsZXIgZnVuY3Rpb24gdG8gaGF2ZSBpdHMgYCRldmVudGAgcGFyYW1ldGVyJ3MgdHlwZSBpbmZlcnJlZCBiYXNlZCBvblxuICogaG93IGl0J3MgdXNlZCwgdG8gZW5hYmxlIHN0cmljdCB0eXBlIGNoZWNraW5nIG9mIGV2ZW50IGJpbmRpbmdzLiBXaGVuIHNldCB0byBgQW55YCwgdGhlIGAkZXZlbnRgXG4gKiBwYXJhbWV0ZXIgd2lsbCBoYXZlIGFuIGV4cGxpY2l0IGBhbnlgIHR5cGUsIGVmZmVjdGl2ZWx5IGRpc2FibGluZyBzdHJpY3QgdHlwZSBjaGVja2luZyBvZiBldmVudFxuICogYmluZGluZ3MuIEFsdGVybmF0aXZlbHksIGFuIGV4cGxpY2l0IHR5cGUgY2FuIGJlIHBhc3NlZCBmb3IgdGhlIGAkZXZlbnRgIHBhcmFtZXRlci5cbiAqL1xuZnVuY3Rpb24gdGNiQ3JlYXRlRXZlbnRIYW5kbGVyKFxuICAgIGV2ZW50OiBUbXBsQXN0Qm91bmRFdmVudCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUsXG4gICAgZXZlbnRUeXBlOiBFdmVudFBhcmFtVHlwZXx0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCBoYW5kbGVyID0gdGNiRXZlbnRIYW5kbGVyRXhwcmVzc2lvbihldmVudC5oYW5kbGVyLCB0Y2IsIHNjb3BlKTtcblxuICBsZXQgZXZlbnRQYXJhbVR5cGU6IHRzLlR5cGVOb2RlfHVuZGVmaW5lZDtcbiAgaWYgKGV2ZW50VHlwZSA9PT0gRXZlbnRQYXJhbVR5cGUuSW5mZXIpIHtcbiAgICBldmVudFBhcmFtVHlwZSA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChldmVudFR5cGUgPT09IEV2ZW50UGFyYW1UeXBlLkFueSkge1xuICAgIGV2ZW50UGFyYW1UeXBlID0gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnRQYXJhbVR5cGUgPSBldmVudFR5cGU7XG4gIH1cblxuICAvLyBPYnRhaW4gYWxsIGd1YXJkcyB0aGF0IGhhdmUgYmVlbiBhcHBsaWVkIHRvIHRoZSBzY29wZSBhbmQgaXRzIHBhcmVudHMsIGFzIHRoZXkgaGF2ZSB0byBiZVxuICAvLyByZXBlYXRlZCB3aXRoaW4gdGhlIGhhbmRsZXIgZnVuY3Rpb24gZm9yIHRoZWlyIG5hcnJvd2luZyB0byBiZSBpbiBlZmZlY3Qgd2l0aGluIHRoZSBoYW5kbGVyLlxuICBjb25zdCBndWFyZHMgPSBzY29wZS5ndWFyZHMoKTtcblxuICBsZXQgYm9keTogdHMuU3RhdGVtZW50ID0gdHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudChoYW5kbGVyKTtcbiAgaWYgKGd1YXJkcyAhPT0gbnVsbCkge1xuICAgIC8vIFdyYXAgdGhlIGJvZHkgaW4gYW4gYGlmYCBzdGF0ZW1lbnQgY29udGFpbmluZyBhbGwgZ3VhcmRzIHRoYXQgaGF2ZSB0byBiZSBhcHBsaWVkLlxuICAgIGJvZHkgPSB0cy5jcmVhdGVJZihndWFyZHMsIGJvZHkpO1xuICB9XG5cbiAgY29uc3QgZXZlbnRQYXJhbSA9IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gRVZFTlRfUEFSQU1FVEVSLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIGV2ZW50UGFyYW1UeXBlKTtcbiAgYWRkRXhwcmVzc2lvbklkZW50aWZpZXIoZXZlbnRQYXJhbSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRVZFTlRfUEFSQU1FVEVSKTtcblxuICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKFxuICAgICAgLyogbW9kaWZpZXIgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi9bZXZlbnRQYXJhbV0sXG4gICAgICAvKiB0eXBlICovIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpLFxuICAgICAgLyogYm9keSAqLyB0cy5jcmVhdGVCbG9jayhbYm9keV0pKTtcbn1cblxuLyoqXG4gKiBTaW1pbGFyIHRvIGB0Y2JFeHByZXNzaW9uYCwgdGhpcyBmdW5jdGlvbiBjb252ZXJ0cyB0aGUgcHJvdmlkZWQgYEFTVGAgZXhwcmVzc2lvbiBpbnRvIGFcbiAqIGB0cy5FeHByZXNzaW9uYCwgd2l0aCBzcGVjaWFsIGhhbmRsaW5nIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSB0aGF0IGNhbiBiZSB1c2VkIHdpdGhpbiBldmVudFxuICogYmluZGluZ3MuXG4gKi9cbmZ1bmN0aW9uIHRjYkV2ZW50SGFuZGxlckV4cHJlc3Npb24oYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHRyYW5zbGF0b3IgPSBuZXcgVGNiRXZlbnRIYW5kbGVyVHJhbnNsYXRvcih0Y2IsIHNjb3BlKTtcbiAgcmV0dXJuIHRyYW5zbGF0b3IudHJhbnNsYXRlKGFzdCk7XG59XG5cbmNsYXNzIFRjYkV2ZW50SGFuZGxlclRyYW5zbGF0b3IgZXh0ZW5kcyBUY2JFeHByZXNzaW9uVHJhbnNsYXRvciB7XG4gIHByb3RlY3RlZCByZXNvbHZlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBSZWNvZ25pemUgYSBwcm9wZXJ0eSByZWFkIG9uIHRoZSBpbXBsaWNpdCByZWNlaXZlciBjb3JyZXNwb25kaW5nIHdpdGggdGhlIGV2ZW50IHBhcmFtZXRlclxuICAgIC8vIHRoYXQgaXMgYXZhaWxhYmxlIGluIGV2ZW50IGJpbmRpbmdzLiBTaW5jZSB0aGlzIHZhcmlhYmxlIGlzIGEgcGFyYW1ldGVyIG9mIHRoZSBoYW5kbGVyXG4gICAgLy8gZnVuY3Rpb24gdGhhdCB0aGUgY29udmVydGVkIGV4cHJlc3Npb24gYmVjb21lcyBhIGNoaWxkIG9mLCBqdXN0IGNyZWF0ZSBhIHJlZmVyZW5jZSB0byB0aGVcbiAgICAvLyBwYXJhbWV0ZXIgYnkgaXRzIG5hbWUuXG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyICYmXG4gICAgICAgICEoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgVGhpc1JlY2VpdmVyKSAmJiBhc3QubmFtZSA9PT0gRVZFTlRfUEFSQU1FVEVSKSB7XG4gICAgICBjb25zdCBldmVudCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoRVZFTlRfUEFSQU1FVEVSKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXZlbnQsIGFzdC5uYW1lU3Bhbik7XG4gICAgICByZXR1cm4gZXZlbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLnJlc29sdmUoYXN0KTtcbiAgfVxufVxuIl19