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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/injectable", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
     */
    var InjectableDecoratorHandler = /** @class */ (function () {
        function InjectableDecoratorHandler(reflector, isCore) {
            this.reflector = reflector;
            this.isCore = isCore;
        }
        InjectableDecoratorHandler.prototype.detect = function (node, decorators) {
            var _this = this;
            if (!decorators) {
                return undefined;
            }
            return decorators.find(function (decorator) { return decorator.name === 'Injectable' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        InjectableDecoratorHandler.prototype.analyze = function (node, decorator) {
            return {
                analysis: extractInjectableMetadata(node, decorator, this.reflector, this.isCore),
            };
        };
        InjectableDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compileInjectable(analysis);
            return {
                name: 'ngInjectableDef',
                initializer: res.expression,
                statements: res.statements,
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
    function extractInjectableMetadata(clazz, decorator, reflector, isCore) {
        if (clazz.name === undefined) {
            throw new Error("@Injectables must have names");
        }
        var name = clazz.name.text;
        var type = new compiler_1.WrappedNodeExpr(clazz.name);
        var ctorDeps = util_1.getConstructorDependencies(clazz, reflector, isCore);
        if (decorator.args === null) {
            throw new Error("@Injectable must be called");
        }
        if (decorator.args.length === 0) {
            return {
                name: name,
                type: type,
                providedIn: new compiler_1.LiteralExpr(null), ctorDeps: ctorDeps,
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
            var userDeps = undefined;
            if ((meta.has('useClass') || meta.has('useFactory')) && meta.has('deps')) {
                var depsExpr = meta.get('deps');
                if (!ts.isArrayLiteralExpression(depsExpr)) {
                    throw new Error("In Ivy, deps metadata must be inline.");
                }
                if (depsExpr.elements.length > 0) {
                    throw new Error("deps not yet supported");
                }
                userDeps = depsExpr.elements.map(function (dep) { return getDep(dep, reflector); });
            }
            if (meta.has('useValue')) {
                return {
                    name: name,
                    type: type,
                    ctorDeps: ctorDeps,
                    providedIn: providedIn,
                    useValue: new compiler_1.WrappedNodeExpr(meta.get('useValue'))
                };
            }
            else if (meta.has('useExisting')) {
                return {
                    name: name,
                    type: type,
                    ctorDeps: ctorDeps,
                    providedIn: providedIn,
                    useExisting: new compiler_1.WrappedNodeExpr(meta.get('useExisting'))
                };
            }
            else if (meta.has('useClass')) {
                return {
                    name: name,
                    type: type,
                    ctorDeps: ctorDeps,
                    providedIn: providedIn,
                    useClass: new compiler_1.WrappedNodeExpr(meta.get('useClass')), userDeps: userDeps
                };
            }
            else if (meta.has('useFactory')) {
                // useFactory is special - the 'deps' property must be analyzed.
                var factory = new compiler_1.WrappedNodeExpr(meta.get('useFactory'));
                return { name: name, type: type, providedIn: providedIn, useFactory: factory, ctorDeps: ctorDeps, userDeps: userDeps };
            }
            else {
                return { name: name, type: type, providedIn: providedIn, ctorDeps: ctorDeps };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEw7SUFDNUwsK0JBQWlDO0lBR2pDLHFFQUFvRDtJQUdwRCw2RUFBaUU7SUFHakU7O09BRUc7SUFDSDtRQUVFLG9DQUFvQixTQUF5QixFQUFVLE1BQWU7WUFBbEQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQUcsQ0FBQztRQUUxRSwyQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUF6RCxpQkFNQztZQUxDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ2xCLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBNUUsQ0FBNEUsQ0FBQyxDQUFDO1FBQ2pHLENBQUM7UUFFRCw0Q0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxTQUFvQjtZQUNyRCxPQUFPO2dCQUNMLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUNsRixDQUFDO1FBQ0osQ0FBQztRQUVELDRDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFFBQThCO1lBQy9ELElBQU0sR0FBRyxHQUFHLDRCQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLE9BQU87Z0JBQ0wsSUFBSSxFQUFF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RUQsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFO2dCQUNyQixJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ3ZCLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztpQkFDckM7cUJBQU0sSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNuRSxJQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztvQkFDdEYsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQ3ZEO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBMaXRlcmFsRXhwciwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzSW5qZWN0YWJsZU1ldGFkYXRhLCBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUluamVjdGFibGUgYXMgY29tcGlsZUl2eUluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtyZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZX0gZnJvbSAnLi91dGlsJztcblxuXG4vKipcbiAqIEFkYXB0cyB0aGUgYGNvbXBpbGVJdnlJbmplY3RhYmxlYCBjb21waWxlciBmb3IgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3JzIHRvIHRoZSBJdnkgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxSM0luamVjdGFibGVNZXRhZGF0YSwgRGVjb3JhdG9yPiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgZGV0ZWN0KG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdJbmplY3RhYmxlJyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8UjNJbmplY3RhYmxlTWV0YWRhdGE+IHtcbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSM0luamVjdGFibGVNZXRhZGF0YSk6IENvbXBpbGVSZXN1bHQge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVJdnlJbmplY3RhYmxlKGFuYWx5c2lzKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nSW5qZWN0YWJsZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sXG4gICAgICBzdGF0ZW1lbnRzOiByZXMuc3RhdGVtZW50cyxcbiAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkIG1ldGFkYXRhIGZyb20gdGhlIGBASW5qZWN0YWJsZWAgZGVjb3JhdG9yIGFuZCBwcm9kdWNlIHRoZSBgSXZ5SW5qZWN0YWJsZU1ldGFkYXRhYCwgdGhlIGlucHV0XG4gKiBtZXRhZGF0YSBuZWVkZWQgdG8gcnVuIGBjb21waWxlSXZ5SW5qZWN0YWJsZWAuXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEoXG4gICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGlzQ29yZTogYm9vbGVhbik6IFIzSW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgaWYgKGNsYXp6Lm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQEluamVjdGFibGVzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gIGNvbnN0IHR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUpO1xuICBjb25zdCBjdG9yRGVwcyA9IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGlzQ29yZSk7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQEluamVjdGFibGUgbXVzdCBiZSBjYWxsZWRgKTtcbiAgfVxuICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlLFxuICAgICAgcHJvdmlkZWRJbjogbmV3IExpdGVyYWxFeHByKG51bGwpLCBjdG9yRGVwcyxcbiAgICB9O1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IG1ldGFOb2RlID0gZGVjb3JhdG9yLmFyZ3NbMF07XG4gICAgLy8gRmlyc3RseSBtYWtlIHN1cmUgdGhlIGRlY29yYXRvciBhcmd1bWVudCBpcyBhbiBpbmxpbmUgbGl0ZXJhbCAtIGlmIG5vdCwgaXQncyBpbGxlZ2FsIHRvXG4gICAgLy8gdHJhbnNwb3J0IHJlZmVyZW5jZXMgZnJvbSBvbmUgbG9jYXRpb24gdG8gYW5vdGhlci4gVGhpcyBpcyB0aGUgcHJvYmxlbSB0aGF0IGxvd2VyaW5nXG4gICAgLy8gdXNlZCB0byBzb2x2ZSAtIGlmIHRoaXMgcmVzdHJpY3Rpb24gcHJvdmVzIHRvbyB1bmRlc2lyYWJsZSB3ZSBjYW4gcmUtaW1wbGVtZW50IGxvd2VyaW5nLlxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW4gSXZ5LCBkZWNvcmF0b3IgbWV0YWRhdGEgbXVzdCBiZSBpbmxpbmUuYCk7XG4gICAgfVxuXG4gICAgLy8gUmVzb2x2ZSB0aGUgZmllbGRzIG9mIHRoZSBsaXRlcmFsIGludG8gYSBtYXAgb2YgZmllbGQgbmFtZSB0byBleHByZXNzaW9uLlxuICAgIGNvbnN0IG1ldGEgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhTm9kZSk7XG4gICAgbGV0IHByb3ZpZGVkSW46IEV4cHJlc3Npb24gPSBuZXcgTGl0ZXJhbEV4cHIobnVsbCk7XG4gICAgaWYgKG1ldGEuaGFzKCdwcm92aWRlZEluJykpIHtcbiAgICAgIHByb3ZpZGVkSW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCdwcm92aWRlZEluJykgISk7XG4gICAgfVxuXG4gICAgbGV0IHVzZXJEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKG1ldGEuaGFzKCd1c2VDbGFzcycpIHx8IG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpICYmIG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgIGNvbnN0IGRlcHNFeHByID0gbWV0YS5nZXQoJ2RlcHMnKSAhO1xuICAgICAgaWYgKCF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwc0V4cHIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW4gSXZ5LCBkZXBzIG1ldGFkYXRhIG11c3QgYmUgaW5saW5lLmApO1xuICAgICAgfVxuICAgICAgaWYgKGRlcHNFeHByLmVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBkZXBzIG5vdCB5ZXQgc3VwcG9ydGVkYCk7XG4gICAgICB9XG4gICAgICB1c2VyRGVwcyA9IGRlcHNFeHByLmVsZW1lbnRzLm1hcChkZXAgPT4gZ2V0RGVwKGRlcCwgcmVmbGVjdG9yKSk7XG4gICAgfVxuXG4gICAgaWYgKG1ldGEuaGFzKCd1c2VWYWx1ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICB0eXBlLFxuICAgICAgICBjdG9yRGVwcyxcbiAgICAgICAgcHJvdmlkZWRJbixcbiAgICAgICAgdXNlVmFsdWU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZVZhbHVlJykgISlcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRXhpc3RpbmcnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgY3RvckRlcHMsXG4gICAgICAgIHByb3ZpZGVkSW4sXG4gICAgICAgIHVzZUV4aXN0aW5nOiBuZXcgV3JhcHBlZE5vZGVFeHByKG1ldGEuZ2V0KCd1c2VFeGlzdGluZycpICEpXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGN0b3JEZXBzLFxuICAgICAgICBwcm92aWRlZEluLFxuICAgICAgICB1c2VDbGFzczogbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlQ2xhc3MnKSAhKSwgdXNlckRlcHNcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgICAvLyB1c2VGYWN0b3J5IGlzIHNwZWNpYWwgLSB0aGUgJ2RlcHMnIHByb3BlcnR5IG11c3QgYmUgYW5hbHl6ZWQuXG4gICAgICBjb25zdCBmYWN0b3J5ID0gbmV3IFdyYXBwZWROb2RlRXhwcihtZXRhLmdldCgndXNlRmFjdG9yeScpICEpO1xuICAgICAgcmV0dXJuIHtuYW1lLCB0eXBlLCBwcm92aWRlZEluLCB1c2VGYWN0b3J5OiBmYWN0b3J5LCBjdG9yRGVwcywgdXNlckRlcHN9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge25hbWUsIHR5cGUsIHByb3ZpZGVkSW4sIGN0b3JEZXBzfTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUb28gbWFueSBhcmd1bWVudHMgdG8gQEluamVjdGFibGVgKTtcbiAgfVxufVxuXG5cblxuZnVuY3Rpb24gZ2V0RGVwKGRlcDogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhIHtcbiAgY29uc3QgbWV0YTogUjNEZXBlbmRlbmN5TWV0YWRhdGEgPSB7XG4gICAgdG9rZW46IG5ldyBXcmFwcGVkTm9kZUV4cHIoZGVwKSxcbiAgICBob3N0OiBmYWxzZSxcbiAgICByZXNvbHZlZDogUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLlRva2VuLFxuICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICBzZWxmOiBmYWxzZSxcbiAgICBza2lwU2VsZjogZmFsc2UsXG4gIH07XG5cbiAgZnVuY3Rpb24gbWF5YmVVcGRhdGVEZWNvcmF0b3IoXG4gICAgICBkZWM6IHRzLklkZW50aWZpZXIsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHRva2VuPzogdHMuRXhwcmVzc2lvbik6IHZvaWQge1xuICAgIGNvbnN0IHNvdXJjZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjKTtcbiAgICBpZiAoc291cmNlID09PSBudWxsIHx8IHNvdXJjZS5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3dpdGNoIChzb3VyY2UubmFtZSkge1xuICAgICAgY2FzZSAnSW5qZWN0JzpcbiAgICAgICAgaWYgKHRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtZXRhLnRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdPcHRpb25hbCc6XG4gICAgICAgIG1ldGEub3B0aW9uYWwgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NraXBTZWxmJzpcbiAgICAgICAgbWV0YS5za2lwU2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2VsZic6XG4gICAgICAgIG1ldGEuc2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwKSkge1xuICAgIGRlcC5lbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZWwpKSB7XG4gICAgICAgIG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLCByZWZsZWN0b3IpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc05ld0V4cHJlc3Npb24oZWwpICYmIHRzLmlzSWRlbnRpZmllcihlbC5leHByZXNzaW9uKSkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGVsLmFyZ3VtZW50cyAmJiBlbC5hcmd1bWVudHMubGVuZ3RoID4gMCAmJiBlbC5hcmd1bWVudHNbMF0gfHwgdW5kZWZpbmVkO1xuICAgICAgICBtYXliZVVwZGF0ZURlY29yYXRvcihlbC5leHByZXNzaW9uLCByZWZsZWN0b3IsIHRva2VuKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbWV0YTtcbn1cbiJdfQ==