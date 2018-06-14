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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/injectable", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
     */
    var InjectableDecoratorHandler = /** @class */ (function () {
        function InjectableDecoratorHandler(checker) {
            this.checker = checker;
        }
        InjectableDecoratorHandler.prototype.detect = function (decorator) {
            return decorator.find(function (dec) { return dec.name === 'Injectable' && dec.from === '@angular/core'; });
        };
        InjectableDecoratorHandler.prototype.analyze = function (node, decorator) {
            return {
                analysis: extractInjectableMetadata(node, decorator, this.checker),
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
                deps: util_1.getConstructorDependencies(clazz, checker),
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
                return { name: name, type: type, providedIn: providedIn, useFactory: factory, deps: deps };
            }
            else {
                var deps = util_1.getConstructorDependencies(clazz, checker);
                return { name: name, type: type, providedIn: providedIn, deps: deps };
            }
        }
        else {
            throw new Error("Too many arguments to @Injectable");
        }
    }
    function getDep(dep, checker) {
        var meta = {
            token: new compiler_1.WrappedNodeExpr(dep),
            host: false,
            resolved: compiler_1.R3ResolvedDependencyType.Token,
            optional: false,
            self: false,
            skipSelf: false,
        };
        function maybeUpdateDecorator(dec, token) {
            var source = reflector_1.reflectImportedIdentifier(dec, checker);
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
                    maybeUpdateDecorator(el);
                }
                else if (ts.isNewExpression(el) && ts.isIdentifier(el.expression)) {
                    var token = el.arguments && el.arguments.length > 0 && el.arguments[0] || undefined;
                    maybeUpdateDecorator(el.expression, token);
                }
            });
        }
        return meta;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTRMO0lBQzVMLCtCQUFpQztJQUdqQyxvRkFBMkg7SUFHM0gsNkVBQWtEO0lBR2xEOztPQUVHO0lBQ0g7UUFDRSxvQ0FBb0IsT0FBdUI7WUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFBRyxDQUFDO1FBRS9DLDJDQUFNLEdBQU4sVUFBTyxTQUFzQjtZQUMzQixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsSUFBSSxLQUFLLFlBQVksSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBekQsQ0FBeUQsQ0FBQyxDQUFDO1FBQzFGLENBQUM7UUFFRCw0Q0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxTQUFvQjtZQUNyRCxPQUFPO2dCQUNMLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7YUFDbkUsQ0FBQztRQUNKLENBQUM7UUFFRCw0Q0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxRQUE4QjtZQUMvRCxJQUFNLEdBQUcsR0FBRyw0QkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxPQUFPO2dCQUNMLEtBQUssRUFBRSxpQkFBaUI7Z0JBQ3hCLFdBQVcsRUFBRSxHQUFHLENBQUMsVUFBVTtnQkFDM0IsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2FBQ2YsQ0FBQztRQUNKLENBQUM7UUFDSCxpQ0FBQztJQUFELENBQUMsQUF0QkQsSUFzQkM7SUF0QlksZ0VB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QUN0RixvQkFBb0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUM1QztZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgTGl0ZXJhbEV4cHIsIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM0luamVjdGFibGVNZXRhZGF0YSwgUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RhYmxlIGFzIGNvbXBpbGVJdnlJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7cmVmbGVjdENvbnN0cnVjdG9yUGFyYW1ldGVycywgcmVmbGVjdEltcG9ydGVkSWRlbnRpZmllciwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtL3NyYy9hcGknO1xuXG5pbXBvcnQge2dldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogQWRhcHRzIHRoZSBgY29tcGlsZUl2eUluamVjdGFibGVgIGNvbXBpbGVyIGZvciBgQEluamVjdGFibGVgIGRlY29yYXRvcnMgdG8gdGhlIEl2eSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM0luamVjdGFibGVNZXRhZGF0YT4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3I6IERlY29yYXRvcltdKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGRlY29yYXRvci5maW5kKGRlYyA9PiBkZWMubmFtZSA9PT0gJ0luamVjdGFibGUnICYmIGRlYy5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFIzSW5qZWN0YWJsZU1ldGFkYXRhPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiBleHRyYWN0SW5qZWN0YWJsZU1ldGFkYXRhKG5vZGUsIGRlY29yYXRvciwgdGhpcy5jaGVja2VyKSxcbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNJbmplY3RhYmxlTWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlSXZ5SW5qZWN0YWJsZShhbmFseXNpcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpZWxkOiAnbmdJbmplY3RhYmxlRGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWQgbWV0YWRhdGEgZnJvbSB0aGUgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3IgYW5kIHByb2R1Y2UgdGhlIGBJdnlJbmplY3RhYmxlTWV0YWRhdGFgLCB0aGUgaW5wdXRcbiAqIG1ldGFkYXRhIG5lZWRlZCB0byBydW4gYGNvbXBpbGVJdnlJbmplY3RhYmxlYC5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBSM0luamVjdGFibGVNZXRhZGF0YSB7XG4gIGlmIChjbGF6ei5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEBJbmplY3RhYmxlcyBtdXN0IGhhdmUgbmFtZXNgKTtcbiAgfVxuICBjb25zdCBuYW1lID0gY2xhenoubmFtZS50ZXh0O1xuICBjb25zdCB0eXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcihjbGF6ei5uYW1lKTtcbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIHByb3ZpZGVkSW46IG5ldyBMaXRlcmFsRXhwcihudWxsKSxcbiAgICAgIGRlcHM6IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCBjaGVja2VyKSxcbiAgICB9O1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IG1ldGFOb2RlID0gZGVjb3JhdG9yLmFyZ3NbMF07XG4gICAgLy8gRmlyc3RseSBtYWtlIHN1cmUgdGhlIGRlY29yYXRvciBhcmd1bWVudCBpcyBhbiBpbmxpbmUgbGl0ZXJhbCAtIGlmIG5vdCwgaXQncyBpbGxlZ2FsIHRvXG4gICAgLy8gdHJhbnNwb3J0IHJlZmVyZW5jZXMgZnJvbSBvbmUgbG9jYXRpb24gdG8gYW5vdGhlci4gVGhpcyBpcyB0aGUgcHJvYmxlbSB0aGF0IGxvd2VyaW5nXG4gICAgLy8gdXNlZCB0byBzb2x2ZSAtIGlmIHRoaXMgcmVzdHJpY3Rpb24gcHJvdmVzIHRvbyB1bmRlc2lyYWJsZSB3ZSBjYW4gcmUtaW1wbGVtZW50IGxvd2VyaW5nLlxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW4gSXZ5LCBkZWNvcmF0b3IgbWV0YWRhdGEgbXVzdCBiZSBpbmxpbmUuYCk7XG4gICAgfVxuXG4gICAgLy8gUmVzb2x2ZSB0aGUgZmllbGRzIG9mIHRoZSBsaXRlcmFsIGludG8gYSBtYXAgb2YgZmllbGQgbmFtZSB0byBleHByZXNzaW9uLlxuICAgIGNvbnN0IG1ldGEgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhTm9kZSk7XG4gICAgbGV0IHByb3ZpZGVkSW46IEV4cHJlc3Npb24gPSBuZXcgTGl0ZXJhbEV4cHIobnVsbCk7XG4gICAgaWYgKG1ldGEuaGFzKCdwcm92aWRlZEluJykpIHtcbiAgICAgIHByb3ZpZGVkSW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCdwcm92aWRlZEluJykgISk7XG4gICAgfVxuICAgIGlmIChtZXRhLmhhcygndXNlVmFsdWUnKSkge1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCBwcm92aWRlZEluLCB1c2VWYWx1ZTogbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlVmFsdWUnKSAhKX07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRXhpc3RpbmcnKSkge1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCBwcm92aWRlZEluLCB1c2VFeGlzdGluZzogbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlRXhpc3RpbmcnKSAhKX07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlQ2xhc3MnKSkge1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCBwcm92aWRlZEluLCB1c2VDbGFzczogbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlQ2xhc3MnKSAhKX07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgICAvLyB1c2VGYWN0b3J5IGlzIHNwZWNpYWwgLSB0aGUgJ2RlcHMnIHByb3BlcnR5IG11c3QgYmUgYW5hbHl6ZWQuXG4gICAgICBjb25zdCBmYWN0b3J5ID0gbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlRmFjdG9yeScpICEpO1xuICAgICAgY29uc3QgZGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXSA9IFtdO1xuICAgICAgaWYgKG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgICAgY29uc3QgZGVwc0V4cHIgPSBtZXRhLmdldCgnZGVwcycpICE7XG4gICAgICAgIGlmICghdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlcHNFeHByKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW4gSXZ5LCBkZXBzIG1ldGFkYXRhIG11c3QgYmUgaW5saW5lLmApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZXBzRXhwci5lbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkZXBzIG5vdCB5ZXQgc3VwcG9ydGVkYCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVwcy5wdXNoKC4uLmRlcHNFeHByLmVsZW1lbnRzLm1hcChkZXAgPT4gZ2V0RGVwKGRlcCwgY2hlY2tlcikpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7bmFtZSwgdHlwZSwgcHJvdmlkZWRJbiwgdXNlRmFjdG9yeTogZmFjdG9yeSwgZGVwc307XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgY2hlY2tlcik7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIGRlcHN9O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRvbyBtYW55IGFyZ3VtZW50cyB0byBASW5qZWN0YWJsZWApO1xuICB9XG59XG5cblxuXG5mdW5jdGlvbiBnZXREZXAoZGVwOiB0cy5FeHByZXNzaW9uLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IFIzRGVwZW5kZW5jeU1ldGFkYXRhIHtcbiAgY29uc3QgbWV0YTogUjNEZXBlbmRlbmN5TWV0YWRhdGEgPSB7XG4gICAgdG9rZW46IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVwKSxcbiAgICBob3N0OiBmYWxzZSxcbiAgICByZXNvbHZlZDogUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuLFxuICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICBzZWxmOiBmYWxzZSxcbiAgICBza2lwU2VsZjogZmFsc2UsXG4gIH07XG5cbiAgZnVuY3Rpb24gbWF5YmVVcGRhdGVEZWNvcmF0b3IoZGVjOiB0cy5JZGVudGlmaWVyLCB0b2tlbj86IHRzLkV4cHJlc3Npb24pOiB2b2lkIHtcbiAgICBjb25zdCBzb3VyY2UgPSByZWZsZWN0SW1wb3J0ZWRJZGVudGlmaWVyKGRlYywgY2hlY2tlcik7XG4gICAgaWYgKHNvdXJjZSA9PT0gbnVsbCB8fCBzb3VyY2UuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN3aXRjaCAoc291cmNlLm5hbWUpIHtcbiAgICAgIGNhc2UgJ0luamVjdCc6XG4gICAgICAgIGlmICh0b2tlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWV0YS50b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnT3B0aW9uYWwnOlxuICAgICAgICBtZXRhLm9wdGlvbmFsID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTa2lwU2VsZic6XG4gICAgICAgIG1ldGEuc2tpcFNlbGYgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NlbGYnOlxuICAgICAgICBtZXRhLnNlbGYgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlcCkpIHtcbiAgICBkZXAuZWxlbWVudHMuZm9yRWFjaChlbCA9PiB7XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGVsKSkge1xuICAgICAgICBtYXliZVVwZGF0ZURlY29yYXRvcihlbCk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzTmV3RXhwcmVzc2lvbihlbCkgJiYgdHMuaXNJZGVudGlmaWVyKGVsLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gZWwuYXJndW1lbnRzICYmIGVsLmFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGVsLmFyZ3VtZW50c1swXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLmV4cHJlc3Npb24sIHRva2VuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbWV0YTtcbn1cbiJdfQ==