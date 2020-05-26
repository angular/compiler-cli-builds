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
        define("@angular/compiler-cli/src/metadata/collector", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/metadata/evaluator", "@angular/compiler-cli/src/metadata/schema", "@angular/compiler-cli/src/metadata/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MetadataCollector = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var evaluator_1 = require("@angular/compiler-cli/src/metadata/evaluator");
    var schema_1 = require("@angular/compiler-cli/src/metadata/schema");
    var symbols_1 = require("@angular/compiler-cli/src/metadata/symbols");
    var isStatic = function (node) {
        return ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static;
    };
    /**
     * Collect decorator metadata from a TypeScript module.
     */
    var MetadataCollector = /** @class */ (function () {
        function MetadataCollector(options) {
            if (options === void 0) { options = {}; }
            this.options = options;
        }
        /**
         * Returns a JSON.stringify friendly form describing the decorators of the exported classes from
         * the source file that is expected to correspond to a module.
         */
        MetadataCollector.prototype.getMetadata = function (sourceFile, strict, substituteExpression) {
            var _this = this;
            if (strict === void 0) { strict = false; }
            var locals = new symbols_1.Symbols(sourceFile);
            var nodeMap = new Map();
            var composedSubstituter = substituteExpression && this.options.substituteExpression ?
                function (value, node) {
                    return _this.options.substituteExpression(substituteExpression(value, node), node);
                } :
                substituteExpression;
            var evaluatorOptions = substituteExpression ? tslib_1.__assign(tslib_1.__assign({}, this.options), { substituteExpression: composedSubstituter }) :
                this.options;
            var metadata;
            var evaluator = new evaluator_1.Evaluator(locals, nodeMap, evaluatorOptions, function (name, value) {
                if (!metadata)
                    metadata = {};
                metadata[name] = value;
            });
            var exports = undefined;
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
                    var nameNode = functionDeclaration.name;
                    var functionName = nameNode.text;
                    var functionBody = functionDeclaration.body;
                    if (functionBody && functionBody.statements.length == 1) {
                        var statement = functionBody.statements[0];
                        if (statement.kind === ts.SyntaxKind.ReturnStatement) {
                            var returnStatement = statement;
                            if (returnStatement.expression) {
                                var func = {
                                    __symbolic: 'function',
                                    parameters: namesOf(functionDeclaration.parameters),
                                    value: evaluator.evaluateNode(returnStatement.expression)
                                };
                                if (functionDeclaration.parameters.some(function (p) { return p.initializer != null; })) {
                                    func.defaults = functionDeclaration.parameters.map(function (p) { return p.initializer && evaluator.evaluateNode(p.initializer); });
                                }
                                return recordEntry({ func: func, name: functionName }, functionDeclaration);
                            }
                        }
                    }
                }
            }
            function classMetadataOf(classDeclaration) {
                var e_1, _a, e_2, _b;
                var result = { __symbolic: 'class' };
                function getDecorators(decorators) {
                    if (decorators && decorators.length)
                        return decorators.map(function (decorator) { return objFromDecorator(decorator); });
                    return undefined;
                }
                function referenceFrom(node) {
                    var result = evaluator.evaluateNode(node);
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
                    classDeclaration.heritageClauses.forEach(function (hc) {
                        if (hc.token === ts.SyntaxKind.ExtendsKeyword && hc.types) {
                            hc.types.forEach(function (type) { return result.extends = referenceFrom(type.expression); });
                        }
                    });
                }
                // Add arity if the type is generic
                var typeParameters = classDeclaration.typeParameters;
                if (typeParameters && typeParameters.length) {
                    result.arity = typeParameters.length;
                }
                // Add class decorators
                if (classDeclaration.decorators) {
                    result.decorators = getDecorators(classDeclaration.decorators);
                }
                // member decorators
                var members = null;
                function recordMember(name, metadata) {
                    if (!members)
                        members = {};
                    var data = members.hasOwnProperty(name) ? members[name] : [];
                    data.push(metadata);
                    members[name] = data;
                }
                // static member
                var statics = null;
                function recordStaticMember(name, value) {
                    if (!statics)
                        statics = {};
                    statics[name] = value;
                }
                try {
                    for (var _c = tslib_1.__values(classDeclaration.members), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var member = _d.value;
                        var isConstructor = false;
                        switch (member.kind) {
                            case ts.SyntaxKind.Constructor:
                            case ts.SyntaxKind.MethodDeclaration:
                                isConstructor = member.kind === ts.SyntaxKind.Constructor;
                                var method = member;
                                if (isStatic(method)) {
                                    var maybeFunc = maybeGetSimpleFunction(method);
                                    if (maybeFunc) {
                                        recordStaticMember(maybeFunc.name, maybeFunc.func);
                                    }
                                    continue;
                                }
                                var methodDecorators = getDecorators(method.decorators);
                                var parameters = method.parameters;
                                var parameterDecoratorData = [];
                                var parametersData = [];
                                var hasDecoratorData = false;
                                var hasParameterData = false;
                                try {
                                    for (var parameters_1 = (e_2 = void 0, tslib_1.__values(parameters)), parameters_1_1 = parameters_1.next(); !parameters_1_1.done; parameters_1_1 = parameters_1.next()) {
                                        var parameter = parameters_1_1.value;
                                        var parameterData = getDecorators(parameter.decorators);
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
                                }
                                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                finally {
                                    try {
                                        if (parameters_1_1 && !parameters_1_1.done && (_b = parameters_1.return)) _b.call(parameters_1);
                                    }
                                    finally { if (e_2) throw e_2.error; }
                                }
                                var data = { __symbolic: isConstructor ? 'constructor' : 'method' };
                                var name = isConstructor ? '__ctor__' : evaluator.nameOf(member.name);
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
                                var property = member;
                                if (isStatic(property)) {
                                    var name_1 = evaluator.nameOf(property.name);
                                    if (!schema_1.isMetadataError(name_1) && !shouldIgnoreStaticMember(name_1)) {
                                        if (property.initializer) {
                                            var value = evaluator.evaluateNode(property.initializer);
                                            recordStaticMember(name_1, value);
                                        }
                                        else {
                                            recordStaticMember(name_1, errorSym('Variable not initialized', property.name));
                                        }
                                    }
                                }
                                var propertyDecorators = getDecorators(property.decorators);
                                if (propertyDecorators) {
                                    var name_2 = evaluator.nameOf(property.name);
                                    if (!schema_1.isMetadataError(name_2)) {
                                        recordMember(name_2, { __symbolic: 'property', decorators: propertyDecorators });
                                    }
                                }
                                break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
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
            var exportMap = new Map();
            ts.forEachChild(sourceFile, function (node) {
                switch (node.kind) {
                    case ts.SyntaxKind.ExportDeclaration:
                        var exportDeclaration = node;
                        var moduleSpecifier = exportDeclaration.moduleSpecifier, exportClause = exportDeclaration.exportClause;
                        if (!moduleSpecifier && exportClause && ts.isNamedExports(exportClause)) {
                            // If there is a module specifier there is also an exportClause
                            exportClause.elements.forEach(function (spec) {
                                var exportedAs = spec.name.text;
                                var name = (spec.propertyName || spec.name).text;
                                exportMap.set(name, exportedAs);
                            });
                        }
                }
            });
            var isExport = function (node) { return sourceFile.isDeclarationFile ||
                ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export; };
            var isExportedIdentifier = function (identifier) {
                return identifier && exportMap.has(identifier.text);
            };
            var isExported = function (node) {
                return isExport(node) || isExportedIdentifier(node.name);
            };
            var exportedIdentifierName = function (identifier) {
                return identifier && (exportMap.get(identifier.text) || identifier.text);
            };
            var exportedName = function (node) {
                return exportedIdentifierName(node.name);
            };
            // Pre-declare classes and functions
            ts.forEachChild(sourceFile, function (node) {
                switch (node.kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                        var classDeclaration = node;
                        if (classDeclaration.name) {
                            var className = classDeclaration.name.text;
                            if (isExported(classDeclaration)) {
                                locals.define(className, { __symbolic: 'reference', name: exportedName(classDeclaration) });
                            }
                            else {
                                locals.define(className, errorSym('Reference to non-exported class', node, { className: className }));
                            }
                        }
                        break;
                    case ts.SyntaxKind.InterfaceDeclaration:
                        var interfaceDeclaration = node;
                        if (interfaceDeclaration.name) {
                            var interfaceName = interfaceDeclaration.name.text;
                            // All references to interfaces should be converted to references to `any`.
                            locals.define(interfaceName, { __symbolic: 'reference', name: 'any' });
                        }
                        break;
                    case ts.SyntaxKind.FunctionDeclaration:
                        var functionDeclaration = node;
                        if (!isExported(functionDeclaration)) {
                            // Report references to this function as an error.
                            var nameNode = functionDeclaration.name;
                            if (nameNode && nameNode.text) {
                                locals.define(nameNode.text, errorSym('Reference to a non-exported function', nameNode, { name: nameNode.text }));
                            }
                        }
                        break;
                }
            });
            ts.forEachChild(sourceFile, function (node) {
                var e_3, _a, e_4, _b;
                switch (node.kind) {
                    case ts.SyntaxKind.ExportDeclaration:
                        // Record export declarations
                        var exportDeclaration = node;
                        var moduleSpecifier = exportDeclaration.moduleSpecifier, exportClause = exportDeclaration.exportClause;
                        if (!moduleSpecifier) {
                            // no module specifier -> export {propName as name};
                            if (exportClause && ts.isNamedExports(exportClause)) {
                                exportClause.elements.forEach(function (spec) {
                                    var name = spec.name.text;
                                    // If the symbol was not already exported, export a reference since it is a
                                    // reference to an import
                                    if (!metadata || !metadata[name]) {
                                        var propNode = spec.propertyName || spec.name;
                                        var value = evaluator.evaluateNode(propNode);
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
                            var from = moduleSpecifier.text;
                            var moduleExport = { from: from };
                            if (exportClause && ts.isNamedExports(exportClause)) {
                                moduleExport.export = exportClause.elements.map(function (spec) { return spec.propertyName ? { name: spec.propertyName.text, as: spec.name.text } :
                                    spec.name.text; });
                            }
                            if (!exports)
                                exports = [];
                            exports.push(moduleExport);
                        }
                        break;
                    case ts.SyntaxKind.ClassDeclaration:
                        var classDeclaration = node;
                        if (classDeclaration.name) {
                            if (isExported(classDeclaration)) {
                                var name = exportedName(classDeclaration);
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
                        var typeDeclaration = node;
                        if (typeDeclaration.name && isExported(typeDeclaration)) {
                            var name = exportedName(typeDeclaration);
                            if (name) {
                                if (!metadata)
                                    metadata = {};
                                metadata[name] = { __symbolic: 'interface' };
                            }
                        }
                        break;
                    case ts.SyntaxKind.InterfaceDeclaration:
                        var interfaceDeclaration = node;
                        if (interfaceDeclaration.name && isExported(interfaceDeclaration)) {
                            var name = exportedName(interfaceDeclaration);
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
                        var functionDeclaration = node;
                        if (isExported(functionDeclaration) && functionDeclaration.name) {
                            var name = exportedName(functionDeclaration);
                            var maybeFunc = maybeGetSimpleFunction(functionDeclaration);
                            if (name) {
                                if (!metadata)
                                    metadata = {};
                                // TODO(alxhub): The literal here is not valid FunctionMetadata.
                                metadata[name] =
                                    maybeFunc ? recordEntry(maybeFunc.func, node) : { __symbolic: 'function' };
                            }
                        }
                        break;
                    case ts.SyntaxKind.EnumDeclaration:
                        var enumDeclaration = node;
                        if (isExported(enumDeclaration)) {
                            var enumValueHolder = {};
                            var enumName = exportedName(enumDeclaration);
                            var nextDefaultValue = 0;
                            var writtenMembers = 0;
                            try {
                                for (var _c = tslib_1.__values(enumDeclaration.members), _d = _c.next(); !_d.done; _d = _c.next()) {
                                    var member = _d.value;
                                    var enumValue = void 0;
                                    if (!member.initializer) {
                                        enumValue = nextDefaultValue;
                                    }
                                    else {
                                        enumValue = evaluator.evaluateNode(member.initializer);
                                    }
                                    var name = undefined;
                                    if (member.name.kind == ts.SyntaxKind.Identifier) {
                                        var identifier = member.name;
                                        name = identifier.text;
                                        enumValueHolder[name] = enumValue;
                                        writtenMembers++;
                                    }
                                    if (typeof enumValue === 'number') {
                                        nextDefaultValue = enumValue + 1;
                                    }
                                    else if (name) {
                                        // TODO(alxhub): 'left' here has a name propery which is not valid for
                                        // MetadataSymbolicSelectExpression.
                                        nextDefaultValue = {
                                            __symbolic: 'binary',
                                            operator: '+',
                                            left: {
                                                __symbolic: 'select',
                                                expression: recordEntry({ __symbolic: 'reference', name: enumName }, node),
                                                name: name
                                            },
                                        };
                                    }
                                    else {
                                        nextDefaultValue =
                                            recordEntry(errorSym('Unsupported enum member name', member.name), node);
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                                }
                                finally { if (e_3) throw e_3.error; }
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
                        var variableStatement = node;
                        var _loop_1 = function (variableDeclaration) {
                            if (variableDeclaration.name.kind == ts.SyntaxKind.Identifier) {
                                var nameNode = variableDeclaration.name;
                                var varValue = void 0;
                                if (variableDeclaration.initializer) {
                                    varValue = evaluator.evaluateNode(variableDeclaration.initializer);
                                }
                                else {
                                    varValue = recordEntry(errorSym('Variable not initialized', nameNode), nameNode);
                                }
                                var exported = false;
                                if (isExport(variableStatement) || isExport(variableDeclaration) ||
                                    isExportedIdentifier(nameNode)) {
                                    var name = exportedIdentifierName(nameNode);
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
                                var report_1 = function (nameNode) {
                                    switch (nameNode.kind) {
                                        case ts.SyntaxKind.Identifier:
                                            var name = nameNode;
                                            var varValue = errorSym('Destructuring not supported', name);
                                            locals.define(name.text, varValue);
                                            if (isExport(node)) {
                                                if (!metadata)
                                                    metadata = {};
                                                metadata[name.text] = varValue;
                                            }
                                            break;
                                        case ts.SyntaxKind.BindingElement:
                                            var bindingElement = nameNode;
                                            report_1(bindingElement.name);
                                            break;
                                        case ts.SyntaxKind.ObjectBindingPattern:
                                        case ts.SyntaxKind.ArrayBindingPattern:
                                            var bindings = nameNode;
                                            bindings.elements.forEach(report_1);
                                            break;
                                    }
                                };
                                report_1(variableDeclaration.name);
                            }
                        };
                        try {
                            for (var _e = tslib_1.__values(variableStatement.declarationList.declarations), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var variableDeclaration = _f.value;
                                _loop_1(variableDeclaration);
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_4) throw e_4.error; }
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
                var result = {
                    __symbolic: 'module',
                    version: this.options.version || schema_1.METADATA_VERSION,
                    metadata: metadata
                };
                if (sourceFile.moduleName)
                    result.importAs = sourceFile.moduleName;
                if (exports)
                    result.exports = exports;
                return result;
            }
        };
        return MetadataCollector;
    }());
    exports.MetadataCollector = MetadataCollector;
    // This will throw if the metadata entry given contains an error node.
    function validateMetadata(sourceFile, nodeMap, metadata) {
        var locals = new Set(['Array', 'Object', 'Set', 'Map', 'string', 'number', 'any']);
        function validateExpression(expression) {
            if (!expression) {
                return;
            }
            else if (Array.isArray(expression)) {
                expression.forEach(validateExpression);
            }
            else if (typeof expression === 'object' && !expression.hasOwnProperty('__symbolic')) {
                Object.getOwnPropertyNames(expression).forEach(function (v) { return validateExpression(expression[v]); });
            }
            else if (schema_1.isMetadataError(expression)) {
                reportError(expression);
            }
            else if (schema_1.isMetadataGlobalReferenceExpression(expression)) {
                if (!locals.has(expression.name)) {
                    var reference = metadata[expression.name];
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
                        var binaryExpression = expression;
                        validateExpression(binaryExpression.left);
                        validateExpression(binaryExpression.right);
                        break;
                    case 'call':
                    case 'new':
                        var callExpression = expression;
                        validateExpression(callExpression.expression);
                        if (callExpression.arguments)
                            callExpression.arguments.forEach(validateExpression);
                        break;
                    case 'index':
                        var indexExpression = expression;
                        validateExpression(indexExpression.expression);
                        validateExpression(indexExpression.index);
                        break;
                    case 'pre':
                        var prefixExpression = expression;
                        validateExpression(prefixExpression.operand);
                        break;
                    case 'select':
                        var selectExpression = expression;
                        validateExpression(selectExpression.expression);
                        break;
                    case 'spread':
                        var spreadExpression = expression;
                        validateExpression(spreadExpression.expression);
                        break;
                    case 'if':
                        var ifExpression = expression;
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
                    .forEach(function (name) { return classData.members[name].forEach(function (m) { return validateMember(classData, m); }); });
            }
            if (classData.statics) {
                Object.getOwnPropertyNames(classData.statics).forEach(function (name) {
                    var staticMember = classData.statics[name];
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
                var oldLocals = locals;
                if (functionDeclaration.parameters) {
                    locals = new Set(oldLocals.values());
                    if (functionDeclaration.parameters)
                        functionDeclaration.parameters.forEach(function (n) { return locals.add(n); });
                }
                validateExpression(functionDeclaration.value);
                locals = oldLocals;
            }
        }
        function shouldReportNode(node) {
            if (node) {
                var nodeStart = node.getStart();
                return !(node.pos != nodeStart &&
                    sourceFile.text.substring(node.pos, nodeStart).indexOf('@dynamic') >= 0);
            }
            return true;
        }
        function reportError(error) {
            var node = nodeMap.get(error);
            if (shouldReportNode(node)) {
                var lineInfo = error.line != undefined ? error.character != undefined ?
                    ":" + (error.line + 1) + ":" + (error.character + 1) :
                    ":" + (error.line + 1) :
                    '';
                throw new Error("" + sourceFile.fileName + lineInfo + ": Metadata collected contains an error that will be reported at runtime: " + expandedMessage(error) + ".\n  " + JSON.stringify(error));
            }
        }
        Object.getOwnPropertyNames(metadata).forEach(function (name) {
            var entry = metadata[name];
            try {
                if (schema_1.isClassMetadata(entry)) {
                    validateClass(entry);
                }
            }
            catch (e) {
                var node = nodeMap.get(entry);
                if (shouldReportNode(node)) {
                    if (node) {
                        var _a = sourceFile.getLineAndCharacterOfPosition(node.getStart()), line = _a.line, character = _a.character;
                        throw new Error(sourceFile.fileName + ":" + (line + 1) + ":" + (character + 1) + ": Error encountered in metadata generated for exported symbol '" + name + "': \n " + e.message);
                    }
                    throw new Error("Error encountered in metadata generated for exported symbol " + name + ": \n " + e.message);
                }
            }
        });
    }
    // Collect parameter names from a function.
    function namesOf(parameters) {
        var e_5, _a;
        var result = [];
        function addNamesOf(name) {
            var e_6, _a;
            if (name.kind == ts.SyntaxKind.Identifier) {
                var identifier = name;
                result.push(identifier.text);
            }
            else {
                var bindingPattern = name;
                try {
                    for (var _b = tslib_1.__values(bindingPattern.elements), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var element = _c.value;
                        var name_3 = element.name;
                        if (name_3) {
                            addNamesOf(name_3);
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
        try {
            for (var parameters_2 = tslib_1.__values(parameters), parameters_2_1 = parameters_2.next(); !parameters_2_1.done; parameters_2_1 = parameters_2.next()) {
                var parameter = parameters_2_1.value;
                addNamesOf(parameter.name);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (parameters_2_1 && !parameters_2_1.done && (_a = parameters_2.return)) _a.call(parameters_2);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return result;
    }
    function shouldIgnoreStaticMember(memberName) {
        return memberName.startsWith('ngAcceptInputType_') || memberName.startsWith('ngTemplateGuard_');
    }
    function expandedMessage(error) {
        switch (error.message) {
            case 'Reference to non-exported class':
                if (error.context && error.context.className) {
                    return "Reference to a non-exported class " + error.context.className + ". Consider exporting the class";
                }
                break;
            case 'Variable not initialized':
                return 'Only initialized variables and constants can be referenced because the value of this variable is needed by the template compiler';
            case 'Destructuring not supported':
                return 'Referencing an exported destructured variable or constant is not supported by the template compiler. Consider simplifying this to avoid destructuring';
            case 'Could not resolve type':
                if (error.context && error.context.typeName) {
                    return "Could not resolve type " + error.context.typeName;
                }
                break;
            case 'Function call not supported':
                var prefix = error.context && error.context.name ? "Calling function '" + error.context.name + "', f" : 'F';
                return prefix +
                    'unction calls are not supported. Consider replacing the function or lambda with a reference to an exported function';
            case 'Reference to a local symbol':
                if (error.context && error.context.name) {
                    return "Reference to a local (non-exported) symbol '" + error.context.name + "'. Consider exporting the symbol";
                }
        }
        return error.message;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9tZXRhZGF0YS9jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywwRUFBbUU7SUFDbkUsb0VBQXUxQjtJQUN2MUIsc0VBQWtDO0lBRWxDLElBQU0sUUFBUSxHQUFHLFVBQUMsSUFBb0I7UUFDbEMsT0FBQSxFQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNO0lBQTNELENBQTJELENBQUM7SUE0QmhFOztPQUVHO0lBQ0g7UUFDRSwyQkFBb0IsT0FBOEI7WUFBOUIsd0JBQUEsRUFBQSxZQUE4QjtZQUE5QixZQUFPLEdBQVAsT0FBTyxDQUF1QjtRQUFHLENBQUM7UUFFdEQ7OztXQUdHO1FBQ0ksdUNBQVcsR0FBbEIsVUFDSSxVQUF5QixFQUFFLE1BQXVCLEVBQ2xELG9CQUE2RTtZQUZqRixpQkE4ZkM7WUE3ZjhCLHVCQUFBLEVBQUEsY0FBdUI7WUFHcEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxpQkFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZDLElBQU0sT0FBTyxHQUNULElBQUksR0FBRyxFQUEyRSxDQUFDO1lBQ3ZGLElBQU0sbUJBQW1CLEdBQUcsb0JBQW9CLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNuRixVQUFDLEtBQW9CLEVBQUUsSUFBYTtvQkFDaEMsT0FBQSxLQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFxQixDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUM7Z0JBQTNFLENBQTJFLENBQUMsQ0FBQztnQkFDakYsb0JBQW9CLENBQUM7WUFDekIsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLHVDQUN2QyxJQUFJLENBQUMsT0FBTyxLQUFFLG9CQUFvQixFQUFFLG1CQUFtQixJQUFFLENBQUM7Z0JBQzlELElBQUksQ0FBQyxPQUFPLENBQUM7WUFDakIsSUFBSSxRQUFrRixDQUFDO1lBQ3ZGLElBQU0sU0FBUyxHQUFHLElBQUkscUJBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFVBQUMsSUFBSSxFQUFFLEtBQUs7Z0JBQzdFLElBQUksQ0FBQyxRQUFRO29CQUFFLFFBQVEsR0FBRyxFQUFFLENBQUM7Z0JBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDekIsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLE9BQU8sR0FBcUMsU0FBUyxDQUFDO1lBRTFELFNBQVMsZ0JBQWdCLENBQUMsYUFBMkI7Z0JBQ25ELE9BQW1DLFNBQVMsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RGLENBQUM7WUFFRCxTQUFTLFdBQVcsQ0FBMEIsS0FBUSxFQUFFLElBQWE7Z0JBQ25FLElBQUksbUJBQW1CLEVBQUU7b0JBQ3ZCLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxLQUFzQixFQUFFLElBQUksQ0FBTSxDQUFDO2lCQUNoRTtnQkFDRCxPQUFPLDBCQUFjLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDMUQsQ0FBQztZQUVELFNBQVMsUUFBUSxDQUNiLE9BQWUsRUFBRSxJQUFjLEVBQUUsT0FBa0M7Z0JBQ3JFLE9BQU8sdUJBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN6RCxDQUFDO1lBRUQsU0FBUyxzQkFBc0IsQ0FBQyxtQkFDb0I7Z0JBRWxELElBQUksbUJBQW1CLENBQUMsSUFBSSxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUU7b0JBQ3pGLElBQU0sUUFBUSxHQUFrQixtQkFBbUIsQ0FBQyxJQUFJLENBQUM7b0JBQ3pELElBQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQ25DLElBQU0sWUFBWSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQztvQkFDOUMsSUFBSSxZQUFZLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO3dCQUN2RCxJQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM3QyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7NEJBQ3BELElBQU0sZUFBZSxHQUF1QixTQUFTLENBQUM7NEJBQ3RELElBQUksZUFBZSxDQUFDLFVBQVUsRUFBRTtnQ0FDOUIsSUFBTSxJQUFJLEdBQXFCO29DQUM3QixVQUFVLEVBQUUsVUFBVTtvQ0FDdEIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUM7b0NBQ25ELEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUM7aUNBQzFELENBQUM7Z0NBQ0YsSUFBSSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQXJCLENBQXFCLENBQUMsRUFBRTtvQ0FDbkUsSUFBSSxDQUFDLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUM5QyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQXRELENBQXNELENBQUMsQ0FBQztpQ0FDbEU7Z0NBQ0QsT0FBTyxXQUFXLENBQUMsRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQzs2QkFDckU7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7WUFDSCxDQUFDO1lBRUQsU0FBUyxlQUFlLENBQUMsZ0JBQXFDOztnQkFDNUQsSUFBTSxNQUFNLEdBQWtCLEVBQUMsVUFBVSxFQUFFLE9BQU8sRUFBQyxDQUFDO2dCQUVwRCxTQUFTLGFBQWEsQ0FBQyxVQUNTO29CQUM5QixJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTTt3QkFDakMsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQTNCLENBQTJCLENBQUMsQ0FBQztvQkFDbEUsT0FBTyxTQUFTLENBQUM7Z0JBQ25CLENBQUM7Z0JBRUQsU0FBUyxhQUFhLENBQUMsSUFBYTtvQkFFbEMsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDNUMsSUFBSSx3QkFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLDhDQUFxQyxDQUFDLE1BQU0sQ0FBQzt3QkFDeEUsMkNBQWtDLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQzlDLE9BQU8sTUFBTSxDQUFDO3FCQUNmO3lCQUFNO3dCQUNMLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUNwRDtnQkFDSCxDQUFDO2dCQUVELG9CQUFvQjtnQkFDcEIsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUU7b0JBQ3BDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUFFO3dCQUMxQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRTs0QkFDekQsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxNQUFNLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQS9DLENBQStDLENBQUMsQ0FBQzt5QkFDM0U7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7Z0JBRUQsbUNBQW1DO2dCQUNuQyxJQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUM7Z0JBQ3ZELElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUU7b0JBQzNDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztpQkFDdEM7Z0JBRUQsdUJBQXVCO2dCQUN2QixJQUFJLGdCQUFnQixDQUFDLFVBQVUsRUFBRTtvQkFDL0IsTUFBTSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ2hFO2dCQUVELG9CQUFvQjtnQkFDcEIsSUFBSSxPQUFPLEdBQXFCLElBQUksQ0FBQztnQkFDckMsU0FBUyxZQUFZLENBQUMsSUFBWSxFQUFFLFFBQXdCO29CQUMxRCxJQUFJLENBQUMsT0FBTzt3QkFBRSxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUMzQixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDdkIsQ0FBQztnQkFFRCxnQkFBZ0I7Z0JBQ2hCLElBQUksT0FBTyxHQUEwRCxJQUFJLENBQUM7Z0JBQzFFLFNBQVMsa0JBQWtCLENBQUMsSUFBWSxFQUFFLEtBQXFDO29CQUM3RSxJQUFJLENBQUMsT0FBTzt3QkFBRSxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixDQUFDOztvQkFFRCxLQUFxQixJQUFBLEtBQUEsaUJBQUEsZ0JBQWdCLENBQUMsT0FBTyxDQUFBLGdCQUFBLDRCQUFFO3dCQUExQyxJQUFNLE1BQU0sV0FBQTt3QkFDZixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7d0JBQzFCLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRTs0QkFDbkIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQzs0QkFDL0IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQjtnQ0FDbEMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0NBQzFELElBQU0sTUFBTSxHQUFtRCxNQUFNLENBQUM7Z0NBQ3RFLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29DQUNwQixJQUFNLFNBQVMsR0FBRyxzQkFBc0IsQ0FBdUIsTUFBTSxDQUFDLENBQUM7b0NBQ3ZFLElBQUksU0FBUyxFQUFFO3dDQUNiLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO3FDQUNwRDtvQ0FDRCxTQUFTO2lDQUNWO2dDQUNELElBQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztnQ0FDMUQsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQztnQ0FDckMsSUFBTSxzQkFBc0IsR0FDa0IsRUFBRSxDQUFDO2dDQUNqRCxJQUFNLGNBQWMsR0FDOEMsRUFBRSxDQUFDO2dDQUNyRSxJQUFJLGdCQUFnQixHQUFZLEtBQUssQ0FBQztnQ0FDdEMsSUFBSSxnQkFBZ0IsR0FBWSxLQUFLLENBQUM7O29DQUN0QyxLQUF3QixJQUFBLDhCQUFBLGlCQUFBLFVBQVUsQ0FBQSxDQUFBLHNDQUFBLDhEQUFFO3dDQUEvQixJQUFNLFNBQVMsdUJBQUE7d0NBQ2xCLElBQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7d0NBQzFELHNCQUFzQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzt3Q0FDM0MsZ0JBQWdCLEdBQUcsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQzt3Q0FDdkQsSUFBSSxhQUFhLEVBQUU7NENBQ2pCLElBQUksU0FBUyxDQUFDLElBQUksRUFBRTtnREFDbEIsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NkNBQ3BEO2lEQUFNO2dEQUNMLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NkNBQzNCOzRDQUNELGdCQUFnQixHQUFHLElBQUksQ0FBQzt5Q0FDekI7cUNBQ0Y7Ozs7Ozs7OztnQ0FDRCxJQUFNLElBQUksR0FBbUIsRUFBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBQyxDQUFDO2dDQUNwRixJQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ3hFLElBQUksZ0JBQWdCLEVBQUU7b0NBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUM7aUNBQ3BDO2dDQUNELElBQUksZ0JBQWdCLEVBQUU7b0NBQ3BCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQztpQ0FDbkQ7Z0NBQ0QsSUFBSSxnQkFBZ0IsRUFBRTtvQ0FDRSxJQUFLLENBQUMsVUFBVSxHQUFHLGNBQWMsQ0FBQztpQ0FDekQ7Z0NBQ0QsSUFBSSxDQUFDLHdCQUFlLENBQUMsSUFBSSxDQUFDLEVBQUU7b0NBQzFCLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7aUNBQzFCO2dDQUNELE1BQU07NEJBQ1IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDOzRCQUN2QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDOzRCQUMvQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVztnQ0FDNUIsSUFBTSxRQUFRLEdBQTJCLE1BQU0sQ0FBQztnQ0FDaEQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7b0NBQ3RCLElBQU0sTUFBSSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29DQUM3QyxJQUFJLENBQUMsd0JBQWUsQ0FBQyxNQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQUksQ0FBQyxFQUFFO3dDQUM3RCxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUU7NENBQ3hCLElBQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzRDQUMzRCxrQkFBa0IsQ0FBQyxNQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7eUNBQ2pDOzZDQUFNOzRDQUNMLGtCQUFrQixDQUFDLE1BQUksRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7eUNBQy9FO3FDQUNGO2lDQUNGO2dDQUNELElBQU0sa0JBQWtCLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQ0FDOUQsSUFBSSxrQkFBa0IsRUFBRTtvQ0FDdEIsSUFBTSxNQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7b0NBQzdDLElBQUksQ0FBQyx3QkFBZSxDQUFDLE1BQUksQ0FBQyxFQUFFO3dDQUMxQixZQUFZLENBQUMsTUFBSSxFQUFFLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsQ0FBQyxDQUFDO3FDQUM5RTtpQ0FDRjtnQ0FDRCxNQUFNO3lCQUNUO3FCQUNGOzs7Ozs7Ozs7Z0JBQ0QsSUFBSSxPQUFPLEVBQUU7b0JBQ1gsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7aUJBQzFCO2dCQUNELElBQUksT0FBTyxFQUFFO29CQUNYLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO2lCQUMxQjtnQkFFRCxPQUFPLFdBQVcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBRUQsdURBQXVEO1lBQ3ZELElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQzVDLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFVBQUEsSUFBSTtnQkFDOUIsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUNqQixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCO3dCQUNsQyxJQUFNLGlCQUFpQixHQUF5QixJQUFJLENBQUM7d0JBQzlDLElBQUEsZUFBZSxHQUFrQixpQkFBaUIsZ0JBQW5DLEVBQUUsWUFBWSxHQUFJLGlCQUFpQixhQUFyQixDQUFzQjt3QkFFMUQsSUFBSSxDQUFDLGVBQWUsSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsRUFBRTs0QkFDdkUsK0RBQStEOzRCQUMvRCxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7Z0NBQ2hDLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dDQUNsQyxJQUFNLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztnQ0FDbkQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7NEJBQ2xDLENBQUMsQ0FBQyxDQUFDO3lCQUNKO2lCQUNKO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFNLFFBQVEsR0FBRyxVQUFDLElBQWEsSUFBSyxPQUFBLFVBQVUsQ0FBQyxpQkFBaUI7Z0JBQzVELEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBRDdDLENBQzZDLENBQUM7WUFDbEYsSUFBTSxvQkFBb0IsR0FBRyxVQUFDLFVBQTBCO2dCQUNwRCxPQUFBLFVBQVUsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFBNUMsQ0FBNEMsQ0FBQztZQUNqRCxJQUFNLFVBQVUsR0FBRyxVQUFDLElBQzBDO2dCQUMxRCxPQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQWpELENBQWlELENBQUM7WUFDdEQsSUFBTSxzQkFBc0IsR0FBRyxVQUFDLFVBQTBCO2dCQUN0RCxPQUFBLFVBQVUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFBakUsQ0FBaUUsQ0FBQztZQUN0RSxJQUFNLFlBQVksR0FBRyxVQUFDLElBQ2tFO2dCQUNwRixPQUFBLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFBakMsQ0FBaUMsQ0FBQztZQUd0QyxvQ0FBb0M7WUFDcEMsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsVUFBQSxJQUFJO2dCQUM5QixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7d0JBQ2pDLElBQU0sZ0JBQWdCLEdBQXdCLElBQUksQ0FBQzt3QkFDbkQsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUU7NEJBQ3pCLElBQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7NEJBQzdDLElBQUksVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7Z0NBQ2hDLE1BQU0sQ0FBQyxNQUFNLENBQ1QsU0FBUyxFQUFFLEVBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLGdCQUFnQixDQUFDLEVBQUMsQ0FBQyxDQUFDOzZCQUNqRjtpQ0FBTTtnQ0FDTCxNQUFNLENBQUMsTUFBTSxDQUNULFNBQVMsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxFQUFFLEVBQUMsU0FBUyxXQUFBLEVBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQ2hGO3lCQUNGO3dCQUNELE1BQU07b0JBRVIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQjt3QkFDckMsSUFBTSxvQkFBb0IsR0FBNEIsSUFBSSxDQUFDO3dCQUMzRCxJQUFJLG9CQUFvQixDQUFDLElBQUksRUFBRTs0QkFDN0IsSUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzs0QkFDckQsMkVBQTJFOzRCQUMzRSxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7eUJBQ3RFO3dCQUNELE1BQU07b0JBRVIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQjt3QkFDcEMsSUFBTSxtQkFBbUIsR0FBMkIsSUFBSSxDQUFDO3dCQUN6RCxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7NEJBQ3BDLGtEQUFrRDs0QkFDbEQsSUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDOzRCQUMxQyxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFO2dDQUM3QixNQUFNLENBQUMsTUFBTSxDQUNULFFBQVEsQ0FBQyxJQUFJLEVBQ2IsUUFBUSxDQUNKLHNDQUFzQyxFQUFFLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUNuRjt5QkFDRjt3QkFDRCxNQUFNO2lCQUNUO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxVQUFBLElBQUk7O2dCQUM5QixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUI7d0JBQ2xDLDZCQUE2Qjt3QkFDN0IsSUFBTSxpQkFBaUIsR0FBeUIsSUFBSSxDQUFDO3dCQUM5QyxJQUFBLGVBQWUsR0FBa0IsaUJBQWlCLGdCQUFuQyxFQUFFLFlBQVksR0FBSSxpQkFBaUIsYUFBckIsQ0FBc0I7d0JBRTFELElBQUksQ0FBQyxlQUFlLEVBQUU7NEJBQ3BCLG9EQUFvRDs0QkFDcEQsSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQ0FDbkQsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO29DQUNoQyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztvQ0FDNUIsMkVBQTJFO29DQUMzRSx5QkFBeUI7b0NBQ3pCLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7d0NBQ2hDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQzt3Q0FDaEQsSUFBTSxLQUFLLEdBQWtCLFNBQVMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7d0NBQzlELElBQUksQ0FBQyxRQUFROzRDQUFFLFFBQVEsR0FBRyxFQUFFLENBQUM7d0NBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO3FDQUMzQztnQ0FDSCxDQUFDLENBQUMsQ0FBQzs2QkFDSjt5QkFDRjt3QkFFRCxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFOzRCQUMxRSw2REFBNkQ7NEJBQzdELHFGQUFxRjs0QkFDckYsSUFBTSxJQUFJLEdBQXNCLGVBQWdCLENBQUMsSUFBSSxDQUFDOzRCQUN0RCxJQUFNLFlBQVksR0FBeUIsRUFBQyxJQUFJLE1BQUEsRUFBQyxDQUFDOzRCQUNsRCxJQUFJLFlBQVksSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxFQUFFO2dDQUNuRCxZQUFZLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUMzQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUM7b0NBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQURsQyxDQUNrQyxDQUFDLENBQUM7NkJBQ2pEOzRCQUNELElBQUksQ0FBQyxPQUFPO2dDQUFFLE9BQU8sR0FBRyxFQUFFLENBQUM7NEJBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7eUJBQzVCO3dCQUNELE1BQU07b0JBQ1IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQjt3QkFDakMsSUFBTSxnQkFBZ0IsR0FBd0IsSUFBSSxDQUFDO3dCQUNuRCxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRTs0QkFDekIsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQ0FDaEMsSUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0NBQzVDLElBQUksSUFBSSxFQUFFO29DQUNSLElBQUksQ0FBQyxRQUFRO3dDQUFFLFFBQVEsR0FBRyxFQUFFLENBQUM7b0NBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztpQ0FDcEQ7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsaURBQWlEO3dCQUNqRCxNQUFNO29CQUVSLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0I7d0JBQ3JDLElBQU0sZUFBZSxHQUE0QixJQUFJLENBQUM7d0JBQ3RELElBQUksZUFBZSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7NEJBQ3ZELElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQzs0QkFDM0MsSUFBSSxJQUFJLEVBQUU7Z0NBQ1IsSUFBSSxDQUFDLFFBQVE7b0NBQUUsUUFBUSxHQUFHLEVBQUUsQ0FBQztnQ0FDN0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsVUFBVSxFQUFFLFdBQVcsRUFBQyxDQUFDOzZCQUM1Qzt5QkFDRjt3QkFDRCxNQUFNO29CQUVSLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0I7d0JBQ3JDLElBQU0sb0JBQW9CLEdBQTRCLElBQUksQ0FBQzt3QkFDM0QsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7NEJBQ2pFLElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDOzRCQUNoRCxJQUFJLElBQUksRUFBRTtnQ0FDUixJQUFJLENBQUMsUUFBUTtvQ0FBRSxRQUFRLEdBQUcsRUFBRSxDQUFDO2dDQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQyxVQUFVLEVBQUUsV0FBVyxFQUFDLENBQUM7NkJBQzVDO3lCQUNGO3dCQUNELE1BQU07b0JBRVIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQjt3QkFDcEMsb0VBQW9FO3dCQUNwRSwrREFBK0Q7d0JBQy9ELElBQU0sbUJBQW1CLEdBQTJCLElBQUksQ0FBQzt3QkFDekQsSUFBSSxVQUFVLENBQUMsbUJBQW1CLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLEVBQUU7NEJBQy9ELElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOzRCQUMvQyxJQUFNLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOzRCQUM5RCxJQUFJLElBQUksRUFBRTtnQ0FDUixJQUFJLENBQUMsUUFBUTtvQ0FBRSxRQUFRLEdBQUcsRUFBRSxDQUFDO2dDQUM3QixnRUFBZ0U7Z0NBQ2hFLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0NBQ1YsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUUsRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFTLENBQUM7NkJBQ3ZGO3lCQUNGO3dCQUNELE1BQU07b0JBRVIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWU7d0JBQ2hDLElBQU0sZUFBZSxHQUF1QixJQUFJLENBQUM7d0JBQ2pELElBQUksVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFOzRCQUMvQixJQUFNLGVBQWUsR0FBb0MsRUFBRSxDQUFDOzRCQUM1RCxJQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7NEJBQy9DLElBQUksZ0JBQWdCLEdBQWtCLENBQUMsQ0FBQzs0QkFDeEMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDOztnQ0FDdkIsS0FBcUIsSUFBQSxLQUFBLGlCQUFBLGVBQWUsQ0FBQyxPQUFPLENBQUEsZ0JBQUEsNEJBQUU7b0NBQXpDLElBQU0sTUFBTSxXQUFBO29DQUNmLElBQUksU0FBUyxTQUFlLENBQUM7b0NBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO3dDQUN2QixTQUFTLEdBQUcsZ0JBQWdCLENBQUM7cUNBQzlCO3lDQUFNO3dDQUNMLFNBQVMsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztxQ0FDeEQ7b0NBQ0QsSUFBSSxJQUFJLEdBQXFCLFNBQVMsQ0FBQztvQ0FDdkMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRTt3Q0FDaEQsSUFBTSxVQUFVLEdBQWtCLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0NBQzlDLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO3dDQUN2QixlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDO3dDQUNsQyxjQUFjLEVBQUUsQ0FBQztxQ0FDbEI7b0NBQ0QsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUU7d0NBQ2pDLGdCQUFnQixHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7cUNBQ2xDO3lDQUFNLElBQUksSUFBSSxFQUFFO3dDQUNmLHNFQUFzRTt3Q0FDdEUsb0NBQW9DO3dDQUNwQyxnQkFBZ0IsR0FBRzs0Q0FDakIsVUFBVSxFQUFFLFFBQVE7NENBQ3BCLFFBQVEsRUFBRSxHQUFHOzRDQUNiLElBQUksRUFBRTtnREFDSixVQUFVLEVBQUUsUUFBUTtnREFDcEIsVUFBVSxFQUFFLFdBQVcsQ0FBQyxFQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBQyxFQUFFLElBQUksQ0FBQztnREFDeEUsSUFBSSxNQUFBOzZDQUNMO3lDQUNLLENBQUM7cUNBQ1Y7eUNBQU07d0NBQ0wsZ0JBQWdCOzRDQUNaLFdBQVcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO3FDQUM5RTtpQ0FDRjs7Ozs7Ozs7OzRCQUNELElBQUksY0FBYyxFQUFFO2dDQUNsQixJQUFJLFFBQVEsRUFBRTtvQ0FDWixJQUFJLENBQUMsUUFBUTt3Q0FBRSxRQUFRLEdBQUcsRUFBRSxDQUFDO29DQUM3QixRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsV0FBVyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztpQ0FDekQ7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsTUFBTTtvQkFFUixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCO3dCQUNsQyxJQUFNLGlCQUFpQixHQUF5QixJQUFJLENBQUM7Z0RBQzFDLG1CQUFtQjs0QkFDNUIsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFO2dDQUM3RCxJQUFNLFFBQVEsR0FBa0IsbUJBQW1CLENBQUMsSUFBSSxDQUFDO2dDQUN6RCxJQUFJLFFBQVEsU0FBZSxDQUFDO2dDQUM1QixJQUFJLG1CQUFtQixDQUFDLFdBQVcsRUFBRTtvQ0FDbkMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7aUNBQ3BFO3FDQUFNO29DQUNMLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lDQUNsRjtnQ0FDRCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0NBQ3JCLElBQUksUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLG1CQUFtQixDQUFDO29DQUM1RCxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQ0FDbEMsSUFBTSxJQUFJLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUM7b0NBQzlDLElBQUksSUFBSSxFQUFFO3dDQUNSLElBQUksQ0FBQyxRQUFROzRDQUFFLFFBQVEsR0FBRyxFQUFFLENBQUM7d0NBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO3FDQUM5QztvQ0FDRCxRQUFRLEdBQUcsSUFBSSxDQUFDO2lDQUNqQjtnQ0FDRCxJQUFJLE9BQU8sUUFBUSxJQUFJLFFBQVEsSUFBSSxPQUFPLFFBQVEsSUFBSSxRQUFRO29DQUMxRCxPQUFPLFFBQVEsSUFBSSxTQUFTLEVBQUU7b0NBQ2hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztvQ0FDdkMsSUFBSSxRQUFRLEVBQUU7d0NBQ1osTUFBTSxDQUFDLGVBQWUsQ0FDbEIsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDO3FDQUNwRTtpQ0FDRjtxQ0FBTSxJQUFJLENBQUMsUUFBUSxFQUFFO29DQUNwQixJQUFJLFFBQVEsSUFBSSxDQUFDLHdCQUFlLENBQUMsUUFBUSxDQUFDLEVBQUU7d0NBQzFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7cUNBQzNEO3lDQUFNO3dDQUNMLE1BQU0sQ0FBQyxNQUFNLENBQ1QsUUFBUSxDQUFDLElBQUksRUFDYixXQUFXLENBQ1AsUUFBUSxDQUFDLDZCQUE2QixFQUFFLFFBQVEsRUFBRSxFQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFDLENBQUMsRUFDeEUsSUFBSSxDQUFDLENBQUMsQ0FBQztxQ0FDaEI7aUNBQ0Y7NkJBQ0Y7aUNBQU07Z0NBQ0wsNkRBQTZEO2dDQUM3RCxzREFBc0Q7Z0NBQ3RELE9BQU87Z0NBQ1AscURBQXFEO2dDQUNyRCxxQkFBcUI7Z0NBQ3JCLElBQU0sUUFBTSxHQUFnQyxVQUFDLFFBQWlCO29DQUM1RCxRQUFRLFFBQVEsQ0FBQyxJQUFJLEVBQUU7d0NBQ3JCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVOzRDQUMzQixJQUFNLElBQUksR0FBa0IsUUFBUSxDQUFDOzRDQUNyQyxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLENBQUM7NENBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzs0Q0FDbkMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0RBQ2xCLElBQUksQ0FBQyxRQUFRO29EQUFFLFFBQVEsR0FBRyxFQUFFLENBQUM7Z0RBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDOzZDQUNoQzs0Q0FDRCxNQUFNO3dDQUNSLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjOzRDQUMvQixJQUFNLGNBQWMsR0FBc0IsUUFBUSxDQUFDOzRDQUNuRCxRQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDOzRDQUM1QixNQUFNO3dDQUNSLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQzt3Q0FDeEMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQjs0Q0FDcEMsSUFBTSxRQUFRLEdBQXNCLFFBQVEsQ0FBQzs0Q0FDNUMsUUFBZ0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQU0sQ0FBQyxDQUFDOzRDQUMzQyxNQUFNO3FDQUNUO2dDQUNILENBQUMsQ0FBQztnQ0FDRixRQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7NkJBQ2xDOzs7NEJBbEVILEtBQWtDLElBQUEsS0FBQSxpQkFBQSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFBLGdCQUFBO2dDQUEzRSxJQUFNLG1CQUFtQixXQUFBO3dDQUFuQixtQkFBbUI7NkJBbUU3Qjs7Ozs7Ozs7O3dCQUNELE1BQU07aUJBQ1Q7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksUUFBUSxJQUFJLE9BQU8sRUFBRTtnQkFDdkIsSUFBSSxDQUFDLFFBQVE7b0JBQ1gsUUFBUSxHQUFHLEVBQUUsQ0FBQztxQkFDWCxJQUFJLE1BQU0sRUFBRTtvQkFDZixnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2lCQUNqRDtnQkFDRCxJQUFNLE1BQU0sR0FBbUI7b0JBQzdCLFVBQVUsRUFBRSxRQUFRO29CQUNwQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUkseUJBQWdCO29CQUNqRCxRQUFRLFVBQUE7aUJBQ1QsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxVQUFVO29CQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztnQkFDbkUsSUFBSSxPQUFPO29CQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO2dCQUN0QyxPQUFPLE1BQU0sQ0FBQzthQUNmO1FBQ0gsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXRnQkQsSUFzZ0JDO0lBdGdCWSw4Q0FBaUI7SUF3Z0I5QixzRUFBc0U7SUFDdEUsU0FBUyxnQkFBZ0IsQ0FDckIsVUFBeUIsRUFBRSxPQUFvQyxFQUMvRCxRQUF5QztRQUMzQyxJQUFJLE1BQU0sR0FBZ0IsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRWhHLFNBQVMsa0JBQWtCLENBQUMsVUFBa0U7WUFDNUYsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPO2FBQ1I7aUJBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNwQyxVQUFVLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7YUFDeEM7aUJBQU0sSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNyRixNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsa0JBQWtCLENBQU8sVUFBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQXhDLENBQXdDLENBQUMsQ0FBQzthQUMvRjtpQkFBTSxJQUFJLHdCQUFlLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ3RDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUN6QjtpQkFBTSxJQUFJLDRDQUFtQyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2hDLElBQU0sU0FBUyxHQUFrQixRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzRCxJQUFJLFNBQVMsRUFBRTt3QkFDYixrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDL0I7aUJBQ0Y7YUFDRjtpQkFBTSxJQUFJLDJCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUN6QyxnQkFBZ0IsQ0FBTSxVQUFVLENBQUMsQ0FBQzthQUNuQztpQkFBTSxJQUFJLHFDQUE0QixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNuRCxRQUFRLFVBQVUsQ0FBQyxVQUFVLEVBQUU7b0JBQzdCLEtBQUssUUFBUTt3QkFDWCxJQUFNLGdCQUFnQixHQUFxQyxVQUFVLENBQUM7d0JBQ3RFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUMxQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDM0MsTUFBTTtvQkFDUixLQUFLLE1BQU0sQ0FBQztvQkFDWixLQUFLLEtBQUs7d0JBQ1IsSUFBTSxjQUFjLEdBQW1DLFVBQVUsQ0FBQzt3QkFDbEUsa0JBQWtCLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUM5QyxJQUFJLGNBQWMsQ0FBQyxTQUFTOzRCQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7d0JBQ25GLE1BQU07b0JBQ1IsS0FBSyxPQUFPO3dCQUNWLElBQU0sZUFBZSxHQUFvQyxVQUFVLENBQUM7d0JBQ3BFLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQzt3QkFDL0Msa0JBQWtCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUMxQyxNQUFNO29CQUNSLEtBQUssS0FBSzt3QkFDUixJQUFNLGdCQUFnQixHQUFxQyxVQUFVLENBQUM7d0JBQ3RFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUM3QyxNQUFNO29CQUNSLEtBQUssUUFBUTt3QkFDWCxJQUFNLGdCQUFnQixHQUFxQyxVQUFVLENBQUM7d0JBQ3RFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUNoRCxNQUFNO29CQUNSLEtBQUssUUFBUTt3QkFDWCxJQUFNLGdCQUFnQixHQUFxQyxVQUFVLENBQUM7d0JBQ3RFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUNoRCxNQUFNO29CQUNSLEtBQUssSUFBSTt3QkFDUCxJQUFNLFlBQVksR0FBaUMsVUFBVSxDQUFDO3dCQUM5RCxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7d0JBQzNDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQzt3QkFDaEQsa0JBQWtCLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUNoRCxNQUFNO2lCQUNUO2FBQ0Y7UUFDSCxDQUFDO1FBRUQsU0FBUyxjQUFjLENBQUMsU0FBd0IsRUFBRSxNQUFzQjtZQUN0RSxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7Z0JBQ3JCLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7YUFDL0M7WUFDRCxJQUFJLHlCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtnQkFDMUQsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2FBQ3hEO1lBQ0Qsa0ZBQWtGO1lBQ2xGLElBQUksU0FBUyxDQUFDLFVBQVUsSUFBSSw4QkFBcUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFO2dCQUM5RSxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQztRQUVELFNBQVMsYUFBYSxDQUFDLFNBQXdCO1lBQzdDLElBQUksU0FBUyxDQUFDLFVBQVUsRUFBRTtnQkFDeEIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQzthQUNsRDtZQUNELElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRTtnQkFDckIsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7cUJBQ3hDLE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLFNBQVMsQ0FBQyxPQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsQ0FBQyxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBNUIsQ0FBNEIsQ0FBQyxFQUFyRSxDQUFxRSxDQUFDLENBQUM7YUFDN0Y7WUFDRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3JCLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtvQkFDeEQsSUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLE9BQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUMsSUFBSSwyQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFBRTt3QkFDcEMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUN4Qzt5QkFBTTt3QkFDTCxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztxQkFDbEM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUM7UUFFRCxTQUFTLGdCQUFnQixDQUFDLG1CQUFxQztZQUM3RCxJQUFJLG1CQUFtQixDQUFDLEtBQUssRUFBRTtnQkFDN0IsSUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDO2dCQUN6QixJQUFJLG1CQUFtQixDQUFDLFVBQVUsRUFBRTtvQkFDbEMsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxJQUFJLG1CQUFtQixDQUFDLFVBQVU7d0JBQ2hDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFiLENBQWEsQ0FBQyxDQUFDO2lCQUM5RDtnQkFDRCxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxHQUFHLFNBQVMsQ0FBQzthQUNwQjtRQUNILENBQUM7UUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQXVCO1lBQy9DLElBQUksSUFBSSxFQUFFO2dCQUNSLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLENBQ0osSUFBSSxDQUFDLEdBQUcsSUFBSSxTQUFTO29CQUNyQixVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUM5RTtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELFNBQVMsV0FBVyxDQUFDLEtBQW9CO1lBQ3ZDLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUIsSUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLENBQUM7b0JBQzlCLE9BQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLFdBQUksS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUUsQ0FBQyxDQUFDO29CQUM3QyxPQUFJLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFFLENBQUMsQ0FBQztvQkFDdEIsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLEtBQUcsVUFBVSxDQUFDLFFBQVEsR0FDbEMsUUFBUSxpRkFDUixlQUFlLENBQUMsS0FBSyxDQUFDLGFBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUcsQ0FBQyxDQUFDO2FBQzVEO1FBQ0gsQ0FBQztRQUVELE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO1lBQy9DLElBQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixJQUFJO2dCQUNGLElBQUksd0JBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDMUIsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUN0QjthQUNGO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDMUIsSUFBSSxJQUFJLEVBQUU7d0JBQ0YsSUFBQSxLQUFvQixVQUFVLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQTVFLElBQUksVUFBQSxFQUFFLFNBQVMsZUFBNkQsQ0FBQzt3QkFDcEYsTUFBTSxJQUFJLEtBQUssQ0FBSSxVQUFVLENBQUMsUUFBUSxVQUFJLElBQUksR0FBRyxDQUFDLFdBQzlDLFNBQVMsR0FBRyxDQUFDLHdFQUNiLElBQUksY0FBUyxDQUFDLENBQUMsT0FBUyxDQUFDLENBQUM7cUJBQy9CO29CQUNELE1BQU0sSUFBSSxLQUFLLENBQ1gsaUVBQStELElBQUksYUFBUSxDQUFDLENBQUMsT0FBUyxDQUFDLENBQUM7aUJBQzdGO2FBQ0Y7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsU0FBUyxPQUFPLENBQUMsVUFBaUQ7O1FBQ2hFLElBQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUU1QixTQUFTLFVBQVUsQ0FBQyxJQUFxQzs7WUFDdkQsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFO2dCQUN6QyxJQUFNLFVBQVUsR0FBa0IsSUFBSSxDQUFDO2dCQUN2QyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QjtpQkFBTTtnQkFDTCxJQUFNLGNBQWMsR0FBc0IsSUFBSSxDQUFDOztvQkFDL0MsS0FBc0IsSUFBQSxLQUFBLGlCQUFBLGNBQWMsQ0FBQyxRQUFRLENBQUEsZ0JBQUEsNEJBQUU7d0JBQTFDLElBQU0sT0FBTyxXQUFBO3dCQUNoQixJQUFNLE1BQUksR0FBSSxPQUFlLENBQUMsSUFBSSxDQUFDO3dCQUNuQyxJQUFJLE1BQUksRUFBRTs0QkFDUixVQUFVLENBQUMsTUFBSSxDQUFDLENBQUM7eUJBQ2xCO3FCQUNGOzs7Ozs7Ozs7YUFDRjtRQUNILENBQUM7O1lBRUQsS0FBd0IsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtnQkFBL0IsSUFBTSxTQUFTLHVCQUFBO2dCQUNsQixVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzVCOzs7Ozs7Ozs7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyx3QkFBd0IsQ0FBQyxVQUFrQjtRQUNsRCxPQUFPLFVBQVUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLEtBQVU7UUFDakMsUUFBUSxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQ3JCLEtBQUssaUNBQWlDO2dCQUNwQyxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7b0JBQzVDLE9BQU8sdUNBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLG1DQUFnQyxDQUFDO2lCQUM3RDtnQkFDRCxNQUFNO1lBQ1IsS0FBSywwQkFBMEI7Z0JBQzdCLE9BQU8sa0lBQWtJLENBQUM7WUFDNUksS0FBSyw2QkFBNkI7Z0JBQ2hDLE9BQU8sdUpBQXVKLENBQUM7WUFDakssS0FBSyx3QkFBd0I7Z0JBQzNCLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtvQkFDM0MsT0FBTyw0QkFBMEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFVLENBQUM7aUJBQzNEO2dCQUNELE1BQU07WUFDUixLQUFLLDZCQUE2QjtnQkFDaEMsSUFBSSxNQUFNLEdBQ04sS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsdUJBQXFCLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxTQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDOUYsT0FBTyxNQUFNO29CQUNULHFIQUFxSCxDQUFDO1lBQzVILEtBQUssNkJBQTZCO2dCQUNoQyxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7b0JBQ3ZDLE9BQU8saURBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLHFDQUFrQyxDQUFDO2lCQUMxRDtTQUNKO1FBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO0lBQ3ZCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Vycm9yU3ltYm9sLCBFdmFsdWF0b3IsIHJlY29yZE1hcEVudHJ5fSBmcm9tICcuL2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWV0YWRhdGEsIENvbnN0cnVjdG9yTWV0YWRhdGEsIEZ1bmN0aW9uTWV0YWRhdGEsIEludGVyZmFjZU1ldGFkYXRhLCBpc0NsYXNzTWV0YWRhdGEsIGlzQ29uc3RydWN0b3JNZXRhZGF0YSwgaXNGdW5jdGlvbk1ldGFkYXRhLCBpc01ldGFkYXRhRXJyb3IsIGlzTWV0YWRhdGFHbG9iYWxSZWZlcmVuY2VFeHByZXNzaW9uLCBpc01ldGFkYXRhSW1wb3J0RGVmYXVsdFJlZmVyZW5jZSwgaXNNZXRhZGF0YUltcG9ydGVkU3ltYm9sUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbiwgaXNNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbiwgaXNNZXRob2RNZXRhZGF0YSwgTWVtYmVyTWV0YWRhdGEsIE1FVEFEQVRBX1ZFUlNJT04sIE1ldGFkYXRhRW50cnksIE1ldGFkYXRhRXJyb3IsIE1ldGFkYXRhTWFwLCBNZXRhZGF0YVN5bWJvbGljQmluYXJ5RXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY0NhbGxFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY0lmRXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY0luZGV4RXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY1ByZWZpeEV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNSZWZlcmVuY2VFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY1NwcmVhZEV4cHJlc3Npb24sIE1ldGFkYXRhVmFsdWUsIE1ldGhvZE1ldGFkYXRhLCBNb2R1bGVFeHBvcnRNZXRhZGF0YSwgTW9kdWxlTWV0YWRhdGF9IGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7U3ltYm9sc30gZnJvbSAnLi9zeW1ib2xzJztcblxuY29uc3QgaXNTdGF0aWMgPSAobm9kZTogdHMuRGVjbGFyYXRpb24pID0+XG4gICAgdHMuZ2V0Q29tYmluZWRNb2RpZmllckZsYWdzKG5vZGUpICYgdHMuTW9kaWZpZXJGbGFncy5TdGF0aWM7XG5cbi8qKlxuICogQSBzZXQgb2YgY29sbGVjdG9yIG9wdGlvbnMgdG8gdXNlIHdoZW4gY29sbGVjdGluZyBtZXRhZGF0YS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0b3JPcHRpb25zIHtcbiAgLyoqXG4gICAqIFZlcnNpb24gb2YgdGhlIG1ldGFkYXRhIHRvIGNvbGxlY3QuXG4gICAqL1xuICB2ZXJzaW9uPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBDb2xsZWN0IGEgaGlkZGVuIGZpZWxkIFwiJHF1b3RlZCRcIiBpbiBvYmplY3RzIGxpdGVyYWxzIHRoYXQgcmVjb3JkIHdoZW4gdGhlIGtleSB3YXMgcXVvdGVkIGluXG4gICAqIHRoZSBzb3VyY2UuXG4gICAqL1xuICBxdW90ZWROYW1lcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIERvIG5vdCBzaW1wbGlmeSBpbnZhbGlkIGV4cHJlc3Npb25zLlxuICAgKi9cbiAgdmVyYm9zZUludmFsaWRFeHByZXNzaW9uPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQW4gZXhwcmVzc2lvbiBzdWJzdGl0dXRpb24gY2FsbGJhY2suXG4gICAqL1xuICBzdWJzdGl0dXRlRXhwcmVzc2lvbj86ICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSkgPT4gTWV0YWRhdGFWYWx1ZTtcbn1cblxuLyoqXG4gKiBDb2xsZWN0IGRlY29yYXRvciBtZXRhZGF0YSBmcm9tIGEgVHlwZVNjcmlwdCBtb2R1bGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXRhZGF0YUNvbGxlY3RvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgb3B0aW9uczogQ29sbGVjdG9yT3B0aW9ucyA9IHt9KSB7fVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgSlNPTi5zdHJpbmdpZnkgZnJpZW5kbHkgZm9ybSBkZXNjcmliaW5nIHRoZSBkZWNvcmF0b3JzIG9mIHRoZSBleHBvcnRlZCBjbGFzc2VzIGZyb21cbiAgICogdGhlIHNvdXJjZSBmaWxlIHRoYXQgaXMgZXhwZWN0ZWQgdG8gY29ycmVzcG9uZCB0byBhIG1vZHVsZS5cbiAgICovXG4gIHB1YmxpYyBnZXRNZXRhZGF0YShcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHN0cmljdDogYm9vbGVhbiA9IGZhbHNlLFxuICAgICAgc3Vic3RpdHV0ZUV4cHJlc3Npb24/OiAodmFsdWU6IE1ldGFkYXRhVmFsdWUsIG5vZGU6IHRzLk5vZGUpID0+IE1ldGFkYXRhVmFsdWUpOiBNb2R1bGVNZXRhZGF0YVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgbG9jYWxzID0gbmV3IFN5bWJvbHMoc291cmNlRmlsZSk7XG4gICAgY29uc3Qgbm9kZU1hcCA9XG4gICAgICAgIG5ldyBNYXA8TWV0YWRhdGFWYWx1ZXxDbGFzc01ldGFkYXRhfEludGVyZmFjZU1ldGFkYXRhfEZ1bmN0aW9uTWV0YWRhdGEsIHRzLk5vZGU+KCk7XG4gICAgY29uc3QgY29tcG9zZWRTdWJzdGl0dXRlciA9IHN1YnN0aXR1dGVFeHByZXNzaW9uICYmIHRoaXMub3B0aW9ucy5zdWJzdGl0dXRlRXhwcmVzc2lvbiA/XG4gICAgICAgICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSkgPT5cbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5zdWJzdGl0dXRlRXhwcmVzc2lvbiEoc3Vic3RpdHV0ZUV4cHJlc3Npb24odmFsdWUsIG5vZGUpLCBub2RlKSA6XG4gICAgICAgIHN1YnN0aXR1dGVFeHByZXNzaW9uO1xuICAgIGNvbnN0IGV2YWx1YXRvck9wdGlvbnMgPSBzdWJzdGl0dXRlRXhwcmVzc2lvbiA/XG4gICAgICAgIHsuLi50aGlzLm9wdGlvbnMsIHN1YnN0aXR1dGVFeHByZXNzaW9uOiBjb21wb3NlZFN1YnN0aXR1dGVyfSA6XG4gICAgICAgIHRoaXMub3B0aW9ucztcbiAgICBsZXQgbWV0YWRhdGE6IHtbbmFtZTogc3RyaW5nXTogTWV0YWRhdGFWYWx1ZXxDbGFzc01ldGFkYXRhfEZ1bmN0aW9uTWV0YWRhdGF9fHVuZGVmaW5lZDtcbiAgICBjb25zdCBldmFsdWF0b3IgPSBuZXcgRXZhbHVhdG9yKGxvY2Fscywgbm9kZU1hcCwgZXZhbHVhdG9yT3B0aW9ucywgKG5hbWUsIHZhbHVlKSA9PiB7XG4gICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgbWV0YWRhdGFbbmFtZV0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICBsZXQgZXhwb3J0czogTW9kdWxlRXhwb3J0TWV0YWRhdGFbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBmdW5jdGlvbiBvYmpGcm9tRGVjb3JhdG9yKGRlY29yYXRvck5vZGU6IHRzLkRlY29yYXRvcik6IE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uIHtcbiAgICAgIHJldHVybiA8TWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24+ZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShkZWNvcmF0b3JOb2RlLmV4cHJlc3Npb24pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlY29yZEVudHJ5PFQgZXh0ZW5kcyBNZXRhZGF0YUVudHJ5PihlbnRyeTogVCwgbm9kZTogdHMuTm9kZSk6IFQge1xuICAgICAgaWYgKGNvbXBvc2VkU3Vic3RpdHV0ZXIpIHtcbiAgICAgICAgZW50cnkgPSBjb21wb3NlZFN1YnN0aXR1dGVyKGVudHJ5IGFzIE1ldGFkYXRhVmFsdWUsIG5vZGUpIGFzIFQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVjb3JkTWFwRW50cnkoZW50cnksIG5vZGUsIG5vZGVNYXAsIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yU3ltKFxuICAgICAgICBtZXNzYWdlOiBzdHJpbmcsIG5vZGU/OiB0cy5Ob2RlLCBjb250ZXh0Pzoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9KTogTWV0YWRhdGFFcnJvciB7XG4gICAgICByZXR1cm4gZXJyb3JTeW1ib2wobWVzc2FnZSwgbm9kZSwgY29udGV4dCwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWF5YmVHZXRTaW1wbGVGdW5jdGlvbihmdW5jdGlvbkRlY2xhcmF0aW9uOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuTWV0aG9kRGVjbGFyYXRpb24pOiB7ZnVuYzogRnVuY3Rpb25NZXRhZGF0YSwgbmFtZTogc3RyaW5nfXxcbiAgICAgICAgdW5kZWZpbmVkIHtcbiAgICAgIGlmIChmdW5jdGlvbkRlY2xhcmF0aW9uLm5hbWUgJiYgZnVuY3Rpb25EZWNsYXJhdGlvbi5uYW1lLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgIGNvbnN0IG5hbWVOb2RlID0gPHRzLklkZW50aWZpZXI+ZnVuY3Rpb25EZWNsYXJhdGlvbi5uYW1lO1xuICAgICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSBuYW1lTm9kZS50ZXh0O1xuICAgICAgICBjb25zdCBmdW5jdGlvbkJvZHkgPSBmdW5jdGlvbkRlY2xhcmF0aW9uLmJvZHk7XG4gICAgICAgIGlmIChmdW5jdGlvbkJvZHkgJiYgZnVuY3Rpb25Cb2R5LnN0YXRlbWVudHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICBjb25zdCBzdGF0ZW1lbnQgPSBmdW5jdGlvbkJvZHkuc3RhdGVtZW50c1swXTtcbiAgICAgICAgICBpZiAoc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuUmV0dXJuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSA8dHMuUmV0dXJuU3RhdGVtZW50PnN0YXRlbWVudDtcbiAgICAgICAgICAgIGlmIChyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICBjb25zdCBmdW5jOiBGdW5jdGlvbk1ldGFkYXRhID0ge1xuICAgICAgICAgICAgICAgIF9fc3ltYm9saWM6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyczogbmFtZXNPZihmdW5jdGlvbkRlY2xhcmF0aW9uLnBhcmFtZXRlcnMpLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBldmFsdWF0b3IuZXZhbHVhdGVOb2RlKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBpZiAoZnVuY3Rpb25EZWNsYXJhdGlvbi5wYXJhbWV0ZXJzLnNvbWUocCA9PiBwLmluaXRpYWxpemVyICE9IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgZnVuYy5kZWZhdWx0cyA9IGZ1bmN0aW9uRGVjbGFyYXRpb24ucGFyYW1ldGVycy5tYXAoXG4gICAgICAgICAgICAgICAgICAgIHAgPT4gcC5pbml0aWFsaXplciAmJiBldmFsdWF0b3IuZXZhbHVhdGVOb2RlKHAuaW5pdGlhbGl6ZXIpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkRW50cnkoe2Z1bmMsIG5hbWU6IGZ1bmN0aW9uTmFtZX0sIGZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsYXNzTWV0YWRhdGFPZihjbGFzc0RlY2xhcmF0aW9uOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZXRhZGF0YSB7XG4gICAgICBjb25zdCByZXN1bHQ6IENsYXNzTWV0YWRhdGEgPSB7X19zeW1ib2xpYzogJ2NsYXNzJ307XG5cbiAgICAgIGZ1bmN0aW9uIGdldERlY29yYXRvcnMoZGVjb3JhdG9yczogUmVhZG9ubHlBcnJheTx0cy5EZWNvcmF0b3I+fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbltdfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzICYmIGRlY29yYXRvcnMubGVuZ3RoKVxuICAgICAgICAgIHJldHVybiBkZWNvcmF0b3JzLm1hcChkZWNvcmF0b3IgPT4gb2JqRnJvbURlY29yYXRvcihkZWNvcmF0b3IpKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVmZXJlbmNlRnJvbShub2RlOiB0cy5Ob2RlKTogTWV0YWRhdGFTeW1ib2xpY1JlZmVyZW5jZUV4cHJlc3Npb258TWV0YWRhdGFFcnJvcnxcbiAgICAgICAgICBNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUobm9kZSk7XG4gICAgICAgIGlmIChpc01ldGFkYXRhRXJyb3IocmVzdWx0KSB8fCBpc01ldGFkYXRhU3ltYm9saWNSZWZlcmVuY2VFeHByZXNzaW9uKHJlc3VsdCkgfHxcbiAgICAgICAgICAgIGlzTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24ocmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yU3ltKCdTeW1ib2wgcmVmZXJlbmNlIGV4cGVjdGVkJywgbm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQWRkIGNsYXNzIHBhcmVudHNcbiAgICAgIGlmIChjbGFzc0RlY2xhcmF0aW9uLmhlcml0YWdlQ2xhdXNlcykge1xuICAgICAgICBjbGFzc0RlY2xhcmF0aW9uLmhlcml0YWdlQ2xhdXNlcy5mb3JFYWNoKChoYykgPT4ge1xuICAgICAgICAgIGlmIChoYy50b2tlbiA9PT0gdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCAmJiBoYy50eXBlcykge1xuICAgICAgICAgICAgaGMudHlwZXMuZm9yRWFjaCh0eXBlID0+IHJlc3VsdC5leHRlbmRzID0gcmVmZXJlbmNlRnJvbSh0eXBlLmV4cHJlc3Npb24pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgYXJpdHkgaWYgdGhlIHR5cGUgaXMgZ2VuZXJpY1xuICAgICAgY29uc3QgdHlwZVBhcmFtZXRlcnMgPSBjbGFzc0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzO1xuICAgICAgaWYgKHR5cGVQYXJhbWV0ZXJzICYmIHR5cGVQYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgICByZXN1bHQuYXJpdHkgPSB0eXBlUGFyYW1ldGVycy5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBjbGFzcyBkZWNvcmF0b3JzXG4gICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzKSB7XG4gICAgICAgIHJlc3VsdC5kZWNvcmF0b3JzID0gZ2V0RGVjb3JhdG9ycyhjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnMpO1xuICAgICAgfVxuXG4gICAgICAvLyBtZW1iZXIgZGVjb3JhdG9yc1xuICAgICAgbGV0IG1lbWJlcnM6IE1ldGFkYXRhTWFwfG51bGwgPSBudWxsO1xuICAgICAgZnVuY3Rpb24gcmVjb3JkTWVtYmVyKG5hbWU6IHN0cmluZywgbWV0YWRhdGE6IE1lbWJlck1ldGFkYXRhKSB7XG4gICAgICAgIGlmICghbWVtYmVycykgbWVtYmVycyA9IHt9O1xuICAgICAgICBjb25zdCBkYXRhID0gbWVtYmVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSA/IG1lbWJlcnNbbmFtZV0gOiBbXTtcbiAgICAgICAgZGF0YS5wdXNoKG1ldGFkYXRhKTtcbiAgICAgICAgbWVtYmVyc1tuYW1lXSA9IGRhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIHN0YXRpYyBtZW1iZXJcbiAgICAgIGxldCBzdGF0aWNzOiB7W25hbWU6IHN0cmluZ106IE1ldGFkYXRhVmFsdWV8RnVuY3Rpb25NZXRhZGF0YX18bnVsbCA9IG51bGw7XG4gICAgICBmdW5jdGlvbiByZWNvcmRTdGF0aWNNZW1iZXIobmFtZTogc3RyaW5nLCB2YWx1ZTogTWV0YWRhdGFWYWx1ZXxGdW5jdGlvbk1ldGFkYXRhKSB7XG4gICAgICAgIGlmICghc3RhdGljcykgc3RhdGljcyA9IHt9O1xuICAgICAgICBzdGF0aWNzW25hbWVdID0gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbWVtYmVyIG9mIGNsYXNzRGVjbGFyYXRpb24ubWVtYmVycykge1xuICAgICAgICBsZXQgaXNDb25zdHJ1Y3RvciA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKG1lbWJlci5raW5kKSB7XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yOlxuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5NZXRob2REZWNsYXJhdGlvbjpcbiAgICAgICAgICAgIGlzQ29uc3RydWN0b3IgPSBtZW1iZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5Db25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IDx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uPm1lbWJlcjtcbiAgICAgICAgICAgIGlmIChpc1N0YXRpYyhtZXRob2QpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG1heWJlRnVuYyA9IG1heWJlR2V0U2ltcGxlRnVuY3Rpb24oPHRzLk1ldGhvZERlY2xhcmF0aW9uPm1ldGhvZCk7XG4gICAgICAgICAgICAgIGlmIChtYXliZUZ1bmMpIHtcbiAgICAgICAgICAgICAgICByZWNvcmRTdGF0aWNNZW1iZXIobWF5YmVGdW5jLm5hbWUsIG1heWJlRnVuYy5mdW5jKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZERlY29yYXRvcnMgPSBnZXREZWNvcmF0b3JzKG1ldGhvZC5kZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtZXRlcnMgPSBtZXRob2QucGFyYW1ldGVycztcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtZXRlckRlY29yYXRvckRhdGE6ICgoTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24gfCBNZXRhZGF0YUVycm9yKVtdfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZClbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1ldGVyc0RhdGE6IChNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbnxNZXRhZGF0YUVycm9yfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbnxudWxsKVtdID0gW107XG4gICAgICAgICAgICBsZXQgaGFzRGVjb3JhdG9yRGF0YTogYm9vbGVhbiA9IGZhbHNlO1xuICAgICAgICAgICAgbGV0IGhhc1BhcmFtZXRlckRhdGE6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcGFyYW1ldGVyIG9mIHBhcmFtZXRlcnMpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGFyYW1ldGVyRGF0YSA9IGdldERlY29yYXRvcnMocGFyYW1ldGVyLmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICBwYXJhbWV0ZXJEZWNvcmF0b3JEYXRhLnB1c2gocGFyYW1ldGVyRGF0YSk7XG4gICAgICAgICAgICAgIGhhc0RlY29yYXRvckRhdGEgPSBoYXNEZWNvcmF0b3JEYXRhIHx8ICEhcGFyYW1ldGVyRGF0YTtcbiAgICAgICAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnNEYXRhLnB1c2gocmVmZXJlbmNlRnJvbShwYXJhbWV0ZXIudHlwZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzRGF0YS5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYXNQYXJhbWV0ZXJEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0YTogTWV0aG9kTWV0YWRhdGEgPSB7X19zeW1ib2xpYzogaXNDb25zdHJ1Y3RvciA/ICdjb25zdHJ1Y3RvcicgOiAnbWV0aG9kJ307XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gaXNDb25zdHJ1Y3RvciA/ICdfX2N0b3JfXycgOiBldmFsdWF0b3IubmFtZU9mKG1lbWJlci5uYW1lKTtcbiAgICAgICAgICAgIGlmIChtZXRob2REZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICAgIGRhdGEuZGVjb3JhdG9ycyA9IG1ldGhvZERlY29yYXRvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGFzRGVjb3JhdG9yRGF0YSkge1xuICAgICAgICAgICAgICBkYXRhLnBhcmFtZXRlckRlY29yYXRvcnMgPSBwYXJhbWV0ZXJEZWNvcmF0b3JEYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGhhc1BhcmFtZXRlckRhdGEpIHtcbiAgICAgICAgICAgICAgKDxDb25zdHJ1Y3Rvck1ldGFkYXRhPmRhdGEpLnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzRGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNNZXRhZGF0YUVycm9yKG5hbWUpKSB7XG4gICAgICAgICAgICAgIHJlY29yZE1lbWJlcihuYW1lLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Qcm9wZXJ0eURlY2xhcmF0aW9uOlxuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5HZXRBY2Nlc3NvcjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU2V0QWNjZXNzb3I6XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IDx0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uPm1lbWJlcjtcbiAgICAgICAgICAgIGlmIChpc1N0YXRpYyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV2YWx1YXRvci5uYW1lT2YocHJvcGVydHkubmFtZSk7XG4gICAgICAgICAgICAgIGlmICghaXNNZXRhZGF0YUVycm9yKG5hbWUpICYmICFzaG91bGRJZ25vcmVTdGF0aWNNZW1iZXIobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkuaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShwcm9wZXJ0eS5pbml0aWFsaXplcik7XG4gICAgICAgICAgICAgICAgICByZWNvcmRTdGF0aWNNZW1iZXIobmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZWNvcmRTdGF0aWNNZW1iZXIobmFtZSwgZXJyb3JTeW0oJ1ZhcmlhYmxlIG5vdCBpbml0aWFsaXplZCcsIHByb3BlcnR5Lm5hbWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGVjb3JhdG9ycyA9IGdldERlY29yYXRvcnMocHJvcGVydHkuZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICBpZiAocHJvcGVydHlEZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBldmFsdWF0b3IubmFtZU9mKHByb3BlcnR5Lm5hbWUpO1xuICAgICAgICAgICAgICBpZiAoIWlzTWV0YWRhdGFFcnJvcihuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJlY29yZE1lbWJlcihuYW1lLCB7X19zeW1ib2xpYzogJ3Byb3BlcnR5JywgZGVjb3JhdG9yczogcHJvcGVydHlEZWNvcmF0b3JzfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWVtYmVycykge1xuICAgICAgICByZXN1bHQubWVtYmVycyA9IG1lbWJlcnM7XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGljcykge1xuICAgICAgICByZXN1bHQuc3RhdGljcyA9IHN0YXRpY3M7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWNvcmRFbnRyeShyZXN1bHQsIGNsYXNzRGVjbGFyYXRpb24pO1xuICAgIH1cblxuICAgIC8vIENvbGxlY3QgYWxsIGV4cG9ydGVkIHN5bWJvbHMgZnJvbSBhbiBleHBvcnRzIGNsYXVzZS5cbiAgICBjb25zdCBleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBub2RlID0+IHtcbiAgICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5FeHBvcnREZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IDx0cy5FeHBvcnREZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGNvbnN0IHttb2R1bGVTcGVjaWZpZXIsIGV4cG9ydENsYXVzZX0gPSBleHBvcnREZWNsYXJhdGlvbjtcblxuICAgICAgICAgIGlmICghbW9kdWxlU3BlY2lmaWVyICYmIGV4cG9ydENsYXVzZSAmJiB0cy5pc05hbWVkRXhwb3J0cyhleHBvcnRDbGF1c2UpKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIG1vZHVsZSBzcGVjaWZpZXIgdGhlcmUgaXMgYWxzbyBhbiBleHBvcnRDbGF1c2VcbiAgICAgICAgICAgIGV4cG9ydENsYXVzZS5lbGVtZW50cy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBleHBvcnRlZEFzID0gc3BlYy5uYW1lLnRleHQ7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAoc3BlYy5wcm9wZXJ0eU5hbWUgfHwgc3BlYy5uYW1lKS50ZXh0O1xuICAgICAgICAgICAgICBleHBvcnRNYXAuc2V0KG5hbWUsIGV4cG9ydGVkQXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgaXNFeHBvcnQgPSAobm9kZTogdHMuTm9kZSkgPT4gc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fFxuICAgICAgICB0cy5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSBhcyB0cy5EZWNsYXJhdGlvbikgJiB0cy5Nb2RpZmllckZsYWdzLkV4cG9ydDtcbiAgICBjb25zdCBpc0V4cG9ydGVkSWRlbnRpZmllciA9IChpZGVudGlmaWVyPzogdHMuSWRlbnRpZmllcikgPT5cbiAgICAgICAgaWRlbnRpZmllciAmJiBleHBvcnRNYXAuaGFzKGlkZW50aWZpZXIudGV4dCk7XG4gICAgY29uc3QgaXNFeHBvcnRlZCA9IChub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLkNsYXNzRGVjbGFyYXRpb258dHMuVHlwZUFsaWFzRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbnx0cy5FbnVtRGVjbGFyYXRpb24pID0+XG4gICAgICAgIGlzRXhwb3J0KG5vZGUpIHx8IGlzRXhwb3J0ZWRJZGVudGlmaWVyKG5vZGUubmFtZSk7XG4gICAgY29uc3QgZXhwb3J0ZWRJZGVudGlmaWVyTmFtZSA9IChpZGVudGlmaWVyPzogdHMuSWRlbnRpZmllcikgPT5cbiAgICAgICAgaWRlbnRpZmllciAmJiAoZXhwb3J0TWFwLmdldChpZGVudGlmaWVyLnRleHQpIHx8IGlkZW50aWZpZXIudGV4dCk7XG4gICAgY29uc3QgZXhwb3J0ZWROYW1lID0gKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuQ2xhc3NEZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuSW50ZXJmYWNlRGVjbGFyYXRpb258dHMuVHlwZUFsaWFzRGVjbGFyYXRpb258dHMuRW51bURlY2xhcmF0aW9uKSA9PlxuICAgICAgICBleHBvcnRlZElkZW50aWZpZXJOYW1lKG5vZGUubmFtZSk7XG5cblxuICAgIC8vIFByZS1kZWNsYXJlIGNsYXNzZXMgYW5kIGZ1bmN0aW9uc1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBub2RlID0+IHtcbiAgICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSA8dHMuQ2xhc3NEZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmIChjbGFzc0RlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGNsYXNzRGVjbGFyYXRpb24ubmFtZS50ZXh0O1xuICAgICAgICAgICAgaWYgKGlzRXhwb3J0ZWQoY2xhc3NEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZSwge19fc3ltYm9saWM6ICdyZWZlcmVuY2UnLCBuYW1lOiBleHBvcnRlZE5hbWUoY2xhc3NEZWNsYXJhdGlvbil9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUoXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWUsIGVycm9yU3ltKCdSZWZlcmVuY2UgdG8gbm9uLWV4cG9ydGVkIGNsYXNzJywgbm9kZSwge2NsYXNzTmFtZX0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IGludGVyZmFjZURlY2xhcmF0aW9uID0gPHRzLkludGVyZmFjZURlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKGludGVyZmFjZURlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZU5hbWUgPSBpbnRlcmZhY2VEZWNsYXJhdGlvbi5uYW1lLnRleHQ7XG4gICAgICAgICAgICAvLyBBbGwgcmVmZXJlbmNlcyB0byBpbnRlcmZhY2VzIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gcmVmZXJlbmNlcyB0byBgYW55YC5cbiAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUoaW50ZXJmYWNlTmFtZSwge19fc3ltYm9saWM6ICdyZWZlcmVuY2UnLCBuYW1lOiAnYW55J30pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBmdW5jdGlvbkRlY2xhcmF0aW9uID0gPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoIWlzRXhwb3J0ZWQoZnVuY3Rpb25EZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIC8vIFJlcG9ydCByZWZlcmVuY2VzIHRvIHRoaXMgZnVuY3Rpb24gYXMgYW4gZXJyb3IuXG4gICAgICAgICAgICBjb25zdCBuYW1lTm9kZSA9IGZ1bmN0aW9uRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lTm9kZSAmJiBuYW1lTm9kZS50ZXh0KSB7XG4gICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUoXG4gICAgICAgICAgICAgICAgICBuYW1lTm9kZS50ZXh0LFxuICAgICAgICAgICAgICAgICAgZXJyb3JTeW0oXG4gICAgICAgICAgICAgICAgICAgICAgJ1JlZmVyZW5jZSB0byBhIG5vbi1leHBvcnRlZCBmdW5jdGlvbicsIG5hbWVOb2RlLCB7bmFtZTogbmFtZU5vZGUudGV4dH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgbm9kZSA9PiB7XG4gICAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRXhwb3J0RGVjbGFyYXRpb246XG4gICAgICAgICAgLy8gUmVjb3JkIGV4cG9ydCBkZWNsYXJhdGlvbnNcbiAgICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IDx0cy5FeHBvcnREZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGNvbnN0IHttb2R1bGVTcGVjaWZpZXIsIGV4cG9ydENsYXVzZX0gPSBleHBvcnREZWNsYXJhdGlvbjtcblxuICAgICAgICAgIGlmICghbW9kdWxlU3BlY2lmaWVyKSB7XG4gICAgICAgICAgICAvLyBubyBtb2R1bGUgc3BlY2lmaWVyIC0+IGV4cG9ydCB7cHJvcE5hbWUgYXMgbmFtZX07XG4gICAgICAgICAgICBpZiAoZXhwb3J0Q2xhdXNlICYmIHRzLmlzTmFtZWRFeHBvcnRzKGV4cG9ydENsYXVzZSkpIHtcbiAgICAgICAgICAgICAgZXhwb3J0Q2xhdXNlLmVsZW1lbnRzLmZvckVhY2goc3BlYyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IHNwZWMubmFtZS50ZXh0O1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzeW1ib2wgd2FzIG5vdCBhbHJlYWR5IGV4cG9ydGVkLCBleHBvcnQgYSByZWZlcmVuY2Ugc2luY2UgaXQgaXMgYVxuICAgICAgICAgICAgICAgIC8vIHJlZmVyZW5jZSB0byBhbiBpbXBvcnRcbiAgICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhIHx8ICFtZXRhZGF0YVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcE5vZGUgPSBzcGVjLnByb3BlcnR5TmFtZSB8fCBzcGVjLm5hbWU7XG4gICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZTogTWV0YWRhdGFWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUocHJvcE5vZGUpO1xuICAgICAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgIG1ldGFkYXRhW25hbWVdID0gcmVjb3JkRW50cnkodmFsdWUsIG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZHVsZVNwZWNpZmllciAmJiBtb2R1bGVTcGVjaWZpZXIua2luZCA9PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBleHBvcnRzIHRoYXQgZG9uJ3QgaGF2ZSBzdHJpbmcgbGl0ZXJhbHMgYXMgZXhwb3J0cy5cbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYWxsb3dlZCBieSB0aGUgc3ludGF4IGJ1dCB3aWxsIGJlIGZsYWdnZWQgYXMgYW4gZXJyb3IgYnkgdGhlIHR5cGUgY2hlY2tlci5cbiAgICAgICAgICAgIGNvbnN0IGZyb20gPSAoPHRzLlN0cmluZ0xpdGVyYWw+bW9kdWxlU3BlY2lmaWVyKS50ZXh0O1xuICAgICAgICAgICAgY29uc3QgbW9kdWxlRXhwb3J0OiBNb2R1bGVFeHBvcnRNZXRhZGF0YSA9IHtmcm9tfTtcbiAgICAgICAgICAgIGlmIChleHBvcnRDbGF1c2UgJiYgdHMuaXNOYW1lZEV4cG9ydHMoZXhwb3J0Q2xhdXNlKSkge1xuICAgICAgICAgICAgICBtb2R1bGVFeHBvcnQuZXhwb3J0ID0gZXhwb3J0Q2xhdXNlLmVsZW1lbnRzLm1hcChcbiAgICAgICAgICAgICAgICAgIHNwZWMgPT4gc3BlYy5wcm9wZXJ0eU5hbWUgPyB7bmFtZTogc3BlYy5wcm9wZXJ0eU5hbWUudGV4dCwgYXM6IHNwZWMubmFtZS50ZXh0fSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BlYy5uYW1lLnRleHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFleHBvcnRzKSBleHBvcnRzID0gW107XG4gICAgICAgICAgICBleHBvcnRzLnB1c2gobW9kdWxlRXhwb3J0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSA8dHMuQ2xhc3NEZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmIChjbGFzc0RlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgICAgIGlmIChpc0V4cG9ydGVkKGNsYXNzRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZE5hbWUoY2xhc3NEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lXSA9IGNsYXNzTWV0YWRhdGFPZihjbGFzc0RlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlcndpc2UgZG9uJ3QgcmVjb3JkIG1ldGFkYXRhIGZvciB0aGUgY2xhc3MuXG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlR5cGVBbGlhc0RlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IHR5cGVEZWNsYXJhdGlvbiA9IDx0cy5UeXBlQWxpYXNEZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmICh0eXBlRGVjbGFyYXRpb24ubmFtZSAmJiBpc0V4cG9ydGVkKHR5cGVEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZE5hbWUodHlwZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgIG1ldGFkYXRhW25hbWVdID0ge19fc3ltYm9saWM6ICdpbnRlcmZhY2UnfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IGludGVyZmFjZURlY2xhcmF0aW9uID0gPHRzLkludGVyZmFjZURlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKGludGVyZmFjZURlY2xhcmF0aW9uLm5hbWUgJiYgaXNFeHBvcnRlZChpbnRlcmZhY2VEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZE5hbWUoaW50ZXJmYWNlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSB7X19zeW1ib2xpYzogJ2ludGVyZmFjZSd9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAvLyBSZWNvcmQgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIGEgc2luZ2xlIHZhbHVlLiBSZWNvcmQgdGhlIHBhcmFtZXRlclxuICAgICAgICAgIC8vIG5hbWVzIHN1YnN0aXR1dGlvbiB3aWxsIGJlIHBlcmZvcm1lZCBieSB0aGUgU3RhdGljUmVmbGVjdG9yLlxuICAgICAgICAgIGNvbnN0IGZ1bmN0aW9uRGVjbGFyYXRpb24gPSA8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmIChpc0V4cG9ydGVkKGZ1bmN0aW9uRGVjbGFyYXRpb24pICYmIGZ1bmN0aW9uRGVjbGFyYXRpb24ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkTmFtZShmdW5jdGlvbkRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRnVuYyA9IG1heWJlR2V0U2ltcGxlRnVuY3Rpb24oZnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IFRoZSBsaXRlcmFsIGhlcmUgaXMgbm90IHZhbGlkIEZ1bmN0aW9uTWV0YWRhdGEuXG4gICAgICAgICAgICAgIG1ldGFkYXRhW25hbWVdID1cbiAgICAgICAgICAgICAgICAgIG1heWJlRnVuYyA/IHJlY29yZEVudHJ5KG1heWJlRnVuYy5mdW5jLCBub2RlKSA6ICh7X19zeW1ib2xpYzogJ2Z1bmN0aW9uJ30gYXMgYW55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkVudW1EZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBlbnVtRGVjbGFyYXRpb24gPSA8dHMuRW51bURlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKGlzRXhwb3J0ZWQoZW51bURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZW51bVZhbHVlSG9sZGVyOiB7W25hbWU6IHN0cmluZ106IE1ldGFkYXRhVmFsdWV9ID0ge307XG4gICAgICAgICAgICBjb25zdCBlbnVtTmFtZSA9IGV4cG9ydGVkTmFtZShlbnVtRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgbGV0IG5leHREZWZhdWx0VmFsdWU6IE1ldGFkYXRhVmFsdWUgPSAwO1xuICAgICAgICAgICAgbGV0IHdyaXR0ZW5NZW1iZXJzID0gMDtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbWVtYmVyIG9mIGVudW1EZWNsYXJhdGlvbi5tZW1iZXJzKSB7XG4gICAgICAgICAgICAgIGxldCBlbnVtVmFsdWU6IE1ldGFkYXRhVmFsdWU7XG4gICAgICAgICAgICAgIGlmICghbWVtYmVyLmluaXRpYWxpemVyKSB7XG4gICAgICAgICAgICAgICAgZW51bVZhbHVlID0gbmV4dERlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbnVtVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGVOb2RlKG1lbWJlci5pbml0aWFsaXplcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGV0IG5hbWU6IHN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGlmIChtZW1iZXIubmFtZS5raW5kID09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkZW50aWZpZXIgPSA8dHMuSWRlbnRpZmllcj5tZW1iZXIubmFtZTtcbiAgICAgICAgICAgICAgICBuYW1lID0gaWRlbnRpZmllci50ZXh0O1xuICAgICAgICAgICAgICAgIGVudW1WYWx1ZUhvbGRlcltuYW1lXSA9IGVudW1WYWx1ZTtcbiAgICAgICAgICAgICAgICB3cml0dGVuTWVtYmVycysrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgZW51bVZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIG5leHREZWZhdWx0VmFsdWUgPSBlbnVtVmFsdWUgKyAxO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6ICdsZWZ0JyBoZXJlIGhhcyBhIG5hbWUgcHJvcGVyeSB3aGljaCBpcyBub3QgdmFsaWQgZm9yXG4gICAgICAgICAgICAgICAgLy8gTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24uXG4gICAgICAgICAgICAgICAgbmV4dERlZmF1bHRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgIF9fc3ltYm9saWM6ICdiaW5hcnknLFxuICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcrJyxcbiAgICAgICAgICAgICAgICAgIGxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgX19zeW1ib2xpYzogJ3NlbGVjdCcsXG4gICAgICAgICAgICAgICAgICAgIGV4cHJlc3Npb246IHJlY29yZEVudHJ5KHtfX3N5bWJvbGljOiAncmVmZXJlbmNlJywgbmFtZTogZW51bU5hbWV9LCBub2RlKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZVxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9IGFzIGFueTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0RGVmYXVsdFZhbHVlID1cbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkRW50cnkoZXJyb3JTeW0oJ1Vuc3VwcG9ydGVkIGVudW0gbWVtYmVyIG5hbWUnLCBtZW1iZXIubmFtZSksIG5vZGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod3JpdHRlbk1lbWJlcnMpIHtcbiAgICAgICAgICAgICAgaWYgKGVudW1OYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YVtlbnVtTmFtZV0gPSByZWNvcmRFbnRyeShlbnVtVmFsdWVIb2xkZXIsIG5vZGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5WYXJpYWJsZVN0YXRlbWVudDpcbiAgICAgICAgICBjb25zdCB2YXJpYWJsZVN0YXRlbWVudCA9IDx0cy5WYXJpYWJsZVN0YXRlbWVudD5ub2RlO1xuICAgICAgICAgIGZvciAoY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbiBvZiB2YXJpYWJsZVN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zKSB7XG4gICAgICAgICAgICBpZiAodmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWVOb2RlID0gPHRzLklkZW50aWZpZXI+dmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lO1xuICAgICAgICAgICAgICBsZXQgdmFyVmFsdWU6IE1ldGFkYXRhVmFsdWU7XG4gICAgICAgICAgICAgIGlmICh2YXJpYWJsZURlY2xhcmF0aW9uLmluaXRpYWxpemVyKSB7XG4gICAgICAgICAgICAgICAgdmFyVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGVOb2RlKHZhcmlhYmxlRGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhclZhbHVlID0gcmVjb3JkRW50cnkoZXJyb3JTeW0oJ1ZhcmlhYmxlIG5vdCBpbml0aWFsaXplZCcsIG5hbWVOb2RlKSwgbmFtZU5vZGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxldCBleHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBpZiAoaXNFeHBvcnQodmFyaWFibGVTdGF0ZW1lbnQpIHx8IGlzRXhwb3J0KHZhcmlhYmxlRGVjbGFyYXRpb24pIHx8XG4gICAgICAgICAgICAgICAgICBpc0V4cG9ydGVkSWRlbnRpZmllcihuYW1lTm9kZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWRJZGVudGlmaWVyTmFtZShuYW1lTm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lXSA9IHJlY29yZEVudHJ5KHZhclZhbHVlLCBub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwb3J0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFyVmFsdWUgPT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhclZhbHVlID09ICdudW1iZXInIHx8XG4gICAgICAgICAgICAgICAgICB0eXBlb2YgdmFyVmFsdWUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShuYW1lTm9kZS50ZXh0LCB2YXJWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGV4cG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lUmVmZXJlbmNlKFxuICAgICAgICAgICAgICAgICAgICAgIG5hbWVOb2RlLnRleHQsIHtfX3N5bWJvbGljOiAncmVmZXJlbmNlJywgbmFtZTogbmFtZU5vZGUudGV4dH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIGlmICghZXhwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFyVmFsdWUgJiYgIWlzTWV0YWRhdGFFcnJvcih2YXJWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUobmFtZU5vZGUudGV4dCwgcmVjb3JkRW50cnkodmFyVmFsdWUsIG5vZGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lTm9kZS50ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgIHJlY29yZEVudHJ5KFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvclN5bSgnUmVmZXJlbmNlIHRvIGEgbG9jYWwgc3ltYm9sJywgbmFtZU5vZGUsIHtuYW1lOiBuYW1lTm9kZS50ZXh0fSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIERlc3RydWN0dXJpbmcgKG9yIGJpbmRpbmcpIGRlY2xhcmF0aW9ucyBhcmUgbm90IHN1cHBvcnRlZCxcbiAgICAgICAgICAgICAgLy8gdmFyIHs8aWRlbnRpZmllcj5bLCA8aWRlbnRpZmllcj5dK30gPSA8ZXhwcmVzc2lvbj47XG4gICAgICAgICAgICAgIC8vICAgb3JcbiAgICAgICAgICAgICAgLy8gdmFyIFs8aWRlbnRpZmllcj5bLCA8aWRlbnRpZmllcn0rXSA9IDxleHByZXNzaW9uPjtcbiAgICAgICAgICAgICAgLy8gYXJlIG5vdCBzdXBwb3J0ZWQuXG4gICAgICAgICAgICAgIGNvbnN0IHJlcG9ydDogKG5hbWVOb2RlOiB0cy5Ob2RlKSA9PiB2b2lkID0gKG5hbWVOb2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChuYW1lTm9kZS5raW5kKSB7XG4gICAgICAgICAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IDx0cy5JZGVudGlmaWVyPm5hbWVOb2RlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YXJWYWx1ZSA9IGVycm9yU3ltKCdEZXN0cnVjdHVyaW5nIG5vdCBzdXBwb3J0ZWQnLCBuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShuYW1lLnRleHQsIHZhclZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRXhwb3J0KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lLnRleHRdID0gdmFyVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQmluZGluZ0VsZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJpbmRpbmdFbGVtZW50ID0gPHRzLkJpbmRpbmdFbGVtZW50Pm5hbWVOb2RlO1xuICAgICAgICAgICAgICAgICAgICByZXBvcnQoYmluZGluZ0VsZW1lbnQubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk9iamVjdEJpbmRpbmdQYXR0ZXJuOlxuICAgICAgICAgICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkFycmF5QmluZGluZ1BhdHRlcm46XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJpbmRpbmdzID0gPHRzLkJpbmRpbmdQYXR0ZXJuPm5hbWVOb2RlO1xuICAgICAgICAgICAgICAgICAgICAoYmluZGluZ3MgYXMgYW55KS5lbGVtZW50cy5mb3JFYWNoKHJlcG9ydCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcmVwb3J0KHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKG1ldGFkYXRhIHx8IGV4cG9ydHMpIHtcbiAgICAgIGlmICghbWV0YWRhdGEpXG4gICAgICAgIG1ldGFkYXRhID0ge307XG4gICAgICBlbHNlIGlmIChzdHJpY3QpIHtcbiAgICAgICAgdmFsaWRhdGVNZXRhZGF0YShzb3VyY2VGaWxlLCBub2RlTWFwLCBtZXRhZGF0YSk7XG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQ6IE1vZHVsZU1ldGFkYXRhID0ge1xuICAgICAgICBfX3N5bWJvbGljOiAnbW9kdWxlJyxcbiAgICAgICAgdmVyc2lvbjogdGhpcy5vcHRpb25zLnZlcnNpb24gfHwgTUVUQURBVEFfVkVSU0lPTixcbiAgICAgICAgbWV0YWRhdGFcbiAgICAgIH07XG4gICAgICBpZiAoc291cmNlRmlsZS5tb2R1bGVOYW1lKSByZXN1bHQuaW1wb3J0QXMgPSBzb3VyY2VGaWxlLm1vZHVsZU5hbWU7XG4gICAgICBpZiAoZXhwb3J0cykgcmVzdWx0LmV4cG9ydHMgPSBleHBvcnRzO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyB3aWxsIHRocm93IGlmIHRoZSBtZXRhZGF0YSBlbnRyeSBnaXZlbiBjb250YWlucyBhbiBlcnJvciBub2RlLlxuZnVuY3Rpb24gdmFsaWRhdGVNZXRhZGF0YShcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBub2RlTWFwOiBNYXA8TWV0YWRhdGFFbnRyeSwgdHMuTm9kZT4sXG4gICAgbWV0YWRhdGE6IHtbbmFtZTogc3RyaW5nXTogTWV0YWRhdGFFbnRyeX0pIHtcbiAgbGV0IGxvY2FsczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KFsnQXJyYXknLCAnT2JqZWN0JywgJ1NldCcsICdNYXAnLCAnc3RyaW5nJywgJ251bWJlcicsICdhbnknXSk7XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVFeHByZXNzaW9uKGV4cHJlc3Npb246IE1ldGFkYXRhVmFsdWV8TWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb258TWV0YWRhdGFFcnJvcikge1xuICAgIGlmICghZXhwcmVzc2lvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShleHByZXNzaW9uKSkge1xuICAgICAgZXhwcmVzc2lvbi5mb3JFYWNoKHZhbGlkYXRlRXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwcmVzc2lvbiA9PT0gJ29iamVjdCcgJiYgIWV4cHJlc3Npb24uaGFzT3duUHJvcGVydHkoJ19fc3ltYm9saWMnKSkge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZXhwcmVzc2lvbikuZm9yRWFjaCh2ID0+IHZhbGlkYXRlRXhwcmVzc2lvbigoPGFueT5leHByZXNzaW9uKVt2XSkpO1xuICAgIH0gZWxzZSBpZiAoaXNNZXRhZGF0YUVycm9yKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXBvcnRFcnJvcihleHByZXNzaW9uKTtcbiAgICB9IGVsc2UgaWYgKGlzTWV0YWRhdGFHbG9iYWxSZWZlcmVuY2VFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICBpZiAoIWxvY2Fscy5oYXMoZXhwcmVzc2lvbi5uYW1lKSkge1xuICAgICAgICBjb25zdCByZWZlcmVuY2UgPSA8TWV0YWRhdGFWYWx1ZT5tZXRhZGF0YVtleHByZXNzaW9uLm5hbWVdO1xuICAgICAgICBpZiAocmVmZXJlbmNlKSB7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKHJlZmVyZW5jZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb25NZXRhZGF0YShleHByZXNzaW9uKSkge1xuICAgICAgdmFsaWRhdGVGdW5jdGlvbig8YW55PmV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSBpZiAoaXNNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgc3dpdGNoIChleHByZXNzaW9uLl9fc3ltYm9saWMpIHtcbiAgICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgICBjb25zdCBiaW5hcnlFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNCaW5hcnlFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGJpbmFyeUV4cHJlc3Npb24ubGVmdCk7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjYWxsJzpcbiAgICAgICAgY2FzZSAnbmV3JzpcbiAgICAgICAgICBjb25zdCBjYWxsRXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljQ2FsbEV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oY2FsbEV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgICAgICAgaWYgKGNhbGxFeHByZXNzaW9uLmFyZ3VtZW50cykgY2FsbEV4cHJlc3Npb24uYXJndW1lbnRzLmZvckVhY2godmFsaWRhdGVFeHByZXNzaW9uKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaW5kZXgnOlxuICAgICAgICAgIGNvbnN0IGluZGV4RXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljSW5kZXhFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGluZGV4RXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oaW5kZXhFeHByZXNzaW9uLmluZGV4KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncHJlJzpcbiAgICAgICAgICBjb25zdCBwcmVmaXhFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNQcmVmaXhFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKHByZWZpeEV4cHJlc3Npb24ub3BlcmFuZCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICAgICAgY29uc3Qgc2VsZWN0RXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihzZWxlY3RFeHByZXNzaW9uLmV4cHJlc3Npb24pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzcHJlYWQnOlxuICAgICAgICAgIGNvbnN0IHNwcmVhZEV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY1NwcmVhZEV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oc3ByZWFkRXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnaWYnOlxuICAgICAgICAgIGNvbnN0IGlmRXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljSWZFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGlmRXhwcmVzc2lvbi5jb25kaXRpb24pO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihpZkV4cHJlc3Npb24uZWxzZUV4cHJlc3Npb24pO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihpZkV4cHJlc3Npb24udGhlbkV4cHJlc3Npb24pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlTWVtYmVyKGNsYXNzRGF0YTogQ2xhc3NNZXRhZGF0YSwgbWVtYmVyOiBNZW1iZXJNZXRhZGF0YSkge1xuICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycykge1xuICAgICAgbWVtYmVyLmRlY29yYXRvcnMuZm9yRWFjaCh2YWxpZGF0ZUV4cHJlc3Npb24pO1xuICAgIH1cbiAgICBpZiAoaXNNZXRob2RNZXRhZGF0YShtZW1iZXIpICYmIG1lbWJlci5wYXJhbWV0ZXJEZWNvcmF0b3JzKSB7XG4gICAgICBtZW1iZXIucGFyYW1ldGVyRGVjb3JhdG9ycy5mb3JFYWNoKHZhbGlkYXRlRXhwcmVzc2lvbik7XG4gICAgfVxuICAgIC8vIE9ubHkgdmFsaWRhdGUgcGFyYW1ldGVycyBvZiBjbGFzc2VzIGZvciB3aGljaCB3ZSBrbm93IHRoYXQgYXJlIHVzZWQgd2l0aCBvdXIgRElcbiAgICBpZiAoY2xhc3NEYXRhLmRlY29yYXRvcnMgJiYgaXNDb25zdHJ1Y3Rvck1ldGFkYXRhKG1lbWJlcikgJiYgbWVtYmVyLnBhcmFtZXRlcnMpIHtcbiAgICAgIG1lbWJlci5wYXJhbWV0ZXJzLmZvckVhY2godmFsaWRhdGVFeHByZXNzaW9uKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZUNsYXNzKGNsYXNzRGF0YTogQ2xhc3NNZXRhZGF0YSkge1xuICAgIGlmIChjbGFzc0RhdGEuZGVjb3JhdG9ycykge1xuICAgICAgY2xhc3NEYXRhLmRlY29yYXRvcnMuZm9yRWFjaCh2YWxpZGF0ZUV4cHJlc3Npb24pO1xuICAgIH1cbiAgICBpZiAoY2xhc3NEYXRhLm1lbWJlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNsYXNzRGF0YS5tZW1iZXJzKVxuICAgICAgICAgIC5mb3JFYWNoKG5hbWUgPT4gY2xhc3NEYXRhLm1lbWJlcnMhW25hbWVdLmZvckVhY2goKG0pID0+IHZhbGlkYXRlTWVtYmVyKGNsYXNzRGF0YSwgbSkpKTtcbiAgICB9XG4gICAgaWYgKGNsYXNzRGF0YS5zdGF0aWNzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbGFzc0RhdGEuc3RhdGljcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdGljTWVtYmVyID0gY2xhc3NEYXRhLnN0YXRpY3MhW25hbWVdO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbk1ldGFkYXRhKHN0YXRpY01lbWJlcikpIHtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oc3RhdGljTWVtYmVyLnZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oc3RhdGljTWVtYmVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVGdW5jdGlvbihmdW5jdGlvbkRlY2xhcmF0aW9uOiBGdW5jdGlvbk1ldGFkYXRhKSB7XG4gICAgaWYgKGZ1bmN0aW9uRGVjbGFyYXRpb24udmFsdWUpIHtcbiAgICAgIGNvbnN0IG9sZExvY2FscyA9IGxvY2FscztcbiAgICAgIGlmIChmdW5jdGlvbkRlY2xhcmF0aW9uLnBhcmFtZXRlcnMpIHtcbiAgICAgICAgbG9jYWxzID0gbmV3IFNldChvbGRMb2NhbHMudmFsdWVzKCkpO1xuICAgICAgICBpZiAoZnVuY3Rpb25EZWNsYXJhdGlvbi5wYXJhbWV0ZXJzKVxuICAgICAgICAgIGZ1bmN0aW9uRGVjbGFyYXRpb24ucGFyYW1ldGVycy5mb3JFYWNoKG4gPT4gbG9jYWxzLmFkZChuKSk7XG4gICAgICB9XG4gICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oZnVuY3Rpb25EZWNsYXJhdGlvbi52YWx1ZSk7XG4gICAgICBsb2NhbHMgPSBvbGRMb2NhbHM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkUmVwb3J0Tm9kZShub2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCkge1xuICAgIGlmIChub2RlKSB7XG4gICAgICBjb25zdCBub2RlU3RhcnQgPSBub2RlLmdldFN0YXJ0KCk7XG4gICAgICByZXR1cm4gIShcbiAgICAgICAgICBub2RlLnBvcyAhPSBub2RlU3RhcnQgJiZcbiAgICAgICAgICBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKG5vZGUucG9zLCBub2RlU3RhcnQpLmluZGV4T2YoJ0BkeW5hbWljJykgPj0gMCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwb3J0RXJyb3IoZXJyb3I6IE1ldGFkYXRhRXJyb3IpIHtcbiAgICBjb25zdCBub2RlID0gbm9kZU1hcC5nZXQoZXJyb3IpO1xuICAgIGlmIChzaG91bGRSZXBvcnROb2RlKG5vZGUpKSB7XG4gICAgICBjb25zdCBsaW5lSW5mbyA9IGVycm9yLmxpbmUgIT0gdW5kZWZpbmVkID8gZXJyb3IuY2hhcmFjdGVyICE9IHVuZGVmaW5lZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDoke2Vycm9yLmxpbmUgKyAxfToke2Vycm9yLmNoYXJhY3RlciArIDF9YCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDoke2Vycm9yLmxpbmUgKyAxfWAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcnO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3NvdXJjZUZpbGUuZmlsZU5hbWV9JHtcbiAgICAgICAgICBsaW5lSW5mb306IE1ldGFkYXRhIGNvbGxlY3RlZCBjb250YWlucyBhbiBlcnJvciB0aGF0IHdpbGwgYmUgcmVwb3J0ZWQgYXQgcnVudGltZTogJHtcbiAgICAgICAgICBleHBhbmRlZE1lc3NhZ2UoZXJyb3IpfS5cXG4gICR7SlNPTi5zdHJpbmdpZnkoZXJyb3IpfWApO1xuICAgIH1cbiAgfVxuXG4gIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1ldGFkYXRhKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgIGNvbnN0IGVudHJ5ID0gbWV0YWRhdGFbbmFtZV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChpc0NsYXNzTWV0YWRhdGEoZW50cnkpKSB7XG4gICAgICAgIHZhbGlkYXRlQ2xhc3MoZW50cnkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBub2RlTWFwLmdldChlbnRyeSk7XG4gICAgICBpZiAoc2hvdWxkUmVwb3J0Tm9kZShub2RlKSkge1xuICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID0gc291cmNlRmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihub2RlLmdldFN0YXJ0KCkpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtzb3VyY2VGaWxlLmZpbGVOYW1lfToke2xpbmUgKyAxfToke1xuICAgICAgICAgICAgICBjaGFyYWN0ZXIgKyAxfTogRXJyb3IgZW5jb3VudGVyZWQgaW4gbWV0YWRhdGEgZ2VuZXJhdGVkIGZvciBleHBvcnRlZCBzeW1ib2wgJyR7XG4gICAgICAgICAgICAgIG5hbWV9JzogXFxuICR7ZS5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBFcnJvciBlbmNvdW50ZXJlZCBpbiBtZXRhZGF0YSBnZW5lcmF0ZWQgZm9yIGV4cG9ydGVkIHN5bWJvbCAke25hbWV9OiBcXG4gJHtlLm1lc3NhZ2V9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuLy8gQ29sbGVjdCBwYXJhbWV0ZXIgbmFtZXMgZnJvbSBhIGZ1bmN0aW9uLlxuZnVuY3Rpb24gbmFtZXNPZihwYXJhbWV0ZXJzOiB0cy5Ob2RlQXJyYXk8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24+KTogc3RyaW5nW10ge1xuICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gW107XG5cbiAgZnVuY3Rpb24gYWRkTmFtZXNPZihuYW1lOiB0cy5JZGVudGlmaWVyfHRzLkJpbmRpbmdQYXR0ZXJuKSB7XG4gICAgaWYgKG5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgIGNvbnN0IGlkZW50aWZpZXIgPSA8dHMuSWRlbnRpZmllcj5uYW1lO1xuICAgICAgcmVzdWx0LnB1c2goaWRlbnRpZmllci50ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYmluZGluZ1BhdHRlcm4gPSA8dHMuQmluZGluZ1BhdHRlcm4+bmFtZTtcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBiaW5kaW5nUGF0dGVybi5lbGVtZW50cykge1xuICAgICAgICBjb25zdCBuYW1lID0gKGVsZW1lbnQgYXMgYW55KS5uYW1lO1xuICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgIGFkZE5hbWVzT2YobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHBhcmFtZXRlciBvZiBwYXJhbWV0ZXJzKSB7XG4gICAgYWRkTmFtZXNPZihwYXJhbWV0ZXIubmFtZSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzaG91bGRJZ25vcmVTdGF0aWNNZW1iZXIobWVtYmVyTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBtZW1iZXJOYW1lLnN0YXJ0c1dpdGgoJ25nQWNjZXB0SW5wdXRUeXBlXycpIHx8IG1lbWJlck5hbWUuc3RhcnRzV2l0aCgnbmdUZW1wbGF0ZUd1YXJkXycpO1xufVxuXG5mdW5jdGlvbiBleHBhbmRlZE1lc3NhZ2UoZXJyb3I6IGFueSk6IHN0cmluZyB7XG4gIHN3aXRjaCAoZXJyb3IubWVzc2FnZSkge1xuICAgIGNhc2UgJ1JlZmVyZW5jZSB0byBub24tZXhwb3J0ZWQgY2xhc3MnOlxuICAgICAgaWYgKGVycm9yLmNvbnRleHQgJiYgZXJyb3IuY29udGV4dC5jbGFzc05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGBSZWZlcmVuY2UgdG8gYSBub24tZXhwb3J0ZWQgY2xhc3MgJHtcbiAgICAgICAgICAgIGVycm9yLmNvbnRleHQuY2xhc3NOYW1lfS4gQ29uc2lkZXIgZXhwb3J0aW5nIHRoZSBjbGFzc2A7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdWYXJpYWJsZSBub3QgaW5pdGlhbGl6ZWQnOlxuICAgICAgcmV0dXJuICdPbmx5IGluaXRpYWxpemVkIHZhcmlhYmxlcyBhbmQgY29uc3RhbnRzIGNhbiBiZSByZWZlcmVuY2VkIGJlY2F1c2UgdGhlIHZhbHVlIG9mIHRoaXMgdmFyaWFibGUgaXMgbmVlZGVkIGJ5IHRoZSB0ZW1wbGF0ZSBjb21waWxlcic7XG4gICAgY2FzZSAnRGVzdHJ1Y3R1cmluZyBub3Qgc3VwcG9ydGVkJzpcbiAgICAgIHJldHVybiAnUmVmZXJlbmNpbmcgYW4gZXhwb3J0ZWQgZGVzdHJ1Y3R1cmVkIHZhcmlhYmxlIG9yIGNvbnN0YW50IGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIHRlbXBsYXRlIGNvbXBpbGVyLiBDb25zaWRlciBzaW1wbGlmeWluZyB0aGlzIHRvIGF2b2lkIGRlc3RydWN0dXJpbmcnO1xuICAgIGNhc2UgJ0NvdWxkIG5vdCByZXNvbHZlIHR5cGUnOlxuICAgICAgaWYgKGVycm9yLmNvbnRleHQgJiYgZXJyb3IuY29udGV4dC50eXBlTmFtZSkge1xuICAgICAgICByZXR1cm4gYENvdWxkIG5vdCByZXNvbHZlIHR5cGUgJHtlcnJvci5jb250ZXh0LnR5cGVOYW1lfWA7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdGdW5jdGlvbiBjYWxsIG5vdCBzdXBwb3J0ZWQnOlxuICAgICAgbGV0IHByZWZpeCA9XG4gICAgICAgICAgZXJyb3IuY29udGV4dCAmJiBlcnJvci5jb250ZXh0Lm5hbWUgPyBgQ2FsbGluZyBmdW5jdGlvbiAnJHtlcnJvci5jb250ZXh0Lm5hbWV9JywgZmAgOiAnRic7XG4gICAgICByZXR1cm4gcHJlZml4ICtcbiAgICAgICAgICAndW5jdGlvbiBjYWxscyBhcmUgbm90IHN1cHBvcnRlZC4gQ29uc2lkZXIgcmVwbGFjaW5nIHRoZSBmdW5jdGlvbiBvciBsYW1iZGEgd2l0aCBhIHJlZmVyZW5jZSB0byBhbiBleHBvcnRlZCBmdW5jdGlvbic7XG4gICAgY2FzZSAnUmVmZXJlbmNlIHRvIGEgbG9jYWwgc3ltYm9sJzpcbiAgICAgIGlmIChlcnJvci5jb250ZXh0ICYmIGVycm9yLmNvbnRleHQubmFtZSkge1xuICAgICAgICByZXR1cm4gYFJlZmVyZW5jZSB0byBhIGxvY2FsIChub24tZXhwb3J0ZWQpIHN5bWJvbCAnJHtcbiAgICAgICAgICAgIGVycm9yLmNvbnRleHQubmFtZX0nLiBDb25zaWRlciBleHBvcnRpbmcgdGhlIHN5bWJvbGA7XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG59XG4iXX0=