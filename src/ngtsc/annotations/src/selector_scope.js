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
             * Map of components/directives to their metadata.
             */
            this._directiveToMetadata = new Map();
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
         * Register the metadata of a component or directive with the registry.
         */
        SelectorScopeRegistry.prototype.registerDirective = function (node, metadata) {
            node = ts.getOriginalNode(node);
            if (this._directiveToMetadata.has(node)) {
                throw new Error("Selector already registered: " + reflector_1.reflectNameOfDeclaration(node) + " " + metadata.selector);
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
        SelectorScopeRegistry.prototype.lookupCompilationScopeAsRefs = function (node) {
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
                return scope_1;
            }
            // This is the first time the scope for this module is being computed.
            var directives = [];
            var pipes = new Map();
            // Process the declaration scope of the module, and lookup the selector of every declared type.
            // The initial value of ngModuleImportedFrom is 'null' which signifies that the NgModule
            // was not imported from a .d.ts source.
            this.lookupScopesOrDie(module, /* ngModuleImportedFrom */ null).compilation.forEach(function (ref) {
                var node = ts.getOriginalNode(ref.node);
                // Either the node represents a directive or a pipe. Look for both.
                var metadata = _this.lookupDirectiveMetadata(ref);
                // Only directives/components with selectors get added to the scope.
                if (metadata != null) {
                    directives.push({ selector: metadata.selector, meta: tslib_1.__assign({}, metadata, { directive: ref }) });
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
        SelectorScopeRegistry.prototype.lookupScopesOrDie = function (node, ngModuleImportedFrom) {
            var result = this.lookupScopes(node, ngModuleImportedFrom);
            if (result === null) {
                throw new Error("Module not found: " + reflector_1.reflectNameOfDeclaration(node));
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
                data = this._readModuleDataFromCompiledClass(node, ngModuleImportedFrom);
                // Note that data here could still be null, if the class didn't have a precompiled
                // ngModuleDef.
            }
            if (data === null) {
                return null;
            }
            return {
                compilation: tslib_1.__spread(data.declarations, flatten(data.imports.map(function (ref) { return _this.lookupScopesOrDie(ref.node, absoluteModuleName(ref))
                    .exported; })), flatten(data.exports
                    .map(function (ref) { return _this.lookupScopes(ref.node, absoluteModuleName(ref)); })
                    .filter(function (scope) { return scope !== null; })
                    .map(function (scope) { return scope.exported; }))),
                exported: flatten(data.exports.map(function (ref) {
                    var scope = _this.lookupScopes(ref.node, absoluteModuleName(ref));
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
        SelectorScopeRegistry.prototype._readModuleDataFromCompiledClass = function (clazz, ngModuleImportedFrom) {
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
            return tslib_1.__assign({ ref: ref, name: clazz.name.text, directive: ref, isComponent: def.name === 'ngComponentDef', selector: selector, exportAs: readStringType(def.type.typeArguments[2]), inputs: readStringMapType(def.type.typeArguments[3]), outputs: readStringMapType(def.type.typeArguments[4]), queries: readStringArrayType(def.type.typeArguments[5]) }, util_1.extractDirectiveGuards(clazz, this.reflector));
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
    function convertDirectiveReferenceList(input, context) {
        return input.map(function (_a) {
            var selector = _a.selector, meta = _a.meta;
            var directive = meta.directive.toExpression(context);
            if (directive === null) {
                throw new Error("Could not write expression to reference " + meta.directive.node);
            }
            return { selector: selector, meta: tslib_1.__assign({}, meta, { directive: directive }) };
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
        directives.forEach(function (_a) {
            var selector = _a.selector, meta = _a.meta;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3Jfc2NvcGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9zZWxlY3Rvcl9zY29wZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Y7SUFDL0YsK0JBQWlDO0lBR2pDLHFFQUErRztJQUMvRyxvRkFBc0c7SUFHdEcsNkVBQThDO0lBNEM5Qzs7Ozs7T0FLRztJQUNIO1FBMEJFLCtCQUFvQixPQUF1QixFQUFVLFNBQXlCO1lBQTFELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUF6QjlFOztlQUVHO1lBQ0ssa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUU5RDs7ZUFFRztZQUNLLDJCQUFzQixHQUFHLElBQUksR0FBRyxFQUErQyxDQUFDO1lBRXhGOztlQUVHO1lBQ0sseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQTZDLENBQUM7WUFFcEY7O2VBRUc7WUFDSyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO1lBRXhEOztlQUVHO1lBQ0ssNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7UUFFSyxDQUFDO1FBRWxGOztXQUVHO1FBQ0gsOENBQWMsR0FBZCxVQUFlLElBQW9CLEVBQUUsSUFBZ0I7WUFBckQsaUJBWUM7WUFYQyxJQUFJLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQW1CLENBQUM7WUFFbEQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBOEIsb0NBQXdCLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQzthQUNqRjtZQUNELElBQUksQ0FBQyxhQUFh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QUM1QixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEV4dGVybmFsUmVmZXJlbmNlLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2UsIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtyZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24sIHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5pbXBvcnQge1R5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuXG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHN9IGZyb20gJy4vdXRpbCc7XG5cblxuLyoqXG4gKiBNZXRhZGF0YSBleHRyYWN0ZWQgZm9yIGEgZ2l2ZW4gTmdNb2R1bGUgdGhhdCBjYW4gYmUgdXNlZCB0byBjb21wdXRlIHNlbGVjdG9yIHNjb3Blcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xufVxuXG4vKipcbiAqIFRyYW5zaXRpdmVseSBleHBhbmRlZCBtYXBzIG9mIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHZpc2libGUgdG8gYSBjb21wb25lbnQgYmVpbmcgY29tcGlsZWQgaW4gdGhlXG4gKiBjb250ZXh0IG9mIHNvbWUgbW9kdWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGF0aW9uU2NvcGU8VD4ge1xuICBkaXJlY3RpdmVzOiB7c2VsZWN0b3I6IHN0cmluZywgbWV0YTogU2NvcGVEaXJlY3RpdmU8VD59W107XG4gIHBpcGVzOiBNYXA8c3RyaW5nLCBUPjtcbiAgY29udGFpbnNGb3J3YXJkRGVjbHM/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjb3BlRGlyZWN0aXZlPFQ+IGV4dGVuZHMgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEge1xuICBzZWxlY3Rvcjogc3RyaW5nO1xuICBkaXJlY3RpdmU6IFQ7XG59XG5cbi8qKlxuICogQm90aCB0cmFuc2l0aXZlbHkgZXhwYW5kZWQgc2NvcGVzIGZvciBhIGdpdmVuIE5nTW9kdWxlLlxuICovXG5pbnRlcmZhY2UgU2VsZWN0b3JTY29wZXMge1xuICAvKipcbiAgICogU2V0IG9mIGNvbXBvbmVudHMsIGRpcmVjdGl2ZXMsIGFuZCBwaXBlcyB2aXNpYmxlIHRvIGFsbCBjb21wb25lbnRzIGJlaW5nIGNvbXBpbGVkIGluIHRoZVxuICAgKiBjb250ZXh0IG9mIHNvbWUgbW9kdWxlLlxuICAgKi9cbiAgY29tcGlsYXRpb246IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcblxuICAvKipcbiAgICogU2V0IG9mIGNvbXBvbmVudHMsIGRpcmVjdGl2ZXMsIGFuZCBwaXBlcyBhZGRlZCB0byB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYW55IG1vZHVsZSBpbXBvcnRpbmdcbiAgICogc29tZSBtb2R1bGUuXG4gICAqL1xuICBleHBvcnRlZDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdO1xufVxuXG4vKipcbiAqIFJlZ2lzdHJ5IHdoaWNoIHJlY29yZHMgYW5kIGNvcnJlbGF0ZXMgc3RhdGljIGFuYWx5c2lzIGluZm9ybWF0aW9uIG9mIEFuZ3VsYXIgdHlwZXMuXG4gKlxuICogT25jZSBhIGNvbXBpbGF0aW9uIHVuaXQncyBpbmZvcm1hdGlvbiBpcyBmZWQgaW50byB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LCBpdCBjYW4gYmUgYXNrZWQgdG9cbiAqIHByb2R1Y2UgdHJhbnNpdGl2ZSBgQ29tcGlsYXRpb25TY29wZWBzIGZvciBjb21wb25lbnRzLlxuICovXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqICBNYXAgb2YgbW9kdWxlcyBkZWNsYXJlZCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZWlyIChsb2NhbCkgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIF9tb2R1bGVUb0RhdGEgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBNb2R1bGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgbW9kdWxlcyB0byB0aGVpciBjYWNoZWQgYENvbXBpbGF0aW9uU2NvcGVgcy5cbiAgICovXG4gIHByaXZhdGUgX2NvbXBpbGF0aW9uU2NvcGVDYWNoZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIENvbXBpbGF0aW9uU2NvcGU8UmVmZXJlbmNlPj4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIGNvbXBvbmVudHMvZGlyZWN0aXZlcyB0byB0aGVpciBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgX2RpcmVjdGl2ZVRvTWV0YWRhdGEgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+PigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgcGlwZXMgdG8gdGhlaXIgbmFtZS5cbiAgICovXG4gIHByaXZhdGUgX3BpcGVUb05hbWUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBjb21wb25lbnRzL2RpcmVjdGl2ZXMvcGlwZXMgdG8gdGhlaXIgbW9kdWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfZGVjbGFyYXJlZFR5cGVUb01vZHVsZSA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCkge31cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBtb2R1bGUncyBtZXRhZGF0YSB3aXRoIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTW9kdWxlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkYXRhOiBNb2R1bGVEYXRhKTogdm9pZCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIGlmICh0aGlzLl9tb2R1bGVUb0RhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZHVsZSBhbHJlYWR5IHJlZ2lzdGVyZWQ6ICR7cmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpfWApO1xuICAgIH1cbiAgICB0aGlzLl9tb2R1bGVUb0RhdGEuc2V0KG5vZGUsIGRhdGEpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWxsIG9mIHRoZSBtb2R1bGUncyBkZWNsYXJhdGlvbnMgaW4gdGhlIGNvbnRleHQgbWFwIGFzIGJlbG9uZ2luZyB0byB0aGlzIG1vZHVsZS5cbiAgICBkYXRhLmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2wgPT4ge1xuICAgICAgdGhpcy5fZGVjbGFyYXJlZFR5cGVUb01vZHVsZS5zZXQodHMuZ2V0T3JpZ2luYWxOb2RlKGRlY2wubm9kZSkgYXMgdHMuRGVjbGFyYXRpb24sIG5vZGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBtZXRhZGF0YSBvZiBhIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlckRpcmVjdGl2ZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgbWV0YWRhdGE6IFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT4pOiB2b2lkIHtcbiAgICBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgaWYgKHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuaGFzKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFNlbGVjdG9yIGFscmVhZHkgcmVnaXN0ZXJlZDogJHtyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSl9ICR7bWV0YWRhdGEuc2VsZWN0b3J9YCk7XG4gICAgfVxuICAgIHRoaXMuX2RpcmVjdGl2ZVRvTWV0YWRhdGEuc2V0KG5vZGUsIG1ldGFkYXRhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgbmFtZSBvZiBhIHBpcGUgd2l0aCB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclBpcGUobm9kZTogdHMuRGVjbGFyYXRpb24sIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG5cbiAgICB0aGlzLl9waXBlVG9OYW1lLnNldChub2RlLCBuYW1lKTtcbiAgfVxuXG4gIGxvb2t1cENvbXBpbGF0aW9uU2NvcGVBc1JlZnMobm9kZTogdHMuRGVjbGFyYXRpb24pOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT58bnVsbCB7XG4gICAgbm9kZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcblxuICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIG5vIGFzc29jaWF0ZWQgbW9kdWxlLCB0aGVuIGl0IGhhcyBubyBjb21waWxhdGlvbiBzY29wZS5cbiAgICBpZiAoIXRoaXMuX2RlY2xhcmFyZWRUeXBlVG9Nb2R1bGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGUgPSB0aGlzLl9kZWNsYXJhcmVkVHlwZVRvTW9kdWxlLmdldChub2RlKSAhO1xuXG4gICAgLy8gQ29tcGlsYXRpb24gc2NvcGUgY29tcHV0YXRpb24gaXMgc29tZXdoYXQgZXhwZW5zaXZlLCBzbyBpdCdzIGNhY2hlZC4gQ2hlY2sgdGhlIGNhY2hlIGZvclxuICAgIC8vIHRoZSBtb2R1bGUuXG4gICAgaWYgKHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5oYXMobW9kdWxlKSkge1xuICAgICAgLy8gVGhlIGNvbXBpbGF0aW9uIHNjb3BlIHdhcyBjYWNoZWQuXG4gICAgICBjb25zdCBzY29wZSA9IHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5nZXQobW9kdWxlKSAhO1xuXG4gICAgICAvLyBUaGUgc2NvcGUgYXMgY2FjaGVkIGlzIGluIHRlcm1zIG9mIFJlZmVyZW5jZXMsIG5vdCBFeHByZXNzaW9ucy4gQ29udmVydGluZyBiZXR3ZWVuIHRoZW1cbiAgICAgIC8vIHJlcXVpcmVzIGtub3dsZWRnZSBvZiB0aGUgY29udGV4dCBmaWxlIChpbiB0aGlzIGNhc2UsIHRoZSBjb21wb25lbnQgbm9kZSdzIHNvdXJjZSBmaWxlKS5cbiAgICAgIHJldHVybiBzY29wZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCB0aW1lIHRoZSBzY29wZSBmb3IgdGhpcyBtb2R1bGUgaXMgYmVpbmcgY29tcHV0ZWQuXG4gICAgY29uc3QgZGlyZWN0aXZlczoge3NlbGVjdG9yOiBzdHJpbmcsIG1ldGE6IFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+fVtdID0gW107XG4gICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPigpO1xuXG4gICAgLy8gUHJvY2VzcyB0aGUgZGVjbGFyYXRpb24gc2NvcGUgb2YgdGhlIG1vZHVsZSwgYW5kIGxvb2t1cCB0aGUgc2VsZWN0b3Igb2YgZXZlcnkgZGVjbGFyZWQgdHlwZS5cbiAgICAvLyBUaGUgaW5pdGlhbCB2YWx1ZSBvZiBuZ01vZHVsZUltcG9ydGVkRnJvbSBpcyAnbnVsbCcgd2hpY2ggc2lnbmlmaWVzIHRoYXQgdGhlIE5nTW9kdWxlXG4gICAgLy8gd2FzIG5vdCBpbXBvcnRlZCBmcm9tIGEgLmQudHMgc291cmNlLlxuICAgIHRoaXMubG9va3VwU2NvcGVzT3JEaWUobW9kdWxlICEsIC8qIG5nTW9kdWxlSW1wb3J0ZWRGcm9tICovIG51bGwpLmNvbXBpbGF0aW9uLmZvckVhY2gocmVmID0+IHtcbiAgICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuXG4gICAgICAvLyBFaXRoZXIgdGhlIG5vZGUgcmVwcmVzZW50cyBhIGRpcmVjdGl2ZSBvciBhIHBpcGUuIExvb2sgZm9yIGJvdGguXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubG9va3VwRGlyZWN0aXZlTWV0YWRhdGEocmVmKTtcbiAgICAgIC8vIE9ubHkgZGlyZWN0aXZlcy9jb21wb25lbnRzIHdpdGggc2VsZWN0b3JzIGdldCBhZGRlZCB0byB0aGUgc2NvcGUuXG4gICAgICBpZiAobWV0YWRhdGEgIT0gbnVsbCkge1xuICAgICAgICBkaXJlY3RpdmVzLnB1c2goe3NlbGVjdG9yOiBtZXRhZGF0YS5zZWxlY3RvciwgbWV0YTogey4uLm1ldGFkYXRhLCBkaXJlY3RpdmU6IHJlZn19KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBuYW1lID0gdGhpcy5sb29rdXBQaXBlTmFtZShub2RlKTtcbiAgICAgIGlmIChuYW1lICE9IG51bGwpIHtcbiAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBzY29wZTogQ29tcGlsYXRpb25TY29wZTxSZWZlcmVuY2U+ID0ge2RpcmVjdGl2ZXMsIHBpcGVzfTtcblxuICAgIC8vIE1hbnkgY29tcG9uZW50cyBtYXkgYmUgY29tcGlsZWQgaW4gdGhlIHNhbWUgc2NvcGUsIHNvIGNhY2hlIGl0LlxuICAgIHRoaXMuX2NvbXBpbGF0aW9uU2NvcGVDYWNoZS5zZXQobm9kZSwgc2NvcGUpO1xuXG4gICAgLy8gQ29udmVydCBSZWZlcmVuY2VzIHRvIEV4cHJlc3Npb25zIGluIHRoZSBjb250ZXh0IG9mIHRoZSBjb21wb25lbnQncyBzb3VyY2UgZmlsZS5cbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogUHJvZHVjZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQsIHdoaWNoIGlzIGRldGVybWluZWQgYnkgdGhlIG1vZHVsZSB0aGF0IGRlY2xhcmVzXG4gICAqIGl0LlxuICAgKi9cbiAgbG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IENvbXBpbGF0aW9uU2NvcGU8RXhwcmVzc2lvbj58bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmxvb2t1cENvbXBpbGF0aW9uU2NvcGVBc1JlZnMobm9kZSk7XG4gICAgcmV0dXJuIHNjb3BlICE9PSBudWxsID8gY29udmVydFNjb3BlVG9FeHByZXNzaW9ucyhzY29wZSwgbm9kZSkgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBTY29wZXNPckRpZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgbmdNb2R1bGVJbXBvcnRlZEZyb206IHN0cmluZ3xudWxsKTpcbiAgICAgIFNlbGVjdG9yU2NvcGVzIHtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmxvb2t1cFNjb3Blcyhub2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbSk7XG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgbm90IGZvdW5kOiAke3JlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgYFNlbGVjdG9yU2NvcGVzYCBmb3IgYSBnaXZlbiBtb2R1bGUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gYXNzdW1lcyB0aGF0IGlmIHRoZSBnaXZlbiBtb2R1bGUgd2FzIGltcG9ydGVkIGZyb20gYW4gYWJzb2x1dGUgcGF0aFxuICAgKiAoYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYCkgdGhlbiBhbGwgb2YgaXRzIGRlY2xhcmF0aW9ucyBhcmUgZXhwb3J0ZWQgYXQgdGhhdCBzYW1lIHBhdGgsIGFzIHdlbGxcbiAgICogYXMgaW1wb3J0cyBhbmQgZXhwb3J0cyBmcm9tIG90aGVyIG1vZHVsZXMgdGhhdCBhcmUgcmVsYXRpdmVseSBpbXBvcnRlZC5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwU2NvcGVzKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwpOiBTZWxlY3RvclNjb3Blc1xuICAgICAgfG51bGwge1xuICAgIGxldCBkYXRhOiBNb2R1bGVEYXRhfG51bGwgPSBudWxsO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgbW9kdWxlIHdhcyBhbmFseXplZCBkaXJlY3RseSwgb3IgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYuXG4gICAgaWYgKHRoaXMuX21vZHVsZVRvRGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIC8vIFRoZSBtb2R1bGUgd2FzIGFuYWx5emVkIGJlZm9yZSwgYW5kIHRodXMgaXRzIGRhdGEgaXMgYXZhaWxhYmxlLlxuICAgICAgZGF0YSA9IHRoaXMuX21vZHVsZVRvRGF0YS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIG1vZHVsZSB3YXNuJ3QgYW5hbHl6ZWQgYmVmb3JlLCBhbmQgcHJvYmFibHkgaGFzIGEgcHJlY29tcGlsZWQgbmdNb2R1bGVEZWYgd2l0aCBhIHR5cGVcbiAgICAgIC8vIGFubm90YXRpb24gdGhhdCBzcGVjaWZpZXMgdGhlIG5lZWRlZCBtZXRhZGF0YS5cbiAgICAgIGRhdGEgPSB0aGlzLl9yZWFkTW9kdWxlRGF0YUZyb21Db21waWxlZENsYXNzKG5vZGUsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKTtcbiAgICAgIC8vIE5vdGUgdGhhdCBkYXRhIGhlcmUgY291bGQgc3RpbGwgYmUgbnVsbCwgaWYgdGhlIGNsYXNzIGRpZG4ndCBoYXZlIGEgcHJlY29tcGlsZWRcbiAgICAgIC8vIG5nTW9kdWxlRGVmLlxuICAgIH1cblxuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29tcGlsYXRpb246IFtcbiAgICAgICAgLi4uZGF0YS5kZWNsYXJhdGlvbnMsXG4gICAgICAgIC8vIEV4cGFuZCBpbXBvcnRzIHRvIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aG9zZSBpbXBvcnRzLlxuICAgICAgICAuLi5mbGF0dGVuKGRhdGEuaW1wb3J0cy5tYXAoXG4gICAgICAgICAgICByZWYgPT4gdGhpcy5sb29rdXBTY29wZXNPckRpZShyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZikpXG4gICAgICAgICAgICAgICAgICAgICAgIC5leHBvcnRlZCkpLFxuICAgICAgICAvLyBBbmQgaW5jbHVkZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgZXhwb3J0ZWQgbW9kdWxlcy5cbiAgICAgICAgLi4uZmxhdHRlbihcbiAgICAgICAgICAgIGRhdGEuZXhwb3J0c1xuICAgICAgICAgICAgICAgIC5tYXAocmVmID0+IHRoaXMubG9va3VwU2NvcGVzKHJlZi5ub2RlIGFzIHRzLkRlY2xhcmF0aW9uLCBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmKSkpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoc2NvcGU6IFNlbGVjdG9yU2NvcGVzIHwgbnVsbCk6IHNjb3BlIGlzIFNlbGVjdG9yU2NvcGVzID0+IHNjb3BlICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5tYXAoc2NvcGUgPT4gc2NvcGUuZXhwb3J0ZWQpKVxuICAgICAgXSxcbiAgICAgIGV4cG9ydGVkOiBmbGF0dGVuKGRhdGEuZXhwb3J0cy5tYXAocmVmID0+IHtcbiAgICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLmxvb2t1cFNjb3BlcyhyZWYubm9kZSBhcyB0cy5EZWNsYXJhdGlvbiwgYWJzb2x1dGVNb2R1bGVOYW1lKHJlZikpO1xuICAgICAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuZXhwb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFtyZWZdO1xuICAgICAgICB9XG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIG1ldGFkYXRhIG9mIGEgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICpcbiAgICogUG90ZW50aWFsbHkgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUgb3Igb3RoZXJ3aXNlIGhhcyBhIG1hbnVhbGx5IGNyZWF0ZWRcbiAgICogbmdDb21wb25lbnREZWYvbmdEaXJlY3RpdmVEZWYuIEluIHRoaXMgY2FzZSwgdGhlIHR5cGUgbWV0YWRhdGEgb2YgdGhhdCBkZWZpbml0aW9uIGlzIHJlYWRcbiAgICogdG8gZGV0ZXJtaW5lIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgbG9va3VwRGlyZWN0aXZlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogU2NvcGVEaXJlY3RpdmU8UmVmZXJlbmNlPnxudWxsIHtcbiAgICBjb25zdCBub2RlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKHJlZi5ub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAodGhpcy5fZGlyZWN0aXZlVG9NZXRhZGF0YS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kaXJlY3RpdmVUb01ldGFkYXRhLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE1ldGFkYXRhRnJvbUNvbXBpbGVkQ2xhc3MocmVmIGFzIFJlZmVyZW5jZTx0cy5DbGFzc0RlY2xhcmF0aW9uPik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb29rdXBQaXBlTmFtZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5fcGlwZVRvTmFtZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9waXBlVG9OYW1lLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZE5hbWVGcm9tQ29tcGlsZWRDbGFzcyhub2RlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVhZCB0aGUgbWV0YWRhdGEgZnJvbSBhIGNsYXNzIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBjb21waWxlZCBzb21laG93IChlaXRoZXIgaXQncyBpbiBhIC5kLnRzXG4gICAqIGZpbGUsIG9yIGluIGEgLnRzIGZpbGUgd2l0aCBhIGhhbmR3cml0dGVuIGRlZmluaXRpb24pLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogdGhlIGNsYXNzIG9mIGludGVyZXN0XG4gICAqIEBwYXJhbSBuZ01vZHVsZUltcG9ydGVkRnJvbSBtb2R1bGUgc3BlY2lmaWVyIG9mIHRoZSBpbXBvcnQgcGF0aCB0byBhc3N1bWUgZm9yIGFsbCBkZWNsYXJhdGlvbnNcbiAgICogc3RlbW1pbmcgZnJvbSB0aGlzIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNb2R1bGVEYXRhRnJvbUNvbXBpbGVkQ2xhc3MoXG4gICAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIG5nTW9kdWxlSW1wb3J0ZWRGcm9tOiBzdHJpbmd8bnVsbCk6IE1vZHVsZURhdGF8bnVsbCB7XG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgZXhwbGljaXRseSBub3QgbWVtb2l6ZWQsIGFzIGl0IGRlcGVuZHMgb24gYG5nTW9kdWxlSW1wb3J0ZWRGcm9tYC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGNhY2hpbmcgb2YgLmQudHMgbW9kdWxlIG1ldGFkYXRhLlxuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ25nTW9kdWxlRGVmJyAmJiBtZW1iZXIuaXNTdGF0aWMpO1xuICAgIGlmIChuZ01vZHVsZURlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IHRoZSBzaGFwZSBvZiB0aGUgbmdNb2R1bGVEZWYgdHlwZSBpcyBjb3JyZWN0LlxuICAgICAgICBuZ01vZHVsZURlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5nTW9kdWxlRGVmLnR5cGUpIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIE1vZHVsZURhdGEgb3V0IG9mIHRoZSB0eXBlIGFyZ3VtZW50cy5cbiAgICBjb25zdCBbXywgZGVjbGFyYXRpb25NZXRhZGF0YSwgaW1wb3J0TWV0YWRhdGEsIGV4cG9ydE1ldGFkYXRhXSA9IG5nTW9kdWxlRGVmLnR5cGUudHlwZUFyZ3VtZW50cztcbiAgICByZXR1cm4ge1xuICAgICAgZGVjbGFyYXRpb25zOiB0aGlzLl9leHRyYWN0UmVmZXJlbmNlc0Zyb21UeXBlKGRlY2xhcmF0aW9uTWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICAgIGV4cG9ydHM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoZXhwb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICAgIGltcG9ydHM6IHRoaXMuX2V4dHJhY3RSZWZlcmVuY2VzRnJvbVR5cGUoaW1wb3J0TWV0YWRhdGEsIG5nTW9kdWxlSW1wb3J0ZWRGcm9tKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2VsZWN0b3IgZnJvbSB0eXBlIG1ldGFkYXRhIGZvciBhIGNsYXNzIHdpdGggYSBwcmVjb21waWxlZCBuZ0NvbXBvbmVudERlZiBvclxuICAgKiBuZ0RpcmVjdGl2ZURlZi5cbiAgICovXG4gIHByaXZhdGUgX3JlYWRNZXRhZGF0YUZyb21Db21waWxlZENsYXNzKHJlZjogUmVmZXJlbmNlPHRzLkNsYXNzRGVjbGFyYXRpb24+KTpcbiAgICAgIFNjb3BlRGlyZWN0aXZlPFJlZmVyZW5jZT58bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSB0cy5nZXRPcmlnaW5hbE5vZGUocmVmLm5vZGUpIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgY29uc3QgZGVmID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopLmZpbmQoXG4gICAgICAgIGZpZWxkID0+XG4gICAgICAgICAgICBmaWVsZC5pc1N0YXRpYyAmJiAoZmllbGQubmFtZSA9PT0gJ25nQ29tcG9uZW50RGVmJyB8fCBmaWVsZC5uYW1lID09PSAnbmdEaXJlY3RpdmVEZWYnKSk7XG4gICAgaWYgKGRlZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBObyBkZWZpbml0aW9uIGNvdWxkIGJlIGZvdW5kLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZGVmLnR5cGUgPT09IG51bGwgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVmLnR5cGUpIHx8XG4gICAgICAgIGRlZi50eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCBkZWYudHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIC8vIFRoZSB0eXBlIG1ldGFkYXRhIHdhcyB0aGUgd3Jvbmcgc2hhcGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc2VsZWN0b3IgPSByZWFkU3RyaW5nVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdKTtcbiAgICBpZiAoc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZWYsXG4gICAgICBuYW1lOiBjbGF6ei5uYW1lICEudGV4dCxcbiAgICAgIGRpcmVjdGl2ZTogcmVmLFxuICAgICAgaXNDb21wb25lbnQ6IGRlZi5uYW1lID09PSAnbmdDb21wb25lbnREZWYnLCBzZWxlY3RvcixcbiAgICAgIGV4cG9ydEFzOiByZWFkU3RyaW5nVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzJdKSxcbiAgICAgIGlucHV0czogcmVhZFN0cmluZ01hcFR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1szXSksXG4gICAgICBvdXRwdXRzOiByZWFkU3RyaW5nTWFwVHlwZShkZWYudHlwZS50eXBlQXJndW1lbnRzWzRdKSxcbiAgICAgIHF1ZXJpZXM6IHJlYWRTdHJpbmdBcnJheVR5cGUoZGVmLnR5cGUudHlwZUFyZ3VtZW50c1s1XSksXG4gICAgICAuLi5leHRyYWN0RGlyZWN0aXZlR3VhcmRzKGNsYXp6LCB0aGlzLnJlZmxlY3RvciksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNlbGVjdG9yIGZyb20gdHlwZSBtZXRhZGF0YSBmb3IgYSBjbGFzcyB3aXRoIGEgcHJlY29tcGlsZWQgbmdDb21wb25lbnREZWYgb3JcbiAgICogbmdEaXJlY3RpdmVEZWYuXG4gICAqL1xuICBwcml2YXRlIF9yZWFkTmFtZUZyb21Db21waWxlZENsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBkZWYgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eikuZmluZChcbiAgICAgICAgZmllbGQgPT4gZmllbGQuaXNTdGF0aWMgJiYgZmllbGQubmFtZSA9PT0gJ25nUGlwZURlZicpO1xuICAgIGlmIChkZWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm8gZGVmaW5pdGlvbiBjb3VsZCBiZSBmb3VuZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGRlZi50eXBlID09PSBudWxsIHx8ICF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlZi50eXBlKSB8fFxuICAgICAgICBkZWYudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVmLnR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHNoYXBlLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZS50eXBlQXJndW1lbnRzWzFdO1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUodHlwZSkgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbCh0eXBlLmxpdGVyYWwpKSB7XG4gICAgICAvLyBUaGUgdHlwZSBtZXRhZGF0YSB3YXMgdGhlIHdyb25nIHR5cGUuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGUubGl0ZXJhbC50ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSBgVHlwZU5vZGVgIHdoaWNoIGlzIGEgdHVwbGUgb2YgcmVmZXJlbmNlcyB0byBvdGhlciB0eXBlcywgYW5kIHJldHVybiBgUmVmZXJlbmNlYHMgdG9cbiAgICogdGhlbS5cbiAgICpcbiAgICogVGhpcyBvcGVyYXRpb24gYXNzdW1lcyB0aGF0IHRoZXNlIHR5cGVzIHNob3VsZCBiZSBpbXBvcnRlZCBmcm9tIGBuZ01vZHVsZUltcG9ydGVkRnJvbWAgdW5sZXNzXG4gICAqIHRoZXkgdGhlbXNlbHZlcyB3ZXJlIGltcG9ydGVkIGZyb20gYW5vdGhlciBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdFJlZmVyZW5jZXNGcm9tVHlwZShkZWY6IHRzLlR5cGVOb2RlLCBuZ01vZHVsZUltcG9ydGVkRnJvbTogc3RyaW5nfG51bGwpOlxuICAgICAgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdIHtcbiAgICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZShkZWYpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBkZWYuZWxlbWVudFR5cGVzLm1hcChlbGVtZW50ID0+IHtcbiAgICAgIGlmICghdHMuaXNUeXBlUXVlcnlOb2RlKGVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVHlwZVF1ZXJ5Tm9kZWApO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGVsZW1lbnQuZXhwck5hbWU7XG4gICAgICBpZiAobmdNb2R1bGVJbXBvcnRlZEZyb20gIT09IG51bGwpIHtcbiAgICAgICAgY29uc3Qge25vZGUsIGZyb219ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAoZnJvbSAhPT0gbnVsbCAmJiAhZnJvbS5zdGFydHNXaXRoKCcuJykgPyBmcm9tIDogbmdNb2R1bGVJbXBvcnRlZEZyb20pO1xuICAgICAgICBjb25zdCBpZCA9IHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVJlZmVyZW5jZShub2RlLCBpZCAhLCBtb2R1bGVOYW1lLCBpZCAhLnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qge25vZGV9ID0gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKHR5cGUsIHRoaXMuY2hlY2tlcik7XG4gICAgICAgIGNvbnN0IGlkID0gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkUmVmZXJlbmNlKG5vZGUsIGlkICEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZsYXR0ZW48VD4oYXJyYXk6IFRbXVtdKTogVFtdIHtcbiAgcmV0dXJuIGFycmF5LnJlZHVjZSgoYWNjdW0sIHN1YkFycmF5KSA9PiB7XG4gICAgYWNjdW0ucHVzaCguLi5zdWJBcnJheSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9LCBbXSBhcyBUW10pO1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZU1vZHVsZU5hbWUocmVmOiBSZWZlcmVuY2UpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICghKHJlZiBpbnN0YW5jZW9mIEFic29sdXRlUmVmZXJlbmNlKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiByZWYubW9kdWxlTmFtZTtcbn1cblxuZnVuY3Rpb24gY29udmVydERpcmVjdGl2ZVJlZmVyZW5jZUxpc3QoXG4gICAgaW5wdXQ6IHtzZWxlY3Rvcjogc3RyaW5nLCBtZXRhOiBTY29wZURpcmVjdGl2ZTxSZWZlcmVuY2U+fVtdLFxuICAgIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiB7c2VsZWN0b3I6IHN0cmluZywgbWV0YTogU2NvcGVEaXJlY3RpdmU8RXhwcmVzc2lvbj59W10ge1xuICByZXR1cm4gaW5wdXQubWFwKCh7c2VsZWN0b3IsIG1ldGF9KSA9PiB7XG4gICAgY29uc3QgZGlyZWN0aXZlID0gbWV0YS5kaXJlY3RpdmUudG9FeHByZXNzaW9uKGNvbnRleHQpO1xuICAgIGlmIChkaXJlY3RpdmUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHdyaXRlIGV4cHJlc3Npb24gdG8gcmVmZXJlbmNlICR7bWV0YS5kaXJlY3RpdmUubm9kZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHtzZWxlY3RvciwgbWV0YTogey4uLm1ldGEsIGRpcmVjdGl2ZX19O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY29udmVydFBpcGVSZWZlcmVuY2VNYXAoXG4gICAgbWFwOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRXhwcmVzc2lvbj4ge1xuICBjb25zdCBuZXdNYXAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbiAgbWFwLmZvckVhY2goKG1ldGEsIHNlbGVjdG9yKSA9PiB7XG4gICAgY29uc3QgcGlwZSA9IG1ldGEudG9FeHByZXNzaW9uKGNvbnRleHQpO1xuICAgIGlmIChwaXBlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB3cml0ZSBleHByZXNzaW9uIHRvIHJlZmVyZW5jZSAke21ldGEubm9kZX1gKTtcbiAgICB9XG4gICAgbmV3TWFwLnNldChzZWxlY3RvciwgcGlwZSk7XG4gIH0pO1xuICByZXR1cm4gbmV3TWFwO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0U2NvcGVUb0V4cHJlc3Npb25zKFxuICAgIHNjb3BlOiBDb21waWxhdGlvblNjb3BlPFJlZmVyZW5jZT4sIGNvbnRleHQ6IHRzLkRlY2xhcmF0aW9uKTogQ29tcGlsYXRpb25TY29wZTxFeHByZXNzaW9uPiB7XG4gIGNvbnN0IHNvdXJjZUNvbnRleHQgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY29udGV4dCkuZ2V0U291cmNlRmlsZSgpO1xuICBjb25zdCBkaXJlY3RpdmVzID0gY29udmVydERpcmVjdGl2ZVJlZmVyZW5jZUxpc3Qoc2NvcGUuZGlyZWN0aXZlcywgc291cmNlQ29udGV4dCk7XG4gIGNvbnN0IHBpcGVzID0gY29udmVydFBpcGVSZWZlcmVuY2VNYXAoc2NvcGUucGlwZXMsIHNvdXJjZUNvbnRleHQpO1xuICBjb25zdCBkZWNsUG9pbnRlciA9IG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oY29udGV4dCk7XG4gIGxldCBjb250YWluc0ZvcndhcmREZWNscyA9IGZhbHNlO1xuICBkaXJlY3RpdmVzLmZvckVhY2goKHtzZWxlY3RvciwgbWV0YX0pID0+IHtcbiAgICBjb250YWluc0ZvcndhcmREZWNscyA9IGNvbnRhaW5zRm9yd2FyZERlY2xzIHx8XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UobWV0YS5kaXJlY3RpdmUsIGRlY2xQb2ludGVyLCBzb3VyY2VDb250ZXh0KTtcbiAgfSk7XG4gICFjb250YWluc0ZvcndhcmREZWNscyAmJiBwaXBlcy5mb3JFYWNoKGV4cHIgPT4ge1xuICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzID1cbiAgICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMgfHwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShleHByLCBkZWNsUG9pbnRlciwgc291cmNlQ29udGV4dCk7XG4gIH0pO1xuICByZXR1cm4ge2RpcmVjdGl2ZXMsIHBpcGVzLCBjb250YWluc0ZvcndhcmREZWNsc307XG59XG5cbmZ1bmN0aW9uIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoXG4gICAgZXhwcjogRXhwcmVzc2lvbiwgY29udGV4dDogdHMuTm9kZSwgY29udGV4dFNvdXJjZTogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICBpZiAoaXNXcmFwcGVkVHNOb2RlRXhwcihleHByKSkge1xuICAgIGNvbnN0IG5vZGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUoZXhwci5ub2RlKTtcbiAgICByZXR1cm4gbm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IGNvbnRleHRTb3VyY2UgJiYgY29udGV4dC5wb3MgPCBub2RlLnBvcztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGlzV3JhcHBlZFRzTm9kZUV4cHIoZXhwcjogRXhwcmVzc2lvbik6IGV4cHIgaXMgV3JhcHBlZE5vZGVFeHByPHRzLk5vZGU+IHtcbiAgcmV0dXJuIGV4cHIgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHI7XG59XG5cbmZ1bmN0aW9uIG1heWJlVW53cmFwTmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnx0cy5JZGVudGlmaWVyIHtcbiAgaWYgKCh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpKSAmJiBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9XG4gIHJldHVybiBkZWNsO1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCF0cy5pc0xpdGVyYWxUeXBlTm9kZSh0eXBlKSB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKHR5cGUubGl0ZXJhbCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gdHlwZS5saXRlcmFsLnRleHQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRTdHJpbmdNYXBUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBpZiAoIXRzLmlzVHlwZUxpdGVyYWxOb2RlKHR5cGUpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIGNvbnN0IG9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgdHlwZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlTaWduYXR1cmUobWVtYmVyKSB8fCBtZW1iZXIudHlwZSA9PT0gdW5kZWZpbmVkIHx8IG1lbWJlci5uYW1lID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXIubmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSByZWFkU3RyaW5nVHlwZShtZW1iZXIudHlwZSk7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgb2JqW21lbWJlci5uYW1lLnRleHRdID0gdmFsdWU7XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiByZWFkU3RyaW5nQXJyYXlUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogc3RyaW5nW10ge1xuICBpZiAoIXRzLmlzVHVwbGVUeXBlTm9kZSh0eXBlKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCByZXM6IHN0cmluZ1tdID0gW107XG4gIHR5cGUuZWxlbWVudFR5cGVzLmZvckVhY2goZWwgPT4ge1xuICAgIGlmICghdHMuaXNMaXRlcmFsVHlwZU5vZGUoZWwpIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwoZWwubGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnB1c2goZWwubGl0ZXJhbC50ZXh0KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iXX0=