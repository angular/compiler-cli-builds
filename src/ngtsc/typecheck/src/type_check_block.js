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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/expression"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
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
            return translator_1.translateExpression(ngExpr, this.importManager, imports_1.NOOP_DEFAULT_IMPORT_RECORDER);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQThOO0lBQzlOLCtCQUFpQztJQUVqQyxtRUFBd0Y7SUFDeEYseUVBQW9FO0lBR3BFLHVGQUE2QztJQUk3Qzs7Ozs7Ozs7OztPQVVHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQ2xDLElBQXlCLEVBQUUsSUFBNEIsRUFBRSxhQUE0QixFQUNyRixVQUE0QjtRQUM5QixJQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDM0YsSUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsZUFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFaEUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RSxPQUFPLEVBQUUsQ0FBQyx5QkFBeUI7UUFDL0IsZ0JBQWdCLENBQUMsU0FBUztRQUMxQixlQUFlLENBQUMsU0FBUztRQUN6QixtQkFBbUIsQ0FBQyxTQUFTO1FBQzdCLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTTtRQUN0QixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYztRQUN4QyxnQkFB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QUFDLENBQUM7U0FDeEQ7UUFFRCxpR0FBaUc7UUFDakcsd0JBQXdCO1FBQ3hCLEVBQUUsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkMsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLG9CQUFvQjtRQUN2QyxnQkFBZ0IsQ0FBQyxHQUFHO1FBQ3BCLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFOUIsbURBQW1EO1FBQ25ELEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDdEQsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBQcm9wZXJ0eVJlYWQsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kVGV4dCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge05PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZUV4cHJlc3Npb259IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge1R5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2FzdFRvVHlwZXNjcmlwdH0gZnJvbSAnLi9leHByZXNzaW9uJztcblxuXG5cbi8qKlxuICogR2l2ZW4gYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgZm9yIGEgY29tcG9uZW50LCBhbmQgbWV0YWRhdGEgcmVnYXJkaW5nIHRoYXQgY29tcG9uZW50LCBjb21wb3NlIGFcbiAqIFwidHlwZSBjaGVjayBibG9ja1wiIGZ1bmN0aW9uLlxuICpcbiAqIFdoZW4gcGFzc2VkIHRocm91Z2ggVHlwZVNjcmlwdCdzIFR5cGVDaGVja2VyLCB0eXBlIGVycm9ycyB0aGF0IGFyaXNlIHdpdGhpbiB0aGUgdHlwZSBjaGVjayBibG9ja1xuICogZnVuY3Rpb24gaW5kaWNhdGUgaXNzdWVzIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGYuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIFR5cGVTY3JpcHQgbm9kZSBmb3IgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAqIEBwYXJhbSBtZXRhIG1ldGFkYXRhIGFib3V0IHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBhbmQgdGhlIGZ1bmN0aW9uIGJlaW5nIGdlbmVyYXRlZC5cbiAqIEBwYXJhbSBpbXBvcnRNYW5hZ2VyIGFuIGBJbXBvcnRNYW5hZ2VyYCBmb3IgdGhlIGZpbGUgaW50byB3aGljaCB0aGUgVENCIHdpbGwgYmUgd3JpdHRlbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHlwZUNoZWNrQmxvY2soXG4gICAgbm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gIGNvbnN0IHRjYiA9IG5ldyBDb250ZXh0KG1ldGEuYm91bmRUYXJnZXQsIG5vZGUuZ2V0U291cmNlRmlsZSgpLCBpbXBvcnRNYW5hZ2VyLCByZWZFbWl0dGVyKTtcbiAgY29uc3Qgc2NvcGUgPSBuZXcgU2NvcGUodGNiKTtcbiAgdGNiUHJvY2Vzc05vZGVzKG1ldGEuYm91bmRUYXJnZXQudGFyZ2V0LnRlbXBsYXRlICEsIHRjYiwgc2NvcGUpO1xuXG4gIGNvbnN0IGJvZHkgPSB0cy5jcmVhdGVCbG9jayhbdHMuY3JlYXRlSWYodHMuY3JlYXRlVHJ1ZSgpLCBzY29wZS5nZXRCbG9jaygpKV0pO1xuXG4gIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXN0ZXJpc2tUb2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBuYW1lICovIG1ldGEuZm5OYW1lLFxuICAgICAgLyogdHlwZVBhcmFtZXRlcnMgKi8gbm9kZS50eXBlUGFyYW1ldGVycyxcbiAgICAgIC8qIHBhcmFtZXRlcnMgKi9bdGNiQ3R4UGFyYW0obm9kZSldLFxuICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBib2R5ICovIGJvZHkpO1xufVxuXG4vKipcbiAqIE92ZXJhbGwgZ2VuZXJhdGlvbiBjb250ZXh0IGZvciB0aGUgdHlwZSBjaGVjayBibG9jay5cbiAqXG4gKiBgQ29udGV4dGAgaGFuZGxlcyBvcGVyYXRpb25zIGR1cmluZyBjb2RlIGdlbmVyYXRpb24gd2hpY2ggYXJlIGdsb2JhbCB3aXRoIHJlc3BlY3QgdG8gdGhlIHdob2xlXG4gKiBibG9jay4gSXQncyByZXNwb25zaWJsZSBmb3IgdmFyaWFibGUgbmFtZSBhbGxvY2F0aW9uIGFuZCBtYW5hZ2VtZW50IG9mIGFueSBpbXBvcnRzIG5lZWRlZC4gSXRcbiAqIGFsc28gY29udGFpbnMgdGhlIHRlbXBsYXRlIG1ldGFkYXRhIGl0c2VsZi5cbiAqL1xuY2xhc3MgQ29udGV4dCB7XG4gIHByaXZhdGUgbmV4dElkID0gMTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwcml2YXRlIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHByaXZhdGUgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcikge31cblxuICAvKipcbiAgICogQWxsb2NhdGUgYSBuZXcgdmFyaWFibGUgbmFtZSBmb3IgdXNlIHdpdGhpbiB0aGUgYENvbnRleHRgLlxuICAgKlxuICAgKiBDdXJyZW50bHkgdGhpcyB1c2VzIGEgbW9ub3RvbmljYWxseSBpbmNyZWFzaW5nIGNvdW50ZXIsIGJ1dCBpbiB0aGUgZnV0dXJlIHRoZSB2YXJpYWJsZSBuYW1lXG4gICAqIG1pZ2h0IGNoYW5nZSBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgZGF0YSBiZWluZyBzdG9yZWQuXG4gICAqL1xuICBhbGxvY2F0ZUlkKCk6IHRzLklkZW50aWZpZXIgeyByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihgX3Qke3RoaXMubmV4dElkKyt9YCk7IH1cblxuICAvKipcbiAgICogV3JpdGUgYSBgdHMuRXhwcmVzc2lvbmAgdGhhdCByZWZlcmVuY2VzIHRoZSBnaXZlbiBub2RlLlxuICAgKlxuICAgKiBUaGlzIG1heSBpbnZvbHZlIGltcG9ydGluZyB0aGUgbm9kZSBpbnRvIHRoZSBmaWxlIGlmIGl0J3Mgbm90IGRlY2xhcmVkIHRoZXJlIGFscmVhZHkuXG4gICAqL1xuICByZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBuZ0V4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIHRoaXMuc291cmNlRmlsZSk7XG4gICAgaWYgKG5nRXhwciA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlYWNoYWJsZSByZWZlcmVuY2U6ICR7cmVmLm5vZGV9YCk7XG4gICAgfVxuXG4gICAgLy8gVXNlIGB0cmFuc2xhdGVFeHByZXNzaW9uYCB0byBjb252ZXJ0IHRoZSBgRXhwcmVzc2lvbmAgaW50byBhIGB0cy5FeHByZXNzaW9uYC5cbiAgICByZXR1cm4gdHJhbnNsYXRlRXhwcmVzc2lvbihuZ0V4cHIsIHRoaXMuaW1wb3J0TWFuYWdlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUik7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2NhbCBzY29wZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2sgZm9yIGEgcGFydGljdWxhciB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGUgdG9wLWxldmVsIHRlbXBsYXRlIGFuZCBlYWNoIG5lc3RlZCBgPG5nLXRlbXBsYXRlPmAgaGF2ZSB0aGVpciBvd24gYFNjb3BlYCwgd2hpY2ggZXhpc3QgaW4gYVxuICogaGllcmFyY2h5LiBUaGUgc3RydWN0dXJlIG9mIHRoaXMgaGllcmFyY2h5IG1pcnJvcnMgdGhlIHN5bnRhY3RpYyBzY29wZXMgaW4gdGhlIGdlbmVyYXRlZCB0eXBlXG4gKiBjaGVjayBibG9jaywgd2hlcmUgZWFjaCBuZXN0ZWQgdGVtcGxhdGUgaXMgZW5jYXNlZCBpbiBhbiBgaWZgIHN0cnVjdHVyZS5cbiAqXG4gKiBBcyBhIHRlbXBsYXRlIGlzIHByb2Nlc3NlZCBpbiBhIGdpdmVuIGBTY29wZWAsIHN0YXRlbWVudHMgYXJlIGFkZGVkIHZpYSBgYWRkU3RhdGVtZW50KClgLiBXaGVuXG4gKiB0aGlzIHByb2Nlc3NpbmcgaXMgY29tcGxldGUsIHRoZSBgU2NvcGVgIGNhbiBiZSB0dXJuZWQgaW50byBhIGB0cy5CbG9ja2AgdmlhIGBnZXRCbG9jaygpYC5cbiAqL1xuY2xhc3MgU2NvcGUge1xuICAvKipcbiAgICogTWFwIG9mIG5vZGVzIHRvIGluZm9ybWF0aW9uIGFib3V0IHRoYXQgbm9kZSB3aXRoaW4gdGhlIFRDQi5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIHRoaXMgc3RvcmVzIHRoZSBgdHMuSWRlbnRpZmllcmAgd2l0aGluIHRoZSBUQ0IgZm9yIGFuIGVsZW1lbnQgb3IgPG5nLXRlbXBsYXRlPi5cbiAgICovXG4gIHByaXZhdGUgZWxlbWVudERhdGEgPSBuZXcgTWFwPFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgVGNiTm9kZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbW1lZGlhdGVseSBuZXN0ZWQgPG5nLXRlbXBsYXRlPnMgKHdpdGhpbiB0aGlzIGBTY29wZWApIHRvIHRoZSBgdHMuSWRlbnRpZmllcmAgb2YgdGhlaXJcbiAgICogcmVuZGVyaW5nIGNvbnRleHRzLlxuICAgKi9cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUN0eCA9IG5ldyBNYXA8VG1wbEFzdFRlbXBsYXRlLCB0cy5JZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgdmFyaWFibGVzIGRlY2xhcmVkIG9uIHRoZSB0ZW1wbGF0ZSB0aGF0IGNyZWF0ZWQgdGhpcyBgU2NvcGVgIHRvIHRoZWlyIGB0cy5JZGVudGlmaWVyYHNcbiAgICogd2l0aGluIHRoZSBUQ0IuXG4gICAqL1xuICBwcml2YXRlIHZhck1hcCA9IG5ldyBNYXA8VG1wbEFzdFZhcmlhYmxlLCB0cy5JZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBTdGF0ZW1lbnRzIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGNiOiBDb250ZXh0LCBwcml2YXRlIHBhcmVudDogU2NvcGV8bnVsbCA9IG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaWRlbnRpZmllciB3aXRoaW4gdGhlIFRDQiBmb3IgYSBnaXZlbiBgVG1wbEFzdEVsZW1lbnRgLlxuICAgKi9cbiAgZ2V0RWxlbWVudElkKGVsOiBUbXBsQXN0RWxlbWVudCk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RWxlbWVudERhdGEoZWwsIGZhbHNlKTtcbiAgICBpZiAoZGF0YSAhPT0gbnVsbCAmJiBkYXRhLmh0bWxOb2RlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZGF0YS5odG1sTm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGFyZW50ICE9PSBudWxsID8gdGhpcy5wYXJlbnQuZ2V0RWxlbWVudElkKGVsKSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIG9mIGEgZGlyZWN0aXZlIGluc3RhbmNlIG9uIGEgZ2l2ZW4gdGVtcGxhdGUgbm9kZS5cbiAgICovXG4gIGdldERpcmVjdGl2ZUlkKGVsOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiB0cy5JZGVudGlmaWVyXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RWxlbWVudERhdGEoZWwsIGZhbHNlKTtcbiAgICBpZiAoZGF0YSAhPT0gbnVsbCAmJiBkYXRhLmRpcmVjdGl2ZXMgIT09IG51bGwgJiYgZGF0YS5kaXJlY3RpdmVzLmhhcyhkaXIpKSB7XG4gICAgICByZXR1cm4gZGF0YS5kaXJlY3RpdmVzLmdldChkaXIpICE7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBhcmVudCAhPT0gbnVsbCA/IHRoaXMucGFyZW50LmdldERpcmVjdGl2ZUlkKGVsLCBkaXIpIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlkZW50aWZpZXIgb2YgYSB0ZW1wbGF0ZSdzIHJlbmRlcmluZyBjb250ZXh0LlxuICAgKi9cbiAgZ2V0VGVtcGxhdGVDdHgodG1wbDogVG1wbEFzdFRlbXBsYXRlKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZUN0eC5nZXQodG1wbCkgfHxcbiAgICAgICAgKHRoaXMucGFyZW50ICE9PSBudWxsID8gdGhpcy5wYXJlbnQuZ2V0VGVtcGxhdGVDdHgodG1wbCkgOiBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlkZW50aWZpZXIgb2YgYSB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAgICovXG4gIGdldFZhcmlhYmxlSWQodjogVG1wbEFzdFZhcmlhYmxlKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy52YXJNYXAuZ2V0KHYpIHx8ICh0aGlzLnBhcmVudCAhPT0gbnVsbCA/IHRoaXMucGFyZW50LmdldFZhcmlhYmxlSWQodikgOiBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhbiBpZGVudGlmaWVyIGZvciB0aGUgZ2l2ZW4gdGVtcGxhdGUgZWxlbWVudC5cbiAgICovXG4gIGFsbG9jYXRlRWxlbWVudElkKGVsOiBUbXBsQXN0RWxlbWVudCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldEVsZW1lbnREYXRhKGVsLCB0cnVlKTtcbiAgICBpZiAoZGF0YS5odG1sTm9kZSA9PT0gbnVsbCkge1xuICAgICAgZGF0YS5odG1sTm9kZSA9IHRoaXMudGNiLmFsbG9jYXRlSWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGEuaHRtbE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIGdpdmVuIHRlbXBsYXRlIHZhcmlhYmxlLlxuICAgKi9cbiAgYWxsb2NhdGVWYXJpYWJsZUlkKHY6IFRtcGxBc3RWYXJpYWJsZSk6IHRzLklkZW50aWZpZXIge1xuICAgIGlmICghdGhpcy52YXJNYXAuaGFzKHYpKSB7XG4gICAgICB0aGlzLnZhck1hcC5zZXQodiwgdGhpcy50Y2IuYWxsb2NhdGVJZCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudmFyTWFwLmdldCh2KSAhO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIGFuIGluc3RhbmNlIG9mIHRoZSBnaXZlbiBkaXJlY3RpdmUgb24gdGhlIGdpdmVuIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICBhbGxvY2F0ZURpcmVjdGl2ZUlkKGVsOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOlxuICAgICAgdHMuSWRlbnRpZmllciB7XG4gICAgLy8gTG9vayB1cCB0aGUgZGF0YSBmb3IgdGhpcyB0ZW1wbGF0ZSBub2RlLlxuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldEVsZW1lbnREYXRhKGVsLCB0cnVlKTtcblxuICAgIC8vIExhemlseSBwb3B1bGF0ZSB0aGUgZGlyZWN0aXZlcyBtYXAsIGlmIGl0IGV4aXN0cy5cbiAgICBpZiAoZGF0YS5kaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICBkYXRhLmRpcmVjdGl2ZXMgPSBuZXcgTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0cy5JZGVudGlmaWVyPigpO1xuICAgIH1cbiAgICBpZiAoIWRhdGEuZGlyZWN0aXZlcy5oYXMoZGlyKSkge1xuICAgICAgZGF0YS5kaXJlY3RpdmVzLnNldChkaXIsIHRoaXMudGNiLmFsbG9jYXRlSWQoKSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLmRpcmVjdGl2ZXMuZ2V0KGRpcikgITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhbiBpZGVudGlmaWVyIGZvciB0aGUgcmVuZGVyaW5nIGNvbnRleHQgb2YgYSBnaXZlbiB0ZW1wbGF0ZS5cbiAgICovXG4gIGFsbG9jYXRlVGVtcGxhdGVDdHgodG1wbDogVG1wbEFzdFRlbXBsYXRlKTogdHMuSWRlbnRpZmllciB7XG4gICAgaWYgKCF0aGlzLnRlbXBsYXRlQ3R4Lmhhcyh0bXBsKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZUN0eC5zZXQodG1wbCwgdGhpcy50Y2IuYWxsb2NhdGVJZCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVDdHguZ2V0KHRtcGwpICE7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgc3RhdGVtZW50IHRvIHRoaXMgc2NvcGUuXG4gICAqL1xuICBhZGRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7IHRoaXMuc3RhdGVtZW50cy5wdXNoKHN0bXQpOyB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGB0cy5CbG9ja2AgY29udGFpbmluZyB0aGUgc3RhdGVtZW50cyBpbiB0aGlzIHNjb3BlLlxuICAgKi9cbiAgZ2V0QmxvY2soKTogdHMuQmxvY2sgeyByZXR1cm4gdHMuY3JlYXRlQmxvY2sodGhpcy5zdGF0ZW1lbnRzKTsgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBoZWxwZXIgdG8gZ2V0IHRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgZWxlbWVudC5cbiAgICpcbiAgICogVGhpcyBjYW4gZWl0aGVyIHJldHVybiBgbnVsbGAgaWYgdGhlIGRhdGEgaXMgbm90IHByZXNlbnQgKHdoZW4gdGhlIGBhbGxvY2AgZmxhZyBpcyBzZXQgdG9cbiAgICogYGZhbHNlYCksIG9yIGl0IGNhbiBpbml0aWFsaXplIHRoZSBkYXRhIGZvciB0aGUgZWxlbWVudCAod2hlbiBgYWxsb2NgIGlzIGB0cnVlYCkuXG4gICAqL1xuICBwcml2YXRlIGdldEVsZW1lbnREYXRhKGVsOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIGFsbG9jOiB0cnVlKTogVGNiTm9kZURhdGE7XG4gIHByaXZhdGUgZ2V0RWxlbWVudERhdGEoZWw6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgYWxsb2M6IGZhbHNlKTogVGNiTm9kZURhdGF8bnVsbDtcbiAgcHJpdmF0ZSBnZXRFbGVtZW50RGF0YShlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBhbGxvYzogYm9vbGVhbik6IFRjYk5vZGVEYXRhfG51bGwge1xuICAgIGlmIChhbGxvYyAmJiAhdGhpcy5lbGVtZW50RGF0YS5oYXMoZWwpKSB7XG4gICAgICB0aGlzLmVsZW1lbnREYXRhLnNldChlbCwge2h0bWxOb2RlOiBudWxsLCBkaXJlY3RpdmVzOiBudWxsfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmVsZW1lbnREYXRhLmdldChlbCkgfHwgbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIERhdGEgc3RvcmVkIGZvciBhIHRlbXBsYXRlIG5vZGUgaW4gYSBUQ0IuXG4gKi9cbmludGVyZmFjZSBUY2JOb2RlRGF0YSB7XG4gIC8qKlxuICAgKiBUaGUgaWRlbnRpZmllciBvZiB0aGUgbm9kZSBlbGVtZW50IGluc3RhbmNlLCBpZiBhbnkuXG4gICAqL1xuICBodG1sTm9kZTogdHMuSWRlbnRpZmllcnxudWxsO1xuICBkaXJlY3RpdmVzOiBNYXA8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRzLklkZW50aWZpZXI+fG51bGw7XG59XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBgY3R4YCBwYXJhbWV0ZXIgdG8gdGhlIHRvcC1sZXZlbCBUQ0IgZnVuY3Rpb24uXG4gKlxuICogVGhpcyBpcyBhIHBhcmFtZXRlciB3aXRoIGEgdHlwZSBlcXVpdmFsZW50IHRvIHRoZSBjb21wb25lbnQgdHlwZSwgd2l0aCBhbGwgZ2VuZXJpYyB0eXBlXG4gKiBwYXJhbWV0ZXJzIGxpc3RlZCAod2l0aG91dCB0aGVpciBnZW5lcmljIGJvdW5kcykuXG4gKi9cbmZ1bmN0aW9uIHRjYkN0eFBhcmFtKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiB7XG4gIGxldCB0eXBlQXJndW1lbnRzOiB0cy5UeXBlTm9kZVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgLy8gQ2hlY2sgaWYgdGhlIGNvbXBvbmVudCBpcyBnZW5lcmljLCBhbmQgcGFzcyBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBpZiBzby5cbiAgaWYgKG5vZGUudHlwZVBhcmFtZXRlcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIHR5cGVBcmd1bWVudHMgPVxuICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShwYXJhbS5uYW1lLCB1bmRlZmluZWQpKTtcbiAgfVxuICBjb25zdCB0eXBlID0gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZS5uYW1lICEsIHR5cGVBcmd1bWVudHMpO1xuICByZXR1cm4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZG90RG90RG90VG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyAnY3R4JyxcbiAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFuIGFycmF5IG9mIHRlbXBsYXRlIG5vZGVzIGFuZCBnZW5lcmF0ZSB0eXBlIGNoZWNraW5nIGNvZGUgZm9yIHRoZW0gd2l0aGluIHRoZSBnaXZlblxuICogYFNjb3BlYC5cbiAqXG4gKiBAcGFyYW0gbm9kZXMgdGVtcGxhdGUgbm9kZSBhcnJheSBvdmVyIHdoaWNoIHRvIGl0ZXJhdGUuXG4gKiBAcGFyYW0gdGNiIGNvbnRleHQgb2YgdGhlIG92ZXJhbGwgdHlwZSBjaGVjayBibG9jay5cbiAqIEBwYXJhbSBzY29wZVxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzTm9kZXMobm9kZXM6IFRtcGxBc3ROb2RlW10sIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdm9pZCB7XG4gIG5vZGVzLmZvckVhY2gobm9kZSA9PiB7XG4gICAgLy8gUHJvY2VzcyBlbGVtZW50cywgdGVtcGxhdGVzLCBhbmQgYmluZGluZ3MuXG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgdGNiUHJvY2Vzc0VsZW1lbnQobm9kZSwgdGNiLCBzY29wZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICB0Y2JQcm9jZXNzVGVtcGxhdGVEZWNsYXJhdGlvbihub2RlLCB0Y2IsIHNjb3BlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihub2RlLnZhbHVlLCB0Y2IsIHNjb3BlKTtcbiAgICAgIHNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVTdGF0ZW1lbnQoZXhwcikpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBlbGVtZW50LCBnZW5lcmF0aW5nIHR5cGUgY2hlY2tpbmcgY29kZSBmb3IgaXQsIGl0cyBkaXJlY3RpdmVzLCBhbmQgaXRzIGNoaWxkcmVuLlxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzRWxlbWVudChlbDogVG1wbEFzdEVsZW1lbnQsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuSWRlbnRpZmllciB7XG4gIGxldCBpZCA9IHNjb3BlLmdldEVsZW1lbnRJZChlbCk7XG4gIGlmIChpZCAhPT0gbnVsbCkge1xuICAgIC8vIFRoaXMgZWxlbWVudCBoYXMgYmVlbiBwcm9jZXNzZWQgYmVmb3JlLiBObyBuZWVkIHRvIHJ1biB0aHJvdWdoIGl0IGFnYWluLlxuICAgIHJldHVybiBpZDtcbiAgfVxuICBpZCA9IHNjb3BlLmFsbG9jYXRlRWxlbWVudElkKGVsKTtcblxuICAvLyBBZGQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBlbGVtZW50IHVzaW5nIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQuXG4gIHNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCB0c0NyZWF0ZUVsZW1lbnQoZWwubmFtZSkpKTtcblxuXG4gIC8vIENvbnN0cnVjdCBhIHNldCBvZiBhbGwgdGhlIGlucHV0IGJpbmRpbmdzLiBBbnl0aGluZyBtYXRjaGVkIGJ5IGRpcmVjdGl2ZXMgd2lsbCBiZSByZW1vdmVkIGZyb21cbiAgLy8gdGhpcyBzZXQuIFRoZSByZXN0IGFyZSBiaW5kaW5ncyBiZWluZyBtYWRlIG9uIHRoZSBlbGVtZW50IGl0c2VsZi5cbiAgY29uc3QgaW5wdXRzID0gbmV3IFNldChcbiAgICAgIGVsLmlucHV0cy5maWx0ZXIoaW5wdXQgPT4gaW5wdXQudHlwZSA9PT0gQmluZGluZ1R5cGUuUHJvcGVydHkpLm1hcChpbnB1dCA9PiBpbnB1dC5uYW1lKSk7XG5cbiAgLy8gUHJvY2VzcyBkaXJlY3RpdmVzIG9mIHRoZSBub2RlLlxuICB0Y2JQcm9jZXNzRGlyZWN0aXZlcyhlbCwgaW5wdXRzLCB0Y2IsIHNjb3BlKTtcblxuICAvLyBBdCB0aGlzIHBvaW50LCBgaW5wdXRzYCBub3cgY29udGFpbnMgb25seSB0aG9zZSBiaW5kaW5ncyBub3QgbWF0Y2hlZCBieSBhbnkgZGlyZWN0aXZlLiBUaGVzZVxuICAvLyBiaW5kaW5ncyBnbyB0byB0aGUgZWxlbWVudCBpdHNlbGYuXG4gIGlucHV0cy5mb3JFYWNoKG5hbWUgPT4ge1xuICAgIGNvbnN0IGJpbmRpbmcgPSBlbC5pbnB1dHMuZmluZChpbnB1dCA9PiBpbnB1dC5uYW1lID09PSBuYW1lKSAhO1xuICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJpbmRpbmcudmFsdWUsIHRjYiwgc2NvcGUpO1xuXG4gICAgY29uc3QgcHJvcCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGlkICEsIG5hbWUpO1xuICAgIGNvbnN0IGFzc2lnbiA9IHRzLmNyZWF0ZUJpbmFyeShwcm9wLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByKTtcbiAgICBzY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlU3RhdGVtZW50KGFzc2lnbikpO1xuICB9KTtcblxuICAvLyBSZWN1cnNlIGludG8gY2hpbGRyZW4uXG4gIHRjYlByb2Nlc3NOb2RlcyhlbC5jaGlsZHJlbiwgdGNiLCBzY29wZSk7XG5cbiAgcmV0dXJuIGlkO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYWxsIHRoZSBkaXJlY3RpdmVzIGFzc29jaWF0ZWQgd2l0aCBhIGdpdmVuIHRlbXBsYXRlIG5vZGUuXG4gKi9cbmZ1bmN0aW9uIHRjYlByb2Nlc3NEaXJlY3RpdmVzKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgdW5jbGFpbWVkOiBTZXQ8c3RyaW5nPiwgdGNiOiBDb250ZXh0LFxuICAgIHNjb3BlOiBTY29wZSk6IHZvaWQge1xuICBjb25zdCBkaXJlY3RpdmVzID0gdGNiLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUoZWwpO1xuICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCkge1xuICAgIC8vIE5vIGRpcmVjdGl2ZXMsIG5vdGhpbmcgdG8gZG8uXG4gICAgcmV0dXJuO1xuICB9XG4gIGRpcmVjdGl2ZXMuZm9yRWFjaChkaXIgPT4gdGNiUHJvY2Vzc0RpcmVjdGl2ZShlbCwgZGlyLCB1bmNsYWltZWQsIHRjYiwgc2NvcGUpKTtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGEgZGlyZWN0aXZlLCBnZW5lcmF0aW5nIHR5cGUgY2hlY2tpbmcgY29kZSBmb3IgaXQuXG4gKi9cbmZ1bmN0aW9uIHRjYlByb2Nlc3NEaXJlY3RpdmUoXG4gICAgZWw6IFRtcGxBc3RFbGVtZW50IHwgVG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB1bmNsYWltZWQ6IFNldDxzdHJpbmc+LFxuICAgIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuSWRlbnRpZmllciB7XG4gIGxldCBpZCA9IHNjb3BlLmdldERpcmVjdGl2ZUlkKGVsLCBkaXIpO1xuICBpZiAoaWQgIT09IG51bGwpIHtcbiAgICAvLyBUaGlzIGRpcmVjdGl2ZSBoYXMgYmVlbiBwcm9jZXNzZWQgYmVmb3JlLiBObyBuZWVkIHRvIHJ1biB0aHJvdWdoIGl0IGFnYWluLlxuICAgIHJldHVybiBpZDtcbiAgfVxuICBpZCA9IHNjb3BlLmFsbG9jYXRlRGlyZWN0aXZlSWQoZWwsIGRpcik7XG5cbiAgY29uc3QgYmluZGluZ3MgPSB0Y2JHZXRJbnB1dEJpbmRpbmdFeHByZXNzaW9ucyhlbCwgZGlyLCB0Y2IsIHNjb3BlKTtcblxuXG4gIC8vIENhbGwgdGhlIHR5cGUgY29uc3RydWN0b3Igb2YgdGhlIGRpcmVjdGl2ZSB0byBpbmZlciBhIHR5cGUsIGFuZCBhc3NpZ24gdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZS5cbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIHRjYkNhbGxUeXBlQ3RvcihlbCwgZGlyLCB0Y2IsIHNjb3BlLCBiaW5kaW5ncykpKTtcblxuICB0Y2JQcm9jZXNzQmluZGluZ3MoaWQsIGJpbmRpbmdzLCB1bmNsYWltZWQsIHRjYiwgc2NvcGUpO1xuXG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gdGNiUHJvY2Vzc0JpbmRpbmdzKFxuICAgIHJlY3Y6IHRzLkV4cHJlc3Npb24sIGJpbmRpbmdzOiBUY2JCaW5kaW5nW10sIHVuY2xhaW1lZDogU2V0PHN0cmluZz4sIHRjYjogQ29udGV4dCxcbiAgICBzY29wZTogU2NvcGUpOiB2b2lkIHtcbiAgLy8gSXRlcmF0ZSB0aHJvdWdoIGFsbCB0aGUgYmluZGluZ3MgdGhpcyBkaXJlY3RpdmUgaXMgY29uc3VtaW5nLlxuICBiaW5kaW5ncy5mb3JFYWNoKGJpbmRpbmcgPT4ge1xuICAgIC8vIEdlbmVyYXRlIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50IGZvciB0aGlzIGJpbmRpbmcuXG4gICAgY29uc3QgcHJvcCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlY3YsIGJpbmRpbmcuZmllbGQpO1xuICAgIGNvbnN0IGFzc2lnbiA9IHRzLmNyZWF0ZUJpbmFyeShwcm9wLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBiaW5kaW5nLmV4cHJlc3Npb24pO1xuICAgIHNjb3BlLmFkZFN0YXRlbWVudCh0cy5jcmVhdGVTdGF0ZW1lbnQoYXNzaWduKSk7XG5cbiAgICAvLyBSZW1vdmUgdGhlIGJpbmRpbmcgZnJvbSB0aGUgc2V0IG9mIHVuY2xhaW1lZCBpbnB1dHMsIGFzIHRoaXMgZGlyZWN0aXZlIGhhcyAnY2xhaW1lZCcgaXQuXG4gICAgdW5jbGFpbWVkLmRlbGV0ZShiaW5kaW5nLnByb3BlcnR5KTtcbiAgfSk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhIG5lc3RlZCA8bmctdGVtcGxhdGU+LCBnZW5lcmF0aW5nIHR5cGUtY2hlY2tpbmcgY29kZSBmb3IgaXQgYW5kIGl0cyBjaGlsZHJlbi5cbiAqXG4gKiBUaGUgbmVzdGVkIDxuZy10ZW1wbGF0ZT4gaXMgcmVwcmVzZW50ZWQgd2l0aCBhbiBgaWZgIHN0cnVjdHVyZSwgd2hpY2ggY3JlYXRlcyBhIG5ldyBzeW50YWN0aWNhbFxuICogc2NvcGUgZm9yIHRoZSB0eXBlIGNoZWNraW5nIGNvZGUgZm9yIHRoZSB0ZW1wbGF0ZS4gSWYgdGhlIDxuZy10ZW1wbGF0ZT4gaGFzIGFueSBkaXJlY3RpdmVzLCB0aGV5XG4gKiBjYW4gaW5mbHVlbmNlIHR5cGUgaW5mZXJlbmNlIHdpdGhpbiB0aGUgYGlmYCBibG9jayB0aHJvdWdoIGRlZmluZWQgZ3VhcmQgZnVuY3Rpb25zLlxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzVGVtcGxhdGVEZWNsYXJhdGlvbih0bXBsOiBUbXBsQXN0VGVtcGxhdGUsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKSB7XG4gIC8vIENyZWF0ZSBhIG5ldyBTY29wZSB0byByZXByZXNlbnQgYmluZGluZ3MgY2FwdHVyZWQgaW4gdGhlIHRlbXBsYXRlLlxuICBjb25zdCB0bXBsU2NvcGUgPSBuZXcgU2NvcGUodGNiLCBzY29wZSk7XG5cbiAgLy8gQWxsb2NhdGUgYSB0ZW1wbGF0ZSBjdHggdmFyaWFibGUgYW5kIGRlY2xhcmUgaXQgd2l0aCBhbiAnYW55JyB0eXBlLlxuICBjb25zdCBjdHggPSB0bXBsU2NvcGUuYWxsb2NhdGVUZW1wbGF0ZUN0eCh0bXBsKTtcbiAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICBzY29wZS5hZGRTdGF0ZW1lbnQodHNEZWNsYXJlVmFyaWFibGUoY3R4LCB0eXBlKSk7XG5cbiAgLy8gUHJvY2VzcyBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZS5cbiAgdGNiUHJvY2Vzc0RpcmVjdGl2ZXModG1wbCwgbmV3IFNldCgpLCB0Y2IsIHNjb3BlKTtcblxuICAvLyBQcm9jZXNzIHRoZSB0ZW1wbGF0ZSBpdHNlbGYgKGluc2lkZSB0aGUgaW5uZXIgU2NvcGUpLlxuICB0Y2JQcm9jZXNzTm9kZXModG1wbC5jaGlsZHJlbiwgdGNiLCB0bXBsU2NvcGUpO1xuXG4gIC8vIEFuIGBpZmAgd2lsbCBiZSBjb25zdHJ1Y3RlZCwgd2l0aGluIHdoaWNoIHRoZSB0ZW1wbGF0ZSdzIGNoaWxkcmVuIHdpbGwgYmUgdHlwZSBjaGVja2VkLiBUaGVcbiAgLy8gYGlmYCBpcyB1c2VkIGZvciB0d28gcmVhc29uczogaXQgY3JlYXRlcyBhIG5ldyBzeW50YWN0aWMgc2NvcGUsIGlzb2xhdGluZyB2YXJpYWJsZXMgZGVjbGFyZWQgaW5cbiAgLy8gdGhlIHRlbXBsYXRlJ3MgVENCIGZyb20gdGhlIG91dGVyIGNvbnRleHQsIGFuZCBpdCBhbGxvd3MgYW55IGRpcmVjdGl2ZXMgb24gdGhlIHRlbXBsYXRlcyB0b1xuICAvLyBwZXJmb3JtIHR5cGUgbmFycm93aW5nIG9mIGVpdGhlciBleHByZXNzaW9ucyBvciB0aGUgdGVtcGxhdGUncyBjb250ZXh0LlxuXG4gIC8vIFRoZSBndWFyZCBpcyB0aGUgYGlmYCBibG9jaydzIGNvbmRpdGlvbi4gSXQncyB1c3VhbGx5IHNldCB0byBgdHJ1ZWAgYnV0IGRpcmVjdGl2ZXMgdGhhdCBleGlzdFxuICAvLyBvbiB0aGUgdGVtcGxhdGUgY2FuIHRyaWdnZXIgZXh0cmEgZ3VhcmQgZXhwcmVzc2lvbnMgdGhhdCBzZXJ2ZSB0byBuYXJyb3cgdHlwZXMgd2l0aGluIHRoZVxuICAvLyBgaWZgLiBgZ3VhcmRgIGlzIGNhbGN1bGF0ZWQgYnkgc3RhcnRpbmcgd2l0aCBgdHJ1ZWAgYW5kIGFkZGluZyBvdGhlciBjb25kaXRpb25zIGFzIG5lZWRlZC5cbiAgLy8gQ29sbGVjdCB0aGVzZSBpbnRvIGBndWFyZHNgIGJ5IHByb2Nlc3NpbmcgdGhlIGRpcmVjdGl2ZXMuXG4gIGNvbnN0IGRpcmVjdGl2ZUd1YXJkczogdHMuRXhwcmVzc2lvbltdID0gW107XG5cbiAgY29uc3QgZGlyZWN0aXZlcyA9IHRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKHRtcGwpO1xuICBpZiAoZGlyZWN0aXZlcyAhPT0gbnVsbCkge1xuICAgIGRpcmVjdGl2ZXMuZm9yRWFjaChkaXIgPT4ge1xuICAgICAgY29uc3QgZGlySW5zdElkID0gc2NvcGUuZ2V0RGlyZWN0aXZlSWQodG1wbCwgZGlyKSAhO1xuICAgICAgY29uc3QgZGlySWQgPSB0Y2IucmVmZXJlbmNlKGRpci5yZWYpO1xuXG4gICAgICAvLyBUaGVyZSBhcmUgdHdvIGtpbmRzIG9mIGd1YXJkcy4gVGVtcGxhdGUgZ3VhcmRzIChuZ1RlbXBsYXRlR3VhcmRzKSBhbGxvdyB0eXBlIG5hcnJvd2luZyBvZlxuICAgICAgLy8gdGhlIGV4cHJlc3Npb24gcGFzc2VkIHRvIGFuIEBJbnB1dCBvZiB0aGUgZGlyZWN0aXZlLiBTY2FuIHRoZSBkaXJlY3RpdmUgdG8gc2VlIGlmIGl0IGhhc1xuICAgICAgLy8gYW55IHRlbXBsYXRlIGd1YXJkcywgYW5kIGdlbmVyYXRlIHRoZW0gaWYgbmVlZGVkLlxuICAgICAgZGlyLm5nVGVtcGxhdGVHdWFyZHMuZm9yRWFjaChpbnB1dE5hbWUgPT4ge1xuICAgICAgICAvLyBGb3IgZWFjaCB0ZW1wbGF0ZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlLCBsb29rIGZvciBhIGJpbmRpbmcgdG8gdGhhdCBpbnB1dC5cbiAgICAgICAgY29uc3QgYm91bmRJbnB1dCA9IHRtcGwuaW5wdXRzLmZpbmQoaSA9PiBpLm5hbWUgPT09IGlucHV0TmFtZSkgfHxcbiAgICAgICAgICAgIHRtcGwudGVtcGxhdGVBdHRycy5maW5kKFxuICAgICAgICAgICAgICAgIChpOiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSB8IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSk6IGkgaXMgVG1wbEFzdEJvdW5kQXR0cmlidXRlID0+XG4gICAgICAgICAgICAgICAgICAgIGkgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgaS5uYW1lID09PSBpbnB1dE5hbWUpO1xuICAgICAgICBpZiAoYm91bmRJbnB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgc3VjaCBhIGJpbmRpbmcsIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGl0LlxuICAgICAgICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGJvdW5kSW5wdXQudmFsdWUsIHRjYiwgc2NvcGUpO1xuICAgICAgICAgIC8vIENhbGwgdGhlIGd1YXJkIGZ1bmN0aW9uIG9uIHRoZSBkaXJlY3RpdmUgd2l0aCB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGFuZCB0aGF0XG4gICAgICAgICAgLy8gZXhwcmVzc2lvbi5cbiAgICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgYG5nVGVtcGxhdGVHdWFyZF8ke2lucHV0TmFtZX1gLCBbXG4gICAgICAgICAgICBkaXJJbnN0SWQsXG4gICAgICAgICAgICBleHByLFxuICAgICAgICAgIF0pO1xuICAgICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wdXNoKGd1YXJkSW52b2tlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFRoZSBzZWNvbmQga2luZCBvZiBndWFyZCBpcyBhIHRlbXBsYXRlIGNvbnRleHQgZ3VhcmQuIFRoaXMgZ3VhcmQgbmFycm93cyB0aGUgdGVtcGxhdGVcbiAgICAgIC8vIHJlbmRlcmluZyBjb250ZXh0IHZhcmlhYmxlIGBjdHhgLlxuICAgICAgaWYgKGRpci5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkKSB7XG4gICAgICAgIGNvbnN0IGd1YXJkSW52b2tlID0gdHNDYWxsTWV0aG9kKGRpcklkLCAnbmdUZW1wbGF0ZUNvbnRleHRHdWFyZCcsIFtkaXJJbnN0SWQsIGN0eF0pO1xuICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IHRoZSBndWFyZCBpcyBzaW1wbHkgYHRydWVgLlxuICBsZXQgZ3VhcmQ6IHRzLkV4cHJlc3Npb24gPSB0cy5jcmVhdGVUcnVlKCk7XG5cbiAgLy8gSWYgdGhlcmUgYXJlIGFueSBndWFyZHMgZnJvbSBkaXJlY3RpdmVzLCB1c2UgdGhlbSBpbnN0ZWFkLlxuICBpZiAoZGlyZWN0aXZlR3VhcmRzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBQb3AgdGhlIGZpcnN0IHZhbHVlIGFuZCB1c2UgaXQgYXMgdGhlIGluaXRpYWxpemVyIHRvIHJlZHVjZSgpLiBUaGlzIHdheSwgYSBzaW5nbGUgZ3VhcmRcbiAgICAvLyB3aWxsIGJlIHVzZWQgb24gaXRzIG93biwgYnV0IHR3byBvciBtb3JlIHdpbGwgYmUgY29tYmluZWQgaW50byBiaW5hcnkgZXhwcmVzc2lvbnMuXG4gICAgZ3VhcmQgPSBkaXJlY3RpdmVHdWFyZHMucmVkdWNlKFxuICAgICAgICAoZXhwciwgZGlyR3VhcmQpID0+IHRzLmNyZWF0ZUJpbmFyeShleHByLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLCBkaXJHdWFyZCksXG4gICAgICAgIGRpcmVjdGl2ZUd1YXJkcy5wb3AoKSAhKTtcbiAgfVxuXG4gIC8vIENvbnN0cnVjdCB0aGUgYGlmYCBibG9jayBmb3IgdGhlIHRlbXBsYXRlIHdpdGggdGhlIGdlbmVyYXRlZCBndWFyZCBleHByZXNzaW9uLlxuICBjb25zdCB0bXBsSWYgPSB0cy5jcmVhdGVJZihcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gZ3VhcmQsXG4gICAgICAvKiB0aGVuU3RhdGVtZW50ICovIHRtcGxTY29wZS5nZXRCbG9jaygpKTtcbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRtcGxJZik7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBgQVNUYCBleHByZXNzaW9uIGFuZCBjb252ZXJ0IGl0IGludG8gYSBgdHMuRXhwcmVzc2lvbmAsIGdlbmVyYXRpbmcgcmVmZXJlbmNlcyB0byB0aGVcbiAqIGNvcnJlY3QgaWRlbnRpZmllcnMgaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHRjYkV4cHJlc3Npb24oYXN0OiBBU1QsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuRXhwcmVzc2lvbiB7XG4gIC8vIGBhc3RUb1R5cGVzY3JpcHRgIGFjdHVhbGx5IGRvZXMgdGhlIGNvbnZlcnNpb24uIEEgc3BlY2lhbCByZXNvbHZlciBgdGNiUmVzb2x2ZWAgaXMgcGFzc2VkIHdoaWNoXG4gIC8vIGludGVycHJldHMgc3BlY2lmaWMgZXhwcmVzc2lvbiBub2RlcyB0aGF0IGludGVyYWN0IHdpdGggdGhlIGBJbXBsaWNpdFJlY2VpdmVyYC4gVGhlc2Ugbm9kZXNcbiAgLy8gYWN0dWFsbHkgcmVmZXIgdG8gaWRlbnRpZmllcnMgd2l0aGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICByZXR1cm4gYXN0VG9UeXBlc2NyaXB0KGFzdCwgKGFzdCkgPT4gdGNiUmVzb2x2ZShhc3QsIHRjYiwgc2NvcGUpKTtcbn1cblxuLyoqXG4gKiBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIGEgZGlyZWN0aXZlIGluc3RhbmNlIG9uIGEgZ2l2ZW4gdGVtcGxhdGUgbm9kZSwgaW5mZXJyaW5nIGEgdHlwZSBmb3JcbiAqIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UgZnJvbSBhbnkgYm91bmQgaW5wdXRzLlxuICovXG5mdW5jdGlvbiB0Y2JDYWxsVHlwZUN0b3IoXG4gICAgZWw6IFRtcGxBc3RFbGVtZW50IHwgVG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlLCBiaW5kaW5nczogVGNiQmluZGluZ1tdKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IGRpckNsYXNzID0gdGNiLnJlZmVyZW5jZShkaXIucmVmKTtcblxuICAvLyBDb25zdHJ1Y3QgYW4gYXJyYXkgb2YgYHRzLlByb3BlcnR5QXNzaWdubWVudGBzIGZvciBlYWNoIGlucHV0IG9mIHRoZSBkaXJlY3RpdmUgdGhhdCBoYXMgYVxuICAvLyBtYXRjaGluZyBiaW5kaW5nLlxuICBjb25zdCBtZW1iZXJzID0gYmluZGluZ3MubWFwKGIgPT4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KGIuZmllbGQsIGIuZXhwcmVzc2lvbikpO1xuXG4gIC8vIENhbGwgdGhlIGBuZ1R5cGVDdG9yYCBtZXRob2Qgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcywgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCBhcmd1bWVudCBjcmVhdGVkXG4gIC8vIGZyb20gdGhlIG1hdGNoZWQgaW5wdXRzLlxuICByZXR1cm4gdHNDYWxsTWV0aG9kKFxuICAgICAgLyogcmVjZWl2ZXIgKi8gZGlyQ2xhc3MsXG4gICAgICAvKiBtZXRob2ROYW1lICovICduZ1R5cGVDdG9yJyxcbiAgICAgIC8qIGFyZ3MgKi9bdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZW1iZXJzKV0pO1xufVxuXG5pbnRlcmZhY2UgVGNiQmluZGluZyB7XG4gIGZpZWxkOiBzdHJpbmc7XG4gIHByb3BlcnR5OiBzdHJpbmc7XG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG59XG5cbmZ1bmN0aW9uIHRjYkdldElucHV0QmluZGluZ0V4cHJlc3Npb25zKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdGNiOiBDb250ZXh0LFxuICAgIHNjb3BlOiBTY29wZSk6IFRjYkJpbmRpbmdbXSB7XG4gIGNvbnN0IGJpbmRpbmdzOiBUY2JCaW5kaW5nW10gPSBbXTtcbiAgLy8gYGRpci5pbnB1dHNgIGlzIGFuIG9iamVjdCBtYXAgb2YgZmllbGQgbmFtZXMgb24gdGhlIGRpcmVjdGl2ZSBjbGFzcyB0byBwcm9wZXJ0eSBuYW1lcy5cbiAgLy8gVGhpcyBpcyBiYWNrd2FyZHMgZnJvbSB3aGF0J3MgbmVlZGVkIHRvIG1hdGNoIGJpbmRpbmdzIC0gYSBtYXAgb2YgcHJvcGVydGllcyB0byBmaWVsZCBuYW1lc1xuICAvLyBpcyBkZXNpcmVkLiBJbnZlcnQgYGRpci5pbnB1dHNgIGludG8gYHByb3BNYXRjaGAgdG8gY3JlYXRlIHRoaXMgbWFwLlxuICBjb25zdCBwcm9wTWF0Y2ggPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBpbnB1dHMgPSBkaXIuaW5wdXRzO1xuICBPYmplY3Qua2V5cyhpbnB1dHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICBBcnJheS5pc0FycmF5KGlucHV0c1trZXldKSA/IHByb3BNYXRjaC5zZXQoaW5wdXRzW2tleV1bMF0sIGtleSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcE1hdGNoLnNldChpbnB1dHNba2V5XSBhcyBzdHJpbmcsIGtleSk7XG4gIH0pO1xuXG4gIGVsLmlucHV0cy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICBpZiAoZWwgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICBlbC50ZW1wbGF0ZUF0dHJzLmZvckVhY2gocHJvY2Vzc0F0dHJpYnV0ZSk7XG4gIH1cbiAgcmV0dXJuIGJpbmRpbmdzO1xuXG4gIC8qKlxuICAgKiBBZGQgYSBiaW5kaW5nIGV4cHJlc3Npb24gdG8gdGhlIG1hcCBmb3IgZWFjaCBpbnB1dC90ZW1wbGF0ZSBhdHRyaWJ1dGUgb2YgdGhlIGRpcmVjdGl2ZSB0aGF0IGhhc1xuICAgKiBhIG1hdGNoaW5nIGJpbmRpbmcuXG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzQXR0cmlidXRlKGF0dHI6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8IFRtcGxBc3RUZXh0QXR0cmlidXRlKTogdm9pZCB7XG4gICAgaWYgKGF0dHIgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgJiYgcHJvcE1hdGNoLmhhcyhhdHRyLm5hbWUpKSB7XG4gICAgICAvLyBQcm9kdWNlIGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiB0aGUgYmluZGluZy5cbiAgICAgIGNvbnN0IGV4cHIgPSB0Y2JFeHByZXNzaW9uKGF0dHIudmFsdWUsIHRjYiwgc2NvcGUpO1xuICAgICAgLy8gQ2FsbCB0aGUgY2FsbGJhY2suXG4gICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgcHJvcGVydHk6IGF0dHIubmFtZSxcbiAgICAgICAgZmllbGQ6IHByb3BNYXRjaC5nZXQoYXR0ci5uYW1lKSAhLFxuICAgICAgICBleHByZXNzaW9uOiBleHByLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGV4cHJlc3Npb24gd2hpY2ggaW5zdGFudGlhdGVzIGFuIGVsZW1lbnQgYnkgaXRzIEhUTUwgdGFnTmFtZS5cbiAqXG4gKiBUaGFua3MgdG8gbmFycm93aW5nIG9mIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50KClgLCB0aGlzIGV4cHJlc3Npb24gd2lsbCBoYXZlIGl0cyB0eXBlIGluZmVycmVkXG4gKiBiYXNlZCBvbiB0aGUgdGFnIG5hbWUsIGluY2x1ZGluZyBmb3IgY3VzdG9tIGVsZW1lbnRzIHRoYXQgaGF2ZSBhcHByb3ByaWF0ZSAuZC50cyBkZWZpbml0aW9ucy5cbiAqL1xuZnVuY3Rpb24gdHNDcmVhdGVFbGVtZW50KHRhZ05hbWU6IHN0cmluZyk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCBjcmVhdGVFbGVtZW50ID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAvKiBleHByZXNzaW9uICovIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ2RvY3VtZW50JyksICdjcmVhdGVFbGVtZW50Jyk7XG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyBjcmVhdGVFbGVtZW50LFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1t0cy5jcmVhdGVMaXRlcmFsKHRhZ05hbWUpXSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYHRzLlZhcmlhYmxlU3RhdGVtZW50YCB3aGljaCBkZWNsYXJlcyBhIHZhcmlhYmxlIHdpdGhvdXQgZXhwbGljaXQgaW5pdGlhbGl6YXRpb24uXG4gKlxuICogVGhlIGluaXRpYWxpemVyIGBudWxsIWAgaXMgdXNlZCB0byBieXBhc3Mgc3RyaWN0IHZhcmlhYmxlIGluaXRpYWxpemF0aW9uIGNoZWNrcy5cbiAqXG4gKiBVbmxpa2Ugd2l0aCBgdHNDcmVhdGVWYXJpYWJsZWAsIHRoZSB0eXBlIG9mIHRoZSB2YXJpYWJsZSBpcyBleHBsaWNpdGx5IHNwZWNpZmllZC5cbiAqL1xuZnVuY3Rpb24gdHNEZWNsYXJlVmFyaWFibGUoaWQ6IHRzLklkZW50aWZpZXIsIHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuVmFyaWFibGVTdGF0ZW1lbnQge1xuICBjb25zdCBkZWNsID0gdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgIC8qIG5hbWUgKi8gaWQsXG4gICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCkpKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRlY2xhcmF0aW9uTGlzdCAqL1tkZWNsXSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYHRzLlZhcmlhYmxlU3RhdGVtZW50YCB0aGF0IGluaXRpYWxpemVzIGEgdmFyaWFibGUgd2l0aCBhIGdpdmVuIGV4cHJlc3Npb24uXG4gKlxuICogVW5saWtlIHdpdGggYHRzRGVjbGFyZVZhcmlhYmxlYCwgdGhlIHR5cGUgb2YgdGhlIHZhcmlhYmxlIGlzIGluZmVycmVkIGZyb20gdGhlIGluaXRpYWxpemVyXG4gKiBleHByZXNzaW9uLlxuICovXG5mdW5jdGlvbiB0c0NyZWF0ZVZhcmlhYmxlKGlkOiB0cy5JZGVudGlmaWVyLCBpbml0aWFsaXplcjogdHMuRXhwcmVzc2lvbik6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgY29uc3QgZGVjbCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAvKiBuYW1lICovIGlkLFxuICAgICAgLyogdHlwZSAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBpbml0aWFsaXplciAqLyBpbml0aWFsaXplcik7XG4gIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkZWNsYXJhdGlvbkxpc3QgKi9bZGVjbF0pO1xufVxuXG4vKipcbiAqIENvbnN0cnVjdCBhIGB0cy5DYWxsRXhwcmVzc2lvbmAgdGhhdCBjYWxscyBhIG1ldGhvZCBvbiBhIHJlY2VpdmVyLlxuICovXG5mdW5jdGlvbiB0c0NhbGxNZXRob2QoXG4gICAgcmVjZWl2ZXI6IHRzLkV4cHJlc3Npb24sIG1ldGhvZE5hbWU6IHN0cmluZywgYXJnczogdHMuRXhwcmVzc2lvbltdID0gW10pOiB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gIGNvbnN0IG1ldGhvZEFjY2VzcyA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlY2VpdmVyLCBtZXRob2ROYW1lKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIG1ldGhvZEFjY2VzcyxcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi8gYXJncyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhbiBgQVNUYCBleHByZXNzaW9uIHdpdGhpbiB0aGUgZ2l2ZW4gc2NvcGUuXG4gKlxuICogU29tZSBgQVNUYCBleHByZXNzaW9ucyByZWZlciB0byB0b3AtbGV2ZWwgY29uY2VwdHMgKHJlZmVyZW5jZXMsIHZhcmlhYmxlcywgdGhlIGNvbXBvbmVudFxuICogY29udGV4dCkuIFRoaXMgbWV0aG9kIGFzc2lzdHMgaW4gcmVzb2x2aW5nIHRob3NlLlxuICovXG5mdW5jdGlvbiB0Y2JSZXNvbHZlKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIC8vIFNob3J0IGNpcmN1aXQgZm9yIEFTVCB0eXBlcyB0aGF0IHdvbid0IGhhdmUgbWFwcGluZ3MuXG4gIGlmICghKGFzdCBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIgfHwgYXN0IGluc3RhbmNlb2YgUHJvcGVydHlSZWFkKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCAmJiBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSB7XG4gICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgdGVtcGxhdGUgbWV0YWRhdGEgaGFzIGJvdW5kIGEgdGFyZ2V0IGZvciB0aGlzIGV4cHJlc3Npb24uIElmIHNvLCB0aGVuXG4gICAgLy8gcmVzb2x2ZSB0aGF0IHRhcmdldC4gSWYgbm90LCB0aGVuIHRoZSBleHByZXNzaW9uIGlzIHJlZmVyZW5jaW5nIHRoZSB0b3AtbGV2ZWwgY29tcG9uZW50XG4gICAgLy8gY29udGV4dC5cbiAgICBjb25zdCBiaW5kaW5nID0gdGNiLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoYXN0KTtcbiAgICBpZiAoYmluZGluZyAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhpcyBleHByZXNzaW9uIGhhcyBhIGJpbmRpbmcgdG8gc29tZSB2YXJpYWJsZSBvciByZWZlcmVuY2UgaW4gdGhlIHRlbXBsYXRlLiBSZXNvbHZlIGl0LlxuICAgICAgaWYgKGJpbmRpbmcgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICAgICAgcmV0dXJuIHRjYlJlc29sdmVWYXJpYWJsZShiaW5kaW5nLCB0Y2IsIHNjb3BlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGhhbmRsZWQ6ICR7YmluZGluZ31gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpcyBhIFByb3BlcnR5UmVhZChJbXBsaWNpdFJlY2VpdmVyKSBhbmQgcHJvYmFibHkgcmVmZXJzIHRvIGEgcHJvcGVydHkgYWNjZXNzIG9uIHRoZVxuICAgICAgLy8gY29tcG9uZW50IGNvbnRleHQuIExldCBpdCBmYWxsIHRocm91Z2ggcmVzb2x1dGlvbiBoZXJlIHNvIGl0IHdpbGwgYmUgY2F1Z2h0IHdoZW4gdGhlXG4gICAgICAvLyBJbXBsaWNpdFJlY2VpdmVyIGlzIHJlc29sdmVkIGluIHRoZSBicmFuY2ggYmVsb3cuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgIC8vIEFTVCBpbnN0YW5jZXMgcmVwcmVzZW50aW5nIHZhcmlhYmxlcyBhbmQgcmVmZXJlbmNlcyBsb29rIHZlcnkgc2ltaWxhciB0byBwcm9wZXJ0eSByZWFkcyBmcm9tXG4gICAgLy8gdGhlIGNvbXBvbmVudCBjb250ZXh0OiBib3RoIGhhdmUgdGhlIHNoYXBlIFByb3BlcnR5UmVhZChJbXBsaWNpdFJlY2VpdmVyLCAncHJvcGVydHlOYW1lJykuXG4gICAgLy9cbiAgICAvLyBgdGNiRXhwcmVzc2lvbmAgd2lsbCBmaXJzdCB0cnkgdG8gYHRjYlJlc29sdmVgIHRoZSBvdXRlciBQcm9wZXJ0eVJlYWQuIElmIHRoaXMgd29ya3MsIGl0J3NcbiAgICAvLyBiZWNhdXNlIHRoZSBgQm91bmRUYXJnZXRgIGZvdW5kIGFuIGV4cHJlc3Npb24gdGFyZ2V0IGZvciB0aGUgd2hvbGUgZXhwcmVzc2lvbiwgYW5kIHRoZXJlZm9yZVxuICAgIC8vIGB0Y2JFeHByZXNzaW9uYCB3aWxsIG5ldmVyIGF0dGVtcHQgdG8gYHRjYlJlc29sdmVgIHRoZSBJbXBsaWNpdFJlY2VpdmVyIG9mIHRoYXQgUHJvcGVydHlSZWFkLlxuICAgIC8vXG4gICAgLy8gVGhlcmVmb3JlIGlmIGB0Y2JSZXNvbHZlYCBpcyBjYWxsZWQgb24gYW4gYEltcGxpY2l0UmVjZWl2ZXJgLCBpdCdzIGJlY2F1c2Ugbm8gb3V0ZXJcbiAgICAvLyBQcm9wZXJ0eVJlYWQgcmVzb2x2ZWQgdG8gYSB2YXJpYWJsZSBvciByZWZlcmVuY2UsIGFuZCB0aGVyZWZvcmUgdGhpcyBpcyBhIHByb3BlcnR5IHJlYWQgb25cbiAgICAvLyB0aGUgY29tcG9uZW50IGNvbnRleHQgaXRzZWxmLlxuICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKCdjdHgnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIEFTVCBpc24ndCBzcGVjaWFsIGFmdGVyIGFsbC5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmUgYSB2YXJpYWJsZSB0byBhbiBpZGVudGlmaWVyIHRoYXQgcmVwcmVzZW50cyBpdHMgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHRjYlJlc29sdmVWYXJpYWJsZShiaW5kaW5nOiBUbXBsQXN0VmFyaWFibGUsIHRjYjogQ29udGV4dCwgc2NvcGU6IFNjb3BlKTogdHMuSWRlbnRpZmllciB7XG4gIC8vIExvb2sgdG8gc2VlIHdoZXRoZXIgdGhlIHZhcmlhYmxlIHdhcyBhbHJlYWR5IGluaXRpYWxpemVkLiBJZiBzbywganVzdCByZXVzZSBpdC5cbiAgbGV0IGlkID0gc2NvcGUuZ2V0VmFyaWFibGVJZChiaW5kaW5nKTtcbiAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIHRlbXBsYXRlIHdoaWNoIGRlY2xhcmVzIHRoaXMgdmFyaWFibGUuXG4gIGNvbnN0IHRtcGwgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0VGVtcGxhdGVPZlN5bWJvbChiaW5kaW5nKTtcbiAgaWYgKHRtcGwgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFRtcGxBc3RWYXJpYWJsZSB0byBiZSBtYXBwZWQgdG8gYSBUbXBsQXN0VGVtcGxhdGVgKTtcbiAgfVxuICAvLyBMb29rIGZvciBhIGNvbnRleHQgdmFyaWFibGUgZm9yIHRoZSB0ZW1wbGF0ZS4gVGhpcyBzaG91bGQndmUgYmVlbiBkZWNsYXJlZCBiZWZvcmUgYW55dGhpbmcgdGhhdFxuICAvLyBjb3VsZCByZWZlcmVuY2UgdGhlIHRlbXBsYXRlJ3MgdmFyaWFibGVzLlxuICBjb25zdCBjdHggPSBzY29wZS5nZXRUZW1wbGF0ZUN0eCh0bXBsKTtcbiAgaWYgKGN0eCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgdGVtcGxhdGUgY29udGV4dCB0byBleGlzdC4nKTtcbiAgfVxuXG4gIC8vIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBUbXBsQXN0VmFyaWFibGUsIGFuZCBpbml0aWFsaXplIGl0IHRvIGEgcmVhZCBvZiB0aGUgdmFyaWFibGUgb25cbiAgLy8gdGhlIHRlbXBsYXRlIGNvbnRleHQuXG4gIGlkID0gc2NvcGUuYWxsb2NhdGVWYXJpYWJsZUlkKGJpbmRpbmcpO1xuICBjb25zdCBpbml0aWFsaXplciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyBjdHgsXG4gICAgICAvKiBuYW1lICovIGJpbmRpbmcudmFsdWUpO1xuXG4gIC8vIERlY2xhcmUgdGhlIHZhcmlhYmxlLCBhbmQgcmV0dXJuIGl0cyBpZGVudGlmaWVyLlxuICBzY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgaW5pdGlhbGl6ZXIpKTtcbiAgcmV0dXJuIGlkO1xufVxuIl19