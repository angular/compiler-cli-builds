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
        function SelectorScopeRegistry(checker, reflector, refEmitter) {
            this.checker = checker;
            this.reflector = reflector;
            this.refEmitter = refEmitter;
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
            return scope !== null ? convertScopeToExpressions(scope, node, this.refEmitter) : null;
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
                    return _this.lookupScopesOrDie(ref.node, ref.ownedByModuleGuess, context)
                        .exported;
                })), flatten(data.exports
                    .map(function (ref) { return _this.lookupScopes(ref.node, ref.ownedByModuleGuess, context); })
                    .filter(function (scope) { return scope !== null; })
                    .map(function (scope) { return scope.exported; }))),
                exported: flatten(data.exports.map(function (ref) {
                    var scope = _this.lookupScopes(ref.node, ref.ownedByModuleGuess, context);
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
                    var specifier = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
                    return new imports_1.Reference(node, { specifier: specifier, resolutionContext: resolutionContext });
                }
                else {
                    var node = reflection_1.reflectTypeEntityToDeclaration(type, _this.checker).node;
                    return new imports_1.Reference(node);
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
    function convertDirectiveReferenceList(input, context, refEmitter) {
        return input.map(function (meta) {
            var directive = refEmitter.emit(meta.directive, context);
            if (directive === null) {
                throw new Error("Could not write expression to reference " + meta.directive.node);
            }
            return tslib_1.__assign({}, meta, { directive: directive });
        });
    }
    function convertPipeReferenceMap(map, context, refEmitter) {
        var newMap = new Map();
        map.forEach(function (meta, selector) {
            var pipe = refEmitter.emit(meta, context);
            if (pipe === null) {
                throw new Error("Could not write expression to reference " + meta.node);
            }
            newMap.set(selector, pipe);
        });
        return newMap;
    }
    function convertScopeToExpressions(scope, context, refEmitter) {
        var sourceContext = ts.getOriginalNode(context).getSourceFile();
        var directives = convertDirectiveReferenceList(scope.directives, sourceContext, refEmitter);
        var pipes = convertPipeReferenceMap(scope.pipes, sourceContext, refEmitter);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBOEQ7SUFDOUQsK0JBQWlDO0lBRWpDLG1FQUEwRDtJQUMxRCx5RUFBMEk7SUFHMUksNkVBQThDO0lBNEM5Qzs7Ozs7T0FLRztJQUNIO1FBK0JFLCtCQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsVUFBNEI7WUFENUIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQWhDeEM7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztZQUVwRjs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUV6RDs7ZUFFRztZQUNLLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1FBSWpDLENBQUM7UUFFNUM7O1dBRUc7UUFDSCw4Q0FBYyxHQUFkLFVBQWUsSUFBb0IsRUFBRSxJQUFnQjtZQUFyRCxpQkFZQztZQVhDLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBbUIsQ0FBQztZQUVsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dC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RCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLElBQWlCO1FBQzVDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzdCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFDRCxJQUFNLEdBQUcsR0FBYSxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFO1lBQzFCLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDaEUsT0FBTzthQUNSO1lBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbiwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uLCByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YX0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcblxuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZvciBhIGdpdmVuIE5nTW9kdWxlIHRoYXQgY2FuIGJlIHVzZWQgdG8gY29tcHV0ZSBzZWxlY3RvciBzY29wZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbn1cblxuLyoqXG4gKiBUcmFuc2l0aXZlbHkgZXhwYW5kZWQgbWFwcyBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGEgY29tcG9uZW50IGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlPFQ+IHtcbiAgZGlyZWN0aXZlczogU2NvcGVEaXJlY3RpdmU8VD5bXTtcbiAgcGlwZXM6IE1hcDxzdHJpbmcsIFQ+O1xuICBjb250YWluc0ZvcndhcmREZWNscz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NvcGVEaXJlY3RpdmU8VD4gZXh0ZW5kcyBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSB7XG4gIHNlbGVjdG9yOiBzdHJpbmc7XG4gIGRpcmVjdGl2ZTogVDtcbn1cblxuLyoqXG4gKiBCb3RoIHRyYW5zaXRpdmVseSBleHBhbmRlZCBzY29wZXMgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUuXG4gKi9cbmludGVyZmFjZSBTZWxlY3RvclNjb3BlcyB7XG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIHZpc2libGUgdG8gYWxsIGNvbXBvbmVudHMgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gICAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gICAqL1xuICBjb21waWxhdGlvbjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIGFkZGVkIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhbnkgbW9kdWxlIGltcG9ydGluZ1xuICAgKiBzb21lIG1vZHVsZS5cbiAgICovXG4gIGV4cG9ydGVkOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG59XG5cbi8qKlxuICogUmVnaXN0cnkgd2hpY2ggcmVjb3JkcyBhbmQgY29ycmVsYXRlcyBzdGF0aWMgYW5hbHlzaXMgaW5mb3JtYXRpb24gb2YgQW5ndWxhciB0eXBlcy5cbiAqXG4gKiBPbmNlIGEgY29tcGlsYXRpb24gdW5pdCdzIGluZm9ybWF0aW9uIGlzIGZlZCBpbnRvIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnksIGl0IGNhbiBiZSBhc2tlZCB0b1xuICogcHJvZHVjZSB0cmFuc2l0aXZlIGBDb21waWxhdGlvblNjb3BlYHMgZm9yIGNvbXBvbmVudHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZWxlY3RvclNjb3BlUmVnaXN0cnkge1xuICAvKipcbiAgICogIE1hcCBvZiBtb2R1bGVzIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlaXIgKGxvY2FsKSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgX21vZHVsZVRvRGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIE1vZHVsZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBtb2R1bGVzIHRvIHRoZWlyIGNhY2hlZCBgQ29tcGlsYXRpb25TY29wZWBzLlxuICAgKi9cbiAgcHJpdmF0ZSBfY29tcGlsYXRpb25TY29wZUNhY2hlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+PigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzIHRvIHRoZWlyIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfZGlyZWN0aXZlVG9NZXRhZGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBwaXBlcyB0byB0aGVpciBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGlwZVRvTmFtZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAvKipcbiAgICogQ29tcG9uZW50cyB0aGF0IHJlcXVpcmUgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBwcml2YXRlIF9yZXF1aXJlc1JlbW90ZVNjb3BlID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcy9waXBlcyB0byB0aGVpciBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpIHt9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgbW9kdWxlJ3MgbWV0YWRhdGEgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3Rlck1vZHVsZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGF0YTogTW9kdWxlRGF0YSk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgYWxyZWFkeSByZWdpc3RlcmVkOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX1gKTtcbiAgICB9XG4gICAgdGhpcy5fbW9kdWxlVG9EYXRhLnNldChub2RlLCBkYXRhKTtcblxuICAgIC8vIFJlZ2lzdGVyIGFsbCBvZiB0aGUgbW9kdWxlJ3MgZGVjbGFyYXRpb25zIGluIHRoZSBjb250ZXh0IG1hcCBhcyBiZWxvbmdpbmcgdG8gdGhpcyBtb2R1bGUuXG4gICAgZGF0YS5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsID0+IHtcbiAgICAgIHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuc2V0KHRzLmdldE9yaWdpbmFsTm9kZShkZWNsLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uLCBub2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbWV0YWRhdGEgb2YgYSBjb21wb25lbnQgb3IgZGlyZWN0aXZlIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJEaXJlY3RpdmUobm9kZTogdHMuRGVjbGFyYXRpb24sIG1ldGFkYXRhOiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+KTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICh0aGlzLl9kaXJlY3RpdmVUb01ldGFkYXRhLmhhcyhub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBTZWxlY3RvciBhbHJlYWR5IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfSAke21ldGFkYXRhLnNlbGVjdG9yfWApO1xuICAgIH1cbiAgICB0aGlzLl9kaXJlY3RpdmVUb01ldGFkYXRhLnNldChub2RlLCBtZXRhZGF0YSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIG5hbWUgb2YgYSBwaXBlIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJQaXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgdGhpcy5fcGlwZVRvTmFtZS5zZXQobm9kZSwgbmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTWFyayBhIGNvbXBvbmVudCAoaWRlbnRpZmllZCBieSBpdHMgYHRzLkRlY2xhcmF0aW9uYCkgYXMgcmVxdWlyaW5nIGl0cyBgZGlyZWN0aXZlc2Agc2NvcGUgdG8gYmVcbiAgICogc2V0IHJlbW90ZWx5LCBmcm9tIHRoZSBmaWxlIG9mIHRoZSBATmdNb2R1bGUgd2hpY2ggZGVjbGFyZXMgdGhlIGNvbXBvbmVudC5cbiAgICovXG4gIHNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhjb21wb25lbnQ6IHRzLkRlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5fcmVxdWlyZXNSZW1vdGVTY29wZS5hZGQoY29tcG9uZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBjb21wb25lbnQgcmVxdWlyZXMgaXRzIGBkaXJlY3RpdmVzYCBzY29wZSB0byBiZSBzZXQgcmVtb3RlbHkuXG4gICAqL1xuICByZXF1aXJlc1JlbW90ZVNjb3BlKGNvbXBvbmVudDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fcmVxdWlyZXNSZW1vdGVTY29wZS5oYXModHMuZ2V0T3JpZ2luYWxOb2RlKGNvbXBvbmVudCkgYXMgdHMuRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgbG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhub2RlOiB0cy5EZWNsYXJhdGlvbik6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgbm8gYXNzb2NpYXRlZCBtb2R1bGUsIHRoZW4gaXQgaGFzIG5vIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGlmICghdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuZ2V0KG5vZGUpICE7XG5cbiAgICAvLyBDb21waWxhdGlvbiBzY29wZSBjb21wdXRhdGlvbiBpcyBzb21ld2hhdCBleHBlbnNpdmUsIHNvIGl0J3MgY2FjaGVkLiBDaGVjayB0aGUgY2FjaGUgZm9yXG4gICAgLy8gdGhlIG1vZHVsZS5cbiAgICBpZiAodGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmhhcyhtb2R1bGUpKSB7XG4gICAgICAvLyBUaGUgY29tcGlsYXRpb24gc2NvcGUgd2FzIGNhY2hlZC5cbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmdldChtb2R1bGUpICE7XG5cbiAgICAgIC8vIFRoZSBzY29wZSBhcyBjYWNoZWQgaXMgaW4gdGVybXMgb2YgUmVmZXJlbmNlcywgbm90IEV4cHJlc3Npb25zLiBDb252ZXJ0aW5nIGJldHdlZW4gdGhlbVxuICAgICAgLy8gcmVxdWlyZXMga25vd2xlZGdlIG9mIHRoZSBjb250ZXh0IGZpbGUgKGluIHRoaXMgY2FzZSwgdGhlIGNvbXBvbmVudCBub2RlJ3Mgc291cmNlIGZpbGUpLlxuICAgICAgcmV0dXJuIHNjb3BlO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgdGhlIHNjb3BlIGZvciB0aGlzIG1vZHVsZSBpcyBiZWluZyBjb21wdXRlZC5cbiAgICBjb25zdCBkaXJlY3RpdmVzOiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+PltdID0gW107XG4gICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPj4oKTtcblxuICAgIC8vIFRyYWNrcyB3aGljaCBkZWNsYXJhdGlvbnMgYWxyZWFkeSBhcHBlYXIgaW4gdGhlIGBDb21waWxhdGlvblNjb3BlYC5cbiAgICBjb25zdCBzZWVuU2V0ID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAgIC8vIFByb2Nlc3MgdGhlIGRlY2xhcmF0aW9uIHNjb3BlIG9mIHRoZSBtb2R1bGUsIGFuZCBsb29rdXAgdGhlIHNlbGVjdG9yIG9mIGV2ZXJ5IGRlY2xhcmVkIHR5cGUuXG4gICAgLy8gVGhlIGluaXRpYWwgdmFsdWUgb2YgbmdNb2R1bGVJbXBvcnRlZEZyb20gaXMgJ251bGwnIHdoaWNoIHNpZ25pZmllcyB0aGF0IHRoZSBOZ01vZHVsZVxuICAgIC8vIHdhcyBub3QgaW1wb3J0ZWQgZnJvbSBhIC5kLnRzIHNvdXJjZS5cbiAgICBmb3IgKGNvbnN0IHJlZiBvZiB0aGlzXG4gICAgICAgICAgICAgLmxvb2t1cFNjb3Blc09yRGllKFxuICAgICAgICAgICAgICAgICBtb2R1bGUgISwgLyogbmdNb2R1bGVJbXBvcnRlZEZyb20gKi8gbnVsbCwgbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUpXG4gICAgICAgICAgICAgLmNvbXBpbGF0aW9uKSB7XG4gICAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgICAgLy8gVHJhY2sgd2hldGhlciB0aGlzIGB0cy5EZWNsYXJhdGlvbmAgaGFzIGJlZW4gc2VlbiBiZWZvcmUuXG4gICAgICBpZiAoc2VlblNldC5oYXMobm9kZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWVuU2V0LmFkZChub2RlKTtcbiAgICAgIH1cblxuICAgICAgLy8gRWl0aGVyIHRoZSBub2RlIHJlcHJlc2VudHMgYSBkaXJlY3RpdmUgb3IgYSBwaXBlLiBMb29rIGZvciBib3RoLlxuICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmxvb2t1cERpcmVjdGl2ZU1ldGFkYXRhKHJlZik7XG4gICAgICAvLyBPbmx5IGRpcmVjdGl2ZXMvY29tcG9uZW50cyB3aXRoIHNlbGVjdG9ycyBnZXQgYWRkZWQgdG8gdGhlIHNjb3BlLlxuICAgICAgaWYgKG1ldGFkYXRhICE9PSBudWxsKSB7XG4gICAgICAgIGRpcmVjdGl2ZXMucHVzaCh7Li4ubWV0YWRhdGEsIGRpcmVjdGl2ZTogcmVmfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5sb29rdXBQaXBlTmFtZShub2RlKTtcbiAgICAgICAgaWYgKG5hbWUgIT09IG51bGwpIHtcbiAgICAgICAgICBwaXBlcy5zZXQobmFtZSwgcmVmKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4gPSB7ZGlyZWN0aXZlcywgcGlwZXN9O1xuXG4gICAgLy8gTWFueSBjb21wb25lbnRzIG1heSBiZSBjb21waWxlZCBpbiB0aGUgc2FtZSBzY29wZSwgc28gY2FjaGUgaXQuXG4gICAgdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLnNldChub2RlLCBzY29wZSk7XG5cbiAgICAvLyBDb252ZXJ0IFJlZmVyZW5jZXMgdG8gRXhwcmVzc2lvbnMgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGNvbXBvbmVudCdzIHNvdXJjZSBmaWxlLlxuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIGNvbXBvbmVudCwgd2hpY2ggaXMgZGV0ZXJtaW5lZCBieSB0aGUgbW9kdWxlIHRoYXQgZGVjbGFyZXNcbiAgICogaXQuXG4gICAqL1xuICBsb29rdXBDb21waWxhdGlvblNjb3BlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPnxudWxsIHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMubG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhub2RlKTtcbiAgICByZXR1cm4gc2NvcGUgIT09IG51bGwgPyBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKHNjb3BlLCBub2RlLCB0aGlzLnJlZkVtaXR0ZXIpIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgbG9va3VwU2NvcGVzT3JEaWUoXG4gICAgICBub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZyk6IFNlbGVjdG9yU2NvcGVzIHtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmxvb2t1cFNjb3Blcyhub2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIG5vdCBmb3VuZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIGBTZWxlY3RvclNjb3Blc2AgZm9yIGEgZ2l2ZW4gbW9kdWxlLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGFzc3VtZXMgdGhhdCBpZiB0aGUgZ2l2ZW4gbW9kdWxlIHdhcyBpbXBvcnRlZCBmcm9tIGFuIGFic29sdXRlIHBhdGhcbiAgICogKGBuZ01vZHVsZUltcG9ydGVkRnJvbWApIHRoZW4gYWxsIG9mIGl0cyBkZWNsYXJhdGlvbnMgYXJlIGV4cG9ydGVkIGF0IHRoYXQgc2FtZSBwYXRoLCBhcyB3ZWxsXG4gICAqIGFzIGltcG9ydHMgYW5kIGV4cG9ydHMgZnJvbSBvdGhlciBtb2R1bGVzIHRoYXQgYXJlIHJlbGF0aXZlbHkgaW1wb3J0ZWQuXG4gICAqL1xuICBwcml2YXRlIGxvb2t1cFNjb3BlcyhcbiAgICAgIG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogU2VsZWN0b3JTY29wZXN8bnVsbCB7XG4gICAgbGV0IGRhdGE6IE1vZHVsZURhdGF8bnVsbCA9IG51bGw7XG5cbiAgICAvLyBFaXRoZXIgdGhpcyBtb2R1bGUgd2FzIGFuYWx5emVkIGRpcmVjdGx5LCBvciBoYXMgYSBwcmVjb21waWxlZCBuZ01vZHVsZURlZi5cbiAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhub2RlKSkge1xuICAgICAgLy8gVGhlIG1vZHVsZSB3YXMgYW5hbHl6ZWQgYmVmb3JlLCBhbmQgdGh1cyBpdHMgZGF0YSBpcyBhdmFpbGFibGUuXG4gICAgICBkYXRhID0gdGhpcy5fbW9kdWxlVG9EYXRhLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIHdhc24ndCBhbmFseXplZCBiZWZvcmUsIGFuZCBwcm9iYWJseSBoYXMgYSBwcmVjb21waWxlZCBuZ01vZHVsZURlZiB3aXRoIGEgdHlwZVxuICAgICAgLy8gYW5ub3RhdGlvbiB0aGF0IHNwZWNpZmllcyB0aGUgbmVlZGVkIG1ldGFkYXRhLlxuICAgICAgZGF0YSA9IHRoaXMuX3JlYWRNb2R1bGVEYXRhRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb20sIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICAgIC8vIE5vdGUgdGhhdCBkYXRhIGhlcmUgY291bGQgc3RpbGwgYmUgbnVsbCwgaWYgdGhlIGNsYXNzIGRpZG4ndCBoYXZlIGEgcHJlY29tcGlsZWRcbiAgICAgIC8vIG5nTW9kdWxlRGVmLlxuICAgIH1cblxuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGlsYXRpb246IFtcbiAgICAgICAgLi4uZGF0YS5kZWNsYXJhdGlvbnMsXG4gICAgICAgIC8vIEV4cGFuZCBpbXBvcnRzIHRvIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aG9zZSBpbXBvcnRzLlxuICAgICAgICAuLi5mbGF0dGVuKGRhdGEuaW1wb3J0cy5tYXAoXG4gICAgICAgICAgICByZWYgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmxvb2t1cFNjb3Blc09yRGllKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCByZWYub3duZWRCeU1vZHVsZUd1ZXNzLCBjb250ZXh0KVxuICAgICAgICAgICAgICAgICAgICAuZXhwb3J0ZWQpKSxcbiAgICAgICAgLy8gQW5kIGluY2x1ZGUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGV4cG9ydGVkIG1vZHVsZXMuXG4gICAgICAgIC4uLmZsYXR0ZW4oXG4gICAgICAgICAgICBkYXRhLmV4cG9ydHNcbiAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICByZWYgPT4gdGhpcy5sb29rdXBTY29wZXMoXG4gICAgICAgICAgICAgICAgICAgICAgICByZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgcmVmLm93bmVkQnlNb2R1bGVHdWVzcywgY29udGV4dCkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoc2NvcGU6IFNlbGVjdG9yU2NvcGVzIHwgbnVsbCk6IHNjb3BlIGlzIFNlbGVjdG9yU2NvcGVzID0+IHNjb3BlICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5tYXAoc2NvcGUgPT4gc2NvcGUuZXhwb3J0ZWQpKVxuICAgICAgXSxcbiAgICAgIGV4cG9ydGVkOiBmbGF0dGVuKGRhdGEuZXhwb3J0cy5tYXAocmVmID0+IHtcbiAgICAgICAgY29uc3Qgc2NvcGUgPVxuICAgICAgICAgICAgdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIHJlZi5vd25lZEJ5TW9kdWxlR3Vlc3MsIGNvbnRleHQpO1xuICAgICAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuZXhwb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtyZWZdO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIG1ldGFkYXRhIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICpcbiAgICogUG90ZW50aWFsbHkgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUgb3Igb3RoZXJ3aXNlIGhhcyBhIG1hbnVhbGx5IGNyZWF0ZWRcbiAgICogbmdDb21wb25lbnREZWYvbmdEaXJlY3RpdmVEZWYuIEluIHRoaXMgY2FzZSwgdGhlIHR5cGUgbWV0YWRhdGEgb2YgdGhhdCBkZWZpbml0aW9uIGlzIHJlYWRcbiAgICogdG8gZGV0ZXJtaW5lIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwRGlyZWN0aXZlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9NZXRhZGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kaXJlY3RpdmVUb01ldGFkYXRhLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3MocmVmIGFzIFJlZmVyZW5jZTx0cy5DbGFzc0RlY2xhcmF0aW9uPik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBQaXBlTmFtZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5fcGlwZVRvTmFtZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9waXBlVG9OYW1lLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhub2RlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVhZCB0aGUgbWV0YWRhdGEgZnJvbSBhIGNsYXNzIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb21waWxlZCBzb21laG93IChlaXRoZXIgaXQncyBpbiBhIC5kLnRzXG4gICAqIGZpbGUsIG9yIGluIGEgLnRzIGZpbGUgd2l0aCBhIGhhbmR3cml0dGVuIGRlZmluaXRpb24pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGNsYXNzIG9mIGludGVyZXN0XG4gICAqIEBwYXJhbSBuZ01vZHVsZUltcG9ydGVkRnJvbSBtb2R1bGUgc3BlY2lmaWVyIG9mIHRoZSBpbXBvcnQgcGF0aCB0byBhc3N1bWUgZm9yIGFsbCBkZWNsYXJhdGlvbnNcbiAgICogc3RlbW1pbmcgZnJvbSB0aGlzIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNb2R1bGVEYXRhRnJvbUNvbXBpbGVkQ2xhc3MoXG4gICAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmcpOiBNb2R1bGVEYXRhfG51bGwge1xuICAgIC8vIFRoaXMgb3BlcmF0aW9uIGlzIGV4cGxpY2l0bHkgbm90IG1lbW9pemVkLCBhcyBpdCBkZXBlbmRzIG9uIGBuZ01vZHVsZUltcG9ydGVkRnJvbWAuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjYWNoaW5nIG9mIC5kLnRzIG1vZHVsZSBtZXRhZGF0YS5cbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLm5hbWUgPT09ICduZ01vZHVsZURlZicgJiYgbWVtYmVyLmlzU3RhdGljKTtcbiAgICBpZiAobmdNb2R1bGVEZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCB0aGUgc2hhcGUgb2YgdGhlIG5nTW9kdWxlRGVmIHR5cGUgaXMgY29ycmVjdC5cbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShuZ01vZHVsZURlZi50eXBlKSB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBNb2R1bGVEYXRhIG91dCBvZiB0aGUgdHlwZSBhcmd1bWVudHMuXG4gICAgY29uc3QgW18sIGRlY2xhcmF0aW9uTWV0YWRhdGEsIGltcG9ydE1ldGFkYXRhLCBleHBvcnRNZXRhZGF0YV0gPSBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY2xhcmF0aW9uczogdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShcbiAgICAgICAgICBkZWNsYXJhdGlvbk1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgZXhwb3J0czpcbiAgICAgICAgICB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGV4cG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgICAgaW1wb3J0czpcbiAgICAgICAgICB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGltcG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSwgcmVzb2x1dGlvbkNvbnRleHQpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3MocmVmOiBSZWZlcmVuY2U8dHMuQ2xhc3NEZWNsYXJhdGlvbj4pOlxuICAgICAgU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBjb25zdCBjbGF6eiA9IHRzLmdldE9yaWdpbmFsTm9kZShyZWYubm9kZSkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT5cbiAgICAgICAgICAgIGZpZWxkLmlzU3RhdGljICYmIChmaWVsZC5uYW1lID09PSAnbmdDb21wb25lbnREZWYnIHx8IGZpZWxkLm5hbWUgPT09ICduZ0RpcmVjdGl2ZURlZicpKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzZWxlY3RvciA9IHJlYWRTdHJpbmdUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV0pO1xuICAgIGlmIChzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IGNsYXp6Lm5hbWUgIS50ZXh0LFxuICAgICAgZGlyZWN0aXZlOiByZWYsXG4gICAgICBpc0NvbXBvbmVudDogZGVmLm5hbWUgPT09ICduZ0NvbXBvbmVudERlZicsIHNlbGVjdG9yLFxuICAgICAgZXhwb3J0QXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1syXSksXG4gICAgICBpbnB1dHM6IHJlYWRTdHJpbmdNYXBUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbM10pLFxuICAgICAgb3V0cHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s0XSksXG4gICAgICBxdWVyaWVzOiByZWFkU3RyaW5nQXJyYXlUeXBlKGRlZi50eXBlLnR5cGVBcmd1bWVudHNbNV0pLFxuICAgICAgLi4uZXh0cmFjdERpcmVjdGl2ZUd1YXJkcyhjbGF6eiwgdGhpcy5yZWZsZWN0b3IpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+IGZpZWxkLmlzU3RhdGljICYmIGZpZWxkLm5hbWUgPT09ICduZ1BpcGVEZWYnKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgYFR5cGVOb2RlYCB3aGljaCBpcyBhIHR1cGxlIG9mIHJlZmVyZW5jZXMgdG8gb3RoZXIgdHlwZXMsIGFuZCByZXR1cm4gYFJlZmVyZW5jZWBzIHRvXG4gICAqIHRoZW0uXG4gICAqXG4gICAqIFRoaXMgb3BlcmF0aW9uIGFzc3VtZXMgdGhhdCB0aGVzZSB0eXBlcyBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSBgbmdNb2R1bGVJbXBvcnRlZEZyb21gIHVubGVzc1xuICAgKiB0aGV5IHRoZW1zZWx2ZXMgd2VyZSBpbXBvcnRlZCBmcm9tIGFub3RoZXIgYWJzb2x1dGUgcGF0aC5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoXG4gICAgICBkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nKTogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdIHtcbiAgICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZShkZWYpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBkZWYuZWxlbWVudFR5cGVzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGlmICghdHMuaXNUeXBlUXVlcnlOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZWApO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGVsZW1lbnQuZXhwck5hbWU7XG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gIT09IG51bGwpIHtcbiAgICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IHNwZWNpZmllciA9IChmcm9tICE9PSBudWxsICYmICFmcm9tLnN0YXJ0c1dpdGgoJy4nKSA/IGZyb20gOiBuZ01vZHVsZUltcG9ydGVkRnJvbSk7XG4gICAgICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKG5vZGUsIHtzcGVjaWZpZXIsIHJlc29sdXRpb25Db250ZXh0fSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB7bm9kZX0gPSByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24odHlwZSwgdGhpcy5jaGVja2VyKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbjxUPihhcnJheTogVFtdW10pOiBUW10ge1xuICByZXR1cm4gYXJyYXkucmVkdWNlKChhY2N1bSwgc3ViQXJyYXkpID0+IHtcbiAgICBhY2N1bS5wdXNoKC4uLnN1YkFycmF5KTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH0sIFtdIGFzIFRbXSk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREaXJlY3RpdmVSZWZlcmVuY2VMaXN0KFxuICAgIGlucHV0OiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+W10sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcik6IFNjb3BlRGlyZWN0aXZlPEV4cHJlc3Npb24+W10ge1xuICByZXR1cm4gaW5wdXQubWFwKG1ldGEgPT4ge1xuICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHJlZkVtaXR0ZXIuZW1pdChtZXRhLmRpcmVjdGl2ZSwgY29udGV4dCk7XG4gICAgaWYgKGRpcmVjdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3Qgd3JpdGUgZXhwcmVzc2lvbiB0byByZWZlcmVuY2UgJHttZXRhLmRpcmVjdGl2ZS5ub2RlfWApO1xuICAgIH1cbiAgICByZXR1cm4gey4uLm1ldGEsIGRpcmVjdGl2ZX07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0UGlwZVJlZmVyZW5jZU1hcChcbiAgICBtYXA6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcik6IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+IHtcbiAgY29uc3QgbmV3TWFwID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG4gIG1hcC5mb3JFYWNoKChtZXRhLCBzZWxlY3RvcikgPT4ge1xuICAgIGNvbnN0IHBpcGUgPSByZWZFbWl0dGVyLmVtaXQobWV0YSwgY29udGV4dCk7XG4gICAgaWYgKHBpcGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHdyaXRlIGV4cHJlc3Npb24gdG8gcmVmZXJlbmNlICR7bWV0YS5ub2RlfWApO1xuICAgIH1cbiAgICBuZXdNYXAuc2V0KHNlbGVjdG9yLCBwaXBlKTtcbiAgfSk7XG4gIHJldHVybiBuZXdNYXA7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoXG4gICAgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiwgY29udGV4dDogdHMuRGVjbGFyYXRpb24sXG4gICAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcik6IENvbXBpbGF0aW9uU2NvcGU8RXhwcmVzc2lvbj4ge1xuICBjb25zdCBzb3VyY2VDb250ZXh0ID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGNvbnRleHQpLmdldFNvdXJjZUZpbGUoKTtcbiAgY29uc3QgZGlyZWN0aXZlcyA9IGNvbnZlcnREaXJlY3RpdmVSZWZlcmVuY2VMaXN0KHNjb3BlLmRpcmVjdGl2ZXMsIHNvdXJjZUNvbnRleHQsIHJlZkVtaXR0ZXIpO1xuICBjb25zdCBwaXBlcyA9IGNvbnZlcnRQaXBlUmVmZXJlbmNlTWFwKHNjb3BlLnBpcGVzLCBzb3VyY2VDb250ZXh0LCByZWZFbWl0dGVyKTtcbiAgY29uc3QgZGVjbFBvaW50ZXIgPSBtYXliZVVud3JhcE5hbWVPZkRlY2xhcmF0aW9uKGNvbnRleHQpO1xuICBsZXQgY29udGFpbnNGb3J3YXJkRGVjbHMgPSBmYWxzZTtcbiAgZGlyZWN0aXZlcy5mb3JFYWNoKG1ldGEgPT4ge1xuICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzID0gY29udGFpbnNGb3J3YXJkRGVjbHMgfHxcbiAgICAgICAgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShtZXRhLmRpcmVjdGl2ZSwgZGVjbFBvaW50ZXIsIHNvdXJjZUNvbnRleHQpO1xuICB9KTtcbiAgIWNvbnRhaW5zRm9yd2FyZERlY2xzICYmIHBpcGVzLmZvckVhY2goZXhwciA9PiB7XG4gICAgY29udGFpbnNGb3J3YXJkRGVjbHMgPVxuICAgICAgICBjb250YWluc0ZvcndhcmREZWNscyB8fCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKGV4cHIsIGRlY2xQb2ludGVyLCBzb3VyY2VDb250ZXh0KTtcbiAgfSk7XG4gIHJldHVybiB7ZGlyZWN0aXZlcywgcGlwZXMsIGNvbnRhaW5zRm9yd2FyZERlY2xzfTtcbn1cblxuZnVuY3Rpb24gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShcbiAgICBleHByOiBFeHByZXNzaW9uLCBjb250ZXh0OiB0cy5Ob2RlLCBjb250ZXh0U291cmNlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIGlmIChpc1dyYXBwZWRUc05vZGVFeHByKGV4cHIpKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShleHByLm5vZGUpO1xuICAgIHJldHVybiBub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gY29udGV4dFNvdXJjZSAmJiBjb250ZXh0LnBvcyA8IG5vZGUucG9zO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNXcmFwcGVkVHNOb2RlRXhwcihleHByOiBFeHByZXNzaW9uKTogZXhwciBpcyBXcmFwcGVkTm9kZUV4cHI8dHMuTm9kZT4ge1xuICByZXR1cm4gZXhwciBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcjtcbn1cblxuZnVuY3Rpb24gbWF5YmVVbndyYXBOYW1lT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY2xhcmF0aW9ufHRzLklkZW50aWZpZXIge1xuICBpZiAoKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsKSB8fCB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbCkpICYmIGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWU7XG4gIH1cbiAgcmV0dXJuIGRlY2w7XG59XG5cbmZ1bmN0aW9uIHJlYWRTdHJpbmdUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbn1cblxuZnVuY3Rpb24gcmVhZFN0cmluZ01hcFR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGlmICghdHMuaXNUeXBlTGl0ZXJhbE5vZGUodHlwZSkpIHtcbiAgICByZXR1cm4ge307XG4gIH1cbiAgY29uc3Qgb2JqOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICB0eXBlLm1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgIGlmICghdHMuaXNQcm9wZXJ0eVNpZ25hdHVyZShtZW1iZXIpIHx8IG1lbWJlci50eXBlID09PSB1bmRlZmluZWQgfHwgbWVtYmVyLm5hbWUgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhdHMuaXNTdHJpbmdMaXRlcmFsKG1lbWJlci5uYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB2YWx1ZSA9IHJlYWRTdHJpbmdUeXBlKG1lbWJlci50eXBlKTtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBvYmpbbWVtYmVyLm5hbWUudGV4dF0gPSB2YWx1ZTtcbiAgfSk7XG4gIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIHJlYWRTdHJpbmdBcnJheVR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiBzdHJpbmdbXSB7XG4gIGlmICghdHMuaXNUdXBsZVR5cGVOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IHJlczogc3RyaW5nW10gPSBbXTtcbiAgdHlwZS5lbGVtZW50VHlwZXMuZm9yRWFjaChlbCA9PiB7XG4gICAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZShlbCkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbChlbC5saXRlcmFsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMucHVzaChlbC5saXRlcmFsLnRleHQpO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cbiJdfQ==