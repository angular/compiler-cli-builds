/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ErrorCode, FatalDiagnosticError } from '../../diagnostics';
import { PerfEvent } from '../../perf';
import { getSourceFile, isExported } from '../../util/src/typescript';
import { CompilationMode, HandlerPrecedence } from './api';
import { Trait, TraitState } from './trait';
/**
 * The heart of Angular compilation.
 *
 * The `TraitCompiler` is responsible for processing all classes in the program. Any time a
 * `DecoratorHandler` matches a class, a "trait" is created to represent that Angular aspect of the
 * class (such as the class having a component definition).
 *
 * The `TraitCompiler` transitions each trait through the various phases of compilation, culminating
 * in the production of `CompileResult`s instructing the compiler to apply various mutations to the
 * class (like adding fields or type declarations).
 */
export class TraitCompiler {
    constructor(handlers, reflector, perf, incrementalBuild, compileNonExportedClasses, compilationMode, dtsTransforms, semanticDepGraphUpdater) {
        this.handlers = handlers;
        this.reflector = reflector;
        this.perf = perf;
        this.incrementalBuild = incrementalBuild;
        this.compileNonExportedClasses = compileNonExportedClasses;
        this.compilationMode = compilationMode;
        this.dtsTransforms = dtsTransforms;
        this.semanticDepGraphUpdater = semanticDepGraphUpdater;
        /**
         * Maps class declarations to their `ClassRecord`, which tracks the Ivy traits being applied to
         * those classes.
         */
        this.classes = new Map();
        /**
         * Maps source files to any class declaration(s) within them which have been discovered to contain
         * Ivy traits.
         */
        this.fileToClasses = new Map();
        this.reexportMap = new Map();
        this.handlersByName = new Map();
        for (const handler of handlers) {
            this.handlersByName.set(handler.name, handler);
        }
    }
    analyzeSync(sf) {
        this.analyze(sf, false);
    }
    analyzeAsync(sf) {
        return this.analyze(sf, true);
    }
    analyze(sf, preanalyze) {
        // We shouldn't analyze declaration files.
        if (sf.isDeclarationFile) {
            return undefined;
        }
        // analyze() really wants to return `Promise<void>|void`, but TypeScript cannot narrow a return
        // type of 'void', so `undefined` is used instead.
        const promises = [];
        const priorWork = this.incrementalBuild.priorAnalysisFor(sf);
        if (priorWork !== null) {
            for (const priorRecord of priorWork) {
                this.adopt(priorRecord);
            }
            this.perf.eventCount(PerfEvent.SourceFileReuseAnalysis);
            this.perf.eventCount(PerfEvent.TraitReuseAnalysis, priorWork.length);
            // Skip the rest of analysis, as this file's prior traits are being reused.
            return;
        }
        const visit = (node) => {
            if (this.reflector.isClass(node)) {
                this.analyzeClass(node, preanalyze ? promises : null);
            }
            ts.forEachChild(node, visit);
        };
        visit(sf);
        if (preanalyze && promises.length > 0) {
            return Promise.all(promises).then(() => undefined);
        }
        else {
            return undefined;
        }
    }
    recordFor(clazz) {
        if (this.classes.has(clazz)) {
            return this.classes.get(clazz);
        }
        else {
            return null;
        }
    }
    recordsFor(sf) {
        if (!this.fileToClasses.has(sf)) {
            return null;
        }
        const records = [];
        for (const clazz of this.fileToClasses.get(sf)) {
            records.push(this.classes.get(clazz));
        }
        return records;
    }
    /**
     * Import a `ClassRecord` from a previous compilation.
     *
     * Traits from the `ClassRecord` have accurate metadata, but the `handler` is from the old program
     * and needs to be updated (matching is done by name). A new pending trait is created and then
     * transitioned to analyzed using the previous analysis. If the trait is in the errored state,
     * instead the errors are copied over.
     */
    adopt(priorRecord) {
        const record = {
            hasPrimaryHandler: priorRecord.hasPrimaryHandler,
            hasWeakHandlers: priorRecord.hasWeakHandlers,
            metaDiagnostics: priorRecord.metaDiagnostics,
            node: priorRecord.node,
            traits: [],
        };
        for (const priorTrait of priorRecord.traits) {
            const handler = this.handlersByName.get(priorTrait.handler.name);
            let trait = Trait.pending(handler, priorTrait.detected);
            if (priorTrait.state === TraitState.Analyzed || priorTrait.state === TraitState.Resolved) {
                const symbol = this.makeSymbolForTrait(handler, record.node, priorTrait.analysis);
                trait = trait.toAnalyzed(priorTrait.analysis, priorTrait.analysisDiagnostics, symbol);
                if (trait.analysis !== null && trait.handler.register !== undefined) {
                    trait.handler.register(record.node, trait.analysis);
                }
            }
            else if (priorTrait.state === TraitState.Skipped) {
                trait = trait.toSkipped();
            }
            record.traits.push(trait);
        }
        this.classes.set(record.node, record);
        const sf = record.node.getSourceFile();
        if (!this.fileToClasses.has(sf)) {
            this.fileToClasses.set(sf, new Set());
        }
        this.fileToClasses.get(sf).add(record.node);
    }
    scanClassForTraits(clazz) {
        if (!this.compileNonExportedClasses && !isExported(clazz)) {
            return null;
        }
        const decorators = this.reflector.getDecoratorsOfDeclaration(clazz);
        return this.detectTraits(clazz, decorators);
    }
    detectTraits(clazz, decorators) {
        let record = this.recordFor(clazz);
        let foundTraits = [];
        for (const handler of this.handlers) {
            const result = handler.detect(clazz, decorators);
            if (result === undefined) {
                continue;
            }
            const isPrimaryHandler = handler.precedence === HandlerPrecedence.PRIMARY;
            const isWeakHandler = handler.precedence === HandlerPrecedence.WEAK;
            const trait = Trait.pending(handler, result);
            foundTraits.push(trait);
            if (record === null) {
                // This is the first handler to match this class. This path is a fast path through which
                // most classes will flow.
                record = {
                    node: clazz,
                    traits: [trait],
                    metaDiagnostics: null,
                    hasPrimaryHandler: isPrimaryHandler,
                    hasWeakHandlers: isWeakHandler,
                };
                this.classes.set(clazz, record);
                const sf = clazz.getSourceFile();
                if (!this.fileToClasses.has(sf)) {
                    this.fileToClasses.set(sf, new Set());
                }
                this.fileToClasses.get(sf).add(clazz);
            }
            else {
                // This is at least the second handler to match this class. This is a slower path that some
                // classes will go through, which validates that the set of decorators applied to the class
                // is valid.
                // Validate according to rules as follows:
                //
                // * WEAK handlers are removed if a non-WEAK handler matches.
                // * Only one PRIMARY handler can match at a time. Any other PRIMARY handler matching a
                //   class with an existing PRIMARY handler is an error.
                if (!isWeakHandler && record.hasWeakHandlers) {
                    // The current handler is not a WEAK handler, but the class has other WEAK handlers.
                    // Remove them.
                    record.traits =
                        record.traits.filter(field => field.handler.precedence !== HandlerPrecedence.WEAK);
                    record.hasWeakHandlers = false;
                }
                else if (isWeakHandler && !record.hasWeakHandlers) {
                    // The current handler is a WEAK handler, but the class has non-WEAK handlers already.
                    // Drop the current one.
                    continue;
                }
                if (isPrimaryHandler && record.hasPrimaryHandler) {
                    // The class already has a PRIMARY handler, and another one just matched.
                    record.metaDiagnostics = [{
                            category: ts.DiagnosticCategory.Error,
                            code: Number('-99' + ErrorCode.DECORATOR_COLLISION),
                            file: getSourceFile(clazz),
                            start: clazz.getStart(undefined, false),
                            length: clazz.getWidth(),
                            messageText: 'Two incompatible decorators on class',
                        }];
                    record.traits = foundTraits = [];
                    break;
                }
                // Otherwise, it's safe to accept the multiple decorators here. Update some of the metadata
                // regarding this class.
                record.traits.push(trait);
                record.hasPrimaryHandler = record.hasPrimaryHandler || isPrimaryHandler;
            }
        }
        return foundTraits.length > 0 ? foundTraits : null;
    }
    makeSymbolForTrait(handler, decl, analysis) {
        if (analysis === null) {
            return null;
        }
        const symbol = handler.symbol(decl, analysis);
        if (symbol !== null && this.semanticDepGraphUpdater !== null) {
            const isPrimary = handler.precedence === HandlerPrecedence.PRIMARY;
            if (!isPrimary) {
                throw new Error(`AssertionError: ${handler.name} returned a symbol but is not a primary handler.`);
            }
            this.semanticDepGraphUpdater.registerSymbol(symbol);
        }
        return symbol;
    }
    analyzeClass(clazz, preanalyzeQueue) {
        const traits = this.scanClassForTraits(clazz);
        if (traits === null) {
            // There are no Ivy traits on the class, so it can safely be skipped.
            return;
        }
        for (const trait of traits) {
            const analyze = () => this.analyzeTrait(clazz, trait);
            let preanalysis = null;
            if (preanalyzeQueue !== null && trait.handler.preanalyze !== undefined) {
                // Attempt to run preanalysis. This could fail with a `FatalDiagnosticError`; catch it if it
                // does.
                try {
                    preanalysis = trait.handler.preanalyze(clazz, trait.detected.metadata) || null;
                }
                catch (err) {
                    if (err instanceof FatalDiagnosticError) {
                        trait.toAnalyzed(null, [err.toDiagnostic()], null);
                        return;
                    }
                    else {
                        throw err;
                    }
                }
            }
            if (preanalysis !== null) {
                preanalyzeQueue.push(preanalysis.then(analyze));
            }
            else {
                analyze();
            }
        }
    }
    analyzeTrait(clazz, trait, flags) {
        var _a, _b, _c;
        if (trait.state !== TraitState.Pending) {
            throw new Error(`Attempt to analyze trait of ${clazz.name.text} in state ${TraitState[trait.state]} (expected DETECTED)`);
        }
        this.perf.eventCount(PerfEvent.TraitAnalyze);
        // Attempt analysis. This could fail with a `FatalDiagnosticError`; catch it if it does.
        let result;
        try {
            result = trait.handler.analyze(clazz, trait.detected.metadata, flags);
        }
        catch (err) {
            if (err instanceof FatalDiagnosticError) {
                trait.toAnalyzed(null, [err.toDiagnostic()], null);
                return;
            }
            else {
                throw err;
            }
        }
        const symbol = this.makeSymbolForTrait(trait.handler, clazz, (_a = result.analysis) !== null && _a !== void 0 ? _a : null);
        if (result.analysis !== undefined && trait.handler.register !== undefined) {
            trait.handler.register(clazz, result.analysis);
        }
        trait = trait.toAnalyzed((_b = result.analysis) !== null && _b !== void 0 ? _b : null, (_c = result.diagnostics) !== null && _c !== void 0 ? _c : null, symbol);
    }
    resolve() {
        var _a, _b;
        const classes = Array.from(this.classes.keys());
        for (const clazz of classes) {
            const record = this.classes.get(clazz);
            for (let trait of record.traits) {
                const handler = trait.handler;
                switch (trait.state) {
                    case TraitState.Skipped:
                        continue;
                    case TraitState.Pending:
                        throw new Error(`Resolving a trait that hasn't been analyzed: ${clazz.name.text} / ${Object.getPrototypeOf(trait.handler).constructor.name}`);
                    case TraitState.Resolved:
                        throw new Error(`Resolving an already resolved trait`);
                }
                if (trait.analysis === null) {
                    // No analysis results, cannot further process this trait.
                    continue;
                }
                if (handler.resolve === undefined) {
                    // No resolution of this trait needed - it's considered successful by default.
                    trait = trait.toResolved(null, null);
                    continue;
                }
                let result;
                try {
                    result = handler.resolve(clazz, trait.analysis, trait.symbol);
                }
                catch (err) {
                    if (err instanceof FatalDiagnosticError) {
                        trait = trait.toResolved(null, [err.toDiagnostic()]);
                        continue;
                    }
                    else {
                        throw err;
                    }
                }
                trait = trait.toResolved((_a = result.data) !== null && _a !== void 0 ? _a : null, (_b = result.diagnostics) !== null && _b !== void 0 ? _b : null);
                if (result.reexports !== undefined) {
                    const fileName = clazz.getSourceFile().fileName;
                    if (!this.reexportMap.has(fileName)) {
                        this.reexportMap.set(fileName, new Map());
                    }
                    const fileReexports = this.reexportMap.get(fileName);
                    for (const reexport of result.reexports) {
                        fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                    }
                }
            }
        }
    }
    /**
     * Generate type-checking code into the `TypeCheckContext` for any components within the given
     * `ts.SourceFile`.
     */
    typeCheck(sf, ctx) {
        if (!this.fileToClasses.has(sf)) {
            return;
        }
        for (const clazz of this.fileToClasses.get(sf)) {
            const record = this.classes.get(clazz);
            for (const trait of record.traits) {
                if (trait.state !== TraitState.Resolved) {
                    continue;
                }
                else if (trait.handler.typeCheck === undefined) {
                    continue;
                }
                if (trait.resolution !== null) {
                    trait.handler.typeCheck(ctx, clazz, trait.analysis, trait.resolution);
                }
            }
        }
    }
    index(ctx) {
        for (const clazz of this.classes.keys()) {
            const record = this.classes.get(clazz);
            for (const trait of record.traits) {
                if (trait.state !== TraitState.Resolved) {
                    // Skip traits that haven't been resolved successfully.
                    continue;
                }
                else if (trait.handler.index === undefined) {
                    // Skip traits that don't affect indexing.
                    continue;
                }
                if (trait.resolution !== null) {
                    trait.handler.index(ctx, clazz, trait.analysis, trait.resolution);
                }
            }
        }
    }
    updateResources(clazz) {
        if (!this.reflector.isClass(clazz) || !this.classes.has(clazz)) {
            return;
        }
        const record = this.classes.get(clazz);
        for (const trait of record.traits) {
            if (trait.state !== TraitState.Resolved || trait.handler.updateResources === undefined) {
                continue;
            }
            trait.handler.updateResources(clazz, trait.analysis, trait.resolution);
        }
    }
    compile(clazz, constantPool) {
        const original = ts.getOriginalNode(clazz);
        if (!this.reflector.isClass(clazz) || !this.reflector.isClass(original) ||
            !this.classes.has(original)) {
            return null;
        }
        const record = this.classes.get(original);
        let res = [];
        for (const trait of record.traits) {
            if (trait.state !== TraitState.Resolved || trait.analysisDiagnostics !== null ||
                trait.resolveDiagnostics !== null) {
                // Cannot compile a trait that is not resolved, or had any errors in its declaration.
                continue;
            }
            // `trait.resolution` is non-null asserted here because TypeScript does not recognize that
            // `Readonly<unknown>` is nullable (as `unknown` itself is nullable) due to the way that
            // `Readonly` works.
            let compileRes;
            if (this.compilationMode === CompilationMode.PARTIAL &&
                trait.handler.compilePartial !== undefined) {
                compileRes = trait.handler.compilePartial(clazz, trait.analysis, trait.resolution);
            }
            else {
                compileRes =
                    trait.handler.compileFull(clazz, trait.analysis, trait.resolution, constantPool);
            }
            const compileMatchRes = compileRes;
            if (Array.isArray(compileMatchRes)) {
                for (const result of compileMatchRes) {
                    if (!res.some(r => r.name === result.name)) {
                        res.push(result);
                    }
                }
            }
            else if (!res.some(result => result.name === compileMatchRes.name)) {
                res.push(compileMatchRes);
            }
        }
        // Look up the .d.ts transformer for the input file and record that at least one field was
        // generated, which will allow the .d.ts to be transformed later.
        this.dtsTransforms.getIvyDeclarationTransform(original.getSourceFile())
            .addFields(original, res);
        // Return the instruction to the transformer so the fields will be added.
        return res.length > 0 ? res : null;
    }
    decoratorsFor(node) {
        const original = ts.getOriginalNode(node);
        if (!this.reflector.isClass(original) || !this.classes.has(original)) {
            return [];
        }
        const record = this.classes.get(original);
        const decorators = [];
        for (const trait of record.traits) {
            if (trait.state !== TraitState.Resolved) {
                continue;
            }
            if (trait.detected.trigger !== null && ts.isDecorator(trait.detected.trigger)) {
                decorators.push(trait.detected.trigger);
            }
        }
        return decorators;
    }
    get diagnostics() {
        const diagnostics = [];
        for (const clazz of this.classes.keys()) {
            const record = this.classes.get(clazz);
            if (record.metaDiagnostics !== null) {
                diagnostics.push(...record.metaDiagnostics);
            }
            for (const trait of record.traits) {
                if ((trait.state === TraitState.Analyzed || trait.state === TraitState.Resolved) &&
                    trait.analysisDiagnostics !== null) {
                    diagnostics.push(...trait.analysisDiagnostics);
                }
                if (trait.state === TraitState.Resolved && trait.resolveDiagnostics !== null) {
                    diagnostics.push(...trait.resolveDiagnostics);
                }
            }
        }
        return diagnostics;
    }
    get exportStatements() {
        return this.reexportMap;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFakMsT0FBTyxFQUFDLFNBQVMsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBSWxFLE9BQU8sRUFBQyxTQUFTLEVBQWUsTUFBTSxZQUFZLENBQUM7QUFHbkQsT0FBTyxFQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUVwRSxPQUFPLEVBQWlCLGVBQWUsRUFBaUQsaUJBQWlCLEVBQWdCLE1BQU0sT0FBTyxDQUFDO0FBRXZJLE9BQU8sRUFBZSxLQUFLLEVBQUUsVUFBVSxFQUFDLE1BQU0sU0FBUyxDQUFDO0FBcUN4RDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFrQnhCLFlBQ1ksUUFBNEUsRUFDNUUsU0FBeUIsRUFBVSxJQUFrQixFQUNyRCxnQkFBd0QsRUFDeEQseUJBQWtDLEVBQVUsZUFBZ0MsRUFDNUUsYUFBbUMsRUFDbkMsdUJBQXFEO1FBTHJELGFBQVEsR0FBUixRQUFRLENBQW9FO1FBQzVFLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBQVUsU0FBSSxHQUFKLElBQUksQ0FBYztRQUNyRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXdDO1FBQ3hELDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBUztRQUFVLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM1RSxrQkFBYSxHQUFiLGFBQWEsQ0FBc0I7UUFDbkMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUE4QjtRQXZCakU7OztXQUdHO1FBQ0ssWUFBTyxHQUFHLElBQUksR0FBRyxFQUFp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QUM7aUJBQy9DO2FBQ0Y7U0FDRjtRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNsQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDMUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGR9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge1NlbWFudGljRGVwR3JhcGhVcGRhdGVyLCBTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtQZXJmRXZlbnQsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uTm9kZSwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1Byb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZSwgaXNFeHBvcnRlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGF0aW9uTW9kZSwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNUcmFuc2Zvcm1SZWdpc3RyeX0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5pbXBvcnQge1BlbmRpbmdUcmFpdCwgVHJhaXQsIFRyYWl0U3RhdGV9IGZyb20gJy4vdHJhaXQnO1xuXG5cbi8qKlxuICogUmVjb3JkcyBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIGNsYXNzIHRoYXQgaGFzIG1hdGNoZWQgdHJhaXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzUmVjb3JkIHtcbiAgLyoqXG4gICAqIFRoZSBgQ2xhc3NEZWNsYXJhdGlvbmAgb2YgdGhlIGNsYXNzIHdoaWNoIGhhcyBBbmd1bGFyIHRyYWl0cyBhcHBsaWVkLlxuICAgKi9cbiAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjtcblxuICAvKipcbiAgICogQWxsIHRyYWl0cyB3aGljaCBtYXRjaGVkIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHRyYWl0czogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXTtcblxuICAvKipcbiAgICogTWV0YS1kaWFnbm9zdGljcyBhYm91dCB0aGUgY2xhc3MsIHdoaWNoIGFyZSB1c3VhbGx5IHJlbGF0ZWQgdG8gd2hldGhlciBjZXJ0YWluIGNvbWJpbmF0aW9ucyBvZlxuICAgKiBBbmd1bGFyIGRlY29yYXRvcnMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAqL1xuICBtZXRhRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsO1xuXG4gIC8vIFN1YnNlcXVlbnQgZmllbGRzIGFyZSBcImludGVybmFsXCIgYW5kIHVzZWQgZHVyaW5nIHRoZSBtYXRjaGluZyBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzLiBUaGlzIGlzXG4gIC8vIG11dGFibGUgc3RhdGUgZHVyaW5nIHRoZSBgZGV0ZWN0YC9gYW5hbHl6ZWAgcGhhc2VzIG9mIGNvbXBpbGF0aW9uLlxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIHRyYWl0cyBtYXRjaGVkIGZyb20gYERlY29yYXRvckhhbmRsZXJgcyBtYXJrZWQgYXMgYFdFQUtgLlxuICAgKi9cbiAgaGFzV2Vha0hhbmRsZXJzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIGEgdHJhaXQgZnJvbSBhIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVkIGFzIGBQUklNQVJZYC5cbiAgICovXG4gIGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiBBbmd1bGFyIGNvbXBpbGF0aW9uLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3NpbmcgYWxsIGNsYXNzZXMgaW4gdGhlIHByb2dyYW0uIEFueSB0aW1lIGFcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVzIGEgY2xhc3MsIGEgXCJ0cmFpdFwiIGlzIGNyZWF0ZWQgdG8gcmVwcmVzZW50IHRoYXQgQW5ndWxhciBhc3BlY3Qgb2YgdGhlXG4gKiBjbGFzcyAoc3VjaCBhcyB0aGUgY2xhc3MgaGF2aW5nIGEgY29tcG9uZW50IGRlZmluaXRpb24pLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgdHJhbnNpdGlvbnMgZWFjaCB0cmFpdCB0aHJvdWdoIHRoZSB2YXJpb3VzIHBoYXNlcyBvZiBjb21waWxhdGlvbiwgY3VsbWluYXRpbmdcbiAqIGluIHRoZSBwcm9kdWN0aW9uIG9mIGBDb21waWxlUmVzdWx0YHMgaW5zdHJ1Y3RpbmcgdGhlIGNvbXBpbGVyIHRvIGFwcGx5IHZhcmlvdXMgbXV0YXRpb25zIHRvIHRoZVxuICogY2xhc3MgKGxpa2UgYWRkaW5nIGZpZWxkcyBvciB0eXBlIGRlY2xhcmF0aW9ucykuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFpdENvbXBpbGVyIGltcGxlbWVudHMgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIge1xuICAvKipcbiAgICogTWFwcyBjbGFzcyBkZWNsYXJhdGlvbnMgdG8gdGhlaXIgYENsYXNzUmVjb3JkYCwgd2hpY2ggdHJhY2tzIHRoZSBJdnkgdHJhaXRzIGJlaW5nIGFwcGxpZWQgdG9cbiAgICogdGhvc2UgY2xhc3Nlcy5cbiAgICovXG4gIHByaXZhdGUgY2xhc3NlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NSZWNvcmQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcHMgc291cmNlIGZpbGVzIHRvIGFueSBjbGFzcyBkZWNsYXJhdGlvbihzKSB3aXRoaW4gdGhlbSB3aGljaCBoYXZlIGJlZW4gZGlzY292ZXJlZCB0byBjb250YWluXG4gICAqIEl2eSB0cmFpdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmlsZVRvQ2xhc3NlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgU2V0PENsYXNzRGVjbGFyYXRpb24+PigpO1xuXG4gIHByaXZhdGUgcmVleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+KCk7XG5cbiAgcHJpdmF0ZSBoYW5kbGVyc0J5TmFtZSA9XG4gICAgICBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPj4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSxcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBwZXJmOiBQZXJmUmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGluY3JlbWVudGFsQnVpbGQ6IEluY3JlbWVudGFsQnVpbGQ8Q2xhc3NSZWNvcmQsIHVua25vd24+LFxuICAgICAgcHJpdmF0ZSBjb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzOiBib29sZWFuLCBwcml2YXRlIGNvbXBpbGF0aW9uTW9kZTogQ29tcGlsYXRpb25Nb2RlLFxuICAgICAgcHJpdmF0ZSBkdHNUcmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1SZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyfG51bGwpIHtcbiAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaGFuZGxlcnMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnNCeU5hbWUuc2V0KGhhbmRsZXIubmFtZSwgaGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZVN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLmFuYWx5emUoc2YsIGZhbHNlKTtcbiAgfVxuXG4gIGFuYWx5emVBc3luYyhzZjogdHMuU291cmNlRmlsZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5hbmFseXplKHNmLCB0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogZmFsc2UpOiB2b2lkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IHRydWUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIC8vIFdlIHNob3VsZG4ndCBhbmFseXplIGRlY2xhcmF0aW9uIGZpbGVzLlxuICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBhbmFseXplKCkgcmVhbGx5IHdhbnRzIHRvIHJldHVybiBgUHJvbWlzZTx2b2lkPnx2b2lkYCwgYnV0IFR5cGVTY3JpcHQgY2Fubm90IG5hcnJvdyBhIHJldHVyblxuICAgIC8vIHR5cGUgb2YgJ3ZvaWQnLCBzbyBgdW5kZWZpbmVkYCBpcyB1c2VkIGluc3RlYWQuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgcHJpb3JXb3JrID0gdGhpcy5pbmNyZW1lbnRhbEJ1aWxkLnByaW9yQW5hbHlzaXNGb3Ioc2YpO1xuICAgIGlmIChwcmlvcldvcmsgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgcHJpb3JSZWNvcmQgb2YgcHJpb3JXb3JrKSB7XG4gICAgICAgIHRoaXMuYWRvcHQocHJpb3JSZWNvcmQpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuU291cmNlRmlsZVJldXNlQW5hbHlzaXMpO1xuICAgICAgdGhpcy5wZXJmLmV2ZW50Q291bnQoUGVyZkV2ZW50LlRyYWl0UmV1c2VBbmFseXNpcywgcHJpb3JXb3JrLmxlbmd0aCk7XG5cbiAgICAgIC8vIFNraXAgdGhlIHJlc3Qgb2YgYW5hbHlzaXMsIGFzIHRoaXMgZmlsZSdzIHByaW9yIHRyYWl0cyBhcmUgYmVpbmcgcmV1c2VkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIGlmICh0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG5vZGUpKSB7XG4gICAgICAgIHRoaXMuYW5hbHl6ZUNsYXNzKG5vZGUsIHByZWFuYWx5emUgPyBwcm9taXNlcyA6IG51bGwpO1xuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuXG4gICAgdmlzaXQoc2YpO1xuXG4gICAgaWYgKHByZWFuYWx5emUgJiYgcHJvbWlzZXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpID0+IHVuZGVmaW5lZCBhcyB2b2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZWNvcmRGb3IoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc1JlY29yZHxudWxsIHtcbiAgICBpZiAodGhpcy5jbGFzc2VzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZHNGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCByZWNvcmRzOiBDbGFzc1JlY29yZFtdID0gW107XG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEpIHtcbiAgICAgIHJlY29yZHMucHVzaCh0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSEpO1xuICAgIH1cbiAgICByZXR1cm4gcmVjb3JkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBvcnQgYSBgQ2xhc3NSZWNvcmRgIGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVHJhaXRzIGZyb20gdGhlIGBDbGFzc1JlY29yZGAgaGF2ZSBhY2N1cmF0ZSBtZXRhZGF0YSwgYnV0IHRoZSBgaGFuZGxlcmAgaXMgZnJvbSB0aGUgb2xkIHByb2dyYW1cbiAgICogYW5kIG5lZWRzIHRvIGJlIHVwZGF0ZWQgKG1hdGNoaW5nIGlzIGRvbmUgYnkgbmFtZSkuIEEgbmV3IHBlbmRpbmcgdHJhaXQgaXMgY3JlYXRlZCBhbmQgdGhlblxuICAgKiB0cmFuc2l0aW9uZWQgdG8gYW5hbHl6ZWQgdXNpbmcgdGhlIHByZXZpb3VzIGFuYWx5c2lzLiBJZiB0aGUgdHJhaXQgaXMgaW4gdGhlIGVycm9yZWQgc3RhdGUsXG4gICAqIGluc3RlYWQgdGhlIGVycm9ycyBhcmUgY29waWVkIG92ZXIuXG4gICAqL1xuICBwcml2YXRlIGFkb3B0KHByaW9yUmVjb3JkOiBDbGFzc1JlY29yZCk6IHZvaWQge1xuICAgIGNvbnN0IHJlY29yZDogQ2xhc3NSZWNvcmQgPSB7XG4gICAgICBoYXNQcmltYXJ5SGFuZGxlcjogcHJpb3JSZWNvcmQuaGFzUHJpbWFyeUhhbmRsZXIsXG4gICAgICBoYXNXZWFrSGFuZGxlcnM6IHByaW9yUmVjb3JkLmhhc1dlYWtIYW5kbGVycyxcbiAgICAgIG1ldGFEaWFnbm9zdGljczogcHJpb3JSZWNvcmQubWV0YURpYWdub3N0aWNzLFxuICAgICAgbm9kZTogcHJpb3JSZWNvcmQubm9kZSxcbiAgICAgIHRyYWl0czogW10sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgcHJpb3JUcmFpdCBvZiBwcmlvclJlY29yZC50cmFpdHMpIHtcbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLmhhbmRsZXJzQnlOYW1lLmdldChwcmlvclRyYWl0LmhhbmRsZXIubmFtZSkhO1xuICAgICAgbGV0IHRyYWl0OiBUcmFpdDx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPiA9XG4gICAgICAgICAgVHJhaXQucGVuZGluZyhoYW5kbGVyLCBwcmlvclRyYWl0LmRldGVjdGVkKTtcblxuICAgICAgaWYgKHByaW9yVHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuQW5hbHl6ZWQgfHwgcHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCkge1xuICAgICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLm1ha2VTeW1ib2xGb3JUcmFpdChoYW5kbGVyLCByZWNvcmQubm9kZSwgcHJpb3JUcmFpdC5hbmFseXNpcyk7XG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9BbmFseXplZChwcmlvclRyYWl0LmFuYWx5c2lzLCBwcmlvclRyYWl0LmFuYWx5c2lzRGlhZ25vc3RpY3MsIHN5bWJvbCk7XG4gICAgICAgIGlmICh0cmFpdC5hbmFseXNpcyAhPT0gbnVsbCAmJiB0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyKHJlY29yZC5ub2RlLCB0cmFpdC5hbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5Ta2lwcGVkKSB7XG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9Ta2lwcGVkKCk7XG4gICAgICB9XG5cbiAgICAgIHJlY29yZC50cmFpdHMucHVzaCh0cmFpdCk7XG4gICAgfVxuXG4gICAgdGhpcy5jbGFzc2VzLnNldChyZWNvcmQubm9kZSwgcmVjb3JkKTtcbiAgICBjb25zdCBzZiA9IHJlY29yZC5ub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoIXRoaXMuZmlsZVRvQ2xhc3Nlcy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuc2V0KHNmLCBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCkpO1xuICAgIH1cbiAgICB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEuYWRkKHJlY29yZC5ub2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkNsYXNzRm9yVHJhaXRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFBlbmRpbmdUcmFpdDx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdfG51bGwge1xuICAgIGlmICghdGhpcy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICYmICFpc0V4cG9ydGVkKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcblxuICAgIHJldHVybiB0aGlzLmRldGVjdFRyYWl0cyhjbGF6eiwgZGVjb3JhdG9ycyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZGV0ZWN0VHJhaXRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTpcbiAgICAgIFBlbmRpbmdUcmFpdDx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdfG51bGwge1xuICAgIGxldCByZWNvcmQ6IENsYXNzUmVjb3JkfG51bGwgPSB0aGlzLnJlY29yZEZvcihjbGF6eik7XG4gICAgbGV0IGZvdW5kVHJhaXRzOiBQZW5kaW5nVHJhaXQ8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIuZGV0ZWN0KGNsYXp6LCBkZWNvcmF0b3JzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNQcmltYXJ5SGFuZGxlciA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGNvbnN0IGlzV2Vha0hhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUs7XG4gICAgICBjb25zdCB0cmFpdCA9IFRyYWl0LnBlbmRpbmcoaGFuZGxlciwgcmVzdWx0KTtcblxuICAgICAgZm91bmRUcmFpdHMucHVzaCh0cmFpdCk7XG5cbiAgICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIHBhdGggaXMgYSBmYXN0IHBhdGggdGhyb3VnaCB3aGljaFxuICAgICAgICAvLyBtb3N0IGNsYXNzZXMgd2lsbCBmbG93LlxuICAgICAgICByZWNvcmQgPSB7XG4gICAgICAgICAgbm9kZTogY2xhenosXG4gICAgICAgICAgdHJhaXRzOiBbdHJhaXRdLFxuICAgICAgICAgIG1ldGFEaWFnbm9zdGljczogbnVsbCxcbiAgICAgICAgICBoYXNQcmltYXJ5SGFuZGxlcjogaXNQcmltYXJ5SGFuZGxlcixcbiAgICAgICAgICBoYXNXZWFrSGFuZGxlcnM6IGlzV2Vha0hhbmRsZXIsXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jbGFzc2VzLnNldChjbGF6eiwgcmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2YgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuc2V0KHNmLCBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpIS5hZGQoY2xhenopO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhdCBsZWFzdCB0aGUgc2Vjb25kIGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBpcyBhIHNsb3dlciBwYXRoIHRoYXQgc29tZVxuICAgICAgICAvLyBjbGFzc2VzIHdpbGwgZ28gdGhyb3VnaCwgd2hpY2ggdmFsaWRhdGVzIHRoYXQgdGhlIHNldCBvZiBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlIGNsYXNzXG4gICAgICAgIC8vIGlzIHZhbGlkLlxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGFjY29yZGluZyB0byBydWxlcyBhcyBmb2xsb3dzOlxuICAgICAgICAvL1xuICAgICAgICAvLyAqIFdFQUsgaGFuZGxlcnMgYXJlIHJlbW92ZWQgaWYgYSBub24tV0VBSyBoYW5kbGVyIG1hdGNoZXMuXG4gICAgICAgIC8vICogT25seSBvbmUgUFJJTUFSWSBoYW5kbGVyIGNhbiBtYXRjaCBhdCBhIHRpbWUuIEFueSBvdGhlciBQUklNQVJZIGhhbmRsZXIgbWF0Y2hpbmcgYVxuICAgICAgICAvLyAgIGNsYXNzIHdpdGggYW4gZXhpc3RpbmcgUFJJTUFSWSBoYW5kbGVyIGlzIGFuIGVycm9yLlxuXG4gICAgICAgIGlmICghaXNXZWFrSGFuZGxlciAmJiByZWNvcmQuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBub3QgYSBXRUFLIGhhbmRsZXIsIGJ1dCB0aGUgY2xhc3MgaGFzIG90aGVyIFdFQUsgaGFuZGxlcnMuXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZW0uXG4gICAgICAgICAgcmVjb3JkLnRyYWl0cyA9XG4gICAgICAgICAgICAgIHJlY29yZC50cmFpdHMuZmlsdGVyKGZpZWxkID0+IGZpZWxkLmhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSyk7XG4gICAgICAgICAgcmVjb3JkLmhhc1dlYWtIYW5kbGVycyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzV2Vha0hhbmRsZXIgJiYgIXJlY29yZC5oYXNXZWFrSGFuZGxlcnMpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBoYW5kbGVyIGlzIGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBub24tV0VBSyBoYW5kbGVycyBhbHJlYWR5LlxuICAgICAgICAgIC8vIERyb3AgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzUHJpbWFyeUhhbmRsZXIgJiYgcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyKSB7XG4gICAgICAgICAgLy8gVGhlIGNsYXNzIGFscmVhZHkgaGFzIGEgUFJJTUFSWSBoYW5kbGVyLCBhbmQgYW5vdGhlciBvbmUganVzdCBtYXRjaGVkLlxuICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgPSBbe1xuICAgICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICAgIGNvZGU6IE51bWJlcignLTk5JyArIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OKSxcbiAgICAgICAgICAgIGZpbGU6IGdldFNvdXJjZUZpbGUoY2xhenopLFxuICAgICAgICAgICAgc3RhcnQ6IGNsYXp6LmdldFN0YXJ0KHVuZGVmaW5lZCwgZmFsc2UpLFxuICAgICAgICAgICAgbGVuZ3RoOiBjbGF6ei5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWVzc2FnZVRleHQ6ICdUd28gaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gY2xhc3MnLFxuICAgICAgICAgIH1dO1xuICAgICAgICAgIHJlY29yZC50cmFpdHMgPSBmb3VuZFRyYWl0cyA9IFtdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpdCdzIHNhZmUgdG8gYWNjZXB0IHRoZSBtdWx0aXBsZSBkZWNvcmF0b3JzIGhlcmUuIFVwZGF0ZSBzb21lIG9mIHRoZSBtZXRhZGF0YVxuICAgICAgICAvLyByZWdhcmRpbmcgdGhpcyBjbGFzcy5cbiAgICAgICAgcmVjb3JkLnRyYWl0cy5wdXNoKHRyYWl0KTtcbiAgICAgICAgcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyID0gcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyIHx8IGlzUHJpbWFyeUhhbmRsZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvdW5kVHJhaXRzLmxlbmd0aCA+IDAgPyBmb3VuZFRyYWl0cyA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIG1ha2VTeW1ib2xGb3JUcmFpdChcbiAgICAgIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj4sXG4gICAgICBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8dW5rbm93bj58bnVsbCk6IFNlbWFudGljU3ltYm9sfG51bGwge1xuICAgIGlmIChhbmFseXNpcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IGhhbmRsZXIuc3ltYm9sKGRlY2wsIGFuYWx5c2lzKTtcbiAgICBpZiAoc3ltYm9sICE9PSBudWxsICYmIHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGlzUHJpbWFyeSA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGlmICghaXNQcmltYXJ5KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBBc3NlcnRpb25FcnJvcjogJHtoYW5kbGVyLm5hbWV9IHJldHVybmVkIGEgc3ltYm9sIGJ1dCBpcyBub3QgYSBwcmltYXJ5IGhhbmRsZXIuYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLnJlZ2lzdGVyU3ltYm9sKHN5bWJvbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHByZWFuYWx5emVRdWV1ZTogUHJvbWlzZTx2b2lkPltdfG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCB0cmFpdHMgPSB0aGlzLnNjYW5DbGFzc0ZvclRyYWl0cyhjbGF6eik7XG5cbiAgICBpZiAodHJhaXRzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBhcmUgbm8gSXZ5IHRyYWl0cyBvbiB0aGUgY2xhc3MsIHNvIGl0IGNhbiBzYWZlbHkgYmUgc2tpcHBlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHRyYWl0cykge1xuICAgICAgY29uc3QgYW5hbHl6ZSA9ICgpID0+IHRoaXMuYW5hbHl6ZVRyYWl0KGNsYXp6LCB0cmFpdCk7XG5cbiAgICAgIGxldCBwcmVhbmFseXNpczogUHJvbWlzZTx2b2lkPnxudWxsID0gbnVsbDtcbiAgICAgIGlmIChwcmVhbmFseXplUXVldWUgIT09IG51bGwgJiYgdHJhaXQuaGFuZGxlci5wcmVhbmFseXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQXR0ZW1wdCB0byBydW4gcHJlYW5hbHlzaXMuIFRoaXMgY291bGQgZmFpbCB3aXRoIGEgYEZhdGFsRGlhZ25vc3RpY0Vycm9yYDsgY2F0Y2ggaXQgaWYgaXRcbiAgICAgICAgLy8gZG9lcy5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwcmVhbmFseXNpcyA9IHRyYWl0LmhhbmRsZXIucHJlYW5hbHl6ZShjbGF6eiwgdHJhaXQuZGV0ZWN0ZWQubWV0YWRhdGEpIHx8IG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgdHJhaXQudG9BbmFseXplZChudWxsLCBbZXJyLnRvRGlhZ25vc3RpYygpXSwgbnVsbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChwcmVhbmFseXNpcyAhPT0gbnVsbCkge1xuICAgICAgICBwcmVhbmFseXplUXVldWUhLnB1c2gocHJlYW5hbHlzaXMudGhlbihhbmFseXplKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbmFseXplKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVUcmFpdChcbiAgICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCB0cmFpdDogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj4sXG4gICAgICBmbGFncz86IEhhbmRsZXJGbGFncyk6IHZvaWQge1xuICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5QZW5kaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gYW5hbHl6ZSB0cmFpdCBvZiAke2NsYXp6Lm5hbWUudGV4dH0gaW4gc3RhdGUgJHtcbiAgICAgICAgICBUcmFpdFN0YXRlW3RyYWl0LnN0YXRlXX0gKGV4cGVjdGVkIERFVEVDVEVEKWApO1xuICAgIH1cblxuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5UcmFpdEFuYWx5emUpO1xuXG4gICAgLy8gQXR0ZW1wdCBhbmFseXNpcy4gVGhpcyBjb3VsZCBmYWlsIHdpdGggYSBgRmF0YWxEaWFnbm9zdGljRXJyb3JgOyBjYXRjaCBpdCBpZiBpdCBkb2VzLlxuICAgIGxldCByZXN1bHQ6IEFuYWx5c2lzT3V0cHV0PHVua25vd24+O1xuICAgIHRyeSB7XG4gICAgICByZXN1bHQgPSB0cmFpdC5oYW5kbGVyLmFuYWx5emUoY2xhenosIHRyYWl0LmRldGVjdGVkLm1ldGFkYXRhLCBmbGFncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgdHJhaXQudG9BbmFseXplZChudWxsLCBbZXJyLnRvRGlhZ25vc3RpYygpXSwgbnVsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLm1ha2VTeW1ib2xGb3JUcmFpdCh0cmFpdC5oYW5kbGVyLCBjbGF6eiwgcmVzdWx0LmFuYWx5c2lzID8/IG51bGwpO1xuICAgIGlmIChyZXN1bHQuYW5hbHlzaXMgIT09IHVuZGVmaW5lZCAmJiB0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIoY2xhenosIHJlc3VsdC5hbmFseXNpcyk7XG4gICAgfVxuICAgIHRyYWl0ID0gdHJhaXQudG9BbmFseXplZChyZXN1bHQuYW5hbHlzaXMgPz8gbnVsbCwgcmVzdWx0LmRpYWdub3N0aWNzID8/IG51bGwsIHN5bWJvbCk7XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5mcm9tKHRoaXMuY2xhc3Nlcy5rZXlzKCkpO1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgY2xhc3Nlcykge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChsZXQgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBjb25zdCBoYW5kbGVyID0gdHJhaXQuaGFuZGxlcjtcbiAgICAgICAgc3dpdGNoICh0cmFpdC5zdGF0ZSkge1xuICAgICAgICAgIGNhc2UgVHJhaXRTdGF0ZS5Ta2lwcGVkOlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlBlbmRpbmc6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlc29sdmluZyBhIHRyYWl0IHRoYXQgaGFzbid0IGJlZW4gYW5hbHl6ZWQ6ICR7Y2xhenoubmFtZS50ZXh0fSAvICR7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKHRyYWl0LmhhbmRsZXIpLmNvbnN0cnVjdG9yLm5hbWV9YCk7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlJlc29sdmVkOlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZXNvbHZpbmcgYW4gYWxyZWFkeSByZXNvbHZlZCB0cmFpdGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyYWl0LmFuYWx5c2lzID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gTm8gYW5hbHlzaXMgcmVzdWx0cywgY2Fubm90IGZ1cnRoZXIgcHJvY2VzcyB0aGlzIHRyYWl0LlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXIucmVzb2x2ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTm8gcmVzb2x1dGlvbiBvZiB0aGlzIHRyYWl0IG5lZWRlZCAtIGl0J3MgY29uc2lkZXJlZCBzdWNjZXNzZnVsIGJ5IGRlZmF1bHQuXG4gICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKG51bGwsIG51bGwpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3VsdDogUmVzb2x2ZVJlc3VsdDx1bmtub3duPjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXN1bHQgPSBoYW5kbGVyLnJlc29sdmUoY2xhenosIHRyYWl0LmFuYWx5c2lzIGFzIFJlYWRvbmx5PHVua25vd24+LCB0cmFpdC5zeW1ib2wpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9SZXNvbHZlZChudWxsLCBbZXJyLnRvRGlhZ25vc3RpYygpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9SZXNvbHZlZChyZXN1bHQuZGF0YSA/PyBudWxsLCByZXN1bHQuZGlhZ25vc3RpY3MgPz8gbnVsbCk7XG5cbiAgICAgICAgaWYgKHJlc3VsdC5yZWV4cG9ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gY2xhenouZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgICAgIGlmICghdGhpcy5yZWV4cG9ydE1hcC5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICB0aGlzLnJlZXhwb3J0TWFwLnNldChmaWxlTmFtZSwgbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmaWxlUmVleHBvcnRzID0gdGhpcy5yZWV4cG9ydE1hcC5nZXQoZmlsZU5hbWUpITtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJlZXhwb3J0IG9mIHJlc3VsdC5yZWV4cG9ydHMpIHtcbiAgICAgICAgICAgIGZpbGVSZWV4cG9ydHMuc2V0KHJlZXhwb3J0LmFzQWxpYXMsIFtyZWV4cG9ydC5mcm9tTW9kdWxlLCByZWV4cG9ydC5zeW1ib2xOYW1lXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBpbnRvIHRoZSBgVHlwZUNoZWNrQ29udGV4dGAgZm9yIGFueSBjb21wb25lbnRzIHdpdGhpbiB0aGUgZ2l2ZW5cbiAgICogYHRzLlNvdXJjZUZpbGVgLlxuICAgKi9cbiAgdHlwZUNoZWNrKHNmOiB0cy5Tb3VyY2VGaWxlLCBjdHg6IFR5cGVDaGVja0NvbnRleHQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZmlsZVRvQ2xhc3Nlcy5oYXMoc2YpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopITtcbiAgICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFpdC5oYW5kbGVyLnR5cGVDaGVjayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyYWl0LnJlc29sdXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLnR5cGVDaGVjayhjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbmRleChjdHg6IEluZGV4aW5nQ29udGV4dCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5jbGFzc2VzLmtleXMoKSkge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCkge1xuICAgICAgICAgIC8vIFNraXAgdHJhaXRzIHRoYXQgaGF2ZW4ndCBiZWVuIHJlc29sdmVkIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFpdC5oYW5kbGVyLmluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBTa2lwIHRyYWl0cyB0aGF0IGRvbid0IGFmZmVjdCBpbmRleGluZy5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cmFpdC5yZXNvbHV0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgdHJhaXQuaGFuZGxlci5pbmRleChjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1cGRhdGVSZXNvdXJjZXMoY2xheno6IERlY2xhcmF0aW9uTm9kZSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhjbGF6eikgfHwgIXRoaXMuY2xhc3Nlcy5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopITtcbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SZXNvbHZlZCB8fCB0cmFpdC5oYW5kbGVyLnVwZGF0ZVJlc291cmNlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB0cmFpdC5oYW5kbGVyLnVwZGF0ZVJlc291cmNlcyhjbGF6eiwgdHJhaXQuYW5hbHlzaXMsIHRyYWl0LnJlc29sdXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGUoY2xheno6IERlY2xhcmF0aW9uTm9kZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W118bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY2xhenopIGFzIHR5cGVvZiBjbGF6ejtcbiAgICBpZiAoIXRoaXMucmVmbGVjdG9yLmlzQ2xhc3MoY2xhenopIHx8ICF0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG9yaWdpbmFsKSB8fFxuICAgICAgICAhdGhpcy5jbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQob3JpZ2luYWwpITtcblxuICAgIGxldCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUmVzb2x2ZWQgfHwgdHJhaXQuYW5hbHlzaXNEaWFnbm9zdGljcyAhPT0gbnVsbCB8fFxuICAgICAgICAgIHRyYWl0LnJlc29sdmVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgICAvLyBDYW5ub3QgY29tcGlsZSBhIHRyYWl0IHRoYXQgaXMgbm90IHJlc29sdmVkLCBvciBoYWQgYW55IGVycm9ycyBpbiBpdHMgZGVjbGFyYXRpb24uXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBgdHJhaXQucmVzb2x1dGlvbmAgaXMgbm9uLW51bGwgYXNzZXJ0ZWQgaGVyZSBiZWNhdXNlIFR5cGVTY3JpcHQgZG9lcyBub3QgcmVjb2duaXplIHRoYXRcbiAgICAgIC8vIGBSZWFkb25seTx1bmtub3duPmAgaXMgbnVsbGFibGUgKGFzIGB1bmtub3duYCBpdHNlbGYgaXMgbnVsbGFibGUpIGR1ZSB0byB0aGUgd2F5IHRoYXRcbiAgICAgIC8vIGBSZWFkb25seWAgd29ya3MuXG5cbiAgICAgIGxldCBjb21waWxlUmVzOiBDb21waWxlUmVzdWx0fENvbXBpbGVSZXN1bHRbXTtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uTW9kZSA9PT0gQ29tcGlsYXRpb25Nb2RlLlBBUlRJQUwgJiZcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLmNvbXBpbGVQYXJ0aWFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29tcGlsZVJlcyA9IHRyYWl0LmhhbmRsZXIuY29tcGlsZVBhcnRpYWwoY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxlUmVzID1cbiAgICAgICAgICAgIHRyYWl0LmhhbmRsZXIuY29tcGlsZUZ1bGwoY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uISwgY29uc3RhbnRQb29sKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29tcGlsZU1hdGNoUmVzID0gY29tcGlsZVJlcztcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGNvbXBpbGVNYXRjaFJlcykpIHtcbiAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgY29tcGlsZU1hdGNoUmVzKSB7XG4gICAgICAgICAgaWYgKCFyZXMuc29tZShyID0+IHIubmFtZSA9PT0gcmVzdWx0Lm5hbWUpKSB7XG4gICAgICAgICAgICByZXMucHVzaChyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghcmVzLnNvbWUocmVzdWx0ID0+IHJlc3VsdC5uYW1lID09PSBjb21waWxlTWF0Y2hSZXMubmFtZSkpIHtcbiAgICAgICAgcmVzLnB1c2goY29tcGlsZU1hdGNoUmVzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMb29rIHVwIHRoZSAuZC50cyB0cmFuc2Zvcm1lciBmb3IgdGhlIGlucHV0IGZpbGUgYW5kIHJlY29yZCB0aGF0IGF0IGxlYXN0IG9uZSBmaWVsZCB3YXNcbiAgICAvLyBnZW5lcmF0ZWQsIHdoaWNoIHdpbGwgYWxsb3cgdGhlIC5kLnRzIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgIHRoaXMuZHRzVHJhbnNmb3Jtcy5nZXRJdnlEZWNsYXJhdGlvblRyYW5zZm9ybShvcmlnaW5hbC5nZXRTb3VyY2VGaWxlKCkpXG4gICAgICAgIC5hZGRGaWVsZHMob3JpZ2luYWwsIHJlcyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGluc3RydWN0aW9uIHRvIHRoZSB0cmFuc2Zvcm1lciBzbyB0aGUgZmllbGRzIHdpbGwgYmUgYWRkZWQuXG4gICAgcmV0dXJuIHJlcy5sZW5ndGggPiAwID8gcmVzIDogbnVsbDtcbiAgfVxuXG4gIGRlY29yYXRvcnNGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNvcmF0b3JbXSB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHlwZW9mIG5vZGU7XG4gICAgaWYgKCF0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG9yaWdpbmFsKSB8fCAhdGhpcy5jbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KG9yaWdpbmFsKSE7XG4gICAgY29uc3QgZGVjb3JhdG9yczogdHMuRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgaWYgKHRyYWl0LnN0YXRlICE9PSBUcmFpdFN0YXRlLlJlc29sdmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHJhaXQuZGV0ZWN0ZWQudHJpZ2dlciAhPT0gbnVsbCAmJiB0cy5pc0RlY29yYXRvcih0cmFpdC5kZXRlY3RlZC50cmlnZ2VyKSkge1xuICAgICAgICBkZWNvcmF0b3JzLnB1c2godHJhaXQuZGV0ZWN0ZWQudHJpZ2dlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICBnZXQgZGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5jbGFzc2VzLmtleXMoKSkge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgaWYgKHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgIT09IG51bGwpIHtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5yZWNvcmQubWV0YURpYWdub3N0aWNzKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBpZiAoKHRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLkFuYWx5emVkIHx8IHRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLlJlc29sdmVkKSAmJlxuICAgICAgICAgICAgdHJhaXQuYW5hbHlzaXNEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHJhaXQuYW5hbHlzaXNEaWFnbm9zdGljcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLlJlc29sdmVkICYmIHRyYWl0LnJlc29sdmVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHJhaXQucmVzb2x2ZURpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXQgZXhwb3J0U3RhdGVtZW50cygpOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4ge1xuICAgIHJldHVybiB0aGlzLnJlZXhwb3J0TWFwO1xuICB9XG59XG4iXX0=