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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/injectable", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
     */
    var InjectableDecoratorHandler = /** @class */ (function () {
        function InjectableDecoratorHandler(reflector) {
            this.reflector = reflector;
        }
        InjectableDecoratorHandler.prototype.detect = function (decorator) {
            return decorator.find(function (decorator) { return decorator.name === 'Injectable' && util_1.isAngularCore(decorator); });
        };
        InjectableDecoratorHandler.prototype.analyze = function (node, decorator) {
            return {
                analysis: extractInjectableMetadata(node, decorator, this.reflector),
            };
        };
        InjectableDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compileInjectable(analysis);
            return {
                field: 'ngInjectableDef',
                initializer: res.expression,
                statements: [],
                type: res.type,
            };
        };
        return InjectableDecoratorHandler;
    }());
    exports.InjectableDecoratorHandler = InjectableDecoratorHandler;
    /**
     * Read metadata from the `@Injectable` decorator and produce the `IvyInjectableMetadata`, the input
     * metadata needed to run `compileIvyInjectable`.
     */
    function extractInjectableMetadata(clazz, decorator, reflector) {
        if (clazz.name === undefined) {
            throw new Error("@Injectables must have names");
        }
        var name = clazz.name.text;
        var type = new compiler_1.WrappedNodeExpr(clazz.name);
        if (decorator.args === null) {
            throw new Error("@Injectable must be called");
        }
        if (decorator.args.length === 0) {
            return {
                name: name,
                type: type,
                providedIn: new compiler_1.LiteralExpr(null),
                deps: util_1.getConstructorDependencies(clazz, reflector),
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
            var meta = metadata_1.reflectObjectLiteral(metaNode);
            var providedIn = new compiler_1.LiteralExpr(null);
            if (meta.has('providedIn')) {
                providedIn = new compiler_1.WrappedNodeExpr(meta.get('providedIn'));
            }
            if (meta.has('useValue')) {
                return { name: name, type: type, providedIn: providedIn, useValue: new compiler_1.WrappedNodeExpr(meta.get('useValue')) };
            }
            else if (meta.has('useExisting')) {
                return { name: name, type: type, providedIn: providedIn, useExisting: new compiler_1.WrappedNodeExpr(meta.get('useExisting')) };
            }
            else if (meta.has('useClass')) {
                return { name: name, type: type, providedIn: providedIn, useClass: new compiler_1.WrappedNodeExpr(meta.get('useClass')) };
            }
            else if (meta.has('useFactory')) {
                // useFactory is special - the 'deps' property must be analyzed.
                var factory = new compiler_1.WrappedNodeExpr(meta.get('useFactory'));
                var deps = [];
                if (meta.has('deps')) {
                    var depsExpr = meta.get('deps');
                    if (!ts.isArrayLiteralExpression(depsExpr)) {
                        throw new Error("In Ivy, deps metadata must be inline.");
                    }
                    if (depsExpr.elements.length > 0) {
                        throw new Error("deps not yet supported");
                    }
                    deps.push.apply(deps, tslib_1.__spread(depsExpr.elements.map(function (dep) { return getDep(dep, reflector); })));
                }
                return { name: name, type: type, providedIn: providedIn, useFactory: factory, deps: deps };
            }
            else {
                var deps = util_1.getConstructorDependencies(clazz, reflector);
                return { name: name, type: type, providedIn: providedIn, deps: deps };
            }
        }
        else {
            throw new Error("Too many arguments to @Injectable");
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTRMO0lBQzVMLCtCQUFpQztJQUdqQyxxRUFBb0Q7SUFHcEQsNkVBQWlFO0lBR2pFOztPQUVHO0lBQ0g7UUFDRSxvQ0FBb0IsU0FBeUI7WUFBekIsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFBRyxDQUFDO1FBRWpELDJDQUFNLEdBQU4sVUFBTyxTQUFzQjtZQUMzQixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLFlBQVksSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDLENBQUM7UUFDbEcsQ0FBQztRQUVELDRDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQ3JELE9BQU87Z0JBQ0wsUUFBUSxFQUFFLHlCQUF5QixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQzthQUNyRSxDQUFDO1FBQ0osQ0FBQztRQUVELDRDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFFBQThCO1lBQy9ELElBQU0sR0FBRyxHQUFHLDRCQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLE9BQU87Z0JBQ0wsS0FBSyxFQUFFLGlCQUFpQjtnQkFDeEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVO2dCQUMzQixVQUFVLEVBQUUsRUFBRTtnQkFDZCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7YUFDZixDQUFDO1FBQ0osQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXRCRCxJQXNCQztJQXRCWSxnRUFBMEI7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QUUsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO29CQUN0RixvQkFBb0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDdkQ7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIExpdGVyYWxFeHByLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNJbmplY3RhYmxlTWV0YWRhdGEsIFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSW5qZWN0YWJsZSBhcyBjb21waWxlSXZ5SW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge3JlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge2dldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogQWRhcHRzIHRoZSBgY29tcGlsZUl2eUluamVjdGFibGVgIGNvbXBpbGVyIGZvciBgQEluamVjdGFibGVgIGRlY29yYXRvcnMgdG8gdGhlIEl2eSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM0luamVjdGFibGVNZXRhZGF0YT4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgZGV0ZWN0KGRlY29yYXRvcjogRGVjb3JhdG9yW10pOiBEZWNvcmF0b3J8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gZGVjb3JhdG9yLmZpbmQoZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnSW5qZWN0YWJsZScgJiYgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKTtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxSM0luamVjdGFibGVNZXRhZGF0YT4ge1xuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczogZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yKSxcbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNJbmplY3RhYmxlTWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlSXZ5SW5qZWN0YWJsZShhbmFseXNpcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpZWxkOiAnbmdJbmplY3RhYmxlRGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWQgbWV0YWRhdGEgZnJvbSB0aGUgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3IgYW5kIHByb2R1Y2UgdGhlIGBJdnlJbmplY3RhYmxlTWV0YWRhdGFgLCB0aGUgaW5wdXRcbiAqIG1ldGFkYXRhIG5lZWRlZCB0byBydW4gYGNvbXBpbGVJdnlJbmplY3RhYmxlYC5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzSW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgaWYgKGNsYXp6Lm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQEluamVjdGFibGVzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gIGNvbnN0IHR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUpO1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEBJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkYCk7XG4gIH1cbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIHByb3ZpZGVkSW46IG5ldyBMaXRlcmFsRXhwcihudWxsKSxcbiAgICAgIGRlcHM6IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IpLFxuICAgIH07XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbWV0YU5vZGUgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICAvLyBGaXJzdGx5IG1ha2Ugc3VyZSB0aGUgZGVjb3JhdG9yIGFyZ3VtZW50IGlzIGFuIGlubGluZSBsaXRlcmFsIC0gaWYgbm90LCBpdCdzIGlsbGVnYWwgdG9cbiAgICAvLyB0cmFuc3BvcnQgcmVmZXJlbmNlcyBmcm9tIG9uZSBsb2NhdGlvbiB0byBhbm90aGVyLiBUaGlzIGlzIHRoZSBwcm9ibGVtIHRoYXQgbG93ZXJpbmdcbiAgICAvLyB1c2VkIHRvIHNvbHZlIC0gaWYgdGhpcyByZXN0cmljdGlvbiBwcm92ZXMgdG9vIHVuZGVzaXJhYmxlIHdlIGNhbiByZS1pbXBsZW1lbnQgbG93ZXJpbmcuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGFOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbiBJdnksIGRlY29yYXRvciBtZXRhZGF0YSBtdXN0IGJlIGlubGluZS5gKTtcbiAgICB9XG5cbiAgICAvLyBSZXNvbHZlIHRoZSBmaWVsZHMgb2YgdGhlIGxpdGVyYWwgaW50byBhIG1hcCBvZiBmaWVsZCBuYW1lIHRvIGV4cHJlc3Npb24uXG4gICAgY29uc3QgbWV0YSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGFOb2RlKTtcbiAgICBsZXQgcHJvdmlkZWRJbjogRXhwcmVzc2lvbiA9IG5ldyBMaXRlcmFsRXhwcihudWxsKTtcbiAgICBpZiAobWV0YS5oYXMoJ3Byb3ZpZGVkSW4nKSkge1xuICAgICAgcHJvdmlkZWRJbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3Byb3ZpZGVkSW4nKSAhKTtcbiAgICB9XG4gICAgaWYgKG1ldGEuaGFzKCd1c2VWYWx1ZScpKSB7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIHVzZVZhbHVlOiBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCd1c2VWYWx1ZScpICEpfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VFeGlzdGluZycpKSB7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIHVzZUV4aXN0aW5nOiBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCd1c2VFeGlzdGluZycpICEpfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VDbGFzcycpKSB7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIHVzZUNsYXNzOiBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCd1c2VDbGFzcycpICEpfTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpIHtcbiAgICAgIC8vIHVzZUZhY3RvcnkgaXMgc3BlY2lhbCAtIHRoZSAnZGVwcycgcHJvcGVydHkgbXVzdCBiZSBhbmFseXplZC5cbiAgICAgIGNvbnN0IGZhY3RvcnkgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCd1c2VGYWN0b3J5JykgISk7XG4gICAgICBjb25zdCBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdID0gW107XG4gICAgICBpZiAobWV0YS5oYXMoJ2RlcHMnKSkge1xuICAgICAgICBjb25zdCBkZXBzRXhwciA9IG1ldGEuZ2V0KCdkZXBzJykgITtcbiAgICAgICAgaWYgKCF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwc0V4cHIpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbiBJdnksIGRlcHMgbWV0YWRhdGEgbXVzdCBiZSBpbmxpbmUuYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlcHNFeHByLmVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGRlcHMgbm90IHlldCBzdXBwb3J0ZWRgKTtcbiAgICAgICAgfVxuICAgICAgICBkZXBzLnB1c2goLi4uZGVwc0V4cHIuZWxlbWVudHMubWFwKGRlcCA9PiBnZXREZXAoZGVwLCByZWZsZWN0b3IpKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIHVzZUZhY3Rvcnk6IGZhY3RvcnksIGRlcHN9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkZXBzID0gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3Rvcik7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIGRlcHN9O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRvbyBtYW55IGFyZ3VtZW50cyB0byBASW5qZWN0YWJsZWApO1xuICB9XG59XG5cblxuXG5mdW5jdGlvbiBnZXREZXAoZGVwOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBtZXRhOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSA9IHtcbiAgICB0b2tlbjogbmV3IFdyYXBwZWROb2RlRXhwcihkZXApLFxuICAgIGhvc3Q6IGZhbHNlLFxuICAgIHJlc29sdmVkOiBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW4sXG4gICAgb3B0aW9uYWw6IGZhbHNlLFxuICAgIHNlbGY6IGZhbHNlLFxuICAgIHNraXBTZWxmOiBmYWxzZSxcbiAgfTtcblxuICBmdW5jdGlvbiBtYXliZVVwZGF0ZURlY29yYXRvcihcbiAgICAgIGRlYzogdHMuSWRlbnRpZmllciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgdG9rZW4/OiB0cy5FeHByZXNzaW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc291cmNlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWMpO1xuICAgIGlmIChzb3VyY2UgPT09IG51bGwgfHwgc291cmNlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzd2l0Y2ggKHNvdXJjZS5uYW1lKSB7XG4gICAgICBjYXNlICdJbmplY3QnOlxuICAgICAgICBpZiAodG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1ldGEudG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ09wdGlvbmFsJzpcbiAgICAgICAgbWV0YS5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2tpcFNlbGYnOlxuICAgICAgICBtZXRhLnNraXBTZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTZWxmJzpcbiAgICAgICAgbWV0YS5zZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXApKSB7XG4gICAgZGVwLmVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihlbCkpIHtcbiAgICAgICAgbWF5YmVVcGRhdGVEZWNvcmF0b3IoZWwsIHJlZmxlY3Rvcik7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzTmV3RXhwcmVzc2lvbihlbCkgJiYgdHMuaXNJZGVudGlmaWVyKGVsLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gZWwuYXJndW1lbnRzICYmIGVsLmFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGVsLmFyZ3VtZW50c1swXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLmV4cHJlc3Npb24sIHJlZmxlY3RvciwgdG9rZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBtZXRhO1xufVxuIl19