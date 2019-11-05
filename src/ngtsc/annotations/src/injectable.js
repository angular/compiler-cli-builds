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
                    injectFn: compiler_1.Identifiers.inject,
                    target: compiler_1.R3FactoryTarget.Injectable,
                });
                if (analysis.metadataStmt !== null) {
                    factoryRes.statements.push(analysis.metadataStmt);
                }
                results.push(factoryRes);
            }
            results.push({
                name: 'ɵprov',
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
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), '@Injectable must be called');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcU87SUFDck8sK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQTBNO0lBUzFNOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLHFCQUE0QyxFQUMvRSxNQUFlLEVBQVUsY0FBdUI7WUFEaEQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1lBQy9FLFdBQU0sR0FBTixNQUFNLENBQVM7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUVuRCxlQUFVLEdBQUcsNkJBQWlCLENBQUMsTUFBTSxDQUFDO1FBRmdCLENBQUM7UUFJaEUsMkNBQU0sR0FBTixVQUFPLElBQXNCLEVBQUUsVUFBNEI7WUFDekQsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0sU0FBUyxHQUFHLDJCQUFvQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDM0IsT0FBTztvQkFDTCxPQUFPLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3ZCLFFBQVEsRUFBRSxTQUFTO2lCQUNwQixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBRUQsNENBQU8sR0FBUCxVQUFRLElBQXNCLEVBQUUsU0FBb0I7WUFD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RSxTQUFTLENBQUMsQ0FBQztpQkFDckM7cUJBQU0sSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNuRSxJQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztvQkFDdEYsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQ3ZEO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBJZGVudGlmaWVycywgTGl0ZXJhbEV4cHIsIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM0ZhY3RvcnlUYXJnZXQsIFIzSW5qZWN0YWJsZU1ldGFkYXRhLCBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSW5qZWN0YWJsZSBhcyBjb21waWxlSXZ5SW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge2NvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZpbmRBbmd1bGFyRGVjb3JhdG9yLCBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZSwgdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIHVud3JhcEZvcndhcmRSZWYsIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXN9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5qZWN0YWJsZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsO1xuICBuZWVkc0ZhY3Rvcnk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQWRhcHRzIHRoZSBgY29tcGlsZUl2eUluamVjdGFibGVgIGNvbXBpbGVyIGZvciBgQEluamVjdGFibGVgIGRlY29yYXRvcnMgdG8gdGhlIEl2eSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPEluamVjdGFibGVIYW5kbGVyRGF0YSwgRGVjb3JhdG9yPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4pIHt9XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlNIQVJFRDtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnSW5qZWN0YWJsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8SW5qZWN0YWJsZUhhbmRsZXJEYXRhPiB7XG4gICAgY29uc3QgbWV0YSA9IGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGEsXG4gICAgICAgIGN0b3JEZXBzOiBleHRyYWN0SW5qZWN0YWJsZUN0b3JEZXBzKFxuICAgICAgICAgICAgbm9kZSwgbWV0YSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgICAgdGhpcy5zdHJpY3RDdG9yRGVwcyksXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgICAvLyBBdm9pZCBnZW5lcmF0aW5nIG11bHRpcGxlIGZhY3RvcmllcyBpZiBhIGNsYXNzIGhhc1xuICAgICAgICAvLyBtb3JlIEFuZ3VsYXIgZGVjb3JhdG9ycywgYXBhcnQgZnJvbSBJbmplY3RhYmxlLlxuICAgICAgICBuZWVkc0ZhY3Rvcnk6ICFkZWNvcmF0b3JzIHx8XG4gICAgICAgICAgICBkZWNvcmF0b3JzLmV2ZXJ5KGN1cnJlbnQgPT4gIWlzQW5ndWxhckNvcmUoY3VycmVudCkgfHwgY3VycmVudC5uYW1lID09PSAnSW5qZWN0YWJsZScpXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBJbmplY3RhYmxlSGFuZGxlckRhdGEpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVJdnlJbmplY3RhYmxlKGFuYWx5c2lzLm1ldGEpO1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSByZXMuc3RhdGVtZW50cztcbiAgICBjb25zdCByZXN1bHRzOiBDb21waWxlUmVzdWx0W10gPSBbXTtcblxuICAgIGlmIChhbmFseXNpcy5uZWVkc0ZhY3RvcnkpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSBhbmFseXNpcy5tZXRhO1xuICAgICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh7XG4gICAgICAgIG5hbWU6IG1ldGEubmFtZSxcbiAgICAgICAgdHlwZTogbWV0YS50eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudDogbWV0YS50eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgZGVwczogYW5hbHlzaXMuY3RvckRlcHMsXG4gICAgICAgIGluamVjdEZuOiBJZGVudGlmaWVycy5pbmplY3QsXG4gICAgICAgIHRhcmdldDogUjNGYWN0b3J5VGFyZ2V0LkluamVjdGFibGUsXG4gICAgICB9KTtcbiAgICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaChmYWN0b3J5UmVzKTtcbiAgICB9XG5cbiAgICByZXN1bHRzLnB1c2goe1xuICAgICAgbmFtZTogJ8m1cHJvdicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbi8qKlxuICogUmVhZCBtZXRhZGF0YSBmcm9tIHRoZSBgQEluamVjdGFibGVgIGRlY29yYXRvciBhbmQgcHJvZHVjZSB0aGUgYEl2eUluamVjdGFibGVNZXRhZGF0YWAsIHRoZVxuICogaW5wdXRcbiAqIG1ldGFkYXRhIG5lZWRlZCB0byBydW4gYGNvbXBpbGVJdnlJbmplY3RhYmxlYC5cbiAqXG4gKiBBIGBudWxsYCByZXR1cm4gdmFsdWUgaW5kaWNhdGVzIHRoaXMgaXMgQEluamVjdGFibGUgaGFzIGludmFsaWQgZGF0YS5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzSW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgY29uc3QgbmFtZSA9IGNsYXp6Lm5hbWUudGV4dDtcbiAgY29uc3QgdHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gIGNvbnN0IHR5cGVBcmd1bWVudENvdW50ID0gcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDA7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICdASW5qZWN0YWJsZSBtdXN0IGJlIGNhbGxlZCcpO1xuICB9XG4gIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGUsXG4gICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgIHByb3ZpZGVkSW46IG5ldyBMaXRlcmFsRXhwcihudWxsKSxcbiAgICB9O1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IG1ldGFOb2RlID0gZGVjb3JhdG9yLmFyZ3NbMF07XG4gICAgLy8gRmlyc3RseSBtYWtlIHN1cmUgdGhlIGRlY29yYXRvciBhcmd1bWVudCBpcyBhbiBpbmxpbmUgbGl0ZXJhbCAtIGlmIG5vdCwgaXQncyBpbGxlZ2FsIHRvXG4gICAgLy8gdHJhbnNwb3J0IHJlZmVyZW5jZXMgZnJvbSBvbmUgbG9jYXRpb24gdG8gYW5vdGhlci4gVGhpcyBpcyB0aGUgcHJvYmxlbSB0aGF0IGxvd2VyaW5nXG4gICAgLy8gdXNlZCB0byBzb2x2ZSAtIGlmIHRoaXMgcmVzdHJpY3Rpb24gcHJvdmVzIHRvbyB1bmRlc2lyYWJsZSB3ZSBjYW4gcmUtaW1wbGVtZW50IGxvd2VyaW5nLlxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW4gSXZ5LCBkZWNvcmF0b3IgbWV0YWRhdGEgbXVzdCBiZSBpbmxpbmUuYCk7XG4gICAgfVxuXG4gICAgLy8gUmVzb2x2ZSB0aGUgZmllbGRzIG9mIHRoZSBsaXRlcmFsIGludG8gYSBtYXAgb2YgZmllbGQgbmFtZSB0byBleHByZXNzaW9uLlxuICAgIGNvbnN0IG1ldGEgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhTm9kZSk7XG4gICAgbGV0IHByb3ZpZGVkSW46IEV4cHJlc3Npb24gPSBuZXcgTGl0ZXJhbEV4cHIobnVsbCk7XG4gICAgaWYgKG1ldGEuaGFzKCdwcm92aWRlZEluJykpIHtcbiAgICAgIHByb3ZpZGVkSW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCdwcm92aWRlZEluJykgISk7XG4gICAgfVxuXG4gICAgbGV0IHVzZXJEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKG1ldGEuaGFzKCd1c2VDbGFzcycpIHx8IG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpICYmIG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgIGNvbnN0IGRlcHNFeHByID0gbWV0YS5nZXQoJ2RlcHMnKSAhO1xuICAgICAgaWYgKCF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwc0V4cHIpKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9OT1RfTElURVJBTCwgZGVwc0V4cHIsXG4gICAgICAgICAgICBgSW4gSXZ5LCBkZXBzIG1ldGFkYXRhIG11c3QgYmUgYW4gaW5saW5lIGFycmF5LmApO1xuICAgICAgfVxuICAgICAgdXNlckRlcHMgPSBkZXBzRXhwci5lbGVtZW50cy5tYXAoZGVwID0+IGdldERlcChkZXAsIHJlZmxlY3RvcikpO1xuICAgIH1cblxuICAgIGlmIChtZXRhLmhhcygndXNlVmFsdWUnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZVZhbHVlOiBuZXcgV3JhcHBlZE5vZGVFeHByKHVud3JhcEZvcndhcmRSZWYobWV0YS5nZXQoJ3VzZVZhbHVlJykgISwgcmVmbGVjdG9yKSksXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUV4aXN0aW5nJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VFeGlzdGluZzogbmV3IFdyYXBwZWROb2RlRXhwcih1bndyYXBGb3J3YXJkUmVmKG1ldGEuZ2V0KCd1c2VFeGlzdGluZycpICEsIHJlZmxlY3RvcikpLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VDbGFzcycpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlQ2xhc3M6IG5ldyBXcmFwcGVkTm9kZUV4cHIodW53cmFwRm9yd2FyZFJlZihtZXRhLmdldCgndXNlQ2xhc3MnKSAhLCByZWZsZWN0b3IpKSxcbiAgICAgICAgdXNlckRlcHMsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUZhY3RvcnknKSkge1xuICAgICAgLy8gdXNlRmFjdG9yeSBpcyBzcGVjaWFsIC0gdGhlICdkZXBzJyBwcm9wZXJ0eSBtdXN0IGJlIGFuYWx5emVkLlxuICAgICAgY29uc3QgZmFjdG9yeSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUZhY3RvcnknKSAhKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VGYWN0b3J5OiBmYWN0b3J5LCB1c2VyRGVwcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgdHlwZUFyZ3VtZW50Q291bnQsIHByb3ZpZGVkSW59O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5hcmdzWzJdLCAnVG9vIG1hbnkgYXJndW1lbnRzIHRvIEBJbmplY3RhYmxlJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVDdG9yRGVwcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGEsIGRlY29yYXRvcjogRGVjb3JhdG9yLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4pIHtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX05PVF9DQUxMRUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgJ0BJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkJyk7XG4gIH1cblxuICBsZXQgY3RvckRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118J2ludmFsaWQnfG51bGwgPSBudWxsO1xuXG4gIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZGVhbGx5LCB1c2luZyBASW5qZWN0YWJsZSgpIHdvdWxkIGhhdmUgdGhlIHNhbWUgZWZmZWN0IGFzIHVzaW5nIEBJbmplY3RhYmxlKHsuLi59KSwgYW5kIGJlXG4gICAgLy8gc3ViamVjdCB0byB0aGUgc2FtZSB2YWxpZGF0aW9uLiBIb3dldmVyLCBleGlzdGluZyBBbmd1bGFyIGNvZGUgYWJ1c2VzIEBJbmplY3RhYmxlLCBhcHBseWluZ1xuICAgIC8vIGl0IHRvIHRoaW5ncyBsaWtlIGFic3RyYWN0IGNsYXNzZXMgd2l0aCBjb25zdHJ1Y3RvcnMgdGhhdCB3ZXJlIG5ldmVyIG1lYW50IGZvciB1c2Ugd2l0aFxuICAgIC8vIEFuZ3VsYXIncyBESS5cbiAgICAvL1xuICAgIC8vIFRvIGRlYWwgd2l0aCB0aGlzLCBASW5qZWN0YWJsZSgpIHdpdGhvdXQgYW4gYXJndW1lbnQgaXMgbW9yZSBsZW5pZW50LCBhbmQgaWYgdGhlXG4gICAgLy8gY29uc3RydWN0b3Igc2lnbmF0dXJlIGRvZXMgbm90IHdvcmsgZm9yIERJIHRoZW4gYSBmYWN0b3J5IGRlZmluaXRpb24gKMm1ZmFjKSB0aGF0IHRocm93cyBpc1xuICAgIC8vIGdlbmVyYXRlZC5cbiAgICBpZiAoc3RyaWN0Q3RvckRlcHMpIHtcbiAgICAgIGN0b3JEZXBzID0gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JEZXBzID0gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3RvckRlcHM7XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgcmF3Q3RvckRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSk7XG5cbiAgICBpZiAoc3RyaWN0Q3RvckRlcHMgJiYgbWV0YS51c2VWYWx1ZSA9PT0gdW5kZWZpbmVkICYmIG1ldGEudXNlRXhpc3RpbmcgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBtZXRhLnVzZUNsYXNzID09PSB1bmRlZmluZWQgJiYgbWV0YS51c2VGYWN0b3J5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFNpbmNlIHVzZSogd2FzIG5vdCBwcm92aWRlZCwgdmFsaWRhdGUgdGhlIGRlcHMgYWNjb3JkaW5nIHRvIHN0cmljdEN0b3JEZXBzLlxuICAgICAgY3RvckRlcHMgPSB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByYXdDdG9yRGVwcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JEZXBzID0gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMocmF3Q3RvckRlcHMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjdG9yRGVwcztcbn1cblxuZnVuY3Rpb24gZ2V0RGVwKGRlcDogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhIHtcbiAgY29uc3QgbWV0YTogUjNEZXBlbmRlbmN5TWV0YWRhdGEgPSB7XG4gICAgdG9rZW46IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVwKSxcbiAgICBob3N0OiBmYWxzZSxcbiAgICByZXNvbHZlZDogUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuLFxuICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICBzZWxmOiBmYWxzZSxcbiAgICBza2lwU2VsZjogZmFsc2UsXG4gIH07XG5cbiAgZnVuY3Rpb24gbWF5YmVVcGRhdGVEZWNvcmF0b3IoXG4gICAgICBkZWM6IHRzLklkZW50aWZpZXIsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHRva2VuPzogdHMuRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGNvbnN0IHNvdXJjZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjKTtcbiAgICBpZiAoc291cmNlID09PSBudWxsIHx8IHNvdXJjZS5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3dpdGNoIChzb3VyY2UubmFtZSkge1xuICAgICAgY2FzZSAnSW5qZWN0JzpcbiAgICAgICAgaWYgKHRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtZXRhLnRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdPcHRpb25hbCc6XG4gICAgICAgIG1ldGEub3B0aW9uYWwgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NraXBTZWxmJzpcbiAgICAgICAgbWV0YS5za2lwU2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2VsZic6XG4gICAgICAgIG1ldGEuc2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwKSkge1xuICAgIGRlcC5lbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZWwpKSB7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLCByZWZsZWN0b3IpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc05ld0V4cHJlc3Npb24oZWwpICYmIHRzLmlzSWRlbnRpZmllcihlbC5leHByZXNzaW9uKSkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGVsLmFyZ3VtZW50cyAmJiBlbC5hcmd1bWVudHMubGVuZ3RoID4gMCAmJiBlbC5hcmd1bWVudHNbMF0gfHwgdW5kZWZpbmVkO1xuICAgICAgICBtYXliZVVwZGF0ZURlY29yYXRvcihlbC5leHByZXNzaW9uLCByZWZsZWN0b3IsIHRva2VuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbWV0YTtcbn1cbiJdfQ==