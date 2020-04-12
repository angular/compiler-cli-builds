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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9tZXRhZGF0YS9jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLDBFQUFtRTtJQUNuRSxvRUFBdTFCO0lBQ3YxQixzRUFBa0M7SUFFbEMsSUFBTSxRQUFRLEdBQUcsVUFBQyxJQUFvQjtRQUNsQyxPQUFBLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU07SUFBM0QsQ0FBMkQsQ0FBQztJQTRCaEU7O09BRUc7SUFDSDtRQUNFLDJCQUFvQixPQUE4QjtZQUE5Qix3QkFBQSxFQUFBLFlBQThCO1lBQTlCLFlBQU8sR0FBUCxPQUFPLENBQXVCO1FBQUcsQ0FBQztRQUV0RDs7O1dBR0c7UUFDSSx1Q0FBVyxHQUFsQixVQUNJLFVBQXlCLEVBQUUsTUFBdUIsRUFDbEQsb0JBQTZFO1lBRmpGLGlCQThmQztZQTdmOEIsdUJBQUEsRUFBQSxjQUF1QjtZQUdwRCxJQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkMsSUFBTSxPQUFPLEdBQ1QsSUFBSSxHQUFHLEVBQTJFLENBQUM7WUFDdkYsSUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ25GLFVBQUMsS0FBb0IsRUFBRSxJQUFhO29CQUNoQyxPQUFBLEtBQUksQ0FBQyxPQUFPLENBQUMsb0JBQXNCLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQztnQkFBNUUsQ0FBNEUsQ0FBQyxDQUFDO2dCQUNsRixvQkFBb0IsQ0FBQztZQUN6QixJQUFNLGdCQUFn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LENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDOUYsT0FBTyxNQUFNO29CQUNULHFIQUFxSCxDQUFDO1lBQzVILEtBQUssNkJBQTZCO2dCQUNoQyxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUU7b0JBQ3ZDLE9BQU8saURBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLHFDQUFrQyxDQUFDO2lCQUMxRDtTQUNKO1FBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO0lBQ3ZCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0V2YWx1YXRvciwgZXJyb3JTeW1ib2wsIHJlY29yZE1hcEVudHJ5fSBmcm9tICcuL2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWV0YWRhdGEsIENvbnN0cnVjdG9yTWV0YWRhdGEsIEZ1bmN0aW9uTWV0YWRhdGEsIEludGVyZmFjZU1ldGFkYXRhLCBNRVRBREFUQV9WRVJTSU9OLCBNZW1iZXJNZXRhZGF0YSwgTWV0YWRhdGFFbnRyeSwgTWV0YWRhdGFFcnJvciwgTWV0YWRhdGFNYXAsIE1ldGFkYXRhU3ltYm9saWNCaW5hcnlFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljQ2FsbEV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljSWZFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljSW5kZXhFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljUHJlZml4RXhwcmVzc2lvbiwgTWV0YWRhdGFTeW1ib2xpY1JlZmVyZW5jZUV4cHJlc3Npb24sIE1ldGFkYXRhU3ltYm9saWNTZWxlY3RFeHByZXNzaW9uLCBNZXRhZGF0YVN5bWJvbGljU3ByZWFkRXhwcmVzc2lvbiwgTWV0YWRhdGFWYWx1ZSwgTWV0aG9kTWV0YWRhdGEsIE1vZHVsZUV4cG9ydE1ldGFkYXRhLCBNb2R1bGVNZXRhZGF0YSwgaXNDbGFzc01ldGFkYXRhLCBpc0NvbnN0cnVjdG9yTWV0YWRhdGEsIGlzRnVuY3Rpb25NZXRhZGF0YSwgaXNNZXRhZGF0YUVycm9yLCBpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbiwgaXNNZXRhZGF0YUltcG9ydERlZmF1bHRSZWZlcmVuY2UsIGlzTWV0YWRhdGFJbXBvcnRlZFN5bWJvbFJlZmVyZW5jZUV4cHJlc3Npb24sIGlzTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24sIGlzTWV0YWRhdGFTeW1ib2xpY1JlZmVyZW5jZUV4cHJlc3Npb24sIGlzTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24sIGlzTWV0aG9kTWV0YWRhdGF9IGZyb20gJy4vc2NoZW1hJztcbmltcG9ydCB7U3ltYm9sc30gZnJvbSAnLi9zeW1ib2xzJztcblxuY29uc3QgaXNTdGF0aWMgPSAobm9kZTogdHMuRGVjbGFyYXRpb24pID0+XG4gICAgdHMuZ2V0Q29tYmluZWRNb2RpZmllckZsYWdzKG5vZGUpICYgdHMuTW9kaWZpZXJGbGFncy5TdGF0aWM7XG5cbi8qKlxuICogQSBzZXQgb2YgY29sbGVjdG9yIG9wdGlvbnMgdG8gdXNlIHdoZW4gY29sbGVjdGluZyBtZXRhZGF0YS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0b3JPcHRpb25zIHtcbiAgLyoqXG4gICAqIFZlcnNpb24gb2YgdGhlIG1ldGFkYXRhIHRvIGNvbGxlY3QuXG4gICAqL1xuICB2ZXJzaW9uPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBDb2xsZWN0IGEgaGlkZGVuIGZpZWxkIFwiJHF1b3RlZCRcIiBpbiBvYmplY3RzIGxpdGVyYWxzIHRoYXQgcmVjb3JkIHdoZW4gdGhlIGtleSB3YXMgcXVvdGVkIGluXG4gICAqIHRoZSBzb3VyY2UuXG4gICAqL1xuICBxdW90ZWROYW1lcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIERvIG5vdCBzaW1wbGlmeSBpbnZhbGlkIGV4cHJlc3Npb25zLlxuICAgKi9cbiAgdmVyYm9zZUludmFsaWRFeHByZXNzaW9uPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQW4gZXhwcmVzc2lvbiBzdWJzdGl0dXRpb24gY2FsbGJhY2suXG4gICAqL1xuICBzdWJzdGl0dXRlRXhwcmVzc2lvbj86ICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSkgPT4gTWV0YWRhdGFWYWx1ZTtcbn1cblxuLyoqXG4gKiBDb2xsZWN0IGRlY29yYXRvciBtZXRhZGF0YSBmcm9tIGEgVHlwZVNjcmlwdCBtb2R1bGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXRhZGF0YUNvbGxlY3RvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgb3B0aW9uczogQ29sbGVjdG9yT3B0aW9ucyA9IHt9KSB7fVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgSlNPTi5zdHJpbmdpZnkgZnJpZW5kbHkgZm9ybSBkZXNjcmliaW5nIHRoZSBkZWNvcmF0b3JzIG9mIHRoZSBleHBvcnRlZCBjbGFzc2VzIGZyb21cbiAgICogdGhlIHNvdXJjZSBmaWxlIHRoYXQgaXMgZXhwZWN0ZWQgdG8gY29ycmVzcG9uZCB0byBhIG1vZHVsZS5cbiAgICovXG4gIHB1YmxpYyBnZXRNZXRhZGF0YShcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHN0cmljdDogYm9vbGVhbiA9IGZhbHNlLFxuICAgICAgc3Vic3RpdHV0ZUV4cHJlc3Npb24/OiAodmFsdWU6IE1ldGFkYXRhVmFsdWUsIG5vZGU6IHRzLk5vZGUpID0+IE1ldGFkYXRhVmFsdWUpOiBNb2R1bGVNZXRhZGF0YVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgbG9jYWxzID0gbmV3IFN5bWJvbHMoc291cmNlRmlsZSk7XG4gICAgY29uc3Qgbm9kZU1hcCA9XG4gICAgICAgIG5ldyBNYXA8TWV0YWRhdGFWYWx1ZXxDbGFzc01ldGFkYXRhfEludGVyZmFjZU1ldGFkYXRhfEZ1bmN0aW9uTWV0YWRhdGEsIHRzLk5vZGU+KCk7XG4gICAgY29uc3QgY29tcG9zZWRTdWJzdGl0dXRlciA9IHN1YnN0aXR1dGVFeHByZXNzaW9uICYmIHRoaXMub3B0aW9ucy5zdWJzdGl0dXRlRXhwcmVzc2lvbiA/XG4gICAgICAgICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSkgPT5cbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5zdWJzdGl0dXRlRXhwcmVzc2lvbiAhKHN1YnN0aXR1dGVFeHByZXNzaW9uKHZhbHVlLCBub2RlKSwgbm9kZSkgOlxuICAgICAgICBzdWJzdGl0dXRlRXhwcmVzc2lvbjtcbiAgICBjb25zdCBldmFsdWF0b3JPcHRpb25zID0gc3Vic3RpdHV0ZUV4cHJlc3Npb24gP1xuICAgICAgICB7Li4udGhpcy5vcHRpb25zLCBzdWJzdGl0dXRlRXhwcmVzc2lvbjogY29tcG9zZWRTdWJzdGl0dXRlcn0gOlxuICAgICAgICB0aGlzLm9wdGlvbnM7XG4gICAgbGV0IG1ldGFkYXRhOiB7W25hbWU6IHN0cmluZ106IE1ldGFkYXRhVmFsdWUgfCBDbGFzc01ldGFkYXRhIHwgRnVuY3Rpb25NZXRhZGF0YX18dW5kZWZpbmVkO1xuICAgIGNvbnN0IGV2YWx1YXRvciA9IG5ldyBFdmFsdWF0b3IobG9jYWxzLCBub2RlTWFwLCBldmFsdWF0b3JPcHRpb25zLCAobmFtZSwgdmFsdWUpID0+IHtcbiAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICBtZXRhZGF0YVtuYW1lXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIGxldCBleHBvcnRzOiBNb2R1bGVFeHBvcnRNZXRhZGF0YVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGZ1bmN0aW9uIG9iakZyb21EZWNvcmF0b3IoZGVjb3JhdG9yTm9kZTogdHMuRGVjb3JhdG9yKTogTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24ge1xuICAgICAgcmV0dXJuIDxNZXRhZGF0YVN5bWJvbGljRXhwcmVzc2lvbj5ldmFsdWF0b3IuZXZhbHVhdGVOb2RlKGRlY29yYXRvck5vZGUuZXhwcmVzc2lvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVjb3JkRW50cnk8VCBleHRlbmRzIE1ldGFkYXRhRW50cnk+KGVudHJ5OiBULCBub2RlOiB0cy5Ob2RlKTogVCB7XG4gICAgICBpZiAoY29tcG9zZWRTdWJzdGl0dXRlcikge1xuICAgICAgICBlbnRyeSA9IGNvbXBvc2VkU3Vic3RpdHV0ZXIoZW50cnkgYXMgTWV0YWRhdGFWYWx1ZSwgbm9kZSkgYXMgVDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZWNvcmRNYXBFbnRyeShlbnRyeSwgbm9kZSwgbm9kZU1hcCwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXJyb3JTeW0oXG4gICAgICAgIG1lc3NhZ2U6IHN0cmluZywgbm9kZT86IHRzLk5vZGUsIGNvbnRleHQ/OiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30pOiBNZXRhZGF0YUVycm9yIHtcbiAgICAgIHJldHVybiBlcnJvclN5bWJvbChtZXNzYWdlLCBub2RlLCBjb250ZXh0LCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXliZUdldFNpbXBsZUZ1bmN0aW9uKFxuICAgICAgICBmdW5jdGlvbkRlY2xhcmF0aW9uOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9uIHxcbiAgICAgICAgdHMuTWV0aG9kRGVjbGFyYXRpb24pOiB7ZnVuYzogRnVuY3Rpb25NZXRhZGF0YSwgbmFtZTogc3RyaW5nfXx1bmRlZmluZWQge1xuICAgICAgaWYgKGZ1bmN0aW9uRGVjbGFyYXRpb24ubmFtZSAmJiBmdW5jdGlvbkRlY2xhcmF0aW9uLm5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgICAgY29uc3QgbmFtZU5vZGUgPSA8dHMuSWRlbnRpZmllcj5mdW5jdGlvbkRlY2xhcmF0aW9uLm5hbWU7XG4gICAgICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IG5hbWVOb2RlLnRleHQ7XG4gICAgICAgIGNvbnN0IGZ1bmN0aW9uQm9keSA9IGZ1bmN0aW9uRGVjbGFyYXRpb24uYm9keTtcbiAgICAgICAgaWYgKGZ1bmN0aW9uQm9keSAmJiBmdW5jdGlvbkJvZHkuc3RhdGVtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgIGNvbnN0IHN0YXRlbWVudCA9IGZ1bmN0aW9uQm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgICAgICAgIGlmIChzdGF0ZW1lbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5SZXR1cm5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IHJldHVyblN0YXRlbWVudCA9IDx0cy5SZXR1cm5TdGF0ZW1lbnQ+c3RhdGVtZW50O1xuICAgICAgICAgICAgaWYgKHJldHVyblN0YXRlbWVudC5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGZ1bmM6IEZ1bmN0aW9uTWV0YWRhdGEgPSB7XG4gICAgICAgICAgICAgICAgX19zeW1ib2xpYzogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBuYW1lc09mKGZ1bmN0aW9uRGVjbGFyYXRpb24ucGFyYW1ldGVycyksXG4gICAgICAgICAgICAgICAgdmFsdWU6IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUocmV0dXJuU3RhdGVtZW50LmV4cHJlc3Npb24pXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGlmIChmdW5jdGlvbkRlY2xhcmF0aW9uLnBhcmFtZXRlcnMuc29tZShwID0+IHAuaW5pdGlhbGl6ZXIgIT0gbnVsbCkpIHtcbiAgICAgICAgICAgICAgICBmdW5jLmRlZmF1bHRzID0gZnVuY3Rpb25EZWNsYXJhdGlvbi5wYXJhbWV0ZXJzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgcCA9PiBwLmluaXRpYWxpemVyICYmIGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUocC5pbml0aWFsaXplcikpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZWNvcmRFbnRyeSh7ZnVuYywgbmFtZTogZnVuY3Rpb25OYW1lfSwgZnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xhc3NNZXRhZGF0YU9mKGNsYXNzRGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBDbGFzc01ldGFkYXRhIHtcbiAgICAgIGNvbnN0IHJlc3VsdDogQ2xhc3NNZXRhZGF0YSA9IHtfX3N5bWJvbGljOiAnY2xhc3MnfTtcblxuICAgICAgZnVuY3Rpb24gZ2V0RGVjb3JhdG9ycyhkZWNvcmF0b3JzOiBSZWFkb25seUFycmF5PHRzLkRlY29yYXRvcj58IHVuZGVmaW5lZCk6XG4gICAgICAgICAgTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb25bXXx1bmRlZmluZWQge1xuICAgICAgICBpZiAoZGVjb3JhdG9ycyAmJiBkZWNvcmF0b3JzLmxlbmd0aClcbiAgICAgICAgICByZXR1cm4gZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IG9iakZyb21EZWNvcmF0b3IoZGVjb3JhdG9yKSk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHJlZmVyZW5jZUZyb20obm9kZTogdHMuTm9kZSk6IE1ldGFkYXRhU3ltYm9saWNSZWZlcmVuY2VFeHByZXNzaW9ufE1ldGFkYXRhRXJyb3J8XG4gICAgICAgICAgTWV0YWRhdGFTeW1ib2xpY1NlbGVjdEV4cHJlc3Npb24ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBldmFsdWF0b3IuZXZhbHVhdGVOb2RlKG5vZGUpO1xuICAgICAgICBpZiAoaXNNZXRhZGF0YUVycm9yKHJlc3VsdCkgfHwgaXNNZXRhZGF0YVN5bWJvbGljUmVmZXJlbmNlRXhwcmVzc2lvbihyZXN1bHQpIHx8XG4gICAgICAgICAgICBpc01ldGFkYXRhU3ltYm9saWNTZWxlY3RFeHByZXNzaW9uKHJlc3VsdCkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBlcnJvclN5bSgnU3ltYm9sIHJlZmVyZW5jZSBleHBlY3RlZCcsIG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBjbGFzcyBwYXJlbnRzXG4gICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5oZXJpdGFnZUNsYXVzZXMpIHtcbiAgICAgICAgY2xhc3NEZWNsYXJhdGlvbi5oZXJpdGFnZUNsYXVzZXMuZm9yRWFjaCgoaGMpID0+IHtcbiAgICAgICAgICBpZiAoaGMudG9rZW4gPT09IHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQgJiYgaGMudHlwZXMpIHtcbiAgICAgICAgICAgIGhjLnR5cGVzLmZvckVhY2godHlwZSA9PiByZXN1bHQuZXh0ZW5kcyA9IHJlZmVyZW5jZUZyb20odHlwZS5leHByZXNzaW9uKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gQWRkIGFyaXR5IGlmIHRoZSB0eXBlIGlzIGdlbmVyaWNcbiAgICAgIGNvbnN0IHR5cGVQYXJhbWV0ZXJzID0gY2xhc3NEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycztcbiAgICAgIGlmICh0eXBlUGFyYW1ldGVycyAmJiB0eXBlUGFyYW1ldGVycy5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0LmFyaXR5ID0gdHlwZVBhcmFtZXRlcnMubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgY2xhc3MgZGVjb3JhdG9yc1xuICAgICAgaWYgKGNsYXNzRGVjbGFyYXRpb24uZGVjb3JhdG9ycykge1xuICAgICAgICByZXN1bHQuZGVjb3JhdG9ycyA9IGdldERlY29yYXRvcnMoY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzKTtcbiAgICAgIH1cblxuICAgICAgLy8gbWVtYmVyIGRlY29yYXRvcnNcbiAgICAgIGxldCBtZW1iZXJzOiBNZXRhZGF0YU1hcHxudWxsID0gbnVsbDtcbiAgICAgIGZ1bmN0aW9uIHJlY29yZE1lbWJlcihuYW1lOiBzdHJpbmcsIG1ldGFkYXRhOiBNZW1iZXJNZXRhZGF0YSkge1xuICAgICAgICBpZiAoIW1lbWJlcnMpIG1lbWJlcnMgPSB7fTtcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lbWJlcnMuaGFzT3duUHJvcGVydHkobmFtZSkgPyBtZW1iZXJzW25hbWVdIDogW107XG4gICAgICAgIGRhdGEucHVzaChtZXRhZGF0YSk7XG4gICAgICAgIG1lbWJlcnNbbmFtZV0gPSBkYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyBzdGF0aWMgbWVtYmVyXG4gICAgICBsZXQgc3RhdGljczoge1tuYW1lOiBzdHJpbmddOiBNZXRhZGF0YVZhbHVlIHwgRnVuY3Rpb25NZXRhZGF0YX18bnVsbCA9IG51bGw7XG4gICAgICBmdW5jdGlvbiByZWNvcmRTdGF0aWNNZW1iZXIobmFtZTogc3RyaW5nLCB2YWx1ZTogTWV0YWRhdGFWYWx1ZSB8IEZ1bmN0aW9uTWV0YWRhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0aWNzKSBzdGF0aWNzID0ge307XG4gICAgICAgIHN0YXRpY3NbbmFtZV0gPSB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZW1iZXIgb2YgY2xhc3NEZWNsYXJhdGlvbi5tZW1iZXJzKSB7XG4gICAgICAgIGxldCBpc0NvbnN0cnVjdG9yID0gZmFsc2U7XG4gICAgICAgIHN3aXRjaCAobWVtYmVyLmtpbmQpIHtcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3I6XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk1ldGhvZERlY2xhcmF0aW9uOlxuICAgICAgICAgICAgaXNDb25zdHJ1Y3RvciA9IG1lbWJlci5raW5kID09PSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gPHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24+bWVtYmVyO1xuICAgICAgICAgICAgaWYgKGlzU3RhdGljKG1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgY29uc3QgbWF5YmVGdW5jID0gbWF5YmVHZXRTaW1wbGVGdW5jdGlvbig8dHMuTWV0aG9kRGVjbGFyYXRpb24+bWV0aG9kKTtcbiAgICAgICAgICAgICAgaWYgKG1heWJlRnVuYykge1xuICAgICAgICAgICAgICAgIHJlY29yZFN0YXRpY01lbWJlcihtYXliZUZ1bmMubmFtZSwgbWF5YmVGdW5jLmZ1bmMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kRGVjb3JhdG9ycyA9IGdldERlY29yYXRvcnMobWV0aG9kLmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1ldGVycyA9IG1ldGhvZC5wYXJhbWV0ZXJzO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1ldGVyRGVjb3JhdG9yRGF0YTpcbiAgICAgICAgICAgICAgICAoKE1ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uIHwgTWV0YWRhdGFFcnJvcilbXSB8IHVuZGVmaW5lZClbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1ldGVyc0RhdGE6XG4gICAgICAgICAgICAgICAgKE1ldGFkYXRhU3ltYm9saWNSZWZlcmVuY2VFeHByZXNzaW9uIHwgTWV0YWRhdGFFcnJvciB8XG4gICAgICAgICAgICAgICAgIE1ldGFkYXRhU3ltYm9saWNTZWxlY3RFeHByZXNzaW9uIHwgbnVsbClbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IGhhc0RlY29yYXRvckRhdGE6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCBoYXNQYXJhbWV0ZXJEYXRhOiBib29sZWFuID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBhcmFtZXRlciBvZiBwYXJhbWV0ZXJzKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcmFtZXRlckRhdGEgPSBnZXREZWNvcmF0b3JzKHBhcmFtZXRlci5kZWNvcmF0b3JzKTtcbiAgICAgICAgICAgICAgcGFyYW1ldGVyRGVjb3JhdG9yRGF0YS5wdXNoKHBhcmFtZXRlckRhdGEpO1xuICAgICAgICAgICAgICBoYXNEZWNvcmF0b3JEYXRhID0gaGFzRGVjb3JhdG9yRGF0YSB8fCAhIXBhcmFtZXRlckRhdGE7XG4gICAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtZXRlci50eXBlKSB7XG4gICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzRGF0YS5wdXNoKHJlZmVyZW5jZUZyb20ocGFyYW1ldGVyLnR5cGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyc0RhdGEucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFzUGFyYW1ldGVyRGF0YSA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGE6IE1ldGhvZE1ldGFkYXRhID0ge19fc3ltYm9saWM6IGlzQ29uc3RydWN0b3IgPyAnY29uc3RydWN0b3InIDogJ21ldGhvZCd9O1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGlzQ29uc3RydWN0b3IgPyAnX19jdG9yX18nIDogZXZhbHVhdG9yLm5hbWVPZihtZW1iZXIubmFtZSk7XG4gICAgICAgICAgICBpZiAobWV0aG9kRGVjb3JhdG9ycykge1xuICAgICAgICAgICAgICBkYXRhLmRlY29yYXRvcnMgPSBtZXRob2REZWNvcmF0b3JzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGhhc0RlY29yYXRvckRhdGEpIHtcbiAgICAgICAgICAgICAgZGF0YS5wYXJhbWV0ZXJEZWNvcmF0b3JzID0gcGFyYW1ldGVyRGVjb3JhdG9yRGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChoYXNQYXJhbWV0ZXJEYXRhKSB7XG4gICAgICAgICAgICAgICg8Q29uc3RydWN0b3JNZXRhZGF0YT5kYXRhKS5wYXJhbWV0ZXJzID0gcGFyYW1ldGVyc0RhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzTWV0YWRhdGFFcnJvcihuYW1lKSkge1xuICAgICAgICAgICAgICByZWNvcmRNZW1iZXIobmFtZSwgZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuUHJvcGVydHlEZWNsYXJhdGlvbjpcbiAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuR2V0QWNjZXNzb3I6XG4gICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNldEFjY2Vzc29yOlxuICAgICAgICAgICAgY29uc3QgcHJvcGVydHkgPSA8dHMuUHJvcGVydHlEZWNsYXJhdGlvbj5tZW1iZXI7XG4gICAgICAgICAgICBpZiAoaXNTdGF0aWMocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBldmFsdWF0b3IubmFtZU9mKHByb3BlcnR5Lm5hbWUpO1xuICAgICAgICAgICAgICBpZiAoIWlzTWV0YWRhdGFFcnJvcihuYW1lKSAmJiAhc2hvdWxkSWdub3JlU3RhdGljTWVtYmVyKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5LmluaXRpYWxpemVyKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUocHJvcGVydHkuaW5pdGlhbGl6ZXIpO1xuICAgICAgICAgICAgICAgICAgcmVjb3JkU3RhdGljTWVtYmVyKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVjb3JkU3RhdGljTWVtYmVyKG5hbWUsIGVycm9yU3ltKCdWYXJpYWJsZSBub3QgaW5pdGlhbGl6ZWQnLCBwcm9wZXJ0eS5uYW1lKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eURlY29yYXRvcnMgPSBnZXREZWNvcmF0b3JzKHByb3BlcnR5LmRlY29yYXRvcnMpO1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5RGVjb3JhdG9ycykge1xuICAgICAgICAgICAgICBjb25zdCBuYW1lID0gZXZhbHVhdG9yLm5hbWVPZihwcm9wZXJ0eS5uYW1lKTtcbiAgICAgICAgICAgICAgaWYgKCFpc01ldGFkYXRhRXJyb3IobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZWNvcmRNZW1iZXIobmFtZSwge19fc3ltYm9saWM6ICdwcm9wZXJ0eScsIGRlY29yYXRvcnM6IHByb3BlcnR5RGVjb3JhdG9yc30pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG1lbWJlcnMpIHtcbiAgICAgICAgcmVzdWx0Lm1lbWJlcnMgPSBtZW1iZXJzO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRpY3MpIHtcbiAgICAgICAgcmVzdWx0LnN0YXRpY3MgPSBzdGF0aWNzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVjb3JkRW50cnkocmVzdWx0LCBjbGFzc0RlY2xhcmF0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBDb2xsZWN0IGFsbCBleHBvcnRlZCBzeW1ib2xzIGZyb20gYW4gZXhwb3J0cyBjbGF1c2UuXG4gICAgY29uc3QgZXhwb3J0TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICB0cy5mb3JFYWNoQ2hpbGQoc291cmNlRmlsZSwgbm9kZSA9PiB7XG4gICAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRXhwb3J0RGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgZXhwb3J0RGVjbGFyYXRpb24gPSA8dHMuRXhwb3J0RGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBjb25zdCB7bW9kdWxlU3BlY2lmaWVyLCBleHBvcnRDbGF1c2V9ID0gZXhwb3J0RGVjbGFyYXRpb247XG5cbiAgICAgICAgICBpZiAoIW1vZHVsZVNwZWNpZmllciAmJiBleHBvcnRDbGF1c2UgJiYgdHMuaXNOYW1lZEV4cG9ydHMoZXhwb3J0Q2xhdXNlKSkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBtb2R1bGUgc3BlY2lmaWVyIHRoZXJlIGlzIGFsc28gYW4gZXhwb3J0Q2xhdXNlXG4gICAgICAgICAgICBleHBvcnRDbGF1c2UuZWxlbWVudHMuZm9yRWFjaChzcGVjID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgZXhwb3J0ZWRBcyA9IHNwZWMubmFtZS50ZXh0O1xuICAgICAgICAgICAgICBjb25zdCBuYW1lID0gKHNwZWMucHJvcGVydHlOYW1lIHx8IHNwZWMubmFtZSkudGV4dDtcbiAgICAgICAgICAgICAgZXhwb3J0TWFwLnNldChuYW1lLCBleHBvcnRlZEFzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGlzRXhwb3J0ID0gKG5vZGU6IHRzLk5vZGUpID0+IHNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgfHxcbiAgICAgICAgdHMuZ2V0Q29tYmluZWRNb2RpZmllckZsYWdzKG5vZGUgYXMgdHMuRGVjbGFyYXRpb24pICYgdHMuTW9kaWZpZXJGbGFncy5FeHBvcnQ7XG4gICAgY29uc3QgaXNFeHBvcnRlZElkZW50aWZpZXIgPSAoaWRlbnRpZmllcj86IHRzLklkZW50aWZpZXIpID0+XG4gICAgICAgIGlkZW50aWZpZXIgJiYgZXhwb3J0TWFwLmhhcyhpZGVudGlmaWVyLnRleHQpO1xuICAgIGNvbnN0IGlzRXhwb3J0ZWQgPVxuICAgICAgICAobm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB8IHRzLkNsYXNzRGVjbGFyYXRpb24gfCB0cy5UeXBlQWxpYXNEZWNsYXJhdGlvbiB8XG4gICAgICAgICB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbiB8IHRzLkVudW1EZWNsYXJhdGlvbikgPT5cbiAgICAgICAgICAgIGlzRXhwb3J0KG5vZGUpIHx8IGlzRXhwb3J0ZWRJZGVudGlmaWVyKG5vZGUubmFtZSk7XG4gICAgY29uc3QgZXhwb3J0ZWRJZGVudGlmaWVyTmFtZSA9IChpZGVudGlmaWVyPzogdHMuSWRlbnRpZmllcikgPT5cbiAgICAgICAgaWRlbnRpZmllciAmJiAoZXhwb3J0TWFwLmdldChpZGVudGlmaWVyLnRleHQpIHx8IGlkZW50aWZpZXIudGV4dCk7XG4gICAgY29uc3QgZXhwb3J0ZWROYW1lID1cbiAgICAgICAgKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24gfCB0cy5DbGFzc0RlY2xhcmF0aW9uIHwgdHMuSW50ZXJmYWNlRGVjbGFyYXRpb24gfFxuICAgICAgICAgdHMuVHlwZUFsaWFzRGVjbGFyYXRpb24gfCB0cy5FbnVtRGVjbGFyYXRpb24pID0+IGV4cG9ydGVkSWRlbnRpZmllck5hbWUobm9kZS5uYW1lKTtcblxuXG4gICAgLy8gUHJlLWRlY2xhcmUgY2xhc3NlcyBhbmQgZnVuY3Rpb25zXG4gICAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIG5vZGUgPT4ge1xuICAgICAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IDx0cy5DbGFzc0RlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKGNsYXNzRGVjbGFyYXRpb24ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQ7XG4gICAgICAgICAgICBpZiAoaXNFeHBvcnRlZChjbGFzc0RlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKFxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lLCB7X19zeW1ib2xpYzogJ3JlZmVyZW5jZScsIG5hbWU6IGV4cG9ydGVkTmFtZShjbGFzc0RlY2xhcmF0aW9uKX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZSwgZXJyb3JTeW0oJ1JlZmVyZW5jZSB0byBub24tZXhwb3J0ZWQgY2xhc3MnLCBub2RlLCB7Y2xhc3NOYW1lfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW50ZXJmYWNlRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgaW50ZXJmYWNlRGVjbGFyYXRpb24gPSA8dHMuSW50ZXJmYWNlRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoaW50ZXJmYWNlRGVjbGFyYXRpb24ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlTmFtZSA9IGludGVyZmFjZURlY2xhcmF0aW9uLm5hbWUudGV4dDtcbiAgICAgICAgICAgIC8vIEFsbCByZWZlcmVuY2VzIHRvIGludGVyZmFjZXMgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byByZWZlcmVuY2VzIHRvIGBhbnlgLlxuICAgICAgICAgICAgbG9jYWxzLmRlZmluZShpbnRlcmZhY2VOYW1lLCB7X19zeW1ib2xpYzogJ3JlZmVyZW5jZScsIG5hbWU6ICdhbnknfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IGZ1bmN0aW9uRGVjbGFyYXRpb24gPSA8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbj5ub2RlO1xuICAgICAgICAgIGlmICghaXNFeHBvcnRlZChmdW5jdGlvbkRlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gUmVwb3J0IHJlZmVyZW5jZXMgdG8gdGhpcyBmdW5jdGlvbiBhcyBhbiBlcnJvci5cbiAgICAgICAgICAgIGNvbnN0IG5hbWVOb2RlID0gZnVuY3Rpb25EZWNsYXJhdGlvbi5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWVOb2RlICYmIG5hbWVOb2RlLnRleHQpIHtcbiAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShcbiAgICAgICAgICAgICAgICAgIG5hbWVOb2RlLnRleHQsXG4gICAgICAgICAgICAgICAgICBlcnJvclN5bShcbiAgICAgICAgICAgICAgICAgICAgICAnUmVmZXJlbmNlIHRvIGEgbm9uLWV4cG9ydGVkIGZ1bmN0aW9uJywgbmFtZU5vZGUsIHtuYW1lOiBuYW1lTm9kZS50ZXh0fSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBub2RlID0+IHtcbiAgICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5FeHBvcnREZWNsYXJhdGlvbjpcbiAgICAgICAgICAvLyBSZWNvcmQgZXhwb3J0IGRlY2xhcmF0aW9uc1xuICAgICAgICAgIGNvbnN0IGV4cG9ydERlY2xhcmF0aW9uID0gPHRzLkV4cG9ydERlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgY29uc3Qge21vZHVsZVNwZWNpZmllciwgZXhwb3J0Q2xhdXNlfSA9IGV4cG9ydERlY2xhcmF0aW9uO1xuXG4gICAgICAgICAgaWYgKCFtb2R1bGVTcGVjaWZpZXIpIHtcbiAgICAgICAgICAgIC8vIG5vIG1vZHVsZSBzcGVjaWZpZXIgLT4gZXhwb3J0IHtwcm9wTmFtZSBhcyBuYW1lfTtcbiAgICAgICAgICAgIGlmIChleHBvcnRDbGF1c2UgJiYgdHMuaXNOYW1lZEV4cG9ydHMoZXhwb3J0Q2xhdXNlKSkge1xuICAgICAgICAgICAgICBleHBvcnRDbGF1c2UuZWxlbWVudHMuZm9yRWFjaChzcGVjID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gc3BlYy5uYW1lLnRleHQ7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHN5bWJvbCB3YXMgbm90IGFscmVhZHkgZXhwb3J0ZWQsIGV4cG9ydCBhIHJlZmVyZW5jZSBzaW5jZSBpdCBpcyBhXG4gICAgICAgICAgICAgICAgLy8gcmVmZXJlbmNlIHRvIGFuIGltcG9ydFxuICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEgfHwgIW1ldGFkYXRhW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBwcm9wTm9kZSA9IHNwZWMucHJvcGVydHlOYW1lIHx8IHNwZWMubmFtZTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlOiBNZXRhZGF0YVZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlTm9kZShwcm9wTm9kZSk7XG4gICAgICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSByZWNvcmRFbnRyeSh2YWx1ZSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kdWxlU3BlY2lmaWVyICYmIG1vZHVsZVNwZWNpZmllci5raW5kID09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgLy8gSWdub3JlIGV4cG9ydHMgdGhhdCBkb24ndCBoYXZlIHN0cmluZyBsaXRlcmFscyBhcyBleHBvcnRzLlxuICAgICAgICAgICAgLy8gVGhpcyBpcyBhbGxvd2VkIGJ5IHRoZSBzeW50YXggYnV0IHdpbGwgYmUgZmxhZ2dlZCBhcyBhbiBlcnJvciBieSB0aGUgdHlwZSBjaGVja2VyLlxuICAgICAgICAgICAgY29uc3QgZnJvbSA9ICg8dHMuU3RyaW5nTGl0ZXJhbD5tb2R1bGVTcGVjaWZpZXIpLnRleHQ7XG4gICAgICAgICAgICBjb25zdCBtb2R1bGVFeHBvcnQ6IE1vZHVsZUV4cG9ydE1ldGFkYXRhID0ge2Zyb219O1xuICAgICAgICAgICAgaWYgKGV4cG9ydENsYXVzZSAmJiB0cy5pc05hbWVkRXhwb3J0cyhleHBvcnRDbGF1c2UpKSB7XG4gICAgICAgICAgICAgIG1vZHVsZUV4cG9ydC5leHBvcnQgPSBleHBvcnRDbGF1c2UuZWxlbWVudHMubWFwKFxuICAgICAgICAgICAgICAgICAgc3BlYyA9PiBzcGVjLnByb3BlcnR5TmFtZSA/IHtuYW1lOiBzcGVjLnByb3BlcnR5TmFtZS50ZXh0LCBhczogc3BlYy5uYW1lLnRleHR9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGVjLm5hbWUudGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWV4cG9ydHMpIGV4cG9ydHMgPSBbXTtcbiAgICAgICAgICAgIGV4cG9ydHMucHVzaChtb2R1bGVFeHBvcnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IDx0cy5DbGFzc0RlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKGNsYXNzRGVjbGFyYXRpb24ubmFtZSkge1xuICAgICAgICAgICAgaWYgKGlzRXhwb3J0ZWQoY2xhc3NEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkTmFtZShjbGFzc0RlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIG1ldGFkYXRhW25hbWVdID0gY2xhc3NNZXRhZGF0YU9mKGNsYXNzRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE90aGVyd2lzZSBkb24ndCByZWNvcmQgbWV0YWRhdGEgZm9yIHRoZSBjbGFzcy5cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHlwZUFsaWFzRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgdHlwZURlY2xhcmF0aW9uID0gPHRzLlR5cGVBbGlhc0RlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKHR5cGVEZWNsYXJhdGlvbi5uYW1lICYmIGlzRXhwb3J0ZWQodHlwZURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkTmFtZSh0eXBlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSB7X19zeW1ib2xpYzogJ2ludGVyZmFjZSd9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW50ZXJmYWNlRGVjbGFyYXRpb246XG4gICAgICAgICAgY29uc3QgaW50ZXJmYWNlRGVjbGFyYXRpb24gPSA8dHMuSW50ZXJmYWNlRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoaW50ZXJmYWNlRGVjbGFyYXRpb24ubmFtZSAmJiBpc0V4cG9ydGVkKGludGVyZmFjZURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkTmFtZShpbnRlcmZhY2VEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICBtZXRhZGF0YVtuYW1lXSA9IHtfX3N5bWJvbGljOiAnaW50ZXJmYWNlJ307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgIC8vIFJlY29yZCBmdW5jdGlvbnMgdGhhdCByZXR1cm4gYSBzaW5nbGUgdmFsdWUuIFJlY29yZCB0aGUgcGFyYW1ldGVyXG4gICAgICAgICAgLy8gbmFtZXMgc3Vic3RpdHV0aW9uIHdpbGwgYmUgcGVyZm9ybWVkIGJ5IHRoZSBTdGF0aWNSZWZsZWN0b3IuXG4gICAgICAgICAgY29uc3QgZnVuY3Rpb25EZWNsYXJhdGlvbiA9IDx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uPm5vZGU7XG4gICAgICAgICAgaWYgKGlzRXhwb3J0ZWQoZnVuY3Rpb25EZWNsYXJhdGlvbikgJiYgZnVuY3Rpb25EZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWROYW1lKGZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVGdW5jID0gbWF5YmVHZXRTaW1wbGVGdW5jdGlvbihmdW5jdGlvbkRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgIGlmICghbWV0YWRhdGEpIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogVGhlIGxpdGVyYWwgaGVyZSBpcyBub3QgdmFsaWQgRnVuY3Rpb25NZXRhZGF0YS5cbiAgICAgICAgICAgICAgbWV0YWRhdGFbbmFtZV0gPSBtYXliZUZ1bmMgPyByZWNvcmRFbnRyeShtYXliZUZ1bmMuZnVuYywgbm9kZSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh7IF9fc3ltYm9saWM6ICdmdW5jdGlvbicgfSBhcyBhbnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRW51bURlY2xhcmF0aW9uOlxuICAgICAgICAgIGNvbnN0IGVudW1EZWNsYXJhdGlvbiA9IDx0cy5FbnVtRGVjbGFyYXRpb24+bm9kZTtcbiAgICAgICAgICBpZiAoaXNFeHBvcnRlZChlbnVtRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBlbnVtVmFsdWVIb2xkZXI6IHtbbmFtZTogc3RyaW5nXTogTWV0YWRhdGFWYWx1ZX0gPSB7fTtcbiAgICAgICAgICAgIGNvbnN0IGVudW1OYW1lID0gZXhwb3J0ZWROYW1lKGVudW1EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBsZXQgbmV4dERlZmF1bHRWYWx1ZTogTWV0YWRhdGFWYWx1ZSA9IDA7XG4gICAgICAgICAgICBsZXQgd3JpdHRlbk1lbWJlcnMgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBtZW1iZXIgb2YgZW51bURlY2xhcmF0aW9uLm1lbWJlcnMpIHtcbiAgICAgICAgICAgICAgbGV0IGVudW1WYWx1ZTogTWV0YWRhdGFWYWx1ZTtcbiAgICAgICAgICAgICAgaWYgKCFtZW1iZXIuaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICBlbnVtVmFsdWUgPSBuZXh0RGVmYXVsdFZhbHVlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVudW1WYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUobWVtYmVyLmluaXRpYWxpemVyKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsZXQgbmFtZTogc3RyaW5nfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgaWYgKG1lbWJlci5uYW1lLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IDx0cy5JZGVudGlmaWVyPm1lbWJlci5uYW1lO1xuICAgICAgICAgICAgICAgIG5hbWUgPSBpZGVudGlmaWVyLnRleHQ7XG4gICAgICAgICAgICAgICAgZW51bVZhbHVlSG9sZGVyW25hbWVdID0gZW51bVZhbHVlO1xuICAgICAgICAgICAgICAgIHdyaXR0ZW5NZW1iZXJzKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBlbnVtVmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgbmV4dERlZmF1bHRWYWx1ZSA9IGVudW1WYWx1ZSArIDE7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogJ2xlZnQnIGhlcmUgaGFzIGEgbmFtZSBwcm9wZXJ5IHdoaWNoIGlzIG5vdCB2YWxpZCBmb3JcbiAgICAgICAgICAgICAgICAvLyBNZXRhZGF0YVN5bWJvbGljU2VsZWN0RXhwcmVzc2lvbi5cbiAgICAgICAgICAgICAgICBuZXh0RGVmYXVsdFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgX19zeW1ib2xpYzogJ2JpbmFyeScsXG4gICAgICAgICAgICAgICAgICBvcGVyYXRvcjogJysnLFxuICAgICAgICAgICAgICAgICAgbGVmdDoge1xuICAgICAgICAgICAgICAgICAgICBfX3N5bWJvbGljOiAnc2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgZXhwcmVzc2lvbjogcmVjb3JkRW50cnkoe19fc3ltYm9saWM6ICdyZWZlcmVuY2UnLCBuYW1lOiBlbnVtTmFtZX0sIG5vZGUpLCBuYW1lXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0gYXMgYW55O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHREZWZhdWx0VmFsdWUgPVxuICAgICAgICAgICAgICAgICAgICByZWNvcmRFbnRyeShlcnJvclN5bSgnVW5zdXBwb3J0ZWQgZW51bSBtZW1iZXIgbmFtZScsIG1lbWJlci5uYW1lKSwgbm9kZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3cml0dGVuTWVtYmVycykge1xuICAgICAgICAgICAgICBpZiAoZW51bU5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIG1ldGFkYXRhW2VudW1OYW1lXSA9IHJlY29yZEVudHJ5KGVudW1WYWx1ZUhvbGRlciwgbm9kZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlZhcmlhYmxlU3RhdGVtZW50OlxuICAgICAgICAgIGNvbnN0IHZhcmlhYmxlU3RhdGVtZW50ID0gPHRzLlZhcmlhYmxlU3RhdGVtZW50Pm5vZGU7XG4gICAgICAgICAgZm9yIChjb25zdCB2YXJpYWJsZURlY2xhcmF0aW9uIG9mIHZhcmlhYmxlU3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICh2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgY29uc3QgbmFtZU5vZGUgPSA8dHMuSWRlbnRpZmllcj52YXJpYWJsZURlY2xhcmF0aW9uLm5hbWU7XG4gICAgICAgICAgICAgIGxldCB2YXJWYWx1ZTogTWV0YWRhdGFWYWx1ZTtcbiAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlRGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICB2YXJWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZU5vZGUodmFyaWFibGVEZWNsYXJhdGlvbi5pbml0aWFsaXplcik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyVmFsdWUgPSByZWNvcmRFbnRyeShlcnJvclN5bSgnVmFyaWFibGUgbm90IGluaXRpYWxpemVkJywgbmFtZU5vZGUpLCBuYW1lTm9kZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGV0IGV4cG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGlmIChpc0V4cG9ydCh2YXJpYWJsZVN0YXRlbWVudCkgfHwgaXNFeHBvcnQodmFyaWFibGVEZWNsYXJhdGlvbikgfHxcbiAgICAgICAgICAgICAgICAgIGlzRXhwb3J0ZWRJZGVudGlmaWVyKG5hbWVOb2RlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZElkZW50aWZpZXJOYW1lKG5hbWVOb2RlKTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgaWYgKCFtZXRhZGF0YSkgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgIG1ldGFkYXRhW25hbWVdID0gcmVjb3JkRW50cnkodmFyVmFsdWUsIG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBvcnRlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YXJWYWx1ZSA9PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFyVmFsdWUgPT0gJ251bWJlcicgfHxcbiAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YXJWYWx1ZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKG5hbWVOb2RlLnRleHQsIHZhclZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoZXhwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgIGxvY2Fscy5kZWZpbmVSZWZlcmVuY2UoXG4gICAgICAgICAgICAgICAgICAgICAgbmFtZU5vZGUudGV4dCwge19fc3ltYm9saWM6ICdyZWZlcmVuY2UnLCBuYW1lOiBuYW1lTm9kZS50ZXh0fSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFleHBvcnRlZCkge1xuICAgICAgICAgICAgICAgIGlmICh2YXJWYWx1ZSAmJiAhaXNNZXRhZGF0YUVycm9yKHZhclZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgbG9jYWxzLmRlZmluZShuYW1lTm9kZS50ZXh0LCByZWNvcmRFbnRyeSh2YXJWYWx1ZSwgbm9kZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKFxuICAgICAgICAgICAgICAgICAgICAgIG5hbWVOb2RlLnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgcmVjb3JkRW50cnkoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yU3ltKCdSZWZlcmVuY2UgdG8gYSBsb2NhbCBzeW1ib2wnLCBuYW1lTm9kZSwge25hbWU6IG5hbWVOb2RlLnRleHR9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gRGVzdHJ1Y3R1cmluZyAob3IgYmluZGluZykgZGVjbGFyYXRpb25zIGFyZSBub3Qgc3VwcG9ydGVkLFxuICAgICAgICAgICAgICAvLyB2YXIgezxpZGVudGlmaWVyPlssIDxpZGVudGlmaWVyPl0rfSA9IDxleHByZXNzaW9uPjtcbiAgICAgICAgICAgICAgLy8gICBvclxuICAgICAgICAgICAgICAvLyB2YXIgWzxpZGVudGlmaWVyPlssIDxpZGVudGlmaWVyfStdID0gPGV4cHJlc3Npb24+O1xuICAgICAgICAgICAgICAvLyBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgICAgICAgICAgY29uc3QgcmVwb3J0OiAobmFtZU5vZGU6IHRzLk5vZGUpID0+IHZvaWQgPSAobmFtZU5vZGU6IHRzLk5vZGUpID0+IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG5hbWVOb2RlLmtpbmQpIHtcbiAgICAgICAgICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gPHRzLklkZW50aWZpZXI+bmFtZU5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhclZhbHVlID0gZXJyb3JTeW0oJ0Rlc3RydWN0dXJpbmcgbm90IHN1cHBvcnRlZCcsIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbHMuZGVmaW5lKG5hbWUudGV4dCwgdmFyVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNFeHBvcnQobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1ldGFkYXRhKSBtZXRhZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhW25hbWUudGV4dF0gPSB2YXJWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5CaW5kaW5nRWxlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmluZGluZ0VsZW1lbnQgPSA8dHMuQmluZGluZ0VsZW1lbnQ+bmFtZU5vZGU7XG4gICAgICAgICAgICAgICAgICAgIHJlcG9ydChiaW5kaW5nRWxlbWVudC5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuT2JqZWN0QmluZGluZ1BhdHRlcm46XG4gICAgICAgICAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQXJyYXlCaW5kaW5nUGF0dGVybjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmluZGluZ3MgPSA8dHMuQmluZGluZ1BhdHRlcm4+bmFtZU5vZGU7XG4gICAgICAgICAgICAgICAgICAgIChiaW5kaW5ncyBhcyBhbnkpLmVsZW1lbnRzLmZvckVhY2gocmVwb3J0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZXBvcnQodmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAobWV0YWRhdGEgfHwgZXhwb3J0cykge1xuICAgICAgaWYgKCFtZXRhZGF0YSlcbiAgICAgICAgbWV0YWRhdGEgPSB7fTtcbiAgICAgIGVsc2UgaWYgKHN0cmljdCkge1xuICAgICAgICB2YWxpZGF0ZU1ldGFkYXRhKHNvdXJjZUZpbGUsIG5vZGVNYXAsIG1ldGFkYXRhKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc3VsdDogTW9kdWxlTWV0YWRhdGEgPSB7XG4gICAgICAgIF9fc3ltYm9saWM6ICdtb2R1bGUnLFxuICAgICAgICB2ZXJzaW9uOiB0aGlzLm9wdGlvbnMudmVyc2lvbiB8fCBNRVRBREFUQV9WRVJTSU9OLCBtZXRhZGF0YVxuICAgICAgfTtcbiAgICAgIGlmIChzb3VyY2VGaWxlLm1vZHVsZU5hbWUpIHJlc3VsdC5pbXBvcnRBcyA9IHNvdXJjZUZpbGUubW9kdWxlTmFtZTtcbiAgICAgIGlmIChleHBvcnRzKSByZXN1bHQuZXhwb3J0cyA9IGV4cG9ydHM7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHdpbGwgdGhyb3cgaWYgdGhlIG1ldGFkYXRhIGVudHJ5IGdpdmVuIGNvbnRhaW5zIGFuIGVycm9yIG5vZGUuXG5mdW5jdGlvbiB2YWxpZGF0ZU1ldGFkYXRhKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIG5vZGVNYXA6IE1hcDxNZXRhZGF0YUVudHJ5LCB0cy5Ob2RlPixcbiAgICBtZXRhZGF0YToge1tuYW1lOiBzdHJpbmddOiBNZXRhZGF0YUVudHJ5fSkge1xuICBsZXQgbG9jYWxzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoWydBcnJheScsICdPYmplY3QnLCAnU2V0JywgJ01hcCcsICdzdHJpbmcnLCAnbnVtYmVyJywgJ2FueSddKTtcblxuICBmdW5jdGlvbiB2YWxpZGF0ZUV4cHJlc3Npb24oXG4gICAgICBleHByZXNzaW9uOiBNZXRhZGF0YVZhbHVlIHwgTWV0YWRhdGFTeW1ib2xpY0V4cHJlc3Npb24gfCBNZXRhZGF0YUVycm9yKSB7XG4gICAgaWYgKCFleHByZXNzaW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGV4cHJlc3Npb24pKSB7XG4gICAgICBleHByZXNzaW9uLmZvckVhY2godmFsaWRhdGVFeHByZXNzaW9uKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHByZXNzaW9uID09PSAnb2JqZWN0JyAmJiAhZXhwcmVzc2lvbi5oYXNPd25Qcm9wZXJ0eSgnX19zeW1ib2xpYycpKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhleHByZXNzaW9uKS5mb3JFYWNoKHYgPT4gdmFsaWRhdGVFeHByZXNzaW9uKCg8YW55PmV4cHJlc3Npb24pW3ZdKSk7XG4gICAgfSBlbHNlIGlmIChpc01ldGFkYXRhRXJyb3IoZXhwcmVzc2lvbikpIHtcbiAgICAgIHJlcG9ydEVycm9yKGV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSBpZiAoaXNNZXRhZGF0YUdsb2JhbFJlZmVyZW5jZUV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgIGlmICghbG9jYWxzLmhhcyhleHByZXNzaW9uLm5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHJlZmVyZW5jZSA9IDxNZXRhZGF0YVZhbHVlPm1ldGFkYXRhW2V4cHJlc3Npb24ubmFtZV07XG4gICAgICAgIGlmIChyZWZlcmVuY2UpIHtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24ocmVmZXJlbmNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbk1ldGFkYXRhKGV4cHJlc3Npb24pKSB7XG4gICAgICB2YWxpZGF0ZUZ1bmN0aW9uKDxhbnk+ZXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIGlmIChpc01ldGFkYXRhU3ltYm9saWNFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICBzd2l0Y2ggKGV4cHJlc3Npb24uX19zeW1ib2xpYykge1xuICAgICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICAgIGNvbnN0IGJpbmFyeUV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY0JpbmFyeUV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oYmluYXJ5RXhwcmVzc2lvbi5sZWZ0KTtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oYmluYXJ5RXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NhbGwnOlxuICAgICAgICBjYXNlICduZXcnOlxuICAgICAgICAgIGNvbnN0IGNhbGxFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNDYWxsRXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihjYWxsRXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICAgICAgICBpZiAoY2FsbEV4cHJlc3Npb24uYXJndW1lbnRzKSBjYWxsRXhwcmVzc2lvbi5hcmd1bWVudHMuZm9yRWFjaCh2YWxpZGF0ZUV4cHJlc3Npb24pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpbmRleCc6XG4gICAgICAgICAgY29uc3QgaW5kZXhFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNJbmRleEV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oaW5kZXhFeHByZXNzaW9uLmV4cHJlc3Npb24pO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihpbmRleEV4cHJlc3Npb24uaW5kZXgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwcmUnOlxuICAgICAgICAgIGNvbnN0IHByZWZpeEV4cHJlc3Npb24gPSA8TWV0YWRhdGFTeW1ib2xpY1ByZWZpeEV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24ocHJlZml4RXhwcmVzc2lvbi5vcGVyYW5kKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgICAgICBjb25zdCBzZWxlY3RFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNTZWxlY3RFeHByZXNzaW9uPmV4cHJlc3Npb247XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKHNlbGVjdEV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NwcmVhZCc6XG4gICAgICAgICAgY29uc3Qgc3ByZWFkRXhwcmVzc2lvbiA9IDxNZXRhZGF0YVN5bWJvbGljU3ByZWFkRXhwcmVzc2lvbj5leHByZXNzaW9uO1xuICAgICAgICAgIHZhbGlkYXRlRXhwcmVzc2lvbihzcHJlYWRFeHByZXNzaW9uLmV4cHJlc3Npb24pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpZic6XG4gICAgICAgICAgY29uc3QgaWZFeHByZXNzaW9uID0gPE1ldGFkYXRhU3ltYm9saWNJZkV4cHJlc3Npb24+ZXhwcmVzc2lvbjtcbiAgICAgICAgICB2YWxpZGF0ZUV4cHJlc3Npb24oaWZFeHByZXNzaW9uLmNvbmRpdGlvbik7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGlmRXhwcmVzc2lvbi5lbHNlRXhwcmVzc2lvbik7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGlmRXhwcmVzc2lvbi50aGVuRXhwcmVzc2lvbik7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVNZW1iZXIoY2xhc3NEYXRhOiBDbGFzc01ldGFkYXRhLCBtZW1iZXI6IE1lbWJlck1ldGFkYXRhKSB7XG4gICAgaWYgKG1lbWJlci5kZWNvcmF0b3JzKSB7XG4gICAgICBtZW1iZXIuZGVjb3JhdG9ycy5mb3JFYWNoKHZhbGlkYXRlRXhwcmVzc2lvbik7XG4gICAgfVxuICAgIGlmIChpc01ldGhvZE1ldGFkYXRhKG1lbWJlcikgJiYgbWVtYmVyLnBhcmFtZXRlckRlY29yYXRvcnMpIHtcbiAgICAgIG1lbWJlci5wYXJhbWV0ZXJEZWNvcmF0b3JzLmZvckVhY2godmFsaWRhdGVFeHByZXNzaW9uKTtcbiAgICB9XG4gICAgLy8gT25seSB2YWxpZGF0ZSBwYXJhbWV0ZXJzIG9mIGNsYXNzZXMgZm9yIHdoaWNoIHdlIGtub3cgdGhhdCBhcmUgdXNlZCB3aXRoIG91ciBESVxuICAgIGlmIChjbGFzc0RhdGEuZGVjb3JhdG9ycyAmJiBpc0NvbnN0cnVjdG9yTWV0YWRhdGEobWVtYmVyKSAmJiBtZW1iZXIucGFyYW1ldGVycykge1xuICAgICAgbWVtYmVyLnBhcmFtZXRlcnMuZm9yRWFjaCh2YWxpZGF0ZUV4cHJlc3Npb24pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlQ2xhc3MoY2xhc3NEYXRhOiBDbGFzc01ldGFkYXRhKSB7XG4gICAgaWYgKGNsYXNzRGF0YS5kZWNvcmF0b3JzKSB7XG4gICAgICBjbGFzc0RhdGEuZGVjb3JhdG9ycy5mb3JFYWNoKHZhbGlkYXRlRXhwcmVzc2lvbik7XG4gICAgfVxuICAgIGlmIChjbGFzc0RhdGEubWVtYmVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xhc3NEYXRhLm1lbWJlcnMpXG4gICAgICAgICAgLmZvckVhY2gobmFtZSA9PiBjbGFzc0RhdGEubWVtYmVycyAhW25hbWVdLmZvckVhY2goKG0pID0+IHZhbGlkYXRlTWVtYmVyKGNsYXNzRGF0YSwgbSkpKTtcbiAgICB9XG4gICAgaWYgKGNsYXNzRGF0YS5zdGF0aWNzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhjbGFzc0RhdGEuc3RhdGljcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdGljTWVtYmVyID0gY2xhc3NEYXRhLnN0YXRpY3MgIVtuYW1lXTtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb25NZXRhZGF0YShzdGF0aWNNZW1iZXIpKSB7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKHN0YXRpY01lbWJlci52YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKHN0YXRpY01lbWJlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlRnVuY3Rpb24oZnVuY3Rpb25EZWNsYXJhdGlvbjogRnVuY3Rpb25NZXRhZGF0YSkge1xuICAgIGlmIChmdW5jdGlvbkRlY2xhcmF0aW9uLnZhbHVlKSB7XG4gICAgICBjb25zdCBvbGRMb2NhbHMgPSBsb2NhbHM7XG4gICAgICBpZiAoZnVuY3Rpb25EZWNsYXJhdGlvbi5wYXJhbWV0ZXJzKSB7XG4gICAgICAgIGxvY2FscyA9IG5ldyBTZXQob2xkTG9jYWxzLnZhbHVlcygpKTtcbiAgICAgICAgaWYgKGZ1bmN0aW9uRGVjbGFyYXRpb24ucGFyYW1ldGVycylcbiAgICAgICAgICBmdW5jdGlvbkRlY2xhcmF0aW9uLnBhcmFtZXRlcnMuZm9yRWFjaChuID0+IGxvY2Fscy5hZGQobikpO1xuICAgICAgfVxuICAgICAgdmFsaWRhdGVFeHByZXNzaW9uKGZ1bmN0aW9uRGVjbGFyYXRpb24udmFsdWUpO1xuICAgICAgbG9jYWxzID0gb2xkTG9jYWxzO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3VsZFJlcG9ydE5vZGUobm9kZTogdHMuTm9kZSB8IHVuZGVmaW5lZCkge1xuICAgIGlmIChub2RlKSB7XG4gICAgICBjb25zdCBub2RlU3RhcnQgPSBub2RlLmdldFN0YXJ0KCk7XG4gICAgICByZXR1cm4gIShcbiAgICAgICAgICBub2RlLnBvcyAhPSBub2RlU3RhcnQgJiZcbiAgICAgICAgICBzb3VyY2VGaWxlLnRleHQuc3Vic3RyaW5nKG5vZGUucG9zLCBub2RlU3RhcnQpLmluZGV4T2YoJ0BkeW5hbWljJykgPj0gMCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwb3J0RXJyb3IoZXJyb3I6IE1ldGFkYXRhRXJyb3IpIHtcbiAgICBjb25zdCBub2RlID0gbm9kZU1hcC5nZXQoZXJyb3IpO1xuICAgIGlmIChzaG91bGRSZXBvcnROb2RlKG5vZGUpKSB7XG4gICAgICBjb25zdCBsaW5lSW5mbyA9IGVycm9yLmxpbmUgIT0gdW5kZWZpbmVkID9cbiAgICAgICAgICBlcnJvci5jaGFyYWN0ZXIgIT0gdW5kZWZpbmVkID8gYDoke2Vycm9yLmxpbmUgKyAxfToke2Vycm9yLmNoYXJhY3RlciArIDF9YCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA6JHtlcnJvci5saW5lICsgMX1gIDpcbiAgICAgICAgICAnJztcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSR7XG4gICAgICAgICAgbGluZUluZm99OiBNZXRhZGF0YSBjb2xsZWN0ZWQgY29udGFpbnMgYW4gZXJyb3IgdGhhdCB3aWxsIGJlIHJlcG9ydGVkIGF0IHJ1bnRpbWU6ICR7XG4gICAgICAgICAgZXhwYW5kZWRNZXNzYWdlKGVycm9yKX0uXFxuICAke0pTT04uc3RyaW5naWZ5KGVycm9yKX1gKTtcbiAgICB9XG4gIH1cblxuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtZXRhZGF0YSkuZm9yRWFjaChuYW1lID0+IHtcbiAgICBjb25zdCBlbnRyeSA9IG1ldGFkYXRhW25hbWVdO1xuICAgIHRyeSB7XG4gICAgICBpZiAoaXNDbGFzc01ldGFkYXRhKGVudHJ5KSkge1xuICAgICAgICB2YWxpZGF0ZUNsYXNzKGVudHJ5KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zdCBub2RlID0gbm9kZU1hcC5nZXQoZW50cnkpO1xuICAgICAgaWYgKHNob3VsZFJlcG9ydE5vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IHNvdXJjZUZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24obm9kZS5nZXRTdGFydCgpKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7c291cmNlRmlsZS5maWxlTmFtZX06JHtsaW5lICsgMX06JHtcbiAgICAgICAgICAgICAgY2hhcmFjdGVyICsgMX06IEVycm9yIGVuY291bnRlcmVkIGluIG1ldGFkYXRhIGdlbmVyYXRlZCBmb3IgZXhwb3J0ZWQgc3ltYm9sICcke1xuICAgICAgICAgICAgICBuYW1lfSc6IFxcbiAke2UubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRXJyb3IgZW5jb3VudGVyZWQgaW4gbWV0YWRhdGEgZ2VuZXJhdGVkIGZvciBleHBvcnRlZCBzeW1ib2wgJHtuYW1lfTogXFxuICR7ZS5tZXNzYWdlfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8vIENvbGxlY3QgcGFyYW1ldGVyIG5hbWVzIGZyb20gYSBmdW5jdGlvbi5cbmZ1bmN0aW9uIG5hbWVzT2YocGFyYW1ldGVyczogdHMuTm9kZUFycmF5PHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uPik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZ1bmN0aW9uIGFkZE5hbWVzT2YobmFtZTogdHMuSWRlbnRpZmllciB8IHRzLkJpbmRpbmdQYXR0ZXJuKSB7XG4gICAgaWYgKG5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgIGNvbnN0IGlkZW50aWZpZXIgPSA8dHMuSWRlbnRpZmllcj5uYW1lO1xuICAgICAgcmVzdWx0LnB1c2goaWRlbnRpZmllci50ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYmluZGluZ1BhdHRlcm4gPSA8dHMuQmluZGluZ1BhdHRlcm4+bmFtZTtcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBiaW5kaW5nUGF0dGVybi5lbGVtZW50cykge1xuICAgICAgICBjb25zdCBuYW1lID0gKGVsZW1lbnQgYXMgYW55KS5uYW1lO1xuICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgIGFkZE5hbWVzT2YobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHBhcmFtZXRlciBvZiBwYXJhbWV0ZXJzKSB7XG4gICAgYWRkTmFtZXNPZihwYXJhbWV0ZXIubmFtZSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzaG91bGRJZ25vcmVTdGF0aWNNZW1iZXIobWVtYmVyTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBtZW1iZXJOYW1lLnN0YXJ0c1dpdGgoJ25nQWNjZXB0SW5wdXRUeXBlXycpIHx8IG1lbWJlck5hbWUuc3RhcnRzV2l0aCgnbmdUZW1wbGF0ZUd1YXJkXycpO1xufVxuXG5mdW5jdGlvbiBleHBhbmRlZE1lc3NhZ2UoZXJyb3I6IGFueSk6IHN0cmluZyB7XG4gIHN3aXRjaCAoZXJyb3IubWVzc2FnZSkge1xuICAgIGNhc2UgJ1JlZmVyZW5jZSB0byBub24tZXhwb3J0ZWQgY2xhc3MnOlxuICAgICAgaWYgKGVycm9yLmNvbnRleHQgJiYgZXJyb3IuY29udGV4dC5jbGFzc05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGBSZWZlcmVuY2UgdG8gYSBub24tZXhwb3J0ZWQgY2xhc3MgJHtcbiAgICAgICAgICAgIGVycm9yLmNvbnRleHQuY2xhc3NOYW1lfS4gQ29uc2lkZXIgZXhwb3J0aW5nIHRoZSBjbGFzc2A7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdWYXJpYWJsZSBub3QgaW5pdGlhbGl6ZWQnOlxuICAgICAgcmV0dXJuICdPbmx5IGluaXRpYWxpemVkIHZhcmlhYmxlcyBhbmQgY29uc3RhbnRzIGNhbiBiZSByZWZlcmVuY2VkIGJlY2F1c2UgdGhlIHZhbHVlIG9mIHRoaXMgdmFyaWFibGUgaXMgbmVlZGVkIGJ5IHRoZSB0ZW1wbGF0ZSBjb21waWxlcic7XG4gICAgY2FzZSAnRGVzdHJ1Y3R1cmluZyBub3Qgc3VwcG9ydGVkJzpcbiAgICAgIHJldHVybiAnUmVmZXJlbmNpbmcgYW4gZXhwb3J0ZWQgZGVzdHJ1Y3R1cmVkIHZhcmlhYmxlIG9yIGNvbnN0YW50IGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIHRlbXBsYXRlIGNvbXBpbGVyLiBDb25zaWRlciBzaW1wbGlmeWluZyB0aGlzIHRvIGF2b2lkIGRlc3RydWN0dXJpbmcnO1xuICAgIGNhc2UgJ0NvdWxkIG5vdCByZXNvbHZlIHR5cGUnOlxuICAgICAgaWYgKGVycm9yLmNvbnRleHQgJiYgZXJyb3IuY29udGV4dC50eXBlTmFtZSkge1xuICAgICAgICByZXR1cm4gYENvdWxkIG5vdCByZXNvbHZlIHR5cGUgJHtlcnJvci5jb250ZXh0LnR5cGVOYW1lfWA7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdGdW5jdGlvbiBjYWxsIG5vdCBzdXBwb3J0ZWQnOlxuICAgICAgbGV0IHByZWZpeCA9XG4gICAgICAgICAgZXJyb3IuY29udGV4dCAmJiBlcnJvci5jb250ZXh0Lm5hbWUgPyBgQ2FsbGluZyBmdW5jdGlvbiAnJHtlcnJvci5jb250ZXh0Lm5hbWV9JywgZmAgOiAnRic7XG4gICAgICByZXR1cm4gcHJlZml4ICtcbiAgICAgICAgICAndW5jdGlvbiBjYWxscyBhcmUgbm90IHN1cHBvcnRlZC4gQ29uc2lkZXIgcmVwbGFjaW5nIHRoZSBmdW5jdGlvbiBvciBsYW1iZGEgd2l0aCBhIHJlZmVyZW5jZSB0byBhbiBleHBvcnRlZCBmdW5jdGlvbic7XG4gICAgY2FzZSAnUmVmZXJlbmNlIHRvIGEgbG9jYWwgc3ltYm9sJzpcbiAgICAgIGlmIChlcnJvci5jb250ZXh0ICYmIGVycm9yLmNvbnRleHQubmFtZSkge1xuICAgICAgICByZXR1cm4gYFJlZmVyZW5jZSB0byBhIGxvY2FsIChub24tZXhwb3J0ZWQpIHN5bWJvbCAnJHtcbiAgICAgICAgICAgIGVycm9yLmNvbnRleHQubmFtZX0nLiBDb25zaWRlciBleHBvcnRpbmcgdGhlIHN5bWJvbGA7XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG59XG4iXX0=