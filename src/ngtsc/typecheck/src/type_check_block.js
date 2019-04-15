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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9jaGVja19ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy90eXBlX2NoZWNrX2Jsb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQThOO0lBQzlOLCtCQUFpQztJQUVqQyxtRUFBd0Y7SUFFeEYseUVBQW9FO0lBR3BFLHVGQUE2QztJQUk3Qzs7Ozs7Ozs7OztPQVVHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQ2xDLElBQTJDLEVBQUUsSUFBNEIsRUFDekUsYUFBNEIsRUFBRSxVQUE0QjtRQUM1RCxJQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDM0YsSUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsZUFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFaEUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RSxPQUFPLEVBQUUsQ0FBQyx5QkFBeUI7UUFDL0IsZ0JBQWdCLENBQUMsU0FBUztRQUMxQixlQUFlLENBQUMsU0FBUztRQUN6QixtQkFBbUIsQ0FBQyxTQUFTO1FBQzdCLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTTtRQUN0QixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYztRQUN4QyxnQkFB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QUFDLENBQUM7U0FDeEQ7UUFFRCxpR0FBaUc7UUFDakcsd0JBQXdCO1FBQ3hCLEVBQUUsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkMsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLG9CQUFvQjtRQUN2QyxnQkFBZ0IsQ0FBQyxHQUFHO1FBQ3BCLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFOUIsbURBQW1EO1FBQ25ELEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDdEQsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluZGluZ1R5cGUsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBQcm9wZXJ0eVJlYWQsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kVGV4dCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge05PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9ufSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHthc3RUb1R5cGVzY3JpcHR9IGZyb20gJy4vZXhwcmVzc2lvbic7XG5cblxuXG4vKipcbiAqIEdpdmVuIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIGZvciBhIGNvbXBvbmVudCwgYW5kIG1ldGFkYXRhIHJlZ2FyZGluZyB0aGF0IGNvbXBvbmVudCwgY29tcG9zZSBhXG4gKiBcInR5cGUgY2hlY2sgYmxvY2tcIiBmdW5jdGlvbi5cbiAqXG4gKiBXaGVuIHBhc3NlZCB0aHJvdWdoIFR5cGVTY3JpcHQncyBUeXBlQ2hlY2tlciwgdHlwZSBlcnJvcnMgdGhhdCBhcmlzZSB3aXRoaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2tcbiAqIGZ1bmN0aW9uIGluZGljYXRlIGlzc3VlcyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBUeXBlU2NyaXB0IG5vZGUgZm9yIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gKiBAcGFyYW0gbWV0YSBtZXRhZGF0YSBhYm91dCB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgYW5kIHRoZSBmdW5jdGlvbiBiZWluZyBnZW5lcmF0ZWQuXG4gKiBAcGFyYW0gaW1wb3J0TWFuYWdlciBhbiBgSW1wb3J0TWFuYWdlcmAgZm9yIHRoZSBmaWxlIGludG8gd2hpY2ggdGhlIFRDQiB3aWxsIGJlIHdyaXR0ZW4uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sIG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcik6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICBjb25zdCB0Y2IgPSBuZXcgQ29udGV4dChtZXRhLmJvdW5kVGFyZ2V0LCBub2RlLmdldFNvdXJjZUZpbGUoKSwgaW1wb3J0TWFuYWdlciwgcmVmRW1pdHRlcik7XG4gIGNvbnN0IHNjb3BlID0gbmV3IFNjb3BlKHRjYik7XG4gIHRjYlByb2Nlc3NOb2RlcyhtZXRhLmJvdW5kVGFyZ2V0LnRhcmdldC50ZW1wbGF0ZSAhLCB0Y2IsIHNjb3BlKTtcblxuICBjb25zdCBib2R5ID0gdHMuY3JlYXRlQmxvY2soW3RzLmNyZWF0ZUlmKHRzLmNyZWF0ZVRydWUoKSwgc2NvcGUuZ2V0QmxvY2soKSldKTtcblxuICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFzdGVyaXNrVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbmFtZSAqLyBtZXRhLmZuTmFtZSxcbiAgICAgIC8qIHR5cGVQYXJhbWV0ZXJzICovIG5vZGUudHlwZVBhcmFtZXRlcnMsXG4gICAgICAvKiBwYXJhbWV0ZXJzICovW3RjYkN0eFBhcmFtKG5vZGUpXSxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYm9keSAqLyBib2R5KTtcbn1cblxuLyoqXG4gKiBPdmVyYWxsIGdlbmVyYXRpb24gY29udGV4dCBmb3IgdGhlIHR5cGUgY2hlY2sgYmxvY2suXG4gKlxuICogYENvbnRleHRgIGhhbmRsZXMgb3BlcmF0aW9ucyBkdXJpbmcgY29kZSBnZW5lcmF0aW9uIHdoaWNoIGFyZSBnbG9iYWwgd2l0aCByZXNwZWN0IHRvIHRoZSB3aG9sZVxuICogYmxvY2suIEl0J3MgcmVzcG9uc2libGUgZm9yIHZhcmlhYmxlIG5hbWUgYWxsb2NhdGlvbiBhbmQgbWFuYWdlbWVudCBvZiBhbnkgaW1wb3J0cyBuZWVkZWQuIEl0XG4gKiBhbHNvIGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZSBtZXRhZGF0YSBpdHNlbGYuXG4gKi9cbmNsYXNzIENvbnRleHQge1xuICBwcml2YXRlIG5leHRJZCA9IDE7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LFxuICAgICAgcHJpdmF0ZSBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBwcml2YXRlIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpIHt9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGEgbmV3IHZhcmlhYmxlIG5hbWUgZm9yIHVzZSB3aXRoaW4gdGhlIGBDb250ZXh0YC5cbiAgICpcbiAgICogQ3VycmVudGx5IHRoaXMgdXNlcyBhIG1vbm90b25pY2FsbHkgaW5jcmVhc2luZyBjb3VudGVyLCBidXQgaW4gdGhlIGZ1dHVyZSB0aGUgdmFyaWFibGUgbmFtZVxuICAgKiBtaWdodCBjaGFuZ2UgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIGRhdGEgYmVpbmcgc3RvcmVkLlxuICAgKi9cbiAgYWxsb2NhdGVJZCgpOiB0cy5JZGVudGlmaWVyIHsgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90JHt0aGlzLm5leHRJZCsrfWApOyB9XG5cbiAgLyoqXG4gICAqIFdyaXRlIGEgYHRzLkV4cHJlc3Npb25gIHRoYXQgcmVmZXJlbmNlcyB0aGUgZ2l2ZW4gbm9kZS5cbiAgICpcbiAgICogVGhpcyBtYXkgaW52b2x2ZSBpbXBvcnRpbmcgdGhlIG5vZGUgaW50byB0aGUgZmlsZSBpZiBpdCdzIG5vdCBkZWNsYXJlZCB0aGVyZSBhbHJlYWR5LlxuICAgKi9cbiAgcmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbmdFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLCB0aGlzLnNvdXJjZUZpbGUpO1xuICAgIGlmIChuZ0V4cHIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWFjaGFibGUgcmVmZXJlbmNlOiAke3JlZi5ub2RlfWApO1xuICAgIH1cblxuICAgIC8vIFVzZSBgdHJhbnNsYXRlRXhwcmVzc2lvbmAgdG8gY29udmVydCB0aGUgYEV4cHJlc3Npb25gIGludG8gYSBgdHMuRXhwcmVzc2lvbmAuXG4gICAgcmV0dXJuIHRyYW5zbGF0ZUV4cHJlc3Npb24obmdFeHByLCB0aGlzLmltcG9ydE1hbmFnZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpO1xuICB9XG59XG5cbi8qKlxuICogTG9jYWwgc2NvcGUgd2l0aGluIHRoZSB0eXBlIGNoZWNrIGJsb2NrIGZvciBhIHBhcnRpY3VsYXIgdGVtcGxhdGUuXG4gKlxuICogVGhlIHRvcC1sZXZlbCB0ZW1wbGF0ZSBhbmQgZWFjaCBuZXN0ZWQgYDxuZy10ZW1wbGF0ZT5gIGhhdmUgdGhlaXIgb3duIGBTY29wZWAsIHdoaWNoIGV4aXN0IGluIGFcbiAqIGhpZXJhcmNoeS4gVGhlIHN0cnVjdHVyZSBvZiB0aGlzIGhpZXJhcmNoeSBtaXJyb3JzIHRoZSBzeW50YWN0aWMgc2NvcGVzIGluIHRoZSBnZW5lcmF0ZWQgdHlwZVxuICogY2hlY2sgYmxvY2ssIHdoZXJlIGVhY2ggbmVzdGVkIHRlbXBsYXRlIGlzIGVuY2FzZWQgaW4gYW4gYGlmYCBzdHJ1Y3R1cmUuXG4gKlxuICogQXMgYSB0ZW1wbGF0ZSBpcyBwcm9jZXNzZWQgaW4gYSBnaXZlbiBgU2NvcGVgLCBzdGF0ZW1lbnRzIGFyZSBhZGRlZCB2aWEgYGFkZFN0YXRlbWVudCgpYC4gV2hlblxuICogdGhpcyBwcm9jZXNzaW5nIGlzIGNvbXBsZXRlLCB0aGUgYFNjb3BlYCBjYW4gYmUgdHVybmVkIGludG8gYSBgdHMuQmxvY2tgIHZpYSBgZ2V0QmxvY2soKWAuXG4gKi9cbmNsYXNzIFNjb3BlIHtcbiAgLyoqXG4gICAqIE1hcCBvZiBub2RlcyB0byBpbmZvcm1hdGlvbiBhYm91dCB0aGF0IG5vZGUgd2l0aGluIHRoZSBUQ0IuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCB0aGlzIHN0b3JlcyB0aGUgYHRzLklkZW50aWZpZXJgIHdpdGhpbiB0aGUgVENCIGZvciBhbiBlbGVtZW50IG9yIDxuZy10ZW1wbGF0ZT4uXG4gICAqL1xuICBwcml2YXRlIGVsZW1lbnREYXRhID0gbmV3IE1hcDxUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIFRjYk5vZGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW1tZWRpYXRlbHkgbmVzdGVkIDxuZy10ZW1wbGF0ZT5zICh3aXRoaW4gdGhpcyBgU2NvcGVgKSB0byB0aGUgYHRzLklkZW50aWZpZXJgIG9mIHRoZWlyXG4gICAqIHJlbmRlcmluZyBjb250ZXh0cy5cbiAgICovXG4gIHByaXZhdGUgdGVtcGxhdGVDdHggPSBuZXcgTWFwPFRtcGxBc3RUZW1wbGF0ZSwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHZhcmlhYmxlcyBkZWNsYXJlZCBvbiB0aGUgdGVtcGxhdGUgdGhhdCBjcmVhdGVkIHRoaXMgYFNjb3BlYCB0byB0aGVpciBgdHMuSWRlbnRpZmllcmBzXG4gICAqIHdpdGhpbiB0aGUgVENCLlxuICAgKi9cbiAgcHJpdmF0ZSB2YXJNYXAgPSBuZXcgTWFwPFRtcGxBc3RWYXJpYWJsZSwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBmb3IgdGhpcyB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgc3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRjYjogQ29udGV4dCwgcHJpdmF0ZSBwYXJlbnQ6IFNjb3BlfG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGlkZW50aWZpZXIgd2l0aGluIHRoZSBUQ0IgZm9yIGEgZ2l2ZW4gYFRtcGxBc3RFbGVtZW50YC5cbiAgICovXG4gIGdldEVsZW1lbnRJZChlbDogVG1wbEFzdEVsZW1lbnQpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldEVsZW1lbnREYXRhKGVsLCBmYWxzZSk7XG4gICAgaWYgKGRhdGEgIT09IG51bGwgJiYgZGF0YS5odG1sTm9kZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRhdGEuaHRtbE5vZGU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBhcmVudCAhPT0gbnVsbCA/IHRoaXMucGFyZW50LmdldEVsZW1lbnRJZChlbCkgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaWRlbnRpZmllciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUuXG4gICAqL1xuICBnZXREaXJlY3RpdmVJZChlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogdHMuSWRlbnRpZmllclxuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldEVsZW1lbnREYXRhKGVsLCBmYWxzZSk7XG4gICAgaWYgKGRhdGEgIT09IG51bGwgJiYgZGF0YS5kaXJlY3RpdmVzICE9PSBudWxsICYmIGRhdGEuZGlyZWN0aXZlcy5oYXMoZGlyKSkge1xuICAgICAgcmV0dXJuIGRhdGEuZGlyZWN0aXZlcy5nZXQoZGlyKSAhO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgIT09IG51bGwgPyB0aGlzLnBhcmVudC5nZXREaXJlY3RpdmVJZChlbCwgZGlyKSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIG9mIGEgdGVtcGxhdGUncyByZW5kZXJpbmcgY29udGV4dC5cbiAgICovXG4gIGdldFRlbXBsYXRlQ3R4KHRtcGw6IFRtcGxBc3RUZW1wbGF0ZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVDdHguZ2V0KHRtcGwpIHx8XG4gICAgICAgICh0aGlzLnBhcmVudCAhPT0gbnVsbCA/IHRoaXMucGFyZW50LmdldFRlbXBsYXRlQ3R4KHRtcGwpIDogbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpZGVudGlmaWVyIG9mIGEgdGVtcGxhdGUgdmFyaWFibGUuXG4gICAqL1xuICBnZXRWYXJpYWJsZUlkKHY6IFRtcGxBc3RWYXJpYWJsZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMudmFyTWFwLmdldCh2KSB8fCAodGhpcy5wYXJlbnQgIT09IG51bGwgPyB0aGlzLnBhcmVudC5nZXRWYXJpYWJsZUlkKHYpIDogbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIGdpdmVuIHRlbXBsYXRlIGVsZW1lbnQuXG4gICAqL1xuICBhbGxvY2F0ZUVsZW1lbnRJZChlbDogVG1wbEFzdEVsZW1lbnQpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRFbGVtZW50RGF0YShlbCwgdHJ1ZSk7XG4gICAgaWYgKGRhdGEuaHRtbE5vZGUgPT09IG51bGwpIHtcbiAgICAgIGRhdGEuaHRtbE5vZGUgPSB0aGlzLnRjYi5hbGxvY2F0ZUlkKCk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLmh0bWxOb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG9jYXRlIGFuIGlkZW50aWZpZXIgZm9yIHRoZSBnaXZlbiB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAgICovXG4gIGFsbG9jYXRlVmFyaWFibGVJZCh2OiBUbXBsQXN0VmFyaWFibGUpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBpZiAoIXRoaXMudmFyTWFwLmhhcyh2KSkge1xuICAgICAgdGhpcy52YXJNYXAuc2V0KHYsIHRoaXMudGNiLmFsbG9jYXRlSWQoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnZhck1hcC5nZXQodikgITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvY2F0ZSBhbiBpZGVudGlmaWVyIGZvciBhbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gZGlyZWN0aXZlIG9uIHRoZSBnaXZlbiB0ZW1wbGF0ZSBub2RlLlxuICAgKi9cbiAgYWxsb2NhdGVEaXJlY3RpdmVJZChlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBkaXI6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTpcbiAgICAgIHRzLklkZW50aWZpZXIge1xuICAgIC8vIExvb2sgdXAgdGhlIGRhdGEgZm9yIHRoaXMgdGVtcGxhdGUgbm9kZS5cbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRFbGVtZW50RGF0YShlbCwgdHJ1ZSk7XG5cbiAgICAvLyBMYXppbHkgcG9wdWxhdGUgdGhlIGRpcmVjdGl2ZXMgbWFwLCBpZiBpdCBleGlzdHMuXG4gICAgaWYgKGRhdGEuZGlyZWN0aXZlcyA9PT0gbnVsbCkge1xuICAgICAgZGF0YS5kaXJlY3RpdmVzID0gbmV3IE1hcDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdHMuSWRlbnRpZmllcj4oKTtcbiAgICB9XG4gICAgaWYgKCFkYXRhLmRpcmVjdGl2ZXMuaGFzKGRpcikpIHtcbiAgICAgIGRhdGEuZGlyZWN0aXZlcy5zZXQoZGlyLCB0aGlzLnRjYi5hbGxvY2F0ZUlkKCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5kaXJlY3RpdmVzLmdldChkaXIpICE7XG4gIH1cblxuICAvKipcbiAgICogQWxsb2NhdGUgYW4gaWRlbnRpZmllciBmb3IgdGhlIHJlbmRlcmluZyBjb250ZXh0IG9mIGEgZ2l2ZW4gdGVtcGxhdGUuXG4gICAqL1xuICBhbGxvY2F0ZVRlbXBsYXRlQ3R4KHRtcGw6IFRtcGxBc3RUZW1wbGF0ZSk6IHRzLklkZW50aWZpZXIge1xuICAgIGlmICghdGhpcy50ZW1wbGF0ZUN0eC5oYXModG1wbCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGVDdHguc2V0KHRtcGwsIHRoaXMudGNiLmFsbG9jYXRlSWQoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlQ3R4LmdldCh0bXBsKSAhO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHN0YXRlbWVudCB0byB0aGlzIHNjb3BlLlxuICAgKi9cbiAgYWRkU3RhdGVtZW50KHN0bXQ6IHRzLlN0YXRlbWVudCk6IHZvaWQgeyB0aGlzLnN0YXRlbWVudHMucHVzaChzdG10KTsgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBgdHMuQmxvY2tgIGNvbnRhaW5pbmcgdGhlIHN0YXRlbWVudHMgaW4gdGhpcyBzY29wZS5cbiAgICovXG4gIGdldEJsb2NrKCk6IHRzLkJsb2NrIHsgcmV0dXJuIHRzLmNyZWF0ZUJsb2NrKHRoaXMuc3RhdGVtZW50cyk7IH1cblxuICAvKipcbiAgICogSW50ZXJuYWwgaGVscGVyIHRvIGdldCB0aGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMgY2FuIGVpdGhlciByZXR1cm4gYG51bGxgIGlmIHRoZSBkYXRhIGlzIG5vdCBwcmVzZW50ICh3aGVuIHRoZSBgYWxsb2NgIGZsYWcgaXMgc2V0IHRvXG4gICAqIGBmYWxzZWApLCBvciBpdCBjYW4gaW5pdGlhbGl6ZSB0aGUgZGF0YSBmb3IgdGhlIGVsZW1lbnQgKHdoZW4gYGFsbG9jYCBpcyBgdHJ1ZWApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFbGVtZW50RGF0YShlbDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBhbGxvYzogdHJ1ZSk6IFRjYk5vZGVEYXRhO1xuICBwcml2YXRlIGdldEVsZW1lbnREYXRhKGVsOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUsIGFsbG9jOiBmYWxzZSk6IFRjYk5vZGVEYXRhfG51bGw7XG4gIHByaXZhdGUgZ2V0RWxlbWVudERhdGEoZWw6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgYWxsb2M6IGJvb2xlYW4pOiBUY2JOb2RlRGF0YXxudWxsIHtcbiAgICBpZiAoYWxsb2MgJiYgIXRoaXMuZWxlbWVudERhdGEuaGFzKGVsKSkge1xuICAgICAgdGhpcy5lbGVtZW50RGF0YS5zZXQoZWwsIHtodG1sTm9kZTogbnVsbCwgZGlyZWN0aXZlczogbnVsbH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbGVtZW50RGF0YS5nZXQoZWwpIHx8IG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBEYXRhIHN0b3JlZCBmb3IgYSB0ZW1wbGF0ZSBub2RlIGluIGEgVENCLlxuICovXG5pbnRlcmZhY2UgVGNiTm9kZURhdGEge1xuICAvKipcbiAgICogVGhlIGlkZW50aWZpZXIgb2YgdGhlIG5vZGUgZWxlbWVudCBpbnN0YW5jZSwgaWYgYW55LlxuICAgKi9cbiAgaHRtbE5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbDtcbiAgZGlyZWN0aXZlczogTWFwPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCB0cy5JZGVudGlmaWVyPnxudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSB0aGUgYGN0eGAgcGFyYW1ldGVyIHRvIHRoZSB0b3AtbGV2ZWwgVENCIGZ1bmN0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSBwYXJhbWV0ZXIgd2l0aCBhIHR5cGUgZXF1aXZhbGVudCB0byB0aGUgY29tcG9uZW50IHR5cGUsIHdpdGggYWxsIGdlbmVyaWMgdHlwZVxuICogcGFyYW1ldGVycyBsaXN0ZWQgKHdpdGhvdXQgdGhlaXIgZ2VuZXJpYyBib3VuZHMpLlxuICovXG5mdW5jdGlvbiB0Y2JDdHhQYXJhbShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICBsZXQgdHlwZUFyZ3VtZW50czogdHMuVHlwZU5vZGVbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIC8vIENoZWNrIGlmIHRoZSBjb21wb25lbnQgaXMgZ2VuZXJpYywgYW5kIHBhc3MgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgaWYgc28uXG4gIGlmIChub2RlLnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICB0eXBlQXJndW1lbnRzID1cbiAgICAgICAgbm9kZS50eXBlUGFyYW1ldGVycy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUocGFyYW0ubmFtZSwgdW5kZWZpbmVkKSk7XG4gIH1cbiAgY29uc3QgdHlwZSA9IHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKG5vZGUubmFtZSAhLCB0eXBlQXJndW1lbnRzKTtcbiAgcmV0dXJuIHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGRvdERvdERvdFRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIG5hbWUgKi8gJ2N0eCcsXG4gICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhbiBhcnJheSBvZiB0ZW1wbGF0ZSBub2RlcyBhbmQgZ2VuZXJhdGUgdHlwZSBjaGVja2luZyBjb2RlIGZvciB0aGVtIHdpdGhpbiB0aGUgZ2l2ZW5cbiAqIGBTY29wZWAuXG4gKlxuICogQHBhcmFtIG5vZGVzIHRlbXBsYXRlIG5vZGUgYXJyYXkgb3ZlciB3aGljaCB0byBpdGVyYXRlLlxuICogQHBhcmFtIHRjYiBjb250ZXh0IG9mIHRoZSBvdmVyYWxsIHR5cGUgY2hlY2sgYmxvY2suXG4gKiBAcGFyYW0gc2NvcGVcbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc05vZGVzKG5vZGVzOiBUbXBsQXN0Tm9kZVtdLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHZvaWQge1xuICBub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgIC8vIFByb2Nlc3MgZWxlbWVudHMsIHRlbXBsYXRlcywgYW5kIGJpbmRpbmdzLlxuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHRjYlByb2Nlc3NFbGVtZW50KG5vZGUsIHRjYiwgc2NvcGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgdGNiUHJvY2Vzc1RlbXBsYXRlRGVjbGFyYXRpb24obm9kZSwgdGNiLCBzY29wZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgICAgY29uc3QgZXhwciA9IHRjYkV4cHJlc3Npb24obm9kZS52YWx1ZSwgdGNiLCBzY29wZSk7XG4gICAgICBzY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlU3RhdGVtZW50KGV4cHIpKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gZWxlbWVudCwgZ2VuZXJhdGluZyB0eXBlIGNoZWNraW5nIGNvZGUgZm9yIGl0LCBpdHMgZGlyZWN0aXZlcywgYW5kIGl0cyBjaGlsZHJlbi5cbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc0VsZW1lbnQoZWw6IFRtcGxBc3RFbGVtZW50LCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLklkZW50aWZpZXIge1xuICBsZXQgaWQgPSBzY29wZS5nZXRFbGVtZW50SWQoZWwpO1xuICBpZiAoaWQgIT09IG51bGwpIHtcbiAgICAvLyBUaGlzIGVsZW1lbnQgaGFzIGJlZW4gcHJvY2Vzc2VkIGJlZm9yZS4gTm8gbmVlZCB0byBydW4gdGhyb3VnaCBpdCBhZ2Fpbi5cbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgaWQgPSBzY29wZS5hbGxvY2F0ZUVsZW1lbnRJZChlbCk7XG5cbiAgLy8gQWRkIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZWxlbWVudCB1c2luZyBkb2N1bWVudC5jcmVhdGVFbGVtZW50LlxuICBzY29wZS5hZGRTdGF0ZW1lbnQodHNDcmVhdGVWYXJpYWJsZShpZCwgdHNDcmVhdGVFbGVtZW50KGVsLm5hbWUpKSk7XG5cblxuICAvLyBDb25zdHJ1Y3QgYSBzZXQgb2YgYWxsIHRoZSBpbnB1dCBiaW5kaW5ncy4gQW55dGhpbmcgbWF0Y2hlZCBieSBkaXJlY3RpdmVzIHdpbGwgYmUgcmVtb3ZlZCBmcm9tXG4gIC8vIHRoaXMgc2V0LiBUaGUgcmVzdCBhcmUgYmluZGluZ3MgYmVpbmcgbWFkZSBvbiB0aGUgZWxlbWVudCBpdHNlbGYuXG4gIGNvbnN0IGlucHV0cyA9IG5ldyBTZXQoXG4gICAgICBlbC5pbnB1dHMuZmlsdGVyKGlucHV0ID0+IGlucHV0LnR5cGUgPT09IEJpbmRpbmdUeXBlLlByb3BlcnR5KS5tYXAoaW5wdXQgPT4gaW5wdXQubmFtZSkpO1xuXG4gIC8vIFByb2Nlc3MgZGlyZWN0aXZlcyBvZiB0aGUgbm9kZS5cbiAgdGNiUHJvY2Vzc0RpcmVjdGl2ZXMoZWwsIGlucHV0cywgdGNiLCBzY29wZSk7XG5cbiAgLy8gQXQgdGhpcyBwb2ludCwgYGlucHV0c2Agbm93IGNvbnRhaW5zIG9ubHkgdGhvc2UgYmluZGluZ3Mgbm90IG1hdGNoZWQgYnkgYW55IGRpcmVjdGl2ZS4gVGhlc2VcbiAgLy8gYmluZGluZ3MgZ28gdG8gdGhlIGVsZW1lbnQgaXRzZWxmLlxuICBpbnB1dHMuZm9yRWFjaChuYW1lID0+IHtcbiAgICBjb25zdCBiaW5kaW5nID0gZWwuaW5wdXRzLmZpbmQoaW5wdXQgPT4gaW5wdXQubmFtZSA9PT0gbmFtZSkgITtcbiAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihiaW5kaW5nLnZhbHVlLCB0Y2IsIHNjb3BlKTtcblxuICAgIGNvbnN0IHByb3AgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhpZCAhLCBuYW1lKTtcbiAgICBjb25zdCBhc3NpZ24gPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgZXhwcik7XG4gICAgc2NvcGUuYWRkU3RhdGVtZW50KHRzLmNyZWF0ZVN0YXRlbWVudChhc3NpZ24pKTtcbiAgfSk7XG5cbiAgLy8gUmVjdXJzZSBpbnRvIGNoaWxkcmVuLlxuICB0Y2JQcm9jZXNzTm9kZXMoZWwuY2hpbGRyZW4sIHRjYiwgc2NvcGUpO1xuXG4gIHJldHVybiBpZDtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIGFsbCB0aGUgZGlyZWN0aXZlcyBhc3NvY2lhdGVkIHdpdGggYSBnaXZlbiB0ZW1wbGF0ZSBub2RlLlxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzRGlyZWN0aXZlcyhcbiAgICBlbDogVG1wbEFzdEVsZW1lbnQgfCBUbXBsQXN0VGVtcGxhdGUsIHVuY2xhaW1lZDogU2V0PHN0cmluZz4sIHRjYjogQ29udGV4dCxcbiAgICBzY29wZTogU2NvcGUpOiB2b2lkIHtcbiAgY29uc3QgZGlyZWN0aXZlcyA9IHRjYi5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGVsKTtcbiAgaWYgKGRpcmVjdGl2ZXMgPT09IG51bGwpIHtcbiAgICAvLyBObyBkaXJlY3RpdmVzLCBub3RoaW5nIHRvIGRvLlxuICAgIHJldHVybjtcbiAgfVxuICBkaXJlY3RpdmVzLmZvckVhY2goZGlyID0+IHRjYlByb2Nlc3NEaXJlY3RpdmUoZWwsIGRpciwgdW5jbGFpbWVkLCB0Y2IsIHNjb3BlKSk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhIGRpcmVjdGl2ZSwgZ2VuZXJhdGluZyB0eXBlIGNoZWNraW5nIGNvZGUgZm9yIGl0LlxuICovXG5mdW5jdGlvbiB0Y2JQcm9jZXNzRGlyZWN0aXZlKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdW5jbGFpbWVkOiBTZXQ8c3RyaW5nPixcbiAgICB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLklkZW50aWZpZXIge1xuICBsZXQgaWQgPSBzY29wZS5nZXREaXJlY3RpdmVJZChlbCwgZGlyKTtcbiAgaWYgKGlkICE9PSBudWxsKSB7XG4gICAgLy8gVGhpcyBkaXJlY3RpdmUgaGFzIGJlZW4gcHJvY2Vzc2VkIGJlZm9yZS4gTm8gbmVlZCB0byBydW4gdGhyb3VnaCBpdCBhZ2Fpbi5cbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgaWQgPSBzY29wZS5hbGxvY2F0ZURpcmVjdGl2ZUlkKGVsLCBkaXIpO1xuXG4gIGNvbnN0IGJpbmRpbmdzID0gdGNiR2V0SW5wdXRCaW5kaW5nRXhwcmVzc2lvbnMoZWwsIGRpciwgdGNiLCBzY29wZSk7XG5cblxuICAvLyBDYWxsIHRoZSB0eXBlIGNvbnN0cnVjdG9yIG9mIHRoZSBkaXJlY3RpdmUgdG8gaW5mZXIgYSB0eXBlLCBhbmQgYXNzaWduIHRoZSBkaXJlY3RpdmUgaW5zdGFuY2UuXG4gIHNjb3BlLmFkZFN0YXRlbWVudCh0c0NyZWF0ZVZhcmlhYmxlKGlkLCB0Y2JDYWxsVHlwZUN0b3IoZWwsIGRpciwgdGNiLCBzY29wZSwgYmluZGluZ3MpKSk7XG5cbiAgdGNiUHJvY2Vzc0JpbmRpbmdzKGlkLCBiaW5kaW5ncywgdW5jbGFpbWVkLCB0Y2IsIHNjb3BlKTtcblxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHRjYlByb2Nlc3NCaW5kaW5ncyhcbiAgICByZWN2OiB0cy5FeHByZXNzaW9uLCBiaW5kaW5nczogVGNiQmluZGluZ1tdLCB1bmNsYWltZWQ6IFNldDxzdHJpbmc+LCB0Y2I6IENvbnRleHQsXG4gICAgc2NvcGU6IFNjb3BlKTogdm9pZCB7XG4gIC8vIEl0ZXJhdGUgdGhyb3VnaCBhbGwgdGhlIGJpbmRpbmdzIHRoaXMgZGlyZWN0aXZlIGlzIGNvbnN1bWluZy5cbiAgYmluZGluZ3MuZm9yRWFjaChiaW5kaW5nID0+IHtcbiAgICAvLyBHZW5lcmF0ZSBhbiBhc3NpZ25tZW50IHN0YXRlbWVudCBmb3IgdGhpcyBiaW5kaW5nLlxuICAgIGNvbnN0IHByb3AgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhyZWN2LCBiaW5kaW5nLmZpZWxkKTtcbiAgICBjb25zdCBhc3NpZ24gPSB0cy5jcmVhdGVCaW5hcnkocHJvcCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgYmluZGluZy5leHByZXNzaW9uKTtcbiAgICBzY29wZS5hZGRTdGF0ZW1lbnQodHMuY3JlYXRlU3RhdGVtZW50KGFzc2lnbikpO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBiaW5kaW5nIGZyb20gdGhlIHNldCBvZiB1bmNsYWltZWQgaW5wdXRzLCBhcyB0aGlzIGRpcmVjdGl2ZSBoYXMgJ2NsYWltZWQnIGl0LlxuICAgIHVuY2xhaW1lZC5kZWxldGUoYmluZGluZy5wcm9wZXJ0eSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYSBuZXN0ZWQgPG5nLXRlbXBsYXRlPiwgZ2VuZXJhdGluZyB0eXBlLWNoZWNraW5nIGNvZGUgZm9yIGl0IGFuZCBpdHMgY2hpbGRyZW4uXG4gKlxuICogVGhlIG5lc3RlZCA8bmctdGVtcGxhdGU+IGlzIHJlcHJlc2VudGVkIHdpdGggYW4gYGlmYCBzdHJ1Y3R1cmUsIHdoaWNoIGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljYWxcbiAqIHNjb3BlIGZvciB0aGUgdHlwZSBjaGVja2luZyBjb2RlIGZvciB0aGUgdGVtcGxhdGUuIElmIHRoZSA8bmctdGVtcGxhdGU+IGhhcyBhbnkgZGlyZWN0aXZlcywgdGhleVxuICogY2FuIGluZmx1ZW5jZSB0eXBlIGluZmVyZW5jZSB3aXRoaW4gdGhlIGBpZmAgYmxvY2sgdGhyb3VnaCBkZWZpbmVkIGd1YXJkIGZ1bmN0aW9ucy5cbiAqL1xuZnVuY3Rpb24gdGNiUHJvY2Vzc1RlbXBsYXRlRGVjbGFyYXRpb24odG1wbDogVG1wbEFzdFRlbXBsYXRlLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSkge1xuICAvLyBDcmVhdGUgYSBuZXcgU2NvcGUgdG8gcmVwcmVzZW50IGJpbmRpbmdzIGNhcHR1cmVkIGluIHRoZSB0ZW1wbGF0ZS5cbiAgY29uc3QgdG1wbFNjb3BlID0gbmV3IFNjb3BlKHRjYiwgc2NvcGUpO1xuXG4gIC8vIEFsbG9jYXRlIGEgdGVtcGxhdGUgY3R4IHZhcmlhYmxlIGFuZCBkZWNsYXJlIGl0IHdpdGggYW4gJ2FueScgdHlwZS5cbiAgY29uc3QgY3R4ID0gdG1wbFNjb3BlLmFsbG9jYXRlVGVtcGxhdGVDdHgodG1wbCk7XG4gIGNvbnN0IHR5cGUgPSB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRzRGVjbGFyZVZhcmlhYmxlKGN0eCwgdHlwZSkpO1xuXG4gIC8vIFByb2Nlc3MgZGlyZWN0aXZlcyBvbiB0aGUgdGVtcGxhdGUuXG4gIHRjYlByb2Nlc3NEaXJlY3RpdmVzKHRtcGwsIG5ldyBTZXQoKSwgdGNiLCBzY29wZSk7XG5cbiAgLy8gUHJvY2VzcyB0aGUgdGVtcGxhdGUgaXRzZWxmIChpbnNpZGUgdGhlIGlubmVyIFNjb3BlKS5cbiAgdGNiUHJvY2Vzc05vZGVzKHRtcGwuY2hpbGRyZW4sIHRjYiwgdG1wbFNjb3BlKTtcblxuICAvLyBBbiBgaWZgIHdpbGwgYmUgY29uc3RydWN0ZWQsIHdpdGhpbiB3aGljaCB0aGUgdGVtcGxhdGUncyBjaGlsZHJlbiB3aWxsIGJlIHR5cGUgY2hlY2tlZC4gVGhlXG4gIC8vIGBpZmAgaXMgdXNlZCBmb3IgdHdvIHJlYXNvbnM6IGl0IGNyZWF0ZXMgYSBuZXcgc3ludGFjdGljIHNjb3BlLCBpc29sYXRpbmcgdmFyaWFibGVzIGRlY2xhcmVkIGluXG4gIC8vIHRoZSB0ZW1wbGF0ZSdzIFRDQiBmcm9tIHRoZSBvdXRlciBjb250ZXh0LCBhbmQgaXQgYWxsb3dzIGFueSBkaXJlY3RpdmVzIG9uIHRoZSB0ZW1wbGF0ZXMgdG9cbiAgLy8gcGVyZm9ybSB0eXBlIG5hcnJvd2luZyBvZiBlaXRoZXIgZXhwcmVzc2lvbnMgb3IgdGhlIHRlbXBsYXRlJ3MgY29udGV4dC5cblxuICAvLyBUaGUgZ3VhcmQgaXMgdGhlIGBpZmAgYmxvY2sncyBjb25kaXRpb24uIEl0J3MgdXN1YWxseSBzZXQgdG8gYHRydWVgIGJ1dCBkaXJlY3RpdmVzIHRoYXQgZXhpc3RcbiAgLy8gb24gdGhlIHRlbXBsYXRlIGNhbiB0cmlnZ2VyIGV4dHJhIGd1YXJkIGV4cHJlc3Npb25zIHRoYXQgc2VydmUgdG8gbmFycm93IHR5cGVzIHdpdGhpbiB0aGVcbiAgLy8gYGlmYC4gYGd1YXJkYCBpcyBjYWxjdWxhdGVkIGJ5IHN0YXJ0aW5nIHdpdGggYHRydWVgIGFuZCBhZGRpbmcgb3RoZXIgY29uZGl0aW9ucyBhcyBuZWVkZWQuXG4gIC8vIENvbGxlY3QgdGhlc2UgaW50byBgZ3VhcmRzYCBieSBwcm9jZXNzaW5nIHRoZSBkaXJlY3RpdmVzLlxuICBjb25zdCBkaXJlY3RpdmVHdWFyZHM6IHRzLkV4cHJlc3Npb25bXSA9IFtdO1xuXG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSB0Y2IuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZSh0bXBsKTtcbiAgaWYgKGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICBkaXJlY3RpdmVzLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGNvbnN0IGRpckluc3RJZCA9IHNjb3BlLmdldERpcmVjdGl2ZUlkKHRtcGwsIGRpcikgITtcbiAgICAgIGNvbnN0IGRpcklkID0gdGNiLnJlZmVyZW5jZShkaXIucmVmKTtcblxuICAgICAgLy8gVGhlcmUgYXJlIHR3byBraW5kcyBvZiBndWFyZHMuIFRlbXBsYXRlIGd1YXJkcyAobmdUZW1wbGF0ZUd1YXJkcykgYWxsb3cgdHlwZSBuYXJyb3dpbmcgb2ZcbiAgICAgIC8vIHRoZSBleHByZXNzaW9uIHBhc3NlZCB0byBhbiBASW5wdXQgb2YgdGhlIGRpcmVjdGl2ZS4gU2NhbiB0aGUgZGlyZWN0aXZlIHRvIHNlZSBpZiBpdCBoYXNcbiAgICAgIC8vIGFueSB0ZW1wbGF0ZSBndWFyZHMsIGFuZCBnZW5lcmF0ZSB0aGVtIGlmIG5lZWRlZC5cbiAgICAgIGRpci5uZ1RlbXBsYXRlR3VhcmRzLmZvckVhY2goaW5wdXROYW1lID0+IHtcbiAgICAgICAgLy8gRm9yIGVhY2ggdGVtcGxhdGUgZ3VhcmQgZnVuY3Rpb24gb24gdGhlIGRpcmVjdGl2ZSwgbG9vayBmb3IgYSBiaW5kaW5nIHRvIHRoYXQgaW5wdXQuXG4gICAgICAgIGNvbnN0IGJvdW5kSW5wdXQgPSB0bXBsLmlucHV0cy5maW5kKGkgPT4gaS5uYW1lID09PSBpbnB1dE5hbWUpIHx8XG4gICAgICAgICAgICB0bXBsLnRlbXBsYXRlQXR0cnMuZmluZChcbiAgICAgICAgICAgICAgICAoaTogVG1wbEFzdFRleHRBdHRyaWJ1dGUgfCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpOiBpIGlzIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSA9PlxuICAgICAgICAgICAgICAgICAgICBpIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIGkubmFtZSA9PT0gaW5wdXROYW1lKTtcbiAgICAgICAgaWYgKGJvdW5kSW5wdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIHN1Y2ggYSBiaW5kaW5nLCBnZW5lcmF0ZSBhbiBleHByZXNzaW9uIGZvciBpdC5cbiAgICAgICAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihib3VuZElucHV0LnZhbHVlLCB0Y2IsIHNjb3BlKTtcbiAgICAgICAgICAvLyBDYWxsIHRoZSBndWFyZCBmdW5jdGlvbiBvbiB0aGUgZGlyZWN0aXZlIHdpdGggdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSBhbmQgdGhhdFxuICAgICAgICAgIC8vIGV4cHJlc3Npb24uXG4gICAgICAgICAgY29uc3QgZ3VhcmRJbnZva2UgPSB0c0NhbGxNZXRob2QoZGlySWQsIGBuZ1RlbXBsYXRlR3VhcmRfJHtpbnB1dE5hbWV9YCwgW1xuICAgICAgICAgICAgZGlySW5zdElkLFxuICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICBdKTtcbiAgICAgICAgICBkaXJlY3RpdmVHdWFyZHMucHVzaChndWFyZEludm9rZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBUaGUgc2Vjb25kIGtpbmQgb2YgZ3VhcmQgaXMgYSB0ZW1wbGF0ZSBjb250ZXh0IGd1YXJkLiBUaGlzIGd1YXJkIG5hcnJvd3MgdGhlIHRlbXBsYXRlXG4gICAgICAvLyByZW5kZXJpbmcgY29udGV4dCB2YXJpYWJsZSBgY3R4YC5cbiAgICAgIGlmIChkaXIuaGFzTmdUZW1wbGF0ZUNvbnRleHRHdWFyZCkge1xuICAgICAgICBjb25zdCBndWFyZEludm9rZSA9IHRzQ2FsbE1ldGhvZChkaXJJZCwgJ25nVGVtcGxhdGVDb250ZXh0R3VhcmQnLCBbZGlySW5zdElkLCBjdHhdKTtcbiAgICAgICAgZGlyZWN0aXZlR3VhcmRzLnB1c2goZ3VhcmRJbnZva2UpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCB0aGUgZ3VhcmQgaXMgc2ltcGx5IGB0cnVlYC5cbiAgbGV0IGd1YXJkOiB0cy5FeHByZXNzaW9uID0gdHMuY3JlYXRlVHJ1ZSgpO1xuXG4gIC8vIElmIHRoZXJlIGFyZSBhbnkgZ3VhcmRzIGZyb20gZGlyZWN0aXZlcywgdXNlIHRoZW0gaW5zdGVhZC5cbiAgaWYgKGRpcmVjdGl2ZUd1YXJkcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gUG9wIHRoZSBmaXJzdCB2YWx1ZSBhbmQgdXNlIGl0IGFzIHRoZSBpbml0aWFsaXplciB0byByZWR1Y2UoKS4gVGhpcyB3YXksIGEgc2luZ2xlIGd1YXJkXG4gICAgLy8gd2lsbCBiZSB1c2VkIG9uIGl0cyBvd24sIGJ1dCB0d28gb3IgbW9yZSB3aWxsIGJlIGNvbWJpbmVkIGludG8gYmluYXJ5IGV4cHJlc3Npb25zLlxuICAgIGd1YXJkID0gZGlyZWN0aXZlR3VhcmRzLnJlZHVjZShcbiAgICAgICAgKGV4cHIsIGRpckd1YXJkKSA9PiB0cy5jcmVhdGVCaW5hcnkoZXhwciwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgZGlyR3VhcmQpLFxuICAgICAgICBkaXJlY3RpdmVHdWFyZHMucG9wKCkgISk7XG4gIH1cblxuICAvLyBDb25zdHJ1Y3QgdGhlIGBpZmAgYmxvY2sgZm9yIHRoZSB0ZW1wbGF0ZSB3aXRoIHRoZSBnZW5lcmF0ZWQgZ3VhcmQgZXhwcmVzc2lvbi5cbiAgY29uc3QgdG1wbElmID0gdHMuY3JlYXRlSWYoXG4gICAgICAvKiBleHByZXNzaW9uICovIGd1YXJkLFxuICAgICAgLyogdGhlblN0YXRlbWVudCAqLyB0bXBsU2NvcGUuZ2V0QmxvY2soKSk7XG4gIHNjb3BlLmFkZFN0YXRlbWVudCh0bXBsSWYpO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgYW4gYEFTVGAgZXhwcmVzc2lvbiBhbmQgY29udmVydCBpdCBpbnRvIGEgYHRzLkV4cHJlc3Npb25gLCBnZW5lcmF0aW5nIHJlZmVyZW5jZXMgdG8gdGhlXG4gKiBjb3JyZWN0IGlkZW50aWZpZXJzIGluIHRoZSBjdXJyZW50IHNjb3BlLlxuICovXG5mdW5jdGlvbiB0Y2JFeHByZXNzaW9uKGFzdDogQVNULCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLkV4cHJlc3Npb24ge1xuICAvLyBgYXN0VG9UeXBlc2NyaXB0YCBhY3R1YWxseSBkb2VzIHRoZSBjb252ZXJzaW9uLiBBIHNwZWNpYWwgcmVzb2x2ZXIgYHRjYlJlc29sdmVgIGlzIHBhc3NlZCB3aGljaFxuICAvLyBpbnRlcnByZXRzIHNwZWNpZmljIGV4cHJlc3Npb24gbm9kZXMgdGhhdCBpbnRlcmFjdCB3aXRoIHRoZSBgSW1wbGljaXRSZWNlaXZlcmAuIFRoZXNlIG5vZGVzXG4gIC8vIGFjdHVhbGx5IHJlZmVyIHRvIGlkZW50aWZpZXJzIHdpdGhpbiB0aGUgY3VycmVudCBzY29wZS5cbiAgcmV0dXJuIGFzdFRvVHlwZXNjcmlwdChhc3QsIChhc3QpID0+IHRjYlJlc29sdmUoYXN0LCB0Y2IsIHNjb3BlKSk7XG59XG5cbi8qKlxuICogQ2FsbCB0aGUgdHlwZSBjb25zdHJ1Y3RvciBvZiBhIGRpcmVjdGl2ZSBpbnN0YW5jZSBvbiBhIGdpdmVuIHRlbXBsYXRlIG5vZGUsIGluZmVycmluZyBhIHR5cGUgZm9yXG4gKiB0aGUgZGlyZWN0aXZlIGluc3RhbmNlIGZyb20gYW55IGJvdW5kIGlucHV0cy5cbiAqL1xuZnVuY3Rpb24gdGNiQ2FsbFR5cGVDdG9yKFxuICAgIGVsOiBUbXBsQXN0RWxlbWVudCB8IFRtcGxBc3RUZW1wbGF0ZSwgZGlyOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgdGNiOiBDb250ZXh0LFxuICAgIHNjb3BlOiBTY29wZSwgYmluZGluZ3M6IFRjYkJpbmRpbmdbXSk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCBkaXJDbGFzcyA9IHRjYi5yZWZlcmVuY2UoZGlyLnJlZik7XG5cbiAgLy8gQ29uc3RydWN0IGFuIGFycmF5IG9mIGB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnRgcyBmb3IgZWFjaCBpbnB1dCBvZiB0aGUgZGlyZWN0aXZlIHRoYXQgaGFzIGFcbiAgLy8gbWF0Y2hpbmcgYmluZGluZy5cbiAgY29uc3QgbWVtYmVycyA9IGJpbmRpbmdzLm1hcChiID0+IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChiLmZpZWxkLCBiLmV4cHJlc3Npb24pKTtcblxuICAvLyBDYWxsIHRoZSBgbmdUeXBlQ3RvcmAgbWV0aG9kIG9uIHRoZSBkaXJlY3RpdmUgY2xhc3MsIHdpdGggYW4gb2JqZWN0IGxpdGVyYWwgYXJndW1lbnQgY3JlYXRlZFxuICAvLyBmcm9tIHRoZSBtYXRjaGVkIGlucHV0cy5cbiAgcmV0dXJuIHRzQ2FsbE1ldGhvZChcbiAgICAgIC8qIHJlY2VpdmVyICovIGRpckNsYXNzLFxuICAgICAgLyogbWV0aG9kTmFtZSAqLyAnbmdUeXBlQ3RvcicsXG4gICAgICAvKiBhcmdzICovW3RzLmNyZWF0ZU9iamVjdExpdGVyYWwobWVtYmVycyldKTtcbn1cblxuaW50ZXJmYWNlIFRjYkJpbmRpbmcge1xuICBmaWVsZDogc3RyaW5nO1xuICBwcm9wZXJ0eTogc3RyaW5nO1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG5mdW5jdGlvbiB0Y2JHZXRJbnB1dEJpbmRpbmdFeHByZXNzaW9ucyhcbiAgICBlbDogVG1wbEFzdEVsZW1lbnQgfCBUbXBsQXN0VGVtcGxhdGUsIGRpcjogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIHRjYjogQ29udGV4dCxcbiAgICBzY29wZTogU2NvcGUpOiBUY2JCaW5kaW5nW10ge1xuICBjb25zdCBiaW5kaW5nczogVGNiQmluZGluZ1tdID0gW107XG4gIC8vIGBkaXIuaW5wdXRzYCBpcyBhbiBvYmplY3QgbWFwIG9mIGZpZWxkIG5hbWVzIG9uIHRoZSBkaXJlY3RpdmUgY2xhc3MgdG8gcHJvcGVydHkgbmFtZXMuXG4gIC8vIFRoaXMgaXMgYmFja3dhcmRzIGZyb20gd2hhdCdzIG5lZWRlZCB0byBtYXRjaCBiaW5kaW5ncyAtIGEgbWFwIG9mIHByb3BlcnRpZXMgdG8gZmllbGQgbmFtZXNcbiAgLy8gaXMgZGVzaXJlZC4gSW52ZXJ0IGBkaXIuaW5wdXRzYCBpbnRvIGBwcm9wTWF0Y2hgIHRvIGNyZWF0ZSB0aGlzIG1hcC5cbiAgY29uc3QgcHJvcE1hdGNoID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgaW5wdXRzID0gZGlyLmlucHV0cztcbiAgT2JqZWN0LmtleXMoaW5wdXRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgQXJyYXkuaXNBcnJheShpbnB1dHNba2V5XSkgPyBwcm9wTWF0Y2guc2V0KGlucHV0c1trZXldWzBdLCBrZXkpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BNYXRjaC5zZXQoaW5wdXRzW2tleV0gYXMgc3RyaW5nLCBrZXkpO1xuICB9KTtcblxuICBlbC5pbnB1dHMuZm9yRWFjaChwcm9jZXNzQXR0cmlidXRlKTtcbiAgaWYgKGVsIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgZWwudGVtcGxhdGVBdHRycy5mb3JFYWNoKHByb2Nlc3NBdHRyaWJ1dGUpO1xuICB9XG4gIHJldHVybiBiaW5kaW5ncztcblxuICAvKipcbiAgICogQWRkIGEgYmluZGluZyBleHByZXNzaW9uIHRvIHRoZSBtYXAgZm9yIGVhY2ggaW5wdXQvdGVtcGxhdGUgYXR0cmlidXRlIG9mIHRoZSBkaXJlY3RpdmUgdGhhdCBoYXNcbiAgICogYSBtYXRjaGluZyBiaW5kaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc0F0dHJpYnV0ZShhdHRyOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSk6IHZvaWQge1xuICAgIGlmIChhdHRyIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlICYmIHByb3BNYXRjaC5oYXMoYXR0ci5uYW1lKSkge1xuICAgICAgLy8gUHJvZHVjZSBhbiBleHByZXNzaW9uIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgdGhlIGJpbmRpbmcuXG4gICAgICBjb25zdCBleHByID0gdGNiRXhwcmVzc2lvbihhdHRyLnZhbHVlLCB0Y2IsIHNjb3BlKTtcbiAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrLlxuICAgICAgYmluZGluZ3MucHVzaCh7XG4gICAgICAgIHByb3BlcnR5OiBhdHRyLm5hbWUsXG4gICAgICAgIGZpZWxkOiBwcm9wTWF0Y2guZ2V0KGF0dHIubmFtZSkgISxcbiAgICAgICAgZXhwcmVzc2lvbjogZXhwcixcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBleHByZXNzaW9uIHdoaWNoIGluc3RhbnRpYXRlcyBhbiBlbGVtZW50IGJ5IGl0cyBIVE1MIHRhZ05hbWUuXG4gKlxuICogVGhhbmtzIHRvIG5hcnJvd2luZyBvZiBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgpYCwgdGhpcyBleHByZXNzaW9uIHdpbGwgaGF2ZSBpdHMgdHlwZSBpbmZlcnJlZFxuICogYmFzZWQgb24gdGhlIHRhZyBuYW1lLCBpbmNsdWRpbmcgZm9yIGN1c3RvbSBlbGVtZW50cyB0aGF0IGhhdmUgYXBwcm9wcmlhdGUgLmQudHMgZGVmaW5pdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIHRzQ3JlYXRlRWxlbWVudCh0YWdOYW1lOiBzdHJpbmcpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgY3JlYXRlRWxlbWVudCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyB0cy5jcmVhdGVJZGVudGlmaWVyKCdkb2N1bWVudCcpLCAnY3JlYXRlRWxlbWVudCcpO1xuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gY3JlYXRlRWxlbWVudCxcbiAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9bdHMuY3JlYXRlTGl0ZXJhbCh0YWdOYW1lKV0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGB0cy5WYXJpYWJsZVN0YXRlbWVudGAgd2hpY2ggZGVjbGFyZXMgYSB2YXJpYWJsZSB3aXRob3V0IGV4cGxpY2l0IGluaXRpYWxpemF0aW9uLlxuICpcbiAqIFRoZSBpbml0aWFsaXplciBgbnVsbCFgIGlzIHVzZWQgdG8gYnlwYXNzIHN0cmljdCB2YXJpYWJsZSBpbml0aWFsaXphdGlvbiBjaGVja3MuXG4gKlxuICogVW5saWtlIHdpdGggYHRzQ3JlYXRlVmFyaWFibGVgLCB0aGUgdHlwZSBvZiB0aGUgdmFyaWFibGUgaXMgZXhwbGljaXRseSBzcGVjaWZpZWQuXG4gKi9cbmZ1bmN0aW9uIHRzRGVjbGFyZVZhcmlhYmxlKGlkOiB0cy5JZGVudGlmaWVyLCB0eXBlOiB0cy5UeXBlTm9kZSk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgY29uc3QgZGVjbCA9IHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAvKiBuYW1lICovIGlkLFxuICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpKSk7XG4gIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBkZWNsYXJhdGlvbkxpc3QgKi9bZGVjbF0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGB0cy5WYXJpYWJsZVN0YXRlbWVudGAgdGhhdCBpbml0aWFsaXplcyBhIHZhcmlhYmxlIHdpdGggYSBnaXZlbiBleHByZXNzaW9uLlxuICpcbiAqIFVubGlrZSB3aXRoIGB0c0RlY2xhcmVWYXJpYWJsZWAsIHRoZSB0eXBlIG9mIHRoZSB2YXJpYWJsZSBpcyBpbmZlcnJlZCBmcm9tIHRoZSBpbml0aWFsaXplclxuICogZXhwcmVzc2lvbi5cbiAqL1xuZnVuY3Rpb24gdHNDcmVhdGVWYXJpYWJsZShpZDogdHMuSWRlbnRpZmllciwgaW5pdGlhbGl6ZXI6IHRzLkV4cHJlc3Npb24pOiB0cy5WYXJpYWJsZVN0YXRlbWVudCB7XG4gIGNvbnN0IGRlY2wgPSB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgLyogbmFtZSAqLyBpZCxcbiAgICAgIC8qIHR5cGUgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gaW5pdGlhbGl6ZXIpO1xuICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgLyogZGVjbGFyYXRpb25MaXN0ICovW2RlY2xdKTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBgdHMuQ2FsbEV4cHJlc3Npb25gIHRoYXQgY2FsbHMgYSBtZXRob2Qgb24gYSByZWNlaXZlci5cbiAqL1xuZnVuY3Rpb24gdHNDYWxsTWV0aG9kKFxuICAgIHJlY2VpdmVyOiB0cy5FeHByZXNzaW9uLCBtZXRob2ROYW1lOiBzdHJpbmcsIGFyZ3M6IHRzLkV4cHJlc3Npb25bXSA9IFtdKTogdHMuQ2FsbEV4cHJlc3Npb24ge1xuICBjb25zdCBtZXRob2RBY2Nlc3MgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhyZWNlaXZlciwgbWV0aG9kTmFtZSk7XG4gIHJldHVybiB0cy5jcmVhdGVDYWxsKFxuICAgICAgLyogZXhwcmVzc2lvbiAqLyBtZXRob2RBY2Nlc3MsXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovIGFyZ3MpO1xufVxuXG4vKipcbiAqIFJlc29sdmUgYW4gYEFTVGAgZXhwcmVzc2lvbiB3aXRoaW4gdGhlIGdpdmVuIHNjb3BlLlxuICpcbiAqIFNvbWUgYEFTVGAgZXhwcmVzc2lvbnMgcmVmZXIgdG8gdG9wLWxldmVsIGNvbmNlcHRzIChyZWZlcmVuY2VzLCB2YXJpYWJsZXMsIHRoZSBjb21wb25lbnRcbiAqIGNvbnRleHQpLiBUaGlzIG1ldGhvZCBhc3Npc3RzIGluIHJlc29sdmluZyB0aG9zZS5cbiAqL1xuZnVuY3Rpb24gdGNiUmVzb2x2ZShhc3Q6IEFTVCwgdGNiOiBDb250ZXh0LCBzY29wZTogU2NvcGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAvLyBTaG9ydCBjaXJjdWl0IGZvciBBU1QgdHlwZXMgdGhhdCB3b24ndCBoYXZlIG1hcHBpbmdzLlxuICBpZiAoIShhc3QgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyIHx8IGFzdCBpbnN0YW5jZW9mIFByb3BlcnR5UmVhZCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChhc3QgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQgJiYgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikge1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIHRlbXBsYXRlIG1ldGFkYXRhIGhhcyBib3VuZCBhIHRhcmdldCBmb3IgdGhpcyBleHByZXNzaW9uLiBJZiBzbywgdGhlblxuICAgIC8vIHJlc29sdmUgdGhhdCB0YXJnZXQuIElmIG5vdCwgdGhlbiB0aGUgZXhwcmVzc2lvbiBpcyByZWZlcmVuY2luZyB0aGUgdG9wLWxldmVsIGNvbXBvbmVudFxuICAgIC8vIGNvbnRleHQuXG4gICAgY29uc3QgYmluZGluZyA9IHRjYi5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGFzdCk7XG4gICAgaWYgKGJpbmRpbmcgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoaXMgZXhwcmVzc2lvbiBoYXMgYSBiaW5kaW5nIHRvIHNvbWUgdmFyaWFibGUgb3IgcmVmZXJlbmNlIGluIHRoZSB0ZW1wbGF0ZS4gUmVzb2x2ZSBpdC5cbiAgICAgIGlmIChiaW5kaW5nIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgICAgIHJldHVybiB0Y2JSZXNvbHZlVmFyaWFibGUoYmluZGluZywgdGNiLCBzY29wZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBoYW5kbGVkOiAke2JpbmRpbmd9YCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlcikgYW5kIHByb2JhYmx5IHJlZmVycyB0byBhIHByb3BlcnR5IGFjY2VzcyBvbiB0aGVcbiAgICAgIC8vIGNvbXBvbmVudCBjb250ZXh0LiBMZXQgaXQgZmFsbCB0aHJvdWdoIHJlc29sdXRpb24gaGVyZSBzbyBpdCB3aWxsIGJlIGNhdWdodCB3aGVuIHRoZVxuICAgICAgLy8gSW1wbGljaXRSZWNlaXZlciBpcyByZXNvbHZlZCBpbiB0aGUgYnJhbmNoIGJlbG93LlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpIHtcbiAgICAvLyBBU1QgaW5zdGFuY2VzIHJlcHJlc2VudGluZyB2YXJpYWJsZXMgYW5kIHJlZmVyZW5jZXMgbG9vayB2ZXJ5IHNpbWlsYXIgdG8gcHJvcGVydHkgcmVhZHMgZnJvbVxuICAgIC8vIHRoZSBjb21wb25lbnQgY29udGV4dDogYm90aCBoYXZlIHRoZSBzaGFwZSBQcm9wZXJ0eVJlYWQoSW1wbGljaXRSZWNlaXZlciwgJ3Byb3BlcnR5TmFtZScpLlxuICAgIC8vXG4gICAgLy8gYHRjYkV4cHJlc3Npb25gIHdpbGwgZmlyc3QgdHJ5IHRvIGB0Y2JSZXNvbHZlYCB0aGUgb3V0ZXIgUHJvcGVydHlSZWFkLiBJZiB0aGlzIHdvcmtzLCBpdCdzXG4gICAgLy8gYmVjYXVzZSB0aGUgYEJvdW5kVGFyZ2V0YCBmb3VuZCBhbiBleHByZXNzaW9uIHRhcmdldCBmb3IgdGhlIHdob2xlIGV4cHJlc3Npb24sIGFuZCB0aGVyZWZvcmVcbiAgICAvLyBgdGNiRXhwcmVzc2lvbmAgd2lsbCBuZXZlciBhdHRlbXB0IHRvIGB0Y2JSZXNvbHZlYCB0aGUgSW1wbGljaXRSZWNlaXZlciBvZiB0aGF0IFByb3BlcnR5UmVhZC5cbiAgICAvL1xuICAgIC8vIFRoZXJlZm9yZSBpZiBgdGNiUmVzb2x2ZWAgaXMgY2FsbGVkIG9uIGFuIGBJbXBsaWNpdFJlY2VpdmVyYCwgaXQncyBiZWNhdXNlIG5vIG91dGVyXG4gICAgLy8gUHJvcGVydHlSZWFkIHJlc29sdmVkIHRvIGEgdmFyaWFibGUgb3IgcmVmZXJlbmNlLCBhbmQgdGhlcmVmb3JlIHRoaXMgaXMgYSBwcm9wZXJ0eSByZWFkIG9uXG4gICAgLy8gdGhlIGNvbXBvbmVudCBjb250ZXh0IGl0c2VsZi5cbiAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcignY3R4Jyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhpcyBBU1QgaXNuJ3Qgc3BlY2lhbCBhZnRlciBhbGwuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgdmFyaWFibGUgdG8gYW4gaWRlbnRpZmllciB0aGF0IHJlcHJlc2VudHMgaXRzIHZhbHVlLlxuICovXG5mdW5jdGlvbiB0Y2JSZXNvbHZlVmFyaWFibGUoYmluZGluZzogVG1wbEFzdFZhcmlhYmxlLCB0Y2I6IENvbnRleHQsIHNjb3BlOiBTY29wZSk6IHRzLklkZW50aWZpZXIge1xuICAvLyBMb29rIHRvIHNlZSB3aGV0aGVyIHRoZSB2YXJpYWJsZSB3YXMgYWxyZWFkeSBpbml0aWFsaXplZC4gSWYgc28sIGp1c3QgcmV1c2UgaXQuXG4gIGxldCBpZCA9IHNjb3BlLmdldFZhcmlhYmxlSWQoYmluZGluZyk7XG4gIGlmIChpZCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSB0ZW1wbGF0ZSB3aGljaCBkZWNsYXJlcyB0aGlzIHZhcmlhYmxlLlxuICBjb25zdCB0bXBsID0gdGNiLmJvdW5kVGFyZ2V0LmdldFRlbXBsYXRlT2ZTeW1ib2woYmluZGluZyk7XG4gIGlmICh0bXBsID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBUbXBsQXN0VmFyaWFibGUgdG8gYmUgbWFwcGVkIHRvIGEgVG1wbEFzdFRlbXBsYXRlYCk7XG4gIH1cbiAgLy8gTG9vayBmb3IgYSBjb250ZXh0IHZhcmlhYmxlIGZvciB0aGUgdGVtcGxhdGUuIFRoaXMgc2hvdWxkJ3ZlIGJlZW4gZGVjbGFyZWQgYmVmb3JlIGFueXRoaW5nIHRoYXRcbiAgLy8gY291bGQgcmVmZXJlbmNlIHRoZSB0ZW1wbGF0ZSdzIHZhcmlhYmxlcy5cbiAgY29uc3QgY3R4ID0gc2NvcGUuZ2V0VGVtcGxhdGVDdHgodG1wbCk7XG4gIGlmIChjdHggPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHRlbXBsYXRlIGNvbnRleHQgdG8gZXhpc3QuJyk7XG4gIH1cblxuICAvLyBBbGxvY2F0ZSBhbiBpZGVudGlmaWVyIGZvciB0aGUgVG1wbEFzdFZhcmlhYmxlLCBhbmQgaW5pdGlhbGl6ZSBpdCB0byBhIHJlYWQgb2YgdGhlIHZhcmlhYmxlIG9uXG4gIC8vIHRoZSB0ZW1wbGF0ZSBjb250ZXh0LlxuICBpZCA9IHNjb3BlLmFsbG9jYXRlVmFyaWFibGVJZChiaW5kaW5nKTtcbiAgY29uc3QgaW5pdGlhbGl6ZXIgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gY3R4LFxuICAgICAgLyogbmFtZSAqLyBiaW5kaW5nLnZhbHVlKTtcblxuICAvLyBEZWNsYXJlIHRoZSB2YXJpYWJsZSwgYW5kIHJldHVybiBpdHMgaWRlbnRpZmllci5cbiAgc2NvcGUuYWRkU3RhdGVtZW50KHRzQ3JlYXRlVmFyaWFibGUoaWQsIGluaXRpYWxpemVyKSk7XG4gIHJldHVybiBpZDtcbn1cbiJdfQ==