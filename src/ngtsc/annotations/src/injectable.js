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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/injectable", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
     */
    var InjectableDecoratorHandler = /** @class */ (function () {
        function InjectableDecoratorHandler(reflector, defaultImportRecorder, isCore, strictCtorDeps, injectableRegistry, 
        /**
         * What to do if the injectable already contains a ɵprov property.
         *
         * If true then an error diagnostic is reported.
         * If false then there is no error and a new ɵprov property is not added.
         */
        errorOnDuplicateProv) {
            if (errorOnDuplicateProv === void 0) { errorOnDuplicateProv = true; }
            this.reflector = reflector;
            this.defaultImportRecorder = defaultImportRecorder;
            this.isCore = isCore;
            this.strictCtorDeps = strictCtorDeps;
            this.injectableRegistry = injectableRegistry;
            this.errorOnDuplicateProv = errorOnDuplicateProv;
            this.precedence = transform_1.HandlerPrecedence.SHARED;
            this.name = InjectableDecoratorHandler.name;
        }
        InjectableDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_1.findAngularDecorator(decorators, 'Injectable', this.isCore);
            if (decorator !== undefined) {
                return {
                    trigger: decorator.node,
                    decorator: decorator,
                    metadata: decorator,
                };
            }
            else {
                return undefined;
            }
        };
        InjectableDecoratorHandler.prototype.analyze = function (node, decorator) {
            var meta = extractInjectableMetadata(node, decorator, this.reflector);
            var decorators = this.reflector.getDecoratorsOfDeclaration(node);
            return {
                analysis: {
                    meta: meta,
                    ctorDeps: extractInjectableCtorDeps(node, meta, decorator, this.reflector, this.defaultImportRecorder, this.isCore, this.strictCtorDeps),
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore),
                    // Avoid generating multiple factories if a class has
                    // more Angular decorators, apart from Injectable.
                    needsFactory: !decorators ||
                        decorators.every(function (current) { return !util_1.isAngularCore(current) || current.name === 'Injectable'; })
                },
            };
        };
        InjectableDecoratorHandler.prototype.register = function (node) { this.injectableRegistry.registerInjectable(node); };
        InjectableDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compileInjectable(analysis.meta);
            var statements = res.statements;
            var results = [];
            if (analysis.needsFactory) {
                var meta = analysis.meta;
                var factoryRes = factory_1.compileNgFactoryDefField({
                    name: meta.name,
                    type: meta.type,
                    internalType: meta.internalType,
                    typeArgumentCount: meta.typeArgumentCount,
                    deps: analysis.ctorDeps,
                    injectFn: compiler_1.Identifiers.inject,
                    target: compiler_1.R3FactoryTarget.Injectable,
                });
                if (analysis.metadataStmt !== null) {
                    factoryRes.statements.push(analysis.metadataStmt);
                }
                results.push(factoryRes);
            }
            var ɵprov = this.reflector.getMembersOfClass(node).find(function (member) { return member.name === 'ɵprov'; });
            if (ɵprov !== undefined && this.errorOnDuplicateProv) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.INJECTABLE_DUPLICATE_PROV, ɵprov.nameNode || ɵprov.node || node, 'Injectables cannot contain a static ɵprov property, because the compiler is going to generate one.');
            }
            if (ɵprov === undefined) {
                // Only add a new ɵprov if there is not one already
                results.push({ name: 'ɵprov', initializer: res.expression, statements: statements, type: res.type });
            }
            return results;
        };
        return InjectableDecoratorHandler;
    }());
    exports.InjectableDecoratorHandler = InjectableDecoratorHandler;
    /**
     * Read metadata from the `@Injectable` decorator and produce the `IvyInjectableMetadata`, the
     * input metadata needed to run `compileIvyInjectable`.
     *
     * A `null` return value indicates this is @Injectable has invalid data.
     */
    function extractInjectableMetadata(clazz, decorator, reflector) {
        var name = clazz.name.text;
        var type = util_1.wrapTypeReference(reflector, clazz);
        var internalType = new compiler_1.WrappedNodeExpr(reflector.getInternalNameOfClass(clazz));
        var typeArgumentCount = reflector.getGenericArityOfClass(clazz) || 0;
        if (decorator.args === null) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), '@Injectable must be called');
        }
        if (decorator.args.length === 0) {
            return {
                name: name,
                type: type,
                typeArgumentCount: typeArgumentCount,
                internalType: internalType,
                providedIn: new compiler_1.LiteralExpr(null),
            };
        }
        else if (decorator.args.length === 1) {
            var metaNode = decorator.args[0];
            // Firstly make sure the decorator argument is an inline literal - if not, it's illegal to
            // transport references from one location to another. This is the problem that lowering
            // used to solve - if this restriction proves too undesirable we can re-implement lowering.
            if (!ts.isObjectLiteralExpression(metaNode)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, metaNode, "@Injectable argument must be an object literal");
            }
            // Resolve the fields of the literal into a map of field name to expression.
            var meta = reflection_1.reflectObjectLiteral(metaNode);
            var providedIn = new compiler_1.LiteralExpr(null);
            if (meta.has('providedIn')) {
                providedIn = new compiler_1.WrappedNodeExpr(meta.get('providedIn'));
            }
            var userDeps = undefined;
            if ((meta.has('useClass') || meta.has('useFactory')) && meta.has('deps')) {
                var depsExpr = meta.get('deps');
                if (!ts.isArrayLiteralExpression(depsExpr)) {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_NOT_LITERAL, depsExpr, "@Injectable deps metadata must be an inline array");
                }
                userDeps = depsExpr.elements.map(function (dep) { return getDep(dep, reflector); });
            }
            if (meta.has('useValue')) {
                return {
                    name: name,
                    type: type,
                    typeArgumentCount: typeArgumentCount,
                    internalType: internalType,
                    providedIn: providedIn,
                    useValue: new compiler_1.WrappedNodeExpr(util_1.unwrapForwardRef(meta.get('useValue'), reflector)),
                };
            }
            else if (meta.has('useExisting')) {
                return {
                    name: name,
                    type: type,
                    typeArgumentCount: typeArgumentCount,
                    internalType: internalType,
                    providedIn: providedIn,
                    useExisting: new compiler_1.WrappedNodeExpr(util_1.unwrapForwardRef(meta.get('useExisting'), reflector)),
                };
            }
            else if (meta.has('useClass')) {
                return {
                    name: name,
                    type: type,
                    typeArgumentCount: typeArgumentCount,
                    internalType: internalType,
                    providedIn: providedIn,
                    useClass: new compiler_1.WrappedNodeExpr(util_1.unwrapForwardRef(meta.get('useClass'), reflector)),
                    userDeps: userDeps,
                };
            }
            else if (meta.has('useFactory')) {
                // useFactory is special - the 'deps' property must be analyzed.
                var factory = new compiler_1.WrappedNodeExpr(meta.get('useFactory'));
                return {
                    name: name,
                    type: type,
                    typeArgumentCount: typeArgumentCount,
                    internalType: internalType,
                    providedIn: providedIn,
                    useFactory: factory, userDeps: userDeps,
                };
            }
            else {
                return { name: name, type: type, typeArgumentCount: typeArgumentCount, internalType: internalType, providedIn: providedIn };
            }
        }
        else {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], 'Too many arguments to @Injectable');
        }
    }
    function extractInjectableCtorDeps(clazz, meta, decorator, reflector, defaultImportRecorder, isCore, strictCtorDeps) {
        if (decorator.args === null) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), '@Injectable must be called');
        }
        var ctorDeps = null;
        if (decorator.args.length === 0) {
            // Ideally, using @Injectable() would have the same effect as using @Injectable({...}), and be
            // subject to the same validation. However, existing Angular code abuses @Injectable, applying
            // it to things like abstract classes with constructors that were never meant for use with
            // Angular's DI.
            //
            // To deal with this, @Injectable() without an argument is more lenient, and if the
            // constructor signature does not work for DI then a factory definition (ɵfac) that throws is
            // generated.
            if (strictCtorDeps) {
                ctorDeps = util_1.getValidConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore);
            }
            else {
                ctorDeps = util_1.unwrapConstructorDependencies(util_1.getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore));
            }
            return ctorDeps;
        }
        else if (decorator.args.length === 1) {
            var rawCtorDeps = util_1.getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore);
            if (strictCtorDeps && meta.useValue === undefined && meta.useExisting === undefined &&
                meta.useClass === undefined && meta.useFactory === undefined) {
                // Since use* was not provided, validate the deps according to strictCtorDeps.
                ctorDeps = util_1.validateConstructorDependencies(clazz, rawCtorDeps);
            }
            else {
                ctorDeps = util_1.unwrapConstructorDependencies(rawCtorDeps);
            }
        }
        return ctorDeps;
    }
    function getDep(dep, reflector) {
        var meta = {
            token: new compiler_1.WrappedNodeExpr(dep),
            attribute: null,
            host: false,
            resolved: compiler_1.R3ResolvedDependencyType.Token,
            optional: false,
            self: false,
            skipSelf: false,
        };
        function maybeUpdateDecorator(dec, reflector, token) {
            var source = reflector.getImportOfIdentifier(dec);
            if (source === null || source.from !== '@angular/core') {
                return;
            }
            switch (source.name) {
                case 'Inject':
                    if (token !== undefined) {
                        meta.token = new compiler_1.WrappedNodeExpr(token);
                    }
                    break;
                case 'Optional':
                    meta.optional = true;
                    break;
                case 'SkipSelf':
                    meta.skipSelf = true;
                    break;
                case 'Self':
                    meta.self = true;
                    break;
            }
        }
        if (ts.isArrayLiteralExpression(dep)) {
            dep.elements.forEach(function (el) {
                if (ts.isIdentifier(el)) {
                    maybeUpdateDecorator(el, reflector);
                }
                else if (ts.isNewExpression(el) && ts.isIdentifier(el.expression)) {
                    var token = el.arguments && el.arguments.length > 0 && el.arguments[0] || undefined;
                    maybeUpdateDecorator(el.expression, reflector, token);
                }
            });
        }
        return meta;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcU87SUFDck8sK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUdsRSx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQTZOO0lBUzdOOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLHFCQUE0QyxFQUMvRSxNQUFlLEVBQVUsY0FBdUIsRUFDaEQsa0JBQTJDO1FBQ25EOzs7OztXQUtHO1FBQ0ssb0JBQTJCO1lBQTNCLHFDQUFBLEVBQUEsMkJBQTJCO1lBVDNCLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUMvRSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQVM7WUFDaEQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUF5QjtZQU8zQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQU87WUFFOUIsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUN0QyxTQUFJLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDO1FBSE4sQ0FBQztRQUszQywyQ0FBTSxHQUFOLFVBQU8sSUFBc0IsRUFBRSxVQUE0QjtZQUN6RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUUsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO2dC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RUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2lCQUNyQztxQkFBTSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ25FLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO29CQUN0RixvQkFBb0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDdkQ7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIElkZW50aWZpZXJzLCBMaXRlcmFsRXhwciwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzRmFjdG9yeVRhcmdldCwgUjNJbmplY3RhYmxlTWV0YWRhdGEsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RhYmxlIGFzIGNvbXBpbGVJdnlJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luamVjdGFibGVDbGFzc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7ZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRm9yd2FyZFJlZiwgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5qZWN0YWJsZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsO1xuICBuZWVkc0ZhY3Rvcnk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQWRhcHRzIHRoZSBgY29tcGlsZUl2eUluamVjdGFibGVgIGNvbXBpbGVyIGZvciBgQEluamVjdGFibGVgIGRlY29yYXRvcnMgdG8gdGhlIEl2eSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgSW5qZWN0YWJsZUhhbmRsZXJEYXRhLCB1bmtub3duPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksXG4gICAgICAvKipcbiAgICAgICAqIFdoYXQgdG8gZG8gaWYgdGhlIGluamVjdGFibGUgYWxyZWFkeSBjb250YWlucyBhIMm1cHJvdiBwcm9wZXJ0eS5cbiAgICAgICAqXG4gICAgICAgKiBJZiB0cnVlIHRoZW4gYW4gZXJyb3IgZGlhZ25vc3RpYyBpcyByZXBvcnRlZC5cbiAgICAgICAqIElmIGZhbHNlIHRoZW4gdGhlcmUgaXMgbm8gZXJyb3IgYW5kIGEgbmV3IMm1cHJvdiBwcm9wZXJ0eSBpcyBub3QgYWRkZWQuXG4gICAgICAgKi9cbiAgICAgIHByaXZhdGUgZXJyb3JPbkR1cGxpY2F0ZVByb3YgPSB0cnVlKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5TSEFSRUQ7XG4gIHJlYWRvbmx5IG5hbWUgPSBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdJbmplY3RhYmxlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGRlY29yYXRvcjogZGVjb3JhdG9yLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6XG4gICAgICBBbmFseXNpc091dHB1dDxJbmplY3RhYmxlSGFuZGxlckRhdGE+IHtcbiAgICBjb25zdCBtZXRhID0gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yKTtcbiAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YSxcbiAgICAgICAgY3RvckRlcHM6IGV4dHJhY3RJbmplY3RhYmxlQ3RvckRlcHMoXG4gICAgICAgICAgICBub2RlLCBtZXRhLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgICB0aGlzLnN0cmljdEN0b3JEZXBzKSxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICAgIC8vIEF2b2lkIGdlbmVyYXRpbmcgbXVsdGlwbGUgZmFjdG9yaWVzIGlmIGEgY2xhc3MgaGFzXG4gICAgICAgIC8vIG1vcmUgQW5ndWxhciBkZWNvcmF0b3JzLCBhcGFydCBmcm9tIEluamVjdGFibGUuXG4gICAgICAgIG5lZWRzRmFjdG9yeTogIWRlY29yYXRvcnMgfHxcbiAgICAgICAgICAgIGRlY29yYXRvcnMuZXZlcnkoY3VycmVudCA9PiAhaXNBbmd1bGFyQ29yZShjdXJyZW50KSB8fCBjdXJyZW50Lm5hbWUgPT09ICdJbmplY3RhYmxlJylcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHsgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpOyB9XG5cbiAgY29tcGlsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8SW5qZWN0YWJsZUhhbmRsZXJEYXRhPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZUl2eUluamVjdGFibGUoYW5hbHlzaXMubWV0YSk7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHJlcy5zdGF0ZW1lbnRzO1xuICAgIGNvbnN0IHJlc3VsdHM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuXG4gICAgaWYgKGFuYWx5c2lzLm5lZWRzRmFjdG9yeSkge1xuICAgICAgY29uc3QgbWV0YSA9IGFuYWx5c2lzLm1ldGE7XG4gICAgICBjb25zdCBmYWN0b3J5UmVzID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHtcbiAgICAgICAgbmFtZTogbWV0YS5uYW1lLFxuICAgICAgICB0eXBlOiBtZXRhLnR5cGUsXG4gICAgICAgIGludGVybmFsVHlwZTogbWV0YS5pbnRlcm5hbFR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50OiBtZXRhLnR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBkZXBzOiBhbmFseXNpcy5jdG9yRGVwcyxcbiAgICAgICAgaW5qZWN0Rm46IElkZW50aWZpZXJzLmluamVjdCxcbiAgICAgICAgdGFyZ2V0OiBSM0ZhY3RvcnlUYXJnZXQuSW5qZWN0YWJsZSxcbiAgICAgIH0pO1xuICAgICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgICBmYWN0b3J5UmVzLnN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgICAgfVxuICAgICAgcmVzdWx0cy5wdXNoKGZhY3RvcnlSZXMpO1xuICAgIH1cblxuICAgIGNvbnN0IMm1cHJvdiA9IHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKG5vZGUpLmZpbmQobWVtYmVyID0+IG1lbWJlci5uYW1lID09PSAnybVwcm92Jyk7XG4gICAgaWYgKMm1cHJvdiAhPT0gdW5kZWZpbmVkICYmIHRoaXMuZXJyb3JPbkR1cGxpY2F0ZVByb3YpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuSU5KRUNUQUJMRV9EVVBMSUNBVEVfUFJPViwgybVwcm92Lm5hbWVOb2RlIHx8IMm1cHJvdi5ub2RlIHx8IG5vZGUsXG4gICAgICAgICAgJ0luamVjdGFibGVzIGNhbm5vdCBjb250YWluIGEgc3RhdGljIMm1cHJvdiBwcm9wZXJ0eSwgYmVjYXVzZSB0aGUgY29tcGlsZXIgaXMgZ29pbmcgdG8gZ2VuZXJhdGUgb25lLicpO1xuICAgIH1cblxuICAgIGlmICjJtXByb3YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gT25seSBhZGQgYSBuZXcgybVwcm92IGlmIHRoZXJlIGlzIG5vdCBvbmUgYWxyZWFkeVxuICAgICAgcmVzdWx0cy5wdXNoKHtuYW1lOiAnybVwcm92JywgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLCBzdGF0ZW1lbnRzLCB0eXBlOiByZXMudHlwZX0pO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkIG1ldGFkYXRhIGZyb20gdGhlIGBASW5qZWN0YWJsZWAgZGVjb3JhdG9yIGFuZCBwcm9kdWNlIHRoZSBgSXZ5SW5qZWN0YWJsZU1ldGFkYXRhYCwgdGhlXG4gKiBpbnB1dCBtZXRhZGF0YSBuZWVkZWQgdG8gcnVuIGBjb21waWxlSXZ5SW5qZWN0YWJsZWAuXG4gKlxuICogQSBgbnVsbGAgcmV0dXJuIHZhbHVlIGluZGljYXRlcyB0aGlzIGlzIEBJbmplY3RhYmxlIGhhcyBpbnZhbGlkIGRhdGEuXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBSM0luamVjdGFibGVNZXRhZGF0YSB7XG4gIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3IsIGNsYXp6KTtcbiAgY29uc3QgaW50ZXJuYWxUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6eikpO1xuICBjb25zdCB0eXBlQXJndW1lbnRDb3VudCA9IHJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwO1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAnQEluamVjdGFibGUgbXVzdCBiZSBjYWxsZWQnKTtcbiAgfVxuICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlLFxuICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICBwcm92aWRlZEluOiBuZXcgTGl0ZXJhbEV4cHIobnVsbCksXG4gICAgfTtcbiAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBtZXRhTm9kZSA9IGRlY29yYXRvci5hcmdzWzBdO1xuICAgIC8vIEZpcnN0bHkgbWFrZSBzdXJlIHRoZSBkZWNvcmF0b3IgYXJndW1lbnQgaXMgYW4gaW5saW5lIGxpdGVyYWwgLSBpZiBub3QsIGl0J3MgaWxsZWdhbCB0b1xuICAgIC8vIHRyYW5zcG9ydCByZWZlcmVuY2VzIGZyb20gb25lIGxvY2F0aW9uIHRvIGFub3RoZXIuIFRoaXMgaXMgdGhlIHByb2JsZW0gdGhhdCBsb3dlcmluZ1xuICAgIC8vIHVzZWQgdG8gc29sdmUgLSBpZiB0aGlzIHJlc3RyaWN0aW9uIHByb3ZlcyB0b28gdW5kZXNpcmFibGUgd2UgY2FuIHJlLWltcGxlbWVudCBsb3dlcmluZy5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YU5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGFOb2RlLFxuICAgICAgICAgIGBASW5qZWN0YWJsZSBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gICAgfVxuXG4gICAgLy8gUmVzb2x2ZSB0aGUgZmllbGRzIG9mIHRoZSBsaXRlcmFsIGludG8gYSBtYXAgb2YgZmllbGQgbmFtZSB0byBleHByZXNzaW9uLlxuICAgIGNvbnN0IG1ldGEgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhTm9kZSk7XG4gICAgbGV0IHByb3ZpZGVkSW46IEV4cHJlc3Npb24gPSBuZXcgTGl0ZXJhbEV4cHIobnVsbCk7XG4gICAgaWYgKG1ldGEuaGFzKCdwcm92aWRlZEluJykpIHtcbiAgICAgIHByb3ZpZGVkSW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCdwcm92aWRlZEluJykgISk7XG4gICAgfVxuXG4gICAgbGV0IHVzZXJEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKG1ldGEuaGFzKCd1c2VDbGFzcycpIHx8IG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpICYmIG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgIGNvbnN0IGRlcHNFeHByID0gbWV0YS5nZXQoJ2RlcHMnKSAhO1xuICAgICAgaWYgKCF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwc0V4cHIpKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9OT1RfTElURVJBTCwgZGVwc0V4cHIsXG4gICAgICAgICAgICBgQEluamVjdGFibGUgZGVwcyBtZXRhZGF0YSBtdXN0IGJlIGFuIGlubGluZSBhcnJheWApO1xuICAgICAgfVxuICAgICAgdXNlckRlcHMgPSBkZXBzRXhwci5lbGVtZW50cy5tYXAoZGVwID0+IGdldERlcChkZXAsIHJlZmxlY3RvcikpO1xuICAgIH1cblxuICAgIGlmIChtZXRhLmhhcygndXNlVmFsdWUnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIGludGVybmFsVHlwZSxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlVmFsdWU6IG5ldyBXcmFwcGVkTm9kZUV4cHIodW53cmFwRm9yd2FyZFJlZihtZXRhLmdldCgndXNlVmFsdWUnKSAhLCByZWZsZWN0b3IpKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRXhpc3RpbmcnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIGludGVybmFsVHlwZSxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlRXhpc3Rpbmc6IG5ldyBXcmFwcGVkTm9kZUV4cHIodW53cmFwRm9yd2FyZFJlZihtZXRhLmdldCgndXNlRXhpc3RpbmcnKSAhLCByZWZsZWN0b3IpKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlQ2xhc3MnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIGludGVybmFsVHlwZSxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlQ2xhc3M6IG5ldyBXcmFwcGVkTm9kZUV4cHIodW53cmFwRm9yd2FyZFJlZihtZXRhLmdldCgndXNlQ2xhc3MnKSAhLCByZWZsZWN0b3IpKSxcbiAgICAgICAgdXNlckRlcHMsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUZhY3RvcnknKSkge1xuICAgICAgLy8gdXNlRmFjdG9yeSBpcyBzcGVjaWFsIC0gdGhlICdkZXBzJyBwcm9wZXJ0eSBtdXN0IGJlIGFuYWx5emVkLlxuICAgICAgY29uc3QgZmFjdG9yeSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUZhY3RvcnknKSAhKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZUZhY3Rvcnk6IGZhY3RvcnksIHVzZXJEZXBzLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCB0eXBlQXJndW1lbnRDb3VudCwgaW50ZXJuYWxUeXBlLCBwcm92aWRlZElufTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3IuYXJnc1syXSwgJ1RvbyBtYW55IGFyZ3VtZW50cyB0byBASW5qZWN0YWJsZScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RJbmplY3RhYmxlQ3RvckRlcHMoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIG1ldGE6IFIzSW5qZWN0YWJsZU1ldGFkYXRhLCBkZWNvcmF0b3I6IERlY29yYXRvcixcbiAgICByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuLFxuICAgIHN0cmljdEN0b3JEZXBzOiBib29sZWFuKSB7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICdASW5qZWN0YWJsZSBtdXN0IGJlIGNhbGxlZCcpO1xuICB9XG5cbiAgbGV0IGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsID0gbnVsbDtcblxuICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gSWRlYWxseSwgdXNpbmcgQEluamVjdGFibGUoKSB3b3VsZCBoYXZlIHRoZSBzYW1lIGVmZmVjdCBhcyB1c2luZyBASW5qZWN0YWJsZSh7Li4ufSksIGFuZCBiZVxuICAgIC8vIHN1YmplY3QgdG8gdGhlIHNhbWUgdmFsaWRhdGlvbi4gSG93ZXZlciwgZXhpc3RpbmcgQW5ndWxhciBjb2RlIGFidXNlcyBASW5qZWN0YWJsZSwgYXBwbHlpbmdcbiAgICAvLyBpdCB0byB0aGluZ3MgbGlrZSBhYnN0cmFjdCBjbGFzc2VzIHdpdGggY29uc3RydWN0b3JzIHRoYXQgd2VyZSBuZXZlciBtZWFudCBmb3IgdXNlIHdpdGhcbiAgICAvLyBBbmd1bGFyJ3MgREkuXG4gICAgLy9cbiAgICAvLyBUbyBkZWFsIHdpdGggdGhpcywgQEluamVjdGFibGUoKSB3aXRob3V0IGFuIGFyZ3VtZW50IGlzIG1vcmUgbGVuaWVudCwgYW5kIGlmIHRoZVxuICAgIC8vIGNvbnN0cnVjdG9yIHNpZ25hdHVyZSBkb2VzIG5vdCB3b3JrIGZvciBESSB0aGVuIGEgZmFjdG9yeSBkZWZpbml0aW9uICjJtWZhYykgdGhhdCB0aHJvd3MgaXNcbiAgICAvLyBnZW5lcmF0ZWQuXG4gICAgaWYgKHN0cmljdEN0b3JEZXBzKSB7XG4gICAgICBjdG9yRGVwcyA9IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yRGVwcyA9IHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0b3JEZXBzO1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IHJhd0N0b3JEZXBzID0gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpO1xuXG4gICAgaWYgKHN0cmljdEN0b3JEZXBzICYmIG1ldGEudXNlVmFsdWUgPT09IHVuZGVmaW5lZCAmJiBtZXRhLnVzZUV4aXN0aW5nID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgbWV0YS51c2VDbGFzcyA9PT0gdW5kZWZpbmVkICYmIG1ldGEudXNlRmFjdG9yeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaW5jZSB1c2UqIHdhcyBub3QgcHJvdmlkZWQsIHZhbGlkYXRlIHRoZSBkZXBzIGFjY29yZGluZyB0byBzdHJpY3RDdG9yRGVwcy5cbiAgICAgIGN0b3JEZXBzID0gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmF3Q3RvckRlcHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yRGVwcyA9IHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKHJhd0N0b3JEZXBzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY3RvckRlcHM7XG59XG5cbmZ1bmN0aW9uIGdldERlcChkZXA6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSB7XG4gIGNvbnN0IG1ldGE6IFIzRGVwZW5kZW5jeU1ldGFkYXRhID0ge1xuICAgIHRva2VuOiBuZXcgV3JhcHBlZE5vZGVFeHByKGRlcCksXG4gICAgYXR0cmlidXRlOiBudWxsLFxuICAgIGhvc3Q6IGZhbHNlLFxuICAgIHJlc29sdmVkOiBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW4sXG4gICAgb3B0aW9uYWw6IGZhbHNlLFxuICAgIHNlbGY6IGZhbHNlLFxuICAgIHNraXBTZWxmOiBmYWxzZSxcbiAgfTtcblxuICBmdW5jdGlvbiBtYXliZVVwZGF0ZURlY29yYXRvcihcbiAgICAgIGRlYzogdHMuSWRlbnRpZmllciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgdG9rZW4/OiB0cy5FeHByZXNzaW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc291cmNlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWMpO1xuICAgIGlmIChzb3VyY2UgPT09IG51bGwgfHwgc291cmNlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzd2l0Y2ggKHNvdXJjZS5uYW1lKSB7XG4gICAgICBjYXNlICdJbmplY3QnOlxuICAgICAgICBpZiAodG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1ldGEudG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ09wdGlvbmFsJzpcbiAgICAgICAgbWV0YS5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2tpcFNlbGYnOlxuICAgICAgICBtZXRhLnNraXBTZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTZWxmJzpcbiAgICAgICAgbWV0YS5zZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXApKSB7XG4gICAgZGVwLmVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihlbCkpIHtcbiAgICAgICAgbWF5YmVVcGRhdGVEZWNvcmF0b3IoZWwsIHJlZmxlY3Rvcik7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzTmV3RXhwcmVzc2lvbihlbCkgJiYgdHMuaXNJZGVudGlmaWVyKGVsLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gZWwuYXJndW1lbnRzICYmIGVsLmFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGVsLmFyZ3VtZW50c1swXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLmV4cHJlc3Npb24sIHJlZmxlY3RvciwgdG9rZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBtZXRhO1xufVxuIl19