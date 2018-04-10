"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const evaluator_1 = require("./evaluator");
const schema_1 = require("./schema");
const symbols_1 = require("./symbols");
const isStatic = (node) => ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static;
/**
 * Collect decorator metadata from a TypeScript module.
 */
class MetadataCollector {
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * Returns a JSON.stringify friendly form describing the decorators of the exported classes from
     * the source file that is expected to correspond to a module.
     */
    getMetadata(sourceFile, strict = false, substituteExpression) {
        const locals = new symbols_1.Symbols(sourceFile);
        const nodeMap = new Map();
        const composedSubstituter = substituteExpression && this.options.substituteExpression ?
            (value, node) => this.options.substituteExpression(substituteExpression(value, node), node) :
            substituteExpression;
        const evaluatorOptions = substituteExpression ? Object.assign({}, this.options, { substituteExpression: composedSubstituter }) :
            this.options;
        let metadata;
        const evaluator = new evaluator_1.Evaluator(locals, nodeMap, evaluatorOptions, (name, value) => {
            if (!metadata)
                metadata = {};
            metadata[name] = value;
        });
        let exports = undefined;
        function objFromDecorator(decoratorNode) {
            return evaluator.evaluateNode(decoratorNode.expression);
        }
        function recordEntry(entry, node) {
            if (composedSubstituter) {
                entry = composedSubstituter(entry, node);
            }
            return evaluator_1.recordMapEntry(entry, node, nodeMap, sourceFile);
        }
        function errorSym(message, node, context) {
            return evaluator_1.errorSymbol(message, node, context, sourceFile);
        }
        function maybeGetSimpleFunction(functionDeclaration) {
            if (functionDeclaration.name && functionDeclaration.name.kind == ts.SyntaxKind.Identifier) {
                const nameNode = functionDeclaration.name;
                const functionName = nameNode.text;
                const functionBody = functionDeclaration.body;
                if (functionBody && functionBody.statements.length == 1) {
                    const statement = functionBody.statements[0];
                    if (statement.kind === ts.SyntaxKind.ReturnStatement) {
                        const returnStatement = statement;
                        if (returnStatement.expression) {
                            const func = {
                                __symbolic: 'function',
                                parameters: namesOf(functionDeclaration.parameters),
                                value: evaluator.evaluateNode(returnStatement.expression)
                            };
                            if (functionDeclaration.parameters.some(p => p.initializer != null)) {
                                func.defaults = functionDeclaration.parameters.map(p => p.initializer && evaluator.evaluateNode(p.initializer));
                            }
                            return recordEntry({ func, name: functionName }, functionDeclaration);
                        }
                    }
                }
            }
        }
        function classMetadataOf(classDeclaration) {
            const result = { __symbolic: 'class' };
            function getDecorators(decorators) {
                if (decorators && decorators.length)
                    return decorators.map(decorator => objFromDecorator(decorator));
                return undefined;
            }
            function referenceFrom(node) {
                const result = evaluator.evaluateNode(node);
                if (schema_1.isMetadataError(result) || schema_1.isMetadataSymbolicReferenceExpression(result) ||
                    schema_1.isMetadataSymbolicSelectExpression(result)) {
                    return result;
                }
                else {
                    return errorSym('Symbol reference expected', node);
                }
            }
            // Add class parents
            if (classDeclaration.heritageClauses) {
                classDeclaration.heritageClauses.forEach((hc) => {
                    if (hc.token === ts.SyntaxKind.ExtendsKeyword && hc.types) {
                        hc.types.forEach(type => result.extends = referenceFrom(type.expression));
                    }
                });
            }
            // Add arity if the type is generic
            const typeParameters = classDeclaration.typeParameters;
            if (typeParameters && typeParameters.length) {
                result.arity = typeParameters.length;
            }
            // Add class decorators
            if (classDeclaration.decorators) {
                result.decorators = getDecorators(classDeclaration.decorators);
            }
            // member decorators
            let members = null;
            function recordMember(name, metadata) {
                if (!members)
                    members = {};
                const data = members.hasOwnProperty(name) ? members[name] : [];
                data.push(metadata);
                members[name] = data;
            }
            // static member
            let statics = null;
            function recordStaticMember(name, value) {
                if (!statics)
                    statics = {};
                statics[name] = value;
            }
            for (const member of classDeclaration.members) {
                let isConstructor = false;
                switch (member.kind) {
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.MethodDeclaration:
                        isConstructor = member.kind === ts.SyntaxKind.Constructor;
                        const method = member;
                        if (isStatic(method)) {
                            const maybeFunc = maybeGetSimpleFunction(method);
                            if (maybeFunc) {
                                recordStaticMember(maybeFunc.name, maybeFunc.func);
                            }
                            continue;
                        }
                        const methodDecorators = getDecorators(method.decorators);
                        const parameters = method.parameters;
                        const parameterDecoratorData = [];
                        const parametersData = [];
                        let hasDecoratorData = false;
                        let hasParameterData = false;
                        for (const parameter of parameters) {
                            const parameterData = getDecorators(parameter.decorators);
                            parameterDecoratorData.push(parameterData);
                            hasDecoratorData = hasDecoratorData || !!parameterData;
                            if (isConstructor) {
                                if (parameter.type) {
                                    parametersData.push(referenceFrom(parameter.type));
                                }
                                else {
                                    parametersData.push(null);
                                }
                                hasParameterData = true;
                            }
                        }
                        const data = { __symbolic: isConstructor ? 'constructor' : 'method' };
                        const name = isConstructor ? '__ctor__' : evaluator.nameOf(member.name);
                        if (methodDecorators) {
                            data.decorators = methodDecorators;
                        }
                        if (hasDecoratorData) {
                            data.parameterDecorators = parameterDecoratorData;
                        }
                        if (hasParameterData) {
                            data.parameters = parametersData;
                        }
                        if (!schema_1.isMetadataError(name)) {
                            recordMember(name, data);
                        }
                        break;
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                        const property = member;
                        if (isStatic(property)) {
                            const name = evaluator.nameOf(property.name);
                            if (!schema_1.isMetadataError(name)) {
                                if (property.initializer) {
                                    const value = evaluator.evaluateNode(property.initializer);
                                    recordStaticMember(name, value);
                                }
                                else {
                                    recordStaticMember(name, errorSym('Variable not initialized', property.name));
                                }
                            }
                        }
                        const propertyDecorators = getDecorators(property.decorators);
                        if (propertyDecorators) {
                            const name = evaluator.nameOf(property.name);
                            if (!schema_1.isMetadataError(name)) {
                                recordMember(name, { __symbolic: 'property', decorators: propertyDecorators });
                            }
                        }
                        break;
                }
            }
            if (members) {
                result.members = members;
            }
            if (statics) {
                result.statics = statics;
            }
            return recordEntry(result, classDeclaration);
        }
        // Collect all exported symbols from an exports clause.
        const exportMap = new Map();
        ts.forEachChild(sourceFile, node => {
            switch (node.kind) {
                case ts.SyntaxKind.ExportDeclaration:
                    const exportDeclaration = node;
                    const { moduleSpecifier, exportClause } = exportDeclaration;
                    if (!moduleSpecifier) {
                        // If there is a module specifier there is also an exportClause
                        exportClause.elements.forEach(spec => {
                            const exportedAs = spec.name.text;
                            const name = (spec.propertyName || spec.name).text;
                            exportMap.set(name, exportedAs);
                        });
                    }
            }
        });
        const isExport = (node) => sourceFile.isDeclarationFile || ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export;
        const isExportedIdentifier = (identifier) => identifier && exportMap.has(identifier.text);
        const isExported = (node) => isExport(node) || isExportedIdentifier(node.name);
        const exportedIdentifierName = (identifier) => identifier && (exportMap.get(identifier.text) || identifier.text);
        const exportedName = (node) => exportedIdentifierName(node.name);
        // Pre-declare classes and functions
        ts.forEachChild(sourceFile, node => {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    const classDeclaration = node;
                    if (classDeclaration.name) {
                        const className = classDeclaration.name.text;
                        if (isExported(classDeclaration)) {
                            locals.define(className, { __symbolic: 'reference', name: exportedName(classDeclaration) });
                        }
                        else {
                            locals.define(className, errorSym('Reference to non-exported class', node, { className }));
                        }
                    }
                    break;
                case ts.SyntaxKind.InterfaceDeclaration:
                    const interfaceDeclaration = node;
                    if (interfaceDeclaration.name) {
                        const interfaceName = interfaceDeclaration.name.text;
                        // All references to interfaces should be converted to references to `any`.
                        locals.define(interfaceName, { __symbolic: 'reference', name: 'any' });
                    }
                    break;
                case ts.SyntaxKind.FunctionDeclaration:
                    const functionDeclaration = node;
                    if (!isExported(functionDeclaration)) {
                        // Report references to this function as an error.
                        const nameNode = functionDeclaration.name;
                        if (nameNode && nameNode.text) {
                            locals.define(nameNode.text, errorSym('Reference to a non-exported function', nameNode, { name: nameNode.text }));
                        }
                    }
                    break;
            }
        });
        ts.forEachChild(sourceFile, node => {
            switch (node.kind) {
                case ts.SyntaxKind.ExportDeclaration:
                    // Record export declarations
                    const exportDeclaration = node;
                    const { moduleSpecifier, exportClause } = exportDeclaration;
                    if (!moduleSpecifier) {
                        // no module specifier -> export {propName as name};
                        if (exportClause) {
                            exportClause.elements.forEach(spec => {
                                const name = spec.name.text;
                                // If the symbol was not already exported, export a reference since it is a
                                // reference to an import
                                if (!metadata || !metadata[name]) {
                                    const propNode = spec.propertyName || spec.name;
                                    const value = evaluator.evaluateNode(propNode);
                                    if (!metadata)
                                        metadata = {};
                                    metadata[name] = recordEntry(value, node);
                                }
                            });
                        }
                    }
                    if (moduleSpecifier && moduleSpecifier.kind == ts.SyntaxKind.StringLiteral) {
                        // Ignore exports that don't have string literals as exports.
                        // This is allowed by the syntax but will be flagged as an error by the type checker.
                        const from = moduleSpecifier.text;
                        const moduleExport = { from };
                        if (exportClause) {
                            moduleExport.export = exportClause.elements.map(spec => spec.propertyName ? { name: spec.propertyName.text, as: spec.name.text } :
                                spec.name.text);
                        }
                        if (!exports)
                            exports = [];
                        exports.push(moduleExport);
                    }
                    break;
                case ts.SyntaxKind.ClassDeclaration:
                    const classDeclaration = node;
                    if (classDeclaration.name) {
                        if (isExported(classDeclaration)) {
                            const name = exportedName(classDeclaration);
                            if (name) {
                                if (!metadata)
                                    metadata = {};
                                metadata[name] = classMetadataOf(classDeclaration);
                            }
                        }
                    }
                    // Otherwise don't record metadata for the class.
                    break;
                case ts.SyntaxKind.TypeAliasDeclaration:
                    const typeDeclaration = node;
                    if (typeDeclaration.name && isExported(typeDeclaration)) {
                        const name = exportedName(typeDeclaration);
                        if (name) {
                            if (!metadata)
                                metadata = {};
                            metadata[name] = { __symbolic: 'interface' };
                        }
                    }
                    break;
                case ts.SyntaxKind.InterfaceDeclaration:
                    const interfaceDeclaration = node;
                    if (interfaceDeclaration.name && isExported(interfaceDeclaration)) {
                        const name = exportedName(interfaceDeclaration);
                        if (name) {
                            if (!metadata)
                                metadata = {};
                            metadata[name] = { __symbolic: 'interface' };
                        }
                    }
                    break;
                case ts.SyntaxKind.FunctionDeclaration:
                    // Record functions that return a single value. Record the parameter
                    // names substitution will be performed by the StaticReflector.
                    const functionDeclaration = node;
                    if (isExported(functionDeclaration) && functionDeclaration.name) {
                        const name = exportedName(functionDeclaration);
                        const maybeFunc = maybeGetSimpleFunction(functionDeclaration);
                        if (name) {
                            if (!metadata)
                                metadata = {};
                            metadata[name] =
                                maybeFunc ? recordEntry(maybeFunc.func, node) : { __symbolic: 'function' };
                        }
                    }
                    break;
                case ts.SyntaxKind.EnumDeclaration:
                    const enumDeclaration = node;
                    if (isExported(enumDeclaration)) {
                        const enumValueHolder = {};
                        const enumName = exportedName(enumDeclaration);
                        let nextDefaultValue = 0;
                        let writtenMembers = 0;
                        for (const member of enumDeclaration.members) {
                            let enumValue;
                            if (!member.initializer) {
                                enumValue = nextDefaultValue;
                            }
                            else {
                                enumValue = evaluator.evaluateNode(member.initializer);
                            }
                            let name = undefined;
                            if (member.name.kind == ts.SyntaxKind.Identifier) {
                                const identifier = member.name;
                                name = identifier.text;
                                enumValueHolder[name] = enumValue;
                                writtenMembers++;
                            }
                            if (typeof enumValue === 'number') {
                                nextDefaultValue = enumValue + 1;
                            }
                            else if (name) {
                                nextDefaultValue = {
                                    __symbolic: 'binary',
                                    operator: '+',
                                    left: {
                                        __symbolic: 'select',
                                        expression: recordEntry({ __symbolic: 'reference', name: enumName }, node), name
                                    }
                                };
                            }
                            else {
                                nextDefaultValue =
                                    recordEntry(errorSym('Unsupported enum member name', member.name), node);
                            }
                        }
                        if (writtenMembers) {
                            if (enumName) {
                                if (!metadata)
                                    metadata = {};
                                metadata[enumName] = recordEntry(enumValueHolder, node);
                            }
                        }
                    }
                    break;
                case ts.SyntaxKind.VariableStatement:
                    const variableStatement = node;
                    for (const variableDeclaration of variableStatement.declarationList.declarations) {
                        if (variableDeclaration.name.kind == ts.SyntaxKind.Identifier) {
                            const nameNode = variableDeclaration.name;
                            let varValue;
                            if (variableDeclaration.initializer) {
                                varValue = evaluator.evaluateNode(variableDeclaration.initializer);
                            }
                            else {
                                varValue = recordEntry(errorSym('Variable not initialized', nameNode), nameNode);
                            }
                            let exported = false;
                            if (isExport(variableStatement) || isExport(variableDeclaration) ||
                                isExportedIdentifier(nameNode)) {
                                const name = exportedIdentifierName(nameNode);
                                if (name) {
                                    if (!metadata)
                                        metadata = {};
                                    metadata[name] = recordEntry(varValue, node);
                                }
                                exported = true;
                            }
                            if (typeof varValue == 'string' || typeof varValue == 'number' ||
                                typeof varValue == 'boolean') {
                                locals.define(nameNode.text, varValue);
                                if (exported) {
                                    locals.defineReference(nameNode.text, { __symbolic: 'reference', name: nameNode.text });
                                }
                            }
                            else if (!exported) {
                                if (varValue && !schema_1.isMetadataError(varValue)) {
                                    locals.define(nameNode.text, recordEntry(varValue, node));
                                }
                                else {
                                    locals.define(nameNode.text, recordEntry(errorSym('Reference to a local symbol', nameNode, { name: nameNode.text }), node));
                                }
                            }
                        }
                        else {
                            // Destructuring (or binding) declarations are not supported,
                            // var {<identifier>[, <identifier>]+} = <expression>;
                            //   or
                            // var [<identifier>[, <identifier}+] = <expression>;
                            // are not supported.
                            const report = (nameNode) => {
                                switch (nameNode.kind) {
                                    case ts.SyntaxKind.Identifier:
                                        const name = nameNode;
                                        const varValue = errorSym('Destructuring not supported', name);
                                        locals.define(name.text, varValue);
                                        if (isExport(node)) {
                                            if (!metadata)
                                                metadata = {};
                                            metadata[name.text] = varValue;
                                        }
                                        break;
                                    case ts.SyntaxKind.BindingElement:
                                        const bindingElement = nameNode;
                                        report(bindingElement.name);
                                        break;
                                    case ts.SyntaxKind.ObjectBindingPattern:
                                    case ts.SyntaxKind.ArrayBindingPattern:
                                        const bindings = nameNode;
                                        bindings.elements.forEach(report);
                                        break;
                                }
                            };
                            report(variableDeclaration.name);
                        }
                    }
                    break;
            }
        });
        if (metadata || exports) {
            if (!metadata)
                metadata = {};
            else if (strict) {
                validateMetadata(sourceFile, nodeMap, metadata);
            }
            const result = {
                __symbolic: 'module',
                version: this.options.version || schema_1.METADATA_VERSION, metadata
            };
            if (sourceFile.moduleName)
                result.importAs = sourceFile.moduleName;
            if (exports)
                result.exports = exports;
            return result;
        }
    }
}
exports.MetadataCollector = MetadataCollector;
// This will throw if the metadata entry given contains an error node.
function validateMetadata(sourceFile, nodeMap, metadata) {
    let locals = new Set(['Array', 'Object', 'Set', 'Map', 'string', 'number', 'any']);
    function validateExpression(expression) {
        if (!expression) {
            return;
        }
        else if (Array.isArray(expression)) {
            expression.forEach(validateExpression);
        }
        else if (typeof expression === 'object' && !expression.hasOwnProperty('__symbolic')) {
            Object.getOwnPropertyNames(expression).forEach(v => validateExpression(expression[v]));
        }
        else if (schema_1.isMetadataError(expression)) {
            reportError(expression);
        }
        else if (schema_1.isMetadataGlobalReferenceExpression(expression)) {
            if (!locals.has(expression.name)) {
                const reference = metadata[expression.name];
                if (reference) {
                    validateExpression(reference);
                }
            }
        }
        else if (schema_1.isFunctionMetadata(expression)) {
            validateFunction(expression);
        }
        else if (schema_1.isMetadataSymbolicExpression(expression)) {
            switch (expression.__symbolic) {
                case 'binary':
                    const binaryExpression = expression;
                    validateExpression(binaryExpression.left);
                    validateExpression(binaryExpression.right);
                    break;
                case 'call':
                case 'new':
                    const callExpression = expression;
                    validateExpression(callExpression.expression);
                    if (callExpression.arguments)
                        callExpression.arguments.forEach(validateExpression);
                    break;
                case 'index':
                    const indexExpression = expression;
                    validateExpression(indexExpression.expression);
                    validateExpression(indexExpression.index);
                    break;
                case 'pre':
                    const prefixExpression = expression;
                    validateExpression(prefixExpression.operand);
                    break;
                case 'select':
                    const selectExpression = expression;
                    validateExpression(selectExpression.expression);
                    break;
                case 'spread':
                    const spreadExpression = expression;
                    validateExpression(spreadExpression.expression);
                    break;
                case 'if':
                    const ifExpression = expression;
                    validateExpression(ifExpression.condition);
                    validateExpression(ifExpression.elseExpression);
                    validateExpression(ifExpression.thenExpression);
                    break;
            }
        }
    }
    function validateMember(classData, member) {
        if (member.decorators) {
            member.decorators.forEach(validateExpression);
        }
        if (schema_1.isMethodMetadata(member) && member.parameterDecorators) {
            member.parameterDecorators.forEach(validateExpression);
        }
        // Only validate parameters of classes for which we know that are used with our DI
        if (classData.decorators && schema_1.isConstructorMetadata(member) && member.parameters) {
            member.parameters.forEach(validateExpression);
        }
    }
    function validateClass(classData) {
        if (classData.decorators) {
            classData.decorators.forEach(validateExpression);
        }
        if (classData.members) {
            Object.getOwnPropertyNames(classData.members)
                .forEach(name => classData.members[name].forEach((m) => validateMember(classData, m)));
        }
        if (classData.statics) {
            Object.getOwnPropertyNames(classData.statics).forEach(name => {
                const staticMember = classData.statics[name];
                if (schema_1.isFunctionMetadata(staticMember)) {
                    validateExpression(staticMember.value);
                }
                else {
                    validateExpression(staticMember);
                }
            });
        }
    }
    function validateFunction(functionDeclaration) {
        if (functionDeclaration.value) {
            const oldLocals = locals;
            if (functionDeclaration.parameters) {
                locals = new Set(oldLocals.values());
                if (functionDeclaration.parameters)
                    functionDeclaration.parameters.forEach(n => locals.add(n));
            }
            validateExpression(functionDeclaration.value);
            locals = oldLocals;
        }
    }
    function shouldReportNode(node) {
        if (node) {
            const nodeStart = node.getStart();
            return !(node.pos != nodeStart &&
                sourceFile.text.substring(node.pos, nodeStart).indexOf('@dynamic') >= 0);
        }
        return true;
    }
    function reportError(error) {
        const node = nodeMap.get(error);
        if (shouldReportNode(node)) {
            const lineInfo = error.line != undefined ?
                error.character != undefined ? `:${error.line + 1}:${error.character + 1}` :
                    `:${error.line + 1}` :
                '';
            throw new Error(`${sourceFile.fileName}${lineInfo}: Metadata collected contains an error that will be reported at runtime: ${expandedMessage(error)}.\n  ${JSON.stringify(error)}`);
        }
    }
    Object.getOwnPropertyNames(metadata).forEach(name => {
        const entry = metadata[name];
        try {
            if (schema_1.isClassMetadata(entry)) {
                validateClass(entry);
            }
        }
        catch (e) {
            const node = nodeMap.get(entry);
            if (shouldReportNode(node)) {
                if (node) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    throw new Error(`${sourceFile.fileName}:${line + 1}:${character + 1}: Error encountered in metadata generated for exported symbol '${name}': \n ${e.message}`);
                }
                throw new Error(`Error encountered in metadata generated for exported symbol ${name}: \n ${e.message}`);
            }
        }
    });
}
// Collect parameter names from a function.
function namesOf(parameters) {
    const result = [];
    function addNamesOf(name) {
        if (name.kind == ts.SyntaxKind.Identifier) {
            const identifier = name;
            result.push(identifier.text);
        }
        else {
            const bindingPattern = name;
            for (const element of bindingPattern.elements) {
                const name = element.name;
                if (name) {
                    addNamesOf(name);
                }
            }
        }
    }
    for (const parameter of parameters) {
        addNamesOf(parameter.name);
    }
    return result;
}
function expandedMessage(error) {
    switch (error.message) {
        case 'Reference to non-exported class':
            if (error.context && error.context.className) {
                return `Reference to a non-exported class ${error.context.className}. Consider exporting the class`;
            }
            break;
        case 'Variable not initialized':
            return 'Only initialized variables and constants can be referenced because the value of this variable is needed by the template compiler';
        case 'Destructuring not supported':
            return 'Referencing an exported destructured variable or constant is not supported by the template compiler. Consider simplifying this to avoid destructuring';
        case 'Could not resolve type':
            if (error.context && error.context.typeName) {
                return `Could not resolve type ${error.context.typeName}`;
            }
            break;
        case 'Function call not supported':
            let prefix = error.context && error.context.name ? `Calling function '${error.context.name}', f` : 'F';
            return prefix +
                'unction calls are not supported. Consider replacing the function or lambda with a reference to an exported function';
        case 'Reference to a local symbol':
            if (error.context && error.context.name) {
                return `Reference to a local (non-exported) symbol '${error.context.name}'. Consider exporting the symbol`;
            }
    }
    return error.message;
}
//# sourceMappingURL=collector.js.map