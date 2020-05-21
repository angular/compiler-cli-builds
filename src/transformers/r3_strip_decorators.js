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
        define("@angular/compiler-cli/src/transformers/r3_strip_decorators", ["require", "exports", "typescript", "@angular/compiler-cli/src/metadata/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StripDecoratorsMetadataTransformer = exports.getDecoratorStripTransformerFactory = void 0;
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/metadata/index");
    function getDecoratorStripTransformerFactory(coreDecorators, reflector, checker) {
        return function (context) {
            return function (sourceFile) {
                var stripDecoratorsFromClassDeclaration = function (node) {
                    if (node.decorators === undefined) {
                        return node;
                    }
                    var decorators = node.decorators.filter(function (decorator) {
                        var callExpr = decorator.expression;
                        if (ts.isCallExpression(callExpr)) {
                            var id = callExpr.expression;
                            if (ts.isIdentifier(id)) {
                                var symbol = resolveToStaticSymbol(id, sourceFile.fileName, reflector, checker);
                                return symbol && coreDecorators.has(symbol);
                            }
                        }
                        return true;
                    });
                    if (decorators.length !== node.decorators.length) {
                        return ts.updateClassDeclaration(node, decorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], node.members);
                    }
                    return node;
                };
                var stripDecoratorPropertyAssignment = function (node) {
                    return ts.visitEachChild(node, function (member) {
                        if (!ts.isPropertyDeclaration(member) || !isDecoratorAssignment(member) ||
                            !member.initializer || !ts.isArrayLiteralExpression(member.initializer)) {
                            return member;
                        }
                        var newInitializer = ts.visitEachChild(member.initializer, function (decorator) {
                            if (!ts.isObjectLiteralExpression(decorator)) {
                                return decorator;
                            }
                            var type = lookupProperty(decorator, 'type');
                            if (!type || !ts.isIdentifier(type)) {
                                return decorator;
                            }
                            var symbol = resolveToStaticSymbol(type, sourceFile.fileName, reflector, checker);
                            if (!symbol || !coreDecorators.has(symbol)) {
                                return decorator;
                            }
                            return undefined;
                        }, context);
                        if (newInitializer === member.initializer) {
                            return member;
                        }
                        else if (newInitializer.elements.length === 0) {
                            return undefined;
                        }
                        else {
                            return ts.updateProperty(member, member.decorators, member.modifiers, member.name, member.questionToken, member.type, newInitializer);
                        }
                    }, context);
                };
                return ts.visitEachChild(sourceFile, function (stmt) {
                    if (ts.isClassDeclaration(stmt)) {
                        var decl = stmt;
                        if (stmt.decorators) {
                            decl = stripDecoratorsFromClassDeclaration(stmt);
                        }
                        return stripDecoratorPropertyAssignment(decl);
                    }
                    return stmt;
                }, context);
            };
        };
    }
    exports.getDecoratorStripTransformerFactory = getDecoratorStripTransformerFactory;
    function isDecoratorAssignment(member) {
        if (!ts.isPropertyDeclaration(member)) {
            return false;
        }
        if (!member.modifiers ||
            !member.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.StaticKeyword; })) {
            return false;
        }
        if (!ts.isIdentifier(member.name) || member.name.text !== 'decorators') {
            return false;
        }
        if (!member.initializer || !ts.isArrayLiteralExpression(member.initializer)) {
            return false;
        }
        return true;
    }
    function lookupProperty(expr, prop) {
        var decl = expr.properties.find(function (elem) { return !!elem.name && ts.isIdentifier(elem.name) && elem.name.text === prop; });
        if (decl === undefined || !ts.isPropertyAssignment(decl)) {
            return undefined;
        }
        return decl.initializer;
    }
    function resolveToStaticSymbol(id, containingFile, reflector, checker) {
        var res = checker.getSymbolAtLocation(id);
        if (!res || !res.declarations || res.declarations.length === 0) {
            return null;
        }
        var decl = res.declarations[0];
        if (!ts.isImportSpecifier(decl)) {
            return null;
        }
        var moduleSpecifier = decl.parent.parent.parent.moduleSpecifier;
        if (!ts.isStringLiteral(moduleSpecifier)) {
            return null;
        }
        return reflector.tryFindDeclaration(moduleSpecifier.text, id.text, containingFile);
    }
    var StripDecoratorsMetadataTransformer = /** @class */ (function () {
        function StripDecoratorsMetadataTransformer(coreDecorators, reflector) {
            this.coreDecorators = coreDecorators;
            this.reflector = reflector;
        }
        StripDecoratorsMetadataTransformer.prototype.start = function (sourceFile) {
            var _this = this;
            return function (value, node) {
                if (metadata_1.isClassMetadata(value) && ts.isClassDeclaration(node) && value.decorators) {
                    value.decorators = value.decorators.filter(function (d) {
                        if (metadata_1.isMetadataSymbolicCallExpression(d) &&
                            metadata_1.isMetadataImportedSymbolReferenceExpression(d.expression)) {
                            var declaration = _this.reflector.tryFindDeclaration(d.expression.module, d.expression.name, sourceFile.fileName);
                            if (declaration && _this.coreDecorators.has(declaration)) {
                                return false;
                            }
                        }
                        return true;
                    });
                }
                return value;
            };
        };
        return StripDecoratorsMetadataTransformer;
    }());
    exports.StripDecoratorsMetadataTransformer = StripDecoratorsMetadataTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicjNfc3RyaXBfZGVjb3JhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3IzX3N0cmlwX2RlY29yYXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLHFFQUEwSTtJQU8xSSxTQUFnQixtQ0FBbUMsQ0FDL0MsY0FBaUMsRUFBRSxTQUEwQixFQUM3RCxPQUF1QjtRQUN6QixPQUFPLFVBQVMsT0FBaUM7WUFDL0MsT0FBTyxVQUFTLFVBQXlCO2dCQUN2QyxJQUFNLG1DQUFtQyxHQUNyQyxVQUFDLElBQXlCO29CQUN4QixJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO3dCQUNqQyxPQUFPLElBQUksQ0FBQztxQkFDYjtvQkFDRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLFNBQVM7d0JBQ2pELElBQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUM7d0JBQ3RDLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFOzRCQUNqQyxJQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDOzRCQUMvQixJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0NBQ3ZCLElBQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDbEYsT0FBTyxNQUFNLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzs2QkFDN0M7eUJBQ0Y7d0JBQ0QsT0FBTyxJQUFJLENBQUM7b0JBQ2QsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsSUFBSSxVQUFVLENBQUMs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QUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7b0JBQzdFLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDO3dCQUMxQyxJQUFJLDJDQUFnQyxDQUFDLENBQUMsQ0FBQzs0QkFDbkMsc0RBQTJDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFOzRCQUM3RCxJQUFNLFdBQVcsR0FBRyxLQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUNqRCxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQ2pFLElBQUksV0FBVyxJQUFJLEtBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dDQUN2RCxPQUFPLEtBQUssQ0FBQzs2QkFDZDt5QkFDRjt3QkFDRCxPQUFPLElBQUksQ0FBQztvQkFDZCxDQUFDLENBQUMsQ0FBQztpQkFDSjtnQkFDRCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDSCx5Q0FBQztJQUFELENBQUMsQUFyQkQsSUFxQkM7SUFyQlksZ0ZBQWtDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1N0YXRpY1JlZmxlY3RvciwgU3RhdGljU3ltYm9sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtpc0NsYXNzTWV0YWRhdGEsIGlzTWV0YWRhdGFJbXBvcnRlZFN5bWJvbFJlZmVyZW5jZUV4cHJlc3Npb24sIGlzTWV0YWRhdGFTeW1ib2xpY0NhbGxFeHByZXNzaW9uLCBNZXRhZGF0YVZhbHVlfSBmcm9tICcuLi9tZXRhZGF0YSc7XG5cbmltcG9ydCB7TWV0YWRhdGFUcmFuc2Zvcm1lciwgVmFsdWVUcmFuc2Zvcm19IGZyb20gJy4vbWV0YWRhdGFfY2FjaGUnO1xuXG5leHBvcnQgdHlwZSBUcmFuc2Zvcm1lciA9IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiB0cy5Tb3VyY2VGaWxlO1xuZXhwb3J0IHR5cGUgVHJhbnNmb3JtZXJGYWN0b3J5ID0gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gVHJhbnNmb3JtZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWNvcmF0b3JTdHJpcFRyYW5zZm9ybWVyRmFjdG9yeShcbiAgICBjb3JlRGVjb3JhdG9yczogU2V0PFN0YXRpY1N5bWJvbD4sIHJlZmxlY3RvcjogU3RhdGljUmVmbGVjdG9yLFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogVHJhbnNmb3JtZXJGYWN0b3J5IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgICBjb25zdCBzdHJpcERlY29yYXRvcnNGcm9tQ2xhc3NEZWNsYXJhdGlvbiA9XG4gICAgICAgICAgKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5DbGFzc0RlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICAgIGlmIChub2RlLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBub2RlLmRlY29yYXRvcnMuZmlsdGVyKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNhbGxFeHByID0gZGVjb3JhdG9yLmV4cHJlc3Npb247XG4gICAgICAgICAgICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGNhbGxFeHByKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gY2FsbEV4cHIuZXhwcmVzc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGlkKSkge1xuICAgICAgICAgICAgICAgICAgY29uc3Qgc3ltYm9sID0gcmVzb2x2ZVRvU3RhdGljU3ltYm9sKGlkLCBzb3VyY2VGaWxlLmZpbGVOYW1lLCByZWZsZWN0b3IsIGNoZWNrZXIpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHN5bWJvbCAmJiBjb3JlRGVjb3JhdG9ycy5oYXMoc3ltYm9sKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCAhPT0gbm9kZS5kZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgICAgICBkZWNvcmF0b3JzLFxuICAgICAgICAgICAgICAgICAgbm9kZS5tb2RpZmllcnMsXG4gICAgICAgICAgICAgICAgICBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICBub2RlLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgbm9kZS5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgICAgICAgICBub2RlLm1lbWJlcnMsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICB9O1xuXG4gICAgICBjb25zdCBzdHJpcERlY29yYXRvclByb3BlcnR5QXNzaWdubWVudCA9IChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCBtZW1iZXIgPT4ge1xuICAgICAgICAgIGlmICghdHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKG1lbWJlcikgfHwgIWlzRGVjb3JhdG9yQXNzaWdubWVudChtZW1iZXIpIHx8XG4gICAgICAgICAgICAgICFtZW1iZXIuaW5pdGlhbGl6ZXIgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihtZW1iZXIuaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWVtYmVyO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IG5ld0luaXRpYWxpemVyID0gdHMudmlzaXRFYWNoQ2hpbGQobWVtYmVyLmluaXRpYWxpemVyLCBkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGRlY29yYXRvcikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBsb29rdXBQcm9wZXJ0eShkZWNvcmF0b3IsICd0eXBlJyk7XG4gICAgICAgICAgICBpZiAoIXR5cGUgfHwgIXRzLmlzSWRlbnRpZmllcih0eXBlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgc3ltYm9sID0gcmVzb2x2ZVRvU3RhdGljU3ltYm9sKHR5cGUsIHNvdXJjZUZpbGUuZmlsZU5hbWUsIHJlZmxlY3RvciwgY2hlY2tlcik7XG4gICAgICAgICAgICBpZiAoIXN5bWJvbCB8fCAhY29yZURlY29yYXRvcnMuaGFzKHN5bWJvbCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfSwgY29udGV4dCk7XG5cbiAgICAgICAgICBpZiAobmV3SW5pdGlhbGl6ZXIgPT09IG1lbWJlci5pbml0aWFsaXplcikge1xuICAgICAgICAgICAgcmV0dXJuIG1lbWJlcjtcbiAgICAgICAgICB9IGVsc2UgaWYgKG5ld0luaXRpYWxpemVyLmVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgICAgICAgICAgIG1lbWJlciwgbWVtYmVyLmRlY29yYXRvcnMsIG1lbWJlci5tb2RpZmllcnMsIG1lbWJlci5uYW1lLCBtZW1iZXIucXVlc3Rpb25Ub2tlbixcbiAgICAgICAgICAgICAgICBtZW1iZXIudHlwZSwgbmV3SW5pdGlhbGl6ZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgY29udGV4dCk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQoc291cmNlRmlsZSwgc3RtdCA9PiB7XG4gICAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgICAgICBsZXQgZGVjbCA9IHN0bXQ7XG4gICAgICAgICAgaWYgKHN0bXQuZGVjb3JhdG9ycykge1xuICAgICAgICAgICAgZGVjbCA9IHN0cmlwRGVjb3JhdG9yc0Zyb21DbGFzc0RlY2xhcmF0aW9uKHN0bXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc3RyaXBEZWNvcmF0b3JQcm9wZXJ0eUFzc2lnbm1lbnQoZGVjbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0bXQ7XG4gICAgICB9LCBjb250ZXh0KTtcbiAgICB9O1xuICB9O1xufVxuXG5mdW5jdGlvbiBpc0RlY29yYXRvckFzc2lnbm1lbnQobWVtYmVyOiB0cy5DbGFzc0VsZW1lbnQpOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc1Byb3BlcnR5RGVjbGFyYXRpb24obWVtYmVyKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIW1lbWJlci5tb2RpZmllcnMgfHxcbiAgICAgICFtZW1iZXIubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghdHMuaXNJZGVudGlmaWVyKG1lbWJlci5uYW1lKSB8fCBtZW1iZXIubmFtZS50ZXh0ICE9PSAnZGVjb3JhdG9ycycpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFtZW1iZXIuaW5pdGlhbGl6ZXIgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihtZW1iZXIuaW5pdGlhbGl6ZXIpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBsb29rdXBQcm9wZXJ0eShleHByOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiwgcHJvcDogc3RyaW5nKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICBjb25zdCBkZWNsID0gZXhwci5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICBlbGVtID0+ICEhZWxlbS5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihlbGVtLm5hbWUpICYmIGVsZW0ubmFtZS50ZXh0ID09PSBwcm9wKTtcbiAgaWYgKGRlY2wgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQoZGVjbCkpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiBkZWNsLmluaXRpYWxpemVyO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlVG9TdGF0aWNTeW1ib2woXG4gICAgaWQ6IHRzLklkZW50aWZpZXIsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcsIHJlZmxlY3RvcjogU3RhdGljUmVmbGVjdG9yLFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogU3RhdGljU3ltYm9sfG51bGwge1xuICBjb25zdCByZXMgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuICBpZiAoIXJlcyB8fCAhcmVzLmRlY2xhcmF0aW9ucyB8fCByZXMuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGRlY2wgPSByZXMuZGVjbGFyYXRpb25zWzBdO1xuICBpZiAoIXRzLmlzSW1wb3J0U3BlY2lmaWVyKGRlY2wpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbW9kdWxlU3BlY2lmaWVyID0gZGVjbC5wYXJlbnQhLnBhcmVudCEucGFyZW50IS5tb2R1bGVTcGVjaWZpZXI7XG4gIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKG1vZHVsZVNwZWNpZmllcikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gcmVmbGVjdG9yLnRyeUZpbmREZWNsYXJhdGlvbihtb2R1bGVTcGVjaWZpZXIudGV4dCwgaWQudGV4dCwgY29udGFpbmluZ0ZpbGUpO1xufVxuXG5leHBvcnQgY2xhc3MgU3RyaXBEZWNvcmF0b3JzTWV0YWRhdGFUcmFuc2Zvcm1lciBpbXBsZW1lbnRzIE1ldGFkYXRhVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvcmVEZWNvcmF0b3JzOiBTZXQ8U3RhdGljU3ltYm9sPiwgcHJpdmF0ZSByZWZsZWN0b3I6IFN0YXRpY1JlZmxlY3Rvcikge31cblxuICBzdGFydChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVmFsdWVUcmFuc2Zvcm18dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHZhbHVlOiBNZXRhZGF0YVZhbHVlLCBub2RlOiB0cy5Ob2RlKTogTWV0YWRhdGFWYWx1ZSA9PiB7XG4gICAgICBpZiAoaXNDbGFzc01ldGFkYXRhKHZhbHVlKSAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgJiYgdmFsdWUuZGVjb3JhdG9ycykge1xuICAgICAgICB2YWx1ZS5kZWNvcmF0b3JzID0gdmFsdWUuZGVjb3JhdG9ycy5maWx0ZXIoZCA9PiB7XG4gICAgICAgICAgaWYgKGlzTWV0YWRhdGFTeW1ib2xpY0NhbGxFeHByZXNzaW9uKGQpICYmXG4gICAgICAgICAgICAgIGlzTWV0YWRhdGFJbXBvcnRlZFN5bWJvbFJlZmVyZW5jZUV4cHJlc3Npb24oZC5leHByZXNzaW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLnJlZmxlY3Rvci50cnlGaW5kRGVjbGFyYXRpb24oXG4gICAgICAgICAgICAgICAgZC5leHByZXNzaW9uLm1vZHVsZSwgZC5leHByZXNzaW9uLm5hbWUsIHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgaWYgKGRlY2xhcmF0aW9uICYmIHRoaXMuY29yZURlY29yYXRvcnMuaGFzKGRlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9XG59XG4iXX0=