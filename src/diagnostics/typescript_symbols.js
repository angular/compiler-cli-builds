"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const symbols_1 = require("./symbols");
const typescript_version_1 = require("./typescript_version");
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
function findTsConfig(fileName) {
    let dir = path.dirname(fileName);
    while (fs.existsSync(dir)) {
        const candidate = path.join(dir, 'tsconfig.json');
        if (fs.existsSync(candidate))
            return candidate;
        const parentDir = path.dirname(dir);
        if (parentDir === dir)
            break;
        dir = parentDir;
    }
}
function isBindingPattern(node) {
    return !!node && (node.kind === ts.SyntaxKind.ArrayBindingPattern ||
        node.kind === ts.SyntaxKind.ObjectBindingPattern);
}
function walkUpBindingElementsAndPatterns(node) {
    while (node && (node.kind === ts.SyntaxKind.BindingElement || isBindingPattern(node))) {
        node = node.parent;
    }
    return node;
}
function getCombinedNodeFlags(node) {
    node = walkUpBindingElementsAndPatterns(node);
    let flags = node.flags;
    if (node.kind === ts.SyntaxKind.VariableDeclaration) {
        node = node.parent;
    }
    if (node && node.kind === ts.SyntaxKind.VariableDeclarationList) {
        flags |= node.flags;
        node = node.parent;
    }
    if (node && node.kind === ts.SyntaxKind.VariableStatement) {
        flags |= node.flags;
    }
    return flags;
}
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
            const numeric = { kind: ts.SyntaxKind.NumericLiteral };
            setParents({ kind: ts.SyntaxKind.ExpressionStatement, expression: numeric }, node);
            type = checker.getTypeAtLocation(numeric);
            break;
        case symbols_1.BuiltinType.String:
            type = checker.getTypeAtLocation(setParents({ kind: ts.SyntaxKind.NoSubstitutionTemplateLiteral }, node));
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
function spanOf(node) {
    return { start: node.getStart(), end: node.getEnd() };
}
function shrink(span, offset) {
    if (offset == null)
        offset = 1;
    return { start: span.start + offset, end: span.end - offset };
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
//# sourceMappingURL=typescript_symbols.js.map