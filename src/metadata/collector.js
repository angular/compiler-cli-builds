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
            var exportedName = function (node) { return exportedIdentifierName(node.name); };
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
                                metadata[name] = maybeFunc ? recordEntry(maybeFunc.func, node) :
                                    { __symbolic: 'function' };
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
                                                expression: recordEntry({ __symbolic: 'reference', name: enumName }, node), name: name
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
                    version: this.options.version || schema_1.METADATA_VERSION, metadata: metadata
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
                var lineInfo = error.line != undefined ?
                    error.character != undefined ? ":" + (error.line + 1) + ":" + (error.character + 1) :
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9tZXRhZGF0YS9jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLDBFQUFtRTtJQUNuRSxvRUFBdTFCO0lBQ3YxQixzRUFBa0M7SUFFbEMsSUFBTSxRQUFRLEdBQUcsVUFBQyxJQUFvQjtRQUNsQyxPQUFBLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU07SUFBM0QsQ0FBMkQsQ0FBQztJQTRCaEU7O09BRUc7SUFDSDtRQUNFLDJCQUFvQixPQUE4QjtZQUE5Qix3QkFBQSxFQUFBLFlBQThCO1lBQTlCLFlBQU8sR0FBUCxPQUFPLENBQXVCO1FBQUcsQ0FBQztRQUV0RDs7O1dBR0c7UUFDSSx1Q0FBVyxHQUFsQixVQUNJLFVBQXlCLEVBQUUsTUFBdUIsRUFDbEQsb0JBQTZFO1lBRmpGLGlCQThmQztZQTdmOEIsdUJBQUEsRUFBQSxjQUF1QjtZQUdwRCxJQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkMsSUFBTSxPQUFPLEdBQ1QsSUFBSSxHQUFHLEVBQTJFLENBQUM7WUFDdkYsSUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ25GLFVBQUMsS0FBb0IsRUFBRSxJQUFhO29CQUNoQyxPQUFBLEtBQUksQ0FBQyxPQUFPLENBQUMsb0JBQXNCLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQztnQkFBNUUsQ0FBNEUsQ0FBQyxDQUFDO2dCQUNsRixvQkFBb0IsQ0FBQztZQUN6QixJQUFNLGdCQUFn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TSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQzlGLE9BQU8sTUFBTTtvQkFDVCxxSEFBcUgsQ0FBQztZQUM1SCxLQUFLLDZCQUE2QjtnQkFDaEMsSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFO29CQUN2QyxPQUFPLGlEQUErQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUkscUNBQWtDLENBQUM7aUJBQzVHO1NBQ0o7UUFDRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDdkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXZhbHVhdG9yLCBlcnJvclN5bWJvbCwgcmVjb3JkTWFwRW50cnl9IGZyb20gJy4vZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NNZXRhZGF0YSwgQ29uc3RydWN0b3JNZXRhZGF0YSwgRnVuY3Rpb25NZXRhZGF0YSwgSW50ZXJmYWNlTWV0YWRhdGEsIE1FVEFEQVRBX1ZFUlNJT04sIE1lbWJlck1ldGFkYXRhLCBNZXRhZGF0YUVudHJ5LCBNZXRhZGF0YUVycm9yLCBNZXRhZGF0YU1hcCwgTWV0YWRhdGFTeW1ib2xpY0JpbmFyeUV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNDYWxsRXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNJZkV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNJbmRleEV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNQcmVmaXhFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNTcHJlYWRFeHByZXNzaW9uLCBNZXRhZGF0YVZhbHVlLCBNZXRob2RNZXRhZGF0YSwgTW9kdWxlRXhwb3J0TWV0YWRhdGEsIE1vZHVsZU1ldGFkYXRhLCBpc0NsYXNzTWV0YWRhdGEsIGlzQ29uc3RydWN0b3JNZXRhZGF0YSwgaXNGdW5jdGlvbk1ldGFkYXRhLCBpc01ldGFkYXRhRXJyb3IsIGlzTWV0YWRhdGFHbG9iYWxSZWZlcmVuY2VFeHByZXNzaW9uLCBpc01ldGFkYXRhSW1wb3J0RGVmYXVsdFJlZmVyZW5jZSwgaXNNZXRhZGF0YUltcG9ydGVkU3ltYm9sUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbiwgaXNNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbiwgaXNNZXRob2RNZXRhZGF0YX0gZnJvbSAnLi9zY2hlbWEnO1xuaW1wb3J0IHtTeW1ib2xzfSBmcm9tICcuL3N5bWJvbHMnO1xuXG5jb25zdCBpc1N0YXRpYyA9IChub2RlOiB0cy5EZWNsYXJhdGlvbikgPT5cbiAgICB0cy5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSkgJiB0cy5Nb2RpZmllckZsYWdzLlN0YXRpYztcblxuLyoqXG4gKiBBIHNldCBvZiBjb2xsZWN0b3Igb3B0aW9ucyB0byB1c2Ugd2hlbiBjb2xsZWN0aW5nIG1ldGFkYXRhLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbGxlY3Rvck9wdGlvbnMge1xuICAvKipcbiAgICogVmVyc2lvbiBvZiB0aGUgbWV0YWRhdGEgdG8gY29sbGVjdC5cbiAgICovXG4gIHZlcnNpb24/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgYSBoaWRkZW4gZmllbGQgXCIkcXVvdGVkJFwiIGluIG9iamVjdHMgbGl0ZXJhbHMgdGhhdCByZWNvcmQgd2hlbiB0aGUga2V5IHdhcyBxdW90ZWQgaW5cbiAgICogdGhlIHNvdXJjZS5cbiAgICovXG4gIHF1b3RlZE5hbWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRG8gbm90IHNpbXBsaWZ5IGludmFsaWQgZXhwcmVzc2lvbnMuXG4gICAqL1xuICB2ZXJib3NlSW52YWxpZEV4cHJlc3Npb24/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBbiBleHByZXNzaW9uIHN1YnN0aXR1dGlvbiBjYWxsYmFjay5cbiAgICovXG4gIHN1YnN0aXR1dGVFeHByZXNzaW9uPzogKHZhbHVlOiBNZXRhZGF0YVZhbHVlLCBub2RlOiB0cy5Ob2RlKSA9PiBNZXRhZGF0YVZhbHVlO1xufVxuXG4vKipcbiAqIENvbGxlY3QgZGVjb3JhdG9yIG1ldGFkYXRhIGZyb20gYSBUeXBlU2NyaXB0IG1vZHVsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE1ldGFkYXRhQ29sbGVjdG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBvcHRpb25zOiBDb2xsZWN0b3JPcHRpb25zID0ge30pIHt9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBKU09OLnN0cmluZ2lmeSBmcmllbmRseSBmb3JtIGRlc2NyaWJpbmcgdGhlIGRlY29yYXRvcnMgb2YgdGhlIGV4cG9ydGVkIGNsYXNzZXMgZnJvbVxuICAgKiB0aGUgc291cmNlIGZpbGUgdGhhdCBpcyBleHBlY3RlZCB0byBjb3JyZXNwb25kIHRvIGEgbW9kdWxlLlxuICAgKi9cbiAgcHVibGljIGdldE1ldGFkYXRhKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgc3RyaWN0OiBib29sZWFuID0gZmFsc2UsXG4gICAgICBzdWJzdGl0dXRlRXhwcmVzc2lvbj86ICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSkgPT4gTWV0YWRhdGFWYWx1ZSk6IE1vZHVsZU1ldGFkYXRhXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBsb2NhbHMgPSBuZXcgU3ltYm9scyhzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBub2RlTWFwID1cbiAgICAgICAgbmV3IE1hcDxNZXRhZGF0YVZhbHVlfENsYXNzTWV0YWRhdGF8SW50ZXJmYWNlTWV0YWRhdGF8RnVuY3Rpb25NZXRhZGF0YSwgdHMuTm9kZT4oKTtcbiAgICBjb25zdCBjb21wb3NlZFN1YnN0aXR1dGVyID0gc3Vic3RpdHV0ZUV4cHJlc3Npb24gJiYgdGhpcy5vcHRpb25zLnN1YnN0aXR1dGVFeHByZXNzaW9uID9cbiAgICAgICAgKHZhbHVlOiBNZXRhZGF0YVZhbHVlLCBub2RlOiB0cy5Ob2RlKSA9PlxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnN1YnN0aXR1dGVFeHByZXNzaW9uICEoc3Vic3RpdHV0ZUV4cHJlc3Npb24odmFsdWUsIG5vZGUpLCBub2RlKSA6XG4gICAgICAgIHN1YnN0aXR1dGVFeHByZXNzaW9uO1xuICAgIGNvbnN0IGV2YWx1YXRvck9wdGlvbnMgPSBzdWJzdGl0dXRlRXhwcmVzc2lvbiA/XG4gICAgICAgIHsuLi50aGlzLm9wdGlvbnMsIHN1YnN0aXR1dGVFeHByZXNzaW9uOiBjb21wb3NlZFN1YnN0aXR1dGVyfSA6XG4gICAgICAgIHRoaXMub3B0aW9ucztcbiAgICBsZXQgbWV0YWRhdGE6IHtbbmFtZTogc3RyaW5nXTogTWV0YWRhdGFWYWx1ZSB8IENsYXNzTWV0YWRhdGEgfCBGdW5jdGlvbk1ldGFkYXRhfXx1bmRlZmluZWQ7XG4gICAgY29uc3QgZXZhbHVhdG9yID0gbmV3IEV2YWx1YXRvcihsb2NhbHMsIG5vZGVNYXAsIGV2YWx1YXRvck9wdGlvbnMsIChuYW1lLCB2YWx1ZSkgPT4ge1xuICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgIG1ldGFkYXRhW25hbWVdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgbGV0IGV4cG9ydHM6IE1vZHVsZUV4cG9ydE1ldGFkYXRhW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgZnVuY3Rpb24gb2JqRnJvbURlY29yYXRvcihkZWNvcmF0b3JOb2RlOiB0cy5EZWNvcmF0b3IpOiBNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbiB7XG4gICAgICByZXR1cm4gPE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uPmV2YWx1YXRvci5ldmFsdWF0ZU5vZGUoZGVjb3JhdG9yTm9kZS5leHByZXNzaW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWNvcmRFbnRyeTxUIGV4dGVuZHMgTWV0YWRhdGFFbnRyeT4oZW50cnk6IFQsIG5vZGU6IHRzLk5vZGUpOiBUIHtcbiAgICAgIGlmIChjb21wb3NlZFN1YnN0aXR1dGVyKSB7XG4gICAgICAgIGVudHJ5ID0gY29tcG9zZWRTdWJzdGl0dXRlcihlbnRyeSBhcyBNZXRhZGF0YVZhbHVlLCBub2RlKSBhcyBUO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlY29yZE1hcEVudHJ5KGVudHJ5LCBub2RlLCBub2RlTWFwLCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlcnJvclN5bShcbiAgICAgICAgbWVzc2FnZTogc3RyaW5nLCBub2RlPzogdHMuTm9kZSwgY29udGV4dD86IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSk6IE1ldGFkYXRhRXJyb3Ige1xuICAgICAgcmV0dXJuIGVycm9yU3ltYm9sKG1lc3NhZ2UsIG5vZGUsIGNvbnRleHQsIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1heWJlR2V0U2ltcGxlRnVuY3Rpb24oXG4gICAgICAgIGZ1bmN0aW9uRGVjbGFyYXRpb246IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24gfFxuICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbik6IHtmdW5jOiBGdW5jdGlvbk1ldGFkYXRhLCBuYW1lOiBzdHJpbmd9fHVuZGVmaW5lZCB7XG4gICAgICBpZiAoZnVuY3Rpb25EZWNsYXJhdGlvbi5uYW1lICYmIGZ1bmN0aW9uRGVjbGFyYXRpb24ubmFtZS5raW5kID09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICBjb25zdCBuYW1lTm9kZSA9IDx0cy5JZGVudGlmaWVyPmZ1bmN0aW9uRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgICAgY29uc3QgZnVuY3Rpb25OYW1lID0gbmFtZU5vZGUudGV4dDtcbiAgICAgICAgY29uc3QgZnVuY3Rpb25Cb2R5ID0gZnVuY3Rpb25EZWNsYXJhdGlvbi5ib2R5O1xuICAgICAgICBpZiAoZnVuY3Rpb25Cb2R5ICYmIGZ1bmN0aW9uQm9keS5zdGF0ZW1lbnRzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGVtZW50ID0gZnVuY3Rpb25Cb2R5LnN0YXRlbWVudHNbMF07XG4gICAgICAgICAgaWYgKHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLlJldHVyblN0YXRlbWVudCkge1xuICAgICAgICAgICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gPHRzLlJldHVyblN0YXRlbWVudD5zdGF0ZW1lbnQ7XG4gICAgICAgICAgICBpZiAocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgICAgY29uc3QgZnVuYzogRnVuY3Rpb25NZXRhZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBfX3N5bWJvbGljOiAnZnVuY3Rpb24nLFxuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnM6IG5hbWVzT2YoZnVuY3Rpb25EZWNsYXJhdGlvbi5wYXJhbWV0ZXJzKSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShyZXR1cm5TdGF0ZW1lbnQuZXhwcmVzc2lvbilcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgaWYgKGZ1bmN0aW9uRGVjbGFyYXRpb24ucGFyYW1ldGVycy5zb21lKHAgPT4gcC5pbml0aWFsaXplciAhPSBudWxsKSkge1xuICAgICAgICAgICAgICAgIGZ1bmMuZGVmYXVsdHMgPSBmdW5jdGlvbkRlY2xhcmF0aW9uLnBhcmFtZXRlcnMubWFwKFxuICAgICAgICAgICAgICAgICAgICBwID0+IHAuaW5pdGlhbGl6ZXIgJiYgZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShwLmluaXRpYWxpemVyKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZEVudHJ5KHtmdW5jLCBuYW1lOiBmdW5jdGlvbk5hbWV9LCBmdW5jdGlvbkRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGFzc01ldGFkYXRhT2YoY2xhc3NEZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWV0YWRhdGEge1xuICAgICAgY29uc3QgcmVzdWx0OiBDbGFzc01ldGFkYXRhID0ge19fc3ltYm9saWM6ICdjbGFzcyd9O1xuXG4gICAgICBmdW5jdGlvbiBnZXREZWNvcmF0b3JzKGRlY29yYXRvcnM6IFJlYWRvbmx5QXJyYXk8dHMuRGVjb3JhdG9yPnwgdW5kZWZpbmVkKTpcbiAgICAgICAgICBNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbltdfHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzICYmIGRlY29yYXRvcnMubGVuZ3RoKVxuICAgICAgICAgIHJldHVybiBkZWNvcmF0b3JzLm1hcChkZWNvcmF0b3IgPT4gb2JqRnJvbURlY29yYXRvcihkZWNvcmF0b3IpKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVmZXJlbmNlRnJvbShub2RlOiB0cy5Ob2RlKTogTWV0YWRhdGFTeW1ib2xpY1JlZmVyZW5jZUV4cHJlc3Npb258TWV0YWRhdGFFcnJvcnxcbiAgICAgICAgICBNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUobm9kZSk7XG4gICAgICAgIGlmIChpc01ldGFkYXRhRXJyb3IocmVzdWx0KSB8fCBpc01ldGFkYXRhU3ltYm9saWNSZWZlcmVuY2VFeHByZXNzaW9uKHJlc3VsdCkgfHxcbiAgICAgICAgICAgIGlzTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24ocmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yU3ltKCdTeW1ib2wgcmVmZXJlbmNlIGV4cGVjdGVkJywgbm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQWRkIGNsYXNzIHBhcmVudHNcbiAgICAgIGlmIChjbGFzc0RlY2xhcmF0aW9uLmhlcml0YWdlQ2xhdXNlcykge1xuICAgICAgICBjbGFzc0RlY2xhcmF0aW9uLmhlcml0YWdlQ2xhdXNlcy5mb3JFYWNoKChoYykgPT4ge1xuICAgICAgICAgIGlmIChoYy50b2tlbiA9PT0gdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCAmJiBoYy50eXBlcykge1xuICAgICAgICAgICAgaGMudHlwZXMuZm9yRWFjaCh0eXBlID0+IHJlc3VsdC5leHRlbmRzID0gcmVmZXJlbmNlRnJvbSh0eXBlLmV4cHJlc3Npb24pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgYXJpdHkgaWYgdGhlIHR5cGUgaXMgZ2VuZXJpY1xuICAgICAgY29uc3QgdHlwZVBhcmFtZXRlcnMgPSBjbGFzc0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzO1xuICAgICAgaWYgKHR5cGVQYXJhbWV0ZXJzICYmIHR5cGVQYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgICByZXN1bHQuYXJpdHkgPSB0eXBlUGFyYW1ldGVycy5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBjbGFzcyBkZWNvcmF0b3JzXG4gICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzKSB7XG4gICAgICAgIHJlc3VsdC5kZWNvcmF0b3JzID0gZ2V0RGVjb3JhdG9ycyhjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnMpO1xuICAgICAgfVxuXG4gICAgICAvLyBtZW1iZXIgZGVjb3JhdG9yc1xuICAgICAgbGV0IG1lbWJlcnM6IE1ldGFkYXRhTWFwfG51bGwgPSBudWxsO1xuICAgICAgZnVuY3Rpb24gcmVjb3JkTWVtYmVyKG5hbWU6IHN0cmluZywgbWV0YWRhdGE6IE1lbWJlck1ldGFkYXRhKSB7XG4gICAgICAgIGlmICghbWVtYmVycykgbWVtYmVycyA9IHt9O1xuICAgICAgICBjb25zdCBkYXRhID0gbWVtYmVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSA/IG1lbWJlcnNbbmFtZV0gOiBbXTtcbiAgICAgICAgZGF0YS5wdXNoKG1ldGFkYXRhKTtcbiAgICAgICAgbWVtYmVyc1tuYW1lXSA9IGRhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIHN0YXRpYyBtZW1iZXJcbiAgICAgIGxldCBzdGF0aWNzOiB7W25hbWU6IHN0cmluZ106IE1ldGFkYXRhVmFsdWUgfCBGdW5jdGlvbk1ldGFkYXRhfXxudWxsID0gbnVsbDtcbiAgICAgIGZ1bmN0aW9uIHJlY29yZFN0YXRpY01lbWJlcihuYW1lOiBzdHJpbmcsIHZhbHVlOiBNZXRhZGF0YVZhbHVlIHwgRnVuY3Rpb25NZXRhZGF0YSkge1xuICAgICAgICBpZiAoIXN0YXRpY3MpIHN0YXRpY3MgPSB7fTtcbiAgICAgICAgc3RhdGljc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IG1lbWJlciBvZiBjbGFzc0RlY2xhcmF0aW9uLm1lbWJlcnMpIHtcbiAgICAgICAgbGV0IGlzQ29uc3RydWN0b3IgPSBmYWxzZTtcbiAgICAgICAgc3dpdGNoIChtZW1iZXIua2luZCkge1xuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Db25zdHJ1Y3RvcjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuTWV0aG9kRGVjbGFyYXRpb246XG4gICAgICAgICAgICBpc0NvbnN0cnVjdG9yID0gbWVtYmVyLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3I7XG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSA8dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbj5tZW1iZXI7XG4gICAgICAgICAgICBpZiAoaXNTdGF0aWMobWV0aG9kKSkge1xuICAgICAgICAgICAgICBjb25zdCBtYXliZUZ1bmMgPSBtYXliZUdldFNpbXBsZUZ1bmN0aW9uKDx0cy5NZXRob2REZWNsYXJhdGlvbj5tZXRob2QpO1xuICAgICAgICAgICAgICBpZiAobWF5YmVGdW5jKSB7XG4gICAgICAgICAgICAgICAgcmVjb3JkU3RhdGljTWVtYmVyKG1heWJlRnVuYy5uYW1lLCBtYXliZUZ1bmMuZnVuYyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtZXRob2REZWNvcmF0b3JzID0gZ2V0RGVjb3JhdG9ycyhtZXRob2QuZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbWV0ZXJzID0gbWV0aG9kLnBhcmFtZXRlcnM7XG4gICAgICAgICAgICBjb25zdCBwYXJhbWV0ZXJEZWNvcmF0b3JEYXRhOlxuICAgICAgICAgICAgICAgICgoTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24gfCBNZXRhZGF0YUVycm9yKVtdIHwgdW5kZWZpbmVkKVtdID0gW107XG4gICAgICAgICAgICBjb25zdCBwYXJhbWV0ZXJzRGF0YTpcbiAgICAgICAgICAgICAgICAoTWV0YWRhdGFTeW1ib2xpY1JlZmVyZW5jZUV4cHJlc3Npb24gfCBNZXRhZGF0YUVycm9yIHxcbiAgICAgICAgICAgICAgICAgTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24gfCBudWxsKVtdID0gW107XG4gICAgICAgICAgICBsZXQgaGFzRGVjb3JhdG9yRGF0YTogYm9vbGVhbiA9IGZhbHNlO1xuICAgICAgICAgICAgbGV0IGhhc1BhcmFtZXRlckRhdGE6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcGFyYW1ldGVyIG9mIHBhcmFtZXRlcnMpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGFyYW1ldGVyRGF0YSA9IGdldERlY29yYXRvcnMocGFyYW1ldGVyLmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICBwYXJhbWV0ZXJEZWNvcmF0b3JEYXRhLnB1c2gocGFyYW1ldGVyRGF0YSk7XG4gICAgICAgICAgICAgIGhhc0RlY29yYXRvckRhdGEgPSBoYXNEZWNvcmF0b3JEYXRhIHx8ICEhcGFyYW1ldGVyRGF0YTtcbiAgICAgICAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnNEYXRhLnB1c2gocmVmZXJlbmNlRnJvbShwYXJhbWV0ZXIudHlwZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzRGF0YS5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYXNQYXJhbWV0ZXJEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGF0YTogTWV0aG9kTWV0YWRhdGEgPSB7X19zeW1ib2xpYzogaXNDb25zdHJ1Y3RvciA/ICdjb25zdHJ1Y3RvcicgOiAnbWV0aG9kJ307XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gaXNDb25zdHJ1Y3RvciA/ICdfX2N0b3JfXycgOiBldmFsdWF0b3IubmFtZU9mKG1lbWJlci5uYW1lKTtcbiAgICAgICAgICAgIGlmIChtZXRob2REZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICAgIGRhdGEuZGVjb3JhdG9ycyA9IG1ldGhvZERlY29yYXRvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGFzRGVjb3JhdG9yRGF0YSkge1xuICAgICAgICAgICAgICBkYXRhLnBhcmFtZXRlckRlY29yYXRvcnMgPSBwYXJhbWV0ZXJEZWNvcmF0b3JEYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGhhc1BhcmFtZXRlckRhdGEpIHtcbiAgICAgICAgICAgICAgKDxDb25zdHJ1Y3Rvck1ldGFkYXRhPmRhdGEpLnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzRGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNNZXRhZGF0YUVycm9yKG5hbWUpKSB7XG4gICAgICAgICAgICAgIHJlY29yZE1lbWJlcihuYW1lLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Qcm9wZXJ0eURlY2xhcmF0aW9uOlxuICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5HZXRBY2Nlc3NvcjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU2V0QWNjZXNzb3I6XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IDx0cy5Qcm9wZXJ0eURlY2xhcmF0aW9uPm1lbWJlcjtcbiAgICAgICAgICAgIGlmIChpc1N0YXRpYyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV2YWx1YXRvci5uYW1lT2YocHJvcGVydHkubmFtZSk7XG4gICAgICAgICAgICAgIGlmICghaXNNZXRhZGF0YUVycm9yKG5hbWUpICYmICFzaG91bGRJZ25vcmVTdGF0aWNNZW1iZXIobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkuaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShwcm9wZXJ0eS5pbml0aWFsaXplcik7XG4gICAgICAgICAgICAgICAgICByZWNvcmRTdGF0aWNNZW1iZXIobmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZWNvcmRTdGF0aWNNZW1iZXIobmFtZSwgZXJyb3JTeW0oJ1ZhcmlhYmxlIG5vdCBpbml0aWFsaXplZCcsIHByb3BlcnR5Lm5hbWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGVjb3JhdG9ycyA9IGdldERlY29yYXRvcnMocHJvcGVydHkuZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICBpZiAocHJvcGVydHlEZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBldmFsdWF0b3IubmFtZU9mKHByb3BlcnR5Lm5hbWUpO1xuICAgICAgICAgICAgICBpZiAoIWlzTWV0YWRhdGFFcnJvcihuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJlY29yZE1lbWJlcihuYW1lLCB7X19zeW1ib2xpYzogJ3Byb3BlcnR5JywgZGVjb3JhdG9yczogcHJvcGVydHlEZWNvcmF0b3JzfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWVtYmVycykge1xuICAgICAgICByZXN1bHQubWVtYmVycyA9IG1lbWJlcnM7XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGljcykge1xuICAgICAgICByZXN1bHQuc3RhdGljcyA9IHN0YXRpY3M7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWNvcmRFbnRyeShyZXN1bHQsIGNsYXNzRGVjbGFyYXRpb24pO1xuICAgIH1cblxuICAgIC8vIENvbGxlY3QgYWxsIGV4cG9ydGVkIHN5bWJvbHMgZnJvbSBhbiBleHBvcnRzIGNsYXVzZS5cbiAgICBjb25zdCBleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBub2RlID0+IHtcbiAgICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5FeHBvcnREZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IDx0cy5FeHBvcnREZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGNvbnN0IHttb2R1bGVTcGVjaWZpZXIsIGV4cG9ydENsYXVzZX0gPSBleHBvcnREZWNsYXJhdGlvbjtcblxuICAgICAgICAgIGlmICghbW9kdWxlU3BlY2lmaWVyICYmIGV4cG9ydENsYXVzZSAmJiB0cy5pc05hbWVkRXhwb3J0cyhleHBvcnRDbGF1c2UpKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIG1vZHVsZSBzcGVjaWZpZXIgdGhlcmUgaXMgYWxzbyBhbiBleHBvcnRDbGF1c2VcbiAgICAgICAgICAgIGV4cG9ydENsYXVzZS5lbGVtZW50cy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBleHBvcnRlZEFzID0gc3BlYy5uYW1lLnRleHQ7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAoc3BlYy5wcm9wZXJ0eU5hbWUgfHwgc3BlYy5uYW1lKS50ZXh0O1xuICAgICAgICAgICAgICBleHBvcnRNYXAuc2V0KG5hbWUsIGV4cG9ydGVkQXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgaXNFeHBvcnQgPSAobm9kZTogdHMuTm9kZSkgPT4gc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fFxuICAgICAgICB0cy5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSBhcyB0cy5EZWNsYXJhdGlvbikgJiB0cy5Nb2RpZmllckZsYWdzLkV4cG9ydDtcbiAgICBjb25zdCBpc0V4cG9ydGVkSWRlbnRpZmllciA9IChpZGVudGlmaWVyPzogdHMuSWRlbnRpZmllcikgPT5cbiAgICAgICAgaWRlbnRpZmllciAmJiBleHBvcnRNYXAuaGFzKGlkZW50aWZpZXIudGV4dCk7XG4gICAgY29uc3QgaXNFeHBvcnRlZCA9XG4gICAgICAgIChub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHwgdHMuQ2xhc3NEZWNsYXJhdGlvbiB8IHRzLlR5cGVBbGlhc0RlY2xhcmF0aW9uIHxcbiAgICAgICAgIHRzLkludGVyZmFjZURlY2xhcmF0aW9uIHwgdHMuRW51bURlY2xhcmF0aW9uKSA9PlxuICAgICAgICAgICAgaXNFeHBvcnQobm9kZSkgfHwgaXNFeHBvcnRlZElkZW50aWZpZXIobm9kZS5uYW1lKTtcbiAgICBjb25zdCBleHBvcnRlZElkZW50aWZpZXJOYW1lID0gKGlkZW50aWZpZXI/OiB0cy5JZGVudGlmaWVyKSA9PlxuICAgICAgICBpZGVudGlmaWVyICYmIChleHBvcnRNYXAuZ2V0KGlkZW50aWZpZXIudGV4dCkgfHwgaWRlbnRpZmllci50ZXh0KTtcbiAgICBjb25zdCBleHBvcnRlZE5hbWUgPVxuICAgICAgICAobm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB8IHRzLkNsYXNzRGVjbGFyYXRpb24gfCB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbiB8XG4gICAgICAgICB0cy5UeXBlQWxpYXNEZWNsYXJhdGlvbiB8IHRzLkVudW1EZWNsYXJhdGlvbikgPT4gZXhwb3J0ZWRJZGVudGlmaWVyTmFtZShub2RlLm5hbWUpO1xuXG5cbiAgICAvLyBQcmUtZGVjbGFyZSBjbGFzc2VzIGFuZCBmdW5jdGlvbnNcbiAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgbm9kZSA9PiB7XG4gICAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gPHRzLkNsYXNzRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBjbGFzc0RlY2xhcmF0aW9uLm5hbWUudGV4dDtcbiAgICAgICAgICAgIGlmIChpc0V4cG9ydGVkKGNsYXNzRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUoXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWUsIHtfX3N5bWJvbGljOiAncmVmZXJlbmNlJywgbmFtZTogZXhwb3J0ZWROYW1lKGNsYXNzRGVjbGFyYXRpb24pfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKFxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lLCBlcnJvclN5bSgnUmVmZXJlbmNlIHRvIG5vbi1leHBvcnRlZCBjbGFzcycsIG5vZGUsIHtjbGFzc05hbWV9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JbnRlcmZhY2VEZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBpbnRlcmZhY2VEZWNsYXJhdGlvbiA9IDx0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmIChpbnRlcmZhY2VEZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VOYW1lID0gaW50ZXJmYWNlRGVjbGFyYXRpb24ubmFtZS50ZXh0O1xuICAgICAgICAgICAgLy8gQWxsIHJlZmVyZW5jZXMgdG8gaW50ZXJmYWNlcyBzaG91bGQgYmUgY29udmVydGVkIHRvIHJlZmVyZW5jZXMgdG8gYGFueWAuXG4gICAgICAgICAgICBsb2NhbHMuZGVmaW5lKGludGVyZmFjZU5hbWUsIHtfX3N5bWJvbGljOiAncmVmZXJlbmNlJywgbmFtZTogJ2FueSd9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgZnVuY3Rpb25EZWNsYXJhdGlvbiA9IDx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKCFpc0V4cG9ydGVkKGZ1bmN0aW9uRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBSZXBvcnQgcmVmZXJlbmNlcyB0byB0aGlzIGZ1bmN0aW9uIGFzIGFuIGVycm9yLlxuICAgICAgICAgICAgY29uc3QgbmFtZU5vZGUgPSBmdW5jdGlvbkRlY2xhcmF0aW9uLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZU5vZGUgJiYgbmFtZU5vZGUudGV4dCkge1xuICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKFxuICAgICAgICAgICAgICAgICAgbmFtZU5vZGUudGV4dCxcbiAgICAgICAgICAgICAgICAgIGVycm9yU3ltKFxuICAgICAgICAgICAgICAgICAgICAgICdSZWZlcmVuY2UgdG8gYSBub24tZXhwb3J0ZWQgZnVuY3Rpb24nLCBuYW1lTm9kZSwge25hbWU6IG5hbWVOb2RlLnRleHR9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIG5vZGUgPT4ge1xuICAgICAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkV4cG9ydERlY2xhcmF0aW9uOlxuICAgICAgICAgIC8vIFJlY29yZCBleHBvcnQgZGVjbGFyYXRpb25zXG4gICAgICAgICAgY29uc3QgZXhwb3J0RGVjbGFyYXRpb24gPSA8dHMuRXhwb3J0RGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBjb25zdCB7bW9kdWxlU3BlY2lmaWVyLCBleHBvcnRDbGF1c2V9ID0gZXhwb3J0RGVjbGFyYXRpb247XG5cbiAgICAgICAgICBpZiAoIW1vZHVsZVNwZWNpZmllcikge1xuICAgICAgICAgICAgLy8gbm8gbW9kdWxlIHNwZWNpZmllciAtPiBleHBvcnQge3Byb3BOYW1lIGFzIG5hbWV9O1xuICAgICAgICAgICAgaWYgKGV4cG9ydENsYXVzZSAmJiB0cy5pc05hbWVkRXhwb3J0cyhleHBvcnRDbGF1c2UpKSB7XG4gICAgICAgICAgICAgIGV4cG9ydENsYXVzZS5lbGVtZW50cy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBzcGVjLm5hbWUudGV4dDtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc3ltYm9sIHdhcyBub3QgYWxyZWFkeSBleHBvcnRlZCwgZXhwb3J0IGEgcmVmZXJlbmNlIHNpbmNlIGl0IGlzIGFcbiAgICAgICAgICAgICAgICAvLyByZWZlcmVuY2UgdG8gYW4gaW1wb3J0XG4gICAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSB8fCAhbWV0YWRhdGFbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOb2RlID0gc3BlYy5wcm9wZXJ0eU5hbWUgfHwgc3BlYy5uYW1lO1xuICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWU6IE1ldGFkYXRhVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGVOb2RlKHByb3BOb2RlKTtcbiAgICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lXSA9IHJlY29yZEVudHJ5KHZhbHVlLCBub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtb2R1bGVTcGVjaWZpZXIgJiYgbW9kdWxlU3BlY2lmaWVyLmtpbmQgPT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgZXhwb3J0cyB0aGF0IGRvbid0IGhhdmUgc3RyaW5nIGxpdGVyYWxzIGFzIGV4cG9ydHMuXG4gICAgICAgICAgICAvLyBUaGlzIGlzIGFsbG93ZWQgYnkgdGhlIHN5bnRheCBidXQgd2lsbCBiZSBmbGFnZ2VkIGFzIGFuIGVycm9yIGJ5IHRoZSB0eXBlIGNoZWNrZXIuXG4gICAgICAgICAgICBjb25zdCBmcm9tID0gKDx0cy5TdHJpbmdMaXRlcmFsPm1vZHVsZVNwZWNpZmllcikudGV4dDtcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZUV4cG9ydDogTW9kdWxlRXhwb3J0TWV0YWRhdGEgPSB7ZnJvbX07XG4gICAgICAgICAgICBpZiAoZXhwb3J0Q2xhdXNlICYmIHRzLmlzTmFtZWRFeHBvcnRzKGV4cG9ydENsYXVzZSkpIHtcbiAgICAgICAgICAgICAgbW9kdWxlRXhwb3J0LmV4cG9ydCA9IGV4cG9ydENsYXVzZS5lbGVtZW50cy5tYXAoXG4gICAgICAgICAgICAgICAgICBzcGVjID0+IHNwZWMucHJvcGVydHlOYW1lID8ge25hbWU6IHNwZWMucHJvcGVydHlOYW1lLnRleHQsIGFzOiBzcGVjLm5hbWUudGV4dH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwZWMubmFtZS50ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhwb3J0cykgZXhwb3J0cyA9IFtdO1xuICAgICAgICAgICAgZXhwb3J0cy5wdXNoKG1vZHVsZUV4cG9ydCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9uID0gPHRzLkNsYXNzRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICBpZiAoaXNFeHBvcnRlZChjbGFzc0RlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWROYW1lKGNsYXNzRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSBjbGFzc01ldGFkYXRhT2YoY2xhc3NEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIGRvbid0IHJlY29yZCBtZXRhZGF0YSBmb3IgdGhlIGNsYXNzLlxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5UeXBlQWxpYXNEZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCB0eXBlRGVjbGFyYXRpb24gPSA8dHMuVHlwZUFsaWFzRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAodHlwZURlY2xhcmF0aW9uLm5hbWUgJiYgaXNFeHBvcnRlZCh0eXBlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWROYW1lKHR5cGVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lXSA9IHtfX3N5bWJvbGljOiAnaW50ZXJmYWNlJ307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JbnRlcmZhY2VEZWNsYXJhdGlvbjpcbiAgICAgICAgICBjb25zdCBpbnRlcmZhY2VEZWNsYXJhdGlvbiA9IDx0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmIChpbnRlcmZhY2VEZWNsYXJhdGlvbi5uYW1lICYmIGlzRXhwb3J0ZWQoaW50ZXJmYWNlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWROYW1lKGludGVyZmFjZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgIG1ldGFkYXRhW25hbWVdID0ge19fc3ltYm9saWM6ICdpbnRlcmZhY2UnfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgLy8gUmVjb3JkIGZ1bmN0aW9ucyB0aGF0IHJldHVybiBhIHNpbmdsZSB2YWx1ZS4gUmVjb3JkIHRoZSBwYXJhbWV0ZXJcbiAgICAgICAgICAvLyBuYW1lcyBzdWJzdGl0dXRpb24gd2lsbCBiZSBwZXJmb3JtZWQgYnkgdGhlIFN0YXRpY1JlZmxlY3Rvci5cbiAgICAgICAgICBjb25zdCBmdW5jdGlvbkRlY2xhcmF0aW9uID0gPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoaXNFeHBvcnRlZChmdW5jdGlvbkRlY2xhcmF0aW9uKSAmJiBmdW5jdGlvbkRlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZE5hbWUoZnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBtYXliZUZ1bmMgPSBtYXliZUdldFNpbXBsZUZ1bmN0aW9uKGZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBUaGUgbGl0ZXJhbCBoZXJlIGlzIG5vdCB2YWxpZCBGdW5jdGlvbk1ldGFkYXRhLlxuICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lXSA9IG1heWJlRnVuYyA/IHJlY29yZEVudHJ5KG1heWJlRnVuYy5mdW5jLCBub2RlKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHsgX19zeW1ib2xpYzogJ2Z1bmN0aW9uJyB9IGFzIGFueSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5FbnVtRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgZW51bURlY2xhcmF0aW9uID0gPHRzLkVudW1EZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmIChpc0V4cG9ydGVkKGVudW1EZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudW1WYWx1ZUhvbGRlcjoge1tuYW1lOiBzdHJpbmddOiBNZXRhZGF0YVZhbHVlfSA9IHt9O1xuICAgICAgICAgICAgY29uc3QgZW51bU5hbWUgPSBleHBvcnRlZE5hbWUoZW51bURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGxldCBuZXh0RGVmYXVsdFZhbHVlOiBNZXRhZGF0YVZhbHVlID0gMDtcbiAgICAgICAgICAgIGxldCB3cml0dGVuTWVtYmVycyA9IDA7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1lbWJlciBvZiBlbnVtRGVjbGFyYXRpb24ubWVtYmVycykge1xuICAgICAgICAgICAgICBsZXQgZW51bVZhbHVlOiBNZXRhZGF0YVZhbHVlO1xuICAgICAgICAgICAgICBpZiAoIW1lbWJlci5pbml0aWFsaXplcikge1xuICAgICAgICAgICAgICAgIGVudW1WYWx1ZSA9IG5leHREZWZhdWx0VmFsdWU7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZW51bVZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShtZW1iZXIuaW5pdGlhbGl6ZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBpZiAobWVtYmVyLm5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpZGVudGlmaWVyID0gPHRzLklkZW50aWZpZXI+bWVtYmVyLm5hbWU7XG4gICAgICAgICAgICAgICAgbmFtZSA9IGlkZW50aWZpZXIudGV4dDtcbiAgICAgICAgICAgICAgICBlbnVtVmFsdWVIb2xkZXJbbmFtZV0gPSBlbnVtVmFsdWU7XG4gICAgICAgICAgICAgICAgd3JpdHRlbk1lbWJlcnMrKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodHlwZW9mIGVudW1WYWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBuZXh0RGVmYXVsdFZhbHVlID0gZW51bVZhbHVlICsgMTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiAnbGVmdCcgaGVyZSBoYXMgYSBuYW1lIHByb3Blcnkgd2hpY2ggaXMgbm90IHZhbGlkIGZvclxuICAgICAgICAgICAgICAgIC8vIE1ldGFkYXRhU3ltYm9saWNTZWxlY3RFeHByZXNzaW9uLlxuICAgICAgICAgICAgICAgIG5leHREZWZhdWx0VmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICBfX3N5bWJvbGljOiAnYmluYXJ5JyxcbiAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnKycsXG4gICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgIF9fc3ltYm9saWM6ICdzZWxlY3QnLFxuICAgICAgICAgICAgICAgICAgICBleHByZXNzaW9uOiByZWNvcmRFbnRyeSh7X19zeW1ib2xpYzogJ3JlZmVyZW5jZScsIG5hbWU6IGVudW1OYW1lfSwgbm9kZSksIG5hbWVcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSBhcyBhbnk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dERlZmF1bHRWYWx1ZSA9XG4gICAgICAgICAgICAgICAgICAgIHJlY29yZEVudHJ5KGVycm9yU3ltKCdVbnN1cHBvcnRlZCBlbnVtIG1lbWJlciBuYW1lJywgbWVtYmVyLm5hbWUpLCBub2RlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdyaXR0ZW5NZW1iZXJzKSB7XG4gICAgICAgICAgICAgIGlmIChlbnVtTmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgbWV0YWRhdGFbZW51bU5hbWVdID0gcmVjb3JkRW50cnkoZW51bVZhbHVlSG9sZGVyLCBub2RlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgY29uc3QgdmFyaWFibGVTdGF0ZW1lbnQgPSA8dHMuVmFyaWFibGVTdGF0ZW1lbnQ+bm9kZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb24gb2YgdmFyaWFibGVTdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucykge1xuICAgICAgICAgICAgaWYgKHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZS5raW5kID09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICBjb25zdCBuYW1lTm9kZSA9IDx0cy5JZGVudGlmaWVyPnZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgICAgICAgICAgbGV0IHZhclZhbHVlOiBNZXRhZGF0YVZhbHVlO1xuICAgICAgICAgICAgICBpZiAodmFyaWFibGVEZWNsYXJhdGlvbi5pbml0aWFsaXplcikge1xuICAgICAgICAgICAgICAgIHZhclZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlTm9kZSh2YXJpYWJsZURlY2xhcmF0aW9uLmluaXRpYWxpemVyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXJWYWx1ZSA9IHJlY29yZEVudHJ5KGVycm9yU3ltKCdWYXJpYWJsZSBub3QgaW5pdGlhbGl6ZWQnLCBuYW1lTm9kZSksIG5hbWVOb2RlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsZXQgZXhwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgaWYgKGlzRXhwb3J0KHZhcmlhYmxlU3RhdGVtZW50KSB8fCBpc0V4cG9ydCh2YXJpYWJsZURlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICAgICAgaXNFeHBvcnRlZElkZW50aWZpZXIobmFtZU5vZGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkSWRlbnRpZmllck5hbWUobmFtZU5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSByZWNvcmRFbnRyeSh2YXJWYWx1ZSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4cG9ydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhclZhbHVlID09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YXJWYWx1ZSA9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhclZhbHVlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUobmFtZU5vZGUudGV4dCwgdmFyVmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChleHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZVJlZmVyZW5jZShcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lTm9kZS50ZXh0LCB7X19zeW1ib2xpYzogJ3JlZmVyZW5jZScsIG5hbWU6IG5hbWVOb2RlLnRleHR9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWV4cG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhclZhbHVlICYmICFpc01ldGFkYXRhRXJyb3IodmFyVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKG5hbWVOb2RlLnRleHQsIHJlY29yZEVudHJ5KHZhclZhbHVlLCBub2RlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUoXG4gICAgICAgICAgICAgICAgICAgICAgbmFtZU5vZGUudGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICByZWNvcmRFbnRyeShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JTeW0oJ1JlZmVyZW5jZSB0byBhIGxvY2FsIHN5bWJvbCcsIG5hbWVOb2RlLCB7bmFtZTogbmFtZU5vZGUudGV4dH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBEZXN0cnVjdHVyaW5nIChvciBiaW5kaW5nKSBkZWNsYXJhdGlvbnMgYXJlIG5vdCBzdXBwb3J0ZWQsXG4gICAgICAgICAgICAgIC8vIHZhciB7PGlkZW50aWZpZXI+WywgPGlkZW50aWZpZXI+XSt9ID0gPGV4cHJlc3Npb24+O1xuICAgICAgICAgICAgICAvLyAgIG9yXG4gICAgICAgICAgICAgIC8vIHZhciBbPGlkZW50aWZpZXI+WywgPGlkZW50aWZpZXJ9K10gPSA8ZXhwcmVzc2lvbj47XG4gICAgICAgICAgICAgIC8vIGFyZSBub3Qgc3VwcG9ydGVkLlxuICAgICAgICAgICAgICBjb25zdCByZXBvcnQ6IChuYW1lTm9kZTogdHMuTm9kZSkgPT4gdm9pZCA9IChuYW1lTm9kZTogdHMuTm9kZSkgPT4ge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobmFtZU5vZGUua2luZCkge1xuICAgICAgICAgICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSA8dHMuSWRlbnRpZmllcj5uYW1lTm9kZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFyVmFsdWUgPSBlcnJvclN5bSgnRGVzdHJ1Y3R1cmluZyBub3Qgc3VwcG9ydGVkJywgbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmUobmFtZS50ZXh0LCB2YXJWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0V4cG9ydChub2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZS50ZXh0XSA9IHZhclZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkJpbmRpbmdFbGVtZW50OlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiaW5kaW5nRWxlbWVudCA9IDx0cy5CaW5kaW5nRWxlbWVudD5uYW1lTm9kZTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0KGJpbmRpbmdFbGVtZW50Lm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5PYmplY3RCaW5kaW5nUGF0dGVybjpcbiAgICAgICAgICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5BcnJheUJpbmRpbmdQYXR0ZXJuOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiaW5kaW5ncyA9IDx0cy5CaW5kaW5nUGF0dGVybj5uYW1lTm9kZTtcbiAgICAgICAgICAgICAgICAgICAgKGJpbmRpbmdzIGFzIGFueSkuZWxlbWVudHMuZm9yRWFjaChyZXBvcnQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIHJlcG9ydCh2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChtZXRhZGF0YSB8fCBleHBvcnRzKSB7XG4gICAgICBpZiAoIW1ldGFkYXRhKVxuICAgICAgICBtZXRhZGF0YSA9IHt9O1xuICAgICAgZWxzZSBpZiAoc3RyaWN0KSB7XG4gICAgICAgIHZhbGlkYXRlTWV0YWRhdGEoc291cmNlRmlsZSwgbm9kZU1hcCwgbWV0YWRhdGEpO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzdWx0OiBNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAgICAgX19zeW1ib2xpYzogJ21vZHVsZScsXG4gICAgICAgIHZlcnNpb246IHRoaXMub3B0aW9ucy52ZXJzaW9uIHx8IE1FVEFEQVRBX1ZFUlNJT04sIG1ldGFkYXRhXG4gICAgICB9O1xuICAgICAgaWYgKHNvdXJjZUZpbGUubW9kdWxlTmFtZSkgcmVzdWx0LmltcG9ydEFzID0gc291cmNlRmlsZS5tb2R1bGVOYW1lO1xuICAgICAgaWYgKGV4cG9ydHMpIHJlc3VsdC5leHBvcnRzID0gZXhwb3J0cztcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgd2lsbCB0aHJvdyBpZiB0aGUgbWV0YWRhdGEgZW50cnkgZ2l2ZW4gY29udGFpbnMgYW4gZXJyb3Igbm9kZS5cbmZ1bmN0aW9uIHZhbGlkYXRlTWV0YWRhdGEoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbm9kZU1hcDogTWFwPE1ldGFkYXRhRW50cnksIHRzLk5vZGU+LFxuICAgIG1ldGFkYXRhOiB7W25hbWU6IHN0cmluZ106IE1ldGFkYXRhRW50cnl9KSB7XG4gIGxldCBsb2NhbHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldChbJ0FycmF5JywgJ09iamVjdCcsICdTZXQnLCAnTWFwJywgJ3N0cmluZycsICdudW1iZXInLCAnYW55J10pO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlRXhwcmVzc2lvbihcbiAgICAgIGV4cHJlc3Npb246IE1ldGFkYXRhVmFsdWUgfCBNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbiB8IE1ldGFkYXRhRXJyb3IpIHtcbiAgICBpZiAoIWV4cHJlc3Npb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZXhwcmVzc2lvbikpIHtcbiAgICAgIGV4cHJlc3Npb24uZm9yRWFjaCh2YWxpZGF0ZUV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09ICdvYmplY3QnICYmICFleHByZXNzaW9uLmhhc093blByb3BlcnR5KCdfX3N5bWJvbGljJykpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGV4cHJlc3Npb24pLmZvckVhY2godiA9PiB2YWxpZGF0ZUV4cHJlc3Npb24oKDxhbnk+ZXhwcmVzc2lvbilbdl0pKTtcbiAgICB9IGVsc2UgaWYgKGlzTWV0YWRhdGFFcnJvcihleHByZXNzaW9uKSkge1xuICAgICAgcmVwb3J0RXJyb3IoZXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIGlmIChpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgaWYgKCFsb2NhbHMuaGFzKGV4cHJlc3Npb24ubmFtZSkpIHtcbiAgICAgICAgY29uc3QgcmVmZXJlbmNlID0gPE1ldGFkYXRhVmFsdWU+bWV0YWRhdGFbZXhwcmVzc2lvbi5uYW1lXTtcbiAgICAgICAgaWYgKHJlZmVyZW5jZSkge1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihyZWZlcmVuY2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uTWV0YWRhdGEoZXhwcmVzc2lvbikpIHtcbiAgICAgIHZhbGlkYXRlRnVuY3Rpb24oPGFueT5leHByZXNzaW9uKTtcbiAgICB9IGVsc2UgaWYgKGlzTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgIHN3aXRjaCAoZXhwcmVzc2lvbi5fX3N5bWJvbGljKSB7XG4gICAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgICAgY29uc3QgYmluYXJ5RXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljQmluYXJ5RXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihiaW5hcnlFeHByZXNzaW9uLmxlZnQpO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihiaW5hcnlFeHByZXNzaW9uLnJpZ2h0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY2FsbCc6XG4gICAgICAgIGNhc2UgJ25ldyc6XG4gICAgICAgICAgY29uc3QgY2FsbEV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY0NhbGxFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGNhbGxFeHByZXNzaW9uLmV4cHJlc3Npb24pO1xuICAgICAgICAgIGlmIChjYWxsRXhwcmVzc2lvbi5hcmd1bWVudHMpIGNhbGxFeHByZXNzaW9uLmFyZ3VtZW50cy5mb3JFYWNoKHZhbGlkYXRlRXhwcmVzc2lvbik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2luZGV4JzpcbiAgICAgICAgICBjb25zdCBpbmRleEV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY0luZGV4RXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihpbmRleEV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGluZGV4RXhwcmVzc2lvbi5pbmRleCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ByZSc6XG4gICAgICAgICAgY29uc3QgcHJlZml4RXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljUHJlZml4RXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihwcmVmaXhFeHByZXNzaW9uLm9wZXJhbmQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgICAgIGNvbnN0IHNlbGVjdEV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oc2VsZWN0RXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc3ByZWFkJzpcbiAgICAgICAgICBjb25zdCBzcHJlYWRFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNTcHJlYWRFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKHNwcmVhZEV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2lmJzpcbiAgICAgICAgICBjb25zdCBpZkV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY0lmRXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihpZkV4cHJlc3Npb24uY29uZGl0aW9uKTtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oaWZFeHByZXNzaW9uLmVsc2VFeHByZXNzaW9uKTtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oaWZFeHByZXNzaW9uLnRoZW5FeHByZXNzaW9uKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZU1lbWJlcihjbGFzc0RhdGE6IENsYXNzTWV0YWRhdGEsIG1lbWJlcjogTWVtYmVyTWV0YWRhdGEpIHtcbiAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMpIHtcbiAgICAgIG1lbWJlci5kZWNvcmF0b3JzLmZvckVhY2godmFsaWRhdGVFeHByZXNzaW9uKTtcbiAgICB9XG4gICAgaWYgKGlzTWV0aG9kTWV0YWRhdGEobWVtYmVyKSAmJiBtZW1iZXIucGFyYW1ldGVyRGVjb3JhdG9ycykge1xuICAgICAgbWVtYmVyLnBhcmFtZXRlckRlY29yYXRvcnMuZm9yRWFjaCh2YWxpZGF0ZUV4cHJlc3Npb24pO1xuICAgIH1cbiAgICAvLyBPbmx5IHZhbGlkYXRlIHBhcmFtZXRlcnMgb2YgY2xhc3NlcyBmb3Igd2hpY2ggd2Uga25vdyB0aGF0IGFyZSB1c2VkIHdpdGggb3VyIERJXG4gICAgaWYgKGNsYXNzRGF0YS5kZWNvcmF0b3JzICYmIGlzQ29uc3RydWN0b3JNZXRhZGF0YShtZW1iZXIpICYmIG1lbWJlci5wYXJhbWV0ZXJzKSB7XG4gICAgICBtZW1iZXIucGFyYW1ldGVycy5mb3JFYWNoKHZhbGlkYXRlRXhwcmVzc2lvbik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVDbGFzcyhjbGFzc0RhdGE6IENsYXNzTWV0YWRhdGEpIHtcbiAgICBpZiAoY2xhc3NEYXRhLmRlY29yYXRvcnMpIHtcbiAgICAgIGNsYXNzRGF0YS5kZWNvcmF0b3JzLmZvckVhY2godmFsaWRhdGVFeHByZXNzaW9uKTtcbiAgICB9XG4gICAgaWYgKGNsYXNzRGF0YS5tZW1iZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbGFzc0RhdGEubWVtYmVycylcbiAgICAgICAgICAuZm9yRWFjaChuYW1lID0+IGNsYXNzRGF0YS5tZW1iZXJzICFbbmFtZV0uZm9yRWFjaCgobSkgPT4gdmFsaWRhdGVNZW1iZXIoY2xhc3NEYXRhLCBtKSkpO1xuICAgIH1cbiAgICBpZiAoY2xhc3NEYXRhLnN0YXRpY3MpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGNsYXNzRGF0YS5zdGF0aWNzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBjb25zdCBzdGF0aWNNZW1iZXIgPSBjbGFzc0RhdGEuc3RhdGljcyAhW25hbWVdO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbk1ldGFkYXRhKHN0YXRpY01lbWJlcikpIHtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oc3RhdGljTWVtYmVyLnZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oc3RhdGljTWVtYmVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVGdW5jdGlvbihmdW5jdGlvbkRlY2xhcmF0aW9uOiBGdW5jdGlvbk1ldGFkYXRhKSB7XG4gICAgaWYgKGZ1bmN0aW9uRGVjbGFyYXRpb24udmFsdWUpIHtcbiAgICAgIGNvbnN0IG9sZExvY2FscyA9IGxvY2FscztcbiAgICAgIGlmIChmdW5jdGlvbkRlY2xhcmF0aW9uLnBhcmFtZXRlcnMpIHtcbiAgICAgICAgbG9jYWxzID0gbmV3IFNldChvbGRMb2NhbHMudmFsdWVzKCkpO1xuICAgICAgICBpZiAoZnVuY3Rpb25EZWNsYXJhdGlvbi5wYXJhbWV0ZXJzKVxuICAgICAgICAgIGZ1bmN0aW9uRGVjbGFyYXRpb24ucGFyYW1ldGVycy5mb3JFYWNoKG4gPT4gbG9jYWxzLmFkZChuKSk7XG4gICAgICB9XG4gICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oZnVuY3Rpb25EZWNsYXJhdGlvbi52YWx1ZSk7XG4gICAgICBsb2NhbHMgPSBvbGRMb2NhbHM7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkUmVwb3J0Tm9kZShub2RlOiB0cy5Ob2RlIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIGNvbnN0IG5vZGVTdGFydCA9IG5vZGUuZ2V0U3RhcnQoKTtcbiAgICAgIHJldHVybiAhKFxuICAgICAgICAgIG5vZGUucG9zICE9IG5vZGVTdGFydCAmJlxuICAgICAgICAgIHNvdXJjZUZpbGUudGV4dC5zdWJzdHJpbmcobm9kZS5wb3MsIG5vZGVTdGFydCkuaW5kZXhPZignQGR5bmFtaWMnKSA+PSAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBmdW5jdGlvbiByZXBvcnRFcnJvcihlcnJvcjogTWV0YWRhdGFFcnJvcikge1xuICAgIGNvbnN0IG5vZGUgPSBub2RlTWFwLmdldChlcnJvcik7XG4gICAgaWYgKHNob3VsZFJlcG9ydE5vZGUobm9kZSkpIHtcbiAgICAgIGNvbnN0IGxpbmVJbmZvID0gZXJyb3IubGluZSAhPSB1bmRlZmluZWQgP1xuICAgICAgICAgIGVycm9yLmNoYXJhY3RlciAhPSB1bmRlZmluZWQgPyBgOiR7ZXJyb3IubGluZSArIDF9OiR7ZXJyb3IuY2hhcmFjdGVyICsgMX1gIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDoke2Vycm9yLmxpbmUgKyAxfWAgOlxuICAgICAgICAgICcnO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGAke3NvdXJjZUZpbGUuZmlsZU5hbWV9JHtsaW5lSW5mb306IE1ldGFkYXRhIGNvbGxlY3RlZCBjb250YWlucyBhbiBlcnJvciB0aGF0IHdpbGwgYmUgcmVwb3J0ZWQgYXQgcnVudGltZTogJHtleHBhbmRlZE1lc3NhZ2UoZXJyb3IpfS5cXG4gICR7SlNPTi5zdHJpbmdpZnkoZXJyb3IpfWApO1xuICAgIH1cbiAgfVxuXG4gIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1ldGFkYXRhKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgIGNvbnN0IGVudHJ5ID0gbWV0YWRhdGFbbmFtZV07XG4gICAgdHJ5IHtcbiAgICAgIGlmIChpc0NsYXNzTWV0YWRhdGEoZW50cnkpKSB7XG4gICAgICAgIHZhbGlkYXRlQ2xhc3MoZW50cnkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBub2RlTWFwLmdldChlbnRyeSk7XG4gICAgICBpZiAoc2hvdWxkUmVwb3J0Tm9kZShub2RlKSkge1xuICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID0gc291cmNlRmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihub2RlLmdldFN0YXJ0KCkpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYCR7c291cmNlRmlsZS5maWxlTmFtZX06JHtsaW5lICsgMX06JHtjaGFyYWN0ZXIgKyAxfTogRXJyb3IgZW5jb3VudGVyZWQgaW4gbWV0YWRhdGEgZ2VuZXJhdGVkIGZvciBleHBvcnRlZCBzeW1ib2wgJyR7bmFtZX0nOiBcXG4gJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEVycm9yIGVuY291bnRlcmVkIGluIG1ldGFkYXRhIGdlbmVyYXRlZCBmb3IgZXhwb3J0ZWQgc3ltYm9sICR7bmFtZX06IFxcbiAke2UubWVzc2FnZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vLyBDb2xsZWN0IHBhcmFtZXRlciBuYW1lcyBmcm9tIGEgZnVuY3Rpb24uXG5mdW5jdGlvbiBuYW1lc09mKHBhcmFtZXRlcnM6IHRzLk5vZGVBcnJheTx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbj4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcblxuICBmdW5jdGlvbiBhZGROYW1lc09mKG5hbWU6IHRzLklkZW50aWZpZXIgfCB0cy5CaW5kaW5nUGF0dGVybikge1xuICAgIGlmIChuYW1lLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICBjb25zdCBpZGVudGlmaWVyID0gPHRzLklkZW50aWZpZXI+bmFtZTtcbiAgICAgIHJlc3VsdC5wdXNoKGlkZW50aWZpZXIudGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJpbmRpbmdQYXR0ZXJuID0gPHRzLkJpbmRpbmdQYXR0ZXJuPm5hbWU7XG4gICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgYmluZGluZ1BhdHRlcm4uZWxlbWVudHMpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IChlbGVtZW50IGFzIGFueSkubmFtZTtcbiAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICBhZGROYW1lc09mKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBwYXJhbWV0ZXIgb2YgcGFyYW1ldGVycykge1xuICAgIGFkZE5hbWVzT2YocGFyYW1ldGVyLm5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2hvdWxkSWdub3JlU3RhdGljTWVtYmVyKG1lbWJlck5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gbWVtYmVyTmFtZS5zdGFydHNXaXRoKCduZ0FjY2VwdElucHV0VHlwZV8nKSB8fCBtZW1iZXJOYW1lLnN0YXJ0c1dpdGgoJ25nVGVtcGxhdGVHdWFyZF8nKTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kZWRNZXNzYWdlKGVycm9yOiBhbnkpOiBzdHJpbmcge1xuICBzd2l0Y2ggKGVycm9yLm1lc3NhZ2UpIHtcbiAgICBjYXNlICdSZWZlcmVuY2UgdG8gbm9uLWV4cG9ydGVkIGNsYXNzJzpcbiAgICAgIGlmIChlcnJvci5jb250ZXh0ICYmIGVycm9yLmNvbnRleHQuY2xhc3NOYW1lKSB7XG4gICAgICAgIHJldHVybiBgUmVmZXJlbmNlIHRvIGEgbm9uLWV4cG9ydGVkIGNsYXNzICR7ZXJyb3IuY29udGV4dC5jbGFzc05hbWV9LiBDb25zaWRlciBleHBvcnRpbmcgdGhlIGNsYXNzYDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ1ZhcmlhYmxlIG5vdCBpbml0aWFsaXplZCc6XG4gICAgICByZXR1cm4gJ09ubHkgaW5pdGlhbGl6ZWQgdmFyaWFibGVzIGFuZCBjb25zdGFudHMgY2FuIGJlIHJlZmVyZW5jZWQgYmVjYXVzZSB0aGUgdmFsdWUgb2YgdGhpcyB2YXJpYWJsZSBpcyBuZWVkZWQgYnkgdGhlIHRlbXBsYXRlIGNvbXBpbGVyJztcbiAgICBjYXNlICdEZXN0cnVjdHVyaW5nIG5vdCBzdXBwb3J0ZWQnOlxuICAgICAgcmV0dXJuICdSZWZlcmVuY2luZyBhbiBleHBvcnRlZCBkZXN0cnVjdHVyZWQgdmFyaWFibGUgb3IgY29uc3RhbnQgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgdGVtcGxhdGUgY29tcGlsZXIuIENvbnNpZGVyIHNpbXBsaWZ5aW5nIHRoaXMgdG8gYXZvaWQgZGVzdHJ1Y3R1cmluZyc7XG4gICAgY2FzZSAnQ291bGQgbm90IHJlc29sdmUgdHlwZSc6XG4gICAgICBpZiAoZXJyb3IuY29udGV4dCAmJiBlcnJvci5jb250ZXh0LnR5cGVOYW1lKSB7XG4gICAgICAgIHJldHVybiBgQ291bGQgbm90IHJlc29sdmUgdHlwZSAke2Vycm9yLmNvbnRleHQudHlwZU5hbWV9YDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0Z1bmN0aW9uIGNhbGwgbm90IHN1cHBvcnRlZCc6XG4gICAgICBsZXQgcHJlZml4ID1cbiAgICAgICAgICBlcnJvci5jb250ZXh0ICYmIGVycm9yLmNvbnRleHQubmFtZSA/IGBDYWxsaW5nIGZ1bmN0aW9uICcke2Vycm9yLmNvbnRleHQubmFtZX0nLCBmYCA6ICdGJztcbiAgICAgIHJldHVybiBwcmVmaXggK1xuICAgICAgICAgICd1bmN0aW9uIGNhbGxzIGFyZSBub3Qgc3VwcG9ydGVkLiBDb25zaWRlciByZXBsYWNpbmcgdGhlIGZ1bmN0aW9uIG9yIGxhbWJkYSB3aXRoIGEgcmVmZXJlbmNlIHRvIGFuIGV4cG9ydGVkIGZ1bmN0aW9uJztcbiAgICBjYXNlICdSZWZlcmVuY2UgdG8gYSBsb2NhbCBzeW1ib2wnOlxuICAgICAgaWYgKGVycm9yLmNvbnRleHQgJiYgZXJyb3IuY29udGV4dC5uYW1lKSB7XG4gICAgICAgIHJldHVybiBgUmVmZXJlbmNlIHRvIGEgbG9jYWwgKG5vbi1leHBvcnRlZCkgc3ltYm9sICcke2Vycm9yLmNvbnRleHQubmFtZX0nLiBDb25zaWRlciBleHBvcnRpbmcgdGhlIHN5bWJvbGA7XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG59XG4iXX0=