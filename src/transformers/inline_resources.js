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
        define("@angular/compiler-cli/src/transformers/inline_resources", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/metadata/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var index_1 = require("@angular/compiler-cli/src/metadata/index");
    var PRECONDITIONS_TEXT = 'angularCompilerOptions.enableResourceInlining requires all resources to be statically resolvable.';
    function getResourceLoader(host, containingFileName) {
        return {
            get: function (url) {
                if (typeof url !== 'string') {
                    throw new Error('templateUrl and stylesUrl must be string literals. ' + PRECONDITIONS_TEXT);
                }
                var fileName = host.resourceNameToFileName(url, containingFileName);
                if (fileName) {
                    var content = host.loadResource(fileName);
                    if (typeof content !== 'string') {
                        throw new Error('Cannot handle async resource. ' + PRECONDITIONS_TEXT);
                    }
                    return content;
                }
                throw new Error("Failed to resolve " + url + " from " + containingFileName + ". " + PRECONDITIONS_TEXT);
            }
        };
    }
    var InlineResourcesMetadataTransformer = /** @class */ (function () {
        function InlineResourcesMetadataTransformer(host) {
            this.host = host;
        }
        InlineResourcesMetadataTransformer.prototype.start = function (sourceFile) {
            var _this = this;
            var loader = getResourceLoader(this.host, sourceFile.fileName);
            return function (value, node) {
                if (index_1.isClassMetadata(value) && ts.isClassDeclaration(node) && value.decorators) {
                    value.decorators.forEach(function (d) {
                        if (index_1.isMetadataSymbolicCallExpression(d) &&
                            index_1.isMetadataImportedSymbolReferenceExpression(d.expression) &&
                            d.expression.module === '@angular/core' && d.expression.name === 'Component' &&
                            d.arguments) {
                            d.arguments = d.arguments.map(_this.updateDecoratorMetadata.bind(_this, loader));
                        }
                    });
                }
                return value;
            };
        };
        InlineResourcesMetadataTransformer.prototype.updateDecoratorMetadata = function (loader, arg) {
            if (arg['templateUrl']) {
                arg['template'] = loader.get(arg['templateUrl']);
                delete arg['templateUrl'];
            }
            var styles = arg['styles'] || [];
            var styleUrls = arg['styleUrls'] || [];
            if (!Array.isArray(styles))
                throw new Error('styles should be an array');
            if (!Array.isArray(styleUrls))
                throw new Error('styleUrls should be an array');
            styles.push.apply(styles, tslib_1.__spread(styleUrls.map(function (styleUrl) { return loader.get(styleUrl); })));
            if (styles.length > 0) {
                arg['styles'] = styles;
                delete arg['styleUrls'];
            }
            return arg;
        };
        return InlineResourcesMetadataTransformer;
    }());
    exports.InlineResourcesMetadataTransformer = InlineResourcesMetadataTransformer;
    function getInlineResourcesTransformFactory(program, host) {
        return function (context) { return function (sourceFile) {
            var loader = getResourceLoader(host, sourceFile.fileName);
            var visitor = function (node) {
                // Components are always classes; skip any other node
                if (!ts.isClassDeclaration(node)) {
                    return node;
                }
                // Decorator case - before or without decorator downleveling
                // @Component()
                var newDecorators = ts.visitNodes(node.decorators, function (node) {
                    if (isComponentDecorator(node, program.getTypeChecker())) {
                        return updateDecorator(node, loader);
                    }
                    return node;
                });
                // Annotation case - after decorator downleveling
                // static decorators: {type: Function, args?: any[]}[]
                var newMembers = ts.visitNodes(node.members, function (node) { return updateAnnotations(node, loader, program.getTypeChecker()); });
                // Create a new AST subtree with our modifications
                return ts.updateClassDeclaration(node, newDecorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], newMembers);
            };
            return ts.visitEachChild(sourceFile, visitor, context);
        }; };
    }
    exports.getInlineResourcesTransformFactory = getInlineResourcesTransformFactory;
    /**
     * Update a Decorator AST node to inline the resources
     * @param node the @Component decorator
     * @param loader provides access to load resources
     */
    function updateDecorator(node, loader) {
        if (!ts.isCallExpression(node.expression)) {
            // User will get an error somewhere else with bare @Component
            return node;
        }
        var expr = node.expression;
        var newArguments = updateComponentProperties(expr.arguments, loader);
        return ts.updateDecorator(node, ts.updateCall(expr, expr.expression, expr.typeArguments, newArguments));
    }
    /**
     * Update an Annotations AST node to inline the resources
     * @param node the static decorators property
     * @param loader provides access to load resources
     * @param typeChecker provides access to symbol table
     */
    function updateAnnotations(node, loader, typeChecker) {
        // Looking for a member of this shape:
        // PropertyDeclaration called decorators, with static modifier
        // Initializer is ArrayLiteralExpression
        // One element is the Component type, its initializer is the @angular/core Component symbol
        // One element is the component args, its initializer is the Component arguments to change
        // e.g.
        //   static decorators: {type: Function, args?: any[]}[] =
        //   [{
        //     type: Component,
        //     args: [{
        //       templateUrl: './my.component.html',
        //       styleUrls: ['./my.component.css'],
        //     }],
        //   }];
        if (!ts.isPropertyDeclaration(node) || // ts.ModifierFlags.Static &&
            !ts.isIdentifier(node.name) || node.name.text !== 'decorators' || !node.initializer ||
            !ts.isArrayLiteralExpression(node.initializer)) {
            return node;
        }
        var newAnnotations = node.initializer.elements.map(function (annotation) {
            // No-op if there's a non-object-literal mixed in the decorators values
            if (!ts.isObjectLiteralExpression(annotation))
                return annotation;
            var decoratorType = annotation.properties.find(function (p) { return isIdentifierNamed(p, 'type'); });
            // No-op if there's no 'type' property, or if it's not initialized to the Component symbol
            if (!decoratorType || !ts.isPropertyAssignment(decoratorType) ||
                !ts.isIdentifier(decoratorType.initializer) ||
                !isComponentSymbol(decoratorType.initializer, typeChecker)) {
                return annotation;
            }
            var newAnnotation = annotation.properties.map(function (prop) {
                // No-op if this isn't the 'args' property or if it's not initialized to an array
                if (!isIdentifierNamed(prop, 'args') || !ts.isPropertyAssignment(prop) ||
                    !ts.isArrayLiteralExpression(prop.initializer))
                    return prop;
                var newDecoratorArgs = ts.updatePropertyAssignment(prop, prop.name, ts.createArrayLiteral(updateComponentProperties(prop.initializer.elements, loader)));
                return newDecoratorArgs;
            });
            return ts.updateObjectLiteral(annotation, newAnnotation);
        });
        return ts.updateProperty(node, node.decorators, node.modifiers, node.name, node.questionToken, node.type, ts.updateArrayLiteral(node.initializer, newAnnotations));
    }
    function isIdentifierNamed(p, name) {
        return !!p.name && ts.isIdentifier(p.name) && p.name.text === name;
    }
    /**
     * Check that the node we are visiting is the actual Component decorator defined in @angular/core.
     */
    function isComponentDecorator(node, typeChecker) {
        if (!ts.isCallExpression(node.expression)) {
            return false;
        }
        var callExpr = node.expression;
        var identifier;
        if (ts.isIdentifier(callExpr.expression)) {
            identifier = callExpr.expression;
        }
        else {
            return false;
        }
        return isComponentSymbol(identifier, typeChecker);
    }
    function isComponentSymbol(identifier, typeChecker) {
        // Only handle identifiers, not expressions
        if (!ts.isIdentifier(identifier))
            return false;
        // NOTE: resolver.getReferencedImportDeclaration would work as well but is internal
        var symbol = typeChecker.getSymbolAtLocation(identifier);
        if (!symbol || !symbol.declarations || !symbol.declarations.length) {
            console.error("Unable to resolve symbol '" + identifier.text + "' in the program, does it type-check?");
            return false;
        }
        var declaration = symbol.declarations[0];
        if (!declaration || !ts.isImportSpecifier(declaration)) {
            return false;
        }
        var name = (declaration.propertyName || declaration.name).text;
        // We know that parent pointers are set because we created the SourceFile ourselves.
        // The number of parent references here match the recursion depth at this point.
        var moduleId = declaration.parent.parent.parent.moduleSpecifier.text;
        return moduleId === '@angular/core' && name === 'Component';
    }
    /**
     * For each property in the object literal, if it's templateUrl or styleUrls, replace it
     * with content.
     * @param node the arguments to @Component() or args property of decorators: [{type:Component}]
     * @param loader provides access to the loadResource method of the host
     * @returns updated arguments
     */
    function updateComponentProperties(args, loader) {
        if (args.length !== 1) {
            // User should have gotten a type-check error because @Component takes one argument
            return args;
        }
        var componentArg = args[0];
        if (!ts.isObjectLiteralExpression(componentArg)) {
            // User should have gotten a type-check error because @Component takes an object literal
            // argument
            return args;
        }
        var newProperties = [];
        var newStyleExprs = [];
        componentArg.properties.forEach(function (prop) {
            if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) {
                newProperties.push(prop);
                return;
            }
            switch (prop.name.text) {
                case 'styles':
                    if (!ts.isArrayLiteralExpression(prop.initializer)) {
                        throw new Error('styles takes an array argument');
                    }
                    newStyleExprs.push.apply(newStyleExprs, tslib_1.__spread(prop.initializer.elements));
                    break;
                case 'styleUrls':
                    if (!ts.isArrayLiteralExpression(prop.initializer)) {
                        throw new Error('styleUrls takes an array argument');
                    }
                    newStyleExprs.push.apply(newStyleExprs, tslib_1.__spread(prop.initializer.elements.map(function (expr) {
                        if (!ts.isStringLiteral(expr) && !ts.isNoSubstitutionTemplateLiteral(expr)) {
                            throw new Error('Can only accept string literal arguments to styleUrls. ' + PRECONDITIONS_TEXT);
                        }
                        var styles = loader.get(expr.text);
                        return ts.createLiteral(styles);
                    })));
                    break;
                case 'templateUrl':
                    if (!ts.isStringLiteral(prop.initializer) &&
                        !ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
                        throw new Error('Can only accept a string literal argument to templateUrl. ' + PRECONDITIONS_TEXT);
                    }
                    var template = loader.get(prop.initializer.text);
                    newProperties.push(ts.updatePropertyAssignment(prop, ts.createIdentifier('template'), ts.createLiteral(template)));
                    break;
                default:
                    newProperties.push(prop);
            }
        });
        // Add the non-inline styles
        if (newStyleExprs.length > 0) {
            var newStyles = ts.createPropertyAssignment(ts.createIdentifier('styles'), ts.createArrayLiteral(newStyleExprs));
            newProperties.push(newStyles);
        }
        return ts.createNodeArray([ts.updateObjectLiteral(componentArg, newProperties)]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lX3Jlc291cmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2lubGluZV9yZXNvdXJjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLGtFQUFnSztJQUloSyxJQUFNLGtCQUFrQixHQUNwQixtR0FBbUcsQ0FBQztJQVl4RyxTQUFTLGlCQUFpQixDQUFDLElBQW1CLEVBQUUsa0JBQTBCO1FBQ3hFLE9BQU87WUFDTCxHQUFHLEVBQUgsVUFBSSxHQUEyQjtnQkFDN0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7b0JBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMscURBQXFELEdBQUcsa0JBQWtCLENBQUMsQ0FBQztpQkFDN0Y7Z0JBQUMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN4RSxJQUFJLFFBQVEsRUFBRTtvQkFDWixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTt3QkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO3FCQUN4RTtvQkFDRCxPQUFPLE9BQU8sQ0FBQztpQkFDaEI7Z0JBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBcUIsR0FBRyxjQUFTLGtCQUFrQixVQUFLLGtCQUFvQixDQUFDLENBQUM7WUFDbEcsQ0FBQztTQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7UUFDRSw0Q0FBb0IsSUFBbUI7WUFBbkIsU0FBSSxHQUFKLElBQUksQ0FBZTtRQUFHLENBQUM7UUFFM0Msa0RBQUssR0FBTCxVQUFN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QUFDO0lBQ25GLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge01ldGFkYXRhT2JqZWN0LCBNZXRhZGF0YVZhbHVlLCBpc0NsYXNzTWV0YWRhdGEsIGlzTWV0YWRhdGFJbXBvcnRlZFN5bWJvbFJlZmVyZW5jZUV4cHJlc3Npb24sIGlzTWV0YWRhdGFTeW1ib2xpY0NhbGxFeHByZXNzaW9ufSBmcm9tICcuLi9tZXRhZGF0YS9pbmRleCc7XG5cbmltcG9ydCB7TWV0YWRhdGFUcmFuc2Zvcm1lciwgVmFsdWVUcmFuc2Zvcm19IGZyb20gJy4vbWV0YWRhdGFfY2FjaGUnO1xuXG5jb25zdCBQUkVDT05ESVRJT05TX1RFWFQgPVxuICAgICdhbmd1bGFyQ29tcGlsZXJPcHRpb25zLmVuYWJsZVJlc291cmNlSW5saW5pbmcgcmVxdWlyZXMgYWxsIHJlc291cmNlcyB0byBiZSBzdGF0aWNhbGx5IHJlc29sdmFibGUuJztcblxuLyoqIEEgc3Vic2V0IG9mIG1lbWJlcnMgZnJvbSBBb3RDb21waWxlckhvc3QgKi9cbmV4cG9ydCB0eXBlIFJlc291cmNlc0hvc3QgPSB7XG4gIHJlc291cmNlTmFtZVRvRmlsZU5hbWUocmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbDtcbiAgbG9hZFJlc291cmNlKHBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPnwgc3RyaW5nO1xufTtcblxuZXhwb3J0IHR5cGUgU3RhdGljUmVzb3VyY2VMb2FkZXIgPSB7XG4gIGdldCh1cmw6IHN0cmluZyB8IE1ldGFkYXRhVmFsdWUpOiBzdHJpbmc7XG59O1xuXG5mdW5jdGlvbiBnZXRSZXNvdXJjZUxvYWRlcihob3N0OiBSZXNvdXJjZXNIb3N0LCBjb250YWluaW5nRmlsZU5hbWU6IHN0cmluZyk6IFN0YXRpY1Jlc291cmNlTG9hZGVyIHtcbiAgcmV0dXJuIHtcbiAgICBnZXQodXJsOiBzdHJpbmcgfCBNZXRhZGF0YVZhbHVlKTogc3RyaW5ne1xuICAgICAgaWYgKHR5cGVvZiB1cmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndGVtcGxhdGVVcmwgYW5kIHN0eWxlc1VybCBtdXN0IGJlIHN0cmluZyBsaXRlcmFscy4gJyArIFBSRUNPTkRJVElPTlNfVEVYVCk7XG4gICAgICB9IGNvbnN0IGZpbGVOYW1lID0gaG9zdC5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lKHVybCwgY29udGFpbmluZ0ZpbGVOYW1lKTtcbiAgICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gaG9zdC5sb2FkUmVzb3VyY2UoZmlsZU5hbWUpO1xuICAgICAgICBpZiAodHlwZW9mIGNvbnRlbnQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgaGFuZGxlIGFzeW5jIHJlc291cmNlLiAnICsgUFJFQ09ORElUSU9OU19URVhUKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgIH0gdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSAke3VybH0gZnJvbSAke2NvbnRhaW5pbmdGaWxlTmFtZX0uICR7UFJFQ09ORElUSU9OU19URVhUfWApO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIElubGluZVJlc291cmNlc01ldGFkYXRhVHJhbnNmb3JtZXIgaW1wbGVtZW50cyBNZXRhZGF0YVRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBSZXNvdXJjZXNIb3N0KSB7fVxuXG4gIHN0YXJ0KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBWYWx1ZVRyYW5zZm9ybXx1bmRlZmluZWQge1xuICAgIGNvbnN0IGxvYWRlciA9IGdldFJlc291cmNlTG9hZGVyKHRoaXMuaG9zdCwgc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgcmV0dXJuICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSk6IE1ldGFkYXRhVmFsdWUgPT4ge1xuICAgICAgaWYgKGlzQ2xhc3NNZXRhZGF0YSh2YWx1ZSkgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpICYmIHZhbHVlLmRlY29yYXRvcnMpIHtcbiAgICAgICAgdmFsdWUuZGVjb3JhdG9ycy5mb3JFYWNoKGQgPT4ge1xuICAgICAgICAgIGlmIChpc01ldGFkYXRhU3ltYm9saWNDYWxsRXhwcmVzc2lvbihkKSAmJlxuICAgICAgICAgICAgICBpc01ldGFkYXRhSW1wb3J0ZWRTeW1ib2xSZWZlcmVuY2VFeHByZXNzaW9uKGQuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgICAgZC5leHByZXNzaW9uLm1vZHVsZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnICYmIGQuZXhwcmVzc2lvbi5uYW1lID09PSAnQ29tcG9uZW50JyAmJlxuICAgICAgICAgICAgICBkLmFyZ3VtZW50cykge1xuICAgICAgICAgICAgZC5hcmd1bWVudHMgPSBkLmFyZ3VtZW50cy5tYXAodGhpcy51cGRhdGVEZWNvcmF0b3JNZXRhZGF0YS5iaW5kKHRoaXMsIGxvYWRlcikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfVxuXG4gIHVwZGF0ZURlY29yYXRvck1ldGFkYXRhKGxvYWRlcjogU3RhdGljUmVzb3VyY2VMb2FkZXIsIGFyZzogTWV0YWRhdGFPYmplY3QpOiBNZXRhZGF0YU9iamVjdCB7XG4gICAgaWYgKGFyZ1sndGVtcGxhdGVVcmwnXSkge1xuICAgICAgYXJnWyd0ZW1wbGF0ZSddID0gbG9hZGVyLmdldChhcmdbJ3RlbXBsYXRlVXJsJ10pO1xuICAgICAgZGVsZXRlIGFyZ1sndGVtcGxhdGVVcmwnXTtcbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZXMgPSBhcmdbJ3N0eWxlcyddIHx8IFtdO1xuICAgIGNvbnN0IHN0eWxlVXJscyA9IGFyZ1snc3R5bGVVcmxzJ10gfHwgW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHN0eWxlcykpIHRocm93IG5ldyBFcnJvcignc3R5bGVzIHNob3VsZCBiZSBhbiBhcnJheScpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShzdHlsZVVybHMpKSB0aHJvdyBuZXcgRXJyb3IoJ3N0eWxlVXJscyBzaG91bGQgYmUgYW4gYXJyYXknKTtcblxuICAgIHN0eWxlcy5wdXNoKC4uLnN0eWxlVXJscy5tYXAoc3R5bGVVcmwgPT4gbG9hZGVyLmdldChzdHlsZVVybCkpKTtcbiAgICBpZiAoc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGFyZ1snc3R5bGVzJ10gPSBzdHlsZXM7XG4gICAgICBkZWxldGUgYXJnWydzdHlsZVVybHMnXTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJnO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbmxpbmVSZXNvdXJjZXNUcmFuc2Zvcm1GYWN0b3J5KFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IFJlc291cmNlc0hvc3QpOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICBjb25zdCBsb2FkZXIgPSBnZXRSZXNvdXJjZUxvYWRlcihob3N0LCBzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICBjb25zdCB2aXNpdG9yOiB0cy5WaXNpdG9yID0gbm9kZSA9PiB7XG4gICAgICAvLyBDb21wb25lbnRzIGFyZSBhbHdheXMgY2xhc3Nlczsgc2tpcCBhbnkgb3RoZXIgbm9kZVxuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICB9XG5cbiAgICAgIC8vIERlY29yYXRvciBjYXNlIC0gYmVmb3JlIG9yIHdpdGhvdXQgZGVjb3JhdG9yIGRvd25sZXZlbGluZ1xuICAgICAgLy8gQENvbXBvbmVudCgpXG4gICAgICBjb25zdCBuZXdEZWNvcmF0b3JzID0gdHMudmlzaXROb2Rlcyhub2RlLmRlY29yYXRvcnMsIChub2RlOiB0cy5EZWNvcmF0b3IpID0+IHtcbiAgICAgICAgaWYgKGlzQ29tcG9uZW50RGVjb3JhdG9yKG5vZGUsIHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSkpIHtcbiAgICAgICAgICByZXR1cm4gdXBkYXRlRGVjb3JhdG9yKG5vZGUsIGxvYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICB9KTtcblxuICAgICAgLy8gQW5ub3RhdGlvbiBjYXNlIC0gYWZ0ZXIgZGVjb3JhdG9yIGRvd25sZXZlbGluZ1xuICAgICAgLy8gc3RhdGljIGRlY29yYXRvcnM6IHt0eXBlOiBGdW5jdGlvbiwgYXJncz86IGFueVtdfVtdXG4gICAgICBjb25zdCBuZXdNZW1iZXJzID0gdHMudmlzaXROb2RlcyhcbiAgICAgICAgICBub2RlLm1lbWJlcnMsXG4gICAgICAgICAgKG5vZGU6IHRzLkNsYXNzRWxlbWVudCkgPT4gdXBkYXRlQW5ub3RhdGlvbnMobm9kZSwgbG9hZGVyLCBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpKTtcblxuICAgICAgLy8gQ3JlYXRlIGEgbmV3IEFTVCBzdWJ0cmVlIHdpdGggb3VyIG1vZGlmaWNhdGlvbnNcbiAgICAgIHJldHVybiB0cy51cGRhdGVDbGFzc0RlY2xhcmF0aW9uKFxuICAgICAgICAgIG5vZGUsIG5ld0RlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsIG5vZGUudHlwZVBhcmFtZXRlcnMsXG4gICAgICAgICAgbm9kZS5oZXJpdGFnZUNsYXVzZXMgfHwgW10sIG5ld01lbWJlcnMpO1xuICAgIH07XG5cbiAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQoc291cmNlRmlsZSwgdmlzaXRvciwgY29udGV4dCk7XG4gIH07XG59XG5cbi8qKlxuICogVXBkYXRlIGEgRGVjb3JhdG9yIEFTVCBub2RlIHRvIGlubGluZSB0aGUgcmVzb3VyY2VzXG4gKiBAcGFyYW0gbm9kZSB0aGUgQENvbXBvbmVudCBkZWNvcmF0b3JcbiAqIEBwYXJhbSBsb2FkZXIgcHJvdmlkZXMgYWNjZXNzIHRvIGxvYWQgcmVzb3VyY2VzXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZURlY29yYXRvcihub2RlOiB0cy5EZWNvcmF0b3IsIGxvYWRlcjogU3RhdGljUmVzb3VyY2VMb2FkZXIpOiB0cy5EZWNvcmF0b3Ige1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSkge1xuICAgIC8vIFVzZXIgd2lsbCBnZXQgYW4gZXJyb3Igc29tZXdoZXJlIGVsc2Ugd2l0aCBiYXJlIEBDb21wb25lbnRcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuICBjb25zdCBleHByID0gbm9kZS5leHByZXNzaW9uO1xuICBjb25zdCBuZXdBcmd1bWVudHMgPSB1cGRhdGVDb21wb25lbnRQcm9wZXJ0aWVzKGV4cHIuYXJndW1lbnRzLCBsb2FkZXIpO1xuICByZXR1cm4gdHMudXBkYXRlRGVjb3JhdG9yKFxuICAgICAgbm9kZSwgdHMudXBkYXRlQ2FsbChleHByLCBleHByLmV4cHJlc3Npb24sIGV4cHIudHlwZUFyZ3VtZW50cywgbmV3QXJndW1lbnRzKSk7XG59XG5cbi8qKlxuICogVXBkYXRlIGFuIEFubm90YXRpb25zIEFTVCBub2RlIHRvIGlubGluZSB0aGUgcmVzb3VyY2VzXG4gKiBAcGFyYW0gbm9kZSB0aGUgc3RhdGljIGRlY29yYXRvcnMgcHJvcGVydHlcbiAqIEBwYXJhbSBsb2FkZXIgcHJvdmlkZXMgYWNjZXNzIHRvIGxvYWQgcmVzb3VyY2VzXG4gKiBAcGFyYW0gdHlwZUNoZWNrZXIgcHJvdmlkZXMgYWNjZXNzIHRvIHN5bWJvbCB0YWJsZVxuICovXG5mdW5jdGlvbiB1cGRhdGVBbm5vdGF0aW9ucyhcbiAgICBub2RlOiB0cy5DbGFzc0VsZW1lbnQsIGxvYWRlcjogU3RhdGljUmVzb3VyY2VMb2FkZXIsXG4gICAgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogdHMuQ2xhc3NFbGVtZW50IHtcbiAgLy8gTG9va2luZyBmb3IgYSBtZW1iZXIgb2YgdGhpcyBzaGFwZTpcbiAgLy8gUHJvcGVydHlEZWNsYXJhdGlvbiBjYWxsZWQgZGVjb3JhdG9ycywgd2l0aCBzdGF0aWMgbW9kaWZpZXJcbiAgLy8gSW5pdGlhbGl6ZXIgaXMgQXJyYXlMaXRlcmFsRXhwcmVzc2lvblxuICAvLyBPbmUgZWxlbWVudCBpcyB0aGUgQ29tcG9uZW50IHR5cGUsIGl0cyBpbml0aWFsaXplciBpcyB0aGUgQGFuZ3VsYXIvY29yZSBDb21wb25lbnQgc3ltYm9sXG4gIC8vIE9uZSBlbGVtZW50IGlzIHRoZSBjb21wb25lbnQgYXJncywgaXRzIGluaXRpYWxpemVyIGlzIHRoZSBDb21wb25lbnQgYXJndW1lbnRzIHRvIGNoYW5nZVxuICAvLyBlLmcuXG4gIC8vICAgc3RhdGljIGRlY29yYXRvcnM6IHt0eXBlOiBGdW5jdGlvbiwgYXJncz86IGFueVtdfVtdID1cbiAgLy8gICBbe1xuICAvLyAgICAgdHlwZTogQ29tcG9uZW50LFxuICAvLyAgICAgYXJnczogW3tcbiAgLy8gICAgICAgdGVtcGxhdGVVcmw6ICcuL215LmNvbXBvbmVudC5odG1sJyxcbiAgLy8gICAgICAgc3R5bGVVcmxzOiBbJy4vbXkuY29tcG9uZW50LmNzcyddLFxuICAvLyAgICAgfV0sXG4gIC8vICAgfV07XG4gIGlmICghdHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKG5vZGUpIHx8ICAvLyB0cy5Nb2RpZmllckZsYWdzLlN0YXRpYyAmJlxuICAgICAgIXRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpIHx8IG5vZGUubmFtZS50ZXh0ICE9PSAnZGVjb3JhdG9ycycgfHwgIW5vZGUuaW5pdGlhbGl6ZXIgfHxcbiAgICAgICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZS5pbml0aWFsaXplcikpIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIGNvbnN0IG5ld0Fubm90YXRpb25zID0gbm9kZS5pbml0aWFsaXplci5lbGVtZW50cy5tYXAoYW5ub3RhdGlvbiA9PiB7XG4gICAgLy8gTm8tb3AgaWYgdGhlcmUncyBhIG5vbi1vYmplY3QtbGl0ZXJhbCBtaXhlZCBpbiB0aGUgZGVjb3JhdG9ycyB2YWx1ZXNcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oYW5ub3RhdGlvbikpIHJldHVybiBhbm5vdGF0aW9uO1xuXG4gICAgY29uc3QgZGVjb3JhdG9yVHlwZSA9IGFubm90YXRpb24ucHJvcGVydGllcy5maW5kKHAgPT4gaXNJZGVudGlmaWVyTmFtZWQocCwgJ3R5cGUnKSk7XG5cbiAgICAvLyBOby1vcCBpZiB0aGVyZSdzIG5vICd0eXBlJyBwcm9wZXJ0eSwgb3IgaWYgaXQncyBub3QgaW5pdGlhbGl6ZWQgdG8gdGhlIENvbXBvbmVudCBzeW1ib2xcbiAgICBpZiAoIWRlY29yYXRvclR5cGUgfHwgIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KGRlY29yYXRvclR5cGUpIHx8XG4gICAgICAgICF0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yVHlwZS5pbml0aWFsaXplcikgfHxcbiAgICAgICAgIWlzQ29tcG9uZW50U3ltYm9sKGRlY29yYXRvclR5cGUuaW5pdGlhbGl6ZXIsIHR5cGVDaGVja2VyKSkge1xuICAgICAgcmV0dXJuIGFubm90YXRpb247XG4gICAgfVxuXG4gICAgY29uc3QgbmV3QW5ub3RhdGlvbiA9IGFubm90YXRpb24ucHJvcGVydGllcy5tYXAocHJvcCA9PiB7XG4gICAgICAvLyBOby1vcCBpZiB0aGlzIGlzbid0IHRoZSAnYXJncycgcHJvcGVydHkgb3IgaWYgaXQncyBub3QgaW5pdGlhbGl6ZWQgdG8gYW4gYXJyYXlcbiAgICAgIGlmICghaXNJZGVudGlmaWVyTmFtZWQocHJvcCwgJ2FyZ3MnKSB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkgfHxcbiAgICAgICAgICAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHByb3AuaW5pdGlhbGl6ZXIpKVxuICAgICAgICByZXR1cm4gcHJvcDtcblxuICAgICAgY29uc3QgbmV3RGVjb3JhdG9yQXJncyA9IHRzLnVwZGF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgICBwcm9wLCBwcm9wLm5hbWUsXG4gICAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKHVwZGF0ZUNvbXBvbmVudFByb3BlcnRpZXMocHJvcC5pbml0aWFsaXplci5lbGVtZW50cywgbG9hZGVyKSkpO1xuXG4gICAgICByZXR1cm4gbmV3RGVjb3JhdG9yQXJncztcbiAgICB9KTtcblxuICAgIHJldHVybiB0cy51cGRhdGVPYmplY3RMaXRlcmFsKGFubm90YXRpb24sIG5ld0Fubm90YXRpb24pO1xuICB9KTtcblxuICByZXR1cm4gdHMudXBkYXRlUHJvcGVydHkoXG4gICAgICBub2RlLCBub2RlLmRlY29yYXRvcnMsIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsIG5vZGUucXVlc3Rpb25Ub2tlbiwgbm9kZS50eXBlLFxuICAgICAgdHMudXBkYXRlQXJyYXlMaXRlcmFsKG5vZGUuaW5pdGlhbGl6ZXIsIG5ld0Fubm90YXRpb25zKSk7XG59XG5cbmZ1bmN0aW9uIGlzSWRlbnRpZmllck5hbWVkKHA6IHRzLk9iamVjdExpdGVyYWxFbGVtZW50TGlrZSwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXAubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIocC5uYW1lKSAmJiBwLm5hbWUudGV4dCA9PT0gbmFtZTtcbn1cblxuLyoqXG4gKiBDaGVjayB0aGF0IHRoZSBub2RlIHdlIGFyZSB2aXNpdGluZyBpcyB0aGUgYWN0dWFsIENvbXBvbmVudCBkZWNvcmF0b3IgZGVmaW5lZCBpbiBAYW5ndWxhci9jb3JlLlxuICovXG5mdW5jdGlvbiBpc0NvbXBvbmVudERlY29yYXRvcihub2RlOiB0cy5EZWNvcmF0b3IsIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBjYWxsRXhwciA9IG5vZGUuZXhwcmVzc2lvbjtcblxuICBsZXQgaWRlbnRpZmllcjogdHMuTm9kZTtcblxuICBpZiAodHMuaXNJZGVudGlmaWVyKGNhbGxFeHByLmV4cHJlc3Npb24pKSB7XG4gICAgaWRlbnRpZmllciA9IGNhbGxFeHByLmV4cHJlc3Npb247XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBpc0NvbXBvbmVudFN5bWJvbChpZGVudGlmaWVyLCB0eXBlQ2hlY2tlcik7XG59XG5cbmZ1bmN0aW9uIGlzQ29tcG9uZW50U3ltYm9sKGlkZW50aWZpZXI6IHRzLk5vZGUsIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge1xuICAvLyBPbmx5IGhhbmRsZSBpZGVudGlmaWVycywgbm90IGV4cHJlc3Npb25zXG4gIGlmICghdHMuaXNJZGVudGlmaWVyKGlkZW50aWZpZXIpKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gTk9URTogcmVzb2x2ZXIuZ2V0UmVmZXJlbmNlZEltcG9ydERlY2xhcmF0aW9uIHdvdWxkIHdvcmsgYXMgd2VsbCBidXQgaXMgaW50ZXJuYWxcbiAgY29uc3Qgc3ltYm9sID0gdHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZGVudGlmaWVyKTtcblxuICBpZiAoIXN5bWJvbCB8fCAhc3ltYm9sLmRlY2xhcmF0aW9ucyB8fCAhc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBgVW5hYmxlIHRvIHJlc29sdmUgc3ltYm9sICcke2lkZW50aWZpZXIudGV4dH0nIGluIHRoZSBwcm9ncmFtLCBkb2VzIGl0IHR5cGUtY2hlY2s/YCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgZGVjbGFyYXRpb24gPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuXG4gIGlmICghZGVjbGFyYXRpb24gfHwgIXRzLmlzSW1wb3J0U3BlY2lmaWVyKGRlY2xhcmF0aW9uKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IG5hbWUgPSAoZGVjbGFyYXRpb24ucHJvcGVydHlOYW1lIHx8IGRlY2xhcmF0aW9uLm5hbWUpLnRleHQ7XG4gIC8vIFdlIGtub3cgdGhhdCBwYXJlbnQgcG9pbnRlcnMgYXJlIHNldCBiZWNhdXNlIHdlIGNyZWF0ZWQgdGhlIFNvdXJjZUZpbGUgb3Vyc2VsdmVzLlxuICAvLyBUaGUgbnVtYmVyIG9mIHBhcmVudCByZWZlcmVuY2VzIGhlcmUgbWF0Y2ggdGhlIHJlY3Vyc2lvbiBkZXB0aCBhdCB0aGlzIHBvaW50LlxuICBjb25zdCBtb2R1bGVJZCA9XG4gICAgICAoZGVjbGFyYXRpb24ucGFyZW50ICEucGFyZW50ICEucGFyZW50ICEubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gIHJldHVybiBtb2R1bGVJZCA9PT0gJ0Bhbmd1bGFyL2NvcmUnICYmIG5hbWUgPT09ICdDb21wb25lbnQnO1xufVxuXG4vKipcbiAqIEZvciBlYWNoIHByb3BlcnR5IGluIHRoZSBvYmplY3QgbGl0ZXJhbCwgaWYgaXQncyB0ZW1wbGF0ZVVybCBvciBzdHlsZVVybHMsIHJlcGxhY2UgaXRcbiAqIHdpdGggY29udGVudC5cbiAqIEBwYXJhbSBub2RlIHRoZSBhcmd1bWVudHMgdG8gQENvbXBvbmVudCgpIG9yIGFyZ3MgcHJvcGVydHkgb2YgZGVjb3JhdG9yczogW3t0eXBlOkNvbXBvbmVudH1dXG4gKiBAcGFyYW0gbG9hZGVyIHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgbG9hZFJlc291cmNlIG1ldGhvZCBvZiB0aGUgaG9zdFxuICogQHJldHVybnMgdXBkYXRlZCBhcmd1bWVudHNcbiAqL1xuZnVuY3Rpb24gdXBkYXRlQ29tcG9uZW50UHJvcGVydGllcyhcbiAgICBhcmdzOiB0cy5Ob2RlQXJyYXk8dHMuRXhwcmVzc2lvbj4sIGxvYWRlcjogU3RhdGljUmVzb3VyY2VMb2FkZXIpOiB0cy5Ob2RlQXJyYXk8dHMuRXhwcmVzc2lvbj4ge1xuICBpZiAoYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAvLyBVc2VyIHNob3VsZCBoYXZlIGdvdHRlbiBhIHR5cGUtY2hlY2sgZXJyb3IgYmVjYXVzZSBAQ29tcG9uZW50IHRha2VzIG9uZSBhcmd1bWVudFxuICAgIHJldHVybiBhcmdzO1xuICB9XG4gIGNvbnN0IGNvbXBvbmVudEFyZyA9IGFyZ3NbMF07XG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihjb21wb25lbnRBcmcpKSB7XG4gICAgLy8gVXNlciBzaG91bGQgaGF2ZSBnb3R0ZW4gYSB0eXBlLWNoZWNrIGVycm9yIGJlY2F1c2UgQENvbXBvbmVudCB0YWtlcyBhbiBvYmplY3QgbGl0ZXJhbFxuICAgIC8vIGFyZ3VtZW50XG4gICAgcmV0dXJuIGFyZ3M7XG4gIH1cblxuICBjb25zdCBuZXdQcm9wZXJ0aWVzOiB0cy5PYmplY3RMaXRlcmFsRWxlbWVudExpa2VbXSA9IFtdO1xuICBjb25zdCBuZXdTdHlsZUV4cHJzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcbiAgY29tcG9uZW50QXJnLnByb3BlcnRpZXMuZm9yRWFjaChwcm9wID0+IHtcbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApIHx8IHRzLmlzQ29tcHV0ZWRQcm9wZXJ0eU5hbWUocHJvcC5uYW1lKSkge1xuICAgICAgbmV3UHJvcGVydGllcy5wdXNoKHByb3ApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN3aXRjaCAocHJvcC5uYW1lLnRleHQpIHtcbiAgICAgIGNhc2UgJ3N0eWxlcyc6XG4gICAgICAgIGlmICghdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHByb3AuaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHlsZXMgdGFrZXMgYW4gYXJyYXkgYXJndW1lbnQnKTtcbiAgICAgICAgfVxuICAgICAgICBuZXdTdHlsZUV4cHJzLnB1c2goLi4ucHJvcC5pbml0aWFsaXplci5lbGVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzdHlsZVVybHMnOlxuICAgICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwcm9wLmluaXRpYWxpemVyKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc3R5bGVVcmxzIHRha2VzIGFuIGFycmF5IGFyZ3VtZW50Jyk7XG4gICAgICAgIH1cbiAgICAgICAgbmV3U3R5bGVFeHBycy5wdXNoKC4uLnByb3AuaW5pdGlhbGl6ZXIuZWxlbWVudHMubWFwKChleHByOiB0cy5FeHByZXNzaW9uKSA9PiB7XG4gICAgICAgICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoZXhwcikgJiYgIXRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwoZXhwcikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAnQ2FuIG9ubHkgYWNjZXB0IHN0cmluZyBsaXRlcmFsIGFyZ3VtZW50cyB0byBzdHlsZVVybHMuICcgKyBQUkVDT05ESVRJT05TX1RFWFQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBzdHlsZXMgPSBsb2FkZXIuZ2V0KGV4cHIudGV4dCk7XG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWwoc3R5bGVzKTtcbiAgICAgICAgfSkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndGVtcGxhdGVVcmwnOlxuICAgICAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChwcm9wLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgICAgIXRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwocHJvcC5pbml0aWFsaXplcikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdDYW4gb25seSBhY2NlcHQgYSBzdHJpbmcgbGl0ZXJhbCBhcmd1bWVudCB0byB0ZW1wbGF0ZVVybC4gJyArIFBSRUNPTkRJVElPTlNfVEVYVCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBsb2FkZXIuZ2V0KHByb3AuaW5pdGlhbGl6ZXIudGV4dCk7XG4gICAgICAgIG5ld1Byb3BlcnRpZXMucHVzaCh0cy51cGRhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICBwcm9wLCB0cy5jcmVhdGVJZGVudGlmaWVyKCd0ZW1wbGF0ZScpLCB0cy5jcmVhdGVMaXRlcmFsKHRlbXBsYXRlKSkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbmV3UHJvcGVydGllcy5wdXNoKHByb3ApO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQWRkIHRoZSBub24taW5saW5lIHN0eWxlc1xuICBpZiAobmV3U3R5bGVFeHBycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbmV3U3R5bGVzID0gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKCdzdHlsZXMnKSwgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKG5ld1N0eWxlRXhwcnMpKTtcbiAgICBuZXdQcm9wZXJ0aWVzLnB1c2gobmV3U3R5bGVzKTtcbiAgfVxuXG4gIHJldHVybiB0cy5jcmVhdGVOb2RlQXJyYXkoW3RzLnVwZGF0ZU9iamVjdExpdGVyYWwoY29tcG9uZW50QXJnLCBuZXdQcm9wZXJ0aWVzKV0pO1xufVxuIl19