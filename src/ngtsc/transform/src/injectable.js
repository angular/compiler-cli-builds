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
        define("@angular/compiler-cli/src/ngtsc/transform/src/injectable", ["require", "exports", "tslib", "@angular/compiler/index", "typescript", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler/index");
    var ts = require("typescript");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    /**
     * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
     */
    var InjectableCompilerAdapter = /** @class */ (function () {
        function InjectableCompilerAdapter(checker) {
            this.checker = checker;
        }
        InjectableCompilerAdapter.prototype.detect = function (decorator) {
            return decorator.find(function (dec) { return dec.name === 'Injectable' && dec.from === '@angular/core'; });
        };
        InjectableCompilerAdapter.prototype.analyze = function (node, decorator) {
            return {
                analysis: extractInjectableMetadata(node, decorator, this.checker),
            };
        };
        InjectableCompilerAdapter.prototype.compile = function (node, analysis) {
            var res = compiler_1.compileIvyInjectable(analysis);
            return {
                field: 'ngInjectableDef',
                initializer: res.expression,
                type: res.type,
            };
        };
        return InjectableCompilerAdapter;
    }());
    exports.InjectableCompilerAdapter = InjectableCompilerAdapter;
    /**
     * Read metadata from the `@Injectable` decorator and produce the `IvyInjectableMetadata`, the input
     * metadata needed to run `compileIvyInjectable`.
     */
    function extractInjectableMetadata(clazz, decorator, checker) {
        if (clazz.name === undefined) {
            throw new Error("@Injectables must have names");
        }
        var name = clazz.name.text;
        var type = new compiler_1.WrappedNodeExpr(clazz.name);
        if (decorator.args.length === 0) {
            return {
                name: name,
                type: type,
                providedIn: new compiler_1.LiteralExpr(null),
                useType: getUseType(clazz, checker),
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
            var meta = reflector_1.reflectObjectLiteral(metaNode);
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
                    deps.push.apply(deps, tslib_1.__spread(depsExpr.elements.map(function (dep) { return getDep(dep, checker); })));
                }
                return { name: name, type: type, providedIn: providedIn, useFactory: { factory: factory, deps: deps } };
            }
            else {
                var useType = getUseType(clazz, checker);
                return { name: name, type: type, providedIn: providedIn, useType: useType };
            }
        }
        else {
            throw new Error("Too many arguments to @Injectable");
        }
    }
    function getUseType(clazz, checker) {
        var useType = [];
        var ctorParams = (reflector_1.reflectConstructorParameters(clazz, checker) || []);
        ctorParams.forEach(function (param) {
            var tokenExpr = param.typeValueExpr;
            var optional = false, self = false, skipSelf = false;
            param.decorators.filter(function (dec) { return dec.from === '@angular/core'; }).forEach(function (dec) {
                if (dec.name === 'Inject') {
                    if (dec.args.length !== 1) {
                        throw new Error("Unexpected number of arguments to @Inject().");
                    }
                    tokenExpr = dec.args[0];
                }
                else if (dec.name === 'Optional') {
                    optional = true;
                }
                else if (dec.name === 'SkipSelf') {
                    skipSelf = true;
                }
                else if (dec.name === 'Self') {
                    self = true;
                }
                else {
                    throw new Error("Unexpected decorator " + dec.name + " on parameter.");
                }
                if (tokenExpr === null) {
                    throw new Error("No suitable token for parameter!");
                }
            });
            var token = new compiler_1.WrappedNodeExpr(tokenExpr);
            useType.push({ token: token, optional: optional, self: self, skipSelf: skipSelf, attribute: false });
        });
        return useType;
    }
    function getDep(dep, checker) {
        var depObj = {
            token: new compiler_1.WrappedNodeExpr(dep),
            optional: false,
            self: false,
            skipSelf: false,
            attribute: false,
        };
        function maybeUpdateDecorator(dec, token) {
            var source = reflector_1.reflectImportedIdentifier(dec, checker);
            if (source === null || source.from !== '@angular/core') {
                return;
            }
            switch (source.name) {
                case 'Inject':
                    if (token !== undefined) {
                        depObj.token = new compiler_1.WrappedNodeExpr(token);
                    }
                    break;
                case 'Optional':
                    depObj.optional = true;
                    break;
                case 'SkipSelf':
                    depObj.skipSelf = true;
                    break;
                case 'Self':
                    depObj.self = true;
                    break;
            }
        }
        if (ts.isArrayLiteralExpression(dep)) {
            dep.elements.forEach(function (el) {
                if (ts.isIdentifier(el)) {
                    maybeUpdateDecorator(el);
                }
                else if (ts.isNewExpression(el) && ts.isIdentifier(el.expression)) {
                    var token = el.arguments && el.arguments.length > 0 && el.arguments[0] || undefined;
                    maybeUpdateDecorator(el.expression, token);
                }
            });
        }
        return depObj;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNmb3JtL3NyYy9pbmplY3RhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILG9EQUEwSTtJQUMxSSwrQkFBaUM7SUFHakMsb0ZBQTJIO0lBSzNIOztPQUVHO0lBQ0g7UUFDRSxtQ0FBb0IsT0FBdUI7WUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFBRyxDQUFDO1FBRS9DLDBDQUFNLEdBQU4sVUFBTyxTQUFzQjtZQUMzQixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssWUFBWSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUF6RCxDQUF5RCxDQUFDLENBQUM7UUFDMUYsQ0FBQztRQUVELDJDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQ3JELE1BQU0sQ0FBQztnQkFDTCxRQUFRLEVBQUUseUJBQXlCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO2FBQ25FLENBQUM7UUFDSixDQUFDO1FBRUQsMkNBQU8sR0FBUCxVQUFRLElBQXlCLEVBQUUsUUFBK0I7WUFDaEUsSUFBTSxHQUFHLEdBQUcsK0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDO2dCQUNMLEtBQUssRUFBRSxpQkFBaUI7Z0JBQ3hCLFdBQVcsRUFBRSxHQUFHLENBQUMsVUFBVTtnQkFDM0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2FBQ2YsQ0FBQztRQUNKLENBQUM7UUFDSCxnQ0FBQztJQUFELENBQUMsQUFyQkQsSUFxQkM7SUFyQlksOERBQXlCO0lBdUJ0Qzs7O09BR0c7SUFD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QUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEUsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUM7b0JBQ3RGLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzdDLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgSXZ5SW5qZWN0YWJsZURlcCwgSXZ5SW5qZWN0YWJsZU1ldGFkYXRhLCBMaXRlcmFsRXhwciwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSXZ5SW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge3JlZmxlY3RDb25zdHJ1Y3RvclBhcmFtZXRlcnMsIHJlZmxlY3RJbXBvcnRlZElkZW50aWZpZXIsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yJztcblxuaW1wb3J0IHtBZGRTdGF0aWNGaWVsZEluc3RydWN0aW9uLCBBbmFseXNpc091dHB1dCwgQ29tcGlsZXJBZGFwdGVyfSBmcm9tICcuL2FwaSc7XG5cblxuLyoqXG4gKiBBZGFwdHMgdGhlIGBjb21waWxlSXZ5SW5qZWN0YWJsZWAgY29tcGlsZXIgZm9yIGBASW5qZWN0YWJsZWAgZGVjb3JhdG9ycyB0byB0aGUgSXZ5IGNvbXBpbGVyLlxuICovXG5leHBvcnQgY2xhc3MgSW5qZWN0YWJsZUNvbXBpbGVyQWRhcHRlciBpbXBsZW1lbnRzIENvbXBpbGVyQWRhcHRlcjxJdnlJbmplY3RhYmxlTWV0YWRhdGE+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge31cblxuICBkZXRlY3QoZGVjb3JhdG9yOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3IuZmluZChkZWMgPT4gZGVjLm5hbWUgPT09ICdJbmplY3RhYmxlJyAmJiBkZWMuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxJdnlJbmplY3RhYmxlTWV0YWRhdGE+IHtcbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLmNoZWNrZXIpLFxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBJdnlJbmplY3RhYmxlTWV0YWRhdGEpOiBBZGRTdGF0aWNGaWVsZEluc3RydWN0aW9uIHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlSXZ5SW5qZWN0YWJsZShhbmFseXNpcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpZWxkOiAnbmdJbmplY3RhYmxlRGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkIG1ldGFkYXRhIGZyb20gdGhlIGBASW5qZWN0YWJsZWAgZGVjb3JhdG9yIGFuZCBwcm9kdWNlIHRoZSBgSXZ5SW5qZWN0YWJsZU1ldGFkYXRhYCwgdGhlIGlucHV0XG4gKiBtZXRhZGF0YSBuZWVkZWQgdG8gcnVuIGBjb21waWxlSXZ5SW5qZWN0YWJsZWAuXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEoXG4gICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogSXZ5SW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgaWYgKGNsYXp6Lm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQEluamVjdGFibGVzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gIGNvbnN0IHR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUpO1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlLFxuICAgICAgcHJvdmlkZWRJbjogbmV3IExpdGVyYWxFeHByKG51bGwpLFxuICAgICAgdXNlVHlwZTogZ2V0VXNlVHlwZShjbGF6eiwgY2hlY2tlciksXG4gICAgfTtcbiAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCBtZXRhTm9kZSA9IGRlY29yYXRvci5hcmdzWzBdO1xuICAgIC8vIEZpcnN0bHkgbWFrZSBzdXJlIHRoZSBkZWNvcmF0b3IgYXJndW1lbnQgaXMgYW4gaW5saW5lIGxpdGVyYWwgLSBpZiBub3QsIGl0J3MgaWxsZWdhbCB0b1xuICAgIC8vIHRyYW5zcG9ydCByZWZlcmVuY2VzIGZyb20gb25lIGxvY2F0aW9uIHRvIGFub3RoZXIuIFRoaXMgaXMgdGhlIHByb2JsZW0gdGhhdCBsb3dlcmluZ1xuICAgIC8vIHVzZWQgdG8gc29sdmUgLSBpZiB0aGlzIHJlc3RyaWN0aW9uIHByb3ZlcyB0b28gdW5kZXNpcmFibGUgd2UgY2FuIHJlLWltcGxlbWVudCBsb3dlcmluZy5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YU5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluIEl2eSwgZGVjb3JhdG9yIG1ldGFkYXRhIG11c3QgYmUgaW5saW5lLmApO1xuICAgIH1cblxuICAgIC8vIFJlc29sdmUgdGhlIGZpZWxkcyBvZiB0aGUgbGl0ZXJhbCBpbnRvIGEgbWFwIG9mIGZpZWxkIG5hbWUgdG8gZXhwcmVzc2lvbi5cbiAgICBjb25zdCBtZXRhID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YU5vZGUpO1xuICAgIGxldCBwcm92aWRlZEluOiBFeHByZXNzaW9uID0gbmV3IExpdGVyYWxFeHByKG51bGwpO1xuICAgIGlmIChtZXRhLmhhcygncHJvdmlkZWRJbicpKSB7XG4gICAgICBwcm92aWRlZEluID0gbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgncHJvdmlkZWRJbicpICEpO1xuICAgIH1cbiAgICBpZiAobWV0YS5oYXMoJ3VzZVZhbHVlJykpIHtcbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgcHJvdmlkZWRJbiwgdXNlVmFsdWU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZVZhbHVlJykgISl9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUV4aXN0aW5nJykpIHtcbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgcHJvdmlkZWRJbiwgdXNlRXhpc3Rpbmc6IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUV4aXN0aW5nJykgISl9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgcHJvdmlkZWRJbiwgdXNlQ2xhc3M6IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUNsYXNzJykgISl9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUZhY3RvcnknKSkge1xuICAgICAgLy8gdXNlRmFjdG9yeSBpcyBzcGVjaWFsIC0gdGhlICdkZXBzJyBwcm9wZXJ0eSBtdXN0IGJlIGFuYWx5emVkLlxuICAgICAgY29uc3QgZmFjdG9yeSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUZhY3RvcnknKSAhKTtcbiAgICAgIGNvbnN0IGRlcHM6IEl2eUluamVjdGFibGVEZXBbXSA9IFtdO1xuICAgICAgaWYgKG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgICAgY29uc3QgZGVwc0V4cHIgPSBtZXRhLmdldCgnZGVwcycpICE7XG4gICAgICAgIGlmICghdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlcHNFeHByKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW4gSXZ5LCBkZXBzIG1ldGFkYXRhIG11c3QgYmUgaW5saW5lLmApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZXBzRXhwci5lbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkZXBzIG5vdCB5ZXQgc3VwcG9ydGVkYCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVwcy5wdXNoKC4uLmRlcHNFeHByLmVsZW1lbnRzLm1hcChkZXAgPT4gZ2V0RGVwKGRlcCwgY2hlY2tlcikpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgcHJvdmlkZWRJbiwgdXNlRmFjdG9yeToge2ZhY3RvcnksIGRlcHN9fTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdXNlVHlwZSA9IGdldFVzZVR5cGUoY2xhenosIGNoZWNrZXIpO1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCBwcm92aWRlZEluLCB1c2VUeXBlfTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUb28gbWFueSBhcmd1bWVudHMgdG8gQEluamVjdGFibGVgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRVc2VUeXBlKGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IEl2eUluamVjdGFibGVEZXBbXSB7XG4gIGNvbnN0IHVzZVR5cGU6IEl2eUluamVjdGFibGVEZXBbXSA9IFtdO1xuICBjb25zdCBjdG9yUGFyYW1zID0gKHJlZmxlY3RDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhenosIGNoZWNrZXIpIHx8IFtdKTtcbiAgY3RvclBhcmFtcy5mb3JFYWNoKHBhcmFtID0+IHtcbiAgICBsZXQgdG9rZW5FeHByID0gcGFyYW0udHlwZVZhbHVlRXhwcjtcbiAgICBsZXQgb3B0aW9uYWwgPSBmYWxzZSwgc2VsZiA9IGZhbHNlLCBza2lwU2VsZiA9IGZhbHNlO1xuICAgIHBhcmFtLmRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiBkZWMuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKS5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBpZiAoZGVjLm5hbWUgPT09ICdJbmplY3QnKSB7XG4gICAgICAgIGlmIChkZWMuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBASW5qZWN0KCkuYCk7XG4gICAgICAgIH1cbiAgICAgICAgdG9rZW5FeHByID0gZGVjLmFyZ3NbMF07XG4gICAgICB9IGVsc2UgaWYgKGRlYy5uYW1lID09PSAnT3B0aW9uYWwnKSB7XG4gICAgICAgIG9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjLm5hbWUgPT09ICdTa2lwU2VsZicpIHtcbiAgICAgICAgc2tpcFNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChkZWMubmFtZSA9PT0gJ1NlbGYnKSB7XG4gICAgICAgIHNlbGYgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGRlY29yYXRvciAke2RlYy5uYW1lfSBvbiBwYXJhbWV0ZXIuYCk7XG4gICAgICB9XG4gICAgICBpZiAodG9rZW5FeHByID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gc3VpdGFibGUgdG9rZW4gZm9yIHBhcmFtZXRlciFgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb25zdCB0b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodG9rZW5FeHByKTtcbiAgICB1c2VUeXBlLnB1c2goe3Rva2VuLCBvcHRpb25hbCwgc2VsZiwgc2tpcFNlbGYsIGF0dHJpYnV0ZTogZmFsc2V9KTtcbiAgfSk7XG4gIHJldHVybiB1c2VUeXBlO1xufVxuXG5mdW5jdGlvbiBnZXREZXAoZGVwOiB0cy5FeHByZXNzaW9uLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IEl2eUluamVjdGFibGVEZXAge1xuICBjb25zdCBkZXBPYmogPSB7XG4gICAgdG9rZW46IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVwKSxcbiAgICBvcHRpb25hbDogZmFsc2UsXG4gICAgc2VsZjogZmFsc2UsXG4gICAgc2tpcFNlbGY6IGZhbHNlLFxuICAgIGF0dHJpYnV0ZTogZmFsc2UsXG4gIH07XG5cbiAgZnVuY3Rpb24gbWF5YmVVcGRhdGVEZWNvcmF0b3IoZGVjOiB0cy5JZGVudGlmaWVyLCB0b2tlbj86IHRzLkV4cHJlc3Npb24pOiB2b2lkIHtcbiAgICBjb25zdCBzb3VyY2UgPSByZWZsZWN0SW1wb3J0ZWRJZGVudGlmaWVyKGRlYywgY2hlY2tlcik7XG4gICAgaWYgKHNvdXJjZSA9PT0gbnVsbCB8fCBzb3VyY2UuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN3aXRjaCAoc291cmNlLm5hbWUpIHtcbiAgICAgIGNhc2UgJ0luamVjdCc6XG4gICAgICAgIGlmICh0b2tlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZGVwT2JqLnRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdPcHRpb25hbCc6XG4gICAgICAgIGRlcE9iai5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2tpcFNlbGYnOlxuICAgICAgICBkZXBPYmouc2tpcFNlbGYgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NlbGYnOlxuICAgICAgICBkZXBPYmouc2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwKSkge1xuICAgIGRlcC5lbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZWwpKSB7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsKTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNOZXdFeHByZXNzaW9uKGVsKSAmJiB0cy5pc0lkZW50aWZpZXIoZWwuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBlbC5hcmd1bWVudHMgJiYgZWwuYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgZWwuYXJndW1lbnRzWzBdIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgbWF5YmVVcGRhdGVEZWNvcmF0b3IoZWwuZXhwcmVzc2lvbiwgdG9rZW4pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBkZXBPYmo7XG59XG4iXX0=