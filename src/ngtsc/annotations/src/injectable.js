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
     * input
     * metadata needed to run `compileIvyInjectable`.
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
                throw new Error("In Ivy, decorator metadata must be inline.");
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
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_NOT_LITERAL, depsExpr, "In Ivy, deps metadata must be an inline array.");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcU87SUFDck8sK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUdsRSx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQTZOO0lBUzdOOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLHFCQUE0QyxFQUMvRSxNQUFlLEVBQVUsY0FBdUIsRUFDaEQsa0JBQTJDO1FBQ25EOzs7OztXQUtHO1FBQ0ssb0JBQTJCO1lBQTNCLHFDQUFBLEVBQUEsMkJBQTJCO1lBVDNCLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUMvRSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQVM7WUFDaEQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUF5QjtZQU8zQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQU87WUFFOUIsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUN0QyxTQUFJLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDO1FBSE4sQ0FBQztRQUszQywyQ0FBTSxHQUFOLFVBQU8sSUFBc0IsRUFBRSxVQUE0QjtZQUN6RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUUsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO2dC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RUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ25FLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO29CQUN0RixvQkFBb0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDdkQ7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIElkZW50aWZpZXJzLCBMaXRlcmFsRXhwciwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzRmFjdG9yeVRhcmdldCwgUjNJbmplY3RhYmxlTWV0YWRhdGEsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RhYmxlIGFzIGNvbXBpbGVJdnlJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luamVjdGFibGVDbGFzc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7ZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRm9yd2FyZFJlZiwgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5qZWN0YWJsZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsO1xuICBuZWVkc0ZhY3Rvcnk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQWRhcHRzIHRoZSBgY29tcGlsZUl2eUluamVjdGFibGVgIGNvbXBpbGVyIGZvciBgQEluamVjdGFibGVgIGRlY29yYXRvcnMgdG8gdGhlIEl2eSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgSW5qZWN0YWJsZUhhbmRsZXJEYXRhLCB1bmtub3duPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksXG4gICAgICAvKipcbiAgICAgICAqIFdoYXQgdG8gZG8gaWYgdGhlIGluamVjdGFibGUgYWxyZWFkeSBjb250YWlucyBhIMm1cHJvdiBwcm9wZXJ0eS5cbiAgICAgICAqXG4gICAgICAgKiBJZiB0cnVlIHRoZW4gYW4gZXJyb3IgZGlhZ25vc3RpYyBpcyByZXBvcnRlZC5cbiAgICAgICAqIElmIGZhbHNlIHRoZW4gdGhlcmUgaXMgbm8gZXJyb3IgYW5kIGEgbmV3IMm1cHJvdiBwcm9wZXJ0eSBpcyBub3QgYWRkZWQuXG4gICAgICAgKi9cbiAgICAgIHByaXZhdGUgZXJyb3JPbkR1cGxpY2F0ZVByb3YgPSB0cnVlKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5TSEFSRUQ7XG4gIHJlYWRvbmx5IG5hbWUgPSBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdJbmplY3RhYmxlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTpcbiAgICAgIEFuYWx5c2lzT3V0cHV0PEluamVjdGFibGVIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IG1ldGEgPSBleHRyYWN0SW5qZWN0YWJsZU1ldGFkYXRhKG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBtZXRhLFxuICAgICAgICBjdG9yRGVwczogZXh0cmFjdEluamVjdGFibGVDdG9yRGVwcyhcbiAgICAgICAgICAgIG5vZGUsIG1ldGEsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuc3RyaWN0Q3RvckRlcHMpLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgLy8gQXZvaWQgZ2VuZXJhdGluZyBtdWx0aXBsZSBmYWN0b3JpZXMgaWYgYSBjbGFzcyBoYXNcbiAgICAgICAgLy8gbW9yZSBBbmd1bGFyIGRlY29yYXRvcnMsIGFwYXJ0IGZyb20gSW5qZWN0YWJsZS5cbiAgICAgICAgbmVlZHNGYWN0b3J5OiAhZGVjb3JhdG9ycyB8fFxuICAgICAgICAgICAgZGVjb3JhdG9ycy5ldmVyeShjdXJyZW50ID0+ICFpc0FuZ3VsYXJDb3JlKGN1cnJlbnQpIHx8IGN1cnJlbnQubmFtZSA9PT0gJ0luamVjdGFibGUnKVxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQgeyB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7IH1cblxuICBjb21waWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxJbmplY3RhYmxlSGFuZGxlckRhdGE+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlSXZ5SW5qZWN0YWJsZShhbmFseXNpcy5tZXRhKTtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gcmVzLnN0YXRlbWVudHM7XG4gICAgY29uc3QgcmVzdWx0czogQ29tcGlsZVJlc3VsdFtdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMubmVlZHNGYWN0b3J5KSB7XG4gICAgICBjb25zdCBtZXRhID0gYW5hbHlzaXMubWV0YTtcbiAgICAgIGNvbnN0IGZhY3RvcnlSZXMgPSBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQoe1xuICAgICAgICBuYW1lOiBtZXRhLm5hbWUsXG4gICAgICAgIHR5cGU6IG1ldGEudHlwZSxcbiAgICAgICAgaW50ZXJuYWxUeXBlOiBtZXRhLmludGVybmFsVHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQ6IG1ldGEudHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIGRlcHM6IGFuYWx5c2lzLmN0b3JEZXBzLFxuICAgICAgICBpbmplY3RGbjogSWRlbnRpZmllcnMuaW5qZWN0LFxuICAgICAgICB0YXJnZXQ6IFIzRmFjdG9yeVRhcmdldC5JbmplY3RhYmxlLFxuICAgICAgfSk7XG4gICAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICAgIGZhY3RvcnlSZXMuc3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgICB9XG4gICAgICByZXN1bHRzLnB1c2goZmFjdG9yeVJlcyk7XG4gICAgfVxuXG4gICAgY29uc3QgybVwcm92ID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3Mobm9kZSkuZmluZChtZW1iZXIgPT4gbWVtYmVyLm5hbWUgPT09ICfJtXByb3YnKTtcbiAgICBpZiAoybVwcm92ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5lcnJvck9uRHVwbGljYXRlUHJvdikge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5JTkpFQ1RBQkxFX0RVUExJQ0FURV9QUk9WLCDJtXByb3YubmFtZU5vZGUgfHwgybVwcm92Lm5vZGUgfHwgbm9kZSxcbiAgICAgICAgICAnSW5qZWN0YWJsZXMgY2Fubm90IGNvbnRhaW4gYSBzdGF0aWMgybVwcm92IHByb3BlcnR5LCBiZWNhdXNlIHRoZSBjb21waWxlciBpcyBnb2luZyB0byBnZW5lcmF0ZSBvbmUuJyk7XG4gICAgfVxuXG4gICAgaWYgKMm1cHJvdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBPbmx5IGFkZCBhIG5ldyDJtXByb3YgaWYgdGhlcmUgaXMgbm90IG9uZSBhbHJlYWR5XG4gICAgICByZXN1bHRzLnB1c2goe25hbWU6ICfJtXByb3YnLCBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHMsIHR5cGU6IHJlcy50eXBlfSk7XG4gICAgfVxuXG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxufVxuXG4vKipcbiAqIFJlYWQgbWV0YWRhdGEgZnJvbSB0aGUgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3IgYW5kIHByb2R1Y2UgdGhlIGBJdnlJbmplY3RhYmxlTWV0YWRhdGFgLCB0aGVcbiAqIGlucHV0XG4gKiBtZXRhZGF0YSBuZWVkZWQgdG8gcnVuIGBjb21waWxlSXZ5SW5qZWN0YWJsZWAuXG4gKlxuICogQSBgbnVsbGAgcmV0dXJuIHZhbHVlIGluZGljYXRlcyB0aGlzIGlzIEBJbmplY3RhYmxlIGhhcyBpbnZhbGlkIGRhdGEuXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBSM0luamVjdGFibGVNZXRhZGF0YSB7XG4gIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3IsIGNsYXp6KTtcbiAgY29uc3QgaW50ZXJuYWxUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6eikpO1xuICBjb25zdCB0eXBlQXJndW1lbnRDb3VudCA9IHJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwO1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAnQEluamVjdGFibGUgbXVzdCBiZSBjYWxsZWQnKTtcbiAgfVxuICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlLFxuICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICBwcm92aWRlZEluOiBuZXcgTGl0ZXJhbEV4cHIobnVsbCksXG4gICAgfTtcbiAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBtZXRhTm9kZSA9IGRlY29yYXRvci5hcmdzWzBdO1xuICAgIC8vIEZpcnN0bHkgbWFrZSBzdXJlIHRoZSBkZWNvcmF0b3IgYXJndW1lbnQgaXMgYW4gaW5saW5lIGxpdGVyYWwgLSBpZiBub3QsIGl0J3MgaWxsZWdhbCB0b1xuICAgIC8vIHRyYW5zcG9ydCByZWZlcmVuY2VzIGZyb20gb25lIGxvY2F0aW9uIHRvIGFub3RoZXIuIFRoaXMgaXMgdGhlIHByb2JsZW0gdGhhdCBsb3dlcmluZ1xuICAgIC8vIHVzZWQgdG8gc29sdmUgLSBpZiB0aGlzIHJlc3RyaWN0aW9uIHByb3ZlcyB0b28gdW5kZXNpcmFibGUgd2UgY2FuIHJlLWltcGxlbWVudCBsb3dlcmluZy5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YU5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluIEl2eSwgZGVjb3JhdG9yIG1ldGFkYXRhIG11c3QgYmUgaW5saW5lLmApO1xuICAgIH1cblxuICAgIC8vIFJlc29sdmUgdGhlIGZpZWxkcyBvZiB0aGUgbGl0ZXJhbCBpbnRvIGEgbWFwIG9mIGZpZWxkIG5hbWUgdG8gZXhwcmVzc2lvbi5cbiAgICBjb25zdCBtZXRhID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YU5vZGUpO1xuICAgIGxldCBwcm92aWRlZEluOiBFeHByZXNzaW9uID0gbmV3IExpdGVyYWxFeHByKG51bGwpO1xuICAgIGlmIChtZXRhLmhhcygncHJvdmlkZWRJbicpKSB7XG4gICAgICBwcm92aWRlZEluID0gbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgncHJvdmlkZWRJbicpICEpO1xuICAgIH1cblxuICAgIGxldCB1c2VyRGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKChtZXRhLmhhcygndXNlQ2xhc3MnKSB8fCBtZXRhLmhhcygndXNlRmFjdG9yeScpKSAmJiBtZXRhLmhhcygnZGVwcycpKSB7XG4gICAgICBjb25zdCBkZXBzRXhwciA9IG1ldGEuZ2V0KCdkZXBzJykgITtcbiAgICAgIGlmICghdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlcHNFeHByKSkge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfTk9UX0xJVEVSQUwsIGRlcHNFeHByLFxuICAgICAgICAgICAgYEluIEl2eSwgZGVwcyBtZXRhZGF0YSBtdXN0IGJlIGFuIGlubGluZSBhcnJheS5gKTtcbiAgICAgIH1cbiAgICAgIHVzZXJEZXBzID0gZGVwc0V4cHIuZWxlbWVudHMubWFwKGRlcCA9PiBnZXREZXAoZGVwLCByZWZsZWN0b3IpKTtcbiAgICB9XG5cbiAgICBpZiAobWV0YS5oYXMoJ3VzZVZhbHVlJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZVZhbHVlOiBuZXcgV3JhcHBlZE5vZGVFeHByKHVud3JhcEZvcndhcmRSZWYobWV0YS5nZXQoJ3VzZVZhbHVlJykgISwgcmVmbGVjdG9yKSksXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUV4aXN0aW5nJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZUV4aXN0aW5nOiBuZXcgV3JhcHBlZE5vZGVFeHByKHVud3JhcEZvcndhcmRSZWYobWV0YS5nZXQoJ3VzZUV4aXN0aW5nJykgISwgcmVmbGVjdG9yKSksXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZUNsYXNzOiBuZXcgV3JhcHBlZE5vZGVFeHByKHVud3JhcEZvcndhcmRSZWYobWV0YS5nZXQoJ3VzZUNsYXNzJykgISwgcmVmbGVjdG9yKSksXG4gICAgICAgIHVzZXJEZXBzLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpIHtcbiAgICAgIC8vIHVzZUZhY3RvcnkgaXMgc3BlY2lhbCAtIHRoZSAnZGVwcycgcHJvcGVydHkgbXVzdCBiZSBhbmFseXplZC5cbiAgICAgIGNvbnN0IGZhY3RvcnkgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCd1c2VGYWN0b3J5JykgISk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VGYWN0b3J5OiBmYWN0b3J5LCB1c2VyRGVwcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgdHlwZUFyZ3VtZW50Q291bnQsIGludGVybmFsVHlwZSwgcHJvdmlkZWRJbn07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLmFyZ3NbMl0sICdUb28gbWFueSBhcmd1bWVudHMgdG8gQEluamVjdGFibGUnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0SW5qZWN0YWJsZUN0b3JEZXBzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBtZXRhOiBSM0luamVjdGFibGVNZXRhZGF0YSwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbixcbiAgICBzdHJpY3RDdG9yRGVwczogYm9vbGVhbikge1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAnQEluamVjdGFibGUgbXVzdCBiZSBjYWxsZWQnKTtcbiAgfVxuXG4gIGxldCBjdG9yRGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXwnaW52YWxpZCd8bnVsbCA9IG51bGw7XG5cbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIElkZWFsbHksIHVzaW5nIEBJbmplY3RhYmxlKCkgd291bGQgaGF2ZSB0aGUgc2FtZSBlZmZlY3QgYXMgdXNpbmcgQEluamVjdGFibGUoey4uLn0pLCBhbmQgYmVcbiAgICAvLyBzdWJqZWN0IHRvIHRoZSBzYW1lIHZhbGlkYXRpb24uIEhvd2V2ZXIsIGV4aXN0aW5nIEFuZ3VsYXIgY29kZSBhYnVzZXMgQEluamVjdGFibGUsIGFwcGx5aW5nXG4gICAgLy8gaXQgdG8gdGhpbmdzIGxpa2UgYWJzdHJhY3QgY2xhc3NlcyB3aXRoIGNvbnN0cnVjdG9ycyB0aGF0IHdlcmUgbmV2ZXIgbWVhbnQgZm9yIHVzZSB3aXRoXG4gICAgLy8gQW5ndWxhcidzIERJLlxuICAgIC8vXG4gICAgLy8gVG8gZGVhbCB3aXRoIHRoaXMsIEBJbmplY3RhYmxlKCkgd2l0aG91dCBhbiBhcmd1bWVudCBpcyBtb3JlIGxlbmllbnQsIGFuZCBpZiB0aGVcbiAgICAvLyBjb25zdHJ1Y3RvciBzaWduYXR1cmUgZG9lcyBub3Qgd29yayBmb3IgREkgdGhlbiBhIGZhY3RvcnkgZGVmaW5pdGlvbiAoybVmYWMpIHRoYXQgdGhyb3dzIGlzXG4gICAgLy8gZ2VuZXJhdGVkLlxuICAgIGlmIChzdHJpY3RDdG9yRGVwcykge1xuICAgICAgY3RvckRlcHMgPSBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3RvckRlcHMgPSB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICAgICAgICBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSkpO1xuICAgIH1cblxuICAgIHJldHVybiBjdG9yRGVwcztcbiAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCByYXdDdG9yRGVwcyA9IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKTtcblxuICAgIGlmIChzdHJpY3RDdG9yRGVwcyAmJiBtZXRhLnVzZVZhbHVlID09PSB1bmRlZmluZWQgJiYgbWV0YS51c2VFeGlzdGluZyA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgIG1ldGEudXNlQ2xhc3MgPT09IHVuZGVmaW5lZCAmJiBtZXRhLnVzZUZhY3RvcnkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2luY2UgdXNlKiB3YXMgbm90IHByb3ZpZGVkLCB2YWxpZGF0ZSB0aGUgZGVwcyBhY2NvcmRpbmcgdG8gc3RyaWN0Q3RvckRlcHMuXG4gICAgICBjdG9yRGVwcyA9IHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJhd0N0b3JEZXBzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3RvckRlcHMgPSB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhyYXdDdG9yRGVwcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGN0b3JEZXBzO1xufVxuXG5mdW5jdGlvbiBnZXREZXAoZGVwOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBtZXRhOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSA9IHtcbiAgICB0b2tlbjogbmV3IFdyYXBwZWROb2RlRXhwcihkZXApLFxuICAgIGhvc3Q6IGZhbHNlLFxuICAgIHJlc29sdmVkOiBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW4sXG4gICAgb3B0aW9uYWw6IGZhbHNlLFxuICAgIHNlbGY6IGZhbHNlLFxuICAgIHNraXBTZWxmOiBmYWxzZSxcbiAgfTtcblxuICBmdW5jdGlvbiBtYXliZVVwZGF0ZURlY29yYXRvcihcbiAgICAgIGRlYzogdHMuSWRlbnRpZmllciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgdG9rZW4/OiB0cy5FeHByZXNzaW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc291cmNlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWMpO1xuICAgIGlmIChzb3VyY2UgPT09IG51bGwgfHwgc291cmNlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzd2l0Y2ggKHNvdXJjZS5uYW1lKSB7XG4gICAgICBjYXNlICdJbmplY3QnOlxuICAgICAgICBpZiAodG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1ldGEudG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ09wdGlvbmFsJzpcbiAgICAgICAgbWV0YS5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2tpcFNlbGYnOlxuICAgICAgICBtZXRhLnNraXBTZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTZWxmJzpcbiAgICAgICAgbWV0YS5zZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXApKSB7XG4gICAgZGVwLmVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihlbCkpIHtcbiAgICAgICAgbWF5YmVVcGRhdGVEZWNvcmF0b3IoZWwsIHJlZmxlY3Rvcik7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzTmV3RXhwcmVzc2lvbihlbCkgJiYgdHMuaXNJZGVudGlmaWVyKGVsLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gZWwuYXJndW1lbnRzICYmIGVsLmFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGVsLmFyZ3VtZW50c1swXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLmV4cHJlc3Npb24sIHJlZmxlY3RvciwgdG9rZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBtZXRhO1xufVxuIl19