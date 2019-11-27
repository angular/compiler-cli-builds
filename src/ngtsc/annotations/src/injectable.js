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
        function InjectableDecoratorHandler(reflector, defaultImportRecorder, isCore, strictCtorDeps, 
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
            this.errorOnDuplicateProv = errorOnDuplicateProv;
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
        var type = new compiler_1.WrappedNodeExpr(clazz.name);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBcU87SUFDck8sK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQTBNO0lBUzFNOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLHFCQUE0QyxFQUMvRSxNQUFlLEVBQVUsY0FBdUI7UUFDeEQ7Ozs7O1dBS0c7UUFDSyxvQkFBMkI7WUFBM0IscUNBQUEsRUFBQSwyQkFBMkI7WUFSM0IsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1lBQy9FLFdBQU0sR0FBTixNQUFNLENBQVM7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQU9oRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQU87WUFFOUIsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUZMLENBQUM7UUFJM0MsMkNBQU0sR0FBTixVQUFPLElBQXNCLEVBQUUsVUFBNEI7WUFDekQsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0sU0FBUyxHQUFHLDJCQUFvQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDM0IsT0FBTztvQkFDTCxPQUFPLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3ZCLFFBQVEsRUFBRSxTQUFTO2lCQUNwQixDQUFDO2FBQ0g7aUJB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O29CQUN0RixvQkFBb0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDdkQ7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIElkZW50aWZpZXJzLCBMaXRlcmFsRXhwciwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzRmFjdG9yeVRhcmdldCwgUjNJbmplY3RhYmxlTWV0YWRhdGEsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RhYmxlIGFzIGNvbXBpbGVJdnlJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7ZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRm9yd2FyZFJlZiwgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llc30gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBJbmplY3RhYmxlSGFuZGxlckRhdGEge1xuICBtZXRhOiBSM0luamVjdGFibGVNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgY3RvckRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118J2ludmFsaWQnfG51bGw7XG4gIG5lZWRzRmFjdG9yeTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBZGFwdHMgdGhlIGBjb21waWxlSXZ5SW5qZWN0YWJsZWAgY29tcGlsZXIgZm9yIGBASW5qZWN0YWJsZWAgZGVjb3JhdG9ycyB0byB0aGUgSXZ5IGNvbXBpbGVyLlxuICovXG5leHBvcnQgY2xhc3MgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8SW5qZWN0YWJsZUhhbmRsZXJEYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGlzQ29yZTogYm9vbGVhbiwgcHJpdmF0ZSBzdHJpY3RDdG9yRGVwczogYm9vbGVhbixcbiAgICAgIC8qKlxuICAgICAgICogV2hhdCB0byBkbyBpZiB0aGUgaW5qZWN0YWJsZSBhbHJlYWR5IGNvbnRhaW5zIGEgybVwcm92IHByb3BlcnR5LlxuICAgICAgICpcbiAgICAgICAqIElmIHRydWUgdGhlbiBhbiBlcnJvciBkaWFnbm9zdGljIGlzIHJlcG9ydGVkLlxuICAgICAgICogSWYgZmFsc2UgdGhlbiB0aGVyZSBpcyBubyBlcnJvciBhbmQgYSBuZXcgybVwcm92IHByb3BlcnR5IGlzIG5vdCBhZGRlZC5cbiAgICAgICAqL1xuICAgICAgcHJpdmF0ZSBlcnJvck9uRHVwbGljYXRlUHJvdiA9IHRydWUpIHt9XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlNIQVJFRDtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnSW5qZWN0YWJsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8SW5qZWN0YWJsZUhhbmRsZXJEYXRhPiB7XG4gICAgY29uc3QgbWV0YSA9IGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGEsXG4gICAgICAgIGN0b3JEZXBzOiBleHRyYWN0SW5qZWN0YWJsZUN0b3JEZXBzKFxuICAgICAgICAgICAgbm9kZSwgbWV0YSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgICAgdGhpcy5zdHJpY3RDdG9yRGVwcyksXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgICAvLyBBdm9pZCBnZW5lcmF0aW5nIG11bHRpcGxlIGZhY3RvcmllcyBpZiBhIGNsYXNzIGhhc1xuICAgICAgICAvLyBtb3JlIEFuZ3VsYXIgZGVjb3JhdG9ycywgYXBhcnQgZnJvbSBJbmplY3RhYmxlLlxuICAgICAgICBuZWVkc0ZhY3Rvcnk6ICFkZWNvcmF0b3JzIHx8XG4gICAgICAgICAgICBkZWNvcmF0b3JzLmV2ZXJ5KGN1cnJlbnQgPT4gIWlzQW5ndWxhckNvcmUoY3VycmVudCkgfHwgY3VycmVudC5uYW1lID09PSAnSW5qZWN0YWJsZScpXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBJbmplY3RhYmxlSGFuZGxlckRhdGEpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVJdnlJbmplY3RhYmxlKGFuYWx5c2lzLm1ldGEpO1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSByZXMuc3RhdGVtZW50cztcbiAgICBjb25zdCByZXN1bHRzOiBDb21waWxlUmVzdWx0W10gPSBbXTtcblxuICAgIGlmIChhbmFseXNpcy5uZWVkc0ZhY3RvcnkpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSBhbmFseXNpcy5tZXRhO1xuICAgICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh7XG4gICAgICAgIG5hbWU6IG1ldGEubmFtZSxcbiAgICAgICAgdHlwZTogbWV0YS50eXBlLFxuICAgICAgICBpbnRlcm5hbFR5cGU6IG1ldGEuaW50ZXJuYWxUeXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudDogbWV0YS50eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgZGVwczogYW5hbHlzaXMuY3RvckRlcHMsXG4gICAgICAgIGluamVjdEZuOiBJZGVudGlmaWVycy5pbmplY3QsXG4gICAgICAgIHRhcmdldDogUjNGYWN0b3J5VGFyZ2V0LkluamVjdGFibGUsXG4gICAgICB9KTtcbiAgICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaChmYWN0b3J5UmVzKTtcbiAgICB9XG5cbiAgICBjb25zdCDJtXByb3YgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhub2RlKS5maW5kKG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ8m1cHJvdicpO1xuICAgIGlmICjJtXByb3YgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmVycm9yT25EdXBsaWNhdGVQcm92KSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLklOSkVDVEFCTEVfRFVQTElDQVRFX1BST1YsIMm1cHJvdi5uYW1lTm9kZSB8fCDJtXByb3Yubm9kZSB8fCBub2RlLFxuICAgICAgICAgICdJbmplY3RhYmxlcyBjYW5ub3QgY29udGFpbiBhIHN0YXRpYyDJtXByb3YgcHJvcGVydHksIGJlY2F1c2UgdGhlIGNvbXBpbGVyIGlzIGdvaW5nIHRvIGdlbmVyYXRlIG9uZS4nKTtcbiAgICB9XG5cbiAgICBpZiAoybVwcm92ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE9ubHkgYWRkIGEgbmV3IMm1cHJvdiBpZiB0aGVyZSBpcyBub3Qgb25lIGFscmVhZHlcbiAgICAgIHJlc3VsdHMucHVzaCh7bmFtZTogJ8m1cHJvdicsIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbiwgc3RhdGVtZW50cywgdHlwZTogcmVzLnR5cGV9KTtcbiAgICB9XG5cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbi8qKlxuICogUmVhZCBtZXRhZGF0YSBmcm9tIHRoZSBgQEluamVjdGFibGVgIGRlY29yYXRvciBhbmQgcHJvZHVjZSB0aGUgYEl2eUluamVjdGFibGVNZXRhZGF0YWAsIHRoZVxuICogaW5wdXRcbiAqIG1ldGFkYXRhIG5lZWRlZCB0byBydW4gYGNvbXBpbGVJdnlJbmplY3RhYmxlYC5cbiAqXG4gKiBBIGBudWxsYCByZXR1cm4gdmFsdWUgaW5kaWNhdGVzIHRoaXMgaXMgQEluamVjdGFibGUgaGFzIGludmFsaWQgZGF0YS5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzSW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgY29uc3QgbmFtZSA9IGNsYXp6Lm5hbWUudGV4dDtcbiAgY29uc3QgdHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xhenopKTtcbiAgY29uc3QgdHlwZUFyZ3VtZW50Q291bnQgPSByZWZsZWN0b3IuZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6eikgfHwgMDtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX05PVF9DQUxMRUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgJ0BJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkJyk7XG4gIH1cbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgcHJvdmlkZWRJbjogbmV3IExpdGVyYWxFeHByKG51bGwpLFxuICAgIH07XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbWV0YU5vZGUgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICAvLyBGaXJzdGx5IG1ha2Ugc3VyZSB0aGUgZGVjb3JhdG9yIGFyZ3VtZW50IGlzIGFuIGlubGluZSBsaXRlcmFsIC0gaWYgbm90LCBpdCdzIGlsbGVnYWwgdG9cbiAgICAvLyB0cmFuc3BvcnQgcmVmZXJlbmNlcyBmcm9tIG9uZSBsb2NhdGlvbiB0byBhbm90aGVyLiBUaGlzIGlzIHRoZSBwcm9ibGVtIHRoYXQgbG93ZXJpbmdcbiAgICAvLyB1c2VkIHRvIHNvbHZlIC0gaWYgdGhpcyByZXN0cmljdGlvbiBwcm92ZXMgdG9vIHVuZGVzaXJhYmxlIHdlIGNhbiByZS1pbXBsZW1lbnQgbG93ZXJpbmcuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGFOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbiBJdnksIGRlY29yYXRvciBtZXRhZGF0YSBtdXN0IGJlIGlubGluZS5gKTtcbiAgICB9XG5cbiAgICAvLyBSZXNvbHZlIHRoZSBmaWVsZHMgb2YgdGhlIGxpdGVyYWwgaW50byBhIG1hcCBvZiBmaWVsZCBuYW1lIHRvIGV4cHJlc3Npb24uXG4gICAgY29uc3QgbWV0YSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGFOb2RlKTtcbiAgICBsZXQgcHJvdmlkZWRJbjogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgICBpZiAobWV0YS5oYXMoJ3Byb3ZpZGVkSW4nKSkge1xuICAgICAgcHJvdmlkZWRJbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3Byb3ZpZGVkSW4nKSAhKTtcbiAgICB9XG5cbiAgICBsZXQgdXNlckRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICgobWV0YS5oYXMoJ3VzZUNsYXNzJykgfHwgbWV0YS5oYXMoJ3VzZUZhY3RvcnknKSkgJiYgbWV0YS5oYXMoJ2RlcHMnKSkge1xuICAgICAgY29uc3QgZGVwc0V4cHIgPSBtZXRhLmdldCgnZGVwcycpICE7XG4gICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXBzRXhwcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX05PVF9MSVRFUkFMLCBkZXBzRXhwcixcbiAgICAgICAgICAgIGBJbiBJdnksIGRlcHMgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbmxpbmUgYXJyYXkuYCk7XG4gICAgICB9XG4gICAgICB1c2VyRGVwcyA9IGRlcHNFeHByLmVsZW1lbnRzLm1hcChkZXAgPT4gZ2V0RGVwKGRlcCwgcmVmbGVjdG9yKSk7XG4gICAgfVxuXG4gICAgaWYgKG1ldGEuaGFzKCd1c2VWYWx1ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VWYWx1ZTogbmV3IFdyYXBwZWROb2RlRXhwcih1bndyYXBGb3J3YXJkUmVmKG1ldGEuZ2V0KCd1c2VWYWx1ZScpICEsIHJlZmxlY3RvcikpLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VFeGlzdGluZycpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VFeGlzdGluZzogbmV3IFdyYXBwZWROb2RlRXhwcih1bndyYXBGb3J3YXJkUmVmKG1ldGEuZ2V0KCd1c2VFeGlzdGluZycpICEsIHJlZmxlY3RvcikpLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VDbGFzcycpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VDbGFzczogbmV3IFdyYXBwZWROb2RlRXhwcih1bndyYXBGb3J3YXJkUmVmKG1ldGEuZ2V0KCd1c2VDbGFzcycpICEsIHJlZmxlY3RvcikpLFxuICAgICAgICB1c2VyRGVwcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgICAvLyB1c2VGYWN0b3J5IGlzIHNwZWNpYWwgLSB0aGUgJ2RlcHMnIHByb3BlcnR5IG11c3QgYmUgYW5hbHl6ZWQuXG4gICAgICBjb25zdCBmYWN0b3J5ID0gbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlRmFjdG9yeScpICEpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgdHlwZUFyZ3VtZW50Q291bnQsXG4gICAgICAgIGludGVybmFsVHlwZSxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlRmFjdG9yeTogZmFjdG9yeSwgdXNlckRlcHMsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHR5cGVBcmd1bWVudENvdW50LCBpbnRlcm5hbFR5cGUsIHByb3ZpZGVkSW59O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5hcmdzWzJdLCAnVG9vIG1hbnkgYXJndW1lbnRzIHRvIEBJbmplY3RhYmxlJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVDdG9yRGVwcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGEsIGRlY29yYXRvcjogRGVjb3JhdG9yLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4pIHtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX05PVF9DQUxMRUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgJ0BJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkJyk7XG4gIH1cblxuICBsZXQgY3RvckRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118J2ludmFsaWQnfG51bGwgPSBudWxsO1xuXG4gIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZGVhbGx5LCB1c2luZyBASW5qZWN0YWJsZSgpIHdvdWxkIGhhdmUgdGhlIHNhbWUgZWZmZWN0IGFzIHVzaW5nIEBJbmplY3RhYmxlKHsuLi59KSwgYW5kIGJlXG4gICAgLy8gc3ViamVjdCB0byB0aGUgc2FtZSB2YWxpZGF0aW9uLiBIb3dldmVyLCBleGlzdGluZyBBbmd1bGFyIGNvZGUgYWJ1c2VzIEBJbmplY3RhYmxlLCBhcHBseWluZ1xuICAgIC8vIGl0IHRvIHRoaW5ncyBsaWtlIGFic3RyYWN0IGNsYXNzZXMgd2l0aCBjb25zdHJ1Y3RvcnMgdGhhdCB3ZXJlIG5ldmVyIG1lYW50IGZvciB1c2Ugd2l0aFxuICAgIC8vIEFuZ3VsYXIncyBESS5cbiAgICAvL1xuICAgIC8vIFRvIGRlYWwgd2l0aCB0aGlzLCBASW5qZWN0YWJsZSgpIHdpdGhvdXQgYW4gYXJndW1lbnQgaXMgbW9yZSBsZW5pZW50LCBhbmQgaWYgdGhlXG4gICAgLy8gY29uc3RydWN0b3Igc2lnbmF0dXJlIGRvZXMgbm90IHdvcmsgZm9yIERJIHRoZW4gYSBmYWN0b3J5IGRlZmluaXRpb24gKMm1ZmFjKSB0aGF0IHRocm93cyBpc1xuICAgIC8vIGdlbmVyYXRlZC5cbiAgICBpZiAoc3RyaWN0Q3RvckRlcHMpIHtcbiAgICAgIGN0b3JEZXBzID0gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JEZXBzID0gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmUpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3RvckRlcHM7XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgcmF3Q3RvckRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSk7XG5cbiAgICBpZiAoc3RyaWN0Q3RvckRlcHMgJiYgbWV0YS51c2VWYWx1ZSA9PT0gdW5kZWZpbmVkICYmIG1ldGEudXNlRXhpc3RpbmcgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBtZXRhLnVzZUNsYXNzID09PSB1bmRlZmluZWQgJiYgbWV0YS51c2VGYWN0b3J5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFNpbmNlIHVzZSogd2FzIG5vdCBwcm92aWRlZCwgdmFsaWRhdGUgdGhlIGRlcHMgYWNjb3JkaW5nIHRvIHN0cmljdEN0b3JEZXBzLlxuICAgICAgY3RvckRlcHMgPSB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByYXdDdG9yRGVwcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JEZXBzID0gdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMocmF3Q3RvckRlcHMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjdG9yRGVwcztcbn1cblxuZnVuY3Rpb24gZ2V0RGVwKGRlcDogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhIHtcbiAgY29uc3QgbWV0YTogUjNEZXBlbmRlbmN5TWV0YWRhdGEgPSB7XG4gICAgdG9rZW46IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVwKSxcbiAgICBob3N0OiBmYWxzZSxcbiAgICByZXNvbHZlZDogUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuLFxuICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICBzZWxmOiBmYWxzZSxcbiAgICBza2lwU2VsZjogZmFsc2UsXG4gIH07XG5cbiAgZnVuY3Rpb24gbWF5YmVVcGRhdGVEZWNvcmF0b3IoXG4gICAgICBkZWM6IHRzLklkZW50aWZpZXIsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHRva2VuPzogdHMuRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGNvbnN0IHNvdXJjZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjKTtcbiAgICBpZiAoc291cmNlID09PSBudWxsIHx8IHNvdXJjZS5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3dpdGNoIChzb3VyY2UubmFtZSkge1xuICAgICAgY2FzZSAnSW5qZWN0JzpcbiAgICAgICAgaWYgKHRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtZXRhLnRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdPcHRpb25hbCc6XG4gICAgICAgIG1ldGEub3B0aW9uYWwgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NraXBTZWxmJzpcbiAgICAgICAgbWV0YS5za2lwU2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2VsZic6XG4gICAgICAgIG1ldGEuc2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwKSkge1xuICAgIGRlcC5lbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZWwpKSB7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLCByZWZsZWN0b3IpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc05ld0V4cHJlc3Npb24oZWwpICYmIHRzLmlzSWRlbnRpZmllcihlbC5leHByZXNzaW9uKSkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGVsLmFyZ3VtZW50cyAmJiBlbC5hcmd1bWVudHMubGVuZ3RoID4gMCAmJiBlbC5hcmd1bWVudHNbMF0gfHwgdW5kZWZpbmVkO1xuICAgICAgICBtYXliZVVwZGF0ZURlY29yYXRvcihlbC5leHByZXNzaW9uLCByZWZsZWN0b3IsIHRva2VuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbWV0YTtcbn1cbiJdfQ==