"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var core_1 = require('@angular/core');
var SUPPORTED_SCHEMA_VERSION = 1;
/**
 * A token representing the a reference to a static type.
 *
 * This token is unique for a filePath and name and can be used as a hash table key.
 */
var StaticSymbol = (function () {
    function StaticSymbol(filePath, name) {
        this.filePath = filePath;
        this.name = name;
    }
    return StaticSymbol;
}());
exports.StaticSymbol = StaticSymbol;
/**
 * A static reflector implements enough of the Reflector API that is necessary to compile
 * templates statically.
 */
var StaticReflector = (function () {
    function StaticReflector(host) {
        this.host = host;
        this.annotationCache = new Map();
        this.propertyCache = new Map();
        this.parameterCache = new Map();
        this.metadataCache = new Map();
        this.conversionMap = new Map();
        this.initializeConversionMap();
    }
    StaticReflector.prototype.importUri = function (typeOrFunc) {
        var staticSymbol = this.host.findDeclaration(typeOrFunc.filePath, typeOrFunc.name, '');
        return staticSymbol ? staticSymbol.filePath : null;
    };
    StaticReflector.prototype.annotations = function (type) {
        var annotations = this.annotationCache.get(type);
        if (!annotations) {
            var classMetadata = this.getTypeMetadata(type);
            if (classMetadata['decorators']) {
                annotations = this.simplify(type, classMetadata['decorators']);
            }
            else {
                annotations = [];
            }
            this.annotationCache.set(type, annotations.filter(function (ann) { return !!ann; }));
        }
        return annotations;
    };
    StaticReflector.prototype.propMetadata = function (type) {
        var _this = this;
        var propMetadata = this.propertyCache.get(type);
        if (!propMetadata) {
            var classMetadata = this.getTypeMetadata(type);
            var members = classMetadata ? classMetadata['members'] : {};
            propMetadata = mapStringMap(members, function (propData, propName) {
                var prop = propData.find(function (a) { return a['__symbolic'] == 'property'; });
                if (prop && prop['decorators']) {
                    return _this.simplify(type, prop['decorators']);
                }
                else {
                    return [];
                }
            });
            this.propertyCache.set(type, propMetadata);
        }
        return propMetadata;
    };
    StaticReflector.prototype.parameters = function (type) {
        if (!(type instanceof StaticSymbol)) {
            throw new Error("parameters received " + JSON.stringify(type) + " which is not a StaticSymbol");
        }
        try {
            var parameters_1 = this.parameterCache.get(type);
            if (!parameters_1) {
                var classMetadata = this.getTypeMetadata(type);
                var members = classMetadata ? classMetadata['members'] : null;
                var ctorData = members ? members['__ctor__'] : null;
                if (ctorData) {
                    var ctor = ctorData.find(function (a) { return a['__symbolic'] == 'constructor'; });
                    var parameterTypes = this.simplify(type, ctor['parameters'] || []);
                    var parameterDecorators_1 = this.simplify(type, ctor['parameterDecorators'] || []);
                    parameters_1 = [];
                    parameterTypes.forEach(function (paramType, index) {
                        var nestedResult = [];
                        if (paramType) {
                            nestedResult.push(paramType);
                        }
                        var decorators = parameterDecorators_1 ? parameterDecorators_1[index] : null;
                        if (decorators) {
                            nestedResult.push.apply(nestedResult, decorators);
                        }
                        parameters_1.push(nestedResult);
                    });
                }
                if (!parameters_1) {
                    parameters_1 = [];
                }
                this.parameterCache.set(type, parameters_1);
            }
            return parameters_1;
        }
        catch (e) {
            console.log("Failed on type " + JSON.stringify(type) + " with error " + e);
            throw e;
        }
    };
    StaticReflector.prototype.hasLifecycleHook = function (type, lcInterface, lcProperty) {
        if (!(type instanceof StaticSymbol)) {
            throw new Error("hasLifecycleHook received " + JSON.stringify(type) + " which is not a StaticSymbol");
        }
        var classMetadata = this.getTypeMetadata(type);
        var members = classMetadata ? classMetadata['members'] : null;
        var member = members ? members[lcProperty] : null;
        return member ? member.some(function (a) { return a['__symbolic'] == 'method'; }) : false;
    };
    StaticReflector.prototype.registerDecoratorOrConstructor = function (type, ctor) {
        var _this = this;
        this.conversionMap.set(type, function (context, args) {
            var argValues = [];
            args.forEach(function (arg, index) {
                var argValue;
                if (typeof arg === 'object' && !arg['__symbolic']) {
                    argValue = mapStringMap(arg, function (value, key) { return _this.simplify(context, value); });
                }
                else {
                    argValue = _this.simplify(context, arg);
                }
                argValues.push(argValue);
            });
            var metadata = Object.create(ctor.prototype);
            ctor.apply(metadata, argValues);
            return metadata;
        });
    };
    StaticReflector.prototype.registerFunction = function (type, fn) {
        var _this = this;
        this.conversionMap.set(type, function (context, args) {
            var argValues = [];
            args.forEach(function (arg, index) {
                var argValue = _this.simplify(context, arg);
                argValues.push(argValue);
            });
            return fn.apply(null, argValues);
        });
    };
    StaticReflector.prototype.initializeConversionMap = function () {
        var _a = this.host.angularImportLocations(), coreDecorators = _a.coreDecorators, diDecorators = _a.diDecorators, diMetadata = _a.diMetadata, diOpaqueToken = _a.diOpaqueToken, animationMetadata = _a.animationMetadata, provider = _a.provider;
        this.opaqueToken = this.host.findDeclaration(diOpaqueToken, 'OpaqueToken');
        this.registerDecoratorOrConstructor(this.host.findDeclaration(provider, 'Provider'), core_1.Provider);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diDecorators, 'Host'), core_1.HostMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diDecorators, 'Injectable'), core_1.InjectableMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diDecorators, 'Self'), core_1.SelfMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diDecorators, 'SkipSelf'), core_1.SkipSelfMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diDecorators, 'Inject'), core_1.InjectMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diDecorators, 'Optional'), core_1.OptionalMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Attribute'), core_1.AttributeMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Query'), core_1.QueryMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'ViewQuery'), core_1.ViewQueryMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'ContentChild'), core_1.ContentChildMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'ContentChildren'), core_1.ContentChildrenMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'ViewChild'), core_1.ViewChildMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'ViewChildren'), core_1.ViewChildrenMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Input'), core_1.InputMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Output'), core_1.OutputMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Pipe'), core_1.PipeMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'HostBinding'), core_1.HostBindingMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'HostListener'), core_1.HostListenerMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Directive'), core_1.DirectiveMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(coreDecorators, 'Component'), core_1.ComponentMetadata);
        // Note: Some metadata classes can be used directly with Provider.deps.
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diMetadata, 'HostMetadata'), core_1.HostMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diMetadata, 'SelfMetadata'), core_1.SelfMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diMetadata, 'SkipSelfMetadata'), core_1.SkipSelfMetadata);
        this.registerDecoratorOrConstructor(this.host.findDeclaration(diMetadata, 'OptionalMetadata'), core_1.OptionalMetadata);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'trigger'), core_1.trigger);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'state'), core_1.state);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'transition'), core_1.transition);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'style'), core_1.style);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'animate'), core_1.animate);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'keyframes'), core_1.keyframes);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'sequence'), core_1.sequence);
        this.registerFunction(this.host.findDeclaration(animationMetadata, 'group'), core_1.group);
    };
    /** @internal */
    StaticReflector.prototype.simplify = function (context, value) {
        var _this = this;
        var scope = BindingScope.empty;
        var calling = new Map();
        function simplifyInContext(context, value) {
            function resolveReference(expression) {
                var staticSymbol;
                if (expression['module']) {
                    staticSymbol = _this.host.findDeclaration(expression['module'], expression['name'], context.filePath);
                }
                else {
                    staticSymbol = _this.host.getStaticSymbol(context.filePath, expression['name']);
                }
                return staticSymbol;
            }
            function isOpaqueToken(value) {
                if (value && value.__symbolic === 'new' && value.expression) {
                    var target = value.expression;
                    if (target.__symbolic == 'reference') {
                        return sameSymbol(resolveReference(target), _this.opaqueToken);
                    }
                }
                return false;
            }
            function simplifyCall(expression) {
                if (expression['__symbolic'] == 'call') {
                    var target = expression['expression'];
                    var targetFunction = simplify(target);
                    if (targetFunction['__symbolic'] == 'function') {
                        if (calling.get(targetFunction)) {
                            throw new Error('Recursion not supported');
                        }
                        calling.set(targetFunction, true);
                        var value_1 = targetFunction['value'];
                        if (value_1) {
                            // Determine the arguments
                            var args = (expression['arguments'] || []).map(function (arg) { return simplify(arg); });
                            var parameters = targetFunction['parameters'];
                            var functionScope = BindingScope.build();
                            for (var i = 0; i < parameters.length; i++) {
                                functionScope.define(parameters[i], args[i]);
                            }
                            var oldScope = scope;
                            var result = void 0;
                            try {
                                scope = functionScope.done();
                                result = simplify(value_1);
                            }
                            finally {
                                scope = oldScope;
                            }
                            return result;
                        }
                        calling.delete(targetFunction);
                    }
                }
                return simplify({ __symbolic: 'error', message: 'Function call not supported' });
            }
            function simplify(expression) {
                if (isPrimitive(expression)) {
                    return expression;
                }
                if (expression instanceof Array) {
                    var result = [];
                    for (var _i = 0, _a = expression; _i < _a.length; _i++) {
                        var item = _a[_i];
                        // Check for a spread expression
                        if (item && item.__symbolic === 'spread') {
                            var spreadArray = simplify(item.expression);
                            if (Array.isArray(spreadArray)) {
                                for (var _b = 0, spreadArray_1 = spreadArray; _b < spreadArray_1.length; _b++) {
                                    var spreadItem = spreadArray_1[_b];
                                    result.push(spreadItem);
                                }
                                continue;
                            }
                        }
                        result.push(simplify(item));
                    }
                    return result;
                }
                if (expression) {
                    if (expression['__symbolic']) {
                        var staticSymbol = void 0;
                        switch (expression['__symbolic']) {
                            case 'binop':
                                var left = simplify(expression['left']);
                                var right = simplify(expression['right']);
                                switch (expression['operator']) {
                                    case '&&':
                                        return left && right;
                                    case '||':
                                        return left || right;
                                    case '|':
                                        return left | right;
                                    case '^':
                                        return left ^ right;
                                    case '&':
                                        return left & right;
                                    case '==':
                                        return left == right;
                                    case '!=':
                                        return left != right;
                                    case '===':
                                        return left === right;
                                    case '!==':
                                        return left !== right;
                                    case '<':
                                        return left < right;
                                    case '>':
                                        return left > right;
                                    case '<=':
                                        return left <= right;
                                    case '>=':
                                        return left >= right;
                                    case '<<':
                                        return left << right;
                                    case '>>':
                                        return left >> right;
                                    case '+':
                                        return left + right;
                                    case '-':
                                        return left - right;
                                    case '*':
                                        return left * right;
                                    case '/':
                                        return left / right;
                                    case '%':
                                        return left % right;
                                }
                                return null;
                            case 'pre':
                                var operand = simplify(expression['operand']);
                                switch (expression['operator']) {
                                    case '+':
                                        return operand;
                                    case '-':
                                        return -operand;
                                    case '!':
                                        return !operand;
                                    case '~':
                                        return ~operand;
                                }
                                return null;
                            case 'index':
                                var indexTarget = simplify(expression['expression']);
                                var index = simplify(expression['index']);
                                if (indexTarget && isPrimitive(index))
                                    return indexTarget[index];
                                return null;
                            case 'select':
                                var selectTarget = simplify(expression['expression']);
                                var member = simplify(expression['member']);
                                if (selectTarget && isPrimitive(member))
                                    return selectTarget[member];
                                return null;
                            case 'reference':
                                if (!expression.module) {
                                    var name_1 = expression['name'];
                                    var localValue = scope.resolve(name_1);
                                    if (localValue != BindingScope.missing) {
                                        return localValue;
                                    }
                                }
                                staticSymbol = resolveReference(expression);
                                var result = staticSymbol;
                                var moduleMetadata = _this.getModuleMetadata(staticSymbol.filePath);
                                var declarationValue = moduleMetadata ? moduleMetadata['metadata'][staticSymbol.name] : null;
                                if (declarationValue) {
                                    if (isOpaqueToken(declarationValue)) {
                                        // If the referenced symbol is initalized by a new OpaqueToken we can keep the
                                        // reference to the symbol.
                                        return staticSymbol;
                                    }
                                    result = simplifyInContext(staticSymbol, declarationValue);
                                }
                                return result;
                            case 'class':
                                return context;
                            case 'function':
                                return expression;
                            case 'new':
                            case 'call':
                                // Determine if the function is a built-in conversion
                                var target = expression['expression'];
                                if (target['module']) {
                                    staticSymbol = _this.host.findDeclaration(target['module'], target['name'], context.filePath);
                                }
                                else {
                                    staticSymbol = _this.host.getStaticSymbol(context.filePath, target['name']);
                                }
                                var converter = _this.conversionMap.get(staticSymbol);
                                if (converter) {
                                    var args = expression['arguments'];
                                    if (!args) {
                                        args = [];
                                    }
                                    return converter(context, args);
                                }
                                // Determine if the function is one we can simplify.
                                return simplifyCall(expression);
                            case 'error':
                                var message = produceErrorMessage(expression);
                                if (expression['line']) {
                                    message =
                                        message + " (position " + expression['line'] + ":" + expression['character'] + " in the original .ts file)";
                                }
                                throw new Error(message);
                        }
                        return null;
                    }
                    return mapStringMap(expression, function (value, name) { return simplify(value); });
                }
                return null;
            }
            try {
                return simplify(value);
            }
            catch (e) {
                throw new Error(e.message + ", resolving symbol " + context.name + " in " + context.filePath);
            }
        }
        return simplifyInContext(context, value);
    };
    /**
     * @param module an absolute path to a module file.
     */
    StaticReflector.prototype.getModuleMetadata = function (module) {
        var moduleMetadata = this.metadataCache.get(module);
        if (!moduleMetadata) {
            moduleMetadata = this.host.getMetadataFor(module);
            if (Array.isArray(moduleMetadata)) {
                moduleMetadata = moduleMetadata
                    .find(function (element) { return element.version === SUPPORTED_SCHEMA_VERSION; }) ||
                    moduleMetadata[0];
            }
            if (!moduleMetadata) {
                moduleMetadata =
                    { __symbolic: 'module', version: SUPPORTED_SCHEMA_VERSION, module: module, metadata: {} };
            }
            if (moduleMetadata['version'] != SUPPORTED_SCHEMA_VERSION) {
                throw new Error("Metadata version mismatch for module " + module + ", found version " + moduleMetadata['version'] + ", expected " + SUPPORTED_SCHEMA_VERSION);
            }
            this.metadataCache.set(module, moduleMetadata);
        }
        return moduleMetadata;
    };
    StaticReflector.prototype.getTypeMetadata = function (type) {
        var moduleMetadata = this.getModuleMetadata(type.filePath);
        var result = moduleMetadata['metadata'][type.name];
        if (!result) {
            result = { __symbolic: 'class' };
        }
        return result;
    };
    return StaticReflector;
}());
exports.StaticReflector = StaticReflector;
function expandedMessage(error) {
    switch (error.message) {
        case 'Reference to non-exported class':
            if (error.context && error.context.className) {
                return "Reference to a non-exported class " + error.context.className;
            }
            break;
        case 'Variable not initialized':
            return 'Only initialized variables and constants can be referenced';
        case 'Destructuring not supported':
            return 'Referencing an exported destructured variable or constant is not supported';
        case 'Could not resolve type':
            if (error.context && error.context.typeName) {
                return "Could not resolve type " + error.context.typeName;
            }
            break;
        case 'Function call not supported':
            return 'Function calls are not supported. Consider replacing the function or lambda with a reference to an exported function';
    }
    return error.message;
}
function produceErrorMessage(error) {
    return "Error encountered resolving symbol values statically. " + expandedMessage(error);
}
function mapStringMap(input, transform) {
    if (!input)
        return {};
    var result = {};
    Object.keys(input).forEach(function (key) { result[key] = transform(input[key], key); });
    return result;
}
function isPrimitive(o) {
    return o === null || (typeof o !== 'function' && typeof o !== 'object');
}
var BindingScope = (function () {
    function BindingScope() {
    }
    BindingScope.build = function () {
        var current = new Map();
        var parent = undefined;
        return {
            define: function (name, value) {
                current.set(name, value);
                return this;
            },
            done: function () {
                return current.size > 0 ? new PopulatedScope(current) : BindingScope.empty;
            }
        };
    };
    BindingScope.missing = {};
    BindingScope.empty = { resolve: function (name) { return BindingScope.missing; } };
    return BindingScope;
}());
var PopulatedScope = (function (_super) {
    __extends(PopulatedScope, _super);
    function PopulatedScope(bindings) {
        _super.call(this);
        this.bindings = bindings;
    }
    PopulatedScope.prototype.resolve = function (name) {
        return this.bindings.has(name) ? this.bindings.get(name) : BindingScope.missing;
    };
    return PopulatedScope;
}(BindingScope));
function sameSymbol(a, b) {
    return a === b || (a.name == b.name && a.filePath == b.filePath);
}
//# sourceMappingURL=static_reflector.js.map