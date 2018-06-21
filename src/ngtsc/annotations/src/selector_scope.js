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
        SelectorScopeRegistry.prototype.registerPipe = function (node, name) { this._pipeToName.set(node, name); };
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
                var selector = _this.lookupDirectiveSelector(ts.getOriginalNode(ref.node));
                // Only directives/components with selectors get added to the scope.
                if (selector != null) {
                    directives.set(selector, ref);
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
            return this._pipeToName.get(node);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMscUVBQTRGO0lBQzVGLG9GQUFzRztJQUV0Ryw2RUFBNkM7SUF1QzdDOzs7OztPQUtHO0lBQ0g7UUEwQkUsK0JBQW9CLE9BQXVCLEVBQVUsU0FBeUI7WUFBMUQsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQXpCOUU7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBRTlEOztlQUVHO1lBQ0ssMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFFeEY7O2VBRUc7WUFDSyx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztZQUVqRTs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFeEQ7O2VBRUc7WUFDSyw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztRQUVLLENBQUM7UUFFbEY7O1dBRUc7UUFDSCw4Q0FBYyxHQUFkLFVBQWUsSUFBb0IsRUFBRSxJQUFnQjtZQUFyRCxpQkFZQztZQVhDLElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBbUIsQ0FBQztZQUVsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUE4QixvQ0FBd0IsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQ2pGO1lBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENB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Q3hCLENBQUM7SUFFRCw2QkFDSSxHQUEyQixFQUFFLE9BQXNCO1FBQ3JELE9BQU8sSUFBSSxHQUFHLENBQXFCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUMsRUFBZTtnQkFBZiwwQkFBZSxFQUFkLGdCQUFRLEVBQUUsV0FBRztZQUUzRSxPQUFBLENBQUMsUUFBUSxFQUFFLDRCQUFxQixDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUEvQyxDQUErQyxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsbUNBQ0ksS0FBa0MsRUFBRSxPQUFzQjtRQUM1RCxJQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLElBQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsT0FBTyxFQUFDLFVBQVUsWUFBQSxFQUFFLEtBQUssT0FBQSxFQUFDLENBQUM7SUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEV4dGVybmFsUmVmZXJlbmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtyZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24sIHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5cbmltcG9ydCB7cmVmZXJlbmNlVG9FeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5cblxuLyoqXG4gKiBNZXRhZGF0YSBleHRyYWN0ZWQgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUgdGhhdCBjYW4gYmUgdXNlZCB0byBjb21wdXRlIHNlbGVjdG9yIHNjb3Blcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2VbXTtcbiAgaW1wb3J0czogUmVmZXJlbmNlW107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZVtdO1xufVxuXG4vKipcbiAqIFRyYW5zaXRpdmVseSBleHBhbmRlZCBtYXBzIG9mIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHZpc2libGUgdG8gYSBjb21wb25lbnQgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gKiBjb250ZXh0IG9mIHNvbWUgbW9kdWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGF0aW9uU2NvcGU8VD4ge1xuICBkaXJlY3RpdmVzOiBNYXA8c3RyaW5nLCBUPjtcbiAgcGlwZXM6IE1hcDxzdHJpbmcsIFQ+O1xufVxuXG4vKipcbiAqIEJvdGggdHJhbnNpdGl2ZWx5IGV4cGFuZGVkIHNjb3BlcyBmb3IgYSBnaXZlbiBOZ01vZHVsZS5cbiAqL1xuaW50ZXJmYWNlIFNlbGVjdG9yU2NvcGVzIHtcbiAgLyoqXG4gICAqIFNldCBvZiBjb21wb25lbnRzLCBkaXJlY3RpdmVzLCBhbmQgcGlwZXMgdmlzaWJsZSB0byBhbGwgY29tcG9uZW50cyBiZWluZyBjb21waWxlZCBpbiB0aGVcbiAgICogY29udGV4dCBvZiBzb21lIG1vZHVsZS5cbiAgICovXG4gIGNvbXBpbGF0aW9uOiBSZWZlcmVuY2VbXTtcblxuICAvKipcbiAgICogU2V0IG9mIGNvbXBvbmVudHMsIGRpcmVjdGl2ZXMsIGFuZCBwaXBlcyBhZGRlZCB0byB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYW55IG1vZHVsZSBpbXBvcnRpbmdcbiAgICogc29tZSBtb2R1bGUuXG4gICAqL1xuICBleHBvcnRlZDogUmVmZXJlbmNlW107XG59XG5cbi8qKlxuICogUmVnaXN0cnkgd2hpY2ggcmVjb3JkcyBhbmQgY29ycmVsYXRlcyBzdGF0aWMgYW5hbHlzaXMgaW5mb3JtYXRpb24gb2YgQW5ndWxhciB0eXBlcy5cbiAqXG4gKiBPbmNlIGEgY29tcGlsYXRpb24gdW5pdCdzIGluZm9ybWF0aW9uIGlzIGZlZCBpbnRvIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnksIGl0IGNhbiBiZSBhc2tlZCB0b1xuICogcHJvZHVjZSB0cmFuc2l0aXZlIGBDb21waWxhdGlvblNjb3BlYHMgZm9yIGNvbXBvbmVudHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTZWxlY3RvclNjb3BlUmVnaXN0cnkge1xuICAvKipcbiAgICogIE1hcCBvZiBtb2R1bGVzIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlaXIgKGxvY2FsKSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgX21vZHVsZVRvRGF0YSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIE1vZHVsZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBtb2R1bGVzIHRvIHRoZWlyIGNhY2hlZCBgQ29tcGlsYXRpb25TY29wZWBzLlxuICAgKi9cbiAgcHJpdmF0ZSBfY29tcGlsYXRpb25TY29wZUNhY2hlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+PigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzIHRvIHRoZWlyIHNlbGVjdG9yLlxuICAgKi9cbiAgcHJpdmF0ZSBfZGlyZWN0aXZlVG9TZWxlY3RvciA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIHBpcGVzIHRvIHRoZWlyIG5hbWUuXG4gICAqL1xuICBwcml2YXRlIF9waXBlVG9OYW1lID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgY29tcG9uZW50cy9kaXJlY3RpdmVzL3BpcGVzIHRvIHRoZWlyIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgbW9kdWxlJ3MgbWV0YWRhdGEgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3Rlck1vZHVsZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGF0YTogTW9kdWxlRGF0YSk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgYWxyZWFkeSByZWdpc3RlcmVkOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX1gKTtcbiAgICB9XG4gICAgdGhpcy5fbW9kdWxlVG9EYXRhLnNldChub2RlLCBkYXRhKTtcblxuICAgIC8vIFJlZ2lzdGVyIGFsbCBvZiB0aGUgbW9kdWxlJ3MgZGVjbGFyYXRpb25zIGluIHRoZSBjb250ZXh0IG1hcCBhcyBiZWxvbmdpbmcgdG8gdGhpcyBtb2R1bGUuXG4gICAgZGF0YS5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsID0+IHtcbiAgICAgIHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuc2V0KHRzLmdldE9yaWdpbmFsTm9kZShkZWNsLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uLCBub2RlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgc2VsZWN0b3Igb2YgYSBjb21wb25lbnQgb3IgZGlyZWN0aXZlIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJTZWxlY3Rvcihub2RlOiB0cy5EZWNsYXJhdGlvbiwgc2VsZWN0b3I6IHN0cmluZyk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5oYXMobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2VsZWN0b3IgYWxyZWFkeSByZWdpc3RlcmVkOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX0gJHtzZWxlY3Rvcn1gKTtcbiAgICB9XG4gICAgdGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5zZXQobm9kZSwgc2VsZWN0b3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBuYW1lIG9mIGEgcGlwZSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyUGlwZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmFtZTogc3RyaW5nKTogdm9pZCB7IHRoaXMuX3BpcGVUb05hbWUuc2V0KG5vZGUsIG5hbWUpOyB9XG5cbiAgLyoqXG4gICAqIFByb2R1Y2UgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgY29tcG9uZW50LCB3aGljaCBpcyBkZXRlcm1pbmVkIGJ5IHRoZSBtb2R1bGUgdGhhdCBkZWNsYXJlc1xuICAgKiBpdC5cbiAgICovXG4gIGxvb2t1cENvbXBpbGF0aW9uU2NvcGUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPEV4cHJlc3Npb24+fG51bGwge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBubyBhc3NvY2lhdGVkIG1vZHVsZSwgdGhlbiBpdCBoYXMgbm8gY29tcGlsYXRpb24gc2NvcGUuXG4gICAgaWYgKCF0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlID0gdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5nZXQobm9kZSkgITtcblxuICAgIC8vIENvbXBpbGF0aW9uIHNjb3BlIGNvbXB1dGF0aW9uIGlzIHNvbWV3aGF0IGV4cGVuc2l2ZSwgc28gaXQncyBjYWNoZWQuIENoZWNrIHRoZSBjYWNoZSBmb3JcbiAgICAvLyB0aGUgbW9kdWxlLlxuICAgIGlmICh0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuaGFzKG1vZHVsZSkpIHtcbiAgICAgIC8vIFRoZSBjb21waWxhdGlvbiBzY29wZSB3YXMgY2FjaGVkLlxuICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuZ2V0KG1vZHVsZSkgITtcblxuICAgICAgLy8gVGhlIHNjb3BlIGFzIGNhY2hlZCBpcyBpbiB0ZXJtcyBvZiBSZWZlcmVuY2VzLCBub3QgRXhwcmVzc2lvbnMuIENvbnZlcnRpbmcgYmV0d2VlbiB0aGVtXG4gICAgICAvLyByZXF1aXJlcyBrbm93bGVkZ2Ugb2YgdGhlIGNvbnRleHQgZmlsZSAoaW4gdGhpcyBjYXNlLCB0aGUgY29tcG9uZW50IG5vZGUncyBzb3VyY2UgZmlsZSkuXG4gICAgICByZXR1cm4gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhzY29wZSwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgdGhlIHNjb3BlIGZvciB0aGlzIG1vZHVsZSBpcyBiZWluZyBjb21wdXRlZC5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4oKTtcbiAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+KCk7XG5cbiAgICAvLyBQcm9jZXNzIHRoZSBkZWNsYXJhdGlvbiBzY29wZSBvZiB0aGUgbW9kdWxlLCBhbmQgbG9va3VwIHRoZSBzZWxlY3RvciBvZiBldmVyeSBkZWNsYXJlZCB0eXBlLlxuICAgIC8vIFRoZSBpbml0aWFsIHZhbHVlIG9mIG5nTW9kdWxlSW1wb3J0ZWRGcm9tIGlzICdudWxsJyB3aGljaCBzaWduaWZpZXMgdGhhdCB0aGUgTmdNb2R1bGVcbiAgICAvLyB3YXMgbm90IGltcG9ydGVkIGZyb20gYSAuZC50cyBzb3VyY2UuXG4gICAgdGhpcy5sb29rdXBTY29wZXMobW9kdWxlICEsIC8qIG5nTW9kdWxlSW1wb3J0ZWRGcm9tICovIG51bGwpLmNvbXBpbGF0aW9uLmZvckVhY2gocmVmID0+IHtcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0gdGhpcy5sb29rdXBEaXJlY3RpdmVTZWxlY3Rvcih0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uKTtcbiAgICAgIC8vIE9ubHkgZGlyZWN0aXZlcy9jb21wb25lbnRzIHdpdGggc2VsZWN0b3JzIGdldCBhZGRlZCB0byB0aGUgc2NvcGUuXG4gICAgICBpZiAoc2VsZWN0b3IgIT0gbnVsbCkge1xuICAgICAgICBkaXJlY3RpdmVzLnNldChzZWxlY3RvciwgcmVmKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHNjb3BlOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4gPSB7ZGlyZWN0aXZlcywgcGlwZXN9O1xuXG4gICAgLy8gTWFueSBjb21wb25lbnRzIG1heSBiZSBjb21waWxlZCBpbiB0aGUgc2FtZSBzY29wZSwgc28gY2FjaGUgaXQuXG4gICAgdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLnNldChub2RlLCBzY29wZSk7XG5cbiAgICAvLyBDb252ZXJ0IFJlZmVyZW5jZXMgdG8gRXhwcmVzc2lvbnMgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGNvbXBvbmVudCdzIHNvdXJjZSBmaWxlLlxuICAgIHJldHVybiBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKHNjb3BlLCBub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIGBTZWxlY3RvclNjb3Blc2AgZm9yIGEgZ2l2ZW4gbW9kdWxlLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGFzc3VtZXMgdGhhdCBpZiB0aGUgZ2l2ZW4gbW9kdWxlIHdhcyBpbXBvcnRlZCBmcm9tIGFuIGFic29sdXRlIHBhdGhcbiAgICogKGBuZ01vZHVsZUltcG9ydGVkRnJvbWApIHRoZW4gYWxsIG9mIGl0cyBkZWNsYXJhdGlvbnMgYXJlIGV4cG9ydGVkIGF0IHRoYXQgc2FtZSBwYXRoLCBhcyB3ZWxsXG4gICAqIGFzIGltcG9ydHMgYW5kIGV4cG9ydHMgZnJvbSBvdGhlciBtb2R1bGVzIHRoYXQgYXJlIHJlbGF0aXZlbHkgaW1wb3J0ZWQuXG4gICAqL1xuICBwcml2YXRlIGxvb2t1cFNjb3Blcyhub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsKTogU2VsZWN0b3JTY29wZXMge1xuICAgIGxldCBkYXRhOiBNb2R1bGVEYXRhfG51bGwgPSBudWxsO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgbW9kdWxlIHdhcyBhbmFseXplZCBkaXJlY3RseSwgb3IgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2FzIGFuYWx5emVkIGJlZm9yZSwgYW5kIHRodXMgaXRzIGRhdGEgaXMgYXZhaWxhYmxlLlxuICAgICAgZGF0YSA9IHRoaXMuX21vZHVsZVRvRGF0YS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIG1vZHVsZSB3YXNuJ3QgYW5hbHl6ZWQgYmVmb3JlLCBhbmQgcHJvYmFibHkgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYgd2l0aCBhIHR5cGVcbiAgICAgIC8vIGFubm90YXRpb24gdGhhdCBzcGVjaWZpZXMgdGhlIG5lZWRlZCBtZXRhZGF0YS5cbiAgICAgIGlmIChuZ01vZHVsZUltcG9ydGVkRnJvbSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IGhhbmRsZSBoYW5kLWNvbXBpbGVkIG5nTW9kdWxlRGVmIGluIHRoZSBjdXJyZW50IFByb2dyYW0uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTmVlZCB0byByZWFkIC5kLnRzIG1vZHVsZSBidXQgbmdNb2R1bGVJbXBvcnRlZEZyb20gaXMgdW5zcGVjaWZpZWRgKTtcbiAgICAgIH1cbiAgICAgIGRhdGEgPSB0aGlzLl9yZWFkTWV0YWRhdGFGcm9tQ29tcGlsZWRDbGFzcyhub2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbSk7XG4gICAgICAvLyBOb3RlIHRoYXQgZGF0YSBoZXJlIGNvdWxkIHN0aWxsIGJlIG51bGwsIGlmIHRoZSBjbGFzcyBkaWRuJ3QgaGF2ZSBhIHByZWNvbXBpbGVkXG4gICAgICAvLyBuZ01vZHVsZURlZi5cbiAgICB9XG5cbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgbm90IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjb21waWxhdGlvbjogW1xuICAgICAgICAuLi5kYXRhLmRlY2xhcmF0aW9ucyxcbiAgICAgICAgLy8gRXhwYW5kIGltcG9ydHMgdG8gdGhlIGV4cG9ydGVkIHNjb3BlIG9mIHRob3NlIGltcG9ydHMuXG4gICAgICAgIC4uLmZsYXR0ZW4oZGF0YS5pbXBvcnRzLm1hcChcbiAgICAgICAgICAgIHJlZiA9PlxuICAgICAgICAgICAgICAgIHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSkuZXhwb3J0ZWQpKSxcbiAgICAgICAgLy8gQW5kIGluY2x1ZGUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGV4cG9ydGVkIG1vZHVsZXMuXG4gICAgICAgIC4uLmZsYXR0ZW4oXG4gICAgICAgICAgICBkYXRhLmV4cG9ydHMuZmlsdGVyKHJlZiA9PiB0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uKSlcbiAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICByZWYgPT4gdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5leHBvcnRlZCkpXG4gICAgICBdLFxuICAgICAgZXhwb3J0ZWQ6IGZsYXR0ZW4oZGF0YS5leHBvcnRzLm1hcChyZWYgPT4ge1xuICAgICAgICBpZiAodGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5sb29rdXBTY29wZXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24sIGFic29sdXRlTW9kdWxlTmFtZShyZWYpKS5leHBvcnRlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gW3JlZl07XG4gICAgICAgIH1cbiAgICAgIH0pKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgc2VsZWN0b3Igb2YgYSBjb21wb25lbnQgb3IgZGlyZWN0aXZlIGNsYXNzLlxuICAgKlxuICAgKiBQb3RlbnRpYWxseSB0aGlzIGNsYXNzIGlzIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZSBvciBvdGhlcndpc2UgaGFzIGEgbWFudWFsbHkgY3JlYXRlZFxuICAgKiBuZ0NvbXBvbmVudERlZi9uZ0RpcmVjdGl2ZURlZi4gSW4gdGhpcyBjYXNlLCB0aGUgdHlwZSBtZXRhZGF0YSBvZiB0aGF0IGRlZmluaXRpb24gaXMgcmVhZFxuICAgKiB0byBkZXRlcm1pbmUgdGhlIHNlbGVjdG9yLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBEaXJlY3RpdmVTZWxlY3Rvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kaXJlY3RpdmVUb1NlbGVjdG9yLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZFNlbGVjdG9yRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBQaXBlTmFtZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9waXBlVG9OYW1lLmdldChub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHRoZSBtZXRhZGF0YSBmcm9tIGEgY2xhc3MgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbXBpbGVkIHNvbWVob3cgKGVpdGhlciBpdCdzIGluIGEgLmQudHNcbiAgICogZmlsZSwgb3IgaW4gYSAudHMgZmlsZSB3aXRoIGEgaGFuZHdyaXR0ZW4gZGVmaW5pdGlvbikuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiB0aGUgY2xhc3Mgb2YgaW50ZXJlc3RcbiAgICogQHBhcmFtIG5nTW9kdWxlSW1wb3J0ZWRGcm9tIG1vZHVsZSBzcGVjaWZpZXIgb2YgdGhlIGltcG9ydCBwYXRoIHRvIGFzc3VtZSBmb3IgYWxsIGRlY2xhcmF0aW9uc1xuICAgKiBzdGVtbWluZyBmcm9tIHRoaXMgbW9kdWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nKTpcbiAgICAgIE1vZHVsZURhdGF8bnVsbCB7XG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgZXhwbGljaXRseSBub3QgbWVtb2l6ZWQsIGFzIGl0IGRlcGVuZHMgb24gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ25nTW9kdWxlRGVmJyAmJiBtZW1iZXIuaXNTdGF0aWMpO1xuICAgIGlmIChuZ01vZHVsZURlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBzaGFwZSBvZiB0aGUgbmdNb2R1bGVEZWYgdHlwZSBpcyBjb3JyZWN0LlxuICAgICAgICBuZ01vZHVsZURlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5nTW9kdWxlRGVmLnR5cGUpIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIE1vZHVsZURhdGEgb3V0IG9mIHRoZSB0eXBlIGFyZ3VtZW50cy5cbiAgICBjb25zdCBbXywgZGVjbGFyYXRpb25NZXRhZGF0YSwgaW1wb3J0TWV0YWRhdGEsIGV4cG9ydE1ldGFkYXRhXSA9IG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cztcbiAgICByZXR1cm4ge1xuICAgICAgZGVjbGFyYXRpb25zOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGRlY2xhcmF0aW9uTWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICAgIGV4cG9ydHM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZXhwb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICAgIGltcG9ydHM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoaW1wb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2VsZWN0b3IgZnJvbSB0eXBlIG1ldGFkYXRhIGZvciBhIGNsYXNzIHdpdGggYSBwcmVjb21waWxlZCBuZ0NvbXBvbmVudERlZiBvclxuICAgKiBuZ0RpcmVjdGl2ZURlZi5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRTZWxlY3RvckZyb21Db21waWxlZENsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT5cbiAgICAgICAgICAgIGZpZWxkLmlzU3RhdGljICYmIChmaWVsZC5uYW1lID09PSAnbmdDb21wb25lbnREZWYnIHx8IGZpZWxkLm5hbWUgPT09ICduZ0RpcmVjdGl2ZURlZicpKTtcbiAgICBpZiAoZGVmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vIGRlZmluaXRpb24gY291bGQgYmUgZm91bmQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBkZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWYudHlwZSkgfHxcbiAgICAgICAgZGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IGRlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdO1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUodHlwZSkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbCh0eXBlLmxpdGVyYWwpKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHR5cGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGUubGl0ZXJhbC50ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSBgVHlwZU5vZGVgIHdoaWNoIGlzIGEgdHVwbGUgb2YgcmVmZXJlbmNlcyB0byBvdGhlciB0eXBlcywgYW5kIHJldHVybiBgUmVmZXJlbmNlYHMgdG9cbiAgICogdGhlbS5cbiAgICpcbiAgICogVGhpcyBvcGVyYXRpb24gYXNzdW1lcyB0aGF0IHRoZXNlIHR5cGVzIHNob3VsZCBiZSBpbXBvcnRlZCBmcm9tIGBuZ01vZHVsZUltcG9ydGVkRnJvbWAgdW5sZXNzXG4gICAqIHRoZXkgdGhlbXNlbHZlcyB3ZXJlIGltcG9ydGVkIGZyb20gYW5vdGhlciBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nKTogUmVmZXJlbmNlW10ge1xuICAgIGlmICghdHMuaXNUdXBsZVR5cGVOb2RlKGRlZikpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIGRlZi5lbGVtZW50VHlwZXMubWFwKGVsZW1lbnQgPT4ge1xuICAgICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVJlZmVyZW5jZU5vZGVgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHR5cGUgPSBlbGVtZW50LnR5cGVOYW1lO1xuICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gKGZyb20gIT09IG51bGwgJiYgIWZyb20uc3RhcnRzV2l0aCgnLicpID8gZnJvbSA6IG5nTW9kdWxlSW1wb3J0ZWRGcm9tKTtcbiAgICAgIGNvbnN0IGNsYXp6ID0gbm9kZSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICAgIGNvbnN0IGlkID0gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVSZWZlcmVuY2Uobm9kZSwgaWQgISwgbW9kdWxlTmFtZSwgaWQgIS50ZXh0KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuPFQ+KGFycmF5OiBUW11bXSk6IFRbXSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKGFjY3VtLCBzdWJBcnJheSkgPT4ge1xuICAgIGFjY3VtLnB1c2goLi4uc3ViQXJyYXkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfSwgW10gYXMgVFtdKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVNb2R1bGVOYW1lKHJlZjogUmVmZXJlbmNlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gcmVmLm1vZHVsZU5hbWU7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRSZWZlcmVuY2VNYXAoXG4gICAgbWFwOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRXhwcmVzc2lvbj4ge1xuICByZXR1cm4gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KEFycmF5LmZyb20obWFwLmVudHJpZXMoKSkubWFwKChbc2VsZWN0b3IsIHJlZl0pOiBbXG4gICAgc3RyaW5nLCBFeHByZXNzaW9uXG4gIF0gPT4gW3NlbGVjdG9yLCByZWZlcmVuY2VUb0V4cHJlc3Npb24ocmVmLCBjb250ZXh0KV0pKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhcbiAgICBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPiB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBjb252ZXJ0UmVmZXJlbmNlTWFwKHNjb3BlLmRpcmVjdGl2ZXMsIGNvbnRleHQpO1xuICBjb25zdCBwaXBlcyA9IGNvbnZlcnRSZWZlcmVuY2VNYXAoc2NvcGUucGlwZXMsIGNvbnRleHQpO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcbn1cbiJdfQ==