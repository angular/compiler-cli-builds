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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Registry which records and correlates static analysis information of Angular types.
     *
     * Once a compilation unit's information is fed into the SelectorScopeRegistry, it can be asked to
     * produce transitive `CompilationScope`s for components.
     */
    var SelectorScopeRegistry = /** @class */ (function () {
        function SelectorScopeRegistry(checker, reflector, resolver) {
            this.checker = checker;
            this.reflector = reflector;
            this.resolver = resolver;
            /**
             *  Map of modules declared in the current compilation unit to their (local) metadata.
             */
            this._moduleToData = new Map();
            /**
             * Map of modules to their cached `CompilationScope`s.
             */
            this._compilationScopeCache = new Map();
            /**
             * Map of components/directives to their metadata.
             */
            this._directiveToMetadata = new Map();
            /**
             * Map of pipes to their name.
             */
            this._pipeToName = new Map();
            /**
             * Components that require remote scoping.
             */
            this._requiresRemoteScope = new Set();
            /**
             * Map of components/directives/pipes to their module.
             */
            this._declararedTypeToModule = new Map();
        }
        /**
         * Register a module's metadata with the registry.
         */
        SelectorScopeRegistry.prototype.registerModule = function (node, data) {
            var _this = this;
            node = ts.getOriginalNode(node);
            if (this._moduleToData.has(node)) {
                throw new Error("Module already registered: " + reflection_1.reflectNameOfDeclaration(node));
            }
            this._moduleToData.set(node, data);
            // Register all of the module's declarations in the context map as belonging to this module.
            data.declarations.forEach(function (decl) {
                _this._declararedTypeToModule.set(ts.getOriginalNode(decl.node), node);
            });
        };
        /**
         * Register the metadata of a component or directive with the registry.
         */
        SelectorScopeRegistry.prototype.registerDirective = function (node, metadata) {
            node = ts.getOriginalNode(node);
            if (this._directiveToMetadata.has(node)) {
                throw new Error("Selector already registered: " + reflection_1.reflectNameOfDeclaration(node) + " " + metadata.selector);
            }
            this._directiveToMetadata.set(node, metadata);
        };
        /**
         * Register the name of a pipe with the registry.
         */
        SelectorScopeRegistry.prototype.registerPipe = function (node, name) {
            node = ts.getOriginalNode(node);
            this._pipeToName.set(node, name);
        };
        /**
         * Mark a component (identified by its `ts.Declaration`) as requiring its `directives` scope to be
         * set remotely, from the file of the @NgModule which declares the component.
         */
        SelectorScopeRegistry.prototype.setComponentAsRequiringRemoteScoping = function (component) {
            this._requiresRemoteScope.add(component);
        };
        /**
         * Check whether the given component requires its `directives` scope to be set remotely.
         */
        SelectorScopeRegistry.prototype.requiresRemoteScope = function (component) {
            return this._requiresRemoteScope.has(ts.getOriginalNode(component));
        };
        SelectorScopeRegistry.prototype.lookupCompilationScopeAsRefs = function (node) {
            var e_1, _a;
            node = ts.getOriginalNode(node);
            // If the component has no associated module, then it has no compilation scope.
            if (!this._declararedTypeToModule.has(node)) {
                return null;
            }
            var module = this._declararedTypeToModule.get(node);
            // Compilation scope computation is somewhat expensive, so it's cached. Check the cache for
            // the module.
            if (this._compilationScopeCache.has(module)) {
                // The compilation scope was cached.
                var scope_1 = this._compilationScopeCache.get(module);
                // The scope as cached is in terms of References, not Expressions. Converting between them
                // requires knowledge of the context file (in this case, the component node's source file).
                return scope_1;
            }
            // This is the first time the scope for this module is being computed.
            var directives = [];
            var pipes = new Map();
            // Tracks which declarations already appear in the `CompilationScope`.
            var seenSet = new Set();
            try {
                // Process the declaration scope of the module, and lookup the selector of every declared type.
                // The initial value of ngModuleImportedFrom is 'null' which signifies that the NgModule
                // was not imported from a .d.ts source.
                for (var _b = tslib_1.__values(this
                    .lookupScopesOrDie(module, /* ngModuleImportedFrom */ null, node.getSourceFile().fileName)
                    .compilation), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var ref = _c.value;
                    var node_1 = ts.getOriginalNode(ref.node);
                    // Track whether this `ts.Declaration` has been seen before.
                    if (seenSet.has(node_1)) {
                        continue;
                    }
                    else {
                        seenSet.add(node_1);
                    }
                    // Either the node represents a directive or a pipe. Look for both.
                    var metadata = this.lookupDirectiveMetadata(ref);
                    // Only directives/components with selectors get added to the scope.
                    if (metadata !== null) {
                        directives.push(tslib_1.__assign({}, metadata, { directive: ref }));
                    }
                    else {
                        var name_1 = this.lookupPipeName(node_1);
                        if (name_1 !== null) {
                            pipes.set(name_1, ref);
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var scope = { directives: directives, pipes: pipes };
            // Many components may be compiled in the same scope, so cache it.
            this._compilationScopeCache.set(node, scope);
            // Convert References to Expressions in the context of the component's source file.
            return scope;
        };
        /**
         * Produce the compilation scope of a component, which is determined by the module that declares
         * it.
         */
        SelectorScopeRegistry.prototype.lookupCompilationScope = function (node) {
            var scope = this.lookupCompilationScopeAsRefs(node);
            return scope !== null ? convertScopeToExpressions(scope, node) : null;
        };
        SelectorScopeRegistry.prototype.lookupScopesOrDie = function (node, ngModuleImportedFrom, resolutionContext) {
            var result = this.lookupScopes(node, ngModuleImportedFrom, resolutionContext);
            if (result === null) {
                throw new Error("Module not found: " + reflection_1.reflectNameOfDeclaration(node));
            }
            return result;
        };
        /**
         * Lookup `SelectorScopes` for a given module.
         *
         * This function assumes that if the given module was imported from an absolute path
         * (`ngModuleImportedFrom`) then all of its declarations are exported at that same path, as well
         * as imports and exports from other modules that are relatively imported.
         */
        SelectorScopeRegistry.prototype.lookupScopes = function (node, ngModuleImportedFrom, resolutionContext) {
            var _this = this;
            var data = null;
            // Either this module was analyzed directly, or has a precompiled ngModuleDef.
            if (this._moduleToData.has(node)) {
                // The module was analyzed before, and thus its data is available.
                data = this._moduleToData.get(node);
            }
            else {
                // The module wasn't analyzed before, and probably has a precompiled ngModuleDef with a type
                // annotation that specifies the needed metadata.
                data = this._readModuleDataFromCompiledClass(node, ngModuleImportedFrom, resolutionContext);
                // Note that data here could still be null, if the class didn't have a precompiled
                // ngModuleDef.
            }
            if (data === null) {
                return null;
            }
            var context = node.getSourceFile().fileName;
            return {
                compilation: tslib_1.__spread(data.declarations, flatten(data.imports.map(function (ref) {
                    return _this.lookupScopesOrDie(ref.node, absoluteModuleName(ref), context)
                        .exported;
                })), flatten(data.exports
                    .map(function (ref) { return _this.lookupScopes(ref.node, absoluteModuleName(ref), context); })
                    .filter(function (scope) { return scope !== null; })
                    .map(function (scope) { return scope.exported; }))),
                exported: flatten(data.exports.map(function (ref) {
                    var scope = _this.lookupScopes(ref.node, absoluteModuleName(ref), context);
                    if (scope !== null) {
                        return scope.exported;
                    }
                    else {
                        return [ref];
                    }
                })),
            };
        };
        /**
         * Lookup the metadata of a component or directive class.
         *
         * Potentially this class is declared in a .d.ts file or otherwise has a manually created
         * ngComponentDef/ngDirectiveDef. In this case, the type metadata of that definition is read
         * to determine the metadata.
         */
        SelectorScopeRegistry.prototype.lookupDirectiveMetadata = function (ref) {
            var node = ts.getOriginalNode(ref.node);
            if (this._directiveToMetadata.has(node)) {
                return this._directiveToMetadata.get(node);
            }
            else {
                return this._readMetadataFromCompiledClass(ref);
            }
        };
        SelectorScopeRegistry.prototype.lookupPipeName = function (node) {
            if (this._pipeToName.has(node)) {
                return this._pipeToName.get(node);
            }
            else {
                return this._readNameFromCompiledClass(node);
            }
        };
        /**
         * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
         * file, or in a .ts file with a handwritten definition).
         *
         * @param clazz the class of interest
         * @param ngModuleImportedFrom module specifier of the import path to assume for all declarations
         * stemming from this module.
         */
        SelectorScopeRegistry.prototype._readModuleDataFromCompiledClass = function (clazz, ngModuleImportedFrom, resolutionContext) {
            // This operation is explicitly not memoized, as it depends on `ngModuleImportedFrom`.
            // TODO(alxhub): investigate caching of .d.ts module metadata.
            var ngModuleDef = this.reflector.getMembersOfClass(clazz).find(function (member) { return member.name === 'ngModuleDef' && member.isStatic; });
            if (ngModuleDef === undefined) {
                return null;
            }
            else if (
            // Validate that the shape of the ngModuleDef type is correct.
            ngModuleDef.type === null || !ts.isTypeReferenceNode(ngModuleDef.type) ||
                ngModuleDef.type.typeArguments === undefined ||
                ngModuleDef.type.typeArguments.length !== 4) {
                return null;
            }
            // Read the ModuleData out of the type arguments.
            var _a = tslib_1.__read(ngModuleDef.type.typeArguments, 4), _ = _a[0], declarationMetadata = _a[1], importMetadata = _a[2], exportMetadata = _a[3];
            return {
                declarations: this._extractReferencesFromType(declarationMetadata, ngModuleImportedFrom, resolutionContext),
                exports: this._extractReferencesFromType(exportMetadata, ngModuleImportedFrom, resolutionContext),
                imports: this._extractReferencesFromType(importMetadata, ngModuleImportedFrom, resolutionContext),
            };
        };
        /**
         * Get the selector from type metadata for a class with a precompiled ngComponentDef or
         * ngDirectiveDef.
         */
        SelectorScopeRegistry.prototype._readMetadataFromCompiledClass = function (ref) {
            var clazz = ts.getOriginalNode(ref.node);
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) {
                return field.isStatic && (field.name === 'ngComponentDef' || field.name === 'ngDirectiveDef');
            });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var selector = readStringType(def.type.typeArguments[1]);
            if (selector === null) {
                return null;
            }
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, directive: ref, isComponent: def.name === 'ngComponentDef', selector: selector, exportAs: readStringArrayType(def.type.typeArguments[2]), inputs: readStringMapType(def.type.typeArguments[3]), outputs: readStringMapType(def.type.typeArguments[4]), queries: readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector));
        };
        /**
         * Get the selector from type metadata for a class with a precompiled ngComponentDef or
         * ngDirectiveDef.
         */
        SelectorScopeRegistry.prototype._readNameFromCompiledClass = function (clazz) {
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) { return field.isStatic && field.name === 'ngPipeDef'; });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length < 2) {
                // The type metadata was the wrong shape.
                return null;
            }
            var type = def.type.typeArguments[1];
            if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
                // The type metadata was the wrong type.
                return null;
            }
            return type.literal.text;
        };
        /**
         * Process a `TypeNode` which is a tuple of references to other types, and return `Reference`s to
         * them.
         *
         * This operation assumes that these types should be imported from `ngModuleImportedFrom` unless
         * they themselves were imported from another absolute path.
         */
        SelectorScopeRegistry.prototype._extractReferencesFromType = function (def, ngModuleImportedFrom, resolutionContext) {
            var _this = this;
            if (!ts.isTupleTypeNode(def)) {
                return [];
            }
            return def.elementTypes.map(function (element) {
                if (!ts.isTypeQueryNode(element)) {
                    throw new Error("Expected TypeQueryNode");
                }
                var type = element.exprName;
                if (ngModuleImportedFrom !== null) {
                    var _a = reflection_1.reflectTypeEntityToDeclaration(type, _this.checker), node = _a.node, from = _a.from;
                    var moduleName = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
                    return _this.resolver.resolve(node, moduleName, resolutionContext);
                }
                else {
                    var node = reflection_1.reflectTypeEntityToDeclaration(type, _this.checker).node;
                    return _this.resolver.resolve(node, null, resolutionContext);
                }
            });
        };
        return SelectorScopeRegistry;
    }());
    exports.SelectorScopeRegistry = SelectorScopeRegistry;
    function flatten(array) {
        return array.reduce(function (accum, subArray) {
            accum.push.apply(accum, tslib_1.__spread(subArray));
            return accum;
        }, []);
    }
    function absoluteModuleName(ref) {
        if (!(ref instanceof imports_1.AbsoluteReference)) {
            return null;
        }
        return ref.moduleName;
    }
    function convertDirectiveReferenceList(input, context) {
        return input.map(function (meta) {
            var directive = meta.directive.toExpression(context);
            if (directive === null) {
                throw new Error("Could not write expression to reference " + meta.directive.node);
            }
            return tslib_1.__assign({}, meta, { directive: directive });
        });
    }
    function convertPipeReferenceMap(map, context) {
        var newMap = new Map();
        map.forEach(function (meta, selector) {
            var pipe = meta.toExpression(context);
            if (pipe === null) {
                throw new Error("Could not write expression to reference " + meta.node);
            }
            newMap.set(selector, pipe);
        });
        return newMap;
    }
    function convertScopeToExpressions(scope, context) {
        var sourceContext = ts.getOriginalNode(context).getSourceFile();
        var directives = convertDirectiveReferenceList(scope.directives, sourceContext);
        var pipes = convertPipeReferenceMap(scope.pipes, sourceContext);
        var declPointer = maybeUnwrapNameOfDeclaration(context);
        var containsForwardDecls = false;
        directives.forEach(function (meta) {
            containsForwardDecls = containsForwardDecls ||
                isExpressionForwardReference(meta.directive, declPointer, sourceContext);
        });
        !containsForwardDecls && pipes.forEach(function (expr) {
            containsForwardDecls =
                containsForwardDecls || isExpressionForwardReference(expr, declPointer, sourceContext);
        });
        return { directives: directives, pipes: pipes, containsForwardDecls: containsForwardDecls };
    }
    function isExpressionForwardReference(expr, context, contextSource) {
        if (isWrappedTsNodeExpr(expr)) {
            var node = ts.getOriginalNode(expr.node);
            return node.getSourceFile() === contextSource && context.pos < node.pos;
        }
        return false;
    }
    function isWrappedTsNodeExpr(expr) {
        return expr instanceof compiler_1.WrappedNodeExpr;
    }
    function maybeUnwrapNameOfDeclaration(decl) {
        if ((ts.isClassDeclaration(decl) || ts.isVariableDeclaration(decl)) && decl.name !== undefined &&
            ts.isIdentifier(decl.name)) {
            return decl.name;
        }
        return decl;
    }
    function readStringType(type) {
        if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
            return null;
        }
        return type.literal.text;
    }
    function readStringMapType(type) {
        if (!ts.isTypeLiteralNode(type)) {
            return {};
        }
        var obj = {};
        type.members.forEach(function (member) {
            if (!ts.isPropertySignature(member) || member.type === undefined || member.name === undefined ||
                !ts.isStringLiteral(member.name)) {
                return;
            }
            var value = readStringType(member.type);
            if (value === null) {
                return null;
            }
            obj[member.name.text] = value;
        });
        return obj;
    }
    function readStringArrayType(type) {
        if (!ts.isTupleTypeNode(type)) {
            return [];
        }
        var res = [];
        type.elementTypes.forEach(function (el) {
            if (!ts.isLiteralTypeNode(el) || !ts.isStringLiteral(el.literal)) {
                return;
            }
            res.push(el.literal.text);
        });
        return res;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEQ7SUFDOUQsK0JBQWlDO0lBRWpDLG1FQUFpRztJQUNqRyx5RUFBMEk7SUFHMUksNkVBQThDO0lBNEM5Qzs7Ozs7T0FLRztJQUNIO1FBK0JFLCtCQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsUUFBMkI7WUFEM0IsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxhQUFRLEdBQVIsUUFBUSxDQUFtQjtZQWhDdkM7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztZQUVwRjs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUV6RDs7ZUFFRztZQUNLLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1FBSWxDLENBQUM7UUFFM0M7O1dBRUc7UUFDSCw4Q0FBYyxHQUFkLFVBQWUsSUFBb0IsRUFBRSxJQUFnQjtZQUFyRCxpQkFZQztZQVhDLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBbUIsQ0FBQztZQUVsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dC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QUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLElBQWlCO1FBQzVDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzdCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFDRCxJQUFNLEdBQUcsR0FBYSxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFO1lBQzFCLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDaEUsT0FBTzthQUNSO1lBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgUmVmZXJlbmNlUmVzb2x2ZXIsIFJlc29sdmVkUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbiwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uLCByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcblxuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZvciBhIGdpdmVuIE5nTW9kdWxlIHRoYXQgY2FuIGJlIHVzZWQgdG8gY29tcHV0ZSBzZWxlY3RvciBzY29wZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbn1cblxuLyoqXG4gKiBUcmFuc2l0aXZlbHkgZXhwYW5kZWQgbWFwcyBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGEgY29tcG9uZW50IGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlPFQ+IHtcbiAgZGlyZWN0aXZlczogU2NvcGVEaXJlY3RpdmU8VD5bXTtcbiAgcGlwZXM6IE1hcDxzdHJpbmcsIFQ+O1xuICBjb250YWluc0ZvcndhcmREZWNscz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NvcGVEaXJlY3RpdmU8VD4gZXh0ZW5kcyBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSB7XG4gIHNlbGVjdG9yOiBzdHJpbmc7XG4gIGRpcmVjdGl2ZTogVDtcbn1cblxuLyoqXG4gKiBCb3RoIHRyYW5zaXRpdmVseSBleHBhbmRlZCBzY29wZXMgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUuXG4gKi9cbmludGVyZmFjZSBTZWxlY3RvclNjb3BlcyB7XG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIHZpc2libGUgdG8gYWxsIGNvbXBvbmVudHMgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gICAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gICAqL1xuICBjb21waWxhdGlvbjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIGFkZGVkIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhbnkgbW9kdWxlIGltcG9ydGluZ1xuICAgKiBzb21lIG1vZHVsZS5cbiAgICovXG4gIGV4cG9ydGVkOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG59XG5cbi8qKlxuICogUmVnaXN0cnkgd2hpY2ggcmVjb3JkcyBhbmQgY29ycmVsYXRlcyBzdGF0aWMgYW5hbHlzaXMgaW5mb3JtYXRpb24gb2YgQW5ndWxhciB0eXBlcy5cbiAqXG4gKiBPbmNlIGEgY29tcGlsYXRpb24gdW5pdCdzIGluZm9ybWF0aW9uIGlzIGZlZCBpbnRvIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnksIGl0IGNhbiBiZSBhc2tlZCB0b1xuICogcHJvZHVjZSB0cmFuc2l0aXZlIGBDb21waWxhdGlvblNjb3BlYHMgZm9yIGNvbXBvbmVudHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZWxlY3RvclNjb3BlUmVnaXN0cnkge1xuICAvKipcbiAgICogIE1hcCBvZiBtb2R1bGVzIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlaXIgKGxvY2FsKSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgX21vZHVsZVRvRGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIE1vZHVsZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBtb2R1bGVzIHRvIHRoZWlyIGNhY2hlZCBgQ29tcGlsYXRpb25TY29wZWBzLlxuICAgKi9cbiAgcHJpdmF0ZSBfY29tcGlsYXRpb25TY29wZUNhY2hlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+PigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzIHRvIHRoZWlyIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfZGlyZWN0aXZlVG9NZXRhZGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBwaXBlcyB0byB0aGVpciBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGlwZVRvTmFtZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAvKipcbiAgICogQ29tcG9uZW50cyB0aGF0IHJlcXVpcmUgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBwcml2YXRlIF9yZXF1aXJlc1JlbW90ZVNjb3BlID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcy9waXBlcyB0byB0aGVpciBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHJlc29sdmVyOiBSZWZlcmVuY2VSZXNvbHZlcikge31cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBtb2R1bGUncyBtZXRhZGF0YSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTW9kdWxlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkYXRhOiBNb2R1bGVEYXRhKTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZHVsZSBhbHJlYWR5IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cbiAgICB0aGlzLl9tb2R1bGVUb0RhdGEuc2V0KG5vZGUsIGRhdGEpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWxsIG9mIHRoZSBtb2R1bGUncyBkZWNsYXJhdGlvbnMgaW4gdGhlIGNvbnRleHQgbWFwIGFzIGJlbG9uZ2luZyB0byB0aGlzIG1vZHVsZS5cbiAgICBkYXRhLmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2wgPT4ge1xuICAgICAgdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5zZXQodHMuZ2V0T3JpZ2luYWxOb2RlKGRlY2wubm9kZSkgYXMgdHMuRGVjbGFyYXRpb24sIG5vZGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBtZXRhZGF0YSBvZiBhIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlckRpcmVjdGl2ZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgbWV0YWRhdGE6IFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT4pOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFNlbGVjdG9yIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9ICR7bWV0YWRhdGEuc2VsZWN0b3J9YCk7XG4gICAgfVxuICAgIHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuc2V0KG5vZGUsIG1ldGFkYXRhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbmFtZSBvZiBhIHBpcGUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclBpcGUobm9kZTogdHMuRGVjbGFyYXRpb24sIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICB0aGlzLl9waXBlVG9OYW1lLnNldChub2RlLCBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXJrIGEgY29tcG9uZW50IChpZGVudGlmaWVkIGJ5IGl0cyBgdHMuRGVjbGFyYXRpb25gKSBhcyByZXF1aXJpbmcgaXRzIGBkaXJlY3RpdmVzYCBzY29wZSB0byBiZVxuICAgKiBzZXQgcmVtb3RlbHksIGZyb20gdGhlIGZpbGUgb2YgdGhlIEBOZ01vZHVsZSB3aGljaCBkZWNsYXJlcyB0aGUgY29tcG9uZW50LlxuICAgKi9cbiAgc2V0Q29tcG9uZW50QXNSZXF1aXJpbmdSZW1vdGVTY29waW5nKGNvbXBvbmVudDogdHMuRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLl9yZXF1aXJlc1JlbW90ZVNjb3BlLmFkZChjb21wb25lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIGNvbXBvbmVudCByZXF1aXJlcyBpdHMgYGRpcmVjdGl2ZXNgIHNjb3BlIHRvIGJlIHNldCByZW1vdGVseS5cbiAgICovXG4gIHJlcXVpcmVzUmVtb3RlU2NvcGUoY29tcG9uZW50OiB0cy5EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9yZXF1aXJlc1JlbW90ZVNjb3BlLmhhcyh0cy5nZXRPcmlnaW5hbE5vZGUoY29tcG9uZW50KSBhcyB0cy5EZWNsYXJhdGlvbik7XG4gIH1cblxuICBsb29rdXBDb21waWxhdGlvblNjb3BlQXNSZWZzKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+fG51bGwge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBubyBhc3NvY2lhdGVkIG1vZHVsZSwgdGhlbiBpdCBoYXMgbm8gY29tcGlsYXRpb24gc2NvcGUuXG4gICAgaWYgKCF0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlID0gdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5nZXQobm9kZSkgITtcblxuICAgIC8vIENvbXBpbGF0aW9uIHNjb3BlIGNvbXB1dGF0aW9uIGlzIHNvbWV3aGF0IGV4cGVuc2l2ZSwgc28gaXQncyBjYWNoZWQuIENoZWNrIHRoZSBjYWNoZSBmb3JcbiAgICAvLyB0aGUgbW9kdWxlLlxuICAgIGlmICh0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuaGFzKG1vZHVsZSkpIHtcbiAgICAgIC8vIFRoZSBjb21waWxhdGlvbiBzY29wZSB3YXMgY2FjaGVkLlxuICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuZ2V0KG1vZHVsZSkgITtcblxuICAgICAgLy8gVGhlIHNjb3BlIGFzIGNhY2hlZCBpcyBpbiB0ZXJtcyBvZiBSZWZlcmVuY2VzLCBub3QgRXhwcmVzc2lvbnMuIENvbnZlcnRpbmcgYmV0d2VlbiB0aGVtXG4gICAgICAvLyByZXF1aXJlcyBrbm93bGVkZ2Ugb2YgdGhlIGNvbnRleHQgZmlsZSAoaW4gdGhpcyBjYXNlLCB0aGUgY29tcG9uZW50IG5vZGUncyBzb3VyY2UgZmlsZSkuXG4gICAgICByZXR1cm4gc2NvcGU7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgdGltZSB0aGUgc2NvcGUgZm9yIHRoaXMgbW9kdWxlIGlzIGJlaW5nIGNvbXB1dGVkLlxuICAgIGNvbnN0IGRpcmVjdGl2ZXM6IFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+W10gPSBbXTtcbiAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+PigpO1xuXG4gICAgLy8gVHJhY2tzIHdoaWNoIGRlY2xhcmF0aW9ucyBhbHJlYWR5IGFwcGVhciBpbiB0aGUgYENvbXBpbGF0aW9uU2NvcGVgLlxuICAgIGNvbnN0IHNlZW5TZXQgPSBuZXcgU2V0PHRzLkRlY2xhcmF0aW9uPigpO1xuXG4gICAgLy8gUHJvY2VzcyB0aGUgZGVjbGFyYXRpb24gc2NvcGUgb2YgdGhlIG1vZHVsZSwgYW5kIGxvb2t1cCB0aGUgc2VsZWN0b3Igb2YgZXZlcnkgZGVjbGFyZWQgdHlwZS5cbiAgICAvLyBUaGUgaW5pdGlhbCB2YWx1ZSBvZiBuZ01vZHVsZUltcG9ydGVkRnJvbSBpcyAnbnVsbCcgd2hpY2ggc2lnbmlmaWVzIHRoYXQgdGhlIE5nTW9kdWxlXG4gICAgLy8gd2FzIG5vdCBpbXBvcnRlZCBmcm9tIGEgLmQudHMgc291cmNlLlxuICAgIGZvciAoY29uc3QgcmVmIG9mIHRoaXNcbiAgICAgICAgICAgICAubG9va3VwU2NvcGVzT3JEaWUoXG4gICAgICAgICAgICAgICAgIG1vZHVsZSAhLCAvKiBuZ01vZHVsZUltcG9ydGVkRnJvbSAqLyBudWxsLCBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSlcbiAgICAgICAgICAgICAuY29tcGlsYXRpb24pIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgICAvLyBUcmFjayB3aGV0aGVyIHRoaXMgYHRzLkRlY2xhcmF0aW9uYCBoYXMgYmVlbiBzZWVuIGJlZm9yZS5cbiAgICAgIGlmIChzZWVuU2V0Lmhhcyhub2RlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlZW5TZXQuYWRkKG5vZGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBFaXRoZXIgdGhlIG5vZGUgcmVwcmVzZW50cyBhIGRpcmVjdGl2ZSBvciBhIHBpcGUuIExvb2sgZm9yIGJvdGguXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubG9va3VwRGlyZWN0aXZlTWV0YWRhdGEocmVmKTtcbiAgICAgIC8vIE9ubHkgZGlyZWN0aXZlcy9jb21wb25lbnRzIHdpdGggc2VsZWN0b3JzIGdldCBhZGRlZCB0byB0aGUgc2NvcGUuXG4gICAgICBpZiAobWV0YWRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgZGlyZWN0aXZlcy5wdXNoKHsuLi5tZXRhZGF0YSwgZGlyZWN0aXZlOiByZWZ9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLmxvb2t1cFBpcGVOYW1lKG5vZGUpO1xuICAgICAgICBpZiAobmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHBpcGVzLnNldChuYW1lLCByZWYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiA9IHtkaXJlY3RpdmVzLCBwaXBlc307XG5cbiAgICAvLyBNYW55IGNvbXBvbmVudHMgbWF5IGJlIGNvbXBpbGVkIGluIHRoZSBzYW1lIHNjb3BlLCBzbyBjYWNoZSBpdC5cbiAgICB0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuc2V0KG5vZGUsIHNjb3BlKTtcblxuICAgIC8vIENvbnZlcnQgUmVmZXJlbmNlcyB0byBFeHByZXNzaW9ucyBpbiB0aGUgY29udGV4dCBvZiB0aGUgY29tcG9uZW50J3Mgc291cmNlIGZpbGUuXG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2R1Y2UgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgY29tcG9uZW50LCB3aGljaCBpcyBkZXRlcm1pbmVkIGJ5IHRoZSBtb2R1bGUgdGhhdCBkZWNsYXJlc1xuICAgKiBpdC5cbiAgICovXG4gIGxvb2t1cENvbXBpbGF0aW9uU2NvcGUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPEV4cHJlc3Npb24+fG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5sb29rdXBDb21waWxhdGlvblNjb3BlQXNSZWZzKG5vZGUpO1xuICAgIHJldHVybiBzY29wZSAhPT0gbnVsbCA/IGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoc2NvcGUsIG5vZGUpIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgbG9va3VwU2NvcGVzT3JEaWUoXG4gICAgICBub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IFNlbGVjdG9yU2NvcGVzIHtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmxvb2t1cFNjb3Blcyhub2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIG5vdCBmb3VuZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIGBTZWxlY3RvclNjb3Blc2AgZm9yIGEgZ2l2ZW4gbW9kdWxlLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGFzc3VtZXMgdGhhdCBpZiB0aGUgZ2l2ZW4gbW9kdWxlIHdhcyBpbXBvcnRlZCBmcm9tIGFuIGFic29sdXRlIHBhdGhcbiAgICogKGBuZ01vZHVsZUltcG9ydGVkRnJvbWApIHRoZW4gYWxsIG9mIGl0cyBkZWNsYXJhdGlvbnMgYXJlIGV4cG9ydGVkIGF0IHRoYXQgc2FtZSBwYXRoLCBhcyB3ZWxsXG4gICAqIGFzIGltcG9ydHMgYW5kIGV4cG9ydHMgZnJvbSBvdGhlciBtb2R1bGVzIHRoYXQgYXJlIHJlbGF0aXZlbHkgaW1wb3J0ZWQuXG4gICAqL1xuICBwcml2YXRlIGxvb2t1cFNjb3BlcyhcbiAgICAgIG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogU2VsZWN0b3JTY29wZXN8bnVsbCB7XG4gICAgbGV0IGRhdGE6IE1vZHVsZURhdGF8bnVsbCA9IG51bGw7XG5cbiAgICAvLyBFaXRoZXIgdGhpcyBtb2R1bGUgd2FzIGFuYWx5emVkIGRpcmVjdGx5LCBvciBoYXMgYSBwcmVjb21waWxlZCBuZ01vZHVsZURlZi5cbiAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhub2RlKSkge1xuICAgICAgLy8gVGhlIG1vZHVsZSB3YXMgYW5hbHl6ZWQgYmVmb3JlLCBhbmQgdGh1cyBpdHMgZGF0YSBpcyBhdmFpbGFibGUuXG4gICAgICBkYXRhID0gdGhpcy5fbW9kdWxlVG9EYXRhLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIHdhc24ndCBhbmFseXplZCBiZWZvcmUsIGFuZCBwcm9iYWJseSBoYXMgYSBwcmVjb21waWxlZCBuZ01vZHVsZURlZiB3aXRoIGEgdHlwZVxuICAgICAgLy8gYW5ub3RhdGlvbiB0aGF0IHNwZWNpZmllcyB0aGUgbmVlZGVkIG1ldGFkYXRhLlxuICAgICAgZGF0YSA9IHRoaXMuX3JlYWRNb2R1bGVEYXRhRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb20sIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICAgIC8vIE5vdGUgdGhhdCBkYXRhIGhlcmUgY291bGQgc3RpbGwgYmUgbnVsbCwgaWYgdGhlIGNsYXNzIGRpZG4ndCBoYXZlIGEgcHJlY29tcGlsZWRcbiAgICAgIC8vIG5nTW9kdWxlRGVmLlxuICAgIH1cblxuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGlsYXRpb246IFtcbiAgICAgICAgLi4uZGF0YS5kZWNsYXJhdGlvbnMsXG4gICAgICAgIC8vIEV4cGFuZCBpbXBvcnRzIHRvIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aG9zZSBpbXBvcnRzLlxuICAgICAgICAuLi5mbGF0dGVuKGRhdGEuaW1wb3J0cy5tYXAoXG4gICAgICAgICAgICByZWYgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmxvb2t1cFNjb3Blc09yRGllKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSwgY29udGV4dClcbiAgICAgICAgICAgICAgICAgICAgLmV4cG9ydGVkKSksXG4gICAgICAgIC8vIEFuZCBpbmNsdWRlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBleHBvcnRlZCBtb2R1bGVzLlxuICAgICAgICAuLi5mbGF0dGVuKFxuICAgICAgICAgICAgZGF0YS5leHBvcnRzXG4gICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgcmVmID0+IHRoaXMubG9va3VwU2NvcGVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpLCBjb250ZXh0KSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChzY29wZTogU2VsZWN0b3JTY29wZXMgfCBudWxsKTogc2NvcGUgaXMgU2VsZWN0b3JTY29wZXMgPT4gc2NvcGUgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgLm1hcChzY29wZSA9PiBzY29wZS5leHBvcnRlZCkpXG4gICAgICBdLFxuICAgICAgZXhwb3J0ZWQ6IGZsYXR0ZW4oZGF0YS5leHBvcnRzLm1hcChyZWYgPT4ge1xuICAgICAgICBjb25zdCBzY29wZSA9XG4gICAgICAgICAgICB0aGlzLmxvb2t1cFNjb3BlcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZiksIGNvbnRleHQpO1xuICAgICAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuZXhwb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtyZWZdO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIG1ldGFkYXRhIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICpcbiAgICogUG90ZW50aWFsbHkgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUgb3Igb3RoZXJ3aXNlIGhhcyBhIG1hbnVhbGx5IGNyZWF0ZWRcbiAgICogbmdDb21wb25lbnREZWYvbmdEaXJlY3RpdmVEZWYuIEluIHRoaXMgY2FzZSwgdGhlIHR5cGUgbWV0YWRhdGEgb2YgdGhhdCBkZWZpbml0aW9uIGlzIHJlYWRcbiAgICogdG8gZGV0ZXJtaW5lIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwRGlyZWN0aXZlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9NZXRhZGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kaXJlY3RpdmVUb01ldGFkYXRhLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3MocmVmIGFzIFJlZmVyZW5jZTx0cy5DbGFzc0RlY2xhcmF0aW9uPik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBQaXBlTmFtZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5fcGlwZVRvTmFtZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9waXBlVG9OYW1lLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhub2RlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVhZCB0aGUgbWV0YWRhdGEgZnJvbSBhIGNsYXNzIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb21waWxlZCBzb21laG93IChlaXRoZXIgaXQncyBpbiBhIC5kLnRzXG4gICAqIGZpbGUsIG9yIGluIGEgLnRzIGZpbGUgd2l0aCBhIGhhbmR3cml0dGVuIGRlZmluaXRpb24pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGNsYXNzIG9mIGludGVyZXN0XG4gICAqIEBwYXJhbSBuZ01vZHVsZUltcG9ydGVkRnJvbSBtb2R1bGUgc3BlY2lmaWVyIG9mIHRoZSBpbXBvcnQgcGF0aCB0byBhc3N1bWUgZm9yIGFsbCBkZWNsYXJhdGlvbnNcbiAgICogc3RlbW1pbmcgZnJvbSB0aGlzIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNb2R1bGVEYXRhRnJvbUNvbXBpbGVkQ2xhc3MoXG4gICAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmcpOiBNb2R1bGVEYXRhfG51bGwge1xuICAgIC8vIFRoaXMgb3BlcmF0aW9uIGlzIGV4cGxpY2l0bHkgbm90IG1lbW9pemVkLCBhcyBpdCBkZXBlbmRzIG9uIGBuZ01vZHVsZUltcG9ydGVkRnJvbWAuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjYWNoaW5nIG9mIC5kLnRzIG1vZHVsZSBtZXRhZGF0YS5cbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLm5hbWUgPT09ICduZ01vZHVsZURlZicgJiYgbWVtYmVyLmlzU3RhdGljKTtcbiAgICBpZiAobmdNb2R1bGVEZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCB0aGUgc2hhcGUgb2YgdGhlIG5nTW9kdWxlRGVmIHR5cGUgaXMgY29ycmVjdC5cbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShuZ01vZHVsZURlZi50eXBlKSB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBNb2R1bGVEYXRhIG91dCBvZiB0aGUgdHlwZSBhcmd1bWVudHMuXG4gICAgY29uc3QgW18sIGRlY2xhcmF0aW9uTWV0YWRhdGEsIGltcG9ydE1ldGFkYXRhLCBleHBvcnRNZXRhZGF0YV0gPSBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY2xhcmF0aW9uczogdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShcbiAgICAgICAgICBkZWNsYXJhdGlvbk1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgZXhwb3J0czpcbiAgICAgICAgICB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGV4cG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgaW1wb3J0czpcbiAgICAgICAgICB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGltcG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3MocmVmOiBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOlxuICAgICAgU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBjb25zdCBjbGF6eiA9IHRzLmdldE9yaWdpbmFsTm9kZShyZWYubm9kZSkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT5cbiAgICAgICAgICAgIGZpZWxkLmlzU3RhdGljICYmIChmaWVsZC5uYW1lID09PSAnbmdDb21wb25lbnREZWYnIHx8IGZpZWxkLm5hbWUgPT09ICduZ0RpcmVjdGl2ZURlZicpKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWxlY3RvciA9IHJlYWRTdHJpbmdUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV0pO1xuICAgIGlmIChzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IGNsYXp6Lm5hbWUgIS50ZXh0LFxuICAgICAgZGlyZWN0aXZlOiByZWYsXG4gICAgICBpc0NvbXBvbmVudDogZGVmLm5hbWUgPT09ICduZ0NvbXBvbmVudERlZicsIHNlbGVjdG9yLFxuICAgICAgZXhwb3J0QXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1syXSksXG4gICAgICBpbnB1dHM6IHJlYWRTdHJpbmdNYXBUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbM10pLFxuICAgICAgb3V0cHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s0XSksXG4gICAgICBxdWVyaWVzOiByZWFkU3RyaW5nQXJyYXlUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbNV0pLFxuICAgICAgLi4uZXh0cmFjdERpcmVjdGl2ZUd1YXJkcyhjbGF6eiwgdGhpcy5yZWZsZWN0b3IpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+IGZpZWxkLmlzU3RhdGljICYmIGZpZWxkLm5hbWUgPT09ICduZ1BpcGVEZWYnKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgYFR5cGVOb2RlYCB3aGljaCBpcyBhIHR1cGxlIG9mIHJlZmVyZW5jZXMgdG8gb3RoZXIgdHlwZXMsIGFuZCByZXR1cm4gYFJlZmVyZW5jZWBzIHRvXG4gICAqIHRoZW0uXG4gICAqXG4gICAqIFRoaXMgb3BlcmF0aW9uIGFzc3VtZXMgdGhhdCB0aGVzZSB0eXBlcyBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSBgbmdNb2R1bGVJbXBvcnRlZEZyb21gIHVubGVzc1xuICAgKiB0aGV5IHRoZW1zZWx2ZXMgd2VyZSBpbXBvcnRlZCBmcm9tIGFub3RoZXIgYWJzb2x1dGUgcGF0aC5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICBkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdIHtcbiAgICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZShkZWYpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBkZWYuZWxlbWVudFR5cGVzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGlmICghdHMuaXNUeXBlUXVlcnlOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZWApO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGVsZW1lbnQuZXhwck5hbWU7XG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gIT09IG51bGwpIHtcbiAgICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAoZnJvbSAhPT0gbnVsbCAmJiAhZnJvbS5zdGFydHNXaXRoKCcuJykgPyBmcm9tIDogbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5yZXNvbHZlKG5vZGUsIG1vZHVsZU5hbWUsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHtub2RlfSA9IHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbih0eXBlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5yZXNvbHZlKG5vZGUsIG51bGwsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuPFQ+KGFycmF5OiBUW11bXSk6IFRbXSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKGFjY3VtLCBzdWJBcnJheSkgPT4ge1xuICAgIGFjY3VtLnB1c2goLi4uc3ViQXJyYXkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfSwgW10gYXMgVFtdKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVNb2R1bGVOYW1lKHJlZjogUmVmZXJlbmNlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gcmVmLm1vZHVsZU5hbWU7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREaXJlY3RpdmVSZWZlcmVuY2VMaXN0KFxuICAgIGlucHV0OiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+W10sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBTY29wZURpcmVjdGl2ZTxFeHByZXNzaW9uPltdIHtcbiAgcmV0dXJuIGlucHV0Lm1hcChtZXRhID0+IHtcbiAgICBjb25zdCBkaXJlY3RpdmUgPSBtZXRhLmRpcmVjdGl2ZS50b0V4cHJlc3Npb24oY29udGV4dCk7XG4gICAgaWYgKGRpcmVjdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3Qgd3JpdGUgZXhwcmVzc2lvbiB0byByZWZlcmVuY2UgJHttZXRhLmRpcmVjdGl2ZS5ub2RlfWApO1xuICAgIH1cbiAgICByZXR1cm4gey4uLm1ldGEsIGRpcmVjdGl2ZX07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UGlwZVJlZmVyZW5jZU1hcChcbiAgICBtYXA6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPiB7XG4gIGNvbnN0IG5ld01hcCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuICBtYXAuZm9yRWFjaCgobWV0YSwgc2VsZWN0b3IpID0+IHtcbiAgICBjb25zdCBwaXBlID0gbWV0YS50b0V4cHJlc3Npb24oY29udGV4dCk7XG4gICAgaWYgKHBpcGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHdyaXRlIGV4cHJlc3Npb24gdG8gcmVmZXJlbmNlICR7bWV0YS5ub2RlfWApO1xuICAgIH1cbiAgICBuZXdNYXAuc2V0KHNlbGVjdG9yLCBwaXBlKTtcbiAgfSk7XG4gIHJldHVybiBuZXdNYXA7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoXG4gICAgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiwgY29udGV4dDogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPEV4cHJlc3Npb24+IHtcbiAgY29uc3Qgc291cmNlQ29udGV4dCA9IHRzLmdldE9yaWdpbmFsTm9kZShjb250ZXh0KS5nZXRTb3VyY2VGaWxlKCk7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBjb252ZXJ0RGlyZWN0aXZlUmVmZXJlbmNlTGlzdChzY29wZS5kaXJlY3RpdmVzLCBzb3VyY2VDb250ZXh0KTtcbiAgY29uc3QgcGlwZXMgPSBjb252ZXJ0UGlwZVJlZmVyZW5jZU1hcChzY29wZS5waXBlcywgc291cmNlQ29udGV4dCk7XG4gIGNvbnN0IGRlY2xQb2ludGVyID0gbWF5YmVVbndyYXBOYW1lT2ZEZWNsYXJhdGlvbihjb250ZXh0KTtcbiAgbGV0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gZmFsc2U7XG4gIGRpcmVjdGl2ZXMuZm9yRWFjaChtZXRhID0+IHtcbiAgICBjb250YWluc0ZvcndhcmREZWNscyA9IGNvbnRhaW5zRm9yd2FyZERlY2xzIHx8XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UobWV0YS5kaXJlY3RpdmUsIGRlY2xQb2ludGVyLCBzb3VyY2VDb250ZXh0KTtcbiAgfSk7XG4gICFjb250YWluc0ZvcndhcmREZWNscyAmJiBwaXBlcy5mb3JFYWNoKGV4cHIgPT4ge1xuICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzID1cbiAgICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMgfHwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShleHByLCBkZWNsUG9pbnRlciwgc291cmNlQ29udGV4dCk7XG4gIH0pO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzLCBjb250YWluc0ZvcndhcmREZWNsc307XG59XG5cbmZ1bmN0aW9uIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoXG4gICAgZXhwcjogRXhwcmVzc2lvbiwgY29udGV4dDogdHMuTm9kZSwgY29udGV4dFNvdXJjZTogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICBpZiAoaXNXcmFwcGVkVHNOb2RlRXhwcihleHByKSkge1xuICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUoZXhwci5ub2RlKTtcbiAgICByZXR1cm4gbm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IGNvbnRleHRTb3VyY2UgJiYgY29udGV4dC5wb3MgPCBub2RlLnBvcztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcjogRXhwcmVzc2lvbik6IGV4cHIgaXMgV3JhcHBlZE5vZGVFeHByPHRzLk5vZGU+IHtcbiAgcmV0dXJuIGV4cHIgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHI7XG59XG5cbmZ1bmN0aW9uIG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnx0cy5JZGVudGlmaWVyIHtcbiAgaWYgKCh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpKSAmJiBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9XG4gIHJldHVybiBkZWNsO1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRTdHJpbmdNYXBUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBpZiAoIXRzLmlzVHlwZUxpdGVyYWxOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IG9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgdHlwZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlTaWduYXR1cmUobWVtYmVyKSB8fCBtZW1iZXIudHlwZSA9PT0gdW5kZWZpbmVkIHx8IG1lbWJlci5uYW1lID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXIubmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSByZWFkU3RyaW5nVHlwZShtZW1iZXIudHlwZSk7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgb2JqW21lbWJlci5uYW1lLnRleHRdID0gdmFsdWU7XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nQXJyYXlUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogc3RyaW5nW10ge1xuICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCByZXM6IHN0cmluZ1tdID0gW107XG4gIHR5cGUuZWxlbWVudFR5cGVzLmZvckVhY2goZWwgPT4ge1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUoZWwpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwoZWwubGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnB1c2goZWwubGl0ZXJhbC50ZXh0KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iXX0=