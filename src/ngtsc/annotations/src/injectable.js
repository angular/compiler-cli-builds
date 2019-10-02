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
        function InjectableDecoratorHandler(reflector, defaultImportRecorder, isCore, strictCtorDeps) {
            this.reflector = reflector;
            this.defaultImportRecorder = defaultImportRecorder;
            this.isCore = isCore;
            this.strictCtorDeps = strictCtorDeps;
            this.precedence = transform_1.HandlerPrecedence.SHARED;
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
        InjectableDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compileInjectable(analysis.meta);
            var statements = res.statements;
            var results = [];
            if (analysis.needsFactory) {
                var meta = analysis.meta;
                var factoryRes = factory_1.compileNgFactoryDefField({
                    name: meta.name,
                    type: meta.type,
                    typeArgumentCount: meta.typeArgumentCount,
                    deps: analysis.ctorDeps,
                    injectFn: compiler_1.Identifiers.inject
                });
                if (analysis.metadataStmt !== null) {
                    factoryRes.statements.push(analysis.metadataStmt);
                }
                results.push(factoryRes);
            }
            results.push({
                name: 'ngInjectableDef',
                initializer: res.expression, statements: statements,
                type: res.type,
            });
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
        var type = new compiler_1.WrappedNodeExpr(clazz.name);
        var typeArgumentCount = reflector.getGenericArityOfClass(clazz) || 0;
        if (decorator.args === null) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, decorator.node, '@Injectable must be called');
        }
        if (decorator.args.length === 0) {
            return {
                name: name,
                type: type,
                typeArgumentCount: typeArgumentCount,
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
                    providedIn: providedIn,
                    useValue: new compiler_1.WrappedNodeExpr(util_1.unwrapForwardRef(meta.get('useValue'), reflector)),
                };
            }
            else if (meta.has('useExisting')) {
                return {
                    name: name,
                    type: type,
                    typeArgumentCount: typeArgumentCount,
                    providedIn: providedIn,
                    useExisting: new compiler_1.WrappedNodeExpr(util_1.unwrapForwardRef(meta.get('useExisting'), reflector)),
                };
            }
            else if (meta.has('useClass')) {
                return {
                    name: name,
                    type: type,
                    typeArgumentCount: typeArgumentCount,
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
                    providedIn: providedIn,
                    useFactory: factory, userDeps: userDeps,
                };
            }
            else {
                return { name: name, type: type, typeArgumentCount: typeArgumentCount, providedIn: providedIn };
            }
        }
        else {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], 'Too many arguments to @Injectable');
        }
    }
    function extractInjectableCtorDeps(clazz, meta, decorator, reflector, defaultImportRecorder, isCore, strictCtorDeps) {
        if (decorator.args === null) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, decorator.node, '@Injectable must be called');
        }
        var ctorDeps = null;
        if (decorator.args.length === 0) {
            // Ideally, using @Injectable() would have the same effect as using @Injectable({...}), and be
            // subject to the same validation. However, existing Angular code abuses @Injectable, applying
            // it to things like abstract classes with constructors that were never meant for use with
            // Angular's DI.
            //
            // To deal with this, @Injectable() without an argument is more lenient, and if the
            // constructor
            // signature does not work for DI then an ngInjectableDef that throws.
            if (strictCtorDeps) {
                ctorDeps = util_1.getValidConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore);
            }
            else {
                var possibleCtorDeps = util_1.getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore);
                if (possibleCtorDeps !== null) {
                    if (possibleCtorDeps.deps !== null) {
                        // This use of @Injectable has valid constructor dependencies.
                        ctorDeps = possibleCtorDeps.deps;
                    }
                    else {
                        // This use of @Injectable is technically invalid. Generate a factory function which
                        // throws
                        // an error.
                        // TODO(alxhub): log warnings for the bad use of @Injectable.
                        ctorDeps = 'invalid';
                    }
                }
            }
            return ctorDeps;
        }
        else if (decorator.args.length === 1) {
            var rawCtorDeps = util_1.getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore);
            // rawCtorDeps will be null if the class has no constructor.
            if (rawCtorDeps !== null) {
                if (rawCtorDeps.deps !== null) {
                    // A constructor existed and had valid dependencies.
                    ctorDeps = rawCtorDeps.deps;
                }
                else {
                    // A constructor existed but had invalid dependencies.
                    ctorDeps = 'invalid';
                }
            }
            if (strictCtorDeps && !meta.useValue && !meta.useExisting && !meta.useClass &&
                !meta.useFactory) {
                // Since use* was not provided, validate the deps according to strictCtorDeps.
                util_1.validateConstructorDependencies(clazz, rawCtorDeps);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb047SUFDcE4sK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQTJLO0lBUzNLOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLHFCQUE0QyxFQUMvRSxNQUFlLEVBQVUsY0FBdUI7WUFEaEQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1lBQy9FLFdBQU0sR0FBTixNQUFNLENBQVM7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUVuRCxlQUFVLEdBQUcsNkJBQWlCLENBQUMsTUFBTSxDQUFDO1FBRmdCLENBQUM7UUFJaEUsMkNBQU0sR0FBTixVQUFPLElBQXNCLEVBQUUsVUFBNEI7WUFDekQsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0sU0FBUyxHQUFHLDJCQUFvQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDM0IsT0FBTztvQkFDTCxPQUFPLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3ZCLFFBQVEsRUFBRSxTQUFTO2lCQUNwQixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBRUQsNENBQU8sR0FBUCxVQUFRLElBQXNCLEVBQUUsU0FBb0I7WUFD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LEdBQUcsSUFBSSxDQUFDO29CQUNyQixNQUFNO2dCQUNSLEtBQUssTUFBTTtvQkFDVCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztvQkFDakIsTUFBTTthQUNUO1FBQ0gsQ0FBQztRQUVELElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3BDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRTtnQkFDckIsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUN2QixvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7aUJBQ3JDO3FCQUFNLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDbkUsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUM7b0JBQ3RGLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUN2RDtZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgSWRlbnRpZmllcnMsIExpdGVyYWxFeHByLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNJbmplY3RhYmxlTWV0YWRhdGEsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RhYmxlIGFzIGNvbXBpbGVJdnlJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7ZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBGb3J3YXJkUmVmLCB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluamVjdGFibGVIYW5kbGVyRGF0YSB7XG4gIG1ldGE6IFIzSW5qZWN0YWJsZU1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBjdG9yRGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXwnaW52YWxpZCd8bnVsbDtcbiAgbmVlZHNGYWN0b3J5OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEFkYXB0cyB0aGUgYGNvbXBpbGVJdnlJbmplY3RhYmxlYCBjb21waWxlciBmb3IgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3JzIHRvIHRoZSBJdnkgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxJbmplY3RhYmxlSGFuZGxlckRhdGEsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLCBwcml2YXRlIHN0cmljdEN0b3JEZXBzOiBib29sZWFuKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5TSEFSRUQ7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0luamVjdGFibGUnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PEluamVjdGFibGVIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IG1ldGEgPSBleHRyYWN0SW5qZWN0YWJsZU1ldGFkYXRhKG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBtZXRhLFxuICAgICAgICBjdG9yRGVwczogZXh0cmFjdEluamVjdGFibGVDdG9yRGVwcyhcbiAgICAgICAgICAgIG5vZGUsIG1ldGEsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuc3RyaWN0Q3RvckRlcHMpLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgLy8gQXZvaWQgZ2VuZXJhdGluZyBtdWx0aXBsZSBmYWN0b3JpZXMgaWYgYSBjbGFzcyBoYXNcbiAgICAgICAgLy8gbW9yZSBBbmd1bGFyIGRlY29yYXRvcnMsIGFwYXJ0IGZyb20gSW5qZWN0YWJsZS5cbiAgICAgICAgbmVlZHNGYWN0b3J5OiAhZGVjb3JhdG9ycyB8fFxuICAgICAgICAgICAgZGVjb3JhdG9ycy5ldmVyeShjdXJyZW50ID0+ICFpc0FuZ3VsYXJDb3JlKGN1cnJlbnQpIHx8IGN1cnJlbnQubmFtZSA9PT0gJ0luamVjdGFibGUnKVxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogSW5qZWN0YWJsZUhhbmRsZXJEYXRhKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlSXZ5SW5qZWN0YWJsZShhbmFseXNpcy5tZXRhKTtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gcmVzLnN0YXRlbWVudHM7XG4gICAgY29uc3QgcmVzdWx0czogQ29tcGlsZVJlc3VsdFtdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMubmVlZHNGYWN0b3J5KSB7XG4gICAgICBjb25zdCBtZXRhID0gYW5hbHlzaXMubWV0YTtcbiAgICAgIGNvbnN0IGZhY3RvcnlSZXMgPSBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQoe1xuICAgICAgICBuYW1lOiBtZXRhLm5hbWUsXG4gICAgICAgIHR5cGU6IG1ldGEudHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQ6IG1ldGEudHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIGRlcHM6IGFuYWx5c2lzLmN0b3JEZXBzLFxuICAgICAgICBpbmplY3RGbjogSWRlbnRpZmllcnMuaW5qZWN0XG4gICAgICB9KTtcbiAgICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaChmYWN0b3J5UmVzKTtcbiAgICB9XG5cbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogJ25nSW5qZWN0YWJsZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbi8qKlxuICogUmVhZCBtZXRhZGF0YSBmcm9tIHRoZSBgQEluamVjdGFibGVgIGRlY29yYXRvciBhbmQgcHJvZHVjZSB0aGUgYEl2eUluamVjdGFibGVNZXRhZGF0YWAsIHRoZVxuICogaW5wdXRcbiAqIG1ldGFkYXRhIG5lZWRlZCB0byBydW4gYGNvbXBpbGVJdnlJbmplY3RhYmxlYC5cbiAqXG4gKiBBIGBudWxsYCByZXR1cm4gdmFsdWUgaW5kaWNhdGVzIHRoaXMgaXMgQEluamVjdGFibGUgaGFzIGludmFsaWQgZGF0YS5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzSW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgY29uc3QgbmFtZSA9IGNsYXp6Lm5hbWUudGV4dDtcbiAgY29uc3QgdHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gIGNvbnN0IHR5cGVBcmd1bWVudENvdW50ID0gcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDA7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBkZWNvcmF0b3Iubm9kZSwgJ0BJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkJyk7XG4gIH1cbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgcHJvdmlkZWRJbjogbmV3IExpdGVyYWxFeHByKG51bGwpLFxuICAgIH07XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbWV0YU5vZGUgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICAvLyBGaXJzdGx5IG1ha2Ugc3VyZSB0aGUgZGVjb3JhdG9yIGFyZ3VtZW50IGlzIGFuIGlubGluZSBsaXRlcmFsIC0gaWYgbm90LCBpdCdzIGlsbGVnYWwgdG9cbiAgICAvLyB0cmFuc3BvcnQgcmVmZXJlbmNlcyBmcm9tIG9uZSBsb2NhdGlvbiB0byBhbm90aGVyLiBUaGlzIGlzIHRoZSBwcm9ibGVtIHRoYXQgbG93ZXJpbmdcbiAgICAvLyB1c2VkIHRvIHNvbHZlIC0gaWYgdGhpcyByZXN0cmljdGlvbiBwcm92ZXMgdG9vIHVuZGVzaXJhYmxlIHdlIGNhbiByZS1pbXBsZW1lbnQgbG93ZXJpbmcuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGFOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbiBJdnksIGRlY29yYXRvciBtZXRhZGF0YSBtdXN0IGJlIGlubGluZS5gKTtcbiAgICB9XG5cbiAgICAvLyBSZXNvbHZlIHRoZSBmaWVsZHMgb2YgdGhlIGxpdGVyYWwgaW50byBhIG1hcCBvZiBmaWVsZCBuYW1lIHRvIGV4cHJlc3Npb24uXG4gICAgY29uc3QgbWV0YSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGFOb2RlKTtcbiAgICBsZXQgcHJvdmlkZWRJbjogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgICBpZiAobWV0YS5oYXMoJ3Byb3ZpZGVkSW4nKSkge1xuICAgICAgcHJvdmlkZWRJbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3Byb3ZpZGVkSW4nKSAhKTtcbiAgICB9XG5cbiAgICBsZXQgdXNlckRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICgobWV0YS5oYXMoJ3VzZUNsYXNzJykgfHwgbWV0YS5oYXMoJ3VzZUZhY3RvcnknKSkgJiYgbWV0YS5oYXMoJ2RlcHMnKSkge1xuICAgICAgY29uc3QgZGVwc0V4cHIgPSBtZXRhLmdldCgnZGVwcycpICE7XG4gICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXBzRXhwcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX05PVF9MSVRFUkFMLCBkZXBzRXhwcixcbiAgICAgICAgICAgIGBJbiBJdnksIGRlcHMgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbmxpbmUgYXJyYXkuYCk7XG4gICAgICB9XG4gICAgICB1c2VyRGVwcyA9IGRlcHNFeHByLmVsZW1lbnRzLm1hcChkZXAgPT4gZ2V0RGVwKGRlcCwgcmVmbGVjdG9yKSk7XG4gICAgfVxuXG4gICAgaWYgKG1ldGEuaGFzKCd1c2VWYWx1ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlVmFsdWU6IG5ldyBXcmFwcGVkTm9kZUV4cHIodW53cmFwRm9yd2FyZFJlZihtZXRhLmdldCgndXNlVmFsdWUnKSAhLCByZWZsZWN0b3IpKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRXhpc3RpbmcnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZUV4aXN0aW5nOiBuZXcgV3JhcHBlZE5vZGVFeHByKHVud3JhcEZvcndhcmRSZWYobWV0YS5nZXQoJ3VzZUV4aXN0aW5nJykgISwgcmVmbGVjdG9yKSksXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VDbGFzczogbmV3IFdyYXBwZWROb2RlRXhwcih1bndyYXBGb3J3YXJkUmVmKG1ldGEuZ2V0KCd1c2VDbGFzcycpICEsIHJlZmxlY3RvcikpLFxuICAgICAgICB1c2VyRGVwcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgICAvLyB1c2VGYWN0b3J5IGlzIHNwZWNpYWwgLSB0aGUgJ2RlcHMnIHByb3BlcnR5IG11c3QgYmUgYW5hbHl6ZWQuXG4gICAgICBjb25zdCBmYWN0b3J5ID0gbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlRmFjdG9yeScpICEpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZUZhY3Rvcnk6IGZhY3RvcnksIHVzZXJEZXBzLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCB0eXBlQXJndW1lbnRDb3VudCwgcHJvdmlkZWRJbn07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLmFyZ3NbMl0sICdUb28gbWFueSBhcmd1bWVudHMgdG8gQEluamVjdGFibGUnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBleHRyYWN0SW5qZWN0YWJsZUN0b3JEZXBzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBtZXRhOiBSM0luamVjdGFibGVNZXRhZGF0YSwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbixcbiAgICBzdHJpY3RDdG9yRGVwczogYm9vbGVhbikge1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgZGVjb3JhdG9yLm5vZGUsICdASW5qZWN0YWJsZSBtdXN0IGJlIGNhbGxlZCcpO1xuICB9XG5cbiAgbGV0IGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsID0gbnVsbDtcblxuICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gSWRlYWxseSwgdXNpbmcgQEluamVjdGFibGUoKSB3b3VsZCBoYXZlIHRoZSBzYW1lIGVmZmVjdCBhcyB1c2luZyBASW5qZWN0YWJsZSh7Li4ufSksIGFuZCBiZVxuICAgIC8vIHN1YmplY3QgdG8gdGhlIHNhbWUgdmFsaWRhdGlvbi4gSG93ZXZlciwgZXhpc3RpbmcgQW5ndWxhciBjb2RlIGFidXNlcyBASW5qZWN0YWJsZSwgYXBwbHlpbmdcbiAgICAvLyBpdCB0byB0aGluZ3MgbGlrZSBhYnN0cmFjdCBjbGFzc2VzIHdpdGggY29uc3RydWN0b3JzIHRoYXQgd2VyZSBuZXZlciBtZWFudCBmb3IgdXNlIHdpdGhcbiAgICAvLyBBbmd1bGFyJ3MgREkuXG4gICAgLy9cbiAgICAvLyBUbyBkZWFsIHdpdGggdGhpcywgQEluamVjdGFibGUoKSB3aXRob3V0IGFuIGFyZ3VtZW50IGlzIG1vcmUgbGVuaWVudCwgYW5kIGlmIHRoZVxuICAgIC8vIGNvbnN0cnVjdG9yXG4gICAgLy8gc2lnbmF0dXJlIGRvZXMgbm90IHdvcmsgZm9yIERJIHRoZW4gYW4gbmdJbmplY3RhYmxlRGVmIHRoYXQgdGhyb3dzLlxuICAgIGlmIChzdHJpY3RDdG9yRGVwcykge1xuICAgICAgY3RvckRlcHMgPSBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcG9zc2libGVDdG9yRGVwcyA9XG4gICAgICAgICAgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpO1xuICAgICAgaWYgKHBvc3NpYmxlQ3RvckRlcHMgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKHBvc3NpYmxlQ3RvckRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgICAgICAgIC8vIFRoaXMgdXNlIG9mIEBJbmplY3RhYmxlIGhhcyB2YWxpZCBjb25zdHJ1Y3RvciBkZXBlbmRlbmNpZXMuXG4gICAgICAgICAgY3RvckRlcHMgPSBwb3NzaWJsZUN0b3JEZXBzLmRlcHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVGhpcyB1c2Ugb2YgQEluamVjdGFibGUgaXMgdGVjaG5pY2FsbHkgaW52YWxpZC4gR2VuZXJhdGUgYSBmYWN0b3J5IGZ1bmN0aW9uIHdoaWNoXG4gICAgICAgICAgLy8gdGhyb3dzXG4gICAgICAgICAgLy8gYW4gZXJyb3IuXG4gICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBsb2cgd2FybmluZ3MgZm9yIHRoZSBiYWQgdXNlIG9mIEBJbmplY3RhYmxlLlxuICAgICAgICAgIGN0b3JEZXBzID0gJ2ludmFsaWQnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0b3JEZXBzO1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IHJhd0N0b3JEZXBzID0gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpO1xuXG4gICAgLy8gcmF3Q3RvckRlcHMgd2lsbCBiZSBudWxsIGlmIHRoZSBjbGFzcyBoYXMgbm8gY29uc3RydWN0b3IuXG4gICAgaWYgKHJhd0N0b3JEZXBzICE9PSBudWxsKSB7XG4gICAgICBpZiAocmF3Q3RvckRlcHMuZGVwcyAhPT0gbnVsbCkge1xuICAgICAgICAvLyBBIGNvbnN0cnVjdG9yIGV4aXN0ZWQgYW5kIGhhZCB2YWxpZCBkZXBlbmRlbmNpZXMuXG4gICAgICAgIGN0b3JEZXBzID0gcmF3Q3RvckRlcHMuZGVwcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEEgY29uc3RydWN0b3IgZXhpc3RlZCBidXQgaGFkIGludmFsaWQgZGVwZW5kZW5jaWVzLlxuICAgICAgICBjdG9yRGVwcyA9ICdpbnZhbGlkJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3RyaWN0Q3RvckRlcHMgJiYgIW1ldGEudXNlVmFsdWUgJiYgIW1ldGEudXNlRXhpc3RpbmcgJiYgIW1ldGEudXNlQ2xhc3MgJiZcbiAgICAgICAgIW1ldGEudXNlRmFjdG9yeSkge1xuICAgICAgLy8gU2luY2UgdXNlKiB3YXMgbm90IHByb3ZpZGVkLCB2YWxpZGF0ZSB0aGUgZGVwcyBhY2NvcmRpbmcgdG8gc3RyaWN0Q3RvckRlcHMuXG4gICAgICB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByYXdDdG9yRGVwcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGN0b3JEZXBzO1xufVxuXG5mdW5jdGlvbiBnZXREZXAoZGVwOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBtZXRhOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSA9IHtcbiAgICB0b2tlbjogbmV3IFdyYXBwZWROb2RlRXhwcihkZXApLFxuICAgIGhvc3Q6IGZhbHNlLFxuICAgIHJlc29sdmVkOiBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW4sXG4gICAgb3B0aW9uYWw6IGZhbHNlLFxuICAgIHNlbGY6IGZhbHNlLFxuICAgIHNraXBTZWxmOiBmYWxzZSxcbiAgfTtcblxuICBmdW5jdGlvbiBtYXliZVVwZGF0ZURlY29yYXRvcihcbiAgICAgIGRlYzogdHMuSWRlbnRpZmllciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgdG9rZW4/OiB0cy5FeHByZXNzaW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc291cmNlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWMpO1xuICAgIGlmIChzb3VyY2UgPT09IG51bGwgfHwgc291cmNlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzd2l0Y2ggKHNvdXJjZS5uYW1lKSB7XG4gICAgICBjYXNlICdJbmplY3QnOlxuICAgICAgICBpZiAodG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1ldGEudG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ09wdGlvbmFsJzpcbiAgICAgICAgbWV0YS5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2tpcFNlbGYnOlxuICAgICAgICBtZXRhLnNraXBTZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTZWxmJzpcbiAgICAgICAgbWV0YS5zZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXApKSB7XG4gICAgZGVwLmVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihlbCkpIHtcbiAgICAgICAgbWF5YmVVcGRhdGVEZWNvcmF0b3IoZWwsIHJlZmxlY3Rvcik7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzTmV3RXhwcmVzc2lvbihlbCkgJiYgdHMuaXNJZGVudGlmaWVyKGVsLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gZWwuYXJndW1lbnRzICYmIGVsLmFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGVsLmFyZ3VtZW50c1swXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLmV4cHJlc3Npb24sIHJlZmxlY3RvciwgdG9rZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBtZXRhO1xufVxuIl19