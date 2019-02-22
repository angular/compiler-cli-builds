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
        define("@angular/compiler-cli/src/transformers/inline_resources", ["require", "exports", "typescript", "@angular/compiler-cli/src/metadata/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const ts = require("typescript");
    const index_1 = require("@angular/compiler-cli/src/metadata/index");
    const PRECONDITIONS_TEXT = 'angularCompilerOptions.enableResourceInlining requires all resources to be statically resolvable.';
    function getResourceLoader(host, containingFileName) {
        return {
            get(url) {
                if (typeof url !== 'string') {
                    throw new Error('templateUrl and stylesUrl must be string literals. ' + PRECONDITIONS_TEXT);
                }
                const fileName = host.resourceNameToFileName(url, containingFileName);
                if (fileName) {
                    const content = host.loadResource(fileName);
                    if (typeof content !== 'string') {
                        throw new Error('Cannot handle async resource. ' + PRECONDITIONS_TEXT);
                    }
                    return content;
                }
                throw new Error(`Failed to resolve ${url} from ${containingFileName}. ${PRECONDITIONS_TEXT}`);
            }
        };
    }
    class InlineResourcesMetadataTransformer {
        constructor(host) {
            this.host = host;
        }
        start(sourceFile) {
            const loader = getResourceLoader(this.host, sourceFile.fileName);
            return (value, node) => {
                if (index_1.isClassMetadata(value) && ts.isClassDeclaration(node) && value.decorators) {
                    value.decorators.forEach(d => {
                        if (index_1.isMetadataSymbolicCallExpression(d) &&
                            index_1.isMetadataImportedSymbolReferenceExpression(d.expression) &&
                            d.expression.module === '@angular/core' && d.expression.name === 'Component' &&
                            d.arguments) {
                            d.arguments = d.arguments.map(this.updateDecoratorMetadata.bind(this, loader));
                        }
                    });
                }
                return value;
            };
        }
        updateDecoratorMetadata(loader, arg) {
            if (arg['templateUrl']) {
                arg['template'] = loader.get(arg['templateUrl']);
                delete arg.templateUrl;
            }
            const styles = arg['styles'] || [];
            const styleUrls = arg['styleUrls'] || [];
            if (!Array.isArray(styles))
                throw new Error('styles should be an array');
            if (!Array.isArray(styleUrls))
                throw new Error('styleUrls should be an array');
            styles.push(...styleUrls.map(styleUrl => loader.get(styleUrl)));
            if (styles.length > 0) {
                arg['styles'] = styles;
                delete arg.styleUrls;
            }
            return arg;
        }
    }
    exports.InlineResourcesMetadataTransformer = InlineResourcesMetadataTransformer;
    function getInlineResourcesTransformFactory(program, host) {
        return (context) => (sourceFile) => {
            const loader = getResourceLoader(host, sourceFile.fileName);
            const visitor = node => {
                // Components are always classes; skip any other node
                if (!ts.isClassDeclaration(node)) {
                    return node;
                }
                // Decorator case - before or without decorator downleveling
                // @Component()
                const newDecorators = ts.visitNodes(node.decorators, (node) => {
                    if (isComponentDecorator(node, program.getTypeChecker())) {
                        return updateDecorator(node, loader);
                    }
                    return node;
                });
                // Annotation case - after decorator downleveling
                // static decorators: {type: Function, args?: any[]}[]
                const newMembers = ts.visitNodes(node.members, (node) => updateAnnotations(node, loader, program.getTypeChecker()));
                // Create a new AST subtree with our modifications
                return ts.updateClassDeclaration(node, newDecorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], newMembers);
            };
            return ts.visitEachChild(sourceFile, visitor, context);
        };
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
        const expr = node.expression;
        const newArguments = updateComponentProperties(expr.arguments, loader);
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
        const newAnnotations = node.initializer.elements.map(annotation => {
            // No-op if there's a non-object-literal mixed in the decorators values
            if (!ts.isObjectLiteralExpression(annotation))
                return annotation;
            const decoratorType = annotation.properties.find(p => isIdentifierNamed(p, 'type'));
            // No-op if there's no 'type' property, or if it's not initialized to the Component symbol
            if (!decoratorType || !ts.isPropertyAssignment(decoratorType) ||
                !ts.isIdentifier(decoratorType.initializer) ||
                !isComponentSymbol(decoratorType.initializer, typeChecker)) {
                return annotation;
            }
            const newAnnotation = annotation.properties.map(prop => {
                // No-op if this isn't the 'args' property or if it's not initialized to an array
                if (!isIdentifierNamed(prop, 'args') || !ts.isPropertyAssignment(prop) ||
                    !ts.isArrayLiteralExpression(prop.initializer))
                    return prop;
                const newDecoratorArgs = ts.updatePropertyAssignment(prop, prop.name, ts.createArrayLiteral(updateComponentProperties(prop.initializer.elements, loader)));
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
        const callExpr = node.expression;
        let identifier;
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
        const symbol = typeChecker.getSymbolAtLocation(identifier);
        if (!symbol || !symbol.declarations || !symbol.declarations.length) {
            console.error(`Unable to resolve symbol '${identifier.text}' in the program, does it type-check?`);
            return false;
        }
        const declaration = symbol.declarations[0];
        if (!declaration || !ts.isImportSpecifier(declaration)) {
            return false;
        }
        const name = (declaration.propertyName || declaration.name).text;
        // We know that parent pointers are set because we created the SourceFile ourselves.
        // The number of parent references here match the recursion depth at this point.
        const moduleId = declaration.parent.parent.parent.moduleSpecifier.text;
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
        const componentArg = args[0];
        if (!ts.isObjectLiteralExpression(componentArg)) {
            // User should have gotten a type-check error because @Component takes an object literal
            // argument
            return args;
        }
        const newProperties = [];
        const newStyleExprs = [];
        componentArg.properties.forEach(prop => {
            if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) {
                newProperties.push(prop);
                return;
            }
            switch (prop.name.text) {
                case 'styles':
                    if (!ts.isArrayLiteralExpression(prop.initializer)) {
                        throw new Error('styles takes an array argument');
                    }
                    newStyleExprs.push(...prop.initializer.elements);
                    break;
                case 'styleUrls':
                    if (!ts.isArrayLiteralExpression(prop.initializer)) {
                        throw new Error('styleUrls takes an array argument');
                    }
                    newStyleExprs.push(...prop.initializer.elements.map((expr) => {
                        if (!ts.isStringLiteral(expr) && !ts.isNoSubstitutionTemplateLiteral(expr)) {
                            throw new Error('Can only accept string literal arguments to styleUrls. ' + PRECONDITIONS_TEXT);
                        }
                        const styles = loader.get(expr.text);
                        return ts.createLiteral(styles);
                    }));
                    break;
                case 'templateUrl':
                    if (!ts.isStringLiteral(prop.initializer) &&
                        !ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
                        throw new Error('Can only accept a string literal argument to templateUrl. ' + PRECONDITIONS_TEXT);
                    }
                    const template = loader.get(prop.initializer.text);
                    newProperties.push(ts.updatePropertyAssignment(prop, ts.createIdentifier('template'), ts.createLiteral(template)));
                    break;
                default:
                    newProperties.push(prop);
            }
        });
        // Add the non-inline styles
        if (newStyleExprs.length > 0) {
            const newStyles = ts.createPropertyAssignment(ts.createIdentifier('styles'), ts.createArrayLiteral(newStyleExprs));
            newProperties.push(newStyles);
        }
        return ts.createNodeArray([ts.updateObjectLiteral(componentArg, newProperties)]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lX3Jlc291cmNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2lubGluZV9yZXNvdXJjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxpQ0FBaUM7SUFFakMsb0VBQWdLO0lBSWhLLE1BQU0sa0JBQWtCLEdBQ3BCLG1HQUFtRyxDQUFDO0lBWXhHLFNBQVMsaUJBQWlCLENBQUMsSUFBbUIsRUFBRSxrQkFBMEI7UUFDeEUsT0FBTztZQUNMLEdBQUcsQ0FBQyxHQUEyQjtnQkFDN0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7b0JBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMscURBQXFELEdBQUcsa0JBQWtCLENBQUMsQ0FBQztpQkFDN0Y7Z0JBQUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN4RSxJQUFJLFFBQVEsRUFBRTtvQkFDWixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTt3QkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO3FCQUN4RTtvQkFDRCxPQUFPLE9BQU8sQ0FBQztpQkFDaEI7Z0JBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLGtCQUFrQixLQUFLLGtCQUFrQixFQUFFLENBQUMsQ0FBQztZQUNsRyxDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFhLGtDQUFrQztRQUM3QyxZQUFvQixJQUFtQjtZQUFuQixTQUFJLEdBQUosSUFBSSxDQUFlO1FBQUcsQ0FBQztRQUUzQyxLQUFL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OlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtNZXRhZGF0YU9iamVjdCwgTWV0YWRhdGFWYWx1ZSwgaXNDbGFzc01ldGFkYXRhLCBpc01ldGFkYXRhSW1wb3J0ZWRTeW1ib2xSZWZlcmVuY2VFeHByZXNzaW9uLCBpc01ldGFkYXRhU3ltYm9saWNDYWxsRXhwcmVzc2lvbn0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuXG5pbXBvcnQge01ldGFkYXRhVHJhbnNmb3JtZXIsIFZhbHVlVHJhbnNmb3JtfSBmcm9tICcuL21ldGFkYXRhX2NhY2hlJztcblxuY29uc3QgUFJFQ09ORElUSU9OU19URVhUID1cbiAgICAnYW5ndWxhckNvbXBpbGVyT3B0aW9ucy5lbmFibGVSZXNvdXJjZUlubGluaW5nIHJlcXVpcmVzIGFsbCByZXNvdXJjZXMgdG8gYmUgc3RhdGljYWxseSByZXNvbHZhYmxlLic7XG5cbi8qKiBBIHN1YnNldCBvZiBtZW1iZXJzIGZyb20gQW90Q29tcGlsZXJIb3N0ICovXG5leHBvcnQgdHlwZSBSZXNvdXJjZXNIb3N0ID0ge1xuICByZXNvdXJjZU5hbWVUb0ZpbGVOYW1lKHJlc291cmNlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGw7XG4gIGxvYWRSZXNvdXJjZShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz58IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFN0YXRpY1Jlc291cmNlTG9hZGVyID0ge1xuICBnZXQodXJsOiBzdHJpbmcgfCBNZXRhZGF0YVZhbHVlKTogc3RyaW5nO1xufTtcblxuZnVuY3Rpb24gZ2V0UmVzb3VyY2VMb2FkZXIoaG9zdDogUmVzb3VyY2VzSG9zdCwgY29udGFpbmluZ0ZpbGVOYW1lOiBzdHJpbmcpOiBTdGF0aWNSZXNvdXJjZUxvYWRlciB7XG4gIHJldHVybiB7XG4gICAgZ2V0KHVybDogc3RyaW5nIHwgTWV0YWRhdGFWYWx1ZSk6IHN0cmluZ3tcbiAgICAgIGlmICh0eXBlb2YgdXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RlbXBsYXRlVXJsIGFuZCBzdHlsZXNVcmwgbXVzdCBiZSBzdHJpbmcgbGl0ZXJhbHMuICcgKyBQUkVDT05ESVRJT05TX1RFWFQpO1xuICAgICAgfSBjb25zdCBmaWxlTmFtZSA9IGhvc3QucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSh1cmwsIGNvbnRhaW5pbmdGaWxlTmFtZSk7XG4gICAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGhvc3QubG9hZFJlc291cmNlKGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKHR5cGVvZiBjb250ZW50ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGhhbmRsZSBhc3luYyByZXNvdXJjZS4gJyArIFBSRUNPTkRJVElPTlNfVEVYVCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgICB9IHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlc29sdmUgJHt1cmx9IGZyb20gJHtjb250YWluaW5nRmlsZU5hbWV9LiAke1BSRUNPTkRJVElPTlNfVEVYVH1gKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBJbmxpbmVSZXNvdXJjZXNNZXRhZGF0YVRyYW5zZm9ybWVyIGltcGxlbWVudHMgTWV0YWRhdGFUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogUmVzb3VyY2VzSG9zdCkge31cblxuICBzdGFydChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVmFsdWVUcmFuc2Zvcm18dW5kZWZpbmVkIHtcbiAgICBjb25zdCBsb2FkZXIgPSBnZXRSZXNvdXJjZUxvYWRlcih0aGlzLmhvc3QsIHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIHJldHVybiAodmFsdWU6IE1ldGFkYXRhVmFsdWUsIG5vZGU6IHRzLk5vZGUpOiBNZXRhZGF0YVZhbHVlID0+IHtcbiAgICAgIGlmIChpc0NsYXNzTWV0YWRhdGEodmFsdWUpICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSAmJiB2YWx1ZS5kZWNvcmF0b3JzKSB7XG4gICAgICAgIHZhbHVlLmRlY29yYXRvcnMuZm9yRWFjaChkID0+IHtcbiAgICAgICAgICBpZiAoaXNNZXRhZGF0YVN5bWJvbGljQ2FsbEV4cHJlc3Npb24oZCkgJiZcbiAgICAgICAgICAgICAgaXNNZXRhZGF0YUltcG9ydGVkU3ltYm9sUmVmZXJlbmNlRXhwcmVzc2lvbihkLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICAgIGQuZXhwcmVzc2lvbi5tb2R1bGUgPT09ICdAYW5ndWxhci9jb3JlJyAmJiBkLmV4cHJlc3Npb24ubmFtZSA9PT0gJ0NvbXBvbmVudCcgJiZcbiAgICAgICAgICAgICAgZC5hcmd1bWVudHMpIHtcbiAgICAgICAgICAgIGQuYXJndW1lbnRzID0gZC5hcmd1bWVudHMubWFwKHRoaXMudXBkYXRlRGVjb3JhdG9yTWV0YWRhdGEuYmluZCh0aGlzLCBsb2FkZXIpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH1cblxuICB1cGRhdGVEZWNvcmF0b3JNZXRhZGF0YShsb2FkZXI6IFN0YXRpY1Jlc291cmNlTG9hZGVyLCBhcmc6IE1ldGFkYXRhT2JqZWN0KTogTWV0YWRhdGFPYmplY3Qge1xuICAgIGlmIChhcmdbJ3RlbXBsYXRlVXJsJ10pIHtcbiAgICAgIGFyZ1sndGVtcGxhdGUnXSA9IGxvYWRlci5nZXQoYXJnWyd0ZW1wbGF0ZVVybCddKTtcbiAgICAgIGRlbGV0ZSBhcmcudGVtcGxhdGVVcmw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGVzID0gYXJnWydzdHlsZXMnXSB8fCBbXTtcbiAgICBjb25zdCBzdHlsZVVybHMgPSBhcmdbJ3N0eWxlVXJscyddIHx8IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShzdHlsZXMpKSB0aHJvdyBuZXcgRXJyb3IoJ3N0eWxlcyBzaG91bGQgYmUgYW4gYXJyYXknKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3R5bGVVcmxzKSkgdGhyb3cgbmV3IEVycm9yKCdzdHlsZVVybHMgc2hvdWxkIGJlIGFuIGFycmF5Jyk7XG5cbiAgICBzdHlsZXMucHVzaCguLi5zdHlsZVVybHMubWFwKHN0eWxlVXJsID0+IGxvYWRlci5nZXQoc3R5bGVVcmwpKSk7XG4gICAgaWYgKHN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBhcmdbJ3N0eWxlcyddID0gc3R5bGVzO1xuICAgICAgZGVsZXRlIGFyZy5zdHlsZVVybHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5saW5lUmVzb3VyY2VzVHJhbnNmb3JtRmFjdG9yeShcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBob3N0OiBSZXNvdXJjZXNIb3N0KTogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiB7XG4gICAgY29uc3QgbG9hZGVyID0gZ2V0UmVzb3VyY2VMb2FkZXIoaG9zdCwgc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgY29uc3QgdmlzaXRvcjogdHMuVmlzaXRvciA9IG5vZGUgPT4ge1xuICAgICAgLy8gQ29tcG9uZW50cyBhcmUgYWx3YXlzIGNsYXNzZXM7IHNraXAgYW55IG90aGVyIG5vZGVcbiAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgfVxuXG4gICAgICAvLyBEZWNvcmF0b3IgY2FzZSAtIGJlZm9yZSBvciB3aXRob3V0IGRlY29yYXRvciBkb3dubGV2ZWxpbmdcbiAgICAgIC8vIEBDb21wb25lbnQoKVxuICAgICAgY29uc3QgbmV3RGVjb3JhdG9ycyA9IHRzLnZpc2l0Tm9kZXMobm9kZS5kZWNvcmF0b3JzLCAobm9kZTogdHMuRGVjb3JhdG9yKSA9PiB7XG4gICAgICAgIGlmIChpc0NvbXBvbmVudERlY29yYXRvcihub2RlLCBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHVwZGF0ZURlY29yYXRvcihub2RlLCBsb2FkZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEFubm90YXRpb24gY2FzZSAtIGFmdGVyIGRlY29yYXRvciBkb3dubGV2ZWxpbmdcbiAgICAgIC8vIHN0YXRpYyBkZWNvcmF0b3JzOiB7dHlwZTogRnVuY3Rpb24sIGFyZ3M/OiBhbnlbXX1bXVxuICAgICAgY29uc3QgbmV3TWVtYmVycyA9IHRzLnZpc2l0Tm9kZXMoXG4gICAgICAgICAgbm9kZS5tZW1iZXJzLFxuICAgICAgICAgIChub2RlOiB0cy5DbGFzc0VsZW1lbnQpID0+IHVwZGF0ZUFubm90YXRpb25zKG5vZGUsIGxvYWRlciwgcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpKSk7XG5cbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBBU1Qgc3VidHJlZSB3aXRoIG91ciBtb2RpZmljYXRpb25zXG4gICAgICByZXR1cm4gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICBub2RlLCBuZXdEZWNvcmF0b3JzLCBub2RlLm1vZGlmaWVycywgbm9kZS5uYW1lLCBub2RlLnR5cGVQYXJhbWV0ZXJzLFxuICAgICAgICAgIG5vZGUuaGVyaXRhZ2VDbGF1c2VzIHx8IFtdLCBuZXdNZW1iZXJzKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKHNvdXJjZUZpbGUsIHZpc2l0b3IsIGNvbnRleHQpO1xuICB9O1xufVxuXG4vKipcbiAqIFVwZGF0ZSBhIERlY29yYXRvciBBU1Qgbm9kZSB0byBpbmxpbmUgdGhlIHJlc291cmNlc1xuICogQHBhcmFtIG5vZGUgdGhlIEBDb21wb25lbnQgZGVjb3JhdG9yXG4gKiBAcGFyYW0gbG9hZGVyIHByb3ZpZGVzIGFjY2VzcyB0byBsb2FkIHJlc291cmNlc1xuICovXG5mdW5jdGlvbiB1cGRhdGVEZWNvcmF0b3Iobm9kZTogdHMuRGVjb3JhdG9yLCBsb2FkZXI6IFN0YXRpY1Jlc291cmNlTG9hZGVyKTogdHMuRGVjb3JhdG9yIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikpIHtcbiAgICAvLyBVc2VyIHdpbGwgZ2V0IGFuIGVycm9yIHNvbWV3aGVyZSBlbHNlIHdpdGggYmFyZSBAQ29tcG9uZW50XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbiAgY29uc3QgZXhwciA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgY29uc3QgbmV3QXJndW1lbnRzID0gdXBkYXRlQ29tcG9uZW50UHJvcGVydGllcyhleHByLmFyZ3VtZW50cywgbG9hZGVyKTtcbiAgcmV0dXJuIHRzLnVwZGF0ZURlY29yYXRvcihcbiAgICAgIG5vZGUsIHRzLnVwZGF0ZUNhbGwoZXhwciwgZXhwci5leHByZXNzaW9uLCBleHByLnR5cGVBcmd1bWVudHMsIG5ld0FyZ3VtZW50cykpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBhbiBBbm5vdGF0aW9ucyBBU1Qgbm9kZSB0byBpbmxpbmUgdGhlIHJlc291cmNlc1xuICogQHBhcmFtIG5vZGUgdGhlIHN0YXRpYyBkZWNvcmF0b3JzIHByb3BlcnR5XG4gKiBAcGFyYW0gbG9hZGVyIHByb3ZpZGVzIGFjY2VzcyB0byBsb2FkIHJlc291cmNlc1xuICogQHBhcmFtIHR5cGVDaGVja2VyIHByb3ZpZGVzIGFjY2VzcyB0byBzeW1ib2wgdGFibGVcbiAqL1xuZnVuY3Rpb24gdXBkYXRlQW5ub3RhdGlvbnMoXG4gICAgbm9kZTogdHMuQ2xhc3NFbGVtZW50LCBsb2FkZXI6IFN0YXRpY1Jlc291cmNlTG9hZGVyLFxuICAgIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IHRzLkNsYXNzRWxlbWVudCB7XG4gIC8vIExvb2tpbmcgZm9yIGEgbWVtYmVyIG9mIHRoaXMgc2hhcGU6XG4gIC8vIFByb3BlcnR5RGVjbGFyYXRpb24gY2FsbGVkIGRlY29yYXRvcnMsIHdpdGggc3RhdGljIG1vZGlmaWVyXG4gIC8vIEluaXRpYWxpemVyIGlzIEFycmF5TGl0ZXJhbEV4cHJlc3Npb25cbiAgLy8gT25lIGVsZW1lbnQgaXMgdGhlIENvbXBvbmVudCB0eXBlLCBpdHMgaW5pdGlhbGl6ZXIgaXMgdGhlIEBhbmd1bGFyL2NvcmUgQ29tcG9uZW50IHN5bWJvbFxuICAvLyBPbmUgZWxlbWVudCBpcyB0aGUgY29tcG9uZW50IGFyZ3MsIGl0cyBpbml0aWFsaXplciBpcyB0aGUgQ29tcG9uZW50IGFyZ3VtZW50cyB0byBjaGFuZ2VcbiAgLy8gZS5nLlxuICAvLyAgIHN0YXRpYyBkZWNvcmF0b3JzOiB7dHlwZTogRnVuY3Rpb24sIGFyZ3M/OiBhbnlbXX1bXSA9XG4gIC8vICAgW3tcbiAgLy8gICAgIHR5cGU6IENvbXBvbmVudCxcbiAgLy8gICAgIGFyZ3M6IFt7XG4gIC8vICAgICAgIHRlbXBsYXRlVXJsOiAnLi9teS5jb21wb25lbnQuaHRtbCcsXG4gIC8vICAgICAgIHN0eWxlVXJsczogWycuL215LmNvbXBvbmVudC5jc3MnXSxcbiAgLy8gICAgIH1dLFxuICAvLyAgIH1dO1xuICBpZiAoIXRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSB8fCAgLy8gdHMuTW9kaWZpZXJGbGFncy5TdGF0aWMgJiZcbiAgICAgICF0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSB8fCBub2RlLm5hbWUudGV4dCAhPT0gJ2RlY29yYXRvcnMnIHx8ICFub2RlLmluaXRpYWxpemVyIHx8XG4gICAgICAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGUuaW5pdGlhbGl6ZXIpKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBjb25zdCBuZXdBbm5vdGF0aW9ucyA9IG5vZGUuaW5pdGlhbGl6ZXIuZWxlbWVudHMubWFwKGFubm90YXRpb24gPT4ge1xuICAgIC8vIE5vLW9wIGlmIHRoZXJlJ3MgYSBub24tb2JqZWN0LWxpdGVyYWwgbWl4ZWQgaW4gdGhlIGRlY29yYXRvcnMgdmFsdWVzXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGFubm90YXRpb24pKSByZXR1cm4gYW5ub3RhdGlvbjtcblxuICAgIGNvbnN0IGRlY29yYXRvclR5cGUgPSBhbm5vdGF0aW9uLnByb3BlcnRpZXMuZmluZChwID0+IGlzSWRlbnRpZmllck5hbWVkKHAsICd0eXBlJykpO1xuXG4gICAgLy8gTm8tb3AgaWYgdGhlcmUncyBubyAndHlwZScgcHJvcGVydHksIG9yIGlmIGl0J3Mgbm90IGluaXRpYWxpemVkIHRvIHRoZSBDb21wb25lbnQgc3ltYm9sXG4gICAgaWYgKCFkZWNvcmF0b3JUeXBlIHx8ICF0cy5pc1Byb3BlcnR5QXNzaWdubWVudChkZWNvcmF0b3JUeXBlKSB8fFxuICAgICAgICAhdHMuaXNJZGVudGlmaWVyKGRlY29yYXRvclR5cGUuaW5pdGlhbGl6ZXIpIHx8XG4gICAgICAgICFpc0NvbXBvbmVudFN5bWJvbChkZWNvcmF0b3JUeXBlLmluaXRpYWxpemVyLCB0eXBlQ2hlY2tlcikpIHtcbiAgICAgIHJldHVybiBhbm5vdGF0aW9uO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld0Fubm90YXRpb24gPSBhbm5vdGF0aW9uLnByb3BlcnRpZXMubWFwKHByb3AgPT4ge1xuICAgICAgLy8gTm8tb3AgaWYgdGhpcyBpc24ndCB0aGUgJ2FyZ3MnIHByb3BlcnR5IG9yIGlmIGl0J3Mgbm90IGluaXRpYWxpemVkIHRvIGFuIGFycmF5XG4gICAgICBpZiAoIWlzSWRlbnRpZmllck5hbWVkKHByb3AsICdhcmdzJykgfHwgIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApIHx8XG4gICAgICAgICAgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwcm9wLmluaXRpYWxpemVyKSlcbiAgICAgICAgcmV0dXJuIHByb3A7XG5cbiAgICAgIGNvbnN0IG5ld0RlY29yYXRvckFyZ3MgPSB0cy51cGRhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgcHJvcCwgcHJvcC5uYW1lLFxuICAgICAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbCh1cGRhdGVDb21wb25lbnRQcm9wZXJ0aWVzKHByb3AuaW5pdGlhbGl6ZXIuZWxlbWVudHMsIGxvYWRlcikpKTtcblxuICAgICAgcmV0dXJuIG5ld0RlY29yYXRvckFyZ3M7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdHMudXBkYXRlT2JqZWN0TGl0ZXJhbChhbm5vdGF0aW9uLCBuZXdBbm5vdGF0aW9uKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRzLnVwZGF0ZVByb3BlcnR5KFxuICAgICAgbm9kZSwgbm9kZS5kZWNvcmF0b3JzLCBub2RlLm1vZGlmaWVycywgbm9kZS5uYW1lLCBub2RlLnF1ZXN0aW9uVG9rZW4sIG5vZGUudHlwZSxcbiAgICAgIHRzLnVwZGF0ZUFycmF5TGl0ZXJhbChub2RlLmluaXRpYWxpemVyLCBuZXdBbm5vdGF0aW9ucykpO1xufVxuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXJOYW1lZChwOiB0cy5PYmplY3RMaXRlcmFsRWxlbWVudExpa2UsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gISFwLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKHAubmFtZSkgJiYgcC5uYW1lLnRleHQgPT09IG5hbWU7XG59XG5cbi8qKlxuICogQ2hlY2sgdGhhdCB0aGUgbm9kZSB3ZSBhcmUgdmlzaXRpbmcgaXMgdGhlIGFjdHVhbCBDb21wb25lbnQgZGVjb3JhdG9yIGRlZmluZWQgaW4gQGFuZ3VsYXIvY29yZS5cbiAqL1xuZnVuY3Rpb24gaXNDb21wb25lbnREZWNvcmF0b3Iobm9kZTogdHMuRGVjb3JhdG9yLCB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgY2FsbEV4cHIgPSBub2RlLmV4cHJlc3Npb247XG5cbiAgbGV0IGlkZW50aWZpZXI6IHRzLk5vZGU7XG5cbiAgaWYgKHRzLmlzSWRlbnRpZmllcihjYWxsRXhwci5leHByZXNzaW9uKSkge1xuICAgIGlkZW50aWZpZXIgPSBjYWxsRXhwci5leHByZXNzaW9uO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gaXNDb21wb25lbnRTeW1ib2woaWRlbnRpZmllciwgdHlwZUNoZWNrZXIpO1xufVxuXG5mdW5jdGlvbiBpc0NvbXBvbmVudFN5bWJvbChpZGVudGlmaWVyOiB0cy5Ob2RlLCB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHtcbiAgLy8gT25seSBoYW5kbGUgaWRlbnRpZmllcnMsIG5vdCBleHByZXNzaW9uc1xuICBpZiAoIXRzLmlzSWRlbnRpZmllcihpZGVudGlmaWVyKSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIE5PVEU6IHJlc29sdmVyLmdldFJlZmVyZW5jZWRJbXBvcnREZWNsYXJhdGlvbiB3b3VsZCB3b3JrIGFzIHdlbGwgYnV0IGlzIGludGVybmFsXG4gIGNvbnN0IHN5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWRlbnRpZmllcik7XG5cbiAgaWYgKCFzeW1ib2wgfHwgIXN5bWJvbC5kZWNsYXJhdGlvbnMgfHwgIXN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgYFVuYWJsZSB0byByZXNvbHZlIHN5bWJvbCAnJHtpZGVudGlmaWVyLnRleHR9JyBpbiB0aGUgcHJvZ3JhbSwgZG9lcyBpdCB0eXBlLWNoZWNrP2ApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGRlY2xhcmF0aW9uID0gc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcblxuICBpZiAoIWRlY2xhcmF0aW9uIHx8ICF0cy5pc0ltcG9ydFNwZWNpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBuYW1lID0gKGRlY2xhcmF0aW9uLnByb3BlcnR5TmFtZSB8fCBkZWNsYXJhdGlvbi5uYW1lKS50ZXh0O1xuICAvLyBXZSBrbm93IHRoYXQgcGFyZW50IHBvaW50ZXJzIGFyZSBzZXQgYmVjYXVzZSB3ZSBjcmVhdGVkIHRoZSBTb3VyY2VGaWxlIG91cnNlbHZlcy5cbiAgLy8gVGhlIG51bWJlciBvZiBwYXJlbnQgcmVmZXJlbmNlcyBoZXJlIG1hdGNoIHRoZSByZWN1cnNpb24gZGVwdGggYXQgdGhpcyBwb2ludC5cbiAgY29uc3QgbW9kdWxlSWQgPVxuICAgICAgKGRlY2xhcmF0aW9uLnBhcmVudCAhLnBhcmVudCAhLnBhcmVudCAhLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICByZXR1cm4gbW9kdWxlSWQgPT09ICdAYW5ndWxhci9jb3JlJyAmJiBuYW1lID09PSAnQ29tcG9uZW50Jztcbn1cblxuLyoqXG4gKiBGb3IgZWFjaCBwcm9wZXJ0eSBpbiB0aGUgb2JqZWN0IGxpdGVyYWwsIGlmIGl0J3MgdGVtcGxhdGVVcmwgb3Igc3R5bGVVcmxzLCByZXBsYWNlIGl0XG4gKiB3aXRoIGNvbnRlbnQuXG4gKiBAcGFyYW0gbm9kZSB0aGUgYXJndW1lbnRzIHRvIEBDb21wb25lbnQoKSBvciBhcmdzIHByb3BlcnR5IG9mIGRlY29yYXRvcnM6IFt7dHlwZTpDb21wb25lbnR9XVxuICogQHBhcmFtIGxvYWRlciBwcm92aWRlcyBhY2Nlc3MgdG8gdGhlIGxvYWRSZXNvdXJjZSBtZXRob2Qgb2YgdGhlIGhvc3RcbiAqIEByZXR1cm5zIHVwZGF0ZWQgYXJndW1lbnRzXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZUNvbXBvbmVudFByb3BlcnRpZXMoXG4gICAgYXJnczogdHMuTm9kZUFycmF5PHRzLkV4cHJlc3Npb24+LCBsb2FkZXI6IFN0YXRpY1Jlc291cmNlTG9hZGVyKTogdHMuTm9kZUFycmF5PHRzLkV4cHJlc3Npb24+IHtcbiAgaWYgKGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgLy8gVXNlciBzaG91bGQgaGF2ZSBnb3R0ZW4gYSB0eXBlLWNoZWNrIGVycm9yIGJlY2F1c2UgQENvbXBvbmVudCB0YWtlcyBvbmUgYXJndW1lbnRcbiAgICByZXR1cm4gYXJncztcbiAgfVxuICBjb25zdCBjb21wb25lbnRBcmcgPSBhcmdzWzBdO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oY29tcG9uZW50QXJnKSkge1xuICAgIC8vIFVzZXIgc2hvdWxkIGhhdmUgZ290dGVuIGEgdHlwZS1jaGVjayBlcnJvciBiZWNhdXNlIEBDb21wb25lbnQgdGFrZXMgYW4gb2JqZWN0IGxpdGVyYWxcbiAgICAvLyBhcmd1bWVudFxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgY29uc3QgbmV3UHJvcGVydGllczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXTtcbiAgY29uc3QgbmV3U3R5bGVFeHByczogdHMuRXhwcmVzc2lvbltdID0gW107XG4gIGNvbXBvbmVudEFyZy5wcm9wZXJ0aWVzLmZvckVhY2gocHJvcCA9PiB7XG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwcm9wKSB8fCB0cy5pc0NvbXB1dGVkUHJvcGVydHlOYW1lKHByb3AubmFtZSkpIHtcbiAgICAgIG5ld1Byb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHByb3AubmFtZS50ZXh0KSB7XG4gICAgICBjYXNlICdzdHlsZXMnOlxuICAgICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwcm9wLmluaXRpYWxpemVyKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc3R5bGVzIHRha2VzIGFuIGFycmF5IGFyZ3VtZW50Jyk7XG4gICAgICAgIH1cbiAgICAgICAgbmV3U3R5bGVFeHBycy5wdXNoKC4uLnByb3AuaW5pdGlhbGl6ZXIuZWxlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc3R5bGVVcmxzJzpcbiAgICAgICAgaWYgKCF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24ocHJvcC5pbml0aWFsaXplcikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0eWxlVXJscyB0YWtlcyBhbiBhcnJheSBhcmd1bWVudCcpO1xuICAgICAgICB9XG4gICAgICAgIG5ld1N0eWxlRXhwcnMucHVzaCguLi5wcm9wLmluaXRpYWxpemVyLmVsZW1lbnRzLm1hcCgoZXhwcjogdHMuRXhwcmVzc2lvbikgPT4ge1xuICAgICAgICAgIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKGV4cHIpICYmICF0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKGV4cHIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgJ0NhbiBvbmx5IGFjY2VwdCBzdHJpbmcgbGl0ZXJhbCBhcmd1bWVudHMgdG8gc3R5bGVVcmxzLiAnICsgUFJFQ09ORElUSU9OU19URVhUKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgc3R5bGVzID0gbG9hZGVyLmdldChleHByLnRleHQpO1xuICAgICAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsKHN0eWxlcyk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3RlbXBsYXRlVXJsJzpcbiAgICAgICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwocHJvcC5pbml0aWFsaXplcikgJiZcbiAgICAgICAgICAgICF0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHByb3AuaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnQ2FuIG9ubHkgYWNjZXB0IGEgc3RyaW5nIGxpdGVyYWwgYXJndW1lbnQgdG8gdGVtcGxhdGVVcmwuICcgKyBQUkVDT05ESVRJT05TX1RFWFQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gbG9hZGVyLmdldChwcm9wLmluaXRpYWxpemVyLnRleHQpO1xuICAgICAgICBuZXdQcm9wZXJ0aWVzLnB1c2godHMudXBkYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgcHJvcCwgdHMuY3JlYXRlSWRlbnRpZmllcigndGVtcGxhdGUnKSwgdHMuY3JlYXRlTGl0ZXJhbCh0ZW1wbGF0ZSkpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG5ld1Byb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEFkZCB0aGUgbm9uLWlubGluZSBzdHlsZXNcbiAgaWYgKG5ld1N0eWxlRXhwcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG5ld1N0eWxlcyA9IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcignc3R5bGVzJyksIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChuZXdTdHlsZUV4cHJzKSk7XG4gICAgbmV3UHJvcGVydGllcy5wdXNoKG5ld1N0eWxlcyk7XG4gIH1cblxuICByZXR1cm4gdHMuY3JlYXRlTm9kZUFycmF5KFt0cy51cGRhdGVPYmplY3RMaXRlcmFsKGNvbXBvbmVudEFyZywgbmV3UHJvcGVydGllcyldKTtcbn1cbiJdfQ==