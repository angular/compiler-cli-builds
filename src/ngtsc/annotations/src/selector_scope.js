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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/selector_scope", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
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
                return convertScopeToExpressions(scope_1, node);
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
            return convertScopeToExpressions(scope, node);
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
        var sourceContext = ts.getOriginalNode(context).getSourceFile();
        var directives = convertReferenceMap(scope.directives, sourceContext);
        var pipes = convertReferenceMap(scope.pipes, sourceContext);
        var declPointer = maybeUnwrapNameOfDeclaration(context);
        var containsForwardDecls = false;
        directives.forEach(function (expr) {
            containsForwardDecls =
                containsForwardDecls || isExpressionForwardReference(expr, declPointer, sourceContext);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Y7SUFDL0YsK0JBQWlDO0lBR2pDLHFFQUErRztJQUMvRyxvRkFBc0c7SUFFdEcsNkVBQXFDO0lBd0NyQzs7Ozs7T0FLRztJQUNIO1FBMEJFLCtCQUFvQixPQUF1QixFQUFVLFNBQXlCO1lBQTFELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUF6QjlFOztlQUVHO1lBQ0ssa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUU5RDs7ZUFFRztZQUNLLDJCQUFzQixHQUFHLElBQUksR0FBRyxFQUErQyxDQUFDO1lBRXhGOztlQUVHO1lBQ0sseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFFakU7O2VBRUc7WUFDSyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO1lBRXhEOztlQUVHO1lBQ0ssNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7UUFFSyxDQUFDO1FBRWxGOztXQUVHO1FBQ0gsOENBQWMsR0FBZCxVQUFlLElBQW9CLEVBQUUsSUFBZ0I7WUFBckQsaUJBWUM7WUFYQyxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQW1CLENBQUM7WUFFbEQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBOEIsb0NBQXdCLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQzthQUNqRjtZQUNELElBQUksQ0FBQyxhQUFh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QUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBFeHRlcm5hbFJlZmVyZW5jZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIFJlc29sdmVkUmVmZXJlbmNlLCByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7cmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uLCByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuXG5pbXBvcnQge3RvUjNSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cblxuXG4vKipcbiAqIE1ldGFkYXRhIGV4dHJhY3RlZCBmb3IgYSBnaXZlbiBOZ01vZHVsZSB0aGF0IGNhbiBiZSB1c2VkIHRvIGNvbXB1dGUgc2VsZWN0b3Igc2NvcGVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZURhdGEge1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZVtdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2VbXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlW107XG59XG5cbi8qKlxuICogVHJhbnNpdGl2ZWx5IGV4cGFuZGVkIG1hcHMgb2YgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdmlzaWJsZSB0byBhIGNvbXBvbmVudCBiZWluZyBjb21waWxlZCBpbiB0aGVcbiAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsYXRpb25TY29wZTxUPiB7XG4gIGRpcmVjdGl2ZXM6IE1hcDxzdHJpbmcsIFQ+O1xuICBwaXBlczogTWFwPHN0cmluZywgVD47XG4gIGNvbnRhaW5zRm9yd2FyZERlY2xzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBCb3RoIHRyYW5zaXRpdmVseSBleHBhbmRlZCBzY29wZXMgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUuXG4gKi9cbmludGVyZmFjZSBTZWxlY3RvclNjb3BlcyB7XG4gIC8qKlxuICAgKiBTZXQgb2YgY29tcG9uZW50cywgZGlyZWN0aXZlcywgYW5kIHBpcGVzIHZpc2libGUgdG8gYWxsIGNvbXBvbmVudHMgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gICAqIGNvbnRleHQgb2Ygc29tZSBtb2R1bGUuXG4gICAqL1xuICBjb21waWxhdGlvbjogUmVmZXJlbmNlW107XG5cbiAgLyoqXG4gICAqIFNldCBvZiBjb21wb25lbnRzLCBkaXJlY3RpdmVzLCBhbmQgcGlwZXMgYWRkZWQgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGFueSBtb2R1bGUgaW1wb3J0aW5nXG4gICAqIHNvbWUgbW9kdWxlLlxuICAgKi9cbiAgZXhwb3J0ZWQ6IFJlZmVyZW5jZVtdO1xufVxuXG4vKipcbiAqIFJlZ2lzdHJ5IHdoaWNoIHJlY29yZHMgYW5kIGNvcnJlbGF0ZXMgc3RhdGljIGFuYWx5c2lzIGluZm9ybWF0aW9uIG9mIEFuZ3VsYXIgdHlwZXMuXG4gKlxuICogT25jZSBhIGNvbXBpbGF0aW9uIHVuaXQncyBpbmZvcm1hdGlvbiBpcyBmZWQgaW50byB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LCBpdCBjYW4gYmUgYXNrZWQgdG9cbiAqIHByb2R1Y2UgdHJhbnNpdGl2ZSBgQ29tcGlsYXRpb25TY29wZWBzIGZvciBjb21wb25lbnRzLlxuICovXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqICBNYXAgb2YgbW9kdWxlcyBkZWNsYXJlZCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZWlyIChsb2NhbCkgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIF9tb2R1bGVUb0RhdGEgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBNb2R1bGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgbW9kdWxlcyB0byB0aGVpciBjYWNoZWQgYENvbXBpbGF0aW9uU2NvcGVgcy5cbiAgICovXG4gIHByaXZhdGUgX2NvbXBpbGF0aW9uU2NvcGVDYWNoZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcyB0byB0aGVpciBzZWxlY3Rvci5cbiAgICovXG4gIHByaXZhdGUgX2RpcmVjdGl2ZVRvU2VsZWN0b3IgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBwaXBlcyB0byB0aGVpciBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBfcGlwZVRvTmFtZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcy9waXBlcyB0byB0aGVpciBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIG1vZHVsZSdzIG1ldGFkYXRhIHdpdGggdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJNb2R1bGUobm9kZTogdHMuRGVjbGFyYXRpb24sIGRhdGE6IE1vZHVsZURhdGEpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9YCk7XG4gICAgfVxuICAgIHRoaXMuX21vZHVsZVRvRGF0YS5zZXQobm9kZSwgZGF0YSk7XG5cbiAgICAvLyBSZWdpc3RlciBhbGwgb2YgdGhlIG1vZHVsZSdzIGRlY2xhcmF0aW9ucyBpbiB0aGUgY29udGV4dCBtYXAgYXMgYmVsb25naW5nIHRvIHRoaXMgbW9kdWxlLlxuICAgIGRhdGEuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbCA9PiB7XG4gICAgICB0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLnNldCh0cy5nZXRPcmlnaW5hbE5vZGUoZGVjbC5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbiwgbm9kZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIHNlbGVjdG9yIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyU2VsZWN0b3Iobm9kZTogdHMuRGVjbGFyYXRpb24sIHNlbGVjdG9yOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3IuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlbGVjdG9yIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9ICR7c2VsZWN0b3J9YCk7XG4gICAgfVxuICAgIHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3Iuc2V0KG5vZGUsIHNlbGVjdG9yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbmFtZSBvZiBhIHBpcGUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclBpcGUobm9kZTogdHMuRGVjbGFyYXRpb24sIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICB0aGlzLl9waXBlVG9OYW1lLnNldChub2RlLCBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIGNvbXBvbmVudCwgd2hpY2ggaXMgZGV0ZXJtaW5lZCBieSB0aGUgbW9kdWxlIHRoYXQgZGVjbGFyZXNcbiAgICogaXQuXG4gICAqL1xuICBsb29rdXBDb21waWxhdGlvblNjb3BlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPnxudWxsIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgbm8gYXNzb2NpYXRlZCBtb2R1bGUsIHRoZW4gaXQgaGFzIG5vIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGlmICghdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuZ2V0KG5vZGUpICE7XG5cbiAgICAvLyBDb21waWxhdGlvbiBzY29wZSBjb21wdXRhdGlvbiBpcyBzb21ld2hhdCBleHBlbnNpdmUsIHNvIGl0J3MgY2FjaGVkLiBDaGVjayB0aGUgY2FjaGUgZm9yXG4gICAgLy8gdGhlIG1vZHVsZS5cbiAgICBpZiAodGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmhhcyhtb2R1bGUpKSB7XG4gICAgICAvLyBUaGUgY29tcGlsYXRpb24gc2NvcGUgd2FzIGNhY2hlZC5cbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5fY29tcGlsYXRpb25TY29wZUNhY2hlLmdldChtb2R1bGUpICE7XG5cbiAgICAgIC8vIFRoZSBzY29wZSBhcyBjYWNoZWQgaXMgaW4gdGVybXMgb2YgUmVmZXJlbmNlcywgbm90IEV4cHJlc3Npb25zLiBDb252ZXJ0aW5nIGJldHdlZW4gdGhlbVxuICAgICAgLy8gcmVxdWlyZXMga25vd2xlZGdlIG9mIHRoZSBjb250ZXh0IGZpbGUgKGluIHRoaXMgY2FzZSwgdGhlIGNvbXBvbmVudCBub2RlJ3Mgc291cmNlIGZpbGUpLlxuICAgICAgcmV0dXJuIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoc2NvcGUsIG5vZGUpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgdGhlIHNjb3BlIGZvciB0aGlzIG1vZHVsZSBpcyBiZWluZyBjb21wdXRlZC5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZT4oKTtcbiAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+KCk7XG5cbiAgICAvLyBQcm9jZXNzIHRoZSBkZWNsYXJhdGlvbiBzY29wZSBvZiB0aGUgbW9kdWxlLCBhbmQgbG9va3VwIHRoZSBzZWxlY3RvciBvZiBldmVyeSBkZWNsYXJlZCB0eXBlLlxuICAgIC8vIFRoZSBpbml0aWFsIHZhbHVlIG9mIG5nTW9kdWxlSW1wb3J0ZWRGcm9tIGlzICdudWxsJyB3aGljaCBzaWduaWZpZXMgdGhhdCB0aGUgTmdNb2R1bGVcbiAgICAvLyB3YXMgbm90IGltcG9ydGVkIGZyb20gYSAuZC50cyBzb3VyY2UuXG4gICAgdGhpcy5sb29rdXBTY29wZXMobW9kdWxlICEsIC8qIG5nTW9kdWxlSW1wb3J0ZWRGcm9tICovIG51bGwpLmNvbXBpbGF0aW9uLmZvckVhY2gocmVmID0+IHtcbiAgICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgICAvLyBFaXRoZXIgdGhlIG5vZGUgcmVwcmVzZW50cyBhIGRpcmVjdGl2ZSBvciBhIHBpcGUuIExvb2sgZm9yIGJvdGguXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHRoaXMubG9va3VwRGlyZWN0aXZlU2VsZWN0b3Iobm9kZSk7XG4gICAgICAvLyBPbmx5IGRpcmVjdGl2ZXMvY29tcG9uZW50cyB3aXRoIHNlbGVjdG9ycyBnZXQgYWRkZWQgdG8gdGhlIHNjb3BlLlxuICAgICAgaWYgKHNlbGVjdG9yICE9IG51bGwpIHtcbiAgICAgICAgZGlyZWN0aXZlcy5zZXQoc2VsZWN0b3IsIHJlZik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmFtZSA9IHRoaXMubG9va3VwUGlwZU5hbWUobm9kZSk7XG4gICAgICBpZiAobmFtZSAhPSBudWxsKSB7XG4gICAgICAgIHBpcGVzLnNldChuYW1lLCByZWYpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiA9IHtkaXJlY3RpdmVzLCBwaXBlc307XG5cbiAgICAvLyBNYW55IGNvbXBvbmVudHMgbWF5IGJlIGNvbXBpbGVkIGluIHRoZSBzYW1lIHNjb3BlLCBzbyBjYWNoZSBpdC5cbiAgICB0aGlzLl9jb21waWxhdGlvblNjb3BlQ2FjaGUuc2V0KG5vZGUsIHNjb3BlKTtcblxuICAgIC8vIENvbnZlcnQgUmVmZXJlbmNlcyB0byBFeHByZXNzaW9ucyBpbiB0aGUgY29udGV4dCBvZiB0aGUgY29tcG9uZW50J3Mgc291cmNlIGZpbGUuXG4gICAgcmV0dXJuIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoc2NvcGUsIG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCBgU2VsZWN0b3JTY29wZXNgIGZvciBhIGdpdmVuIG1vZHVsZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBhc3N1bWVzIHRoYXQgaWYgdGhlIGdpdmVuIG1vZHVsZSB3YXMgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBwYXRoXG4gICAqIChgbmdNb2R1bGVJbXBvcnRlZEZyb21gKSB0aGVuIGFsbCBvZiBpdHMgZGVjbGFyYXRpb25zIGFyZSBleHBvcnRlZCBhdCB0aGF0IHNhbWUgcGF0aCwgYXMgd2VsbFxuICAgKiBhcyBpbXBvcnRzIGFuZCBleHBvcnRzIGZyb20gb3RoZXIgbW9kdWxlcyB0aGF0IGFyZSByZWxhdGl2ZWx5IGltcG9ydGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb29rdXBTY29wZXMobm9kZTogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCk6IFNlbGVjdG9yU2NvcGVzIHtcbiAgICBsZXQgZGF0YTogTW9kdWxlRGF0YXxudWxsID0gbnVsbDtcblxuICAgIC8vIEVpdGhlciB0aGlzIG1vZHVsZSB3YXMgYW5hbHl6ZWQgZGlyZWN0bHksIG9yIGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmLlxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgbW9kdWxlIHdhcyBhbmFseXplZCBiZWZvcmUsIGFuZCB0aHVzIGl0cyBkYXRhIGlzIGF2YWlsYWJsZS5cbiAgICAgIGRhdGEgPSB0aGlzLl9tb2R1bGVUb0RhdGEuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2Fzbid0IGFuYWx5emVkIGJlZm9yZSwgYW5kIHByb2JhYmx5IGhhcyBhIHByZWNvbXBpbGVkIG5nTW9kdWxlRGVmIHdpdGggYSB0eXBlXG4gICAgICAvLyBhbm5vdGF0aW9uIHRoYXQgc3BlY2lmaWVzIHRoZSBuZWVkZWQgbWV0YWRhdGEuXG4gICAgICBkYXRhID0gdGhpcy5fcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSwgbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgLy8gTm90ZSB0aGF0IGRhdGEgaGVyZSBjb3VsZCBzdGlsbCBiZSBudWxsLCBpZiB0aGUgY2xhc3MgZGlkbid0IGhhdmUgYSBwcmVjb21waWxlZFxuICAgICAgLy8gbmdNb2R1bGVEZWYuXG4gICAgfVxuXG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIG5vdCByZWdpc3RlcmVkOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGlsYXRpb246IFtcbiAgICAgICAgLi4uZGF0YS5kZWNsYXJhdGlvbnMsXG4gICAgICAgIC8vIEV4cGFuZCBpbXBvcnRzIHRvIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aG9zZSBpbXBvcnRzLlxuICAgICAgICAuLi5mbGF0dGVuKGRhdGEuaW1wb3J0cy5tYXAoXG4gICAgICAgICAgICByZWYgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmxvb2t1cFNjb3BlcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZikpLmV4cG9ydGVkKSksXG4gICAgICAgIC8vIEFuZCBpbmNsdWRlIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBleHBvcnRlZCBtb2R1bGVzLlxuICAgICAgICAuLi5mbGF0dGVuKFxuICAgICAgICAgICAgZGF0YS5leHBvcnRzLmZpbHRlcihyZWYgPT4gdGhpcy5fbW9kdWxlVG9EYXRhLmhhcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbikpXG4gICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgcmVmID0+IHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZXhwb3J0ZWQpKVxuICAgICAgXSxcbiAgICAgIGV4cG9ydGVkOiBmbGF0dGVuKGRhdGEuZXhwb3J0cy5tYXAocmVmID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMocmVmLm5vZGUgYXMgdHMuRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSkuZXhwb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtyZWZdO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIHNlbGVjdG9yIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICpcbiAgICogUG90ZW50aWFsbHkgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUgb3Igb3RoZXJ3aXNlIGhhcyBhIG1hbnVhbGx5IGNyZWF0ZWRcbiAgICogbmdDb21wb25lbnREZWYvbmdEaXJlY3RpdmVEZWYuIEluIHRoaXMgY2FzZSwgdGhlIHR5cGUgbWV0YWRhdGEgb2YgdGhhdCBkZWZpbml0aW9uIGlzIHJlYWRcbiAgICogdG8gZGV0ZXJtaW5lIHRoZSBzZWxlY3Rvci5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwRGlyZWN0aXZlU2VsZWN0b3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvU2VsZWN0b3IuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGlyZWN0aXZlVG9TZWxlY3Rvci5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWRTZWxlY3RvckZyb21Db21waWxlZENsYXNzKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9va3VwUGlwZU5hbWUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgaWYgKHRoaXMuX3BpcGVUb05hbWUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGlwZVRvTmFtZS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWROYW1lRnJvbUNvbXBpbGVkQ2xhc3Mobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWQgdGhlIG1ldGFkYXRhIGZyb20gYSBjbGFzcyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gY29tcGlsZWQgc29tZWhvdyAoZWl0aGVyIGl0J3MgaW4gYSAuZC50c1xuICAgKiBmaWxlLCBvciBpbiBhIC50cyBmaWxlIHdpdGggYSBoYW5kd3JpdHRlbiBkZWZpbml0aW9uKS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IHRoZSBjbGFzcyBvZiBpbnRlcmVzdFxuICAgKiBAcGFyYW0gbmdNb2R1bGVJbXBvcnRlZEZyb20gbW9kdWxlIHNwZWNpZmllciBvZiB0aGUgaW1wb3J0IHBhdGggdG8gYXNzdW1lIGZvciBhbGwgZGVjbGFyYXRpb25zXG4gICAqIHN0ZW1taW5nIGZyb20gdGhpcyBtb2R1bGUuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkTWV0YWRhdGFGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCk6XG4gICAgICBNb2R1bGVEYXRhfG51bGwge1xuICAgIC8vIFRoaXMgb3BlcmF0aW9uIGlzIGV4cGxpY2l0bHkgbm90IG1lbW9pemVkLCBhcyBpdCBkZXBlbmRzIG9uIGBuZ01vZHVsZUltcG9ydGVkRnJvbWAuXG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBjYWNoaW5nIG9mIC5kLnRzIG1vZHVsZSBtZXRhZGF0YS5cbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KS5maW5kKFxuICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLm5hbWUgPT09ICduZ01vZHVsZURlZicgJiYgbWVtYmVyLmlzU3RhdGljKTtcbiAgICBpZiAobmdNb2R1bGVEZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCB0aGUgc2hhcGUgb2YgdGhlIG5nTW9kdWxlRGVmIHR5cGUgaXMgY29ycmVjdC5cbiAgICAgICAgbmdNb2R1bGVEZWYudHlwZSA9PT0gbnVsbCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShuZ01vZHVsZURlZi50eXBlKSB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBNb2R1bGVEYXRhIG91dCBvZiB0aGUgdHlwZSBhcmd1bWVudHMuXG4gICAgY29uc3QgW18sIGRlY2xhcmF0aW9uTWV0YWRhdGEsIGltcG9ydE1ldGFkYXRhLCBleHBvcnRNZXRhZGF0YV0gPSBuZ01vZHVsZURlZi50eXBlLnR5cGVBcmd1bWVudHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY2xhcmF0aW9uczogdGhpcy5fZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShkZWNsYXJhdGlvbk1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSksXG4gICAgICBleHBvcnRzOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGV4cG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSksXG4gICAgICBpbXBvcnRzOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGltcG9ydE1ldGFkYXRhLCBuZ01vZHVsZUltcG9ydGVkRnJvbSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNlbGVjdG9yIGZyb20gdHlwZSBtZXRhZGF0YSBmb3IgYSBjbGFzcyB3aXRoIGEgcHJlY29tcGlsZWQgbmdDb21wb25lbnREZWYgb3JcbiAgICogbmdEaXJlY3RpdmVEZWYuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkU2VsZWN0b3JGcm9tQ29tcGlsZWRDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+XG4gICAgICAgICAgICBmaWVsZC5pc1N0YXRpYyAmJiAoZmllbGQubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJyB8fCBmaWVsZC5uYW1lID09PSAnbmdEaXJlY3RpdmVEZWYnKSk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMikge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyBzaGFwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUudHlwZUFyZ3VtZW50c1sxXTtcbiAgICBpZiAoIXRzLmlzTGl0ZXJhbFR5cGVOb2RlKHR5cGUpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwodHlwZS5saXRlcmFsKSkge1xuICAgICAgLy8gVGhlIHR5cGUgbWV0YWRhdGEgd2FzIHRoZSB3cm9uZyB0eXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0eXBlLmxpdGVyYWwudGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNlbGVjdG9yIGZyb20gdHlwZSBtZXRhZGF0YSBmb3IgYSBjbGFzcyB3aXRoIGEgcHJlY29tcGlsZWQgbmdDb21wb25lbnREZWYgb3JcbiAgICogbmdEaXJlY3RpdmVEZWYuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkTmFtZUZyb21Db21waWxlZENsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT4gZmllbGQuaXNTdGF0aWMgJiYgZmllbGQubmFtZSA9PT0gJ25nUGlwZURlZicpO1xuICAgIGlmIChkZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlZi50eXBlKSB8fFxuICAgICAgICBkZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGRlZi50eXBlLnR5cGVBcmd1bWVudHNbMV07XG4gICAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3JvbmcgdHlwZS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIGBUeXBlTm9kZWAgd2hpY2ggaXMgYSB0dXBsZSBvZiByZWZlcmVuY2VzIHRvIG90aGVyIHR5cGVzLCBhbmQgcmV0dXJuIGBSZWZlcmVuY2VgcyB0b1xuICAgKiB0aGVtLlxuICAgKlxuICAgKiBUaGlzIG9wZXJhdGlvbiBhc3N1bWVzIHRoYXQgdGhlc2UgdHlwZXMgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYCB1bmxlc3NcbiAgICogdGhleSB0aGVtc2VsdmVzIHdlcmUgaW1wb3J0ZWQgZnJvbSBhbm90aGVyIGFic29sdXRlIHBhdGguXG4gICAqL1xuICBwcml2YXRlIF9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGRlZjogdHMuVHlwZU5vZGUsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCk6XG4gICAgICBSZWZlcmVuY2VbXSB7XG4gICAgaWYgKCF0cy5pc1R1cGxlVHlwZU5vZGUoZGVmKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gZGVmLmVsZW1lbnRUeXBlcy5tYXAoZWxlbWVudCA9PiB7XG4gICAgICBpZiAoIXRzLmlzVHlwZVF1ZXJ5Tm9kZShlbGVtZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFR5cGVRdWVyeU5vZGVgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHR5cGUgPSBlbGVtZW50LmV4cHJOYW1lO1xuICAgICAgaWYgKG5nTW9kdWxlSW1wb3J0ZWRGcm9tICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHtub2RlLCBmcm9tfSA9IHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbih0eXBlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gKGZyb20gIT09IG51bGwgJiYgIWZyb20uc3RhcnRzV2l0aCgnLicpID8gZnJvbSA6IG5nTW9kdWxlSW1wb3J0ZWRGcm9tKTtcbiAgICAgICAgY29uc3QgaWQgPSByZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24obm9kZSk7XG4gICAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVSZWZlcmVuY2Uobm9kZSwgaWQgISwgbW9kdWxlTmFtZSwgaWQgIS50ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHtub2RlfSA9IHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbih0eXBlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICBjb25zdCBpZCA9IHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNvbHZlZFJlZmVyZW5jZShub2RlLCBpZCAhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGF0dGVuPFQ+KGFycmF5OiBUW11bXSk6IFRbXSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKGFjY3VtLCBzdWJBcnJheSkgPT4ge1xuICAgIGFjY3VtLnB1c2goLi4uc3ViQXJyYXkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfSwgW10gYXMgVFtdKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVNb2R1bGVOYW1lKHJlZjogUmVmZXJlbmNlKTogc3RyaW5nfG51bGwge1xuICBpZiAoIShyZWYgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gcmVmLm1vZHVsZU5hbWU7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRSZWZlcmVuY2VNYXAoXG4gICAgbWFwOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRXhwcmVzc2lvbj4ge1xuICByZXR1cm4gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KEFycmF5LmZyb20obWFwLmVudHJpZXMoKSkubWFwKChbc2VsZWN0b3IsIHJlZl0pOiBbXG4gICAgc3RyaW5nLCBFeHByZXNzaW9uXG4gIF0gPT4gW3NlbGVjdG9yLCB0b1IzUmVmZXJlbmNlKHJlZiwgY29udGV4dCkudmFsdWVdKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRTY29wZVRvRXhwcmVzc2lvbnMoXG4gICAgc2NvcGU6IENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPiwgY29udGV4dDogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPEV4cHJlc3Npb24+IHtcbiAgY29uc3Qgc291cmNlQ29udGV4dCA9IHRzLmdldE9yaWdpbmFsTm9kZShjb250ZXh0KS5nZXRTb3VyY2VGaWxlKCk7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBjb252ZXJ0UmVmZXJlbmNlTWFwKHNjb3BlLmRpcmVjdGl2ZXMsIHNvdXJjZUNvbnRleHQpO1xuICBjb25zdCBwaXBlcyA9IGNvbnZlcnRSZWZlcmVuY2VNYXAoc2NvcGUucGlwZXMsIHNvdXJjZUNvbnRleHQpO1xuICBjb25zdCBkZWNsUG9pbnRlciA9IG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oY29udGV4dCk7XG4gIGxldCBjb250YWluc0ZvcndhcmREZWNscyA9IGZhbHNlO1xuICBkaXJlY3RpdmVzLmZvckVhY2goZXhwciA9PiB7XG4gICAgY29udGFpbnNGb3J3YXJkRGVjbHMgPVxuICAgICAgICBjb250YWluc0ZvcndhcmREZWNscyB8fCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKGV4cHIsIGRlY2xQb2ludGVyLCBzb3VyY2VDb250ZXh0KTtcbiAgfSk7XG4gICFjb250YWluc0ZvcndhcmREZWNscyAmJiBwaXBlcy5mb3JFYWNoKGV4cHIgPT4ge1xuICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzID1cbiAgICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMgfHwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShleHByLCBkZWNsUG9pbnRlciwgc291cmNlQ29udGV4dCk7XG4gIH0pO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzLCBjb250YWluc0ZvcndhcmREZWNsc307XG59XG5cbmZ1bmN0aW9uIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoXG4gICAgZXhwcjogRXhwcmVzc2lvbiwgY29udGV4dDogdHMuTm9kZSwgY29udGV4dFNvdXJjZTogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICBpZiAoaXNXcmFwcGVkVHNOb2RlRXhwcihleHByKSkge1xuICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUoZXhwci5ub2RlKTtcbiAgICByZXR1cm4gbm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IGNvbnRleHRTb3VyY2UgJiYgY29udGV4dC5wb3MgPCBub2RlLnBvcztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcjogRXhwcmVzc2lvbik6IGV4cHIgaXMgV3JhcHBlZE5vZGVFeHByPHRzLk5vZGU+IHtcbiAgcmV0dXJuIGV4cHIgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHI7XG59XG5cbmZ1bmN0aW9uIG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnx0cy5JZGVudGlmaWVyIHtcbiAgaWYgKCh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpKSAmJiBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9XG4gIHJldHVybiBkZWNsO1xufSJdfQ==