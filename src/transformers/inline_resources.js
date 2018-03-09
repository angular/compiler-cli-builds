"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var index_1 = require("../metadata/index");
var InlineResourcesMetadataTransformer = /** @class */ (function () {
    function InlineResourcesMetadataTransformer(host) {
        this.host = host;
    }
    InlineResourcesMetadataTransformer.prototype.start = function (sourceFile) {
        var _this = this;
        return function (value, node) {
            if (index_1.isClassMetadata(value) && ts.isClassDeclaration(node) && value.decorators) {
                value.decorators.forEach(function (d) {
                    if (index_1.isMetadataSymbolicCallExpression(d) &&
                        index_1.isMetadataImportedSymbolReferenceExpression(d.expression) &&
                        d.expression.module === '@angular/core' && d.expression.name === 'Component' &&
                        d.arguments) {
                        d.arguments = d.arguments.map(_this.updateDecoratorMetadata.bind(_this));
                    }
                });
            }
            return value;
        };
    };
    InlineResourcesMetadataTransformer.prototype.inlineResource = function (url) {
        if (typeof url === 'string') {
            var content = this.host.loadResource(url);
            if (typeof content === 'string') {
                return content;
            }
        }
    };
    InlineResourcesMetadataTransformer.prototype.updateDecoratorMetadata = function (arg) {
        var _this = this;
        if (arg['templateUrl']) {
            var template = this.inlineResource(arg['templateUrl']);
            if (template) {
                arg['template'] = template;
                delete arg.templateUrl;
            }
        }
        if (arg['styleUrls']) {
            var styleUrls = arg['styleUrls'];
            if (Array.isArray(styleUrls)) {
                var allStylesInlined_1 = true;
                var newStyles = styleUrls.map(function (styleUrl) {
                    var style = _this.inlineResource(styleUrl);
                    if (style)
                        return style;
                    allStylesInlined_1 = false;
                    return styleUrl;
                });
                if (allStylesInlined_1) {
                    arg['styles'] = newStyles;
                    delete arg.styleUrls;
                }
            }
        }
        return arg;
    };
    return InlineResourcesMetadataTransformer;
}());
exports.InlineResourcesMetadataTransformer = InlineResourcesMetadataTransformer;
function getInlineResourcesTransformFactory(program, host) {
    return function (context) { return function (sourceFile) {
        var visitor = function (node) {
            // Components are always classes; skip any other node
            if (!ts.isClassDeclaration(node)) {
                return node;
            }
            // Decorator case - before or without decorator downleveling
            // @Component()
            var newDecorators = ts.visitNodes(node.decorators, function (node) {
                if (isComponentDecorator(node, program.getTypeChecker())) {
                    return updateDecorator(node, host);
                }
                return node;
            });
            // Annotation case - after decorator downleveling
            // static decorators: {type: Function, args?: any[]}[]
            var newMembers = ts.visitNodes(node.members, function (node) { return updateAnnotations(node, host, program.getTypeChecker()); });
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
 * @param host provides access to load resources
 */
function updateDecorator(node, host) {
    if (!ts.isCallExpression(node.expression)) {
        // User will get an error somewhere else with bare @Component
        return node;
    }
    var expr = node.expression;
    var newArguments = updateComponentProperties(expr.arguments, host);
    return ts.updateDecorator(node, ts.updateCall(expr, expr.expression, expr.typeArguments, newArguments));
}
/**
 * Update an Annotations AST node to inline the resources
 * @param node the static decorators property
 * @param host provides access to load resources
 * @param typeChecker provides access to symbol table
 */
function updateAnnotations(node, host, typeChecker) {
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
            var newDecoratorArgs = ts.updatePropertyAssignment(prop, prop.name, ts.createArrayLiteral(updateComponentProperties(prop.initializer.elements, host)));
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
 * @param host provides access to the loadResource method of the host
 * @returns updated arguments
 */
function updateComponentProperties(args, host) {
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
    var newArgument = ts.updateObjectLiteral(componentArg, ts.visitNodes(componentArg.properties, function (node) {
        if (!ts.isPropertyAssignment(node)) {
            // Error: unsupported
            return node;
        }
        if (ts.isComputedPropertyName(node.name)) {
            // computed names are not supported
            return node;
        }
        var name = node.name.text;
        switch (name) {
            case 'styleUrls':
                if (!ts.isArrayLiteralExpression(node.initializer)) {
                    // Error: unsupported
                    return node;
                }
                var styleUrls = node.initializer.elements;
                return ts.updatePropertyAssignment(node, ts.createIdentifier('styles'), ts.createArrayLiteral(ts.visitNodes(styleUrls, function (expr) {
                    if (ts.isStringLiteral(expr)) {
                        var styles = host.loadResource(expr.text);
                        if (typeof styles === 'string') {
                            return ts.createLiteral(styles);
                        }
                    }
                    return expr;
                })));
            case 'templateUrl':
                if (ts.isStringLiteral(node.initializer)) {
                    var template = host.loadResource(node.initializer.text);
                    if (typeof template === 'string') {
                        return ts.updatePropertyAssignment(node, ts.createIdentifier('template'), ts.createLiteral(template));
                    }
                }
                return node;
            default:
                return node;
        }
    }));
    return ts.createNodeArray([newArgument]);
}
//# sourceMappingURL=inline_resources.js.map