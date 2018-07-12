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
                if (ngModuleImportedFrom === null) {
                    // TODO(alxhub): handle hand-compiled ngModuleDef in the current Program.
                    throw new Error("Need to read .d.ts module but ngModuleImportedFrom is unspecified");
                }
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
                if (!ts.isTypeReferenceNode(element)) {
                    throw new Error("Expected TypeReferenceNode");
                }
                var type = element.typeName;
                var _a = metadata_1.reflectTypeEntityToDeclaration(type, _this.checker), node = _a.node, from = _a.from;
                var moduleName = (from !== null && !from.startsWith('.') ? from : ngModuleImportedFrom);
                var clazz = node;
                var id = reflector_1.reflectIdentifierOfDeclaration(clazz);
                return new metadata_1.AbsoluteReference(node, id, moduleName, id.text);
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
            return [selector, util_1.referenceToExpression(ref, context)];
        }));
    }
    function convertScopeToExpressions(scope, context) {
        var directives = convertReferenceMap(scope.directives, context);
        var pipes = convertReferenceMap(scope.pipes, context);
        return { directives: directives, pipes: pipes };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMscUVBQTRGO0lBQzVGLG9GQUFzRztJQUV0Ryw2RUFBNkM7SUF1QzdDOzs7OztPQUtHO0lBQ0g7UUEwQkUsK0JBQW9CLE9BQXVCLEVBQVUsU0FBeUI7WUFBMUQsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQXpCOUU7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztZQUVqRTs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUVLLENBQUM7UUFFbEY7O1dBRUc7UUFDSCw4Q0FBYyxHQUFkLFVBQWUsSUFBb0IsRUFBRSxJQUFnQjtZQUFyRCxpQkFZQztZQVhDLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBbUIsQ0FBQztZQUVsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUE4QixvQ0FBd0IsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQ2pGO1lBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENB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QUssRUFBRSxRQUFRO1lBQ2xDLEtBQUssQ0FBQyxJQUFJLE9BQVYsS0FBSyxtQkFBUyxRQUFRLEdBQUU7WUFDeEIsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLEVBQUUsRUFBUyxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUVELDRCQUE0QixHQUFjO1FBQ3hDLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSw0QkFBaUIsQ0FBQyxFQUFFO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVELDZCQUNJLEdBQTJCLEVBQUUsT0FBc0I7UUFDckQsT0FBTyxJQUFJLEdBQUcsQ0FBcUIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQyxFQUFlO2dCQUFmLDBCQUFlLEVBQWQsZ0JBQVEsRUFBRSxXQUFHO1lBRTNFLE9BQUEsQ0FBQyxRQUFRLEVBQUUsNEJBQXFCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQS9DLENBQStDLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxtQ0FDSSxLQUFrQyxFQUFFLE9BQXNCO1FBQzVELElBQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEUsSUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsS0FBSyxPQUFBLEVBQUMsQ0FBQztJQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2V9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge3JlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbiwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yJztcblxuaW1wb3J0IHtyZWZlcmVuY2VUb0V4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cblxuXG4vKipcbiAqIE1ldGFkYXRhIGV4dHJhY3RlZCBmb3IgYSBnaXZlbiBOZ01vZHVsZSB0aGF0IGNhbiBiZSB1c2VkIHRvIGNvbXB1dGUgc2VsZWN0b3Igc2NvcGVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZURhdGEge1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZVtdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2VbXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlW107XG59XG5cbi8qKlxuICogVHJhbnNpdGl2ZWx5IGV4cGFuZGVkIG1hcHMgb2YgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdmlzaWJsZSB0byBhIGNvbXBvbmVudCBiZWluZyBjb21waWxlZCBpbiB0aGVcbiAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsYXRpb25TY29wZTxUPiB7XG4gIGRpcmVjdGl2ZXM6IE1hcDxzdHJpbmcsIFQ+O1xuICBwaXBlczogTWFwPHN0cmluZywgVD47XG59XG5cbi8qKlxuICogQm90aCB0cmFuc2l0aXZlbHkgZXhwYW5kZWQgc2NvcGVzIGZvciBhIGdpdmVuIE5nTW9kdWxlLlxuICovXG5pbnRlcmZhY2UgU2VsZWN0b3JTY29wZXMge1xuICAvKipcbiAgICogU2V0IG9mIGNvbXBvbmVudHMsIGRpcmVjdGl2ZXMsIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGFsbCBjb21wb25lbnRzIGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICAgKiBjb250ZXh0IG9mIHNvbWUgbW9kdWxlLlxuICAgKi9cbiAgY29tcGlsYXRpb246IFJlZmVyZW5jZVtdO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIGFkZGVkIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhbnkgbW9kdWxlIGltcG9ydGluZ1xuICAgKiBzb21lIG1vZHVsZS5cbiAgICovXG4gIGV4cG9ydGVkOiBSZWZlcmVuY2VbXTtcbn1cblxuLyoqXG4gKiBSZWdpc3RyeSB3aGljaCByZWNvcmRzIGFuZCBjb3JyZWxhdGVzIHN0YXRpYyBhbmFseXNpcyBpbmZvcm1hdGlvbiBvZiBBbmd1bGFyIHR5cGVzLlxuICpcbiAqIE9uY2UgYSBjb21waWxhdGlvbiB1bml0J3MgaW5mb3JtYXRpb24gaXMgZmVkIGludG8gdGhlIFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgaXQgY2FuIGJlIGFza2VkIHRvXG4gKiBwcm9kdWNlIHRyYW5zaXRpdmUgYENvbXBpbGF0aW9uU2NvcGVgcyBmb3IgY29tcG9uZW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlbGVjdG9yU2NvcGVSZWdpc3RyeSB7XG4gIC8qKlxuICAgKiAgTWFwIG9mIG1vZHVsZXMgZGVjbGFyZWQgaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCB0byB0aGVpciAobG9jYWwpIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfbW9kdWxlVG9EYXRhID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgTW9kdWxlRGF0YT4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIG1vZHVsZXMgdG8gdGhlaXIgY2FjaGVkIGBDb21waWxhdGlvblNjb3BlYHMuXG4gICAqL1xuICBwcml2YXRlIF9jb21waWxhdGlvblNjb3BlQ2FjaGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBjb21wb25lbnRzL2RpcmVjdGl2ZXMgdG8gdGhlaXIgc2VsZWN0b3IuXG4gICAqL1xuICBwcml2YXRlIF9kaXJlY3RpdmVUb1NlbGVjdG9yID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgcGlwZXMgdG8gdGhlaXIgbmFtZS5cbiAgICovXG4gIHByaXZhdGUgX3BpcGVUb05hbWUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBjb21wb25lbnRzL2RpcmVjdGl2ZXMvcGlwZXMgdG8gdGhlaXIgbW9kdWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfZGVjbGFyYXJlZFR5cGVUb01vZHVsZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCkge31cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBtb2R1bGUncyBtZXRhZGF0YSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTW9kdWxlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkYXRhOiBNb2R1bGVEYXRhKTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZHVsZSBhbHJlYWR5IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cbiAgICB0aGlzLl9tb2R1bGVUb0RhdGEuc2V0KG5vZGUsIGRhdGEpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWxsIG9mIHRoZSBtb2R1bGUncyBkZWNsYXJhdGlvbnMgaW4gdGhlIGNvbnRleHQgbWFwIGFzIGJlbG9uZ2luZyB0byB0aGlzIG1vZHVsZS5cbiAgICBkYXRhLmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2wgPT4ge1xuICAgICAgdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5zZXQodHMuZ2V0T3JpZ2luYWxOb2RlKGRlY2wubm9kZSkgYXMgdHMuRGVjbGFyYXRpb24sIG5vZGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBzZWxlY3RvciBvZiBhIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclNlbGVjdG9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBzZWxlY3Rvcjogc3RyaW5nKTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICh0aGlzLl9kaXJlY3RpdmVUb1NlbGVjdG9yLmhhcyhub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTZWxlY3RvciBhbHJlYWR5IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfSAke3NlbGVjdG9yfWApO1xuICAgIH1cbiAgICB0aGlzLl9kaXJlY3RpdmVUb1NlbGVjdG9yLnNldChub2RlLCBzZWxlY3Rvcik7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIG5hbWUgb2YgYSBwaXBlIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJQaXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgdGhpcy5fcGlwZVRvTmFtZS5zZXQobm9kZSwgbmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogUHJvZHVjZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQsIHdoaWNoIGlzIGRldGVybWluZWQgYnkgdGhlIG1vZHVsZSB0aGF0IGRlY2xhcmVzXG4gICAqIGl0LlxuICAgKi9cbiAgbG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IENvbXBpbGF0aW9uU2NvcGU8RXhwcmVzc2lvbj58bnVsbCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIG5vIGFzc29jaWF0ZWQgbW9kdWxlLCB0aGVuIGl0IGhhcyBubyBjb21waWxhdGlvbiBzY29wZS5cbiAgICBpZiAoIXRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGUgPSB0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLmdldChub2RlKSAhO1xuXG4gICAgLy8gQ29tcGlsYXRpb24gc2NvcGUgY29tcHV0YXRpb24gaXMgc29tZXdoYXQgZXhwZW5zaXZlLCBzbyBpdCdzIGNhY2hlZC4gQ2hlY2sgdGhlIGNhY2hlIGZvclxuICAgIC8vIHRoZSBtb2R1bGUuXG4gICAgaWYgKHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5oYXMobW9kdWxlKSkge1xuICAgICAgLy8gVGhlIGNvbXBpbGF0aW9uIHNjb3BlIHdhcyBjYWNoZWQuXG4gICAgICBjb25zdCBzY29wZSA9IHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5nZXQobW9kdWxlKSAhO1xuXG4gICAgICAvLyBUaGUgc2NvcGUgYXMgY2FjaGVkIGlzIGluIHRlcm1zIG9mIFJlZmVyZW5jZXMsIG5vdCBFeHByZXNzaW9ucy4gQ29udmVydGluZyBiZXR3ZWVuIHRoZW1cbiAgICAgIC8vIHJlcXVpcmVzIGtub3dsZWRnZSBvZiB0aGUgY29udGV4dCBmaWxlIChpbiB0aGlzIGNhc2UsIHRoZSBjb21wb25lbnQgbm9kZSdzIHNvdXJjZSBmaWxlKS5cbiAgICAgIHJldHVybiBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKHNjb3BlLCBub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgdGltZSB0aGUgc2NvcGUgZm9yIHRoaXMgbW9kdWxlIGlzIGJlaW5nIGNvbXB1dGVkLlxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPigpO1xuICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4oKTtcblxuICAgIC8vIFByb2Nlc3MgdGhlIGRlY2xhcmF0aW9uIHNjb3BlIG9mIHRoZSBtb2R1bGUsIGFuZCBsb29rdXAgdGhlIHNlbGVjdG9yIG9mIGV2ZXJ5IGRlY2xhcmVkIHR5cGUuXG4gICAgLy8gVGhlIGluaXRpYWwgdmFsdWUgb2YgbmdNb2R1bGVJbXBvcnRlZEZyb20gaXMgJ251bGwnIHdoaWNoIHNpZ25pZmllcyB0aGF0IHRoZSBOZ01vZHVsZVxuICAgIC8vIHdhcyBub3QgaW1wb3J0ZWQgZnJvbSBhIC5kLnRzIHNvdXJjZS5cbiAgICB0aGlzLmxvb2t1cFNjb3Blcyhtb2R1bGUgISwgLyogbmdNb2R1bGVJbXBvcnRlZEZyb20gKi8gbnVsbCkuY29tcGlsYXRpb24uZm9yRWFjaChyZWYgPT4ge1xuICAgICAgY29uc3Qgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShyZWYubm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICAgIC8vIEVpdGhlciB0aGUgbm9kZSByZXByZXNlbnRzIGEgZGlyZWN0aXZlIG9yIGEgcGlwZS4gTG9vayBmb3IgYm90aC5cbiAgICAgIGNvbnN0IHNlbGVjdG9yID0gdGhpcy5sb29rdXBEaXJlY3RpdmVTZWxlY3Rvcihub2RlKTtcbiAgICAgIC8vIE9ubHkgZGlyZWN0aXZlcy9jb21wb25lbnRzIHdpdGggc2VsZWN0b3JzIGdldCBhZGRlZCB0byB0aGUgc2NvcGUuXG4gICAgICBpZiAoc2VsZWN0b3IgIT0gbnVsbCkge1xuICAgICAgICBkaXJlY3RpdmVzLnNldChzZWxlY3RvciwgcmVmKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBuYW1lID0gdGhpcy5sb29rdXBQaXBlTmFtZShub2RlKTtcbiAgICAgIGlmIChuYW1lICE9IG51bGwpIHtcbiAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+ID0ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcblxuICAgIC8vIE1hbnkgY29tcG9uZW50cyBtYXkgYmUgY29tcGlsZWQgaW4gdGhlIHNhbWUgc2NvcGUsIHNvIGNhY2hlIGl0LlxuICAgIHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5zZXQobm9kZSwgc2NvcGUpO1xuXG4gICAgLy8gQ29udmVydCBSZWZlcmVuY2VzIHRvIEV4cHJlc3Npb25zIGluIHRoZSBjb250ZXh0IG9mIHRoZSBjb21wb25lbnQncyBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhzY29wZSwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCBgU2VsZWN0b3JTY29wZXNgIGZvciBhIGdpdmVuIG1vZHVsZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgaWYgdGhlIGdpdmVuIG1vZHVsZSB3YXMgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBwYXRoXG4gICAqIChgbmdNb2R1bGVJbXBvcnRlZEZyb21gKSB0aGVuIGFsbCBvZiBpdHMgZGVjbGFyYXRpb25zIGFyZSBleHBvcnRlZCBhdCB0aGF0IHNhbWUgcGF0aCwgYXMgd2VsbFxuICAgKiBhcyBpbXBvcnRzIGFuZCBleHBvcnRzIGZyb20gb3RoZXIgbW9kdWxlcyB0aGF0IGFyZSByZWxhdGl2ZWx5IGltcG9ydGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBTY29wZXMobm9kZTogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCk6IFNlbGVjdG9yU2NvcGVzIHtcbiAgICBsZXQgZGF0YTogTW9kdWxlRGF0YXxudWxsID0gbnVsbDtcblxuICAgIC8vIEVpdGhlciB0aGlzIG1vZHVsZSB3YXMgYW5hbHl6ZWQgZGlyZWN0bHksIG9yIGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmLlxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIHdhcyBhbmFseXplZCBiZWZvcmUsIGFuZCB0aHVzIGl0cyBkYXRhIGlzIGF2YWlsYWJsZS5cbiAgICAgIGRhdGEgPSB0aGlzLl9tb2R1bGVUb0RhdGEuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2Fzbid0IGFuYWx5emVkIGJlZm9yZSwgYW5kIHByb2JhYmx5IGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmIHdpdGggYSB0eXBlXG4gICAgICAvLyBhbm5vdGF0aW9uIHRoYXQgc3BlY2lmaWVzIHRoZSBuZWVkZWQgbWV0YWRhdGEuXG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gPT09IG51bGwpIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBoYW5kbGUgaGFuZC1jb21waWxlZCBuZ01vZHVsZURlZiBpbiB0aGUgY3VycmVudCBQcm9ncmFtLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5lZWQgdG8gcmVhZCAuZC50cyBtb2R1bGUgYnV0IG5nTW9kdWxlSW1wb3J0ZWRGcm9tIGlzIHVuc3BlY2lmaWVkYCk7XG4gICAgICB9XG4gICAgICBkYXRhID0gdGhpcy5fcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgLy8gTm90ZSB0aGF0IGRhdGEgaGVyZSBjb3VsZCBzdGlsbCBiZSBudWxsLCBpZiB0aGUgY2xhc3MgZGlkbid0IGhhdmUgYSBwcmVjb21waWxlZFxuICAgICAgLy8gbmdNb2R1bGVEZWYuXG4gICAgfVxuXG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIG5vdCByZWdpc3RlcmVkOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGlsYXRpb246IFtcbiAgICAgICAgLi4uZGF0YS5kZWNsYXJhdGlvbnMsXG4gICAgICAgIC8vIEV4cGFuZCBpbXBvcnRzIHRvIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aG9zZSBpbXBvcnRzLlxuICAgICAgICAuLi5mbGF0dGVuKGRhdGEuaW1wb3J0cy5tYXAoXG4gICAgICAgICAgICByZWYgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmxvb2t1cFNjb3BlcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZikpLmV4cG9ydGVkKSksXG4gICAgICAgIC8vIEFuZCBpbmNsdWRlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBleHBvcnRlZCBtb2R1bGVzLlxuICAgICAgICAuLi5mbGF0dGVuKFxuICAgICAgICAgICAgZGF0YS5leHBvcnRzLmZpbHRlcihyZWYgPT4gdGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbikpXG4gICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgcmVmID0+IHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhwb3J0ZWQpKVxuICAgICAgXSxcbiAgICAgIGV4cG9ydGVkOiBmbGF0dGVuKGRhdGEuZXhwb3J0cy5tYXAocmVmID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSkuZXhwb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtyZWZdO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIHNlbGVjdG9yIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICpcbiAgICogUG90ZW50aWFsbHkgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUgb3Igb3RoZXJ3aXNlIGhhcyBhIG1hbnVhbGx5IGNyZWF0ZWRcbiAgICogbmdDb21wb25lbnREZWYvbmdEaXJlY3RpdmVEZWYuIEluIHRoaXMgY2FzZSwgdGhlIHR5cGUgbWV0YWRhdGEgb2YgdGhhdCBkZWZpbml0aW9uIGlzIHJlYWRcbiAgICogdG8gZGV0ZXJtaW5lIHRoZSBzZWxlY3Rvci5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwRGlyZWN0aXZlU2VsZWN0b3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3IuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWRTZWxlY3RvckZyb21Db21waWxlZENsYXNzKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9va3VwUGlwZU5hbWUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuX3BpcGVUb05hbWUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGlwZVRvTmFtZS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWROYW1lRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWQgdGhlIG1ldGFkYXRhIGZyb20gYSBjbGFzcyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29tcGlsZWQgc29tZWhvdyAoZWl0aGVyIGl0J3MgaW4gYSAuZC50c1xuICAgKiBmaWxlLCBvciBpbiBhIC50cyBmaWxlIHdpdGggYSBoYW5kd3JpdHRlbiBkZWZpbml0aW9uKS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IHRoZSBjbGFzcyBvZiBpbnRlcmVzdFxuICAgKiBAcGFyYW0gbmdNb2R1bGVJbXBvcnRlZEZyb20gbW9kdWxlIHNwZWNpZmllciBvZiB0aGUgaW1wb3J0IHBhdGggdG8gYXNzdW1lIGZvciBhbGwgZGVjbGFyYXRpb25zXG4gICAqIHN0ZW1taW5nIGZyb20gdGhpcyBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkTWV0YWRhdGFGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmcpOlxuICAgICAgTW9kdWxlRGF0YXxudWxsIHtcbiAgICAvLyBUaGlzIG9wZXJhdGlvbiBpcyBleHBsaWNpdGx5IG5vdCBtZW1vaXplZCwgYXMgaXQgZGVwZW5kcyBvbiBgbmdNb2R1bGVJbXBvcnRlZEZyb21gLlxuICAgIC8vIFRPRE8oYWx4aHViKTogaW52ZXN0aWdhdGUgY2FjaGluZyBvZiAuZC50cyBtb2R1bGUgbWV0YWRhdGEuXG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgbWVtYmVyID0+IG1lbWJlci5uYW1lID09PSAnbmdNb2R1bGVEZWYnICYmIG1lbWJlci5pc1N0YXRpYyk7XG4gICAgaWYgKG5nTW9kdWxlRGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgdGhlIHNoYXBlIG9mIHRoZSBuZ01vZHVsZURlZiB0eXBlIGlzIGNvcnJlY3QuXG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobmdNb2R1bGVEZWYudHlwZSkgfHxcbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gNCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmVhZCB0aGUgTW9kdWxlRGF0YSBvdXQgb2YgdGhlIHR5cGUgYXJndW1lbnRzLlxuICAgIGNvbnN0IFtfLCBkZWNsYXJhdGlvbk1ldGFkYXRhLCBpbXBvcnRNZXRhZGF0YSwgZXhwb3J0TWV0YWRhdGFdID0gbmdNb2R1bGVEZWYudHlwZS50eXBlQXJndW1lbnRzO1xuICAgIHJldHVybiB7XG4gICAgICBkZWNsYXJhdGlvbnM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZGVjbGFyYXRpb25NZXRhZGF0YSwgbmdNb2R1bGVJbXBvcnRlZEZyb20pLFxuICAgICAgZXhwb3J0czogdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShleHBvcnRNZXRhZGF0YSwgbmdNb2R1bGVJbXBvcnRlZEZyb20pLFxuICAgICAgaW1wb3J0czogdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShpbXBvcnRNZXRhZGF0YSwgbmdNb2R1bGVJbXBvcnRlZEZyb20pLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZFNlbGVjdG9yRnJvbUNvbXBpbGVkQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGRlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBmaWVsZCA9PlxuICAgICAgICAgICAgZmllbGQuaXNTdGF0aWMgJiYgKGZpZWxkLm5hbWUgPT09ICduZ0NvbXBvbmVudERlZicgfHwgZmllbGQubmFtZSA9PT0gJ25nRGlyZWN0aXZlRGVmJykpO1xuICAgIGlmIChkZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlZi50eXBlKSB8fFxuICAgICAgICBkZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV07XG4gICAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3JvbmcgdHlwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBzZWxlY3RvciBmcm9tIHR5cGUgbWV0YWRhdGEgZm9yIGEgY2xhc3Mgd2l0aCBhIHByZWNvbXBpbGVkIG5nQ29tcG9uZW50RGVmIG9yXG4gICAqIG5nRGlyZWN0aXZlRGVmLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+IGZpZWxkLmlzU3RhdGljICYmIGZpZWxkLm5hbWUgPT09ICduZ1BpcGVEZWYnKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdO1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUodHlwZSkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbCh0eXBlLmxpdGVyYWwpKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHR5cGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGUubGl0ZXJhbC50ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSBgVHlwZU5vZGVgIHdoaWNoIGlzIGEgdHVwbGUgb2YgcmVmZXJlbmNlcyB0byBvdGhlciB0eXBlcywgYW5kIHJldHVybiBgUmVmZXJlbmNlYHMgdG9cbiAgICogdGhlbS5cbiAgICpcbiAgICogVGhpcyBvcGVyYXRpb24gYXNzdW1lcyB0aGF0IHRoZXNlIHR5cGVzIHNob3VsZCBiZSBpbXBvcnRlZCBmcm9tIGBuZ01vZHVsZUltcG9ydGVkRnJvbWAgdW5sZXNzXG4gICAqIHRoZXkgdGhlbXNlbHZlcyB3ZXJlIGltcG9ydGVkIGZyb20gYW5vdGhlciBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nKTogUmVmZXJlbmNlW10ge1xuICAgIGlmICghdHMuaXNUdXBsZVR5cGVOb2RlKGRlZikpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZi5lbGVtZW50VHlwZXMubWFwKGVsZW1lbnQgPT4ge1xuICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGVgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHR5cGUgPSBlbGVtZW50LnR5cGVOYW1lO1xuICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gKGZyb20gIT09IG51bGwgJiYgIWZyb20uc3RhcnRzV2l0aCgnLicpID8gZnJvbSA6IG5nTW9kdWxlSW1wb3J0ZWRGcm9tKTtcbiAgICAgIGNvbnN0IGNsYXp6ID0gbm9kZSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICAgIGNvbnN0IGlkID0gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVSZWZlcmVuY2Uobm9kZSwgaWQgISwgbW9kdWxlTmFtZSwgaWQgIS50ZXh0KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuPFQ+KGFycmF5OiBUW11bXSk6IFRbXSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKGFjY3VtLCBzdWJBcnJheSkgPT4ge1xuICAgIGFjY3VtLnB1c2goLi4uc3ViQXJyYXkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfSwgW10gYXMgVFtdKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVNb2R1bGVOYW1lKHJlZjogUmVmZXJlbmNlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gcmVmLm1vZHVsZU5hbWU7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRSZWZlcmVuY2VNYXAoXG4gICAgbWFwOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRXhwcmVzc2lvbj4ge1xuICByZXR1cm4gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KEFycmF5LmZyb20obWFwLmVudHJpZXMoKSkubWFwKChbc2VsZWN0b3IsIHJlZl0pOiBbXG4gICAgc3RyaW5nLCBFeHByZXNzaW9uXG4gIF0gPT4gW3NlbGVjdG9yLCByZWZlcmVuY2VUb0V4cHJlc3Npb24ocmVmLCBjb250ZXh0KV0pKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhcbiAgICBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPiB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBjb252ZXJ0UmVmZXJlbmNlTWFwKHNjb3BlLmRpcmVjdGl2ZXMsIGNvbnRleHQpO1xuICBjb25zdCBwaXBlcyA9IGNvbnZlcnRSZWZlcmVuY2VNYXAoc2NvcGUucGlwZXMsIGNvbnRleHQpO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcbn1cbiJdfQ==