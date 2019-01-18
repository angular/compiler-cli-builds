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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/expression"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var expression_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/expression");
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
    function generateTypeCheckBlock(node, meta, importManager) {
        var tcb = new Context(meta.boundTarget, node.getSourceFile(), importManager);
        var scope = new Scope(tcb);
        tcbProcessNodes(meta.boundTarget.target.template, tcb, scope);
        var body = ts.createBlock([ts.createIf(ts.createTrue(), scope.getBlock())]);
        return ts.createFunctionDeclaration(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* asteriskToken */ undefined, 
        /* name */ meta.fnName, 
        /* typeParameters */ node.typeParameters, 
        /* parameters */ [tcbCtxParam(node)], 
        /* type */ undefined, 
        /* body */ body);
    }
    exports.generateTypeCheckBlock = generateTypeCheckBlock;
    /**
     * Overall generation context for the type check block.
     *
     * `Context` handles operations during code generation which are global with respect to the whole
     * block. It's responsible for variable name allocation and management of any imports needed. It
     * also contains the template metadata itself.
     */
    var Context = /** @class */ (function () {
        function Context(boundTarget, sourceFile, importManager) {
            this.boundTarget = boundTarget;
            this.sourceFile = sourceFile;
            this.importManager = importManager;
            this.nextId = 1;
        }
        /**
         * Allocate a new variable name for use within the `Context`.
         *
         * Currently this uses a monotonically increasing counter, but in the future the variable name
         * might change depending on the type of data being stored.
         */
        Context.prototype.allocateId = function () { return ts.createIdentifier("_t" + this.nextId++); };
        /**
         * Write a `ts.Expression` that references the given node.
         *
         * This may involve importing the node into the file if it's not declared there already.
         */
        Context.prototype.reference = function (ref) {
            var ngExpr = ref.toExpression(this.sourceFile);
            if (ngExpr === null) {
                throw new Error("Unreachable reference: " + ref.node);
            }
            // Use `translateExpression` to convert the `Expression` into a `ts.Expression`.
            return translator_1.translateExpression(ngExpr, this.importManager);
        };
        return Context;
    }());
    /**
     * Local scope within the type check block for a particular template.
     *
     * The top-level template and each nested `<ng-template>` have their own `Scope`, which exist in a
     * hierarchy. The structure of this hierarchy mirrors the syntactic scopes in the generated type
     * check block, where each nested template is encased in an `if` structure.
     *
     * As a template is processed in a given `Scope`, statements are added via `addStatement()`. When
     * this processing is complete, the `Scope` can be turned into a `ts.Block` via `getBlock()`.
     */
    var Scope = /** @class */ (function () {
        function Scope(tcb, parent) {
            if (parent === void 0) { parent = null; }
            this.tcb = tcb;
            this.parent = parent;
            /**
             * Map of nodes to information about that node within the TCB.
             *
             * For example, this stores the `ts.Identifier` within the TCB for an element or <ng-template>.
             */
            this.elementData = new Map();
            /**
             * Map of immediately nested <ng-template>s (within this `Scope`) to the `ts.Identifier` of their
             * rendering contexts.
             */
            this.templateCtx = new Map();
            /**
             * Map of variables declared on the template that created this `Scope` to their `ts.Identifier`s
             * within the TCB.
             */
            this.varMap = new Map();
            /**
             * Statements for this template.
             */
            this.statements = [];
        }
        /**
         * Get the identifier within the TCB for a given `TmplAstElement`.
         */
        Scope.prototype.getElementId = function (el) {
            var data = this.getElementData(el, false);
            if (data !== null && data.htmlNode !== null) {
                return data.htmlNode;
            }
            return this.parent !== null ? this.parent.getElementId(el) : null;
        };
        /**
         * Get the identifier of a directive instance on a given template node.
         */
        Scope.prototype.getDirectiveId = function (el, dir) {
            var data = this.getElementData(el, false);
            if (data !== null && data.directives !== null && data.directives.has(dir)) {
                return data.directives.get(dir);
            }
            return this.parent !== null ? this.parent.getDirectiveId(el, dir) : null;
        };
        /**
         * Get the identifier of a template's rendering context.
         */
        Scope.prototype.getTemplateCtx = function (tmpl) {
            return this.templateCtx.get(tmpl) ||
                (this.parent !== null ? this.parent.getTemplateCtx(tmpl) : null);
        };
        /**
         * Get the identifier of a template variable.
         */
        Scope.prototype.getVariableId = function (v) {
            return this.varMap.get(v) || (this.parent !== null ? this.parent.getVariableId(v) : null);
        };
        /**
         * Allocate an identifier for the given template element.
         */
        Scope.prototype.allocateElementId = function (el) {
            var data = this.getElementData(el, true);
            if (data.htmlNode === null) {
                data.htmlNode = this.tcb.allocateId();
            }
            return data.htmlNode;
        };
        /**
         * Allocate an identifier for the given template variable.
         */
        Scope.prototype.allocateVariableId = function (v) {
            if (!this.varMap.has(v)) {
                this.varMap.set(v, this.tcb.allocateId());
            }
            return this.varMap.get(v);
        };
        /**
         * Allocate an identifier for an instance of the given directive on the given template node.
         */
        Scope.prototype.allocateDirectiveId = function (el, dir) {
            // Look up the data for this template node.
            var data = this.getElementData(el, true);
            // Lazily populate the directives map, if it exists.
            if (data.directives === null) {
                data.directives = new Map();
            }
            if (!data.directives.has(dir)) {
                data.directives.set(dir, this.tcb.allocateId());
            }
            return data.directives.get(dir);
        };
        /**
         * Allocate an identifier for the rendering context of a given template.
         */
        Scope.prototype.allocateTemplateCtx = function (tmpl) {
            if (!this.templateCtx.has(tmpl)) {
                this.templateCtx.set(tmpl, this.tcb.allocateId());
            }
            return this.templateCtx.get(tmpl);
        };
        /**
         * Add a statement to this scope.
         */
        Scope.prototype.addStatement = function (stmt) { this.statements.push(stmt); };
        /**
         * Get a `ts.Block` containing the statements in this scope.
         */
        Scope.prototype.getBlock = function () { return ts.createBlock(this.statements); };
        Scope.prototype.getElementData = function (el, alloc) {
            if (alloc && !this.elementData.has(el)) {
                this.elementData.set(el, { htmlNode: null, directives: null });
            }
            return this.elementData.get(el) || null;
        };
        return Scope;
    }());
    /**
     * Create the `ctx` parameter to the top-level TCB function.
     *
     * This is a parameter with a type equivalent to the component type, with all generic type
     * parameters listed (without their generic bounds).
     */
    function tcbCtxParam(node) {
        var typeArguments = undefined;
        // Check if the component is generic, and pass generic type parameters if so.
        if (node.typeParameters !== undefined) {
            typeArguments =
                node.typeParameters.map(function (param) { return ts.createTypeReferenceNode(param.name, undefined); });
        }
        var type = ts.createTypeReferenceNode(node.name, typeArguments);
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
     * Process an array of template nodes and generate type checking code for them within the given
     * `Scope`.
     *
     * @param nodes template node array over which to iterate.
     * @param tcb context of the overall type check block.
     * @param scope
     */
    function tcbProcessNodes(nodes, tcb, scope) {
        nodes.forEach(function (node) {
            // Process elements, templates, and bindings.
            if (node instanceof compiler_1.TmplAstElement) {
                tcbProcessElement(node, tcb, scope);
            }
            else if (node instanceof compiler_1.TmplAstTemplate) {
                tcbProcessTemplateDeclaration(node, tcb, scope);
            }
            else if (node instanceof compiler_1.TmplAstBoundText) {
                var expr = tcbExpression(node.value, tcb, scope);
                scope.addStatement(ts.createStatement(expr));
            }
        });
    }
    /**
     * Process an element, generating type checking code for it, its directives, and its children.
     */
    function tcbProcessElement(el, tcb, scope) {
        var id = scope.getElementId(el);
        if (id !== null) {
            // This element has been processed before. No need to run through it again.
            return id;
        }
        id = scope.allocateElementId(el);
        // Add the declaration of the element using document.createElement.
        scope.addStatement(tsCreateVariable(id, tsCreateElement(el.name)));
        // Construct a set of all the input bindings. Anything matched by directives will be removed from
        // this set. The rest are bindings being made on the element itself.
        var inputs = new Set(el.inputs.filter(function (input) { return input.type === 0 /* Property */; }).map(function (input) { return input.name; }));
        // Process directives of the node.
        tcbProcessDirectives(el, inputs, tcb, scope);
        // At this point, `inputs` now contains only those bindings not matched by any directive. These
        // bindings go to the element itself.
        inputs.forEach(function (name) {
            var binding = el.inputs.find(function (input) { return input.name === name; });
            var expr = tcbExpression(binding.value, tcb, scope);
            var prop = ts.createPropertyAccess(id, name);
            var assign = ts.createBinary(prop, ts.SyntaxKind.EqualsToken, expr);
            scope.addStatement(ts.createStatement(assign));
        });
        // Recurse into children.
        tcbProcessNodes(el.children, tcb, scope);
        return id;
    }
    /**
     * Process all the directives associated with a given template node.
     */
    function tcbProcessDirectives(el, unclaimed, tcb, scope) {
        var directives = tcb.boundTarget.getDirectivesOfNode(el);
        if (directives === null) {
            // No directives, nothing to do.
            return;
        }
        directives.forEach(function (dir) { return tcbProcessDirective(el, dir, unclaimed, tcb, scope); });
    }
    /**
     * Process a directive, generating type checking code for it.
     */
    function tcbProcessDirective(el, dir, unclaimed, tcb, scope) {
        var id = scope.getDirectiveId(el, dir);
        if (id !== null) {
            // This directive has been processed before. No need to run through it again.
            return id;
        }
        id = scope.allocateDirectiveId(el, dir);
        var bindings = tcbGetInputBindingExpressions(el, dir, tcb, scope);
        // Call the type constructor of the directive to infer a type, and assign the directive instance.
        scope.addStatement(tsCreateVariable(id, tcbCallTypeCtor(el, dir, tcb, scope, bindings)));
        tcbProcessBindings(id, bindings, unclaimed, tcb, scope);
        return id;
    }
    function tcbProcessBindings(recv, bindings, unclaimed, tcb, scope) {
        // Iterate through all the bindings this directive is consuming.
        bindings.forEach(function (binding) {
            // Generate an assignment statement for this binding.
            var prop = ts.createPropertyAccess(recv, binding.field);
            var assign = ts.createBinary(prop, ts.SyntaxKind.EqualsToken, binding.expression);
            scope.addStatement(ts.createStatement(assign));
            // Remove the binding from the set of unclaimed inputs, as this directive has 'claimed' it.
            unclaimed.delete(binding.property);
        });
    }
    /**
     * Process a nested <ng-template>, generating type-checking code for it and its children.
     *
     * The nested <ng-template> is represented with an `if` structure, which creates a new syntactical
     * scope for the type checking code for the template. If the <ng-template> has any directives, they
     * can influence type inference within the `if` block through defined guard functions.
     */
    function tcbProcessTemplateDeclaration(tmpl, tcb, scope) {
        // Create a new Scope to represent bindings captured in the template.
        var tmplScope = new Scope(tcb, scope);
        // Allocate a template ctx variable and declare it with an 'any' type.
        var ctx = tmplScope.allocateTemplateCtx(tmpl);
        var type = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
        scope.addStatement(tsDeclareVariable(ctx, type));
        // Process directives on the template.
        tcbProcessDirectives(tmpl, new Set(), tcb, scope);
        // Process the template itself (inside the inner Scope).
        tcbProcessNodes(tmpl.children, tcb, tmplScope);
        // An `if` will be constructed, within which the template's children will be type checked. The
        // `if` is used for two reasons: it creates a new syntactic scope, isolating variables declared in
        // the template's TCB from the outer context, and it allows any directives on the templates to
        // perform type narrowing of either expressions or the template's context.
        // The guard is the `if` block's condition. It's usually set to `true` but directives that exist
        // on the template can trigger extra guard expressions that serve to narrow types within the
        // `if`. `guard` is calculated by starting with `true` and adding other conditions as needed.
        // Collect these into `guards` by processing the directives.
        var directiveGuards = [];
        var directives = tcb.boundTarget.getDirectivesOfNode(tmpl);
        if (directives !== null) {
            directives.forEach(function (dir) {
                var dirInstId = scope.getDirectiveId(tmpl, dir);
                var dirId = tcb.reference(dir.ref);
                // There are two kinds of guards. Template guards (ngTemplateGuards) allow type narrowing of
                // the expression passed to an @Input of the directive. Scan the directive to see if it has
                // any template guards, and generate them if needed.
                dir.ngTemplateGuards.forEach(function (inputName) {
                    // For each template guard function on the directive, look for a binding to that input.
                    var boundInput = tmpl.inputs.find(function (i) { return i.name === inputName; });
                    if (boundInput !== undefined) {
                        // If there is such a binding, generate an expression for it.
                        var expr = tcbExpression(boundInput.value, tcb, scope);
                        // Call the guard function on the directive with the directive instance and that
                        // expression.
                        var guardInvoke = tsCallMethod(dirId, "ngTemplateGuard_" + inputName, [
                            dirInstId,
                            expr,
                        ]);
                        directiveGuards.push(guardInvoke);
                    }
                });
                // The second kind of guard is a template context guard. This guard narrows the template
                // rendering context variable `ctx`.
                if (dir.hasNgTemplateContextGuard) {
                    var guardInvoke = tsCallMethod(dirId, 'ngTemplateContextGuard', [dirInstId, ctx]);
                    directiveGuards.push(guardInvoke);
                }
            });
        }
        // By default the guard is simply `true`.
        var guard = ts.createTrue();
        // If there are any guards from directives, use them instead.
        if (directiveGuards.length > 0) {
            // Pop the first value and use it as the initializer to reduce(). This way, a single guard
            // will be used on its own, but two or more will be combined into binary expressions.
            guard = directiveGuards.reduce(function (expr, dirGuard) { return ts.createBinary(expr, ts.SyntaxKind.AmpersandAmpersandToken, dirGuard); }, directiveGuards.pop());
        }
        // Construct the `if` block for the template with the generated guard expression.
        var tmplIf = ts.createIf(
        /* expression */ guard, 
        /* thenStatement */ tmplScope.getBlock());
        scope.addStatement(tmplIf);
    }
    /**
     * Process an `AST` expression and convert it into a `ts.Expression`, generating references to the
     * correct identifiers in the current scope.
     */
    function tcbExpression(ast, tcb, scope) {
        // `astToTypescript` actually does the conversion. A special resolver `tcbResolve` is passed which
        // interprets specific expression nodes that interact with the `ImplicitReceiver`. These nodes
        // actually refer to identifiers within the current scope.
        return expression_1.astToTypescript(ast, function (ast) { return tcbResolve(ast, tcb, scope); });
    }
    /**
     * Call the type constructor of a directive instance on a given template node, inferring a type for
     * the directive instance from any bound inputs.
     */
    function tcbCallTypeCtor(el, dir, tcb, scope, bindings) {
        var dirClass = tcb.reference(dir.ref);
        // Construct an array of `ts.PropertyAssignment`s for each input of the directive that has a
        // matching binding.
        var members = bindings.map(function (b) { return ts.createPropertyAssignment(b.field, b.expression); });
        // Call the `ngTypeCtor` method on the directive class, with an object literal argument created
        // from the matched inputs.
        return tsCallMethod(
        /* receiver */ dirClass, 
        /* methodName */ 'ngTypeCtor', 
        /* args */ [ts.createObjectLiteral(members)]);
    }
    function tcbGetInputBindingExpressions(el, dir, tcb, scope) {
        var bindings = [];
        // `dir.inputs` is an object map of field names on the directive class to property names.
        // This is backwards from what's needed to match bindings - a map of properties to field names
        // is desired. Invert `dir.inputs` into `propMatch` to create this map.
        var propMatch = new Map();
        var inputs = dir.inputs;
        Object.keys(inputs).forEach(function (key) {
            Array.isArray(inputs[key]) ? propMatch.set(inputs[key][0], key) :
                propMatch.set(inputs[key], key);
        });
        // Add a binding expression to the map for each input of the directive that has a
        // matching binding.
        el.inputs.filter(function (input) { return propMatch.has(input.name); }).forEach(function (input) {
            // Produce an expression representing the value of the binding.
            var expr = tcbExpression(input.value, tcb, scope);
            // Call the callback.
            bindings.push({
                property: input.name,
                field: propMatch.get(input.name),
                expression: expr,
            });
        });
        return bindings;
    }
    /**
     * Create an expression which instantiates an element by its HTML tagName.
     *
     * Thanks to narrowing of `document.createElement()`, this expression will have its type inferred
     * based on the tag name, including for custom elements that have appropriate .d.ts definitions.
     */
    function tsCreateElement(tagName) {
        var createElement = ts.createPropertyAccess(
        /* expression */ ts.createIdentifier('document'), 'createElement');
        return ts.createCall(
        /* expression */ createElement, 
        /* typeArguments */ undefined, 
        /* argumentsArray */ [ts.createLiteral(tagName)]);
    }
    /**
     * Create a `ts.VariableStatement` which declares a variable without explicit initialization.
     *
     * The initializer `null!` is used to bypass strict variable initialization checks.
     *
     * Unlike with `tsCreateVariable`, the type of the variable is explicitly specified.
     */
    function tsDeclareVariable(id, type) {
        var decl = ts.createVariableDeclaration(
        /* name */ id, 
        /* type */ type, 
        /* initializer */ ts.createNonNullExpression(ts.createNull()));
        return ts.createVariableStatement(
        /* modifiers */ undefined, 
        /* declarationList */ [decl]);
    }
    /**
     * Create a `ts.VariableStatement` that initializes a variable with a given expression.
     *
     * Unlike with `tsDeclareVariable`, the type of the variable is inferred from the initializer
     * expression.
     */
    function tsCreateVariable(id, initializer) {
        var decl = ts.createVariableDeclaration(
        /* name */ id, 
        /* type */ undefined, 
        /* initializer */ initializer);
        return ts.createVariableStatement(
        /* modifiers */ undefined, 
        /* declarationList */ [decl]);
    }
    /**
     * Construct a `ts.CallExpression` that calls a method on a receiver.
     */
    function tsCallMethod(receiver, methodName, args) {
        if (args === void 0) { args = []; }
        var methodAccess = ts.createPropertyAccess(receiver, methodName);
        return ts.createCall(
        /* expression */ methodAccess, 
        /* typeArguments */ undefined, 
        /* argumentsArray */ args);
    }
    /**
     * Resolve an `AST` expression within the given scope.
     *
     * Some `AST` expressions refer to top-level concepts (references, variables, the component
     * context). This method assists in resolving those.
     */
    function tcbResolve(ast, tcb, scope) {
        // Short circuit for AST types that won't have mappings.
        if (!(ast instanceof compiler_1.ImplicitReceiver || ast instanceof compiler_1.PropertyRead)) {
            return null;
        }
        if (ast instanceof compiler_1.PropertyRead && ast.receiver instanceof compiler_1.ImplicitReceiver) {
            // Check whether the template metadata has bound a target for this expression. If so, then
            // resolve that target. If not, then the expression is referencing the top-level component
            // context.
            var binding = tcb.boundTarget.getExpressionTarget(ast);
            if (binding !== null) {
                // This expression has a binding to some variable or reference in the template. Resolve it.
                if (binding instanceof compiler_1.TmplAstVariable) {
                    return tcbResolveVariable(binding, tcb, scope);
                }
                else {
                    throw new Error("Not handled: " + binding);
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
            // AST instances representing variables and references look very similar to property reads from
            // the component context: both have the shape PropertyRead(ImplicitReceiver, 'propertyName').
            // `tcbExpression` will first try to `tcbResolve` the outer PropertyRead. If this works, it's
            // because the `BoundTarget` found an expression target for the whole expression, and therefore
            // `tcbExpression` will never attempt to `tcbResolve` the ImplicitReceiver of that PropertyRead.
            //
            // Therefore if `tcbResolve` is called on an `ImplicitReceiver`, it's because no outer
            // PropertyRead resolved to a variable or reference, and therefore this is a property read on
            // the component context itself.
            return ts.createIdentifier('ctx');
        }
        else {
            // This AST isn't special after all.
            return null;
        }
    }
    /**
     * Resolve a variable to an identifier that represents its value.
     */
    function tcbResolveVariable(binding, tcb, scope) {
        // Look to see whether the variable was already initialized. If so, just reuse it.
        var id = scope.getVariableId(binding);
        if (id !== null) {
            return id;
        }
        // Look for the template which declares this variable.
        var tmpl = tcb.boundTarget.getTemplateOfSymbol(binding);
        if (tmpl === null) {
            throw new Error("Expected TmplAstVariable to be mapped to a TmplAstTemplate");
        }
        // Look for a context variable for the template. This should've been declared before anything
        // that could reference the template's variables.
        var ctx = scope.getTemplateCtx(tmpl);
        if (ctx === null) {
            throw new Error('Expected template context to exist.');
        }
        // Allocate an identifier for the TmplAstVariable, and initialize it to a read of the variable on
        // the template context.
        id = scope.allocateVariableId(binding);
        var initializer = ts.createPropertyAccess(
        /* expression */ ctx, 
        /* name */ binding.value);
        // Declare the variable, and return its identifier.
        scope.addStatement(tsCreateVariable(id, initializer));
        return id;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWlMO0lBQ2pMLCtCQUFpQztJQUdqQyx5RUFBb0U7SUFHcEUsdUZBQTZDO0lBRzdDOzs7Ozs7Ozs7O09BVUc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsSUFBeUIsRUFBRSxJQUE0QixFQUN2RCxhQUE0QjtRQUM5QixJQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRSxJQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBVSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlFLE9BQU8sRUFBRSxDQUFDLHlCQUF5QjtRQUMvQixnQkFBZ0IsQ0FBQyxTQUFTO1FBQzFCLGVBQWUsQ0FBQyxTQUFTO1FBQ3pCLG1CQUFtQixDQUFDLFNBQVM7UUFDN0IsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNO1FBQ3RCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjO1FBQ3hDLGdCQUFnQixDQUFBLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxD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ZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBQcm9wZXJ0eVJlYWQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZUV4cHJlc3Npb259IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge1R5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2FzdFRvVHlwZXNjcmlwdH0gZnJvbSAnLi9leHByZXNzaW9uJztcblxuXG4vKipcbiAqIEdpdmVuIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIGZvciBhIGNvbXBvbmVudCwgYW5kIG1ldGFkYXRhIHJlZ2FyZGluZyB0aGF0IGNvbXBvbmVudCwgY29tcG9zZSBhXG4gKiBcInR5cGUgY2hlY2sgYmxvY2tcIiBmdW5jdGlvbi5cbiAqXG4gKiBXaGVuIHBhc3NlZCB0aHJvdWdoIFR5cGVTY3JpcHQncyBUeXBlQ2hlY2tlciwgdHlwZSBlcnJvcnMgdGhhdCBhcmlzZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2tcbiAqIGZ1bmN0aW9uIGluZGljYXRlIGlzc3VlcyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBUeXBlU2NyaXB0IG5vZGUgZm9yIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gKiBAcGFyYW0gbWV0YSBtZXRhZGF0YSBhYm91dCB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgYW5kIHRoZSBmdW5jdGlvbiBiZWluZyBnZW5lcmF0ZWQuXG4gKiBAcGFyYW0gaW1wb3J0TWFuYWdlciBhbiBgSW1wb3J0TWFuYWdlcmAgZm9yIHRoZSBmaWxlIGludG8gd2hpY2ggdGhlIFRDQiB3aWxsIGJlIHdyaXR0ZW4uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICBjb25zdCB0Y2IgPSBuZXcgQ29udGV4dChtZXRhLmJvdW5kVGFyZ2V0LCBub2RlLmdldFNvdXJjZUZpbGUoKSwgaW1wb3J0TWFuYWdlcik7XG4gIGNvbnN0IHNjb3BlID0gbmV3IFNjb3BlKHRjYik7XG4gIHRjYlByb2Nlc3NOb2RlcyhtZXRhLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCB0Y2IsIHNjb3BlKTtcblxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgc2NvcGUuZ2V0QmxvY2soKSldKTtcblxuICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBtZXRhLmZuTmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIG5vZGUudHlwZVBhcmFtZXRlcnMsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovW3RjYkN0eFBhcmFtKG5vZGUpXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbn1cblxuLyoqXG4gKiBPdmVyYWxsIGdlbmVyYXRpb24gY29udGV4dCBmb3IgdGhlIHR5cGUgY2hlY2sgYmxvY2suXG4gKlxuICogYENvbnRleHRgIGhhbmRsZXMgb3BlcmF0aW9ucyBkdXJpbmcgY29kZSBnZW5lcmF0aW9uIHdoaWNoIGFyZSBnbG9iYWwgd2l0aCByZXNwZWN0IHRvIHRoZSB3aG9sZVxuICogYmxvY2suIEl0J3MgcmVzcG9uc2libGUgZm9yIHZhcmlhYmxlIG5hbWUgYWxsb2NhdGlvbiBhbmQgbWFuYWdlbWVudCBvZiBhbnkgaW1wb3J0cyBuZWVkZWQuIEl0XG4gKiBhbHNvIGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZSBtZXRhZGF0YSBpdHNlbGYuXG4gKi9cbmNsYXNzIENvbnRleHQge1xuICBwcml2YXRlIG5leHRJZCA9IDE7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LFxuICAgICAgcHJpdmF0ZSBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBwcml2YXRlIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIpIHt9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGEgbmV3IHZhcmlhYmxlIG5hbWUgZm9yIHVzZSB3aXRoaW4gdGhlIGBDb250ZXh0YC5cbiAgICpcbiAgICogQ3VycmVudGx5IHRoaXMgdXNlcyBhIG1vbm90b25pY2FsbHkgaW5jcmVhc2luZyBjb3VudGVyLCBidXQgaW4gdGhlIGZ1dHVyZSB0aGUgdmFyaWFibGUgbmFtZVxuICAgKiBtaWdodCBjaGFuZ2UgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGRhdGEgYmVpbmcgc3RvcmVkLlxuICAgKi9cbiAgYWxsb2NhdGVJZCgpOiB0cy5JZGVudGlmaWVyIHsgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90JHt0aGlzLm5leHRJZCsrfWApOyB9XG5cbiAgLyoqXG4gICAqIFdyaXRlIGEgYHRzLkV4cHJlc3Npb25gIHRoYXQgcmVmZXJlbmNlcyB0aGUgZ2l2ZW4gbm9kZS5cbiAgICpcbiAgICogVGhpcyBtYXkgaW52b2x2ZSBpbXBvcnRpbmcgdGhlIG5vZGUgaW50byB0aGUgZmlsZSBpZiBpdCdzIG5vdCBkZWNsYXJlZCB0aGVyZSBhbHJlYWR5LlxuICAgKi9cbiAgcmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbmdFeHByID0gcmVmLnRvRXhwcmVzc2lvbih0aGlzLnNvdXJjZUZpbGUpO1xuICAgIGlmIChuZ0V4cHIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWFjaGFibGUgcmVmZXJlbmNlOiAke3JlZi5ub2RlfWApO1xuICAgIH1cblxuICAgIC8vIFVzZSBgdHJhbnNsYXRlRXhwcmVzc2lvbmAgdG8gY29udmVydCB0aGUgYEV4cHJlc3Npb25gIGludG8gYSBgdHMuRXhwcmVzc2lvbmAuXG4gICAgcmV0dXJuIHRyYW5zbGF0ZUV4cHJlc3Npb24obmdFeHByLCB0aGlzLmltcG9ydE1hbmFnZXIpO1xuICB9XG59XG5cbi8qKlxuICogTG9jYWwgc2NvcGUgd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrIGZvciBhIHBhcnRpY3VsYXIgdGVtcGxhdGUuXG4gKlxuICogVGhlIHRvcC1sZXZlbCB0ZW1wbGF0ZSBhbmQgZWFjaCBuZXN0ZWQgYDxuZy10ZW1wbGF0ZT5gIGhhdmUgdGhlaXIgb3duIGBTY29wZWAsIHdoaWNoIGV4aXN0IGluIGFcbiAqIGhpZXJhcmNoeS4gVGhlIHN0cnVjdHVyZSBvZiB0aGlzIGhpZXJhcmNoeSBtaXJyb3JzIHRoZSBzeW50YWN0aWMgc2NvcGVzIGluIHRoZSBnZW5lcmF0ZWQgdHlwZVxuICogY2hlY2sgYmxvY2ssIHdoZXJlIGVhY2ggbmVzdGVkIHRlbXBsYXRlIGlzIGVuY2FzZWQgaW4gYW4gYGlmYCBzdHJ1Y3R1cmUuXG4gKlxuICogQXMgYSB0ZW1wbGF0ZSBpcyBwcm9jZXNzZWQgaW4gYSBnaXZlbiBgU2NvcGVgLCBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB2aWEgYGFkZFN0YXRlbWVudCgpYC4gV2hlblxuICogdGhpcyBwcm9jZXNzaW5nIGlzIGNvbXBsZXRlLCB0aGUgYFNjb3BlYCBjYW4gYmUgdHVybmVkIGludG8gYSBgdHMuQmxvY2tgIHZpYSBgZ2V0QmxvY2soKWAuXG4gKi9cbmNsYXNzIFNjb3BlIHtcbiAgLyoqXG4gICAqIE1hcCBvZiBub2RlcyB0byBpbmZvcm1hdGlvbiBhYm91dCB0aGF0IG5vZGUgd2l0aGluIHRoZSBUQ0IuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCB0aGlzIHN0b3JlcyB0aGUgYHRzLklkZW50aWZpZXJgIHdpdGhpbiB0aGUgVENCIGZvciBhbiBlbGVtZW50IG9yIDxuZy10ZW1wbGF0ZT4uXG4gICAqL1xuICBwcml2YXRlIGVsZW1lbnREYXRhID0gbmV3IE1hcDxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIFRjYk5vZGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW1tZWRpYXRlbHkgbmVzdGVkIDxuZy10ZW1wbGF0ZT5zICh3aXRoaW4gdGhpcyBgU2NvcGVgKSB0byB0aGUgYHRzLklkZW50aWZpZXJgIG9mIHRoZWlyXG4gICAqIHJlbmRlcmluZyBjb250ZXh0cy5cbiAgICovXG4gIHByaXZhdGUgdGVtcGxhdGVDdHggPSBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZSwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHZhcmlhYmxlcyBkZWNsYXJlZCBvbiB0aGUgdGVtcGxhdGUgdGhhdCBjcmVhdGVkIHRoaXMgYFNjb3BlYCB0byB0aGVpciBgdHMuSWRlbnRpZmllcmBzXG4gICAqIHdpdGhpbiB0aGUgVENCLlxuICAgKi9cbiAgcHJpdmF0ZSB2YXJNYXAgPSBuZXcgTWFwPFRtcGxBc3RWYXJpYWJsZSwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBwYXJlbnQ6IFNjb3BlfG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlkZW50aWZpZXIgd2l0aGluIHRoZSBUQ0IgZm9yIGEgZ2l2ZW4gYFRtcGxBc3RFbGVtZW50YC5cbiAgICovXG4gIGdldEVsZW1lbnRJZChlbDogVG1wbEFzdEVsZW1lbnQpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldEVsZW1lbnREYXRhKGVsLCBmYWxzZSk7XG4gICAgaWYgKGRhdGEgIT09IG51bGwgJiYgZGF0YS5odG1sTm9kZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRhdGEuaHRtbE5vZGU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBhcmVudCAhPT0gbnVsbCA/IHRoaXMucGFyZW50LmdldEVsZW1lbnRJZChlbCkgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaWRlbnRpZmllciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICBnZXREaXJlY3RpdmVJZChlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuSWRlbnRpZmllclxuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldEVsZW1lbnREYXRhKGVsLCBmYWxzZSk7XG4gICAgaWYgKGRhdGEgIT09IG51bGwgJiYgZGF0YS5kaXJlY3RpdmVzICE9PSBudWxsICYmIGRhdGEuZGlyZWN0aXZlcy5oYXMoZGlyKSkge1xuICAgICAgcmV0dXJuIGRhdGEuZGlyZWN0aXZlcy5nZXQoZGlyKSAhO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgIT09IG51bGwgPyB0aGlzLnBhcmVudC5nZXREaXJlY3RpdmVJZChlbCwgZGlyKSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIG9mIGEgdGVtcGxhdGUncyByZW5kZXJpbmcgY29udGV4dC5cbiAgICovXG4gIGdldFRlbXBsYXRlQ3R4KHRtcGw6IFRtcGxBc3RUZW1wbGF0ZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVDdHguZ2V0KHRtcGwpIHx8XG4gICAgICAgICh0aGlzLnBhcmVudCAhPT0gbnVsbCA/IHRoaXMucGFyZW50LmdldFRlbXBsYXRlQ3R4KHRtcGwpIDogbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIG9mIGEgdGVtcGxhdGUgdmFyaWFibGUuXG4gICAqL1xuICBnZXRWYXJpYWJsZUlkKHY6IFRtcGxBc3RWYXJpYWJsZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMudmFyTWFwLmdldCh2KSB8fCAodGhpcy5wYXJlbnQgIT09IG51bGwgPyB0aGlzLnBhcmVudC5nZXRWYXJpYWJsZUlkKHYpIDogbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIGdpdmVuIHRlbXBsYXRlIGVsZW1lbnQuXG4gICAqL1xuICBhbGxvY2F0ZUVsZW1lbnRJZChlbDogVG1wbEFzdEVsZW1lbnQpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRFbGVtZW50RGF0YShlbCwgdHJ1ZSk7XG4gICAgaWYgKGRhdGEuaHRtbE5vZGUgPT09IG51bGwpIHtcbiAgICAgIGRhdGEuaHRtbE5vZGUgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLmh0bWxOb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBnaXZlbiB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAgICovXG4gIGFsbG9jYXRlVmFyaWFibGVJZCh2OiBUbXBsQXN0VmFyaWFibGUpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBpZiAoIXRoaXMudmFyTWFwLmhhcyh2KSkge1xuICAgICAgdGhpcy52YXJNYXAuc2V0KHYsIHRoaXMudGNiLmFsbG9jYXRlSWQoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnZhck1hcC5nZXQodikgITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhbiBpZGVudGlmaWVyIGZvciBhbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gZGlyZWN0aXZlIG9uIHRoZSBnaXZlbiB0ZW1wbGF0ZSBub2RlLlxuICAgKi9cbiAgYWxsb2NhdGVEaXJlY3RpdmVJZChlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTpcbiAgICAgIHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgdXAgdGhlIGRhdGEgZm9yIHRoaXMgdGVtcGxhdGUgbm9kZS5cbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRFbGVtZW50RGF0YShlbCwgdHJ1ZSk7XG5cbiAgICAvLyBMYXppbHkgcG9wdWxhdGUgdGhlIGRpcmVjdGl2ZXMgbWFwLCBpZiBpdCBleGlzdHMuXG4gICAgaWYgKGRhdGEuZGlyZWN0aXZlcyA9PT0gbnVsbCkge1xuICAgICAgZGF0YS5kaXJlY3RpdmVzID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdHMuSWRlbnRpZmllcj4oKTtcbiAgICB9XG4gICAgaWYgKCFkYXRhLmRpcmVjdGl2ZXMuaGFzKGRpcikpIHtcbiAgICAgIGRhdGEuZGlyZWN0aXZlcy5zZXQoZGlyLCB0aGlzLnRjYi5hbGxvY2F0ZUlkKCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5kaXJlY3RpdmVzLmdldChkaXIpICE7XG4gIH1cblxuICAvKipcbiAgICogQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIHJlbmRlcmluZyBjb250ZXh0IG9mIGEgZ2l2ZW4gdGVtcGxhdGUuXG4gICAqL1xuICBhbGxvY2F0ZVRlbXBsYXRlQ3R4KHRtcGw6IFRtcGxBc3RUZW1wbGF0ZSk6IHRzLklkZW50aWZpZXIge1xuICAgIGlmICghdGhpcy50ZW1wbGF0ZUN0eC5oYXModG1wbCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGVDdHguc2V0KHRtcGwsIHRoaXMudGNiLmFsbG9jYXRlSWQoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlQ3R4LmdldCh0bXBsKSAhO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHN0YXRlbWVudCB0byB0aGlzIHNjb3BlLlxuICAgKi9cbiAgYWRkU3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHZvaWQgeyB0aGlzLnN0YXRlbWVudHMucHVzaChzdG10KTsgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBgdHMuQmxvY2tgIGNvbnRhaW5pbmcgdGhlIHN0YXRlbWVudHMgaW4gdGhpcyBzY29wZS5cbiAgICovXG4gIGdldEJsb2NrKCk6IHRzLkJsb2NrIHsgcmV0dXJuIHRzLmNyZWF0ZUJsb2NrKHRoaXMuc3RhdGVtZW50cyk7IH1cblxuICAvKipcbiAgICogSW50ZXJuYWwgaGVscGVyIHRvIGdldCB0aGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMgY2FuIGVpdGhlciByZXR1cm4gYG51bGxgIGlmIHRoZSBkYXRhIGlzIG5vdCBwcmVzZW50ICh3aGVuIHRoZSBgYWxsb2NgIGZsYWcgaXMgc2V0IHRvXG4gICAqIGBmYWxzZWApLCBvciBpdCBjYW4gaW5pdGlhbGl6ZSB0aGUgZGF0YSBmb3IgdGhlIGVsZW1lbnQgKHdoZW4gYGFsbG9jYCBpcyBgdHJ1ZWApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFbGVtZW50RGF0YShlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBhbGxvYzogdHJ1ZSk6IFRjYk5vZGVEYXRhO1xuICBwcml2YXRlIGdldEVsZW1lbnREYXRhKGVsOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIGFsbG9jOiBmYWxzZSk6IFRjYk5vZGVEYXRhfG51bGw7XG4gIHByaXZhdGUgZ2V0RWxlbWVudERhdGEoZWw6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgYWxsb2M6IGJvb2xlYW4pOiBUY2JOb2RlRGF0YXxudWxsIHtcbiAgICBpZiAoYWxsb2MgJiYgIXRoaXMuZWxlbWVudERhdGEuaGFzKGVsKSkge1xuICAgICAgdGhpcy5lbGVtZW50RGF0YS5zZXQoZWwsIHtodG1sTm9kZTogbnVsbCwgZGlyZWN0aXZlczogbnVsbH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbGVtZW50RGF0YS5nZXQoZWwpIHx8IG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBEYXRhIHN0b3JlZCBmb3IgYSB0ZW1wbGF0ZSBub2RlIGluIGEgVENCLlxuICovXG5pbnRlcmZhY2UgVGNiTm9kZURhdGEge1xuICAvKipcbiAgICogVGhlIGlkZW50aWZpZXIgb2YgdGhlIG5vZGUgZWxlbWVudCBpbnN0YW5jZSwgaWYgYW55LlxuICAgKi9cbiAgaHRtbE5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbDtcbiAgZGlyZWN0aXZlczogTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0cy5JZGVudGlmaWVyPnxudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSB0aGUgYGN0eGAgcGFyYW1ldGVyIHRvIHRoZSB0b3AtbGV2ZWwgVENCIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBwYXJhbWV0ZXIgd2l0aCBhIHR5cGUgZXF1aXZhbGVudCB0byB0aGUgY29tcG9uZW50IHR5cGUsIHdpdGggYWxsIGdlbmVyaWMgdHlwZVxuICogcGFyYW1ldGVycyBsaXN0ZWQgKHdpdGhvdXQgdGhlaXIgZ2VuZXJpYyBib3VuZHMpLlxuICovXG5mdW5jdGlvbiB0Y2JDdHhQYXJhbShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICBsZXQgdHlwZUFyZ3VtZW50czogdHMuVHlwZU5vZGVbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIC8vIENoZWNrIGlmIHRoZSBjb21wb25lbnQgaXMgZ2VuZXJpYywgYW5kIHBhc3MgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgaWYgc28uXG4gIGlmIChub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUocGFyYW0ubmFtZSwgdW5kZWZpbmVkKSk7XG4gIH1cbiAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKG5vZGUubmFtZSAhLCB0eXBlQXJndW1lbnRzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2N0eCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBhcnJheSBvZiB0ZW1wbGF0ZSBub2RlcyBhbmQgZ2VuZXJhdGUgdHlwZSBjaGVja2luZyBjb2RlIGZvciB0aGVtIHdpdGhpbiB0aGUgZ2l2ZW5cbiAqIGBTY29wZWAuXG4gKlxuICogQHBhcmFtIG5vZGVzIHRlbXBsYXRlIG5vZGUgYXJyYXkgb3ZlciB3aGljaCB0byBpdGVyYXRlLlxuICogQHBhcmFtIHRjYiBjb250ZXh0IG9mIHRoZSBvdmVyYWxsIHR5cGUgY2hlY2sgYmxvY2suXG4gKiBAcGFyYW0gc2NvcGVcbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc05vZGVzKG5vZGVzOiBUbXBsQXN0Tm9kZVtdLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHZvaWQge1xuICBub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgIC8vIFByb2Nlc3MgZWxlbWVudHMsIHRlbXBsYXRlcywgYW5kIGJpbmRpbmdzLlxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHRjYlByb2Nlc3NFbGVtZW50KG5vZGUsIHRjYiwgc2NvcGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgdGNiUHJvY2Vzc1RlbXBsYXRlRGVjbGFyYXRpb24obm9kZSwgdGNiLCBzY29wZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24obm9kZS52YWx1ZSwgdGNiLCBzY29wZSk7XG4gICAgICBzY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlU3RhdGVtZW50KGV4cHIpKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gZWxlbWVudCwgZ2VuZXJhdGluZyB0eXBlIGNoZWNraW5nIGNvZGUgZm9yIGl0LCBpdHMgZGlyZWN0aXZlcywgYW5kIGl0cyBjaGlsZHJlbi5cbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc0VsZW1lbnQoZWw6IFRtcGxBc3RFbGVtZW50LCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLklkZW50aWZpZXIge1xuICBsZXQgaWQgPSBzY29wZS5nZXRFbGVtZW50SWQoZWwpO1xuICBpZiAoaWQgIT09IG51bGwpIHtcbiAgICAvLyBUaGlzIGVsZW1lbnQgaGFzIGJlZW4gcHJvY2Vzc2VkIGJlZm9yZS4gTm8gbmVlZCB0byBydW4gdGhyb3VnaCBpdCBhZ2Fpbi5cbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgaWQgPSBzY29wZS5hbGxvY2F0ZUVsZW1lbnRJZChlbCk7XG5cbiAgLy8gQWRkIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZWxlbWVudCB1c2luZyBkb2N1bWVudC5jcmVhdGVFbGVtZW50LlxuICBzY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdHNDcmVhdGVFbGVtZW50KGVsLm5hbWUpKSk7XG5cblxuICAvLyBDb25zdHJ1Y3QgYSBzZXQgb2YgYWxsIHRoZSBpbnB1dCBiaW5kaW5ncy4gQW55dGhpbmcgbWF0Y2hlZCBieSBkaXJlY3RpdmVzIHdpbGwgYmUgcmVtb3ZlZCBmcm9tXG4gIC8vIHRoaXMgc2V0LiBUaGUgcmVzdCBhcmUgYmluZGluZ3MgYmVpbmcgbWFkZSBvbiB0aGUgZWxlbWVudCBpdHNlbGYuXG4gIGNvbnN0IGlucHV0cyA9IG5ldyBTZXQoXG4gICAgICBlbC5pbnB1dHMuZmlsdGVyKGlucHV0ID0+IGlucHV0LnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KS5tYXAoaW5wdXQgPT4gaW5wdXQubmFtZSkpO1xuXG4gIC8vIFByb2Nlc3MgZGlyZWN0aXZlcyBvZiB0aGUgbm9kZS5cbiAgdGNiUHJvY2Vzc0RpcmVjdGl2ZXMoZWwsIGlucHV0cywgdGNiLCBzY29wZSk7XG5cbiAgLy8gQXQgdGhpcyBwb2ludCwgYGlucHV0c2Agbm93IGNvbnRhaW5zIG9ubHkgdGhvc2UgYmluZGluZ3Mgbm90IG1hdGNoZWQgYnkgYW55IGRpcmVjdGl2ZS4gVGhlc2VcbiAgLy8gYmluZGluZ3MgZ28gdG8gdGhlIGVsZW1lbnQgaXRzZWxmLlxuICBpbnB1dHMuZm9yRWFjaChuYW1lID0+IHtcbiAgICBjb25zdCBiaW5kaW5nID0gZWwuaW5wdXRzLmZpbmQoaW5wdXQgPT4gaW5wdXQubmFtZSA9PT0gbmFtZSkgITtcbiAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihiaW5kaW5nLnZhbHVlLCB0Y2IsIHNjb3BlKTtcblxuICAgIGNvbnN0IHByb3AgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhpZCAhLCBuYW1lKTtcbiAgICBjb25zdCBhc3NpZ24gPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgZXhwcik7XG4gICAgc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZVN0YXRlbWVudChhc3NpZ24pKTtcbiAgfSk7XG5cbiAgLy8gUmVjdXJzZSBpbnRvIGNoaWxkcmVuLlxuICB0Y2JQcm9jZXNzTm9kZXMoZWwuY2hpbGRyZW4sIHRjYiwgc2NvcGUpO1xuXG4gIHJldHVybiBpZDtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFsbCB0aGUgZGlyZWN0aXZlcyBhc3NvY2lhdGVkIHdpdGggYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLlxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzRGlyZWN0aXZlcyhcbiAgICBlbDogVG1wbEFzdEVsZW1lbnQgfCBUbXBsQXN0VGVtcGxhdGUsIHVuY2xhaW1lZDogU2V0PHN0cmluZz4sIHRjYjogQ29udGV4dCxcbiAgICBzY29wZTogU2NvcGUpOiB2b2lkIHtcbiAgY29uc3QgZGlyZWN0aXZlcyA9IHRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGVsKTtcbiAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwpIHtcbiAgICAvLyBObyBkaXJlY3RpdmVzLCBub3RoaW5nIHRvIGRvLlxuICAgIHJldHVybjtcbiAgfVxuICBkaXJlY3RpdmVzLmZvckVhY2goZGlyID0+IHRjYlByb2Nlc3NEaXJlY3RpdmUoZWwsIGRpciwgdW5jbGFpbWVkLCB0Y2IsIHNjb3BlKSk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhIGRpcmVjdGl2ZSwgZ2VuZXJhdGluZyB0eXBlIGNoZWNraW5nIGNvZGUgZm9yIGl0LlxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzRGlyZWN0aXZlKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdW5jbGFpbWVkOiBTZXQ8c3RyaW5nPixcbiAgICB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLklkZW50aWZpZXIge1xuICBsZXQgaWQgPSBzY29wZS5nZXREaXJlY3RpdmVJZChlbCwgZGlyKTtcbiAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgLy8gVGhpcyBkaXJlY3RpdmUgaGFzIGJlZW4gcHJvY2Vzc2VkIGJlZm9yZS4gTm8gbmVlZCB0byBydW4gdGhyb3VnaCBpdCBhZ2Fpbi5cbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgaWQgPSBzY29wZS5hbGxvY2F0ZURpcmVjdGl2ZUlkKGVsLCBkaXIpO1xuXG4gIGNvbnN0IGJpbmRpbmdzID0gdGNiR2V0SW5wdXRCaW5kaW5nRXhwcmVzc2lvbnMoZWwsIGRpciwgdGNiLCBzY29wZSk7XG5cblxuICAvLyBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIHRoZSBkaXJlY3RpdmUgdG8gaW5mZXIgYSB0eXBlLCBhbmQgYXNzaWduIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UuXG4gIHNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCB0Y2JDYWxsVHlwZUN0b3IoZWwsIGRpciwgdGNiLCBzY29wZSwgYmluZGluZ3MpKSk7XG5cbiAgdGNiUHJvY2Vzc0JpbmRpbmdzKGlkLCBiaW5kaW5ncywgdW5jbGFpbWVkLCB0Y2IsIHNjb3BlKTtcblxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHRjYlByb2Nlc3NCaW5kaW5ncyhcbiAgICByZWN2OiB0cy5FeHByZXNzaW9uLCBiaW5kaW5nczogVGNiQmluZGluZ1tdLCB1bmNsYWltZWQ6IFNldDxzdHJpbmc+LCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlKTogdm9pZCB7XG4gIC8vIEl0ZXJhdGUgdGhyb3VnaCBhbGwgdGhlIGJpbmRpbmdzIHRoaXMgZGlyZWN0aXZlIGlzIGNvbnN1bWluZy5cbiAgYmluZGluZ3MuZm9yRWFjaChiaW5kaW5nID0+IHtcbiAgICAvLyBHZW5lcmF0ZSBhbiBhc3NpZ25tZW50IHN0YXRlbWVudCBmb3IgdGhpcyBiaW5kaW5nLlxuICAgIGNvbnN0IHByb3AgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhyZWN2LCBiaW5kaW5nLmZpZWxkKTtcbiAgICBjb25zdCBhc3NpZ24gPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgYmluZGluZy5leHByZXNzaW9uKTtcbiAgICBzY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlU3RhdGVtZW50KGFzc2lnbikpO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBiaW5kaW5nIGZyb20gdGhlIHNldCBvZiB1bmNsYWltZWQgaW5wdXRzLCBhcyB0aGlzIGRpcmVjdGl2ZSBoYXMgJ2NsYWltZWQnIGl0LlxuICAgIHVuY2xhaW1lZC5kZWxldGUoYmluZGluZy5wcm9wZXJ0eSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYSBuZXN0ZWQgPG5nLXRlbXBsYXRlPiwgZ2VuZXJhdGluZyB0eXBlLWNoZWNraW5nIGNvZGUgZm9yIGl0IGFuZCBpdHMgY2hpbGRyZW4uXG4gKlxuICogVGhlIG5lc3RlZCA8bmctdGVtcGxhdGU+IGlzIHJlcHJlc2VudGVkIHdpdGggYW4gYGlmYCBzdHJ1Y3R1cmUsIHdoaWNoIGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljYWxcbiAqIHNjb3BlIGZvciB0aGUgdHlwZSBjaGVja2luZyBjb2RlIGZvciB0aGUgdGVtcGxhdGUuIElmIHRoZSA8bmctdGVtcGxhdGU+IGhhcyBhbnkgZGlyZWN0aXZlcywgdGhleVxuICogY2FuIGluZmx1ZW5jZSB0eXBlIGluZmVyZW5jZSB3aXRoaW4gdGhlIGBpZmAgYmxvY2sgdGhyb3VnaCBkZWZpbmVkIGd1YXJkIGZ1bmN0aW9ucy5cbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc1RlbXBsYXRlRGVjbGFyYXRpb24odG1wbDogVG1wbEFzdFRlbXBsYXRlLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSkge1xuICAvLyBDcmVhdGUgYSBuZXcgU2NvcGUgdG8gcmVwcmVzZW50IGJpbmRpbmdzIGNhcHR1cmVkIGluIHRoZSB0ZW1wbGF0ZS5cbiAgY29uc3QgdG1wbFNjb3BlID0gbmV3IFNjb3BlKHRjYiwgc2NvcGUpO1xuXG4gIC8vIEFsbG9jYXRlIGEgdGVtcGxhdGUgY3R4IHZhcmlhYmxlIGFuZCBkZWNsYXJlIGl0IHdpdGggYW4gJ2FueScgdHlwZS5cbiAgY29uc3QgY3R4ID0gdG1wbFNjb3BlLmFsbG9jYXRlVGVtcGxhdGVDdHgodG1wbCk7XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGN0eCwgdHlwZSkpO1xuXG4gIC8vIFByb2Nlc3MgZGlyZWN0aXZlcyBvbiB0aGUgdGVtcGxhdGUuXG4gIHRjYlByb2Nlc3NEaXJlY3RpdmVzKHRtcGwsIG5ldyBTZXQoKSwgdGNiLCBzY29wZSk7XG5cbiAgLy8gUHJvY2VzcyB0aGUgdGVtcGxhdGUgaXRzZWxmIChpbnNpZGUgdGhlIGlubmVyIFNjb3BlKS5cbiAgdGNiUHJvY2Vzc05vZGVzKHRtcGwuY2hpbGRyZW4sIHRjYiwgdG1wbFNjb3BlKTtcblxuICAvLyBBbiBgaWZgIHdpbGwgYmUgY29uc3RydWN0ZWQsIHdpdGhpbiB3aGljaCB0aGUgdGVtcGxhdGUncyBjaGlsZHJlbiB3aWxsIGJlIHR5cGUgY2hlY2tlZC4gVGhlXG4gIC8vIGBpZmAgaXMgdXNlZCBmb3IgdHdvIHJlYXNvbnM6IGl0IGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljIHNjb3BlLCBpc29sYXRpbmcgdmFyaWFibGVzIGRlY2xhcmVkIGluXG4gIC8vIHRoZSB0ZW1wbGF0ZSdzIFRDQiBmcm9tIHRoZSBvdXRlciBjb250ZXh0LCBhbmQgaXQgYWxsb3dzIGFueSBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZXMgdG9cbiAgLy8gcGVyZm9ybSB0eXBlIG5hcnJvd2luZyBvZiBlaXRoZXIgZXhwcmVzc2lvbnMgb3IgdGhlIHRlbXBsYXRlJ3MgY29udGV4dC5cblxuICAvLyBUaGUgZ3VhcmQgaXMgdGhlIGBpZmAgYmxvY2sncyBjb25kaXRpb24uIEl0J3MgdXN1YWxseSBzZXQgdG8gYHRydWVgIGJ1dCBkaXJlY3RpdmVzIHRoYXQgZXhpc3RcbiAgLy8gb24gdGhlIHRlbXBsYXRlIGNhbiB0cmlnZ2VyIGV4dHJhIGd1YXJkIGV4cHJlc3Npb25zIHRoYXQgc2VydmUgdG8gbmFycm93IHR5cGVzIHdpdGhpbiB0aGVcbiAgLy8gYGlmYC4gYGd1YXJkYCBpcyBjYWxjdWxhdGVkIGJ5IHN0YXJ0aW5nIHdpdGggYHRydWVgIGFuZCBhZGRpbmcgb3RoZXIgY29uZGl0aW9ucyBhcyBuZWVkZWQuXG4gIC8vIENvbGxlY3QgdGhlc2UgaW50byBgZ3VhcmRzYCBieSBwcm9jZXNzaW5nIHRoZSBkaXJlY3RpdmVzLlxuICBjb25zdCBkaXJlY3RpdmVHdWFyZHM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZSh0bXBsKTtcbiAgaWYgKGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICBkaXJlY3RpdmVzLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGNvbnN0IGRpckluc3RJZCA9IHNjb3BlLmdldERpcmVjdGl2ZUlkKHRtcGwsIGRpcikgITtcbiAgICAgIGNvbnN0IGRpcklkID0gdGNiLnJlZmVyZW5jZShkaXIucmVmKTtcblxuICAgICAgLy8gVGhlcmUgYXJlIHR3byBraW5kcyBvZiBndWFyZHMuIFRlbXBsYXRlIGd1YXJkcyAobmdUZW1wbGF0ZUd1YXJkcykgYWxsb3cgdHlwZSBuYXJyb3dpbmcgb2ZcbiAgICAgIC8vIHRoZSBleHByZXNzaW9uIHBhc3NlZCB0byBhbiBASW5wdXQgb2YgdGhlIGRpcmVjdGl2ZS4gU2NhbiB0aGUgZGlyZWN0aXZlIHRvIHNlZSBpZiBpdCBoYXNcbiAgICAgIC8vIGFueSB0ZW1wbGF0ZSBndWFyZHMsIGFuZCBnZW5lcmF0ZSB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGRpci5uZ1RlbXBsYXRlR3VhcmRzLmZvckVhY2goaW5wdXROYW1lID0+IHtcbiAgICAgICAgLy8gRm9yIGVhY2ggdGVtcGxhdGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSwgbG9vayBmb3IgYSBiaW5kaW5nIHRvIHRoYXQgaW5wdXQuXG4gICAgICAgIGNvbnN0IGJvdW5kSW5wdXQgPSB0bXBsLmlucHV0cy5maW5kKGkgPT4gaS5uYW1lID09PSBpbnB1dE5hbWUpO1xuICAgICAgICBpZiAoYm91bmRJbnB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJvdW5kSW5wdXQudmFsdWUsIHRjYiwgc2NvcGUpO1xuICAgICAgICAgIC8vIENhbGwgdGhlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUgd2l0aCB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGFuZCB0aGF0XG4gICAgICAgICAgLy8gZXhwcmVzc2lvbi5cbiAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgYG5nVGVtcGxhdGVHdWFyZF8ke2lucHV0TmFtZX1gLCBbXG4gICAgICAgICAgICBkaXJJbnN0SWQsXG4gICAgICAgICAgICBleHByLFxuICAgICAgICAgIF0pO1xuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFRoZSBzZWNvbmQga2luZCBvZiBndWFyZCBpcyBhIHRlbXBsYXRlIGNvbnRleHQgZ3VhcmQuIFRoaXMgZ3VhcmQgbmFycm93cyB0aGUgdGVtcGxhdGVcbiAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgaWYgKGRpci5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkKSB7XG4gICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCAnbmdUZW1wbGF0ZUNvbnRleHRHdWFyZCcsIFtkaXJJbnN0SWQsIGN0eF0pO1xuICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IHRoZSBndWFyZCBpcyBzaW1wbHkgYHRydWVgLlxuICBsZXQgZ3VhcmQ6IHRzLkV4cHJlc3Npb24gPSB0cy5jcmVhdGVUcnVlKCk7XG5cbiAgLy8gSWYgdGhlcmUgYXJlIGFueSBndWFyZHMgZnJvbSBkaXJlY3RpdmVzLCB1c2UgdGhlbSBpbnN0ZWFkLlxuICBpZiAoZGlyZWN0aXZlR3VhcmRzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBQb3AgdGhlIGZpcnN0IHZhbHVlIGFuZCB1c2UgaXQgYXMgdGhlIGluaXRpYWxpemVyIHRvIHJlZHVjZSgpLiBUaGlzIHdheSwgYSBzaW5nbGUgZ3VhcmRcbiAgICAvLyB3aWxsIGJlIHVzZWQgb24gaXRzIG93biwgYnV0IHR3byBvciBtb3JlIHdpbGwgYmUgY29tYmluZWQgaW50byBiaW5hcnkgZXhwcmVzc2lvbnMuXG4gICAgZ3VhcmQgPSBkaXJlY3RpdmVHdWFyZHMucmVkdWNlKFxuICAgICAgICAoZXhwciwgZGlyR3VhcmQpID0+IHRzLmNyZWF0ZUJpbmFyeShleHByLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCBkaXJHdWFyZCksXG4gICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wb3AoKSAhKTtcbiAgfVxuXG4gIC8vIENvbnN0cnVjdCB0aGUgYGlmYCBibG9jayBmb3IgdGhlIHRlbXBsYXRlIHdpdGggdGhlIGdlbmVyYXRlZCBndWFyZCBleHByZXNzaW9uLlxuICBjb25zdCB0bXBsSWYgPSB0cy5jcmVhdGVJZihcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gZ3VhcmQsXG4gICAgICAvKiB0aGVuU3RhdGVtZW50ICovIHRtcGxTY29wZS5nZXRCbG9jaygpKTtcbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRtcGxJZik7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBgQVNUYCBleHByZXNzaW9uIGFuZCBjb252ZXJ0IGl0IGludG8gYSBgdHMuRXhwcmVzc2lvbmAsIGdlbmVyYXRpbmcgcmVmZXJlbmNlcyB0byB0aGVcbiAqIGNvcnJlY3QgaWRlbnRpZmllcnMgaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHRjYkV4cHJlc3Npb24oYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkIHdoaWNoXG4gIC8vIGludGVycHJldHMgc3BlY2lmaWMgZXhwcmVzc2lvbiBub2RlcyB0aGF0IGludGVyYWN0IHdpdGggdGhlIGBJbXBsaWNpdFJlY2VpdmVyYC4gVGhlc2Ugbm9kZXNcbiAgLy8gYWN0dWFsbHkgcmVmZXIgdG8gaWRlbnRpZmllcnMgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KGFzdCwgKGFzdCkgPT4gdGNiUmVzb2x2ZShhc3QsIHRjYiwgc2NvcGUpKTtcbn1cblxuLyoqXG4gKiBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIGEgZGlyZWN0aXZlIGluc3RhbmNlIG9uIGEgZ2l2ZW4gdGVtcGxhdGUgbm9kZSwgaW5mZXJyaW5nIGEgdHlwZSBmb3JcbiAqIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgZnJvbSBhbnkgYm91bmQgaW5wdXRzLlxuICovXG5mdW5jdGlvbiB0Y2JDYWxsVHlwZUN0b3IoXG4gICAgZWw6IFRtcGxBc3RFbGVtZW50IHwgVG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlLCBiaW5kaW5nczogVGNiQmluZGluZ1tdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGRpckNsYXNzID0gdGNiLnJlZmVyZW5jZShkaXIucmVmKTtcblxuICAvLyBDb25zdHJ1Y3QgYW4gYXJyYXkgb2YgYHRzLlByb3BlcnR5QXNzaWdubWVudGBzIGZvciBlYWNoIGlucHV0IG9mIHRoZSBkaXJlY3RpdmUgdGhhdCBoYXMgYVxuICAvLyBtYXRjaGluZyBiaW5kaW5nLlxuICBjb25zdCBtZW1iZXJzID0gYmluZGluZ3MubWFwKGIgPT4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KGIuZmllbGQsIGIuZXhwcmVzc2lvbikpO1xuXG4gIC8vIENhbGwgdGhlIGBuZ1R5cGVDdG9yYCBtZXRob2Qgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcywgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCBhcmd1bWVudCBjcmVhdGVkXG4gIC8vIGZyb20gdGhlIG1hdGNoZWQgaW5wdXRzLlxuICByZXR1cm4gdHNDYWxsTWV0aG9kKFxuICAgICAgLyogcmVjZWl2ZXIgKi8gZGlyQ2xhc3MsXG4gICAgICAvKiBtZXRob2ROYW1lICovICduZ1R5cGVDdG9yJyxcbiAgICAgIC8qIGFyZ3MgKi9bdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKV0pO1xufVxuXG5pbnRlcmZhY2UgVGNiQmluZGluZyB7XG4gIGZpZWxkOiBzdHJpbmc7XG4gIHByb3BlcnR5OiBzdHJpbmc7XG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG59XG5cbmZ1bmN0aW9uIHRjYkdldElucHV0QmluZGluZ0V4cHJlc3Npb25zKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdGNiOiBDb250ZXh0LFxuICAgIHNjb3BlOiBTY29wZSk6IFRjYkJpbmRpbmdbXSB7XG4gIGNvbnN0IGJpbmRpbmdzOiBUY2JCaW5kaW5nW10gPSBbXTtcbiAgLy8gYGRpci5pbnB1dHNgIGlzIGFuIG9iamVjdCBtYXAgb2YgZmllbGQgbmFtZXMgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcyB0byBwcm9wZXJ0eSBuYW1lcy5cbiAgLy8gVGhpcyBpcyBiYWNrd2FyZHMgZnJvbSB3aGF0J3MgbmVlZGVkIHRvIG1hdGNoIGJpbmRpbmdzIC0gYSBtYXAgb2YgcHJvcGVydGllcyB0byBmaWVsZCBuYW1lc1xuICAvLyBpcyBkZXNpcmVkLiBJbnZlcnQgYGRpci5pbnB1dHNgIGludG8gYHByb3BNYXRjaGAgdG8gY3JlYXRlIHRoaXMgbWFwLlxuICBjb25zdCBwcm9wTWF0Y2ggPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBpbnB1dHMgPSBkaXIuaW5wdXRzO1xuICBPYmplY3Qua2V5cyhpbnB1dHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICBBcnJheS5pc0FycmF5KGlucHV0c1trZXldKSA/IHByb3BNYXRjaC5zZXQoaW5wdXRzW2tleV1bMF0sIGtleSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcE1hdGNoLnNldChpbnB1dHNba2V5XSBhcyBzdHJpbmcsIGtleSk7XG4gIH0pO1xuXG4gIC8vIEFkZCBhIGJpbmRpbmcgZXhwcmVzc2lvbiB0byB0aGUgbWFwIGZvciBlYWNoIGlucHV0IG9mIHRoZSBkaXJlY3RpdmUgdGhhdCBoYXMgYVxuICAvLyBtYXRjaGluZyBiaW5kaW5nLlxuICBlbC5pbnB1dHMuZmlsdGVyKGlucHV0ID0+IHByb3BNYXRjaC5oYXMoaW5wdXQubmFtZSkpLmZvckVhY2goaW5wdXQgPT4ge1xuICAgIC8vIFByb2R1Y2UgYW4gZXhwcmVzc2lvbiByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHRoZSBiaW5kaW5nLlxuICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGlucHV0LnZhbHVlLCB0Y2IsIHNjb3BlKTtcblxuICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrLlxuICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgcHJvcGVydHk6IGlucHV0Lm5hbWUsXG4gICAgICBmaWVsZDogcHJvcE1hdGNoLmdldChpbnB1dC5uYW1lKSAhLFxuICAgICAgZXhwcmVzc2lvbjogZXhwcixcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZXhwcmVzc2lvbiB3aGljaCBpbnN0YW50aWF0ZXMgYW4gZWxlbWVudCBieSBpdHMgSFRNTCB0YWdOYW1lLlxuICpcbiAqIFRoYW5rcyB0byBuYXJyb3dpbmcgb2YgYGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoKWAsIHRoaXMgZXhwcmVzc2lvbiB3aWxsIGhhdmUgaXRzIHR5cGUgaW5mZXJyZWRcbiAqIGJhc2VkIG9uIHRoZSB0YWcgbmFtZSwgaW5jbHVkaW5nIGZvciBjdXN0b20gZWxlbWVudHMgdGhhdCBoYXZlIGFwcHJvcHJpYXRlIC5kLnRzIGRlZmluaXRpb25zLlxuICovXG5mdW5jdGlvbiB0c0NyZWF0ZUVsZW1lbnQodGFnTmFtZTogc3RyaW5nKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGNyZWF0ZUVsZW1lbnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlSWRlbnRpZmllcignZG9jdW1lbnQnKSwgJ2NyZWF0ZUVsZW1lbnQnKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIGNyZWF0ZUVsZW1lbnQsXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW3RzLmNyZWF0ZUxpdGVyYWwodGFnTmFtZSldKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuVmFyaWFibGVTdGF0ZW1lbnRgIHdoaWNoIGRlY2xhcmVzIGEgdmFyaWFibGUgd2l0aG91dCBleHBsaWNpdCBpbml0aWFsaXphdGlvbi5cbiAqXG4gKiBUaGUgaW5pdGlhbGl6ZXIgYG51bGwhYCBpcyB1c2VkIHRvIGJ5cGFzcyBzdHJpY3QgdmFyaWFibGUgaW5pdGlhbGl6YXRpb24gY2hlY2tzLlxuICpcbiAqIFVubGlrZSB3aXRoIGB0c0NyZWF0ZVZhcmlhYmxlYCwgdGhlIHR5cGUgb2YgdGhlIHZhcmlhYmxlIGlzIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICovXG5mdW5jdGlvbiB0c0RlY2xhcmVWYXJpYWJsZShpZDogdHMuSWRlbnRpZmllciwgdHlwZTogdHMuVHlwZU5vZGUpOiB0cy5WYXJpYWJsZVN0YXRlbWVudCB7XG4gIGNvbnN0IGRlY2wgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgLyogbmFtZSAqLyBpZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpO1xuICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovW2RlY2xdKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuVmFyaWFibGVTdGF0ZW1lbnRgIHRoYXQgaW5pdGlhbGl6ZXMgYSB2YXJpYWJsZSB3aXRoIGEgZ2l2ZW4gZXhwcmVzc2lvbi5cbiAqXG4gKiBVbmxpa2Ugd2l0aCBgdHNEZWNsYXJlVmFyaWFibGVgLCB0aGUgdHlwZSBvZiB0aGUgdmFyaWFibGUgaXMgaW5mZXJyZWQgZnJvbSB0aGUgaW5pdGlhbGl6ZXJcbiAqIGV4cHJlc3Npb24uXG4gKi9cbmZ1bmN0aW9uIHRzQ3JlYXRlVmFyaWFibGUoaWQ6IHRzLklkZW50aWZpZXIsIGluaXRpYWxpemVyOiB0cy5FeHByZXNzaW9uKTogdHMuVmFyaWFibGVTdGF0ZW1lbnQge1xuICBjb25zdCBkZWNsID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgIC8qIG5hbWUgKi8gaWQsXG4gICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIGluaXRpYWxpemVyKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRlY2xhcmF0aW9uTGlzdCAqL1tkZWNsXSk7XG59XG5cbi8qKlxuICogQ29uc3RydWN0IGEgYHRzLkNhbGxFeHByZXNzaW9uYCB0aGF0IGNhbGxzIGEgbWV0aG9kIG9uIGEgcmVjZWl2ZXIuXG4gKi9cbmZ1bmN0aW9uIHRzQ2FsbE1ldGhvZChcbiAgICByZWNlaXZlcjogdHMuRXhwcmVzc2lvbiwgbWV0aG9kTmFtZTogc3RyaW5nLCBhcmdzOiB0cy5FeHByZXNzaW9uW10gPSBbXSk6IHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgY29uc3QgbWV0aG9kQWNjZXNzID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVjZWl2ZXIsIG1ldGhvZE5hbWUpO1xuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gbWV0aG9kQWNjZXNzLFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqLyBhcmdzKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGFuIGBBU1RgIGV4cHJlc3Npb24gd2l0aGluIHRoZSBnaXZlbiBzY29wZS5cbiAqXG4gKiBTb21lIGBBU1RgIGV4cHJlc3Npb25zIHJlZmVyIHRvIHRvcC1sZXZlbCBjb25jZXB0cyAocmVmZXJlbmNlcywgdmFyaWFibGVzLCB0aGUgY29tcG9uZW50XG4gKiBjb250ZXh0KS4gVGhpcyBtZXRob2QgYXNzaXN0cyBpbiByZXNvbHZpbmcgdGhvc2UuXG4gKi9cbmZ1bmN0aW9uIHRjYlJlc29sdmUoYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgLy8gU2hvcnQgY2lyY3VpdCBmb3IgQVNUIHR5cGVzIHRoYXQgd29uJ3QgaGF2ZSBtYXBwaW5ncy5cbiAgaWYgKCEoYXN0IGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlciB8fCBhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSB0ZW1wbGF0ZSBtZXRhZGF0YSBoYXMgYm91bmQgYSB0YXJnZXQgZm9yIHRoaXMgZXhwcmVzc2lvbi4gSWYgc28sIHRoZW5cbiAgICAvLyByZXNvbHZlIHRoYXQgdGFyZ2V0LiBJZiBub3QsIHRoZW4gdGhlIGV4cHJlc3Npb24gaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbCBjb21wb25lbnRcbiAgICAvLyBjb250ZXh0LlxuICAgIGNvbnN0IGJpbmRpbmcgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmIChiaW5kaW5nICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIGV4cHJlc3Npb24gaGFzIGEgYmluZGluZyB0byBzb21lIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSBpbiB0aGUgdGVtcGxhdGUuIFJlc29sdmUgaXQuXG4gICAgICBpZiAoYmluZGluZyBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgICByZXR1cm4gdGNiUmVzb2x2ZVZhcmlhYmxlKGJpbmRpbmcsIHRjYiwgc2NvcGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgaGFuZGxlZDogJHtiaW5kaW5nfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIGEgUHJvcGVydHlSZWFkKEltcGxpY2l0UmVjZWl2ZXIpIGFuZCBwcm9iYWJseSByZWZlcnMgdG8gYSBwcm9wZXJ0eSBhY2Nlc3Mgb24gdGhlXG4gICAgICAvLyBjb21wb25lbnQgY29udGV4dC4gTGV0IGl0IGZhbGwgdGhyb3VnaCByZXNvbHV0aW9uIGhlcmUgc28gaXQgd2lsbCBiZSBjYXVnaHQgd2hlbiB0aGVcbiAgICAgIC8vIEltcGxpY2l0UmVjZWl2ZXIgaXMgcmVzb2x2ZWQgaW4gdGhlIGJyYW5jaCBiZWxvdy5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgLy8gQVNUIGluc3RhbmNlcyByZXByZXNlbnRpbmcgdmFyaWFibGVzIGFuZCByZWZlcmVuY2VzIGxvb2sgdmVyeSBzaW1pbGFyIHRvIHByb3BlcnR5IHJlYWRzIGZyb21cbiAgICAvLyB0aGUgY29tcG9uZW50IGNvbnRleHQ6IGJvdGggaGF2ZSB0aGUgc2hhcGUgUHJvcGVydHlSZWFkKEltcGxpY2l0UmVjZWl2ZXIsICdwcm9wZXJ0eU5hbWUnKS5cbiAgICAvLyBgdGNiRXhwcmVzc2lvbmAgd2lsbCBmaXJzdCB0cnkgdG8gYHRjYlJlc29sdmVgIHRoZSBvdXRlciBQcm9wZXJ0eVJlYWQuIElmIHRoaXMgd29ya3MsIGl0J3NcbiAgICAvLyBiZWNhdXNlIHRoZSBgQm91bmRUYXJnZXRgIGZvdW5kIGFuIGV4cHJlc3Npb24gdGFyZ2V0IGZvciB0aGUgd2hvbGUgZXhwcmVzc2lvbiwgYW5kIHRoZXJlZm9yZVxuICAgIC8vIGB0Y2JFeHByZXNzaW9uYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHRjYlJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXQgUHJvcGVydHlSZWFkLlxuICAgIC8vXG4gICAgLy8gVGhlcmVmb3JlIGlmIGB0Y2JSZXNvbHZlYCBpcyBjYWxsZWQgb24gYW4gYEltcGxpY2l0UmVjZWl2ZXJgLCBpdCdzIGJlY2F1c2Ugbm8gb3V0ZXJcbiAgICAvLyBQcm9wZXJ0eVJlYWQgcmVzb2x2ZWQgdG8gYSB2YXJpYWJsZSBvciByZWZlcmVuY2UsIGFuZCB0aGVyZWZvcmUgdGhpcyBpcyBhIHByb3BlcnR5IHJlYWQgb25cbiAgICAvLyB0aGUgY29tcG9uZW50IGNvbnRleHQgaXRzZWxmLlxuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIEFTVCBpc24ndCBzcGVjaWFsIGFmdGVyIGFsbC5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSB2YXJpYWJsZSB0byBhbiBpZGVudGlmaWVyIHRoYXQgcmVwcmVzZW50cyBpdHMgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHRjYlJlc29sdmVWYXJpYWJsZShiaW5kaW5nOiBUbXBsQXN0VmFyaWFibGUsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuSWRlbnRpZmllciB7XG4gIC8vIExvb2sgdG8gc2VlIHdoZXRoZXIgdGhlIHZhcmlhYmxlIHdhcyBhbHJlYWR5IGluaXRpYWxpemVkLiBJZiBzbywganVzdCByZXVzZSBpdC5cbiAgbGV0IGlkID0gc2NvcGUuZ2V0VmFyaWFibGVJZChiaW5kaW5nKTtcbiAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIHRlbXBsYXRlIHdoaWNoIGRlY2xhcmVzIHRoaXMgdmFyaWFibGUuXG4gIGNvbnN0IHRtcGwgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0VGVtcGxhdGVPZlN5bWJvbChiaW5kaW5nKTtcbiAgaWYgKHRtcGwgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFRtcGxBc3RWYXJpYWJsZSB0byBiZSBtYXBwZWQgdG8gYSBUbXBsQXN0VGVtcGxhdGVgKTtcbiAgfVxuICAvLyBMb29rIGZvciBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBzaG91bGQndmUgYmVlbiBkZWNsYXJlZCBiZWZvcmUgYW55dGhpbmdcbiAgLy8gdGhhdCBjb3VsZCByZWZlcmVuY2UgdGhlIHRlbXBsYXRlJ3MgdmFyaWFibGVzLlxuICBjb25zdCBjdHggPSBzY29wZS5nZXRUZW1wbGF0ZUN0eCh0bXBsKTtcbiAgaWYgKGN0eCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgdGVtcGxhdGUgY29udGV4dCB0byBleGlzdC4nKTtcbiAgfVxuXG4gIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGUgb25cbiAgLy8gdGhlIHRlbXBsYXRlIGNvbnRleHQuXG4gIGlkID0gc2NvcGUuYWxsb2NhdGVWYXJpYWJsZUlkKGJpbmRpbmcpO1xuICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyBjdHgsXG4gICAgICAvKiBuYW1lICovIGJpbmRpbmcudmFsdWUpO1xuXG4gIC8vIERlY2xhcmUgdGhlIHZhcmlhYmxlLCBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyLlxuICBzY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgcmV0dXJuIGlkO1xufVxuIl19