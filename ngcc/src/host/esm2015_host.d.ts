/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/host/esm2015_host" />
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../../src/ngtsc/file_system';
import { ClassDeclaration, ClassMember, ClassMemberKind, CtorParameter, Declaration, Decorator, TypeScriptReflectionHost } from '../../../src/ngtsc/reflection';
import { Logger } from '../logging/logger';
import { BundleProgram } from '../packages/bundle_program';
import { ModuleWithProvidersFunction, NgccClassSymbol, NgccReflectionHost, SwitchableVariableDeclaration } from './ngcc_host';
export declare const DECORATORS: ts.__String;
export declare const PROP_DECORATORS: ts.__String;
export declare const CONSTRUCTOR: ts.__String;
export declare const CONSTRUCTOR_PARAMS: ts.__String;
/**
 * Esm2015 packages contain ECMAScript 2015 classes, etc.
 * Decorators are defined via static properties on the class. For example:
 *
 * ```
 * class SomeDirective {
 * }
 * SomeDirective.decorators = [
 *   { type: Directive, args: [{ selector: '[someDirective]' },] }
 * ];
 * SomeDirective.ctorParameters = () => [
 *   { type: ViewContainerRef, },
 *   { type: TemplateRef, },
 *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
 * ];
 * SomeDirective.propDecorators = {
 *   "input1": [{ type: Input },],
 *   "input2": [{ type: Input },],
 * };
 * ```
 *
 * * Classes are decorated if they have a static property called `decorators`.
 * * Members are decorated if there is a matching key on a static property
 *   called `propDecorators`.
 * * Constructor parameters decorators are found on an object returned from
 *   a static method called `ctorParameters`.
 */
export declare class Esm2015ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
    protected logger: Logger;
    protected isCore: boolean;
    protected dtsDeclarationMap: Map<string, ts.Declaration> | null;
    /**
     * The set of source files that have already been preprocessed.
     */
    protected preprocessedSourceFiles: Set<ts.SourceFile>;
    /**
     * In ES2015, class declarations may have been down-leveled into variable declarations,
     * initialized using a class expression. In certain scenarios, an additional variable
     * is introduced that represents the class so that results in code such as:
     *
     * ```
     * let MyClass_1; let MyClass = MyClass_1 = class MyClass {};
     * ```
     *
     * This map tracks those aliased variables to their original identifier, i.e. the key
     * corresponds with the declaration of `MyClass_1` and its value becomes the `MyClass` identifier
     * of the variable declaration.
     *
     * This map is populated during the preprocessing of each source file.
     */
    protected aliasedClassDeclarations: Map<ts.Declaration, ts.Identifier>;
    /**
     * Caches the information of the decorators on a class, as the work involved with extracting
     * decorators is complex and frequently used.
     *
     * This map is lazily populated during the first call to `acquireDecoratorInfo` for a given class.
     */
    protected decoratorCache: Map<ClassDeclaration<ts.Declaration>, DecoratorInfo>;
    constructor(logger: Logger, isCore: boolean, checker: ts.TypeChecker, dts?: BundleProgram | null);
    /**
     * Find a symbol for a node that we think is a class.
     * Classes should have a `name` identifier, because they may need to be referenced in other parts
     * of the program.
     *
     * In ES2015, a class may be declared using a variable declaration of the following structure:
     *
     * ```
     * var MyClass = MyClass_1 = class MyClass {};
     * ```
     *
     * Here, the intermediate `MyClass_1` assignment is optional. In the above example, the
     * `class MyClass {}` node is returned as declaration of `MyClass`.
     *
     * @param declaration the declaration node whose symbol we are finding.
     * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
     */
    getClassSymbol(declaration: ts.Node): NgccClassSymbol | undefined;
    /**
     * In ES2015, a class may be declared using a variable declaration of the following structure:
     *
     * ```
     * var MyClass = MyClass_1 = class MyClass {};
     * ```
     *
     * This method extracts the `NgccClassSymbol` for `MyClass` when provided with the `var MyClass`
     * declaration node. When the `class MyClass {}` node or any other node is given, this method will
     * return undefined instead.
     *
     * @param declaration the declaration whose symbol we are finding.
     * @returns the symbol for the node or `undefined` if it does not represent an outer declaration
     * of a class.
     */
    protected getClassSymbolFromOuterDeclaration(declaration: ts.Node): NgccClassSymbol | undefined;
    /**
     * In ES2015, a class may be declared using a variable declaration of the following structure:
     *
     * ```
     * var MyClass = MyClass_1 = class MyClass {};
     * ```
     *
     * This method extracts the `NgccClassSymbol` for `MyClass` when provided with the
     * `class MyClass {}` declaration node. When the `var MyClass` node or any other node is given,
     * this method will return undefined instead.
     *
     * @param declaration the declaration whose symbol we are finding.
     * @returns the symbol for the node or `undefined` if it does not represent an inner declaration
     * of a class.
     */
    protected getClassSymbolFromInnerDeclaration(declaration: ts.Node): NgccClassSymbol | undefined;
    /**
     * Creates an `NgccClassSymbol` from an outer and inner declaration. If a class only has an outer
     * declaration, the "implementation" symbol of the created `NgccClassSymbol` will be set equal to
     * the "declaration" symbol.
     *
     * @param outerDeclaration The outer declaration node of the class.
     * @param innerDeclaration The inner declaration node of the class, or undefined if no inner
     * declaration is present.
     * @returns the `NgccClassSymbol` representing the class, or undefined if a `ts.Symbol` for any of
     * the declarations could not be resolved.
     */
    protected createClassSymbol(outerDeclaration: ClassDeclaration, innerDeclaration: ClassDeclaration | null): NgccClassSymbol | undefined;
    /**
     * Examine a declaration (for example, of a class or function) and return metadata about any
     * decorators present on the declaration.
     *
     * @param declaration a TypeScript `ts.Declaration` node representing the class or function over
     * which to reflect. For example, if the intent is to reflect the decorators of a class and the
     * source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the source is in ES5
     * format, this might be a `ts.VariableDeclaration` as classes in ES5 are represented as the
     * result of an IIFE execution.
     *
     * @returns an array of `Decorator` metadata if decorators are present on the declaration, or
     * `null` if either no decorators were present or if the declaration is not of a decoratable type.
     */
    getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[] | null;
    /**
     * Examine a declaration which should be of a class, and return metadata about the members of the
     * class.
     *
     * @param clazz a `ClassDeclaration` representing the class over which to reflect.
     *
     * @returns an array of `ClassMember` metadata representing the members of the class.
     *
     * @throws if `declaration` does not resolve to a class declaration.
     */
    getMembersOfClass(clazz: ClassDeclaration): ClassMember[];
    /**
     * Reflect over the constructor of a class and return metadata about its parameters.
     *
     * This method only looks at the constructor of a class directly and not at any inherited
     * constructors.
     *
     * @param clazz a `ClassDeclaration` representing the class over which to reflect.
     *
     * @returns an array of `Parameter` metadata representing the parameters of the constructor, if
     * a constructor exists. If the constructor exists and has 0 parameters, this array will be empty.
     * If the class has no constructor, this method returns `null`.
     *
     * @throws if `declaration` does not resolve to a class declaration.
     */
    getConstructorParameters(clazz: ClassDeclaration): CtorParameter[] | null;
    hasBaseClass(clazz: ClassDeclaration): boolean;
    getBaseClassExpression(clazz: ClassDeclaration): ts.Expression | null;
    /**
     * Check whether the given node actually represents a class.
     */
    isClass(node: ts.Node): node is ClassDeclaration;
    /**
     * Trace an identifier to its declaration, if possible.
     *
     * This method attempts to resolve the declaration of the given identifier, tracing back through
     * imports and re-exports until the original declaration statement is found. A `Declaration`
     * object is returned if the original declaration is found, or `null` is returned otherwise.
     *
     * In ES2015, we need to account for identifiers that refer to aliased class declarations such as
     * `MyClass_1`. Since such declarations are only available within the module itself, we need to
     * find the original class declaration, e.g. `MyClass`, that is associated with the aliased one.
     *
     * @param id a TypeScript `ts.Identifier` to trace back to a declaration.
     *
     * @returns metadata about the `Declaration` if the original declaration is found, or `null`
     * otherwise.
     */
    getDeclarationOfIdentifier(id: ts.Identifier): Declaration | null;
    /** Gets all decorators of the given class symbol. */
    getDecoratorsOfSymbol(symbol: NgccClassSymbol): Decorator[] | null;
    /**
     * Search the given module for variable declarations in which the initializer
     * is an identifier marked with the `PRE_R3_MARKER`.
     * @param module the module in which to search for switchable declarations.
     * @returns an array of variable declarations that match.
     */
    getSwitchableDeclarations(module: ts.Node): SwitchableVariableDeclaration[];
    getVariableValue(declaration: ts.VariableDeclaration): ts.Expression | null;
    /**
     * Find all top-level class symbols in the given file.
     * @param sourceFile The source file to search for classes.
     * @returns An array of class symbols.
     */
    findClassSymbols(sourceFile: ts.SourceFile): NgccClassSymbol[];
    /**
     * Get the number of generic type parameters of a given class.
     *
     * @param clazz a `ClassDeclaration` representing the class over which to reflect.
     *
     * @returns the number of type parameters of the class, if known, or `null` if the declaration
     * is not a class or has an unknown number of type parameters.
     */
    getGenericArityOfClass(clazz: ClassDeclaration): number | null;
    /**
     * Take an exported declaration of a class (maybe down-leveled to a variable) and look up the
     * declaration of its type in a separate .d.ts tree.
     *
     * This function is allowed to return `null` if the current compilation unit does not have a
     * separate .d.ts tree. When compiling TypeScript code this is always the case, since .d.ts files
     * are produced only during the emit of such a compilation. When compiling .js code, however,
     * there is frequently a parallel .d.ts tree which this method exposes.
     *
     * Note that the `ts.ClassDeclaration` returned from this function may not be from the same
     * `ts.Program` as the input declaration.
     */
    getDtsDeclaration(declaration: ts.Declaration): ts.Declaration | null;
    /**
     * Search the given source file for exported functions and static class methods that return
     * ModuleWithProviders objects.
     * @param f The source file to search for these functions
     * @returns An array of function declarations that look like they return ModuleWithProviders
     * objects.
     */
    getModuleWithProvidersFunctions(f: ts.SourceFile): ModuleWithProvidersFunction[];
    /**
     * Finds the identifier of the actual class declaration for a potentially aliased declaration of a
     * class.
     *
     * If the given declaration is for an alias of a class, this function will determine an identifier
     * to the original declaration that represents this class.
     *
     * @param declaration The declaration to resolve.
     * @returns The original identifier that the given class declaration resolves to, or `undefined`
     * if the declaration does not represent an aliased class.
     */
    protected resolveAliasedClassIdentifier(declaration: ts.Declaration): ts.Identifier | null;
    /**
     * Ensures that the source file that `node` is part of has been preprocessed.
     *
     * During preprocessing, all statements in the source file will be visited such that certain
     * processing steps can be done up-front and cached for subsequent usages.
     *
     * @param sourceFile The source file that needs to have gone through preprocessing.
     */
    protected ensurePreprocessed(sourceFile: ts.SourceFile): void;
    /**
     * Analyzes the given statement to see if it corresponds with a variable declaration like
     * `let MyClass = MyClass_1 = class MyClass {};`. If so, the declaration of `MyClass_1`
     * is associated with the `MyClass` identifier.
     *
     * @param statement The statement that needs to be preprocessed.
     */
    protected preprocessStatement(statement: ts.Statement): void;
    /** Get the top level statements for a module.
     *
     * In ES5 and ES2015 this is just the top level statements of the file.
     * @param sourceFile The module whose statements we want.
     * @returns An array of top level statements for the given module.
     */
    protected getModuleStatements(sourceFile: ts.SourceFile): ts.Statement[];
    /**
     * Walk the AST looking for an assignment to the specified symbol.
     * @param node The current node we are searching.
     * @returns an expression that represents the value of the variable, or undefined if none can be
     * found.
     */
    protected findDecoratedVariableValue(node: ts.Node | undefined, symbol: ts.Symbol): ts.CallExpression | null;
    /**
     * Try to retrieve the symbol of a static property on a class.
     * @param symbol the class whose property we are interested in.
     * @param propertyName the name of static property.
     * @returns the symbol if it is found or `undefined` if not.
     */
    protected getStaticProperty(symbol: NgccClassSymbol, propertyName: ts.__String): ts.Symbol | undefined;
    /**
     * This is the main entry-point for obtaining information on the decorators of a given class. This
     * information is computed either from static properties if present, or using `tslib.__decorate`
     * helper calls otherwise. The computed result is cached per class.
     *
     * @param classSymbol the class for which decorators should be acquired.
     * @returns all information of the decorators on the class.
     */
    protected acquireDecoratorInfo(classSymbol: NgccClassSymbol): DecoratorInfo;
    /**
     * Attempts to compute decorator information from static properties "decorators", "propDecorators"
     * and "ctorParameters" on the class. If neither of these static properties is present the
     * library is likely not compiled using tsickle for usage with Closure compiler, in which case
     * `null` is returned.
     *
     * @param classSymbol The class symbol to compute the decorators information for.
     * @returns All information on the decorators as extracted from static properties, or `null` if
     * none of the static properties exist.
     */
    protected computeDecoratorInfoFromStaticProperties(classSymbol: NgccClassSymbol): DecoratorInfo | null;
    /**
     * Get all class decorators for the given class, where the decorators are declared
     * via a static property. For example:
     *
     * ```
     * class SomeDirective {}
     * SomeDirective.decorators = [
     *   { type: Directive, args: [{ selector: '[someDirective]' },] }
     * ];
     * ```
     *
     * @param decoratorsSymbol the property containing the decorators we want to get.
     * @returns an array of decorators or null if none where found.
     */
    protected getClassDecoratorsFromStaticProperty(decoratorsSymbol: ts.Symbol): Decorator[] | null;
    /**
     * Examine a symbol which should be of a class, and return metadata about its members.
     *
     * @param symbol the `ClassSymbol` representing the class over which to reflect.
     * @returns an array of `ClassMember` metadata representing the members of the class.
     */
    protected getMembersOfSymbol(symbol: NgccClassSymbol): ClassMember[];
    /**
     * Member decorators may be declared as static properties of the class:
     *
     * ```
     * SomeDirective.propDecorators = {
     *   "ngForOf": [{ type: Input },],
     *   "ngForTrackBy": [{ type: Input },],
     *   "ngForTemplate": [{ type: Input },],
     * };
     * ```
     *
     * @param decoratorsProperty the class whose member decorators we are interested in.
     * @returns a map whose keys are the name of the members and whose values are collections of
     * decorators for the given member.
     */
    protected getMemberDecoratorsFromStaticProperty(decoratorsProperty: ts.Symbol): Map<string, Decorator[]>;
    /**
     * For a given class symbol, collects all decorator information from tslib helper methods, as
     * generated by TypeScript into emitted JavaScript files.
     *
     * Class decorators are extracted from calls to `tslib.__decorate` that look as follows:
     *
     * ```
     * let SomeDirective = class SomeDirective {}
     * SomeDirective = __decorate([
     *   Directive({ selector: '[someDirective]' }),
     * ], SomeDirective);
     * ```
     *
     * The extraction of member decorators is similar, with the distinction that its 2nd and 3rd
     * argument correspond with a "prototype" target and the name of the member to which the
     * decorators apply.
     *
     * ```
     * __decorate([
     *     Input(),
     *     __metadata("design:type", String)
     * ], SomeDirective.prototype, "input1", void 0);
     * ```
     *
     * @param classSymbol The class symbol for which decorators should be extracted.
     * @returns All information on the decorators of the class.
     */
    protected computeDecoratorInfoFromHelperCalls(classSymbol: NgccClassSymbol): DecoratorInfo;
    /**
     * Extract the details of an entry within a `__decorate` helper call. For example, given the
     * following code:
     *
     * ```
     * __decorate([
     *   Directive({ selector: '[someDirective]' }),
     *   tslib_1.__param(2, Inject(INJECTED_TOKEN)),
     *   tslib_1.__metadata("design:paramtypes", [ViewContainerRef, TemplateRef, String])
     * ], SomeDirective);
     * ```
     *
     * it can be seen that there are calls to regular decorators (the `Directive`) and calls into
     * `tslib` functions which have been inserted by TypeScript. Therefore, this function classifies
     * a call to correspond with
     *   1. a real decorator like `Directive` above, or
     *   2. a decorated parameter, corresponding with `__param` calls from `tslib`, or
     *   3. the type information of parameters, corresponding with `__metadata` call from `tslib`
     *
     * @param expression the expression that needs to be reflected into a `DecorateHelperEntry`
     * @returns an object that indicates which of the three categories the call represents, together
     * with the reflected information of the call, or null if the call is not a valid decorate call.
     */
    protected reflectDecorateHelperEntry(expression: ts.Expression): DecorateHelperEntry | null;
    protected reflectDecoratorCall(call: ts.CallExpression): Decorator | null;
    /**
     * Check the given statement to see if it is a call to the specified helper function or null if
     * not found.
     *
     * Matching statements will look like:  `tslib_1.__decorate(...);`.
     * @param statement the statement that may contain the call.
     * @param helperName the name of the helper we are looking for.
     * @returns the node that corresponds to the `__decorate(...)` call or null if the statement
     * does not match.
     */
    protected getHelperCall(statement: ts.Statement, helperName: string): ts.CallExpression | null;
    /**
     * Reflect over the given array node and extract decorator information from each element.
     *
     * This is used for decorators that are defined in static properties. For example:
     *
     * ```
     * SomeDirective.decorators = [
     *   { type: Directive, args: [{ selector: '[someDirective]' },] }
     * ];
     * ```
     *
     * @param decoratorsArray an expression that contains decorator information.
     * @returns an array of decorator info that was reflected from the array node.
     */
    protected reflectDecorators(decoratorsArray: ts.Expression): Decorator[];
    /**
     * Reflect over a symbol and extract the member information, combining it with the
     * provided decorator information, and whether it is a static member.
     *
     * A single symbol may represent multiple class members in the case of accessors;
     * an equally named getter/setter accessor pair is combined into a single symbol.
     * When the symbol is recognized as representing an accessor, its declarations are
     * analyzed such that both the setter and getter accessor are returned as separate
     * class members.
     *
     * One difference wrt the TypeScript host is that in ES2015, we cannot see which
     * accessor originally had any decorators applied to them, as decorators are applied
     * to the property descriptor in general, not a specific accessor. If an accessor
     * has both a setter and getter, any decorators are only attached to the setter member.
     *
     * @param symbol the symbol for the member to reflect over.
     * @param decorators an array of decorators associated with the member.
     * @param isStatic true if this member is static, false if it is an instance property.
     * @returns the reflected member information, or null if the symbol is not a member.
     */
    protected reflectMembers(symbol: ts.Symbol, decorators?: Decorator[], isStatic?: boolean): ClassMember[] | null;
    /**
     * Reflect over a symbol and extract the member information, combining it with the
     * provided decorator information, and whether it is a static member.
     * @param node the declaration node for the member to reflect over.
     * @param kind the assumed kind of the member, may become more accurate during reflection.
     * @param decorators an array of decorators associated with the member.
     * @param isStatic true if this member is static, false if it is an instance property.
     * @returns the reflected member information, or null if the symbol is not a member.
     */
    protected reflectMember(node: ts.Declaration, kind: ClassMemberKind | null, decorators?: Decorator[], isStatic?: boolean): ClassMember | null;
    /**
     * Find the declarations of the constructor parameters of a class identified by its symbol.
     * @param classSymbol the class whose parameters we want to find.
     * @returns an array of `ts.ParameterDeclaration` objects representing each of the parameters in
     * the class's constructor or null if there is no constructor.
     */
    protected getConstructorParameterDeclarations(classSymbol: NgccClassSymbol): ts.ParameterDeclaration[] | null;
    /**
     * Get the parameter decorators of a class constructor.
     *
     * @param classSymbol the class whose parameter info we want to get.
     * @param parameterNodes the array of TypeScript parameter nodes for this class's constructor.
     * @returns an array of constructor parameter info objects.
     */
    protected getConstructorParamInfo(classSymbol: NgccClassSymbol, parameterNodes: ts.ParameterDeclaration[]): CtorParameter[];
    /**
     * Get the parameter type and decorators for the constructor of a class,
     * where the information is stored on a static property of the class.
     *
     * Note that in ESM2015, the property is defined an array, or by an arrow function that returns an
     * array, of decorator and type information.
     *
     * For example,
     *
     * ```
     * SomeDirective.ctorParameters = () => [
     *   {type: ViewContainerRef},
     *   {type: TemplateRef},
     *   {type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN]}]},
     * ];
     * ```
     *
     * or
     *
     * ```
     * SomeDirective.ctorParameters = [
     *   {type: ViewContainerRef},
     *   {type: TemplateRef},
     *   {type: undefined, decorators: [{type: Inject, args: [INJECTED_TOKEN]}]},
     * ];
     * ```
     *
     * @param paramDecoratorsProperty the property that holds the parameter info we want to get.
     * @returns an array of objects containing the type and decorators for each parameter.
     */
    protected getParamInfoFromStaticProperty(paramDecoratorsProperty: ts.Symbol): ParamInfo[] | null;
    /**
     * Search statements related to the given class for calls to the specified helper.
     * @param classSymbol the class whose helper calls we are interested in.
     * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested
     * in.
     * @returns an array of CallExpression nodes for each matching helper call.
     */
    protected getHelperCallsForClass(classSymbol: NgccClassSymbol, helperName: string): ts.CallExpression[];
    /**
     * Find statements related to the given class that may contain calls to a helper.
     *
     * In ESM2015 code the helper calls are in the top level module, so we have to consider
     * all the statements in the module.
     *
     * @param classSymbol the class whose helper calls we are interested in.
     * @returns an array of statements that may contain helper calls.
     */
    protected getStatementsForClass(classSymbol: NgccClassSymbol): ts.Statement[];
    /**
     * Test whether a decorator was imported from `@angular/core`.
     *
     * Is the decorator:
     * * externally imported from `@angular/core`?
     * * the current hosted program is actually `@angular/core` and
     *   - relatively internally imported; or
     *   - not imported, from the current file.
     *
     * @param decorator the decorator to test.
     */
    protected isFromCore(decorator: Decorator): boolean;
    /**
     * Extract all the class declarations from the dtsTypings program, storing them in a map
     * where the key is the declared name of the class and the value is the declaration itself.
     *
     * It is possible for there to be multiple class declarations with the same local name.
     * Only the first declaration with a given name is added to the map; subsequent classes will be
     * ignored.
     *
     * We are most interested in classes that are publicly exported from the entry point, so these
     * are added to the map first, to ensure that they are not ignored.
     *
     * @param dtsRootFileName The filename of the entry-point to the `dtsTypings` program.
     * @param dtsProgram The program containing all the typings files.
     * @returns a map of class names to class declarations.
     */
    protected computeDtsDeclarationMap(dtsRootFileName: AbsoluteFsPath, dtsProgram: ts.Program, dtsPackage: AbsoluteFsPath): Map<string, ts.Declaration>;
    /**
     * Parse a function/method node (or its implementation), to see if it returns a
     * `ModuleWithProviders` object.
     * @param name The name of the function.
     * @param node the node to check - this could be a function, a method or a variable declaration.
     * @param implementation the actual function expression if `node` is a variable declaration.
     * @param container the class that contains the function, if it is a method.
     * @returns info about the function if it does return a `ModuleWithProviders` object; `null`
     * otherwise.
     */
    protected parseForModuleWithProviders(name: string, node: ts.Node | null, implementation?: ts.Node | null, container?: ts.Declaration | null): ModuleWithProvidersFunction | null;
    protected getDeclarationOfExpression(expression: ts.Expression): Declaration | null;
}
export declare type ParamInfo = {
    decorators: Decorator[] | null;
    typeExpression: ts.Expression | null;
};
/**
 * Represents a call to `tslib.__metadata` as present in `tslib.__decorate` calls. This is a
 * synthetic decorator inserted by TypeScript that contains reflection information about the
 * target of the decorator, i.e. the class or property.
 */
export interface ParameterTypes {
    type: 'params';
    types: ts.Expression[];
}
/**
 * Represents a call to `tslib.__param` as present in `tslib.__decorate` calls. This contains
 * information on any decorators were applied to a certain parameter.
 */
export interface ParameterDecorators {
    type: 'param:decorators';
    index: number;
    decorator: Decorator;
}
/**
 * Represents a call to a decorator as it was present in the original source code, as present in
 * `tslib.__decorate` calls.
 */
export interface DecoratorCall {
    type: 'decorator';
    decorator: Decorator;
}
/**
 * Represents the different kinds of decorate helpers that may be present as first argument to
 * `tslib.__decorate`, as follows:
 *
 * ```
 * __decorate([
 *   Directive({ selector: '[someDirective]' }),
 *   tslib_1.__param(2, Inject(INJECTED_TOKEN)),
 *   tslib_1.__metadata("design:paramtypes", [ViewContainerRef, TemplateRef, String])
 * ], SomeDirective);
 * ```
 */
export declare type DecorateHelperEntry = ParameterTypes | ParameterDecorators | DecoratorCall;
/**
 * The recorded decorator information of a single class. This information is cached in the host.
 */
interface DecoratorInfo {
    /**
     * All decorators that were present on the class. If no decorators were present, this is `null`
     */
    classDecorators: Decorator[] | null;
    /**
     * All decorators per member of the class they were present on.
     */
    memberDecorators: Map<string, Decorator[]>;
    /**
     * Represents the constructor parameter information, such as the type of a parameter and all
     * decorators for a certain parameter. Indices in this array correspond with the parameter's index
     * in the constructor. Note that this array may be sparse, i.e. certain constructor parameters may
     * not have any info recorded.
     */
    constructorParamInfo: ParamInfo[];
}
/**
 * A statement node that represents an assignment.
 */
export declare type AssignmentStatement = ts.ExpressionStatement & {
    expression: {
        left: ts.Identifier;
        right: ts.Expression;
    };
};
/**
 * Test whether a statement node is an assignment statement.
 * @param statement the statement to test.
 */
export declare function isAssignmentStatement(statement: ts.Statement): statement is AssignmentStatement;
export declare function isAssignment(node: ts.Node): node is ts.AssignmentExpression<ts.EqualsToken>;
/**
 * Tests whether the provided call expression targets a class, by verifying its arguments are
 * according to the following form:
 *
 * ```
 * __decorate([], SomeDirective);
 * ```
 *
 * @param call the call expression that is tested to represent a class decorator call.
 * @param className the name of the class that the call needs to correspond with.
 */
export declare function isClassDecorateCall(call: ts.CallExpression, className: string): call is ts.CallExpression & {
    arguments: [ts.ArrayLiteralExpression, ts.Expression];
};
/**
 * Tests whether the provided call expression targets a member of the class, by verifying its
 * arguments are according to the following form:
 *
 * ```
 * __decorate([], SomeDirective.prototype, "member", void 0);
 * ```
 *
 * @param call the call expression that is tested to represent a member decorator call.
 * @param className the name of the class that the call needs to correspond with.
 */
export declare function isMemberDecorateCall(call: ts.CallExpression, className: string): call is ts.CallExpression & {
    arguments: [ts.ArrayLiteralExpression, ts.StringLiteral, ts.StringLiteral];
};
/**
 * Helper method to extract the value of a property given the property's "symbol",
 * which is actually the symbol of the identifier of the property.
 */
export declare function getPropertyValueFromSymbol(propSymbol: ts.Symbol): ts.Expression | undefined;
export {};
