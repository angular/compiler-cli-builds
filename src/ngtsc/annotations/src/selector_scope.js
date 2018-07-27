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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Registry which records and correlates static analysis information of Angular types.
     *
     * Once a compilation unit's information is fed into the SelectorScopeRegistry, it can be asked to
     * produce transitive `CompilationScope`s for components.
     */
    var SelectorScopeRegistry = /** @class */ (function () {
        function SelectorScopeRegistry(checker, reflector) {
            this.checker = checker;
            this.reflector = reflector;
            /**
             *  Map of modules declared in the current compilation unit to their (local) metadata.
             */
            this._moduleToData = new Map();
            /**
             * Map of modules to their cached `CompilationScope`s.
             */
            this._compilationScopeCache = new Map();
            /**
             * Map of components/directives to their selector.
             */
            this._directiveToSelector = new Map();
            /**
             * Map of pipes to their name.
             */
            this._pipeToName = new Map();
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
                throw new Error("Module already registered: " + reflector_1.reflectNameOfDeclaration(node));
            }
            this._moduleToData.set(node, data);
            // Register all of the module's declarations in the context map as belonging to this module.
            data.declarations.forEach(function (decl) {
                _this._declararedTypeToModule.set(ts.getOriginalNode(decl.node), node);
            });
        };
        /**
         * Register the selector of a component or directive with the registry.
         */
        SelectorScopeRegistry.prototype.registerSelector = function (node, selector) {
            node = ts.getOriginalNode(node);
            if (this._directiveToSelector.has(node)) {
                throw new Error("Selector already registered: " + reflector_1.reflectNameOfDeclaration(node) + " " + selector);
            }
            this._directiveToSelector.set(node, selector);
        };
        /**
         * Register the name of a pipe with the registry.
         */
        SelectorScopeRegistry.prototype.registerPipe = function (node, name) {
            node = ts.getOriginalNode(node);
            this._pipeToName.set(node, name);
        };
        /**
         * Produce the compilation scope of a component, which is determined by the module that declares
         * it.
         */
        SelectorScopeRegistry.prototype.lookupCompilationScope = function (node) {
            var _this = this;
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
                return convertScopeToExpressions(scope_1, node.getSourceFile());
            }
            // This is the first time the scope for this module is being computed.
            var directives = new Map();
            var pipes = new Map();
            // Process the declaration scope of the module, and lookup the selector of every declared type.
            // The initial value of ngModuleImportedFrom is 'null' which signifies that the NgModule
            // was not imported from a .d.ts source.
            this.lookupScopes(module, /* ngModuleImportedFrom */ null).compilation.forEach(function (ref) {
                var node = ts.getOriginalNode(ref.node);
                // Either the node represents a directive or a pipe. Look for both.
                var selector = _this.lookupDirectiveSelector(node);
                // Only directives/components with selectors get added to the scope.
                if (selector != null) {
                    directives.set(selector, ref);
                    return;
                }
                var name = _this.lookupPipeName(node);
                if (name != null) {
                    pipes.set(name, ref);
                }
            });
            var scope = { directives: directives, pipes: pipes };
            // Many components may be compiled in the same scope, so cache it.
            this._compilationScopeCache.set(node, scope);
            // Convert References to Expressions in the context of the component's source file.
            return convertScopeToExpressions(scope, node.getSourceFile());
        };
        /**
         * Lookup `SelectorScopes` for a given module.
         *
         * This function assumes that if the given module was imported from an absolute path
         * (`ngModuleImportedFrom`) then all of its declarations are exported at that same path, as well
         * as imports and exports from other modules that are relatively imported.
         */
        SelectorScopeRegistry.prototype.lookupScopes = function (node, ngModuleImportedFrom) {
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
                data = this._readMetadataFromCompiledClass(node, ngModuleImportedFrom);
                // Note that data here could still be null, if the class didn't have a precompiled
                // ngModuleDef.
            }
            if (data === null) {
                throw new Error("Module not registered: " + reflector_1.reflectNameOfDeclaration(node));
            }
            return {
                compilation: tslib_1.__spread(data.declarations, flatten(data.imports.map(function (ref) {
                    return _this.lookupScopes(ref.node, absoluteModuleName(ref)).exported;
                })), flatten(data.exports.filter(function (ref) { return _this._moduleToData.has(ref.node); })
                    .map(function (ref) { return _this.lookupScopes(ref.node, absoluteModuleName(ref))
                    .exported; }))),
                exported: flatten(data.exports.map(function (ref) {
                    if (_this._moduleToData.has(ref.node)) {
                        return _this.lookupScopes(ref.node, absoluteModuleName(ref)).exported;
                    }
                    else {
                        return [ref];
                    }
                })),
            };
        };
        /**
         * Lookup the selector of a component or directive class.
         *
         * Potentially this class is declared in a .d.ts file or otherwise has a manually created
         * ngComponentDef/ngDirectiveDef. In this case, the type metadata of that definition is read
         * to determine the selector.
         */
        SelectorScopeRegistry.prototype.lookupDirectiveSelector = function (node) {
            if (this._directiveToSelector.has(node)) {
                return this._directiveToSelector.get(node);
            }
            else {
                return this._readSelectorFromCompiledClass(node);
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
        SelectorScopeRegistry.prototype._readMetadataFromCompiledClass = function (clazz, ngModuleImportedFrom) {
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
                declarations: this._extractReferencesFromType(declarationMetadata, ngModuleImportedFrom),
                exports: this._extractReferencesFromType(exportMetadata, ngModuleImportedFrom),
                imports: this._extractReferencesFromType(importMetadata, ngModuleImportedFrom),
            };
        };
        /**
         * Get the selector from type metadata for a class with a precompiled ngComponentDef or
         * ngDirectiveDef.
         */
        SelectorScopeRegistry.prototype._readSelectorFromCompiledClass = function (clazz) {
            var def = this.reflector.getMembersOfClass(clazz).find(function (field) {
                return field.isStatic && (field.name === 'ngComponentDef' || field.name === 'ngDirectiveDef');
            });
            if (def === undefined) {
                // No definition could be found.
                return null;
            }
            else if (def.type === null || !ts.isTypeReferenceNode(def.type) ||
                def.type.typeArguments === undefined || def.type.typeArguments.length !== 2) {
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
                def.type.typeArguments === undefined || def.type.typeArguments.length !== 2) {
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
        SelectorScopeRegistry.prototype._extractReferencesFromType = function (def, ngModuleImportedFrom) {
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
                    var _a = metadata_1.reflectTypeEntityToDeclaration(type, _this.checker), node = _a.node, from = _a.from;
                    var moduleName = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
                    var id = reflector_1.reflectIdentifierOfDeclaration(node);
                    return new metadata_1.AbsoluteReference(node, id, moduleName, id.text);
                }
                else {
                    var node = metadata_1.reflectTypeEntityToDeclaration(type, _this.checker).node;
                    var id = reflector_1.reflectIdentifierOfDeclaration(node);
                    return new metadata_1.ResolvedReference(node, id);
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
        if (!(ref instanceof metadata_1.AbsoluteReference)) {
            return null;
        }
        return ref.moduleName;
    }
    function convertReferenceMap(map, context) {
        return new Map(Array.from(map.entries()).map(function (_a) {
            var _b = tslib_1.__read(_a, 2), selector = _b[0], ref = _b[1];
            return [selector, util_1.toR3Reference(ref, context).value];
        }));
    }
    function convertScopeToExpressions(scope, context) {
        var directives = convertReferenceMap(scope.directives, context);
        var pipes = convertReferenceMap(scope.pipes, context);
        return { directives: directives, pipes: pipes };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMscUVBQStHO0lBQy9HLG9GQUFzRztJQUV0Ryw2RUFBcUM7SUF1Q3JDOzs7OztPQUtHO0lBQ0g7UUEwQkUsK0JBQW9CLE9BQXVCLEVBQVUsU0FBeUI7WUFBMUQsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQXpCOUU7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztZQUVqRTs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUVLLENBQUM7UUFFbEY7O1dBRUc7UUFDSCw4Q0FBYyxHQUFkLFVBQWUsSUFBb0IsRUFBRSxJQUFnQjtZQUFyRCxpQkFZQztZQVhDLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBbUIsQ0FBQztZQUVsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUE4QixvQ0FBd0IsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQ2pGO1lBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENB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QUFvQixLQUFZO1FBQzlCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFDLEtBQUssRUFBRSxRQUFRO1lBQ2xDLEtBQUssQ0FBQyxJQUFJLE9BQVYsS0FBSyxtQkFBUyxRQUFRLEdBQUU7WUFDeEIsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLEVBQUUsRUFBUyxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUVELDRCQUE0QixHQUFjO1FBQ3hDLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSw0QkFBaUIsQ0FBQyxFQUFFO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVELDZCQUNJLEdBQTJCLEVBQUUsT0FBc0I7UUFDckQsT0FBTyxJQUFJLEdBQUcsQ0FBcUIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQyxFQUFlO2dCQUFmLDBCQUFlLEVBQWQsZ0JBQVEsRUFBRSxXQUFHO1lBRTNFLE9BQUEsQ0FBQyxRQUFRLEVBQUUsb0JBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQTdDLENBQTZDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxtQ0FDSSxLQUFrQyxFQUFFLE9BQXNCO1FBQzVELElBQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEUsSUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsS0FBSyxPQUFBLEVBQUMsQ0FBQztJQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2UsIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtyZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24sIHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5cbmltcG9ydCB7dG9SM1JlZmVyZW5jZX0gZnJvbSAnLi91dGlsJztcblxuXG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZvciBhIGdpdmVuIE5nTW9kdWxlIHRoYXQgY2FuIGJlIHVzZWQgdG8gY29tcHV0ZSBzZWxlY3RvciBzY29wZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlW107XG4gIGltcG9ydHM6IFJlZmVyZW5jZVtdO1xuICBleHBvcnRzOiBSZWZlcmVuY2VbXTtcbn1cblxuLyoqXG4gKiBUcmFuc2l0aXZlbHkgZXhwYW5kZWQgbWFwcyBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGEgY29tcG9uZW50IGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlPFQ+IHtcbiAgZGlyZWN0aXZlczogTWFwPHN0cmluZywgVD47XG4gIHBpcGVzOiBNYXA8c3RyaW5nLCBUPjtcbn1cblxuLyoqXG4gKiBCb3RoIHRyYW5zaXRpdmVseSBleHBhbmRlZCBzY29wZXMgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUuXG4gKi9cbmludGVyZmFjZSBTZWxlY3RvclNjb3BlcyB7XG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIHZpc2libGUgdG8gYWxsIGNvbXBvbmVudHMgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gICAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gICAqL1xuICBjb21waWxhdGlvbjogUmVmZXJlbmNlW107XG5cbiAgLyoqXG4gICAqIFNldCBvZiBjb21wb25lbnRzLCBkaXJlY3RpdmVzLCBhbmQgcGlwZXMgYWRkZWQgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGFueSBtb2R1bGUgaW1wb3J0aW5nXG4gICAqIHNvbWUgbW9kdWxlLlxuICAgKi9cbiAgZXhwb3J0ZWQ6IFJlZmVyZW5jZVtdO1xufVxuXG4vKipcbiAqIFJlZ2lzdHJ5IHdoaWNoIHJlY29yZHMgYW5kIGNvcnJlbGF0ZXMgc3RhdGljIGFuYWx5c2lzIGluZm9ybWF0aW9uIG9mIEFuZ3VsYXIgdHlwZXMuXG4gKlxuICogT25jZSBhIGNvbXBpbGF0aW9uIHVuaXQncyBpbmZvcm1hdGlvbiBpcyBmZWQgaW50byB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LCBpdCBjYW4gYmUgYXNrZWQgdG9cbiAqIHByb2R1Y2UgdHJhbnNpdGl2ZSBgQ29tcGlsYXRpb25TY29wZWBzIGZvciBjb21wb25lbnRzLlxuICovXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqICBNYXAgb2YgbW9kdWxlcyBkZWNsYXJlZCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZWlyIChsb2NhbCkgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIF9tb2R1bGVUb0RhdGEgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBNb2R1bGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgbW9kdWxlcyB0byB0aGVpciBjYWNoZWQgYENvbXBpbGF0aW9uU2NvcGVgcy5cbiAgICovXG4gIHByaXZhdGUgX2NvbXBpbGF0aW9uU2NvcGVDYWNoZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcyB0byB0aGVpciBzZWxlY3Rvci5cbiAgICovXG4gIHByaXZhdGUgX2RpcmVjdGl2ZVRvU2VsZWN0b3IgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBwaXBlcyB0byB0aGVpciBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGlwZVRvTmFtZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcy9waXBlcyB0byB0aGVpciBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIG1vZHVsZSdzIG1ldGFkYXRhIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJNb2R1bGUobm9kZTogdHMuRGVjbGFyYXRpb24sIGRhdGE6IE1vZHVsZURhdGEpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9YCk7XG4gICAgfVxuICAgIHRoaXMuX21vZHVsZVRvRGF0YS5zZXQobm9kZSwgZGF0YSk7XG5cbiAgICAvLyBSZWdpc3RlciBhbGwgb2YgdGhlIG1vZHVsZSdzIGRlY2xhcmF0aW9ucyBpbiB0aGUgY29udGV4dCBtYXAgYXMgYmVsb25naW5nIHRvIHRoaXMgbW9kdWxlLlxuICAgIGRhdGEuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbCA9PiB7XG4gICAgICB0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLnNldCh0cy5nZXRPcmlnaW5hbE5vZGUoZGVjbC5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbiwgbm9kZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIHNlbGVjdG9yIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyU2VsZWN0b3Iobm9kZTogdHMuRGVjbGFyYXRpb24sIHNlbGVjdG9yOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3IuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlbGVjdG9yIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9ICR7c2VsZWN0b3J9YCk7XG4gICAgfVxuICAgIHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3Iuc2V0KG5vZGUsIHNlbGVjdG9yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbmFtZSBvZiBhIHBpcGUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclBpcGUobm9kZTogdHMuRGVjbGFyYXRpb24sIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICB0aGlzLl9waXBlVG9OYW1lLnNldChub2RlLCBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIGNvbXBvbmVudCwgd2hpY2ggaXMgZGV0ZXJtaW5lZCBieSB0aGUgbW9kdWxlIHRoYXQgZGVjbGFyZXNcbiAgICogaXQuXG4gICAqL1xuICBsb29rdXBDb21waWxhdGlvblNjb3BlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPnxudWxsIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgbm8gYXNzb2NpYXRlZCBtb2R1bGUsIHRoZW4gaXQgaGFzIG5vIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGlmICghdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuZ2V0KG5vZGUpICE7XG5cbiAgICAvLyBDb21waWxhdGlvbiBzY29wZSBjb21wdXRhdGlvbiBpcyBzb21ld2hhdCBleHBlbnNpdmUsIHNvIGl0J3MgY2FjaGVkLiBDaGVjayB0aGUgY2FjaGUgZm9yXG4gICAgLy8gdGhlIG1vZHVsZS5cbiAgICBpZiAodGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmhhcyhtb2R1bGUpKSB7XG4gICAgICAvLyBUaGUgY29tcGlsYXRpb24gc2NvcGUgd2FzIGNhY2hlZC5cbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmdldChtb2R1bGUpICE7XG5cbiAgICAgIC8vIFRoZSBzY29wZSBhcyBjYWNoZWQgaXMgaW4gdGVybXMgb2YgUmVmZXJlbmNlcywgbm90IEV4cHJlc3Npb25zLiBDb252ZXJ0aW5nIGJldHdlZW4gdGhlbVxuICAgICAgLy8gcmVxdWlyZXMga25vd2xlZGdlIG9mIHRoZSBjb250ZXh0IGZpbGUgKGluIHRoaXMgY2FzZSwgdGhlIGNvbXBvbmVudCBub2RlJ3Mgc291cmNlIGZpbGUpLlxuICAgICAgcmV0dXJuIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoc2NvcGUsIG5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCB0aW1lIHRoZSBzY29wZSBmb3IgdGhpcyBtb2R1bGUgaXMgYmVpbmcgY29tcHV0ZWQuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+KCk7XG4gICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPigpO1xuXG4gICAgLy8gUHJvY2VzcyB0aGUgZGVjbGFyYXRpb24gc2NvcGUgb2YgdGhlIG1vZHVsZSwgYW5kIGxvb2t1cCB0aGUgc2VsZWN0b3Igb2YgZXZlcnkgZGVjbGFyZWQgdHlwZS5cbiAgICAvLyBUaGUgaW5pdGlhbCB2YWx1ZSBvZiBuZ01vZHVsZUltcG9ydGVkRnJvbSBpcyAnbnVsbCcgd2hpY2ggc2lnbmlmaWVzIHRoYXQgdGhlIE5nTW9kdWxlXG4gICAgLy8gd2FzIG5vdCBpbXBvcnRlZCBmcm9tIGEgLmQudHMgc291cmNlLlxuICAgIHRoaXMubG9va3VwU2NvcGVzKG1vZHVsZSAhLCAvKiBuZ01vZHVsZUltcG9ydGVkRnJvbSAqLyBudWxsKS5jb21waWxhdGlvbi5mb3JFYWNoKHJlZiA9PiB7XG4gICAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgICAgLy8gRWl0aGVyIHRoZSBub2RlIHJlcHJlc2VudHMgYSBkaXJlY3RpdmUgb3IgYSBwaXBlLiBMb29rIGZvciBib3RoLlxuICAgICAgY29uc3Qgc2VsZWN0b3IgPSB0aGlzLmxvb2t1cERpcmVjdGl2ZVNlbGVjdG9yKG5vZGUpO1xuICAgICAgLy8gT25seSBkaXJlY3RpdmVzL2NvbXBvbmVudHMgd2l0aCBzZWxlY3RvcnMgZ2V0IGFkZGVkIHRvIHRoZSBzY29wZS5cbiAgICAgIGlmIChzZWxlY3RvciAhPSBudWxsKSB7XG4gICAgICAgIGRpcmVjdGl2ZXMuc2V0KHNlbGVjdG9yLCByZWYpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLmxvb2t1cFBpcGVOYW1lKG5vZGUpO1xuICAgICAgaWYgKG5hbWUgIT0gbnVsbCkge1xuICAgICAgICBwaXBlcy5zZXQobmFtZSwgcmVmKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHNjb3BlOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4gPSB7ZGlyZWN0aXZlcywgcGlwZXN9O1xuXG4gICAgLy8gTWFueSBjb21wb25lbnRzIG1heSBiZSBjb21waWxlZCBpbiB0aGUgc2FtZSBzY29wZSwgc28gY2FjaGUgaXQuXG4gICAgdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLnNldChub2RlLCBzY29wZSk7XG5cbiAgICAvLyBDb252ZXJ0IFJlZmVyZW5jZXMgdG8gRXhwcmVzc2lvbnMgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGNvbXBvbmVudCdzIHNvdXJjZSBmaWxlLlxuICAgIHJldHVybiBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKHNjb3BlLCBub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIGBTZWxlY3RvclNjb3Blc2AgZm9yIGEgZ2l2ZW4gbW9kdWxlLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGFzc3VtZXMgdGhhdCBpZiB0aGUgZ2l2ZW4gbW9kdWxlIHdhcyBpbXBvcnRlZCBmcm9tIGFuIGFic29sdXRlIHBhdGhcbiAgICogKGBuZ01vZHVsZUltcG9ydGVkRnJvbWApIHRoZW4gYWxsIG9mIGl0cyBkZWNsYXJhdGlvbnMgYXJlIGV4cG9ydGVkIGF0IHRoYXQgc2FtZSBwYXRoLCBhcyB3ZWxsXG4gICAqIGFzIGltcG9ydHMgYW5kIGV4cG9ydHMgZnJvbSBvdGhlciBtb2R1bGVzIHRoYXQgYXJlIHJlbGF0aXZlbHkgaW1wb3J0ZWQuXG4gICAqL1xuICBwcml2YXRlIGxvb2t1cFNjb3Blcyhub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsKTogU2VsZWN0b3JTY29wZXMge1xuICAgIGxldCBkYXRhOiBNb2R1bGVEYXRhfG51bGwgPSBudWxsO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgbW9kdWxlIHdhcyBhbmFseXplZCBkaXJlY3RseSwgb3IgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2FzIGFuYWx5emVkIGJlZm9yZSwgYW5kIHRodXMgaXRzIGRhdGEgaXMgYXZhaWxhYmxlLlxuICAgICAgZGF0YSA9IHRoaXMuX21vZHVsZVRvRGF0YS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIG1vZHVsZSB3YXNuJ3QgYW5hbHl6ZWQgYmVmb3JlLCBhbmQgcHJvYmFibHkgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYgd2l0aCBhIHR5cGVcbiAgICAgIC8vIGFubm90YXRpb24gdGhhdCBzcGVjaWZpZXMgdGhlIG5lZWRlZCBtZXRhZGF0YS5cbiAgICAgIGRhdGEgPSB0aGlzLl9yZWFkTWV0YWRhdGFGcm9tQ29tcGlsZWRDbGFzcyhub2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbSk7XG4gICAgICAvLyBOb3RlIHRoYXQgZGF0YSBoZXJlIGNvdWxkIHN0aWxsIGJlIG51bGwsIGlmIHRoZSBjbGFzcyBkaWRuJ3QgaGF2ZSBhIHByZWNvbXBpbGVkXG4gICAgICAvLyBuZ01vZHVsZURlZi5cbiAgICB9XG5cbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgbm90IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjb21waWxhdGlvbjogW1xuICAgICAgICAuLi5kYXRhLmRlY2xhcmF0aW9ucyxcbiAgICAgICAgLy8gRXhwYW5kIGltcG9ydHMgdG8gdGhlIGV4cG9ydGVkIHNjb3BlIG9mIHRob3NlIGltcG9ydHMuXG4gICAgICAgIC4uLmZsYXR0ZW4oZGF0YS5pbXBvcnRzLm1hcChcbiAgICAgICAgICAgIHJlZiA9PlxuICAgICAgICAgICAgICAgIHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSkuZXhwb3J0ZWQpKSxcbiAgICAgICAgLy8gQW5kIGluY2x1ZGUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGV4cG9ydGVkIG1vZHVsZXMuXG4gICAgICAgIC4uLmZsYXR0ZW4oXG4gICAgICAgICAgICBkYXRhLmV4cG9ydHMuZmlsdGVyKHJlZiA9PiB0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uKSlcbiAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICByZWYgPT4gdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leHBvcnRlZCkpXG4gICAgICBdLFxuICAgICAgZXhwb3J0ZWQ6IGZsYXR0ZW4oZGF0YS5leHBvcnRzLm1hcChyZWYgPT4ge1xuICAgICAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpKS5leHBvcnRlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW3JlZl07XG4gICAgICAgIH1cbiAgICAgIH0pKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgc2VsZWN0b3Igb2YgYSBjb21wb25lbnQgb3IgZGlyZWN0aXZlIGNsYXNzLlxuICAgKlxuICAgKiBQb3RlbnRpYWxseSB0aGlzIGNsYXNzIGlzIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZSBvciBvdGhlcndpc2UgaGFzIGEgbWFudWFsbHkgY3JlYXRlZFxuICAgKiBuZ0NvbXBvbmVudERlZi9uZ0RpcmVjdGl2ZURlZi4gSW4gdGhpcyBjYXNlLCB0aGUgdHlwZSBtZXRhZGF0YSBvZiB0aGF0IGRlZmluaXRpb24gaXMgcmVhZFxuICAgKiB0byBkZXRlcm1pbmUgdGhlIHNlbGVjdG9yLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBEaXJlY3RpdmVTZWxlY3Rvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kaXJlY3RpdmVUb1NlbGVjdG9yLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZFNlbGVjdG9yRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBQaXBlTmFtZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5fcGlwZVRvTmFtZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9waXBlVG9OYW1lLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhub2RlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVhZCB0aGUgbWV0YWRhdGEgZnJvbSBhIGNsYXNzIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb21waWxlZCBzb21laG93IChlaXRoZXIgaXQncyBpbiBhIC5kLnRzXG4gICAqIGZpbGUsIG9yIGluIGEgLnRzIGZpbGUgd2l0aCBhIGhhbmR3cml0dGVuIGRlZmluaXRpb24pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGNsYXNzIG9mIGludGVyZXN0XG4gICAqIEBwYXJhbSBuZ01vZHVsZUltcG9ydGVkRnJvbSBtb2R1bGUgc3BlY2lmaWVyIG9mIHRoZSBpbXBvcnQgcGF0aCB0byBhc3N1bWUgZm9yIGFsbCBkZWNsYXJhdGlvbnNcbiAgICogc3RlbW1pbmcgZnJvbSB0aGlzIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNZXRhZGF0YUZyb21Db21waWxlZENsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsKTpcbiAgICAgIE1vZHVsZURhdGF8bnVsbCB7XG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgZXhwbGljaXRseSBub3QgbWVtb2l6ZWQsIGFzIGl0IGRlcGVuZHMgb24gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ25nTW9kdWxlRGVmJyAmJiBtZW1iZXIuaXNTdGF0aWMpO1xuICAgIGlmIChuZ01vZHVsZURlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBzaGFwZSBvZiB0aGUgbmdNb2R1bGVEZWYgdHlwZSBpcyBjb3JyZWN0LlxuICAgICAgICBuZ01vZHVsZURlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5nTW9kdWxlRGVmLnR5cGUpIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIE1vZHVsZURhdGEgb3V0IG9mIHRoZSB0eXBlIGFyZ3VtZW50cy5cbiAgICBjb25zdCBbXywgZGVjbGFyYXRpb25NZXRhZGF0YSwgaW1wb3J0TWV0YWRhdGEsIGV4cG9ydE1ldGFkYXRhXSA9IG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cztcbiAgICByZXR1cm4ge1xuICAgICAgZGVjbGFyYXRpb25zOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGRlY2xhcmF0aW9uTWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICAgIGV4cG9ydHM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZXhwb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICAgIGltcG9ydHM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoaW1wb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2VsZWN0b3IgZnJvbSB0eXBlIG1ldGFkYXRhIGZvciBhIGNsYXNzIHdpdGggYSBwcmVjb21waWxlZCBuZ0NvbXBvbmVudERlZiBvclxuICAgKiBuZ0RpcmVjdGl2ZURlZi5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRTZWxlY3RvckZyb21Db21waWxlZENsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT5cbiAgICAgICAgICAgIGZpZWxkLmlzU3RhdGljICYmIChmaWVsZC5uYW1lID09PSAnbmdDb21wb25lbnREZWYnIHx8IGZpZWxkLm5hbWUgPT09ICduZ0RpcmVjdGl2ZURlZicpKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdO1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUodHlwZSkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbCh0eXBlLmxpdGVyYWwpKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHR5cGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGUubGl0ZXJhbC50ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2VsZWN0b3IgZnJvbSB0eXBlIG1ldGFkYXRhIGZvciBhIGNsYXNzIHdpdGggYSBwcmVjb21waWxlZCBuZ0NvbXBvbmVudERlZiBvclxuICAgKiBuZ0RpcmVjdGl2ZURlZi5cbiAgICovXG4gIHByaXZhdGUgX3JlYWROYW1lRnJvbUNvbXBpbGVkQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGRlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBmaWVsZCA9PiBmaWVsZC5pc1N0YXRpYyAmJiBmaWVsZC5uYW1lID09PSAnbmdQaXBlRGVmJyk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgYFR5cGVOb2RlYCB3aGljaCBpcyBhIHR1cGxlIG9mIHJlZmVyZW5jZXMgdG8gb3RoZXIgdHlwZXMsIGFuZCByZXR1cm4gYFJlZmVyZW5jZWBzIHRvXG4gICAqIHRoZW0uXG4gICAqXG4gICAqIFRoaXMgb3BlcmF0aW9uIGFzc3VtZXMgdGhhdCB0aGVzZSB0eXBlcyBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSBgbmdNb2R1bGVJbXBvcnRlZEZyb21gIHVubGVzc1xuICAgKiB0aGV5IHRoZW1zZWx2ZXMgd2VyZSBpbXBvcnRlZCBmcm9tIGFub3RoZXIgYWJzb2x1dGUgcGF0aC5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZGVmOiB0cy5UeXBlTm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsKTpcbiAgICAgIFJlZmVyZW5jZVtdIHtcbiAgICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZShkZWYpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBkZWYuZWxlbWVudFR5cGVzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGlmICghdHMuaXNUeXBlUXVlcnlOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZWApO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGVsZW1lbnQuZXhwck5hbWU7XG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gIT09IG51bGwpIHtcbiAgICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAoZnJvbSAhPT0gbnVsbCAmJiAhZnJvbS5zdGFydHNXaXRoKCcuJykgPyBmcm9tIDogbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgICBjb25zdCBpZCA9IHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVJlZmVyZW5jZShub2RlLCBpZCAhLCBtb2R1bGVOYW1lLCBpZCAhLnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qge25vZGV9ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IGlkID0gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkUmVmZXJlbmNlKG5vZGUsIGlkICEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZsYXR0ZW48VD4oYXJyYXk6IFRbXVtdKTogVFtdIHtcbiAgcmV0dXJuIGFycmF5LnJlZHVjZSgoYWNjdW0sIHN1YkFycmF5KSA9PiB7XG4gICAgYWNjdW0ucHVzaCguLi5zdWJBcnJheSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9LCBbXSBhcyBUW10pO1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmOiBSZWZlcmVuY2UpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICghKHJlZiBpbnN0YW5jZW9mIEFic29sdXRlUmVmZXJlbmNlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiByZWYubW9kdWxlTmFtZTtcbn1cblxuZnVuY3Rpb24gY29udmVydFJlZmVyZW5jZU1hcChcbiAgICBtYXA6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPiB7XG4gIHJldHVybiBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oQXJyYXkuZnJvbShtYXAuZW50cmllcygpKS5tYXAoKFtzZWxlY3RvciwgcmVmXSk6IFtcbiAgICBzdHJpbmcsIEV4cHJlc3Npb25cbiAgXSA9PiBbc2VsZWN0b3IsIHRvUjNSZWZlcmVuY2UocmVmLCBjb250ZXh0KS52YWx1ZV0pKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhcbiAgICBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPiB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBjb252ZXJ0UmVmZXJlbmNlTWFwKHNjb3BlLmRpcmVjdGl2ZXMsIGNvbnRleHQpO1xuICBjb25zdCBwaXBlcyA9IGNvbnZlcnRSZWZlcmVuY2VNYXAoc2NvcGUucGlwZXMsIGNvbnRleHQpO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcbn1cbiJdfQ==