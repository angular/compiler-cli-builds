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
        define("@angular/compiler-cli/src/diagnostics/typescript_symbols", ["require", "exports", "path", "typescript", "@angular/compiler-cli/src/diagnostics/symbols", "@angular/compiler-cli/src/diagnostics/typescript_version"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const path = require("path");
    const ts = require("typescript");
    const symbols_1 = require("@angular/compiler-cli/src/diagnostics/symbols");
    const typescript_version_1 = require("@angular/compiler-cli/src/diagnostics/typescript_version");
    // In TypeScript 2.1 these flags moved
    // These helpers work for both 2.0 and 2.1.
    const isPrivate = ts.ModifierFlags ?
        ((node) => !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Private)) :
        ((node) => !!(node.flags & ts.NodeFlags.Private));
    const isReferenceType = ts.ObjectFlags ?
        ((type) => !!(type.flags & ts.TypeFlags.Object &&
            type.objectFlags & ts.ObjectFlags.Reference)) :
        ((type) => !!(type.flags & ts.TypeFlags.Reference));
    function getSymbolQuery(program, checker, source, fetchPipes) {
        return new TypeScriptSymbolQuery(program, checker, source, fetchPipes);
    }
    exports.getSymbolQuery = getSymbolQuery;
    function getClassMembers(program, checker, staticSymbol) {
        const declaration = getClassFromStaticSymbol(program, staticSymbol);
        if (declaration) {
            const type = checker.getTypeAtLocation(declaration);
            const node = program.getSourceFile(staticSymbol.filePath);
            if (node) {
                return new TypeWrapper(type, { node, program, checker }).members();
            }
        }
    }
    exports.getClassMembers = getClassMembers;
    function getClassMembersFromDeclaration(program, checker, source, declaration) {
        const type = checker.getTypeAtLocation(declaration);
        return new TypeWrapper(type, { node: source, program, checker }).members();
    }
    exports.getClassMembersFromDeclaration = getClassMembersFromDeclaration;
    function getClassFromStaticSymbol(program, type) {
        const source = program.getSourceFile(type.filePath);
        if (source) {
            return ts.forEachChild(source, child => {
                if (child.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDeclaration = child;
                    if (classDeclaration.name != null && classDeclaration.name.text === type.name) {
                        return classDeclaration;
                    }
                }
            });
        }
        return undefined;
    }
    exports.getClassFromStaticSymbol = getClassFromStaticSymbol;
    function getPipesTable(source, program, checker, pipes) {
        return new PipesTable(pipes, { program, checker, node: source });
    }
    exports.getPipesTable = getPipesTable;
    class TypeScriptSymbolQuery {
        constructor(program, checker, source, fetchPipes) {
            this.program = program;
            this.checker = checker;
            this.source = source;
            this.fetchPipes = fetchPipes;
            this.typeCache = new Map();
        }
        getTypeKind(symbol) { return typeKindOf(this.getTsTypeOf(symbol)); }
        getBuiltinType(kind) {
            let result = this.typeCache.get(kind);
            if (!result) {
                const type = getBuiltinTypeFromTs(kind, { checker: this.checker, node: this.source, program: this.program });
                result =
                    new TypeWrapper(type, { program: this.program, checker: this.checker, node: this.source });
                this.typeCache.set(kind, result);
            }
            return result;
        }
        getTypeUnion(...types) {
            // No API exists so return any if the types are not all the same type.
            let result = undefined;
            if (types.length) {
                result = types[0];
                for (let i = 1; i < types.length; i++) {
                    if (types[i] != result) {
                        result = undefined;
                        break;
                    }
                }
            }
            return result || this.getBuiltinType(symbols_1.BuiltinType.Any);
        }
        getArrayType(type) { return this.getBuiltinType(symbols_1.BuiltinType.Any); }
        getElementType(type) {
            if (type instanceof TypeWrapper) {
                const elementType = getTypeParameterOf(type.tsType, 'Array');
                if (elementType) {
                    return new TypeWrapper(elementType, type.context);
                }
            }
        }
        getNonNullableType(symbol) {
            if (symbol instanceof TypeWrapper && (typeof this.checker.getNonNullableType == 'function')) {
                const tsType = symbol.tsType;
                const nonNullableType = this.checker.getNonNullableType(tsType);
                if (nonNullableType != tsType) {
                    return new TypeWrapper(nonNullableType, symbol.context);
                }
                else if (nonNullableType == tsType) {
                    return symbol;
                }
            }
            return this.getBuiltinType(symbols_1.BuiltinType.Any);
        }
        getPipes() {
            let result = this.pipesCache;
            if (!result) {
                result = this.pipesCache = this.fetchPipes();
            }
            return result;
        }
        getTemplateContext(type) {
            const context = { node: this.source, program: this.program, checker: this.checker };
            const typeSymbol = findClassSymbolInContext(type, context);
            if (typeSymbol) {
                const contextType = this.getTemplateRefContextType(typeSymbol);
                if (contextType)
                    return new SymbolWrapper(contextType, context).members();
            }
        }
        getTypeSymbol(type) {
            const context = { node: this.source, program: this.program, checker: this.checker };
            const typeSymbol = findClassSymbolInContext(type, context);
            return typeSymbol && new SymbolWrapper(typeSymbol, context);
        }
        createSymbolTable(symbols) {
            const result = new MapSymbolTable();
            result.addAll(symbols.map(s => new DeclaredSymbol(s)));
            return result;
        }
        mergeSymbolTable(symbolTables) {
            const result = new MapSymbolTable();
            for (const symbolTable of symbolTables) {
                result.addAll(symbolTable.values());
            }
            return result;
        }
        getSpanAt(line, column) {
            return spanAt(this.source, line, column);
        }
        getTemplateRefContextType(typeSymbol) {
            const type = this.checker.getTypeOfSymbolAtLocation(typeSymbol, this.source);
            const constructor = type.symbol && type.symbol.members &&
                getFromSymbolTable(type.symbol.members, '__constructor');
            if (constructor) {
                const constructorDeclaration = constructor.declarations[0];
                for (const parameter of constructorDeclaration.parameters) {
                    const type = this.checker.getTypeAtLocation(parameter.type);
                    if (type.symbol.name == 'TemplateRef' && isReferenceType(type)) {
                        const typeReference = type;
                        if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
                            return typeReference.typeArguments[0].symbol;
                        }
                    }
                }
            }
        }
        getTsTypeOf(symbol) {
            const type = this.getTypeWrapper(symbol);
            return type && type.tsType;
        }
        getTypeWrapper(symbol) {
            let type = undefined;
            if (symbol instanceof TypeWrapper) {
                type = symbol;
            }
            else if (symbol.type instanceof TypeWrapper) {
                type = symbol.type;
            }
            return type;
        }
    }
    function typeCallable(type) {
        const signatures = type.getCallSignatures();
        return signatures && signatures.length != 0;
    }
    function signaturesOf(type, context) {
        return type.getCallSignatures().map(s => new SignatureWrapper(s, context));
    }
    function selectSignature(type, context, types) {
        // TODO: Do a better job of selecting the right signature.
        const signatures = type.getCallSignatures();
        return signatures.length ? new SignatureWrapper(signatures[0], context) : undefined;
    }
    class TypeWrapper {
        constructor(tsType, context) {
            this.tsType = tsType;
            this.context = context;
            this.kind = 'type';
            this.language = 'typescript';
            this.type = undefined;
            this.container = undefined;
            this.public = true;
            if (!tsType) {
                throw Error('Internal: null type');
            }
        }
        get name() {
            const symbol = this.tsType.symbol;
            return (symbol && symbol.name) || '<anonymous>';
        }
        get callable() { return typeCallable(this.tsType); }
        get nullable() {
            return this.context.checker.getNonNullableType(this.tsType) != this.tsType;
        }
        get definition() {
            const symbol = this.tsType.getSymbol();
            return symbol ? definitionFromTsSymbol(symbol) : undefined;
        }
        members() {
            return new SymbolTableWrapper(this.tsType.getProperties(), this.context);
        }
        signatures() { return signaturesOf(this.tsType, this.context); }
        selectSignature(types) {
            return selectSignature(this.tsType, this.context, types);
        }
        indexed(argument) { return undefined; }
    }
    class SymbolWrapper {
        constructor(symbol, context) {
            this.context = context;
            this.nullable = false;
            this.language = 'typescript';
            this.symbol = symbol && context && (symbol.flags & ts.SymbolFlags.Alias) ?
                context.checker.getAliasedSymbol(symbol) :
                symbol;
        }
        get name() { return this.symbol.name; }
        get kind() { return this.callable ? 'method' : 'property'; }
        get type() { return new TypeWrapper(this.tsType, this.context); }
        get container() { return getContainerOf(this.symbol, this.context); }
        get public() {
            // Symbols that are not explicitly made private are public.
            return !isSymbolPrivate(this.symbol);
        }
        get callable() { return typeCallable(this.tsType); }
        get definition() { return definitionFromTsSymbol(this.symbol); }
        members() {
            if (!this._members) {
                if ((this.symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) != 0) {
                    const declaredType = this.context.checker.getDeclaredTypeOfSymbol(this.symbol);
                    const typeWrapper = new TypeWrapper(declaredType, this.context);
                    this._members = typeWrapper.members();
                }
                else {
                    this._members = new SymbolTableWrapper(this.symbol.members, this.context);
                }
            }
            return this._members;
        }
        signatures() { return signaturesOf(this.tsType, this.context); }
        selectSignature(types) {
            return selectSignature(this.tsType, this.context, types);
        }
        indexed(argument) { return undefined; }
        get tsType() {
            let type = this._tsType;
            if (!type) {
                type = this._tsType =
                    this.context.checker.getTypeOfSymbolAtLocation(this.symbol, this.context.node);
            }
            return type;
        }
    }
    class DeclaredSymbol {
        constructor(declaration) {
            this.declaration = declaration;
            this.language = 'ng-template';
            this.nullable = false;
            this.public = true;
        }
        get name() { return this.declaration.name; }
        get kind() { return this.declaration.kind; }
        get container() { return undefined; }
        get type() { return this.declaration.type; }
        get callable() { return this.declaration.type.callable; }
        get definition() { return this.declaration.definition; }
        members() { return this.declaration.type.members(); }
        signatures() { return this.declaration.type.signatures(); }
        selectSignature(types) {
            return this.declaration.type.selectSignature(types);
        }
        indexed(argument) { return undefined; }
    }
    class SignatureWrapper {
        constructor(signature, context) {
            this.signature = signature;
            this.context = context;
        }
        get arguments() {
            return new SymbolTableWrapper(this.signature.getParameters(), this.context);
        }
        get result() { return new TypeWrapper(this.signature.getReturnType(), this.context); }
    }
    class SignatureResultOverride {
        constructor(signature, resultType) {
            this.signature = signature;
            this.resultType = resultType;
        }
        get arguments() { return this.signature.arguments; }
        get result() { return this.resultType; }
    }
    /**
     * Indicates the lower bound TypeScript version supporting `SymbolTable` as an ES6 `Map`.
     * For lower versions, `SymbolTable` is implemented as a dictionary
     */
    const MIN_TS_VERSION_SUPPORTING_MAP = '2.2';
    exports.toSymbolTableFactory = (tsVersion) => (symbols) => {
        if (typescript_version_1.isVersionBetween(tsVersion, MIN_TS_VERSION_SUPPORTING_MAP)) {
            // ∀ Typescript version >= 2.2, `SymbolTable` is implemented as an ES6 `Map`
            const result = new Map();
            for (const symbol of symbols) {
                result.set(symbol.name, symbol);
            }
            // First, tell the compiler that `result` is of type `any`. Then, use a second type assertion
            // to `ts.SymbolTable`.
            // Otherwise, `Map<string, ts.Symbol>` and `ts.SymbolTable` will be considered as incompatible
            // types by the compiler
            return result;
        }
        // ∀ Typescript version < 2.2, `SymbolTable` is implemented as a dictionary
        const result = {};
        for (const symbol of symbols) {
            result[symbol.name] = symbol;
        }
        return result;
    };
    function toSymbols(symbolTable) {
        if (!symbolTable)
            return [];
        const table = symbolTable;
        if (typeof table.values === 'function') {
            return Array.from(table.values());
        }
        const result = [];
        const own = typeof table.hasOwnProperty === 'function' ?
            (name) => table.hasOwnProperty(name) :
            (name) => !!table[name];
        for (const name in table) {
            if (own(name)) {
                result.push(table[name]);
            }
        }
        return result;
    }
    class SymbolTableWrapper {
        constructor(symbols, context) {
            this.context = context;
            symbols = symbols || [];
            if (Array.isArray(symbols)) {
                this.symbols = symbols;
                const toSymbolTable = exports.toSymbolTableFactory(ts.version);
                this.symbolTable = toSymbolTable(symbols);
            }
            else {
                this.symbols = toSymbols(symbols);
                this.symbolTable = symbols;
            }
        }
        get size() { return this.symbols.length; }
        get(key) {
            const symbol = getFromSymbolTable(this.symbolTable, key);
            return symbol ? new SymbolWrapper(symbol, this.context) : undefined;
        }
        has(key) {
            const table = this.symbolTable;
            return (typeof table.has === 'function') ? table.has(key) : table[key] != null;
        }
        values() { return this.symbols.map(s => new SymbolWrapper(s, this.context)); }
    }
    class MapSymbolTable {
        constructor() {
            this.map = new Map();
            this._values = [];
        }
        get size() { return this.map.size; }
        get(key) { return this.map.get(key); }
        add(symbol) {
            if (this.map.has(symbol.name)) {
                const previous = this.map.get(symbol.name);
                this._values[this._values.indexOf(previous)] = symbol;
            }
            this.map.set(symbol.name, symbol);
            this._values.push(symbol);
        }
        addAll(symbols) {
            for (const symbol of symbols) {
                this.add(symbol);
            }
        }
        has(key) { return this.map.has(key); }
        values() {
            // Switch to this.map.values once iterables are supported by the target language.
            return this._values;
        }
    }
    class PipesTable {
        constructor(pipes, context) {
            this.pipes = pipes;
            this.context = context;
        }
        get size() { return this.pipes.length; }
        get(key) {
            const pipe = this.pipes.find(pipe => pipe.name == key);
            if (pipe) {
                return new PipeSymbol(pipe, this.context);
            }
        }
        has(key) { return this.pipes.find(pipe => pipe.name == key) != null; }
        values() { return this.pipes.map(pipe => new PipeSymbol(pipe, this.context)); }
    }
    // This matches .d.ts files that look like ".../<package-name>/<package-name>.d.ts",
    const INDEX_PATTERN = /[\\/]([^\\/]+)[\\/]\1\.d\.ts$/;
    class PipeSymbol {
        constructor(pipe, context) {
            this.pipe = pipe;
            this.context = context;
            this.kind = 'pipe';
            this.language = 'typescript';
            this.container = undefined;
            this.callable = true;
            this.nullable = false;
            this.public = true;
        }
        get name() { return this.pipe.name; }
        get type() { return new TypeWrapper(this.tsType, this.context); }
        get definition() {
            const symbol = this.tsType.getSymbol();
            return symbol ? definitionFromTsSymbol(symbol) : undefined;
        }
        members() { return EmptyTable.instance; }
        signatures() { return signaturesOf(this.tsType, this.context); }
        selectSignature(types) {
            let signature = selectSignature(this.tsType, this.context, types);
            if (types.length == 1) {
                const parameterType = types[0];
                if (parameterType instanceof TypeWrapper) {
                    let resultType = undefined;
                    switch (this.name) {
                        case 'async':
                            switch (parameterType.name) {
                                case 'Observable':
                                case 'Promise':
                                case 'EventEmitter':
                                    resultType = getTypeParameterOf(parameterType.tsType, parameterType.name);
                                    break;
                                default:
                                    resultType = getBuiltinTypeFromTs(symbols_1.BuiltinType.Any, this.context);
                                    break;
                            }
                            break;
                        case 'slice':
                            resultType = getTypeParameterOf(parameterType.tsType, 'Array');
                            break;
                    }
                    if (resultType) {
                        signature = new SignatureResultOverride(signature, new TypeWrapper(resultType, parameterType.context));
                    }
                }
            }
            return signature;
        }
        indexed(argument) { return undefined; }
        get tsType() {
            let type = this._tsType;
            if (!type) {
                const classSymbol = this.findClassSymbol(this.pipe.type.reference);
                if (classSymbol) {
                    type = this._tsType = this.findTransformMethodType(classSymbol);
                }
                if (!type) {
                    type = this._tsType = getBuiltinTypeFromTs(symbols_1.BuiltinType.Any, this.context);
                }
            }
            return type;
        }
        findClassSymbol(type) {
            return findClassSymbolInContext(type, this.context);
        }
        findTransformMethodType(classSymbol) {
            const classType = this.context.checker.getDeclaredTypeOfSymbol(classSymbol);
            if (classType) {
                const transform = classType.getProperty('transform');
                if (transform) {
                    return this.context.checker.getTypeOfSymbolAtLocation(transform, this.context.node);
                }
            }
        }
    }
    function findClassSymbolInContext(type, context) {
        let sourceFile = context.program.getSourceFile(type.filePath);
        if (!sourceFile) {
            // This handles a case where an <packageName>/index.d.ts and a <packageName>/<packageName>.d.ts
            // are in the same directory. If we are looking for <packageName>/<packageName> and didn't
            // find it, look for <packageName>/index.d.ts as the program might have found that instead.
            const p = type.filePath;
            const m = p.match(INDEX_PATTERN);
            if (m) {
                const indexVersion = path.join(path.dirname(p), 'index.d.ts');
                sourceFile = context.program.getSourceFile(indexVersion);
            }
        }
        if (sourceFile) {
            const moduleSymbol = sourceFile.module || sourceFile.symbol;
            const exports = context.checker.getExportsOfModule(moduleSymbol);
            return (exports || []).find(symbol => symbol.name == type.name);
        }
    }
    class EmptyTable {
        constructor() {
            this.size = 0;
        }
        get(key) { return undefined; }
        has(key) { return false; }
        values() { return []; }
    }
    EmptyTable.instance = new EmptyTable();
    function isSymbolPrivate(s) {
        return !!s.valueDeclaration && isPrivate(s.valueDeclaration);
    }
    function getBuiltinTypeFromTs(kind, context) {
        let type;
        const checker = context.checker;
        const node = context.node;
        switch (kind) {
            case symbols_1.BuiltinType.Any:
                type = checker.getTypeAtLocation(setParents({
                    kind: ts.SyntaxKind.AsExpression,
                    expression: { kind: ts.SyntaxKind.TrueKeyword },
                    type: { kind: ts.SyntaxKind.AnyKeyword }
                }, node));
                break;
            case symbols_1.BuiltinType.Boolean:
                type =
                    checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.TrueKeyword }, node));
                break;
            case symbols_1.BuiltinType.Null:
                type =
                    checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.NullKeyword }, node));
                break;
            case symbols_1.BuiltinType.Number:
                const numeric = {
                    kind: ts.SyntaxKind.NumericLiteral,
                    text: node.getText(),
                };
                setParents({ kind: ts.SyntaxKind.ExpressionStatement, expression: numeric }, node);
                type = checker.getTypeAtLocation(numeric);
                break;
            case symbols_1.BuiltinType.String:
                type = checker.getTypeAtLocation(setParents({
                    kind: ts.SyntaxKind.NoSubstitutionTemplateLiteral,
                    text: node.getText(),
                }, node));
                break;
            case symbols_1.BuiltinType.Undefined:
                type = checker.getTypeAtLocation(setParents({
                    kind: ts.SyntaxKind.VoidExpression,
                    expression: { kind: ts.SyntaxKind.NumericLiteral }
                }, node));
                break;
            default:
                throw new Error(`Internal error, unhandled literal kind ${kind}:${symbols_1.BuiltinType[kind]}`);
        }
        return type;
    }
    function setParents(node, parent) {
        node.parent = parent;
        ts.forEachChild(node, child => setParents(child, node));
        return node;
    }
    function spanAt(sourceFile, line, column) {
        if (line != null && column != null) {
            const position = ts.getPositionOfLineAndCharacter(sourceFile, line, column);
            const findChild = function findChild(node) {
                if (node.kind > ts.SyntaxKind.LastToken && node.pos <= position && node.end > position) {
                    const betterNode = ts.forEachChild(node, findChild);
                    return betterNode || node;
                }
            };
            const node = ts.forEachChild(sourceFile, findChild);
            if (node) {
                return { start: node.getStart(), end: node.getEnd() };
            }
        }
    }
    function definitionFromTsSymbol(symbol) {
        const declarations = symbol.declarations;
        if (declarations) {
            return declarations.map(declaration => {
                const sourceFile = declaration.getSourceFile();
                return {
                    fileName: sourceFile.fileName,
                    span: { start: declaration.getStart(), end: declaration.getEnd() }
                };
            });
        }
    }
    function parentDeclarationOf(node) {
        while (node) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                    return node;
                case ts.SyntaxKind.SourceFile:
                    return undefined;
            }
            node = node.parent;
        }
    }
    function getContainerOf(symbol, context) {
        if (symbol.getFlags() & ts.SymbolFlags.ClassMember && symbol.declarations) {
            for (const declaration of symbol.declarations) {
                const parent = parentDeclarationOf(declaration);
                if (parent) {
                    const type = context.checker.getTypeAtLocation(parent);
                    if (type) {
                        return new TypeWrapper(type, context);
                    }
                }
            }
        }
    }
    function getTypeParameterOf(type, name) {
        if (type && type.symbol && type.symbol.name == name) {
            const typeArguments = type.typeArguments;
            if (typeArguments && typeArguments.length <= 1) {
                return typeArguments[0];
            }
        }
    }
    function typeKindOf(type) {
        if (type) {
            if (type.flags & ts.TypeFlags.Any) {
                return symbols_1.BuiltinType.Any;
            }
            else if (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral)) {
                return symbols_1.BuiltinType.String;
            }
            else if (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike)) {
                return symbols_1.BuiltinType.Number;
            }
            else if (type.flags & (ts.TypeFlags.Undefined)) {
                return symbols_1.BuiltinType.Undefined;
            }
            else if (type.flags & (ts.TypeFlags.Null)) {
                return symbols_1.BuiltinType.Null;
            }
            else if (type.flags & ts.TypeFlags.Union) {
                // If all the constituent types of a union are the same kind, it is also that kind.
                let candidate = null;
                const unionType = type;
                if (unionType.types.length > 0) {
                    candidate = typeKindOf(unionType.types[0]);
                    for (const subType of unionType.types) {
                        if (candidate != typeKindOf(subType)) {
                            return symbols_1.BuiltinType.Other;
                        }
                    }
                }
                if (candidate != null) {
                    return candidate;
                }
            }
            else if (type.flags & ts.TypeFlags.TypeParameter) {
                return symbols_1.BuiltinType.Unbound;
            }
        }
        return symbols_1.BuiltinType.Other;
    }
    function getFromSymbolTable(symbolTable, key) {
        const table = symbolTable;
        let symbol;
        if (typeof table.get === 'function') {
            // TS 2.2 uses a Map
            symbol = table.get(key);
        }
        else {
            // TS pre-2.2 uses an object
            symbol = table[key];
        }
        return symbol;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zeW1ib2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9kaWFnbm9zdGljcy90eXBlc2NyaXB0X3N5bWJvbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFHSCw2QkFBNkI7SUFDN0IsaUNBQWlDO0lBRWpDLDJFQUF5STtJQUN6SSxpR0FBc0Q7SUFFdEQsc0NBQXNDO0lBQ3RDLDJDQUEyQztJQUMzQyxNQUFNLFNBQVMsR0FBSSxFQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLElBQWEsRUFBRSxFQUFFLENBQ2QsQ0FBQyxDQUFDLENBQUUsRUFBVSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxHQUFJLEVBQVUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFGLENBQUMsQ0FBQyxJQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXhFLE1BQU0sZUFBZSxHQUFJLEVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsSUFBYSxFQUFFLEVBQUUsQ0FDZCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFJLEVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTTtZQUN4QyxJQUFZLENBQUMsV0FBVyxHQUFJLEVBQVUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQyxJQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUksRUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBUTFF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QUU7Z0JBQ2xELE9BQU8scUJBQVcsQ0FBQyxPQUFPLENBQUM7YUFDNUI7U0FDRjtRQUNELE9BQU8scUJBQVcsQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsV0FBMkIsRUFBRSxHQUFXO1FBQ2xFLE1BQU0sS0FBSyxHQUFHLFdBQWtCLENBQUM7UUFDakMsSUFBSSxNQUEyQixDQUFDO1FBRWhDLElBQUksT0FBTyxLQUFLLENBQUMsR0FBRyxLQUFLLFVBQVUsRUFBRTtZQUNuQyxvQkFBb0I7WUFDcEIsTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDekI7YUFBTTtZQUNMLDRCQUE0QjtZQUM1QixNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlUGlwZVN1bW1hcnksIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0J1aWx0aW5UeXBlLCBEZWNsYXJhdGlvbktpbmQsIERlZmluaXRpb24sIFNpZ25hdHVyZSwgU3BhbiwgU3ltYm9sLCBTeW1ib2xEZWNsYXJhdGlvbiwgU3ltYm9sUXVlcnksIFN5bWJvbFRhYmxlfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHtpc1ZlcnNpb25CZXR3ZWVufSBmcm9tICcuL3R5cGVzY3JpcHRfdmVyc2lvbic7XG5cbi8vIEluIFR5cGVTY3JpcHQgMi4xIHRoZXNlIGZsYWdzIG1vdmVkXG4vLyBUaGVzZSBoZWxwZXJzIHdvcmsgZm9yIGJvdGggMi4wIGFuZCAyLjEuXG5jb25zdCBpc1ByaXZhdGUgPSAodHMgYXMgYW55KS5Nb2RpZmllckZsYWdzID9cbiAgICAoKG5vZGU6IHRzLk5vZGUpID0+XG4gICAgICAgICAhISgodHMgYXMgYW55KS5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSkgJiAodHMgYXMgYW55KS5Nb2RpZmllckZsYWdzLlByaXZhdGUpKSA6XG4gICAgKChub2RlOiB0cy5Ob2RlKSA9PiAhIShub2RlLmZsYWdzICYgKHRzIGFzIGFueSkuTm9kZUZsYWdzLlByaXZhdGUpKTtcblxuY29uc3QgaXNSZWZlcmVuY2VUeXBlID0gKHRzIGFzIGFueSkuT2JqZWN0RmxhZ3MgP1xuICAgICgodHlwZTogdHMuVHlwZSkgPT5cbiAgICAgICAgICEhKHR5cGUuZmxhZ3MgJiAodHMgYXMgYW55KS5UeXBlRmxhZ3MuT2JqZWN0ICYmXG4gICAgICAgICAgICAodHlwZSBhcyBhbnkpLm9iamVjdEZsYWdzICYgKHRzIGFzIGFueSkuT2JqZWN0RmxhZ3MuUmVmZXJlbmNlKSkgOlxuICAgICgodHlwZTogdHMuVHlwZSkgPT4gISEodHlwZS5mbGFncyAmICh0cyBhcyBhbnkpLlR5cGVGbGFncy5SZWZlcmVuY2UpKTtcblxuaW50ZXJmYWNlIFR5cGVDb250ZXh0IHtcbiAgbm9kZTogdHMuTm9kZTtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTeW1ib2xRdWVyeShcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGZldGNoUGlwZXM6ICgpID0+IFN5bWJvbFRhYmxlKTogU3ltYm9sUXVlcnkge1xuICByZXR1cm4gbmV3IFR5cGVTY3JpcHRTeW1ib2xRdWVyeShwcm9ncmFtLCBjaGVja2VyLCBzb3VyY2UsIGZldGNoUGlwZXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NNZW1iZXJzKFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBzdGF0aWNTeW1ib2w6IFN0YXRpY1N5bWJvbCk6IFN5bWJvbFRhYmxlfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRlY2xhcmF0aW9uID0gZ2V0Q2xhc3NGcm9tU3RhdGljU3ltYm9sKHByb2dyYW0sIHN0YXRpY1N5bWJvbCk7XG4gIGlmIChkZWNsYXJhdGlvbikge1xuICAgIGNvbnN0IHR5cGUgPSBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCBub2RlID0gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHN0YXRpY1N5bWJvbC5maWxlUGF0aCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwge25vZGUsIHByb2dyYW0sIGNoZWNrZXJ9KS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGFzc01lbWJlcnNGcm9tRGVjbGFyYXRpb24oXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgICBkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbikge1xuICBjb25zdCB0eXBlID0gY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihkZWNsYXJhdGlvbik7XG4gIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwge25vZGU6IHNvdXJjZSwgcHJvZ3JhbSwgY2hlY2tlcn0pLm1lbWJlcnMoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsYXNzRnJvbVN0YXRpY1N5bWJvbChcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCB0eXBlOiBTdGF0aWNTeW1ib2wpOiB0cy5DbGFzc0RlY2xhcmF0aW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHNvdXJjZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZSh0eXBlLmZpbGVQYXRoKTtcbiAgaWYgKHNvdXJjZSkge1xuICAgIHJldHVybiB0cy5mb3JFYWNoQ2hpbGQoc291cmNlLCBjaGlsZCA9PiB7XG4gICAgICBpZiAoY2hpbGQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBjaGlsZCBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lICE9IG51bGwgJiYgY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQgPT09IHR5cGUubmFtZSkge1xuICAgICAgICAgIHJldHVybiBjbGFzc0RlY2xhcmF0aW9uO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkgYXModHMuQ2xhc3NEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZCk7XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGlwZXNUYWJsZShcbiAgICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsIHByb2dyYW06IHRzLlByb2dyYW0sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgIHBpcGVzOiBDb21waWxlUGlwZVN1bW1hcnlbXSk6IFN5bWJvbFRhYmxlIHtcbiAgcmV0dXJuIG5ldyBQaXBlc1RhYmxlKHBpcGVzLCB7cHJvZ3JhbSwgY2hlY2tlciwgbm9kZTogc291cmNlfSk7XG59XG5cbmNsYXNzIFR5cGVTY3JpcHRTeW1ib2xRdWVyeSBpbXBsZW1lbnRzIFN5bWJvbFF1ZXJ5IHtcbiAgcHJpdmF0ZSB0eXBlQ2FjaGUgPSBuZXcgTWFwPEJ1aWx0aW5UeXBlLCBTeW1ib2w+KCk7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHBpcGVzQ2FjaGUgITogU3ltYm9sVGFibGU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgcHJpdmF0ZSBmZXRjaFBpcGVzOiAoKSA9PiBTeW1ib2xUYWJsZSkge31cblxuICBnZXRUeXBlS2luZChzeW1ib2w6IFN5bWJvbCk6IEJ1aWx0aW5UeXBlIHsgcmV0dXJuIHR5cGVLaW5kT2YodGhpcy5nZXRUc1R5cGVPZihzeW1ib2wpKTsgfVxuXG4gIGdldEJ1aWx0aW5UeXBlKGtpbmQ6IEJ1aWx0aW5UeXBlKTogU3ltYm9sIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy50eXBlQ2FjaGUuZ2V0KGtpbmQpO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICBjb25zdCB0eXBlID0gZ2V0QnVpbHRpblR5cGVGcm9tVHMoXG4gICAgICAgICAga2luZCwge2NoZWNrZXI6IHRoaXMuY2hlY2tlciwgbm9kZTogdGhpcy5zb3VyY2UsIHByb2dyYW06IHRoaXMucHJvZ3JhbX0pO1xuICAgICAgcmVzdWx0ID1cbiAgICAgICAgICBuZXcgVHlwZVdyYXBwZXIodHlwZSwge3Byb2dyYW06IHRoaXMucHJvZ3JhbSwgY2hlY2tlcjogdGhpcy5jaGVja2VyLCBub2RlOiB0aGlzLnNvdXJjZX0pO1xuICAgICAgdGhpcy50eXBlQ2FjaGUuc2V0KGtpbmQsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXRUeXBlVW5pb24oLi4udHlwZXM6IFN5bWJvbFtdKTogU3ltYm9sIHtcbiAgICAvLyBObyBBUEkgZXhpc3RzIHNvIHJldHVybiBhbnkgaWYgdGhlIHR5cGVzIGFyZSBub3QgYWxsIHRoZSBzYW1lIHR5cGUuXG4gICAgbGV0IHJlc3VsdDogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZXMubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgPSB0eXBlc1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVzW2ldICE9IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IHx8IHRoaXMuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgfVxuXG4gIGdldEFycmF5VHlwZSh0eXBlOiBTeW1ib2wpOiBTeW1ib2wgeyByZXR1cm4gdGhpcy5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpOyB9XG5cbiAgZ2V0RWxlbWVudFR5cGUodHlwZTogU3ltYm9sKTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgaWYgKHR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgICAgY29uc3QgZWxlbWVudFR5cGUgPSBnZXRUeXBlUGFyYW1ldGVyT2YodHlwZS50c1R5cGUsICdBcnJheScpO1xuICAgICAgaWYgKGVsZW1lbnRUeXBlKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIoZWxlbWVudFR5cGUsIHR5cGUuY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Tm9uTnVsbGFibGVUeXBlKHN5bWJvbDogU3ltYm9sKTogU3ltYm9sIHtcbiAgICBpZiAoc3ltYm9sIGluc3RhbmNlb2YgVHlwZVdyYXBwZXIgJiYgKHR5cGVvZiB0aGlzLmNoZWNrZXIuZ2V0Tm9uTnVsbGFibGVUeXBlID09ICdmdW5jdGlvbicpKSB7XG4gICAgICBjb25zdCB0c1R5cGUgPSBzeW1ib2wudHNUeXBlO1xuICAgICAgY29uc3Qgbm9uTnVsbGFibGVUeXBlID0gdGhpcy5jaGVja2VyLmdldE5vbk51bGxhYmxlVHlwZSh0c1R5cGUpO1xuICAgICAgaWYgKG5vbk51bGxhYmxlVHlwZSAhPSB0c1R5cGUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcihub25OdWxsYWJsZVR5cGUsIHN5bWJvbC5jb250ZXh0KTtcbiAgICAgIH0gZWxzZSBpZiAobm9uTnVsbGFibGVUeXBlID09IHRzVHlwZSkge1xuICAgICAgICByZXR1cm4gc3ltYm9sO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5BbnkpO1xuICB9XG5cbiAgZ2V0UGlwZXMoKTogU3ltYm9sVGFibGUge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLnBpcGVzQ2FjaGU7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMucGlwZXNDYWNoZSA9IHRoaXMuZmV0Y2hQaXBlcygpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVDb250ZXh0KHR5cGU6IFN0YXRpY1N5bWJvbCk6IFN5bWJvbFRhYmxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY29udGV4dDogVHlwZUNvbnRleHQgPSB7bm9kZTogdGhpcy5zb3VyY2UsIHByb2dyYW06IHRoaXMucHJvZ3JhbSwgY2hlY2tlcjogdGhpcy5jaGVja2VyfTtcbiAgICBjb25zdCB0eXBlU3ltYm9sID0gZmluZENsYXNzU3ltYm9sSW5Db250ZXh0KHR5cGUsIGNvbnRleHQpO1xuICAgIGlmICh0eXBlU3ltYm9sKSB7XG4gICAgICBjb25zdCBjb250ZXh0VHlwZSA9IHRoaXMuZ2V0VGVtcGxhdGVSZWZDb250ZXh0VHlwZSh0eXBlU3ltYm9sKTtcbiAgICAgIGlmIChjb250ZXh0VHlwZSkgcmV0dXJuIG5ldyBTeW1ib2xXcmFwcGVyKGNvbnRleHRUeXBlLCBjb250ZXh0KS5tZW1iZXJzKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0VHlwZVN5bWJvbCh0eXBlOiBTdGF0aWNTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjb250ZXh0OiBUeXBlQ29udGV4dCA9IHtub2RlOiB0aGlzLnNvdXJjZSwgcHJvZ3JhbTogdGhpcy5wcm9ncmFtLCBjaGVja2VyOiB0aGlzLmNoZWNrZXJ9O1xuICAgIGNvbnN0IHR5cGVTeW1ib2wgPSBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIHR5cGVTeW1ib2wgJiYgbmV3IFN5bWJvbFdyYXBwZXIodHlwZVN5bWJvbCwgY29udGV4dCk7XG4gIH1cblxuICBjcmVhdGVTeW1ib2xUYWJsZShzeW1ib2xzOiBTeW1ib2xEZWNsYXJhdGlvbltdKTogU3ltYm9sVGFibGUge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXBTeW1ib2xUYWJsZSgpO1xuICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9scy5tYXAocyA9PiBuZXcgRGVjbGFyZWRTeW1ib2wocykpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgbWVyZ2VTeW1ib2xUYWJsZShzeW1ib2xUYWJsZXM6IFN5bWJvbFRhYmxlW10pOiBTeW1ib2xUYWJsZSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcFN5bWJvbFRhYmxlKCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2xUYWJsZSBvZiBzeW1ib2xUYWJsZXMpIHtcbiAgICAgIHJlc3VsdC5hZGRBbGwoc3ltYm9sVGFibGUudmFsdWVzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0U3BhbkF0KGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBTcGFufHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNwYW5BdCh0aGlzLnNvdXJjZSwgbGluZSwgY29sdW1uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVSZWZDb250ZXh0VHlwZSh0eXBlU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0eXBlID0gdGhpcy5jaGVja2VyLmdldFR5cGVPZlN5bWJvbEF0TG9jYXRpb24odHlwZVN5bWJvbCwgdGhpcy5zb3VyY2UpO1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gdHlwZS5zeW1ib2wgJiYgdHlwZS5zeW1ib2wubWVtYmVycyAmJlxuICAgICAgICBnZXRGcm9tU3ltYm9sVGFibGUodHlwZS5zeW1ib2wubWVtYmVycyAhLCAnX19jb25zdHJ1Y3RvcicpO1xuXG4gICAgaWYgKGNvbnN0cnVjdG9yKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvckRlY2xhcmF0aW9uID0gY29uc3RydWN0b3IuZGVjbGFyYXRpb25zICFbMF0gYXMgdHMuQ29uc3RydWN0b3JUeXBlTm9kZTtcbiAgICAgIGZvciAoY29uc3QgcGFyYW1ldGVyIG9mIGNvbnN0cnVjdG9yRGVjbGFyYXRpb24ucGFyYW1ldGVycykge1xuICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5jaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKHBhcmFtZXRlci50eXBlICEpO1xuICAgICAgICBpZiAodHlwZS5zeW1ib2wgIS5uYW1lID09ICdUZW1wbGF0ZVJlZicgJiYgaXNSZWZlcmVuY2VUeXBlKHR5cGUpKSB7XG4gICAgICAgICAgY29uc3QgdHlwZVJlZmVyZW5jZSA9IHR5cGUgYXMgdHMuVHlwZVJlZmVyZW5jZTtcbiAgICAgICAgICBpZiAodHlwZVJlZmVyZW5jZS50eXBlQXJndW1lbnRzICYmIHR5cGVSZWZlcmVuY2UudHlwZUFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlUmVmZXJlbmNlLnR5cGVBcmd1bWVudHNbMF0uc3ltYm9sO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHNUeXBlT2Yoc3ltYm9sOiBTeW1ib2wpOiB0cy5UeXBlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuZ2V0VHlwZVdyYXBwZXIoc3ltYm9sKTtcbiAgICByZXR1cm4gdHlwZSAmJiB0eXBlLnRzVHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwZVdyYXBwZXIoc3ltYm9sOiBTeW1ib2wpOiBUeXBlV3JhcHBlcnx1bmRlZmluZWQge1xuICAgIGxldCB0eXBlOiBUeXBlV3JhcHBlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHN5bWJvbCBpbnN0YW5jZW9mIFR5cGVXcmFwcGVyKSB7XG4gICAgICB0eXBlID0gc3ltYm9sO1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLnR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgICAgdHlwZSA9IHN5bWJvbC50eXBlO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0eXBlQ2FsbGFibGUodHlwZTogdHMuVHlwZSk6IGJvb2xlYW4ge1xuICBjb25zdCBzaWduYXR1cmVzID0gdHlwZS5nZXRDYWxsU2lnbmF0dXJlcygpO1xuICByZXR1cm4gc2lnbmF0dXJlcyAmJiBzaWduYXR1cmVzLmxlbmd0aCAhPSAwO1xufVxuXG5mdW5jdGlvbiBzaWduYXR1cmVzT2YodHlwZTogdHMuVHlwZSwgY29udGV4dDogVHlwZUNvbnRleHQpOiBTaWduYXR1cmVbXSB7XG4gIHJldHVybiB0eXBlLmdldENhbGxTaWduYXR1cmVzKCkubWFwKHMgPT4gbmV3IFNpZ25hdHVyZVdyYXBwZXIocywgY29udGV4dCkpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RTaWduYXR1cmUodHlwZTogdHMuVHlwZSwgY29udGV4dDogVHlwZUNvbnRleHQsIHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXxcbiAgICB1bmRlZmluZWQge1xuICAvLyBUT0RPOiBEbyBhIGJldHRlciBqb2Igb2Ygc2VsZWN0aW5nIHRoZSByaWdodCBzaWduYXR1cmUuXG4gIGNvbnN0IHNpZ25hdHVyZXMgPSB0eXBlLmdldENhbGxTaWduYXR1cmVzKCk7XG4gIHJldHVybiBzaWduYXR1cmVzLmxlbmd0aCA/IG5ldyBTaWduYXR1cmVXcmFwcGVyKHNpZ25hdHVyZXNbMF0sIGNvbnRleHQpIDogdW5kZWZpbmVkO1xufVxuXG5jbGFzcyBUeXBlV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0c1R5cGU6IHRzLlR5cGUsIHB1YmxpYyBjb250ZXh0OiBUeXBlQ29udGV4dCkge1xuICAgIGlmICghdHNUeXBlKSB7XG4gICAgICB0aHJvdyBFcnJvcignSW50ZXJuYWw6IG51bGwgdHlwZScpO1xuICAgIH1cbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuc3ltYm9sO1xuICAgIHJldHVybiAoc3ltYm9sICYmIHN5bWJvbC5uYW1lKSB8fCAnPGFub255bW91cz4nO1xuICB9XG5cbiAgcHVibGljIHJlYWRvbmx5IGtpbmQ6IERlY2xhcmF0aW9uS2luZCA9ICd0eXBlJztcblxuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcblxuICBwdWJsaWMgcmVhZG9ubHkgdHlwZTogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgcmVhZG9ubHkgY29udGFpbmVyOiBTeW1ib2x8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHR5cGVDYWxsYWJsZSh0aGlzLnRzVHlwZSk7IH1cblxuICBnZXQgbnVsbGFibGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5jaGVja2VyLmdldE5vbk51bGxhYmxlVHlwZSh0aGlzLnRzVHlwZSkgIT0gdGhpcy50c1R5cGU7XG4gIH1cblxuICBnZXQgZGVmaW5pdGlvbigpOiBEZWZpbml0aW9ufHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy50c1R5cGUuZ2V0U3ltYm9sKCk7XG4gICAgcmV0dXJuIHN5bWJvbCA/IGRlZmluaXRpb25Gcm9tVHNTeW1ib2woc3ltYm9sKSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUge1xuICAgIHJldHVybiBuZXcgU3ltYm9sVGFibGVXcmFwcGVyKHRoaXMudHNUeXBlLmdldFByb3BlcnRpZXMoKSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIHNpZ25hdHVyZXMoKTogU2lnbmF0dXJlW10geyByZXR1cm4gc2lnbmF0dXJlc09mKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgc2VsZWN0U2lnbmF0dXJlKHR5cGVzOiBTeW1ib2xbXSk6IFNpZ25hdHVyZXx1bmRlZmluZWQge1xuICAgIHJldHVybiBzZWxlY3RTaWduYXR1cmUodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCwgdHlwZXMpO1xuICB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB1bmRlZmluZWQ7IH1cbn1cblxuY2xhc3MgU3ltYm9sV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbCB7XG4gIHByaXZhdGUgc3ltYm9sOiB0cy5TeW1ib2w7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF90c1R5cGUgITogdHMuVHlwZTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX21lbWJlcnMgITogU3ltYm9sVGFibGU7XG5cbiAgcHVibGljIHJlYWRvbmx5IG51bGxhYmxlOiBib29sZWFuID0gZmFsc2U7XG4gIHB1YmxpYyByZWFkb25seSBsYW5ndWFnZTogc3RyaW5nID0gJ3R5cGVzY3JpcHQnO1xuXG4gIGNvbnN0cnVjdG9yKHN5bWJvbDogdHMuU3ltYm9sLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7XG4gICAgdGhpcy5zeW1ib2wgPSBzeW1ib2wgJiYgY29udGV4dCAmJiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpID9cbiAgICAgICAgY29udGV4dC5jaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKSA6XG4gICAgICAgIHN5bWJvbDtcbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnN5bWJvbC5uYW1lOyB9XG5cbiAgZ2V0IGtpbmQoKTogRGVjbGFyYXRpb25LaW5kIHsgcmV0dXJuIHRoaXMuY2FsbGFibGUgPyAnbWV0aG9kJyA6ICdwcm9wZXJ0eSc7IH1cblxuICBnZXQgdHlwZSgpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIG5ldyBUeXBlV3JhcHBlcih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIGdldCBjb250YWluZXIoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiBnZXRDb250YWluZXJPZih0aGlzLnN5bWJvbCwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIGdldCBwdWJsaWMoKTogYm9vbGVhbiB7XG4gICAgLy8gU3ltYm9scyB0aGF0IGFyZSBub3QgZXhwbGljaXRseSBtYWRlIHByaXZhdGUgYXJlIHB1YmxpYy5cbiAgICByZXR1cm4gIWlzU3ltYm9sUHJpdmF0ZSh0aGlzLnN5bWJvbCk7XG4gIH1cblxuICBnZXQgY2FsbGFibGUoKTogYm9vbGVhbiB7IHJldHVybiB0eXBlQ2FsbGFibGUodGhpcy50c1R5cGUpOyB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbiB7IHJldHVybiBkZWZpbml0aW9uRnJvbVRzU3ltYm9sKHRoaXMuc3ltYm9sKTsgfVxuXG4gIG1lbWJlcnMoKTogU3ltYm9sVGFibGUge1xuICAgIGlmICghdGhpcy5fbWVtYmVycykge1xuICAgICAgaWYgKCh0aGlzLnN5bWJvbC5mbGFncyAmICh0cy5TeW1ib2xGbGFncy5DbGFzcyB8IHRzLlN5bWJvbEZsYWdzLkludGVyZmFjZSkpICE9IDApIHtcbiAgICAgICAgY29uc3QgZGVjbGFyZWRUeXBlID0gdGhpcy5jb250ZXh0LmNoZWNrZXIuZ2V0RGVjbGFyZWRUeXBlT2ZTeW1ib2wodGhpcy5zeW1ib2wpO1xuICAgICAgICBjb25zdCB0eXBlV3JhcHBlciA9IG5ldyBUeXBlV3JhcHBlcihkZWNsYXJlZFR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuX21lbWJlcnMgPSB0eXBlV3JhcHBlci5tZW1iZXJzKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9tZW1iZXJzID0gbmV3IFN5bWJvbFRhYmxlV3JhcHBlcih0aGlzLnN5bWJvbC5tZW1iZXJzICEsIHRoaXMuY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9tZW1iZXJzO1xuICB9XG5cbiAgc2lnbmF0dXJlcygpOiBTaWduYXR1cmVbXSB7IHJldHVybiBzaWduYXR1cmVzT2YodGhpcy50c1R5cGUsIHRoaXMuY29udGV4dCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNlbGVjdFNpZ25hdHVyZSh0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0LCB0eXBlcyk7XG4gIH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG4gIHByaXZhdGUgZ2V0IHRzVHlwZSgpOiB0cy5UeXBlIHtcbiAgICBsZXQgdHlwZSA9IHRoaXMuX3RzVHlwZTtcbiAgICBpZiAoIXR5cGUpIHtcbiAgICAgIHR5cGUgPSB0aGlzLl90c1R5cGUgPVxuICAgICAgICAgIHRoaXMuY29udGV4dC5jaGVja2VyLmdldFR5cGVPZlN5bWJvbEF0TG9jYXRpb24odGhpcy5zeW1ib2wsIHRoaXMuY29udGV4dC5ub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGU7XG4gIH1cbn1cblxuY2xhc3MgRGVjbGFyZWRTeW1ib2wgaW1wbGVtZW50cyBTeW1ib2wge1xuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICduZy10ZW1wbGF0ZSc7XG5cbiAgcHVibGljIHJlYWRvbmx5IG51bGxhYmxlOiBib29sZWFuID0gZmFsc2U7XG5cbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpYzogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkZWNsYXJhdGlvbjogU3ltYm9sRGVjbGFyYXRpb24pIHt9XG5cbiAgZ2V0IG5hbWUoKSB7IHJldHVybiB0aGlzLmRlY2xhcmF0aW9uLm5hbWU7IH1cblxuICBnZXQga2luZCgpIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24ua2luZDsgfVxuXG4gIGdldCBjb250YWluZXIoKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB1bmRlZmluZWQ7IH1cblxuICBnZXQgdHlwZSgpIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZTsgfVxuXG4gIGdldCBjYWxsYWJsZSgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZS5jYWxsYWJsZTsgfVxuXG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbiB7IHJldHVybiB0aGlzLmRlY2xhcmF0aW9uLmRlZmluaXRpb247IH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZS5tZW1iZXJzKCk7IH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHsgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZS5zaWduYXR1cmVzKCk7IH1cblxuICBzZWxlY3RTaWduYXR1cmUodHlwZXM6IFN5bWJvbFtdKTogU2lnbmF0dXJlfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuZGVjbGFyYXRpb24udHlwZS5zZWxlY3RTaWduYXR1cmUodHlwZXMpO1xuICB9XG5cbiAgaW5kZXhlZChhcmd1bWVudDogU3ltYm9sKTogU3ltYm9sfHVuZGVmaW5lZCB7IHJldHVybiB1bmRlZmluZWQ7IH1cbn1cblxuY2xhc3MgU2lnbmF0dXJlV3JhcHBlciBpbXBsZW1lbnRzIFNpZ25hdHVyZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2lnbmF0dXJlOiB0cy5TaWduYXR1cmUsIHByaXZhdGUgY29udGV4dDogVHlwZUNvbnRleHQpIHt9XG5cbiAgZ2V0IGFyZ3VtZW50cygpOiBTeW1ib2xUYWJsZSB7XG4gICAgcmV0dXJuIG5ldyBTeW1ib2xUYWJsZVdyYXBwZXIodGhpcy5zaWduYXR1cmUuZ2V0UGFyYW1ldGVycygpLCB0aGlzLmNvbnRleHQpO1xuICB9XG5cbiAgZ2V0IHJlc3VsdCgpOiBTeW1ib2wgeyByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHRoaXMuc2lnbmF0dXJlLmdldFJldHVyblR5cGUoKSwgdGhpcy5jb250ZXh0KTsgfVxufVxuXG5jbGFzcyBTaWduYXR1cmVSZXN1bHRPdmVycmlkZSBpbXBsZW1lbnRzIFNpZ25hdHVyZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2lnbmF0dXJlOiBTaWduYXR1cmUsIHByaXZhdGUgcmVzdWx0VHlwZTogU3ltYm9sKSB7fVxuXG4gIGdldCBhcmd1bWVudHMoKTogU3ltYm9sVGFibGUgeyByZXR1cm4gdGhpcy5zaWduYXR1cmUuYXJndW1lbnRzOyB9XG5cbiAgZ2V0IHJlc3VsdCgpOiBTeW1ib2wgeyByZXR1cm4gdGhpcy5yZXN1bHRUeXBlOyB9XG59XG5cbi8qKlxuICogSW5kaWNhdGVzIHRoZSBsb3dlciBib3VuZCBUeXBlU2NyaXB0IHZlcnNpb24gc3VwcG9ydGluZyBgU3ltYm9sVGFibGVgIGFzIGFuIEVTNiBgTWFwYC5cbiAqIEZvciBsb3dlciB2ZXJzaW9ucywgYFN5bWJvbFRhYmxlYCBpcyBpbXBsZW1lbnRlZCBhcyBhIGRpY3Rpb25hcnlcbiAqL1xuY29uc3QgTUlOX1RTX1ZFUlNJT05fU1VQUE9SVElOR19NQVAgPSAnMi4yJztcblxuZXhwb3J0IGNvbnN0IHRvU3ltYm9sVGFibGVGYWN0b3J5ID0gKHRzVmVyc2lvbjogc3RyaW5nKSA9PiAoc3ltYm9sczogdHMuU3ltYm9sW10pID0+IHtcbiAgaWYgKGlzVmVyc2lvbkJldHdlZW4odHNWZXJzaW9uLCBNSU5fVFNfVkVSU0lPTl9TVVBQT1JUSU5HX01BUCkpIHtcbiAgICAvLyDiiIAgVHlwZXNjcmlwdCB2ZXJzaW9uID49IDIuMiwgYFN5bWJvbFRhYmxlYCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBFUzYgYE1hcGBcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgdHMuU3ltYm9sPigpO1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHN5bWJvbHMpIHtcbiAgICAgIHJlc3VsdC5zZXQoc3ltYm9sLm5hbWUsIHN5bWJvbCk7XG4gICAgfVxuICAgIC8vIEZpcnN0LCB0ZWxsIHRoZSBjb21waWxlciB0aGF0IGByZXN1bHRgIGlzIG9mIHR5cGUgYGFueWAuIFRoZW4sIHVzZSBhIHNlY29uZCB0eXBlIGFzc2VydGlvblxuICAgIC8vIHRvIGB0cy5TeW1ib2xUYWJsZWAuXG4gICAgLy8gT3RoZXJ3aXNlLCBgTWFwPHN0cmluZywgdHMuU3ltYm9sPmAgYW5kIGB0cy5TeW1ib2xUYWJsZWAgd2lsbCBiZSBjb25zaWRlcmVkIGFzIGluY29tcGF0aWJsZVxuICAgIC8vIHR5cGVzIGJ5IHRoZSBjb21waWxlclxuICAgIHJldHVybiA8dHMuU3ltYm9sVGFibGU+KDxhbnk+cmVzdWx0KTtcbiAgfVxuXG4gIC8vIOKIgCBUeXBlc2NyaXB0IHZlcnNpb24gPCAyLjIsIGBTeW1ib2xUYWJsZWAgaXMgaW1wbGVtZW50ZWQgYXMgYSBkaWN0aW9uYXJ5XG4gIGNvbnN0IHJlc3VsdDoge1tuYW1lOiBzdHJpbmddOiB0cy5TeW1ib2x9ID0ge307XG4gIGZvciAoY29uc3Qgc3ltYm9sIG9mIHN5bWJvbHMpIHtcbiAgICByZXN1bHRbc3ltYm9sLm5hbWVdID0gc3ltYm9sO1xuICB9XG4gIHJldHVybiA8dHMuU3ltYm9sVGFibGU+KDxhbnk+cmVzdWx0KTtcbn07XG5cbmZ1bmN0aW9uIHRvU3ltYm9scyhzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGUgfCB1bmRlZmluZWQpOiB0cy5TeW1ib2xbXSB7XG4gIGlmICghc3ltYm9sVGFibGUpIHJldHVybiBbXTtcblxuICBjb25zdCB0YWJsZSA9IHN5bWJvbFRhYmxlIGFzIGFueTtcblxuICBpZiAodHlwZW9mIHRhYmxlLnZhbHVlcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRhYmxlLnZhbHVlcygpKSBhcyB0cy5TeW1ib2xbXTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdDogdHMuU3ltYm9sW10gPSBbXTtcblxuICBjb25zdCBvd24gPSB0eXBlb2YgdGFibGUuaGFzT3duUHJvcGVydHkgPT09ICdmdW5jdGlvbicgP1xuICAgICAgKG5hbWU6IHN0cmluZykgPT4gdGFibGUuaGFzT3duUHJvcGVydHkobmFtZSkgOlxuICAgICAgKG5hbWU6IHN0cmluZykgPT4gISF0YWJsZVtuYW1lXTtcblxuICBmb3IgKGNvbnN0IG5hbWUgaW4gdGFibGUpIHtcbiAgICBpZiAob3duKG5hbWUpKSB7XG4gICAgICByZXN1bHQucHVzaCh0YWJsZVtuYW1lXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmNsYXNzIFN5bWJvbFRhYmxlV3JhcHBlciBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgcHJpdmF0ZSBzeW1ib2xzOiB0cy5TeW1ib2xbXTtcbiAgcHJpdmF0ZSBzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGU7XG5cbiAgY29uc3RydWN0b3Ioc3ltYm9sczogdHMuU3ltYm9sVGFibGV8dHMuU3ltYm9sW118dW5kZWZpbmVkLCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7XG4gICAgc3ltYm9scyA9IHN5bWJvbHMgfHwgW107XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzeW1ib2xzKSkge1xuICAgICAgdGhpcy5zeW1ib2xzID0gc3ltYm9scztcbiAgICAgIGNvbnN0IHRvU3ltYm9sVGFibGUgPSB0b1N5bWJvbFRhYmxlRmFjdG9yeSh0cy52ZXJzaW9uKTtcbiAgICAgIHRoaXMuc3ltYm9sVGFibGUgPSB0b1N5bWJvbFRhYmxlKHN5bWJvbHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN5bWJvbHMgPSB0b1N5bWJvbHMoc3ltYm9scyk7XG4gICAgICB0aGlzLnN5bWJvbFRhYmxlID0gc3ltYm9scztcbiAgICB9XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5zeW1ib2xzLmxlbmd0aDsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IGdldEZyb21TeW1ib2xUYWJsZSh0aGlzLnN5bWJvbFRhYmxlLCBrZXkpO1xuICAgIHJldHVybiBzeW1ib2wgPyBuZXcgU3ltYm9sV3JhcHBlcihzeW1ib2wsIHRoaXMuY29udGV4dCkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0YWJsZTogYW55ID0gdGhpcy5zeW1ib2xUYWJsZTtcbiAgICByZXR1cm4gKHR5cGVvZiB0YWJsZS5oYXMgPT09ICdmdW5jdGlvbicpID8gdGFibGUuaGFzKGtleSkgOiB0YWJsZVtrZXldICE9IG51bGw7XG4gIH1cblxuICB2YWx1ZXMoKTogU3ltYm9sW10geyByZXR1cm4gdGhpcy5zeW1ib2xzLm1hcChzID0+IG5ldyBTeW1ib2xXcmFwcGVyKHMsIHRoaXMuY29udGV4dCkpOyB9XG59XG5cbmNsYXNzIE1hcFN5bWJvbFRhYmxlIGltcGxlbWVudHMgU3ltYm9sVGFibGUge1xuICBwcml2YXRlIG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBTeW1ib2w+KCk7XG4gIHByaXZhdGUgX3ZhbHVlczogU3ltYm9sW10gPSBbXTtcblxuICBnZXQgc2l6ZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5tYXAuc2l6ZTsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5tYXAuZ2V0KGtleSk7IH1cblxuICBhZGQoc3ltYm9sOiBTeW1ib2wpIHtcbiAgICBpZiAodGhpcy5tYXAuaGFzKHN5bWJvbC5uYW1lKSkge1xuICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLm1hcC5nZXQoc3ltYm9sLm5hbWUpICE7XG4gICAgICB0aGlzLl92YWx1ZXNbdGhpcy5fdmFsdWVzLmluZGV4T2YocHJldmlvdXMpXSA9IHN5bWJvbDtcbiAgICB9XG4gICAgdGhpcy5tYXAuc2V0KHN5bWJvbC5uYW1lLCBzeW1ib2wpO1xuICAgIHRoaXMuX3ZhbHVlcy5wdXNoKHN5bWJvbCk7XG4gIH1cblxuICBhZGRBbGwoc3ltYm9sczogU3ltYm9sW10pIHtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiBzeW1ib2xzKSB7XG4gICAgICB0aGlzLmFkZChzeW1ib2wpO1xuICAgIH1cbiAgfVxuXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5tYXAuaGFzKGtleSk7IH1cblxuICB2YWx1ZXMoKTogU3ltYm9sW10ge1xuICAgIC8vIFN3aXRjaCB0byB0aGlzLm1hcC52YWx1ZXMgb25jZSBpdGVyYWJsZXMgYXJlIHN1cHBvcnRlZCBieSB0aGUgdGFyZ2V0IGxhbmd1YWdlLlxuICAgIHJldHVybiB0aGlzLl92YWx1ZXM7XG4gIH1cbn1cblxuY2xhc3MgUGlwZXNUYWJsZSBpbXBsZW1lbnRzIFN5bWJvbFRhYmxlIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwaXBlczogQ29tcGlsZVBpcGVTdW1tYXJ5W10sIHByaXZhdGUgY29udGV4dDogVHlwZUNvbnRleHQpIHt9XG5cbiAgZ2V0IHNpemUoKSB7IHJldHVybiB0aGlzLnBpcGVzLmxlbmd0aDsgfVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHBpcGUgPSB0aGlzLnBpcGVzLmZpbmQocGlwZSA9PiBwaXBlLm5hbWUgPT0ga2V5KTtcbiAgICBpZiAocGlwZSkge1xuICAgICAgcmV0dXJuIG5ldyBQaXBlU3ltYm9sKHBpcGUsIHRoaXMuY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgaGFzKGtleTogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnBpcGVzLmZpbmQocGlwZSA9PiBwaXBlLm5hbWUgPT0ga2V5KSAhPSBudWxsOyB9XG5cbiAgdmFsdWVzKCk6IFN5bWJvbFtdIHsgcmV0dXJuIHRoaXMucGlwZXMubWFwKHBpcGUgPT4gbmV3IFBpcGVTeW1ib2wocGlwZSwgdGhpcy5jb250ZXh0KSk7IH1cbn1cblxuLy8gVGhpcyBtYXRjaGVzIC5kLnRzIGZpbGVzIHRoYXQgbG9vayBsaWtlIFwiLi4uLzxwYWNrYWdlLW5hbWU+LzxwYWNrYWdlLW5hbWU+LmQudHNcIixcbmNvbnN0IElOREVYX1BBVFRFUk4gPSAvW1xcXFwvXShbXlxcXFwvXSspW1xcXFwvXVxcMVxcLmRcXC50cyQvO1xuXG5jbGFzcyBQaXBlU3ltYm9sIGltcGxlbWVudHMgU3ltYm9sIHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgX3RzVHlwZSAhOiB0cy5UeXBlO1xuICBwdWJsaWMgcmVhZG9ubHkga2luZDogRGVjbGFyYXRpb25LaW5kID0gJ3BpcGUnO1xuICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2U6IHN0cmluZyA9ICd0eXBlc2NyaXB0JztcbiAgcHVibGljIHJlYWRvbmx5IGNvbnRhaW5lcjogU3ltYm9sfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHVibGljIHJlYWRvbmx5IGNhbGxhYmxlOiBib29sZWFuID0gdHJ1ZTtcbiAgcHVibGljIHJlYWRvbmx5IG51bGxhYmxlOiBib29sZWFuID0gZmFsc2U7XG4gIHB1YmxpYyByZWFkb25seSBwdWJsaWM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGlwZTogQ29tcGlsZVBpcGVTdW1tYXJ5LCBwcml2YXRlIGNvbnRleHQ6IFR5cGVDb250ZXh0KSB7fVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnBpcGUubmFtZTsgfVxuXG4gIGdldCB0eXBlKCk6IFN5bWJvbHx1bmRlZmluZWQgeyByZXR1cm4gbmV3IFR5cGVXcmFwcGVyKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQpOyB9XG5cbiAgZ2V0IGRlZmluaXRpb24oKTogRGVmaW5pdGlvbnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMudHNUeXBlLmdldFN5bWJvbCgpO1xuICAgIHJldHVybiBzeW1ib2wgPyBkZWZpbml0aW9uRnJvbVRzU3ltYm9sKHN5bWJvbCkgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxlIHsgcmV0dXJuIEVtcHR5VGFibGUuaW5zdGFuY2U7IH1cblxuICBzaWduYXR1cmVzKCk6IFNpZ25hdHVyZVtdIHsgcmV0dXJuIHNpZ25hdHVyZXNPZih0aGlzLnRzVHlwZSwgdGhpcy5jb250ZXh0KTsgfVxuXG4gIHNlbGVjdFNpZ25hdHVyZSh0eXBlczogU3ltYm9sW10pOiBTaWduYXR1cmV8dW5kZWZpbmVkIHtcbiAgICBsZXQgc2lnbmF0dXJlID0gc2VsZWN0U2lnbmF0dXJlKHRoaXMudHNUeXBlLCB0aGlzLmNvbnRleHQsIHR5cGVzKSAhO1xuICAgIGlmICh0eXBlcy5sZW5ndGggPT0gMSkge1xuICAgICAgY29uc3QgcGFyYW1ldGVyVHlwZSA9IHR5cGVzWzBdO1xuICAgICAgaWYgKHBhcmFtZXRlclR5cGUgaW5zdGFuY2VvZiBUeXBlV3JhcHBlcikge1xuICAgICAgICBsZXQgcmVzdWx0VHlwZTogdHMuVHlwZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICAgICAgY2FzZSAnYXN5bmMnOlxuICAgICAgICAgICAgc3dpdGNoIChwYXJhbWV0ZXJUeXBlLm5hbWUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnT2JzZXJ2YWJsZSc6XG4gICAgICAgICAgICAgIGNhc2UgJ1Byb21pc2UnOlxuICAgICAgICAgICAgICBjYXNlICdFdmVudEVtaXR0ZXInOlxuICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUgPSBnZXRUeXBlUGFyYW1ldGVyT2YocGFyYW1ldGVyVHlwZS50c1R5cGUsIHBhcmFtZXRlclR5cGUubmFtZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmVzdWx0VHlwZSA9IGdldEJ1aWx0aW5UeXBlRnJvbVRzKEJ1aWx0aW5UeXBlLkFueSwgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3NsaWNlJzpcbiAgICAgICAgICAgIHJlc3VsdFR5cGUgPSBnZXRUeXBlUGFyYW1ldGVyT2YocGFyYW1ldGVyVHlwZS50c1R5cGUsICdBcnJheScpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdFR5cGUpIHtcbiAgICAgICAgICBzaWduYXR1cmUgPSBuZXcgU2lnbmF0dXJlUmVzdWx0T3ZlcnJpZGUoXG4gICAgICAgICAgICAgIHNpZ25hdHVyZSwgbmV3IFR5cGVXcmFwcGVyKHJlc3VsdFR5cGUsIHBhcmFtZXRlclR5cGUuY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaWduYXR1cmU7XG4gIH1cblxuICBpbmRleGVkKGFyZ3VtZW50OiBTeW1ib2wpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG4gIHByaXZhdGUgZ2V0IHRzVHlwZSgpOiB0cy5UeXBlIHtcbiAgICBsZXQgdHlwZSA9IHRoaXMuX3RzVHlwZTtcbiAgICBpZiAoIXR5cGUpIHtcbiAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5maW5kQ2xhc3NTeW1ib2wodGhpcy5waXBlLnR5cGUucmVmZXJlbmNlKTtcbiAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gdGhpcy5maW5kVHJhbnNmb3JtTWV0aG9kVHlwZShjbGFzc1N5bWJvbCkgITtcbiAgICAgIH1cbiAgICAgIGlmICghdHlwZSkge1xuICAgICAgICB0eXBlID0gdGhpcy5fdHNUeXBlID0gZ2V0QnVpbHRpblR5cGVGcm9tVHMoQnVpbHRpblR5cGUuQW55LCB0aGlzLmNvbnRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZENsYXNzU3ltYm9sKHR5cGU6IFN0YXRpY1N5bWJvbCk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiBmaW5kQ2xhc3NTeW1ib2xJbkNvbnRleHQodHlwZSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFRyYW5zZm9ybU1ldGhvZFR5cGUoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLlR5cGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBjbGFzc1R5cGUgPSB0aGlzLmNvbnRleHQuY2hlY2tlci5nZXREZWNsYXJlZFR5cGVPZlN5bWJvbChjbGFzc1N5bWJvbCk7XG4gICAgaWYgKGNsYXNzVHlwZSkge1xuICAgICAgY29uc3QgdHJhbnNmb3JtID0gY2xhc3NUeXBlLmdldFByb3BlcnR5KCd0cmFuc2Zvcm0nKTtcbiAgICAgIGlmICh0cmFuc2Zvcm0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5jaGVja2VyLmdldFR5cGVPZlN5bWJvbEF0TG9jYXRpb24odHJhbnNmb3JtLCB0aGlzLmNvbnRleHQubm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRDbGFzc1N5bWJvbEluQ29udGV4dCh0eXBlOiBTdGF0aWNTeW1ib2wsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGxldCBzb3VyY2VGaWxlID0gY29udGV4dC5wcm9ncmFtLmdldFNvdXJjZUZpbGUodHlwZS5maWxlUGF0aCk7XG4gIGlmICghc291cmNlRmlsZSkge1xuICAgIC8vIFRoaXMgaGFuZGxlcyBhIGNhc2Ugd2hlcmUgYW4gPHBhY2thZ2VOYW1lPi9pbmRleC5kLnRzIGFuZCBhIDxwYWNrYWdlTmFtZT4vPHBhY2thZ2VOYW1lPi5kLnRzXG4gICAgLy8gYXJlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS4gSWYgd2UgYXJlIGxvb2tpbmcgZm9yIDxwYWNrYWdlTmFtZT4vPHBhY2thZ2VOYW1lPiBhbmQgZGlkbid0XG4gICAgLy8gZmluZCBpdCwgbG9vayBmb3IgPHBhY2thZ2VOYW1lPi9pbmRleC5kLnRzIGFzIHRoZSBwcm9ncmFtIG1pZ2h0IGhhdmUgZm91bmQgdGhhdCBpbnN0ZWFkLlxuICAgIGNvbnN0IHAgPSB0eXBlLmZpbGVQYXRoIGFzIHN0cmluZztcbiAgICBjb25zdCBtID0gcC5tYXRjaChJTkRFWF9QQVRURVJOKTtcbiAgICBpZiAobSkge1xuICAgICAgY29uc3QgaW5kZXhWZXJzaW9uID0gcGF0aC5qb2luKHBhdGguZGlybmFtZShwKSwgJ2luZGV4LmQudHMnKTtcbiAgICAgIHNvdXJjZUZpbGUgPSBjb250ZXh0LnByb2dyYW0uZ2V0U291cmNlRmlsZShpbmRleFZlcnNpb24pO1xuICAgIH1cbiAgfVxuICBpZiAoc291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1vZHVsZVN5bWJvbCA9IChzb3VyY2VGaWxlIGFzIGFueSkubW9kdWxlIHx8IChzb3VyY2VGaWxlIGFzIGFueSkuc3ltYm9sO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBjb250ZXh0LmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbCk7XG4gICAgcmV0dXJuIChleHBvcnRzIHx8IFtdKS5maW5kKHN5bWJvbCA9PiBzeW1ib2wubmFtZSA9PSB0eXBlLm5hbWUpO1xuICB9XG59XG5cbmNsYXNzIEVtcHR5VGFibGUgaW1wbGVtZW50cyBTeW1ib2xUYWJsZSB7XG4gIHB1YmxpYyByZWFkb25seSBzaXplOiBudW1iZXIgPSAwO1xuICBnZXQoa2V5OiBzdHJpbmcpOiBTeW1ib2x8dW5kZWZpbmVkIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIGZhbHNlOyB9XG4gIHZhbHVlcygpOiBTeW1ib2xbXSB7IHJldHVybiBbXTsgfVxuICBzdGF0aWMgaW5zdGFuY2UgPSBuZXcgRW1wdHlUYWJsZSgpO1xufVxuXG5mdW5jdGlvbiBpc1N5bWJvbFByaXZhdGUoczogdHMuU3ltYm9sKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIXMudmFsdWVEZWNsYXJhdGlvbiAmJiBpc1ByaXZhdGUocy52YWx1ZURlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gZ2V0QnVpbHRpblR5cGVGcm9tVHMoa2luZDogQnVpbHRpblR5cGUsIGNvbnRleHQ6IFR5cGVDb250ZXh0KTogdHMuVHlwZSB7XG4gIGxldCB0eXBlOiB0cy5UeXBlO1xuICBjb25zdCBjaGVja2VyID0gY29udGV4dC5jaGVja2VyO1xuICBjb25zdCBub2RlID0gY29udGV4dC5ub2RlO1xuICBzd2l0Y2ggKGtpbmQpIHtcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgIHR5cGUgPSBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKHNldFBhcmVudHMoXG4gICAgICAgICAgPHRzLk5vZGU+PGFueT57XG4gICAgICAgICAgICBraW5kOiB0cy5TeW50YXhLaW5kLkFzRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGV4cHJlc3Npb246IDx0cy5Ob2RlPntraW5kOiB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkfSxcbiAgICAgICAgICAgIHR5cGU6IDx0cy5Ob2RlPntraW5kOiB0cy5TeW50YXhLaW5kLkFueUtleXdvcmR9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBub2RlKSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLkJvb2xlYW46XG4gICAgICB0eXBlID1cbiAgICAgICAgICBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKHNldFBhcmVudHMoPHRzLk5vZGU+e2tpbmQ6IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmR9LCBub2RlKSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bGw6XG4gICAgICB0eXBlID1cbiAgICAgICAgICBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKHNldFBhcmVudHMoPHRzLk5vZGU+e2tpbmQ6IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmR9LCBub2RlKSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgIGNvbnN0IG51bWVyaWMgPSA8dHMuTGl0ZXJhbExpa2VOb2RlPntcbiAgICAgICAga2luZDogdHMuU3ludGF4S2luZC5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgdGV4dDogbm9kZS5nZXRUZXh0KCksXG4gICAgICB9O1xuICAgICAgc2V0UGFyZW50cyg8YW55PntraW5kOiB0cy5TeW50YXhLaW5kLkV4cHJlc3Npb25TdGF0ZW1lbnQsIGV4cHJlc3Npb246IG51bWVyaWN9LCBub2RlKTtcbiAgICAgIHR5cGUgPSBjaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG51bWVyaWMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICB0eXBlID0gY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihzZXRQYXJlbnRzKFxuICAgICAgICAgIDx0cy5MaXRlcmFsTGlrZU5vZGU+e1xuICAgICAgICAgICAga2luZDogdHMuU3ludGF4S2luZC5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbCxcbiAgICAgICAgICAgIHRleHQ6IG5vZGUuZ2V0VGV4dCgpLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbm9kZSkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCdWlsdGluVHlwZS5VbmRlZmluZWQ6XG4gICAgICB0eXBlID0gY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihzZXRQYXJlbnRzKFxuICAgICAgICAgIDx0cy5Ob2RlPjxhbnk+e1xuICAgICAgICAgICAga2luZDogdHMuU3ludGF4S2luZC5Wb2lkRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGV4cHJlc3Npb246IDx0cy5Ob2RlPntraW5kOiB0cy5TeW50YXhLaW5kLk51bWVyaWNMaXRlcmFsfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgbm9kZSkpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3IsIHVuaGFuZGxlZCBsaXRlcmFsIGtpbmQgJHtraW5kfToke0J1aWx0aW5UeXBlW2tpbmRdfWApO1xuICB9XG4gIHJldHVybiB0eXBlO1xufVxuXG5mdW5jdGlvbiBzZXRQYXJlbnRzPFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBULCBwYXJlbnQ6IHRzLk5vZGUpOiBUIHtcbiAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XG4gIHRzLmZvckVhY2hDaGlsZChub2RlLCBjaGlsZCA9PiBzZXRQYXJlbnRzKGNoaWxkLCBub2RlKSk7XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBzcGFuQXQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IFNwYW58dW5kZWZpbmVkIHtcbiAgaWYgKGxpbmUgIT0gbnVsbCAmJiBjb2x1bW4gIT0gbnVsbCkge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gdHMuZ2V0UG9zaXRpb25PZkxpbmVBbmRDaGFyYWN0ZXIoc291cmNlRmlsZSwgbGluZSwgY29sdW1uKTtcbiAgICBjb25zdCBmaW5kQ2hpbGQgPSBmdW5jdGlvbiBmaW5kQ2hpbGQobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgICAgaWYgKG5vZGUua2luZCA+IHRzLlN5bnRheEtpbmQuTGFzdFRva2VuICYmIG5vZGUucG9zIDw9IHBvc2l0aW9uICYmIG5vZGUuZW5kID4gcG9zaXRpb24pIHtcbiAgICAgICAgY29uc3QgYmV0dGVyTm9kZSA9IHRzLmZvckVhY2hDaGlsZChub2RlLCBmaW5kQ2hpbGQpO1xuICAgICAgICByZXR1cm4gYmV0dGVyTm9kZSB8fCBub2RlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBub2RlID0gdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZpbmRDaGlsZCk7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJldHVybiB7c3RhcnQ6IG5vZGUuZ2V0U3RhcnQoKSwgZW5kOiBub2RlLmdldEVuZCgpfTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVmaW5pdGlvbkZyb21Uc1N5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCk6IERlZmluaXRpb24ge1xuICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzeW1ib2wuZGVjbGFyYXRpb25zO1xuICBpZiAoZGVjbGFyYXRpb25zKSB7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9ucy5tYXAoZGVjbGFyYXRpb24gPT4ge1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGVOYW1lOiBzb3VyY2VGaWxlLmZpbGVOYW1lLFxuICAgICAgICBzcGFuOiB7c3RhcnQ6IGRlY2xhcmF0aW9uLmdldFN0YXJ0KCksIGVuZDogZGVjbGFyYXRpb24uZ2V0RW5kKCl9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcmVudERlY2xhcmF0aW9uT2Yobm9kZTogdHMuTm9kZSk6IHRzLk5vZGV8dW5kZWZpbmVkIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuSW50ZXJmYWNlRGVjbGFyYXRpb246XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGU6XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudCAhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5lck9mKHN5bWJvbDogdHMuU3ltYm9sLCBjb250ZXh0OiBUeXBlQ29udGV4dCk6IFN5bWJvbHx1bmRlZmluZWQge1xuICBpZiAoc3ltYm9sLmdldEZsYWdzKCkgJiB0cy5TeW1ib2xGbGFncy5DbGFzc01lbWJlciAmJiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBzeW1ib2wuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBwYXJlbnQgPSBwYXJlbnREZWNsYXJhdGlvbk9mKGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGNvbnRleHQuY2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihwYXJlbnQpO1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgIHJldHVybiBuZXcgVHlwZVdyYXBwZXIodHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VHlwZVBhcmFtZXRlck9mKHR5cGU6IHRzLlR5cGUsIG5hbWU6IHN0cmluZyk6IHRzLlR5cGV8dW5kZWZpbmVkIHtcbiAgaWYgKHR5cGUgJiYgdHlwZS5zeW1ib2wgJiYgdHlwZS5zeW1ib2wubmFtZSA9PSBuYW1lKSB7XG4gICAgY29uc3QgdHlwZUFyZ3VtZW50czogdHMuVHlwZVtdID0gKHR5cGUgYXMgYW55KS50eXBlQXJndW1lbnRzO1xuICAgIGlmICh0eXBlQXJndW1lbnRzICYmIHR5cGVBcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHJldHVybiB0eXBlQXJndW1lbnRzWzBdO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0eXBlS2luZE9mKHR5cGU6IHRzLlR5cGUgfCB1bmRlZmluZWQpOiBCdWlsdGluVHlwZSB7XG4gIGlmICh0eXBlKSB7XG4gICAgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuQW55KSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuQW55O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLlN0cmluZyB8IHRzLlR5cGVGbGFncy5TdHJpbmdMaWtlIHwgdHMuVHlwZUZsYWdzLlN0cmluZ0xpdGVyYWwpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuU3RyaW5nO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuTnVtYmVyIHwgdHMuVHlwZUZsYWdzLk51bWJlckxpa2UpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuTnVtYmVyO1xuICAgIH0gZWxzZSBpZiAodHlwZS5mbGFncyAmICh0cy5UeXBlRmxhZ3MuVW5kZWZpbmVkKSkge1xuICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiAodHMuVHlwZUZsYWdzLk51bGwpKSB7XG4gICAgICByZXR1cm4gQnVpbHRpblR5cGUuTnVsbDtcbiAgICB9IGVsc2UgaWYgKHR5cGUuZmxhZ3MgJiB0cy5UeXBlRmxhZ3MuVW5pb24pIHtcbiAgICAgIC8vIElmIGFsbCB0aGUgY29uc3RpdHVlbnQgdHlwZXMgb2YgYSB1bmlvbiBhcmUgdGhlIHNhbWUga2luZCwgaXQgaXMgYWxzbyB0aGF0IGtpbmQuXG4gICAgICBsZXQgY2FuZGlkYXRlOiBCdWlsdGluVHlwZXxudWxsID0gbnVsbDtcbiAgICAgIGNvbnN0IHVuaW9uVHlwZSA9IHR5cGUgYXMgdHMuVW5pb25UeXBlO1xuICAgICAgaWYgKHVuaW9uVHlwZS50eXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNhbmRpZGF0ZSA9IHR5cGVLaW5kT2YodW5pb25UeXBlLnR5cGVzWzBdKTtcbiAgICAgICAgZm9yIChjb25zdCBzdWJUeXBlIG9mIHVuaW9uVHlwZS50eXBlcykge1xuICAgICAgICAgIGlmIChjYW5kaWRhdGUgIT0gdHlwZUtpbmRPZihzdWJUeXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIEJ1aWx0aW5UeXBlLk90aGVyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNhbmRpZGF0ZSAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlLmZsYWdzICYgdHMuVHlwZUZsYWdzLlR5cGVQYXJhbWV0ZXIpIHtcbiAgICAgIHJldHVybiBCdWlsdGluVHlwZS5VbmJvdW5kO1xuICAgIH1cbiAgfVxuICByZXR1cm4gQnVpbHRpblR5cGUuT3RoZXI7XG59XG5cbmZ1bmN0aW9uIGdldEZyb21TeW1ib2xUYWJsZShzeW1ib2xUYWJsZTogdHMuU3ltYm9sVGFibGUsIGtleTogc3RyaW5nKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRhYmxlID0gc3ltYm9sVGFibGUgYXMgYW55O1xuICBsZXQgc3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuXG4gIGlmICh0eXBlb2YgdGFibGUuZ2V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVFMgMi4yIHVzZXMgYSBNYXBcbiAgICBzeW1ib2wgPSB0YWJsZS5nZXQoa2V5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUUyBwcmUtMi4yIHVzZXMgYW4gb2JqZWN0XG4gICAgc3ltYm9sID0gdGFibGVba2V5XTtcbiAgfVxuXG4gIHJldHVybiBzeW1ib2w7XG59XG4iXX0=