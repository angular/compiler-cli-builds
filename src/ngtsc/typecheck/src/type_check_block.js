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
    function generateTypeCheckBlock(node, meta, importManager, refEmitter) {
        var tcb = new Context(meta.boundTarget, node.getSourceFile(), importManager, refEmitter);
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
        function Context(boundTarget, sourceFile, importManager, refEmitter) {
            this.boundTarget = boundTarget;
            this.sourceFile = sourceFile;
            this.importManager = importManager;
            this.refEmitter = refEmitter;
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
            var ngExpr = this.refEmitter.emit(ref, this.sourceFile);
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
                    var boundInput = tmpl.inputs.find(function (i) { return i.name === inputName; }) ||
                        tmpl.templateAttrs.find(function (i) {
                            return i instanceof compiler_1.TmplAstBoundAttribute && i.name === inputName;
                        });
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
        el.inputs.forEach(processAttribute);
        if (el instanceof compiler_1.TmplAstTemplate) {
            el.templateAttrs.forEach(processAttribute);
        }
        return bindings;
        /**
         * Add a binding expression to the map for each input/template attribute of the directive that has
         * a matching binding.
         */
        function processAttribute(attr) {
            if (attr instanceof compiler_1.TmplAstBoundAttribute && propMatch.has(attr.name)) {
                // Produce an expression representing the value of the binding.
                var expr = tcbExpression(attr.value, tcb, scope);
                // Call the callback.
                bindings.push({
                    property: attr.name,
                    field: propMatch.get(attr.name),
                    expression: expr,
                });
            }
        }
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
            //
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
        // Look for a context variable for the template. This should've been declared before anything that
        // could reference the template's variables.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQThOO0lBQzlOLCtCQUFpQztJQUdqQyx5RUFBb0U7SUFHcEUsdUZBQTZDO0lBSTdDOzs7Ozs7Ozs7O09BVUc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsSUFBeUIsRUFBRSxJQUE0QixFQUFFLGFBQTRCLEVBQ3JGLFVBQTRCO1FBQzlCLElBQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMzRixJQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBVSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlFLE9BQU8sRUFBRSxDQUFDLHlCQUF5QjtRQUMvQixnQkFBZ0IsQ0FBQyxTQUFTO1FBQzFCLGVBQWUsQ0FBQyxTQUFTO1FBQ3pCLG1CQUFtQixDQUFDLFNBQVM7UUFDN0IsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNO1FBQ3RCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjO1FBQ3hDLGdCQUFnQixDQUFBLENBQUMs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RztRQUNqRyx3QkFBd0I7UUFDeEIsRUFBRSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QyxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsb0JBQW9CO1FBQ3ZDLGdCQUFnQixDQUFDLEdBQUc7UUFDcEIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU5QixtREFBbUQ7UUFDbkQsS0FBSyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN0RCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBCaW5kaW5nVHlwZSwgQm91bmRUYXJnZXQsIEltcGxpY2l0UmVjZWl2ZXIsIFByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRUZXh0LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlRXhwcmVzc2lvbn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7VHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7YXN0VG9UeXBlc2NyaXB0fSBmcm9tICcuL2V4cHJlc3Npb24nO1xuXG5cblxuLyoqXG4gKiBHaXZlbiBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBmb3IgYSBjb21wb25lbnQsIGFuZCBtZXRhZGF0YSByZWdhcmRpbmcgdGhhdCBjb21wb25lbnQsIGNvbXBvc2UgYVxuICogXCJ0eXBlIGNoZWNrIGJsb2NrXCIgZnVuY3Rpb24uXG4gKlxuICogV2hlbiBwYXNzZWQgdGhyb3VnaCBUeXBlU2NyaXB0J3MgVHlwZUNoZWNrZXIsIHR5cGUgZXJyb3JzIHRoYXQgYXJpc2Ugd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrXG4gKiBmdW5jdGlvbiBpbmRpY2F0ZSBpc3N1ZXMgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgVHlwZVNjcmlwdCBub2RlIGZvciB0aGUgY29tcG9uZW50IGNsYXNzLlxuICogQHBhcmFtIG1ldGEgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGFuZCB0aGUgZnVuY3Rpb24gYmVpbmcgZ2VuZXJhdGVkLlxuICogQHBhcmFtIGltcG9ydE1hbmFnZXIgYW4gYEltcG9ydE1hbmFnZXJgIGZvciB0aGUgZmlsZSBpbnRvIHdoaWNoIHRoZSBUQ0Igd2lsbCBiZSB3cml0dGVuLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICBub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHtcbiAgY29uc3QgdGNiID0gbmV3IENvbnRleHQobWV0YS5ib3VuZFRhcmdldCwgbm9kZS5nZXRTb3VyY2VGaWxlKCksIGltcG9ydE1hbmFnZXIsIHJlZkVtaXR0ZXIpO1xuICBjb25zdCBzY29wZSA9IG5ldyBTY29wZSh0Y2IpO1xuICB0Y2JQcm9jZXNzTm9kZXMobWV0YS5ib3VuZFRhcmdldC50YXJnZXQudGVtcGxhdGUgISwgdGNiLCBzY29wZSk7XG5cbiAgY29uc3QgYm9keSA9IHRzLmNyZWF0ZUJsb2NrKFt0cy5jcmVhdGVJZih0cy5jcmVhdGVUcnVlKCksIHNjb3BlLmdldEJsb2NrKCkpXSk7XG5cbiAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhc3Rlcmlza1Rva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gbWV0YS5mbk5hbWUsXG4gICAgICAvKiB0eXBlUGFyYW1ldGVycyAqLyBub2RlLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgLyogcGFyYW1ldGVycyAqL1t0Y2JDdHhQYXJhbShub2RlKV0sXG4gICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGJvZHkgKi8gYm9keSk7XG59XG5cbi8qKlxuICogT3ZlcmFsbCBnZW5lcmF0aW9uIGNvbnRleHQgZm9yIHRoZSB0eXBlIGNoZWNrIGJsb2NrLlxuICpcbiAqIGBDb250ZXh0YCBoYW5kbGVzIG9wZXJhdGlvbnMgZHVyaW5nIGNvZGUgZ2VuZXJhdGlvbiB3aGljaCBhcmUgZ2xvYmFsIHdpdGggcmVzcGVjdCB0byB0aGUgd2hvbGVcbiAqIGJsb2NrLiBJdCdzIHJlc3BvbnNpYmxlIGZvciB2YXJpYWJsZSBuYW1lIGFsbG9jYXRpb24gYW5kIG1hbmFnZW1lbnQgb2YgYW55IGltcG9ydHMgbmVlZGVkLiBJdFxuICogYWxzbyBjb250YWlucyB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaXRzZWxmLlxuICovXG5jbGFzcyBDb250ZXh0IHtcbiAgcHJpdmF0ZSBuZXh0SWQgPSAxO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgYm91bmRUYXJnZXQ6IEJvdW5kVGFyZ2V0PFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPixcbiAgICAgIHByaXZhdGUgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgcHJpdmF0ZSBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKSB7fVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhIG5ldyB2YXJpYWJsZSBuYW1lIGZvciB1c2Ugd2l0aGluIHRoZSBgQ29udGV4dGAuXG4gICAqXG4gICAqIEN1cnJlbnRseSB0aGlzIHVzZXMgYSBtb25vdG9uaWNhbGx5IGluY3JlYXNpbmcgY291bnRlciwgYnV0IGluIHRoZSBmdXR1cmUgdGhlIHZhcmlhYmxlIG5hbWVcbiAgICogbWlnaHQgY2hhbmdlIGRlcGVuZGluZyBvbiB0aGUgdHlwZSBvZiBkYXRhIGJlaW5nIHN0b3JlZC5cbiAgICovXG4gIGFsbG9jYXRlSWQoKTogdHMuSWRlbnRpZmllciB7IHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdCR7dGhpcy5uZXh0SWQrK31gKTsgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSBhIGB0cy5FeHByZXNzaW9uYCB0aGF0IHJlZmVyZW5jZXMgdGhlIGdpdmVuIG5vZGUuXG4gICAqXG4gICAqIFRoaXMgbWF5IGludm9sdmUgaW1wb3J0aW5nIHRoZSBub2RlIGludG8gdGhlIGZpbGUgaWYgaXQncyBub3QgZGVjbGFyZWQgdGhlcmUgYWxyZWFkeS5cbiAgICovXG4gIHJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG5nRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KHJlZiwgdGhpcy5zb3VyY2VGaWxlKTtcbiAgICBpZiAobmdFeHByID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVhY2hhYmxlIHJlZmVyZW5jZTogJHtyZWYubm9kZX1gKTtcbiAgICB9XG5cbiAgICAvLyBVc2UgYHRyYW5zbGF0ZUV4cHJlc3Npb25gIHRvIGNvbnZlcnQgdGhlIGBFeHByZXNzaW9uYCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLlxuICAgIHJldHVybiB0cmFuc2xhdGVFeHByZXNzaW9uKG5nRXhwciwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcbiAgfVxufVxuXG4vKipcbiAqIExvY2FsIHNjb3BlIHdpdGhpbiB0aGUgdHlwZSBjaGVjayBibG9jayBmb3IgYSBwYXJ0aWN1bGFyIHRlbXBsYXRlLlxuICpcbiAqIFRoZSB0b3AtbGV2ZWwgdGVtcGxhdGUgYW5kIGVhY2ggbmVzdGVkIGA8bmctdGVtcGxhdGU+YCBoYXZlIHRoZWlyIG93biBgU2NvcGVgLCB3aGljaCBleGlzdCBpbiBhXG4gKiBoaWVyYXJjaHkuIFRoZSBzdHJ1Y3R1cmUgb2YgdGhpcyBoaWVyYXJjaHkgbWlycm9ycyB0aGUgc3ludGFjdGljIHNjb3BlcyBpbiB0aGUgZ2VuZXJhdGVkIHR5cGVcbiAqIGNoZWNrIGJsb2NrLCB3aGVyZSBlYWNoIG5lc3RlZCB0ZW1wbGF0ZSBpcyBlbmNhc2VkIGluIGFuIGBpZmAgc3RydWN0dXJlLlxuICpcbiAqIEFzIGEgdGVtcGxhdGUgaXMgcHJvY2Vzc2VkIGluIGEgZ2l2ZW4gYFNjb3BlYCwgc3RhdGVtZW50cyBhcmUgYWRkZWQgdmlhIGBhZGRTdGF0ZW1lbnQoKWAuIFdoZW5cbiAqIHRoaXMgcHJvY2Vzc2luZyBpcyBjb21wbGV0ZSwgdGhlIGBTY29wZWAgY2FuIGJlIHR1cm5lZCBpbnRvIGEgYHRzLkJsb2NrYCB2aWEgYGdldEJsb2NrKClgLlxuICovXG5jbGFzcyBTY29wZSB7XG4gIC8qKlxuICAgKiBNYXAgb2Ygbm9kZXMgdG8gaW5mb3JtYXRpb24gYWJvdXQgdGhhdCBub2RlIHdpdGhpbiB0aGUgVENCLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgdGhpcyBzdG9yZXMgdGhlIGB0cy5JZGVudGlmaWVyYCB3aXRoaW4gdGhlIFRDQiBmb3IgYW4gZWxlbWVudCBvciA8bmctdGVtcGxhdGU+LlxuICAgKi9cbiAgcHJpdmF0ZSBlbGVtZW50RGF0YSA9IG5ldyBNYXA8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBUY2JOb2RlRGF0YT4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGltbWVkaWF0ZWx5IG5lc3RlZCA8bmctdGVtcGxhdGU+cyAod2l0aGluIHRoaXMgYFNjb3BlYCkgdG8gdGhlIGB0cy5JZGVudGlmaWVyYCBvZiB0aGVpclxuICAgKiByZW5kZXJpbmcgY29udGV4dHMuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlQ3R4ID0gbmV3IE1hcDxUbXBsQXN0VGVtcGxhdGUsIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiB2YXJpYWJsZXMgZGVjbGFyZWQgb24gdGhlIHRlbXBsYXRlIHRoYXQgY3JlYXRlZCB0aGlzIGBTY29wZWAgdG8gdGhlaXIgYHRzLklkZW50aWZpZXJgc1xuICAgKiB3aXRoaW4gdGhlIFRDQi5cbiAgICovXG4gIHByaXZhdGUgdmFyTWFwID0gbmV3IE1hcDxUbXBsQXN0VmFyaWFibGUsIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgLyoqXG4gICAqIFN0YXRlbWVudHMgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBwcml2YXRlIHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0Y2I6IENvbnRleHQsIHByaXZhdGUgcGFyZW50OiBTY29wZXxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIHdpdGhpbiB0aGUgVENCIGZvciBhIGdpdmVuIGBUbXBsQXN0RWxlbWVudGAuXG4gICAqL1xuICBnZXRFbGVtZW50SWQoZWw6IFRtcGxBc3RFbGVtZW50KTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRFbGVtZW50RGF0YShlbCwgZmFsc2UpO1xuICAgIGlmIChkYXRhICE9PSBudWxsICYmIGRhdGEuaHRtbE5vZGUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBkYXRhLmh0bWxOb2RlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgIT09IG51bGwgPyB0aGlzLnBhcmVudC5nZXRFbGVtZW50SWQoZWwpIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlkZW50aWZpZXIgb2YgYSBkaXJlY3RpdmUgaW5zdGFuY2Ugb24gYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLlxuICAgKi9cbiAgZ2V0RGlyZWN0aXZlSWQoZWw6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IHRzLklkZW50aWZpZXJcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRFbGVtZW50RGF0YShlbCwgZmFsc2UpO1xuICAgIGlmIChkYXRhICE9PSBudWxsICYmIGRhdGEuZGlyZWN0aXZlcyAhPT0gbnVsbCAmJiBkYXRhLmRpcmVjdGl2ZXMuaGFzKGRpcikpIHtcbiAgICAgIHJldHVybiBkYXRhLmRpcmVjdGl2ZXMuZ2V0KGRpcikgITtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGFyZW50ICE9PSBudWxsID8gdGhpcy5wYXJlbnQuZ2V0RGlyZWN0aXZlSWQoZWwsIGRpcikgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaWRlbnRpZmllciBvZiBhIHRlbXBsYXRlJ3MgcmVuZGVyaW5nIGNvbnRleHQuXG4gICAqL1xuICBnZXRUZW1wbGF0ZUN0eCh0bXBsOiBUbXBsQXN0VGVtcGxhdGUpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlQ3R4LmdldCh0bXBsKSB8fFxuICAgICAgICAodGhpcy5wYXJlbnQgIT09IG51bGwgPyB0aGlzLnBhcmVudC5nZXRUZW1wbGF0ZUN0eCh0bXBsKSA6IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaWRlbnRpZmllciBvZiBhIHRlbXBsYXRlIHZhcmlhYmxlLlxuICAgKi9cbiAgZ2V0VmFyaWFibGVJZCh2OiBUbXBsQXN0VmFyaWFibGUpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHJldHVybiB0aGlzLnZhck1hcC5nZXQodikgfHwgKHRoaXMucGFyZW50ICE9PSBudWxsID8gdGhpcy5wYXJlbnQuZ2V0VmFyaWFibGVJZCh2KSA6IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBnaXZlbiB0ZW1wbGF0ZSBlbGVtZW50LlxuICAgKi9cbiAgYWxsb2NhdGVFbGVtZW50SWQoZWw6IFRtcGxBc3RFbGVtZW50KTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RWxlbWVudERhdGEoZWwsIHRydWUpO1xuICAgIGlmIChkYXRhLmh0bWxOb2RlID09PSBudWxsKSB7XG4gICAgICBkYXRhLmh0bWxOb2RlID0gdGhpcy50Y2IuYWxsb2NhdGVJZCgpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5odG1sTm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhbiBpZGVudGlmaWVyIGZvciB0aGUgZ2l2ZW4gdGVtcGxhdGUgdmFyaWFibGUuXG4gICAqL1xuICBhbGxvY2F0ZVZhcmlhYmxlSWQodjogVG1wbEFzdFZhcmlhYmxlKTogdHMuSWRlbnRpZmllciB7XG4gICAgaWYgKCF0aGlzLnZhck1hcC5oYXModikpIHtcbiAgICAgIHRoaXMudmFyTWFwLnNldCh2LCB0aGlzLnRjYi5hbGxvY2F0ZUlkKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy52YXJNYXAuZ2V0KHYpICE7XG4gIH1cblxuICAvKipcbiAgICogQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgYW4gaW5zdGFuY2Ugb2YgdGhlIGdpdmVuIGRpcmVjdGl2ZSBvbiB0aGUgZ2l2ZW4gdGVtcGxhdGUgbm9kZS5cbiAgICovXG4gIGFsbG9jYXRlRGlyZWN0aXZlSWQoZWw6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6XG4gICAgICB0cy5JZGVudGlmaWVyIHtcbiAgICAvLyBMb29rIHVwIHRoZSBkYXRhIGZvciB0aGlzIHRlbXBsYXRlIG5vZGUuXG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RWxlbWVudERhdGEoZWwsIHRydWUpO1xuXG4gICAgLy8gTGF6aWx5IHBvcHVsYXRlIHRoZSBkaXJlY3RpdmVzIG1hcCwgaWYgaXQgZXhpc3RzLlxuICAgIGlmIChkYXRhLmRpcmVjdGl2ZXMgPT09IG51bGwpIHtcbiAgICAgIGRhdGEuZGlyZWN0aXZlcyA9IG5ldyBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRzLklkZW50aWZpZXI+KCk7XG4gICAgfVxuICAgIGlmICghZGF0YS5kaXJlY3RpdmVzLmhhcyhkaXIpKSB7XG4gICAgICBkYXRhLmRpcmVjdGl2ZXMuc2V0KGRpciwgdGhpcy50Y2IuYWxsb2NhdGVJZCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGEuZGlyZWN0aXZlcy5nZXQoZGlyKSAhO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSByZW5kZXJpbmcgY29udGV4dCBvZiBhIGdpdmVuIHRlbXBsYXRlLlxuICAgKi9cbiAgYWxsb2NhdGVUZW1wbGF0ZUN0eCh0bXBsOiBUbXBsQXN0VGVtcGxhdGUpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBpZiAoIXRoaXMudGVtcGxhdGVDdHguaGFzKHRtcGwpKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlQ3R4LnNldCh0bXBsLCB0aGlzLnRjYi5hbGxvY2F0ZUlkKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZUN0eC5nZXQodG1wbCkgITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBzdGF0ZW1lbnQgdG8gdGhpcyBzY29wZS5cbiAgICovXG4gIGFkZFN0YXRlbWVudChzdG10OiB0cy5TdGF0ZW1lbnQpOiB2b2lkIHsgdGhpcy5zdGF0ZW1lbnRzLnB1c2goc3RtdCk7IH1cblxuICAvKipcbiAgICogR2V0IGEgYHRzLkJsb2NrYCBjb250YWluaW5nIHRoZSBzdGF0ZW1lbnRzIGluIHRoaXMgc2NvcGUuXG4gICAqL1xuICBnZXRCbG9jaygpOiB0cy5CbG9jayB7IHJldHVybiB0cy5jcmVhdGVCbG9jayh0aGlzLnN0YXRlbWVudHMpOyB9XG5cbiAgLyoqXG4gICAqIEludGVybmFsIGhlbHBlciB0byBnZXQgdGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGNhbiBlaXRoZXIgcmV0dXJuIGBudWxsYCBpZiB0aGUgZGF0YSBpcyBub3QgcHJlc2VudCAod2hlbiB0aGUgYGFsbG9jYCBmbGFnIGlzIHNldCB0b1xuICAgKiBgZmFsc2VgKSwgb3IgaXQgY2FuIGluaXRpYWxpemUgdGhlIGRhdGEgZm9yIHRoZSBlbGVtZW50ICh3aGVuIGBhbGxvY2AgaXMgYHRydWVgKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0RWxlbWVudERhdGEoZWw6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgYWxsb2M6IHRydWUpOiBUY2JOb2RlRGF0YTtcbiAgcHJpdmF0ZSBnZXRFbGVtZW50RGF0YShlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBhbGxvYzogZmFsc2UpOiBUY2JOb2RlRGF0YXxudWxsO1xuICBwcml2YXRlIGdldEVsZW1lbnREYXRhKGVsOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIGFsbG9jOiBib29sZWFuKTogVGNiTm9kZURhdGF8bnVsbCB7XG4gICAgaWYgKGFsbG9jICYmICF0aGlzLmVsZW1lbnREYXRhLmhhcyhlbCkpIHtcbiAgICAgIHRoaXMuZWxlbWVudERhdGEuc2V0KGVsLCB7aHRtbE5vZGU6IG51bGwsIGRpcmVjdGl2ZXM6IG51bGx9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudERhdGEuZ2V0KGVsKSB8fCBudWxsO1xuICB9XG59XG5cbi8qKlxuICogRGF0YSBzdG9yZWQgZm9yIGEgdGVtcGxhdGUgbm9kZSBpbiBhIFRDQi5cbiAqL1xuaW50ZXJmYWNlIFRjYk5vZGVEYXRhIHtcbiAgLyoqXG4gICAqIFRoZSBpZGVudGlmaWVyIG9mIHRoZSBub2RlIGVsZW1lbnQgaW5zdGFuY2UsIGlmIGFueS5cbiAgICovXG4gIGh0bWxOb2RlOiB0cy5JZGVudGlmaWVyfG51bGw7XG4gIGRpcmVjdGl2ZXM6IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdHMuSWRlbnRpZmllcj58bnVsbDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgdGhlIGBjdHhgIHBhcmFtZXRlciB0byB0aGUgdG9wLWxldmVsIFRDQiBmdW5jdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgcGFyYW1ldGVyIHdpdGggYSB0eXBlIGVxdWl2YWxlbnQgdG8gdGhlIGNvbXBvbmVudCB0eXBlLCB3aXRoIGFsbCBnZW5lcmljIHR5cGVcbiAqIHBhcmFtZXRlcnMgbGlzdGVkICh3aXRob3V0IHRoZWlyIGdlbmVyaWMgYm91bmRzKS5cbiAqL1xuZnVuY3Rpb24gdGNiQ3R4UGFyYW0obm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uIHtcbiAgbGV0IHR5cGVBcmd1bWVudHM6IHRzLlR5cGVOb2RlW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvLyBDaGVjayBpZiB0aGUgY29tcG9uZW50IGlzIGdlbmVyaWMsIGFuZCBwYXNzIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIGlmIHNvLlxuICBpZiAobm9kZS50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdHlwZUFyZ3VtZW50cyA9XG4gICAgICAgIG5vZGUudHlwZVBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHBhcmFtLm5hbWUsIHVuZGVmaW5lZCkpO1xuICB9XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShub2RlLm5hbWUgISwgdHlwZUFyZ3VtZW50cyk7XG4gIHJldHVybiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAvKiBkZWNvcmF0b3JzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkb3REb3REb3RUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovICdjdHgnLFxuICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gYXJyYXkgb2YgdGVtcGxhdGUgbm9kZXMgYW5kIGdlbmVyYXRlIHR5cGUgY2hlY2tpbmcgY29kZSBmb3IgdGhlbSB3aXRoaW4gdGhlIGdpdmVuXG4gKiBgU2NvcGVgLlxuICpcbiAqIEBwYXJhbSBub2RlcyB0ZW1wbGF0ZSBub2RlIGFycmF5IG92ZXIgd2hpY2ggdG8gaXRlcmF0ZS5cbiAqIEBwYXJhbSB0Y2IgY29udGV4dCBvZiB0aGUgb3ZlcmFsbCB0eXBlIGNoZWNrIGJsb2NrLlxuICogQHBhcmFtIHNjb3BlXG4gKi9cbmZ1bmN0aW9uIHRjYlByb2Nlc3NOb2Rlcyhub2RlczogVG1wbEFzdE5vZGVbXSwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB2b2lkIHtcbiAgbm9kZXMuZm9yRWFjaChub2RlID0+IHtcbiAgICAvLyBQcm9jZXNzIGVsZW1lbnRzLCB0ZW1wbGF0ZXMsIGFuZCBiaW5kaW5ncy5cbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICB0Y2JQcm9jZXNzRWxlbWVudChub2RlLCB0Y2IsIHNjb3BlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIHRjYlByb2Nlc3NUZW1wbGF0ZURlY2xhcmF0aW9uKG5vZGUsIHRjYiwgc2NvcGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZFRleHQpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKG5vZGUudmFsdWUsIHRjYiwgc2NvcGUpO1xuICAgICAgc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZVN0YXRlbWVudChleHByKSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFuIGVsZW1lbnQsIGdlbmVyYXRpbmcgdHlwZSBjaGVja2luZyBjb2RlIGZvciBpdCwgaXRzIGRpcmVjdGl2ZXMsIGFuZCBpdHMgY2hpbGRyZW4uXG4gKi9cbmZ1bmN0aW9uIHRjYlByb2Nlc3NFbGVtZW50KGVsOiBUbXBsQXN0RWxlbWVudCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5JZGVudGlmaWVyIHtcbiAgbGV0IGlkID0gc2NvcGUuZ2V0RWxlbWVudElkKGVsKTtcbiAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgLy8gVGhpcyBlbGVtZW50IGhhcyBiZWVuIHByb2Nlc3NlZCBiZWZvcmUuIE5vIG5lZWQgdG8gcnVuIHRocm91Z2ggaXQgYWdhaW4uXG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGlkID0gc2NvcGUuYWxsb2NhdGVFbGVtZW50SWQoZWwpO1xuXG4gIC8vIEFkZCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGVsZW1lbnQgdXNpbmcgZG9jdW1lbnQuY3JlYXRlRWxlbWVudC5cbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIHRzQ3JlYXRlRWxlbWVudChlbC5uYW1lKSkpO1xuXG5cbiAgLy8gQ29uc3RydWN0IGEgc2V0IG9mIGFsbCB0aGUgaW5wdXQgYmluZGluZ3MuIEFueXRoaW5nIG1hdGNoZWQgYnkgZGlyZWN0aXZlcyB3aWxsIGJlIHJlbW92ZWQgZnJvbVxuICAvLyB0aGlzIHNldC4gVGhlIHJlc3QgYXJlIGJpbmRpbmdzIGJlaW5nIG1hZGUgb24gdGhlIGVsZW1lbnQgaXRzZWxmLlxuICBjb25zdCBpbnB1dHMgPSBuZXcgU2V0KFxuICAgICAgZWwuaW5wdXRzLmZpbHRlcihpbnB1dCA9PiBpbnB1dC50eXBlID09PSBCaW5kaW5nVHlwZS5Qcm9wZXJ0eSkubWFwKGlucHV0ID0+IGlucHV0Lm5hbWUpKTtcblxuICAvLyBQcm9jZXNzIGRpcmVjdGl2ZXMgb2YgdGhlIG5vZGUuXG4gIHRjYlByb2Nlc3NEaXJlY3RpdmVzKGVsLCBpbnB1dHMsIHRjYiwgc2NvcGUpO1xuXG4gIC8vIEF0IHRoaXMgcG9pbnQsIGBpbnB1dHNgIG5vdyBjb250YWlucyBvbmx5IHRob3NlIGJpbmRpbmdzIG5vdCBtYXRjaGVkIGJ5IGFueSBkaXJlY3RpdmUuIFRoZXNlXG4gIC8vIGJpbmRpbmdzIGdvIHRvIHRoZSBlbGVtZW50IGl0c2VsZi5cbiAgaW5wdXRzLmZvckVhY2gobmFtZSA9PiB7XG4gICAgY29uc3QgYmluZGluZyA9IGVsLmlucHV0cy5maW5kKGlucHV0ID0+IGlucHV0Lm5hbWUgPT09IG5hbWUpICE7XG4gICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYmluZGluZy52YWx1ZSwgdGNiLCBzY29wZSk7XG5cbiAgICBjb25zdCBwcm9wID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoaWQgISwgbmFtZSk7XG4gICAgY29uc3QgYXNzaWduID0gdHMuY3JlYXRlQmluYXJ5KHByb3AsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGV4cHIpO1xuICAgIHNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVTdGF0ZW1lbnQoYXNzaWduKSk7XG4gIH0pO1xuXG4gIC8vIFJlY3Vyc2UgaW50byBjaGlsZHJlbi5cbiAgdGNiUHJvY2Vzc05vZGVzKGVsLmNoaWxkcmVuLCB0Y2IsIHNjb3BlKTtcblxuICByZXR1cm4gaWQ7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbGwgdGhlIGRpcmVjdGl2ZXMgYXNzb2NpYXRlZCB3aXRoIGEgZ2l2ZW4gdGVtcGxhdGUgbm9kZS5cbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc0RpcmVjdGl2ZXMoXG4gICAgZWw6IFRtcGxBc3RFbGVtZW50IHwgVG1wbEFzdFRlbXBsYXRlLCB1bmNsYWltZWQ6IFNldDxzdHJpbmc+LCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlKTogdm9pZCB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShlbCk7XG4gIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgLy8gTm8gZGlyZWN0aXZlcywgbm90aGluZyB0byBkby5cbiAgICByZXR1cm47XG4gIH1cbiAgZGlyZWN0aXZlcy5mb3JFYWNoKGRpciA9PiB0Y2JQcm9jZXNzRGlyZWN0aXZlKGVsLCBkaXIsIHVuY2xhaW1lZCwgdGNiLCBzY29wZSkpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYSBkaXJlY3RpdmUsIGdlbmVyYXRpbmcgdHlwZSBjaGVja2luZyBjb2RlIGZvciBpdC5cbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc0RpcmVjdGl2ZShcbiAgICBlbDogVG1wbEFzdEVsZW1lbnQgfCBUbXBsQXN0VGVtcGxhdGUsIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHVuY2xhaW1lZDogU2V0PHN0cmluZz4sXG4gICAgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5JZGVudGlmaWVyIHtcbiAgbGV0IGlkID0gc2NvcGUuZ2V0RGlyZWN0aXZlSWQoZWwsIGRpcik7XG4gIGlmIChpZCAhPT0gbnVsbCkge1xuICAgIC8vIFRoaXMgZGlyZWN0aXZlIGhhcyBiZWVuIHByb2Nlc3NlZCBiZWZvcmUuIE5vIG5lZWQgdG8gcnVuIHRocm91Z2ggaXQgYWdhaW4uXG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGlkID0gc2NvcGUuYWxsb2NhdGVEaXJlY3RpdmVJZChlbCwgZGlyKTtcblxuICBjb25zdCBiaW5kaW5ncyA9IHRjYkdldElucHV0QmluZGluZ0V4cHJlc3Npb25zKGVsLCBkaXIsIHRjYiwgc2NvcGUpO1xuXG5cbiAgLy8gQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiB0aGUgZGlyZWN0aXZlIHRvIGluZmVyIGEgdHlwZSwgYW5kIGFzc2lnbiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlLlxuICBzY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdGNiQ2FsbFR5cGVDdG9yKGVsLCBkaXIsIHRjYiwgc2NvcGUsIGJpbmRpbmdzKSkpO1xuXG4gIHRjYlByb2Nlc3NCaW5kaW5ncyhpZCwgYmluZGluZ3MsIHVuY2xhaW1lZCwgdGNiLCBzY29wZSk7XG5cbiAgcmV0dXJuIGlkO1xufVxuXG5mdW5jdGlvbiB0Y2JQcm9jZXNzQmluZGluZ3MoXG4gICAgcmVjdjogdHMuRXhwcmVzc2lvbiwgYmluZGluZ3M6IFRjYkJpbmRpbmdbXSwgdW5jbGFpbWVkOiBTZXQ8c3RyaW5nPiwgdGNiOiBDb250ZXh0LFxuICAgIHNjb3BlOiBTY29wZSk6IHZvaWQge1xuICAvLyBJdGVyYXRlIHRocm91Z2ggYWxsIHRoZSBiaW5kaW5ncyB0aGlzIGRpcmVjdGl2ZSBpcyBjb25zdW1pbmcuXG4gIGJpbmRpbmdzLmZvckVhY2goYmluZGluZyA9PiB7XG4gICAgLy8gR2VuZXJhdGUgYW4gYXNzaWdubWVudCBzdGF0ZW1lbnQgZm9yIHRoaXMgYmluZGluZy5cbiAgICBjb25zdCBwcm9wID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVjdiwgYmluZGluZy5maWVsZCk7XG4gICAgY29uc3QgYXNzaWduID0gdHMuY3JlYXRlQmluYXJ5KHByb3AsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGJpbmRpbmcuZXhwcmVzc2lvbik7XG4gICAgc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZVN0YXRlbWVudChhc3NpZ24pKTtcblxuICAgIC8vIFJlbW92ZSB0aGUgYmluZGluZyBmcm9tIHRoZSBzZXQgb2YgdW5jbGFpbWVkIGlucHV0cywgYXMgdGhpcyBkaXJlY3RpdmUgaGFzICdjbGFpbWVkJyBpdC5cbiAgICB1bmNsYWltZWQuZGVsZXRlKGJpbmRpbmcucHJvcGVydHkpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGEgbmVzdGVkIDxuZy10ZW1wbGF0ZT4sIGdlbmVyYXRpbmcgdHlwZS1jaGVja2luZyBjb2RlIGZvciBpdCBhbmQgaXRzIGNoaWxkcmVuLlxuICpcbiAqIFRoZSBuZXN0ZWQgPG5nLXRlbXBsYXRlPiBpcyByZXByZXNlbnRlZCB3aXRoIGFuIGBpZmAgc3RydWN0dXJlLCB3aGljaCBjcmVhdGVzIGEgbmV3IHN5bnRhY3RpY2FsXG4gKiBzY29wZSBmb3IgdGhlIHR5cGUgY2hlY2tpbmcgY29kZSBmb3IgdGhlIHRlbXBsYXRlLiBJZiB0aGUgPG5nLXRlbXBsYXRlPiBoYXMgYW55IGRpcmVjdGl2ZXMsIHRoZXlcbiAqIGNhbiBpbmZsdWVuY2UgdHlwZSBpbmZlcmVuY2Ugd2l0aGluIHRoZSBgaWZgIGJsb2NrIHRocm91Z2ggZGVmaW5lZCBndWFyZCBmdW5jdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIHRjYlByb2Nlc3NUZW1wbGF0ZURlY2xhcmF0aW9uKHRtcGw6IFRtcGxBc3RUZW1wbGF0ZSwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpIHtcbiAgLy8gQ3JlYXRlIGEgbmV3IFNjb3BlIHRvIHJlcHJlc2VudCBiaW5kaW5ncyBjYXB0dXJlZCBpbiB0aGUgdGVtcGxhdGUuXG4gIGNvbnN0IHRtcGxTY29wZSA9IG5ldyBTY29wZSh0Y2IsIHNjb3BlKTtcblxuICAvLyBBbGxvY2F0ZSBhIHRlbXBsYXRlIGN0eCB2YXJpYWJsZSBhbmQgZGVjbGFyZSBpdCB3aXRoIGFuICdhbnknIHR5cGUuXG4gIGNvbnN0IGN0eCA9IHRtcGxTY29wZS5hbGxvY2F0ZVRlbXBsYXRlQ3R4KHRtcGwpO1xuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gIHNjb3BlLmFkZFN0YXRlbWVudCh0c0RlY2xhcmVWYXJpYWJsZShjdHgsIHR5cGUpKTtcblxuICAvLyBQcm9jZXNzIGRpcmVjdGl2ZXMgb24gdGhlIHRlbXBsYXRlLlxuICB0Y2JQcm9jZXNzRGlyZWN0aXZlcyh0bXBsLCBuZXcgU2V0KCksIHRjYiwgc2NvcGUpO1xuXG4gIC8vIFByb2Nlc3MgdGhlIHRlbXBsYXRlIGl0c2VsZiAoaW5zaWRlIHRoZSBpbm5lciBTY29wZSkuXG4gIHRjYlByb2Nlc3NOb2Rlcyh0bXBsLmNoaWxkcmVuLCB0Y2IsIHRtcGxTY29wZSk7XG5cbiAgLy8gQW4gYGlmYCB3aWxsIGJlIGNvbnN0cnVjdGVkLCB3aXRoaW4gd2hpY2ggdGhlIHRlbXBsYXRlJ3MgY2hpbGRyZW4gd2lsbCBiZSB0eXBlIGNoZWNrZWQuIFRoZVxuICAvLyBgaWZgIGlzIHVzZWQgZm9yIHR3byByZWFzb25zOiBpdCBjcmVhdGVzIGEgbmV3IHN5bnRhY3RpYyBzY29wZSwgaXNvbGF0aW5nIHZhcmlhYmxlcyBkZWNsYXJlZCBpblxuICAvLyB0aGUgdGVtcGxhdGUncyBUQ0IgZnJvbSB0aGUgb3V0ZXIgY29udGV4dCwgYW5kIGl0IGFsbG93cyBhbnkgZGlyZWN0aXZlcyBvbiB0aGUgdGVtcGxhdGVzIHRvXG4gIC8vIHBlcmZvcm0gdHlwZSBuYXJyb3dpbmcgb2YgZWl0aGVyIGV4cHJlc3Npb25zIG9yIHRoZSB0ZW1wbGF0ZSdzIGNvbnRleHQuXG5cbiAgLy8gVGhlIGd1YXJkIGlzIHRoZSBgaWZgIGJsb2NrJ3MgY29uZGl0aW9uLiBJdCdzIHVzdWFsbHkgc2V0IHRvIGB0cnVlYCBidXQgZGlyZWN0aXZlcyB0aGF0IGV4aXN0XG4gIC8vIG9uIHRoZSB0ZW1wbGF0ZSBjYW4gdHJpZ2dlciBleHRyYSBndWFyZCBleHByZXNzaW9ucyB0aGF0IHNlcnZlIHRvIG5hcnJvdyB0eXBlcyB3aXRoaW4gdGhlXG4gIC8vIGBpZmAuIGBndWFyZGAgaXMgY2FsY3VsYXRlZCBieSBzdGFydGluZyB3aXRoIGB0cnVlYCBhbmQgYWRkaW5nIG90aGVyIGNvbmRpdGlvbnMgYXMgbmVlZGVkLlxuICAvLyBDb2xsZWN0IHRoZXNlIGludG8gYGd1YXJkc2AgYnkgcHJvY2Vzc2luZyB0aGUgZGlyZWN0aXZlcy5cbiAgY29uc3QgZGlyZWN0aXZlR3VhcmRzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcblxuICBjb25zdCBkaXJlY3RpdmVzID0gdGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUodG1wbCk7XG4gIGlmIChkaXJlY3RpdmVzICE9PSBudWxsKSB7XG4gICAgZGlyZWN0aXZlcy5mb3JFYWNoKGRpciA9PiB7XG4gICAgICBjb25zdCBkaXJJbnN0SWQgPSBzY29wZS5nZXREaXJlY3RpdmVJZCh0bXBsLCBkaXIpICE7XG4gICAgICBjb25zdCBkaXJJZCA9IHRjYi5yZWZlcmVuY2UoZGlyLnJlZik7XG5cbiAgICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ3VhcmRzLiBUZW1wbGF0ZSBndWFyZHMgKG5nVGVtcGxhdGVHdWFyZHMpIGFsbG93IHR5cGUgbmFycm93aW5nIG9mXG4gICAgICAvLyB0aGUgZXhwcmVzc2lvbiBwYXNzZWQgdG8gYW4gQElucHV0IG9mIHRoZSBkaXJlY3RpdmUuIFNjYW4gdGhlIGRpcmVjdGl2ZSB0byBzZWUgaWYgaXQgaGFzXG4gICAgICAvLyBhbnkgdGVtcGxhdGUgZ3VhcmRzLCBhbmQgZ2VuZXJhdGUgdGhlbSBpZiBuZWVkZWQuXG4gICAgICBkaXIubmdUZW1wbGF0ZUd1YXJkcy5mb3JFYWNoKGlucHV0TmFtZSA9PiB7XG4gICAgICAgIC8vIEZvciBlYWNoIHRlbXBsYXRlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUsIGxvb2sgZm9yIGEgYmluZGluZyB0byB0aGF0IGlucHV0LlxuICAgICAgICBjb25zdCBib3VuZElucHV0ID0gdG1wbC5pbnB1dHMuZmluZChpID0+IGkubmFtZSA9PT0gaW5wdXROYW1lKSB8fFxuICAgICAgICAgICAgdG1wbC50ZW1wbGF0ZUF0dHJzLmZpbmQoXG4gICAgICAgICAgICAgICAgKGk6IFRtcGxBc3RUZXh0QXR0cmlidXRlIHwgVG1wbEFzdEJvdW5kQXR0cmlidXRlKTogaSBpcyBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgPT5cbiAgICAgICAgICAgICAgICAgICAgaSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBpLm5hbWUgPT09IGlucHV0TmFtZSk7XG4gICAgICAgIGlmIChib3VuZElucHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBzdWNoIGEgYmluZGluZywgZ2VuZXJhdGUgYW4gZXhwcmVzc2lvbiBmb3IgaXQuXG4gICAgICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYm91bmRJbnB1dC52YWx1ZSwgdGNiLCBzY29wZSk7XG4gICAgICAgICAgLy8gQ2FsbCB0aGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSB3aXRoIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgYW5kIHRoYXRcbiAgICAgICAgICAvLyBleHByZXNzaW9uLlxuICAgICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCBgbmdUZW1wbGF0ZUd1YXJkXyR7aW5wdXROYW1lfWAsIFtcbiAgICAgICAgICAgIGRpckluc3RJZCxcbiAgICAgICAgICAgIGV4cHIsXG4gICAgICAgICAgXSk7XG4gICAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gVGhlIHNlY29uZCBraW5kIG9mIGd1YXJkIGlzIGEgdGVtcGxhdGUgY29udGV4dCBndWFyZC4gVGhpcyBndWFyZCBuYXJyb3dzIHRoZSB0ZW1wbGF0ZVxuICAgICAgLy8gcmVuZGVyaW5nIGNvbnRleHQgdmFyaWFibGUgYGN0eGAuXG4gICAgICBpZiAoZGlyLmhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQpIHtcbiAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsICduZ1RlbXBsYXRlQ29udGV4dEd1YXJkJywgW2Rpckluc3RJZCwgY3R4XSk7XG4gICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIEJ5IGRlZmF1bHQgdGhlIGd1YXJkIGlzIHNpbXBseSBgdHJ1ZWAuXG4gIGxldCBndWFyZDogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZVRydWUoKTtcblxuICAvLyBJZiB0aGVyZSBhcmUgYW55IGd1YXJkcyBmcm9tIGRpcmVjdGl2ZXMsIHVzZSB0aGVtIGluc3RlYWQuXG4gIGlmIChkaXJlY3RpdmVHdWFyZHMubGVuZ3RoID4gMCkge1xuICAgIC8vIFBvcCB0aGUgZmlyc3QgdmFsdWUgYW5kIHVzZSBpdCBhcyB0aGUgaW5pdGlhbGl6ZXIgdG8gcmVkdWNlKCkuIFRoaXMgd2F5LCBhIHNpbmdsZSBndWFyZFxuICAgIC8vIHdpbGwgYmUgdXNlZCBvbiBpdHMgb3duLCBidXQgdHdvIG9yIG1vcmUgd2lsbCBiZSBjb21iaW5lZCBpbnRvIGJpbmFyeSBleHByZXNzaW9ucy5cbiAgICBndWFyZCA9IGRpcmVjdGl2ZUd1YXJkcy5yZWR1Y2UoXG4gICAgICAgIChleHByLCBkaXJHdWFyZCkgPT4gdHMuY3JlYXRlQmluYXJ5KGV4cHIsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIGRpckd1YXJkKSxcbiAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnBvcCgpICEpO1xuICB9XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBgaWZgIGJsb2NrIGZvciB0aGUgdGVtcGxhdGUgd2l0aCB0aGUgZ2VuZXJhdGVkIGd1YXJkIGV4cHJlc3Npb24uXG4gIGNvbnN0IHRtcGxJZiA9IHRzLmNyZWF0ZUlmKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyBndWFyZCxcbiAgICAgIC8qIHRoZW5TdGF0ZW1lbnQgKi8gdG1wbFNjb3BlLmdldEJsb2NrKCkpO1xuICBzY29wZS5hZGRTdGF0ZW1lbnQodG1wbElmKTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFuIGBBU1RgIGV4cHJlc3Npb24gYW5kIGNvbnZlcnQgaXQgaW50byBhIGB0cy5FeHByZXNzaW9uYCwgZ2VuZXJhdGluZyByZWZlcmVuY2VzIHRvIHRoZVxuICogY29ycmVjdCBpZGVudGlmaWVycyBpbiB0aGUgY3VycmVudCBzY29wZS5cbiAqL1xuZnVuY3Rpb24gdGNiRXhwcmVzc2lvbihhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgLy8gYGFzdFRvVHlwZXNjcmlwdGAgYWN0dWFsbHkgZG9lcyB0aGUgY29udmVyc2lvbi4gQSBzcGVjaWFsIHJlc29sdmVyIGB0Y2JSZXNvbHZlYCBpcyBwYXNzZWQgd2hpY2hcbiAgLy8gaW50ZXJwcmV0cyBzcGVjaWZpYyBleHByZXNzaW9uIG5vZGVzIHRoYXQgaW50ZXJhY3Qgd2l0aCB0aGUgYEltcGxpY2l0UmVjZWl2ZXJgLiBUaGVzZSBub2Rlc1xuICAvLyBhY3R1YWxseSByZWZlciB0byBpZGVudGlmaWVycyB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gIHJldHVybiBhc3RUb1R5cGVzY3JpcHQoYXN0LCAoYXN0KSA9PiB0Y2JSZXNvbHZlKGFzdCwgdGNiLCBzY29wZSkpO1xufVxuXG4vKipcbiAqIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgYSBkaXJlY3RpdmUgaW5zdGFuY2Ugb24gYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLCBpbmZlcnJpbmcgYSB0eXBlIGZvclxuICogdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBmcm9tIGFueSBib3VuZCBpbnB1dHMuXG4gKi9cbmZ1bmN0aW9uIHRjYkNhbGxUeXBlQ3RvcihcbiAgICBlbDogVG1wbEFzdEVsZW1lbnQgfCBUbXBsQXN0VGVtcGxhdGUsIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCxcbiAgICBzY29wZTogU2NvcGUsIGJpbmRpbmdzOiBUY2JCaW5kaW5nW10pOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgZGlyQ2xhc3MgPSB0Y2IucmVmZXJlbmNlKGRpci5yZWYpO1xuXG4gIC8vIENvbnN0cnVjdCBhbiBhcnJheSBvZiBgdHMuUHJvcGVydHlBc3NpZ25tZW50YHMgZm9yIGVhY2ggaW5wdXQgb2YgdGhlIGRpcmVjdGl2ZSB0aGF0IGhhcyBhXG4gIC8vIG1hdGNoaW5nIGJpbmRpbmcuXG4gIGNvbnN0IG1lbWJlcnMgPSBiaW5kaW5ncy5tYXAoYiA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoYi5maWVsZCwgYi5leHByZXNzaW9uKSk7XG5cbiAgLy8gQ2FsbCB0aGUgYG5nVHlwZUN0b3JgIG1ldGhvZCBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzLCB3aXRoIGFuIG9iamVjdCBsaXRlcmFsIGFyZ3VtZW50IGNyZWF0ZWRcbiAgLy8gZnJvbSB0aGUgbWF0Y2hlZCBpbnB1dHMuXG4gIHJldHVybiB0c0NhbGxNZXRob2QoXG4gICAgICAvKiByZWNlaXZlciAqLyBkaXJDbGFzcyxcbiAgICAgIC8qIG1ldGhvZE5hbWUgKi8gJ25nVHlwZUN0b3InLFxuICAgICAgLyogYXJncyAqL1t0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG1lbWJlcnMpXSk7XG59XG5cbmludGVyZmFjZSBUY2JCaW5kaW5nIHtcbiAgZmllbGQ6IHN0cmluZztcbiAgcHJvcGVydHk6IHN0cmluZztcbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuZnVuY3Rpb24gdGNiR2V0SW5wdXRCaW5kaW5nRXhwcmVzc2lvbnMoXG4gICAgZWw6IFRtcGxBc3RFbGVtZW50IHwgVG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlKTogVGNiQmluZGluZ1tdIHtcbiAgY29uc3QgYmluZGluZ3M6IFRjYkJpbmRpbmdbXSA9IFtdO1xuICAvLyBgZGlyLmlucHV0c2AgaXMgYW4gb2JqZWN0IG1hcCBvZiBmaWVsZCBuYW1lcyBvbiB0aGUgZGlyZWN0aXZlIGNsYXNzIHRvIHByb3BlcnR5IG5hbWVzLlxuICAvLyBUaGlzIGlzIGJhY2t3YXJkcyBmcm9tIHdoYXQncyBuZWVkZWQgdG8gbWF0Y2ggYmluZGluZ3MgLSBhIG1hcCBvZiBwcm9wZXJ0aWVzIHRvIGZpZWxkIG5hbWVzXG4gIC8vIGlzIGRlc2lyZWQuIEludmVydCBgZGlyLmlucHV0c2AgaW50byBgcHJvcE1hdGNoYCB0byBjcmVhdGUgdGhpcyBtYXAuXG4gIGNvbnN0IHByb3BNYXRjaCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGlucHV0cyA9IGRpci5pbnB1dHM7XG4gIE9iamVjdC5rZXlzKGlucHV0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgIEFycmF5LmlzQXJyYXkoaW5wdXRzW2tleV0pID8gcHJvcE1hdGNoLnNldChpbnB1dHNba2V5XVswXSwga2V5KSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wTWF0Y2guc2V0KGlucHV0c1trZXldIGFzIHN0cmluZywga2V5KTtcbiAgfSk7XG5cbiAgZWwuaW5wdXRzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIGlmIChlbCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIGVsLnRlbXBsYXRlQXR0cnMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgfVxuICByZXR1cm4gYmluZGluZ3M7XG5cbiAgLyoqXG4gICAqIEFkZCBhIGJpbmRpbmcgZXhwcmVzc2lvbiB0byB0aGUgbWFwIGZvciBlYWNoIGlucHV0L3RlbXBsYXRlIGF0dHJpYnV0ZSBvZiB0aGUgZGlyZWN0aXZlIHRoYXQgaGFzXG4gICAqIGEgbWF0Y2hpbmcgYmluZGluZy5cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NBdHRyaWJ1dGUoYXR0cjogVG1wbEFzdEJvdW5kQXR0cmlidXRlIHwgVG1wbEFzdFRleHRBdHRyaWJ1dGUpOiB2b2lkIHtcbiAgICBpZiAoYXR0ciBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSAmJiBwcm9wTWF0Y2guaGFzKGF0dHIubmFtZSkpIHtcbiAgICAgIC8vIFByb2R1Y2UgYW4gZXhwcmVzc2lvbiByZXByZXNlbnRpbmcgdGhlIHZhbHVlIG9mIHRoZSBiaW5kaW5nLlxuICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24oYXR0ci52YWx1ZSwgdGNiLCBzY29wZSk7XG4gICAgICAvLyBDYWxsIHRoZSBjYWxsYmFjay5cbiAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICBwcm9wZXJ0eTogYXR0ci5uYW1lLFxuICAgICAgICBmaWVsZDogcHJvcE1hdGNoLmdldChhdHRyLm5hbWUpICEsXG4gICAgICAgIGV4cHJlc3Npb246IGV4cHIsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZXhwcmVzc2lvbiB3aGljaCBpbnN0YW50aWF0ZXMgYW4gZWxlbWVudCBieSBpdHMgSFRNTCB0YWdOYW1lLlxuICpcbiAqIFRoYW5rcyB0byBuYXJyb3dpbmcgb2YgYGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoKWAsIHRoaXMgZXhwcmVzc2lvbiB3aWxsIGhhdmUgaXRzIHR5cGUgaW5mZXJyZWRcbiAqIGJhc2VkIG9uIHRoZSB0YWcgbmFtZSwgaW5jbHVkaW5nIGZvciBjdXN0b20gZWxlbWVudHMgdGhhdCBoYXZlIGFwcHJvcHJpYXRlIC5kLnRzIGRlZmluaXRpb25zLlxuICovXG5mdW5jdGlvbiB0c0NyZWF0ZUVsZW1lbnQodGFnTmFtZTogc3RyaW5nKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGNyZWF0ZUVsZW1lbnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlSWRlbnRpZmllcignZG9jdW1lbnQnKSwgJ2NyZWF0ZUVsZW1lbnQnKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIGNyZWF0ZUVsZW1lbnQsXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW3RzLmNyZWF0ZUxpdGVyYWwodGFnTmFtZSldKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuVmFyaWFibGVTdGF0ZW1lbnRgIHdoaWNoIGRlY2xhcmVzIGEgdmFyaWFibGUgd2l0aG91dCBleHBsaWNpdCBpbml0aWFsaXphdGlvbi5cbiAqXG4gKiBUaGUgaW5pdGlhbGl6ZXIgYG51bGwhYCBpcyB1c2VkIHRvIGJ5cGFzcyBzdHJpY3QgdmFyaWFibGUgaW5pdGlhbGl6YXRpb24gY2hlY2tzLlxuICpcbiAqIFVubGlrZSB3aXRoIGB0c0NyZWF0ZVZhcmlhYmxlYCwgdGhlIHR5cGUgb2YgdGhlIHZhcmlhYmxlIGlzIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxuICovXG5mdW5jdGlvbiB0c0RlY2xhcmVWYXJpYWJsZShpZDogdHMuSWRlbnRpZmllciwgdHlwZTogdHMuVHlwZU5vZGUpOiB0cy5WYXJpYWJsZVN0YXRlbWVudCB7XG4gIGNvbnN0IGRlY2wgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgLyogbmFtZSAqLyBpZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSkpO1xuICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovW2RlY2xdKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgdHMuVmFyaWFibGVTdGF0ZW1lbnRgIHRoYXQgaW5pdGlhbGl6ZXMgYSB2YXJpYWJsZSB3aXRoIGEgZ2l2ZW4gZXhwcmVzc2lvbi5cbiAqXG4gKiBVbmxpa2Ugd2l0aCBgdHNEZWNsYXJlVmFyaWFibGVgLCB0aGUgdHlwZSBvZiB0aGUgdmFyaWFibGUgaXMgaW5mZXJyZWQgZnJvbSB0aGUgaW5pdGlhbGl6ZXJcbiAqIGV4cHJlc3Npb24uXG4gKi9cbmZ1bmN0aW9uIHRzQ3JlYXRlVmFyaWFibGUoaWQ6IHRzLklkZW50aWZpZXIsIGluaXRpYWxpemVyOiB0cy5FeHByZXNzaW9uKTogdHMuVmFyaWFibGVTdGF0ZW1lbnQge1xuICBjb25zdCBkZWNsID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgIC8qIG5hbWUgKi8gaWQsXG4gICAgICAvKiB0eXBlICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIGluaXRpYWxpemVyKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRlY2xhcmF0aW9uTGlzdCAqL1tkZWNsXSk7XG59XG5cbi8qKlxuICogQ29uc3RydWN0IGEgYHRzLkNhbGxFeHByZXNzaW9uYCB0aGF0IGNhbGxzIGEgbWV0aG9kIG9uIGEgcmVjZWl2ZXIuXG4gKi9cbmZ1bmN0aW9uIHRzQ2FsbE1ldGhvZChcbiAgICByZWNlaXZlcjogdHMuRXhwcmVzc2lvbiwgbWV0aG9kTmFtZTogc3RyaW5nLCBhcmdzOiB0cy5FeHByZXNzaW9uW10gPSBbXSk6IHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgY29uc3QgbWV0aG9kQWNjZXNzID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVjZWl2ZXIsIG1ldGhvZE5hbWUpO1xuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gbWV0aG9kQWNjZXNzLFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqLyBhcmdzKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGFuIGBBU1RgIGV4cHJlc3Npb24gd2l0aGluIHRoZSBnaXZlbiBzY29wZS5cbiAqXG4gKiBTb21lIGBBU1RgIGV4cHJlc3Npb25zIHJlZmVyIHRvIHRvcC1sZXZlbCBjb25jZXB0cyAocmVmZXJlbmNlcywgdmFyaWFibGVzLCB0aGUgY29tcG9uZW50XG4gKiBjb250ZXh0KS4gVGhpcyBtZXRob2QgYXNzaXN0cyBpbiByZXNvbHZpbmcgdGhvc2UuXG4gKi9cbmZ1bmN0aW9uIHRjYlJlc29sdmUoYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgLy8gU2hvcnQgY2lyY3VpdCBmb3IgQVNUIHR5cGVzIHRoYXQgd29uJ3QgaGF2ZSBtYXBwaW5ncy5cbiAgaWYgKCEoYXN0IGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlciB8fCBhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkICYmIGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSB0ZW1wbGF0ZSBtZXRhZGF0YSBoYXMgYm91bmQgYSB0YXJnZXQgZm9yIHRoaXMgZXhwcmVzc2lvbi4gSWYgc28sIHRoZW5cbiAgICAvLyByZXNvbHZlIHRoYXQgdGFyZ2V0LiBJZiBub3QsIHRoZW4gdGhlIGV4cHJlc3Npb24gaXMgcmVmZXJlbmNpbmcgdGhlIHRvcC1sZXZlbCBjb21wb25lbnRcbiAgICAvLyBjb250ZXh0LlxuICAgIGNvbnN0IGJpbmRpbmcgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmIChiaW5kaW5nICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIGV4cHJlc3Npb24gaGFzIGEgYmluZGluZyB0byBzb21lIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSBpbiB0aGUgdGVtcGxhdGUuIFJlc29sdmUgaXQuXG4gICAgICBpZiAoYmluZGluZyBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgICByZXR1cm4gdGNiUmVzb2x2ZVZhcmlhYmxlKGJpbmRpbmcsIHRjYiwgc2NvcGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgaGFuZGxlZDogJHtiaW5kaW5nfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIGEgUHJvcGVydHlSZWFkKEltcGxpY2l0UmVjZWl2ZXIpIGFuZCBwcm9iYWJseSByZWZlcnMgdG8gYSBwcm9wZXJ0eSBhY2Nlc3Mgb24gdGhlXG4gICAgICAvLyBjb21wb25lbnQgY29udGV4dC4gTGV0IGl0IGZhbGwgdGhyb3VnaCByZXNvbHV0aW9uIGhlcmUgc28gaXQgd2lsbCBiZSBjYXVnaHQgd2hlbiB0aGVcbiAgICAgIC8vIEltcGxpY2l0UmVjZWl2ZXIgaXMgcmVzb2x2ZWQgaW4gdGhlIGJyYW5jaCBiZWxvdy5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgLy8gQVNUIGluc3RhbmNlcyByZXByZXNlbnRpbmcgdmFyaWFibGVzIGFuZCByZWZlcmVuY2VzIGxvb2sgdmVyeSBzaW1pbGFyIHRvIHByb3BlcnR5IHJlYWRzIGZyb21cbiAgICAvLyB0aGUgY29tcG9uZW50IGNvbnRleHQ6IGJvdGggaGF2ZSB0aGUgc2hhcGUgUHJvcGVydHlSZWFkKEltcGxpY2l0UmVjZWl2ZXIsICdwcm9wZXJ0eU5hbWUnKS5cbiAgICAvL1xuICAgIC8vIGB0Y2JFeHByZXNzaW9uYCB3aWxsIGZpcnN0IHRyeSB0byBgdGNiUmVzb2x2ZWAgdGhlIG91dGVyIFByb3BlcnR5UmVhZC4gSWYgdGhpcyB3b3JrcywgaXQnc1xuICAgIC8vIGJlY2F1c2UgdGhlIGBCb3VuZFRhcmdldGAgZm91bmQgYW4gZXhwcmVzc2lvbiB0YXJnZXQgZm9yIHRoZSB3aG9sZSBleHByZXNzaW9uLCBhbmQgdGhlcmVmb3JlXG4gICAgLy8gYHRjYkV4cHJlc3Npb25gIHdpbGwgbmV2ZXIgYXR0ZW1wdCB0byBgdGNiUmVzb2x2ZWAgdGhlIEltcGxpY2l0UmVjZWl2ZXIgb2YgdGhhdCBQcm9wZXJ0eVJlYWQuXG4gICAgLy9cbiAgICAvLyBUaGVyZWZvcmUgaWYgYHRjYlJlc29sdmVgIGlzIGNhbGxlZCBvbiBhbiBgSW1wbGljaXRSZWNlaXZlcmAsIGl0J3MgYmVjYXVzZSBubyBvdXRlclxuICAgIC8vIFByb3BlcnR5UmVhZCByZXNvbHZlZCB0byBhIHZhcmlhYmxlIG9yIHJlZmVyZW5jZSwgYW5kIHRoZXJlZm9yZSB0aGlzIGlzIGEgcHJvcGVydHkgcmVhZCBvblxuICAgIC8vIHRoZSBjb21wb25lbnQgY29udGV4dCBpdHNlbGYuXG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2N0eCcpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgQVNUIGlzbid0IHNwZWNpYWwgYWZ0ZXIgYWxsLlxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIHZhcmlhYmxlIHRvIGFuIGlkZW50aWZpZXIgdGhhdCByZXByZXNlbnRzIGl0cyB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdGNiUmVzb2x2ZVZhcmlhYmxlKGJpbmRpbmc6IFRtcGxBc3RWYXJpYWJsZSwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5JZGVudGlmaWVyIHtcbiAgLy8gTG9vayB0byBzZWUgd2hldGhlciB0aGUgdmFyaWFibGUgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIElmIHNvLCBqdXN0IHJldXNlIGl0LlxuICBsZXQgaWQgPSBzY29wZS5nZXRWYXJpYWJsZUlkKGJpbmRpbmcpO1xuICBpZiAoaWQgIT09IG51bGwpIHtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICAvLyBMb29rIGZvciB0aGUgdGVtcGxhdGUgd2hpY2ggZGVjbGFyZXMgdGhpcyB2YXJpYWJsZS5cbiAgY29uc3QgdG1wbCA9IHRjYi5ib3VuZFRhcmdldC5nZXRUZW1wbGF0ZU9mU3ltYm9sKGJpbmRpbmcpO1xuICBpZiAodG1wbCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVG1wbEFzdFZhcmlhYmxlIHRvIGJlIG1hcHBlZCB0byBhIFRtcGxBc3RUZW1wbGF0ZWApO1xuICB9XG4gIC8vIExvb2sgZm9yIGEgY29udGV4dCB2YXJpYWJsZSBmb3IgdGhlIHRlbXBsYXRlLiBUaGlzIHNob3VsZCd2ZSBiZWVuIGRlY2xhcmVkIGJlZm9yZSBhbnl0aGluZyB0aGF0XG4gIC8vIGNvdWxkIHJlZmVyZW5jZSB0aGUgdGVtcGxhdGUncyB2YXJpYWJsZXMuXG4gIGNvbnN0IGN0eCA9IHNjb3BlLmdldFRlbXBsYXRlQ3R4KHRtcGwpO1xuICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0ZW1wbGF0ZSBjb250ZXh0IHRvIGV4aXN0LicpO1xuICB9XG5cbiAgLy8gQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIFRtcGxBc3RWYXJpYWJsZSwgYW5kIGluaXRpYWxpemUgaXQgdG8gYSByZWFkIG9mIHRoZSB2YXJpYWJsZSBvblxuICAvLyB0aGUgdGVtcGxhdGUgY29udGV4dC5cbiAgaWQgPSBzY29wZS5hbGxvY2F0ZVZhcmlhYmxlSWQoYmluZGluZyk7XG4gIGNvbnN0IGluaXRpYWxpemVyID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAvKiBleHByZXNzaW9uICovIGN0eCxcbiAgICAgIC8qIG5hbWUgKi8gYmluZGluZy52YWx1ZSk7XG5cbiAgLy8gRGVjbGFyZSB0aGUgdmFyaWFibGUsIGFuZCByZXR1cm4gaXRzIGlkZW50aWZpZXIuXG4gIHNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCBpbml0aWFsaXplcikpO1xuICByZXR1cm4gaWQ7XG59XG4iXX0=