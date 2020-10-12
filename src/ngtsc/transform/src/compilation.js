/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/trait"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TraitCompiler = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/api");
    var trait_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/trait");
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
    var TraitCompiler = /** @class */ (function () {
        function TraitCompiler(handlers, reflector, perf, incrementalBuild, compileNonExportedClasses, compilationMode, dtsTransforms) {
            var e_1, _a;
            this.handlers = handlers;
            this.reflector = reflector;
            this.perf = perf;
            this.incrementalBuild = incrementalBuild;
            this.compileNonExportedClasses = compileNonExportedClasses;
            this.compilationMode = compilationMode;
            this.dtsTransforms = dtsTransforms;
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
            try {
                for (var handlers_1 = tslib_1.__values(handlers), handlers_1_1 = handlers_1.next(); !handlers_1_1.done; handlers_1_1 = handlers_1.next()) {
                    var handler = handlers_1_1.value;
                    this.handlersByName.set(handler.name, handler);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (handlers_1_1 && !handlers_1_1.done && (_a = handlers_1.return)) _a.call(handlers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        TraitCompiler.prototype.analyzeSync = function (sf) {
            this.analyze(sf, false);
        };
        TraitCompiler.prototype.analyzeAsync = function (sf) {
            return this.analyze(sf, true);
        };
        TraitCompiler.prototype.analyze = function (sf, preanalyze) {
            var e_2, _a;
            var _this = this;
            // We shouldn't analyze declaration files.
            if (sf.isDeclarationFile) {
                return undefined;
            }
            // analyze() really wants to return `Promise<void>|void`, but TypeScript cannot narrow a return
            // type of 'void', so `undefined` is used instead.
            var promises = [];
            var priorWork = this.incrementalBuild.priorWorkFor(sf);
            if (priorWork !== null) {
                try {
                    for (var priorWork_1 = tslib_1.__values(priorWork), priorWork_1_1 = priorWork_1.next(); !priorWork_1_1.done; priorWork_1_1 = priorWork_1.next()) {
                        var priorRecord = priorWork_1_1.value;
                        this.adopt(priorRecord);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (priorWork_1_1 && !priorWork_1_1.done && (_a = priorWork_1.return)) _a.call(priorWork_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                // Skip the rest of analysis, as this file's prior traits are being reused.
                return;
            }
            var visit = function (node) {
                if (_this.reflector.isClass(node)) {
                    _this.analyzeClass(node, preanalyze ? promises : null);
                }
                ts.forEachChild(node, visit);
            };
            visit(sf);
            if (preanalyze && promises.length > 0) {
                return Promise.all(promises).then(function () { return undefined; });
            }
            else {
                return undefined;
            }
        };
        TraitCompiler.prototype.recordFor = function (clazz) {
            if (this.classes.has(clazz)) {
                return this.classes.get(clazz);
            }
            else {
                return null;
            }
        };
        TraitCompiler.prototype.recordsFor = function (sf) {
            var e_3, _a;
            if (!this.fileToClasses.has(sf)) {
                return null;
            }
            var records = [];
            try {
                for (var _b = tslib_1.__values(this.fileToClasses.get(sf)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var clazz = _c.value;
                    records.push(this.classes.get(clazz));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return records;
        };
        /**
         * Import a `ClassRecord` from a previous compilation.
         *
         * Traits from the `ClassRecord` have accurate metadata, but the `handler` is from the old program
         * and needs to be updated (matching is done by name). A new pending trait is created and then
         * transitioned to analyzed using the previous analysis. If the trait is in the errored state,
         * instead the errors are copied over.
         */
        TraitCompiler.prototype.adopt = function (priorRecord) {
            var e_4, _a;
            var record = {
                hasPrimaryHandler: priorRecord.hasPrimaryHandler,
                hasWeakHandlers: priorRecord.hasWeakHandlers,
                metaDiagnostics: priorRecord.metaDiagnostics,
                node: priorRecord.node,
                traits: [],
            };
            try {
                for (var _b = tslib_1.__values(priorRecord.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var priorTrait = _c.value;
                    var handler = this.handlersByName.get(priorTrait.handler.name);
                    var trait = trait_1.Trait.pending(handler, priorTrait.detected);
                    if (priorTrait.state === trait_1.TraitState.ANALYZED || priorTrait.state === trait_1.TraitState.RESOLVED) {
                        trait = trait.toAnalyzed(priorTrait.analysis);
                        if (trait.handler.register !== undefined) {
                            trait.handler.register(record.node, trait.analysis);
                        }
                    }
                    else if (priorTrait.state === trait_1.TraitState.SKIPPED) {
                        trait = trait.toSkipped();
                    }
                    else if (priorTrait.state === trait_1.TraitState.ERRORED) {
                        trait = trait.toErrored(priorTrait.diagnostics);
                    }
                    record.traits.push(trait);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            this.classes.set(record.node, record);
            var sf = record.node.getSourceFile();
            if (!this.fileToClasses.has(sf)) {
                this.fileToClasses.set(sf, new Set());
            }
            this.fileToClasses.get(sf).add(record.node);
        };
        TraitCompiler.prototype.scanClassForTraits = function (clazz) {
            if (!this.compileNonExportedClasses && !typescript_1.isExported(clazz)) {
                return null;
            }
            var decorators = this.reflector.getDecoratorsOfDeclaration(clazz);
            return this.detectTraits(clazz, decorators);
        };
        TraitCompiler.prototype.detectTraits = function (clazz, decorators) {
            var e_5, _a;
            var record = this.recordFor(clazz);
            var foundTraits = [];
            try {
                for (var _b = tslib_1.__values(this.handlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var handler = _c.value;
                    var result = handler.detect(clazz, decorators);
                    if (result === undefined) {
                        continue;
                    }
                    var isPrimaryHandler = handler.precedence === api_1.HandlerPrecedence.PRIMARY;
                    var isWeakHandler = handler.precedence === api_1.HandlerPrecedence.WEAK;
                    var trait = trait_1.Trait.pending(handler, result);
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
                        var sf = clazz.getSourceFile();
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
                                record.traits.filter(function (field) { return field.handler.precedence !== api_1.HandlerPrecedence.WEAK; });
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
                                    code: Number('-99' + diagnostics_1.ErrorCode.DECORATOR_COLLISION),
                                    file: typescript_1.getSourceFile(clazz),
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
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return foundTraits.length > 0 ? foundTraits : null;
        };
        TraitCompiler.prototype.analyzeClass = function (clazz, preanalyzeQueue) {
            var e_6, _a;
            var _this = this;
            var traits = this.scanClassForTraits(clazz);
            if (traits === null) {
                // There are no Ivy traits on the class, so it can safely be skipped.
                return;
            }
            var _loop_1 = function (trait) {
                var analyze = function () { return _this.analyzeTrait(clazz, trait); };
                var preanalysis = null;
                if (preanalyzeQueue !== null && trait.handler.preanalyze !== undefined) {
                    // Attempt to run preanalysis. This could fail with a `FatalDiagnosticError`; catch it if it
                    // does.
                    try {
                        preanalysis = trait.handler.preanalyze(clazz, trait.detected.metadata) || null;
                    }
                    catch (err) {
                        if (err instanceof diagnostics_1.FatalDiagnosticError) {
                            trait.toErrored([err.toDiagnostic()]);
                            return { value: void 0 };
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
            };
            try {
                for (var traits_1 = tslib_1.__values(traits), traits_1_1 = traits_1.next(); !traits_1_1.done; traits_1_1 = traits_1.next()) {
                    var trait = traits_1_1.value;
                    var state_1 = _loop_1(trait);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (traits_1_1 && !traits_1_1.done && (_a = traits_1.return)) _a.call(traits_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
        };
        TraitCompiler.prototype.analyzeTrait = function (clazz, trait, flags) {
            if (trait.state !== trait_1.TraitState.PENDING) {
                throw new Error("Attempt to analyze trait of " + clazz.name.text + " in state " + trait_1.TraitState[trait.state] + " (expected DETECTED)");
            }
            // Attempt analysis. This could fail with a `FatalDiagnosticError`; catch it if it does.
            var result;
            try {
                result = trait.handler.analyze(clazz, trait.detected.metadata, flags);
            }
            catch (err) {
                if (err instanceof diagnostics_1.FatalDiagnosticError) {
                    trait = trait.toErrored([err.toDiagnostic()]);
                    return;
                }
                else {
                    throw err;
                }
            }
            if (result.diagnostics !== undefined) {
                trait = trait.toErrored(result.diagnostics);
            }
            else if (result.analysis !== undefined) {
                // Analysis was successful. Trigger registration.
                if (trait.handler.register !== undefined) {
                    trait.handler.register(clazz, result.analysis);
                }
                // Successfully analyzed and registered.
                trait = trait.toAnalyzed(result.analysis);
            }
            else {
                trait = trait.toSkipped();
            }
        };
        TraitCompiler.prototype.resolve = function () {
            var e_7, _a, e_8, _b, e_9, _c;
            var classes = Array.from(this.classes.keys());
            try {
                for (var classes_1 = tslib_1.__values(classes), classes_1_1 = classes_1.next(); !classes_1_1.done; classes_1_1 = classes_1.next()) {
                    var clazz = classes_1_1.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _d = (e_8 = void 0, tslib_1.__values(record.traits)), _e = _d.next(); !_e.done; _e = _d.next()) {
                            var trait = _e.value;
                            var handler = trait.handler;
                            switch (trait.state) {
                                case trait_1.TraitState.SKIPPED:
                                case trait_1.TraitState.ERRORED:
                                    continue;
                                case trait_1.TraitState.PENDING:
                                    throw new Error("Resolving a trait that hasn't been analyzed: " + clazz.name.text + " / " + Object.getPrototypeOf(trait.handler).constructor.name);
                                case trait_1.TraitState.RESOLVED:
                                    throw new Error("Resolving an already resolved trait");
                            }
                            if (handler.resolve === undefined) {
                                // No resolution of this trait needed - it's considered successful by default.
                                trait = trait.toResolved(null);
                                continue;
                            }
                            var result = void 0;
                            try {
                                result = handler.resolve(clazz, trait.analysis);
                            }
                            catch (err) {
                                if (err instanceof diagnostics_1.FatalDiagnosticError) {
                                    trait = trait.toErrored([err.toDiagnostic()]);
                                    continue;
                                }
                                else {
                                    throw err;
                                }
                            }
                            if (result.diagnostics !== undefined && result.diagnostics.length > 0) {
                                trait = trait.toErrored(result.diagnostics);
                            }
                            else {
                                if (result.data !== undefined) {
                                    trait = trait.toResolved(result.data);
                                }
                                else {
                                    trait = trait.toResolved(null);
                                }
                            }
                            if (result.reexports !== undefined) {
                                var fileName = clazz.getSourceFile().fileName;
                                if (!this.reexportMap.has(fileName)) {
                                    this.reexportMap.set(fileName, new Map());
                                }
                                var fileReexports = this.reexportMap.get(fileName);
                                try {
                                    for (var _f = (e_9 = void 0, tslib_1.__values(result.reexports)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                        var reexport = _g.value;
                                        fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                                    }
                                }
                                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                                finally {
                                    try {
                                        if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                                    }
                                    finally { if (e_9) throw e_9.error; }
                                }
                            }
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (classes_1_1 && !classes_1_1.done && (_a = classes_1.return)) _a.call(classes_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
        };
        /**
         * Generate type-checking code into the `TypeCheckContext` for any components within the given
         * `ts.SourceFile`.
         */
        TraitCompiler.prototype.typeCheck = function (sf, ctx) {
            var e_10, _a, e_11, _b;
            if (!this.fileToClasses.has(sf)) {
                return;
            }
            try {
                for (var _c = tslib_1.__values(this.fileToClasses.get(sf)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var clazz = _d.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _e = (e_11 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var trait = _f.value;
                            if (trait.state !== trait_1.TraitState.RESOLVED) {
                                continue;
                            }
                            else if (trait.handler.typeCheck === undefined) {
                                continue;
                            }
                            trait.handler.typeCheck(ctx, clazz, trait.analysis, trait.resolution);
                        }
                    }
                    catch (e_11_1) { e_11 = { error: e_11_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_11) throw e_11.error; }
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_10) throw e_10.error; }
            }
        };
        TraitCompiler.prototype.index = function (ctx) {
            var e_12, _a, e_13, _b;
            try {
                for (var _c = tslib_1.__values(this.classes.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var clazz = _d.value;
                    var record = this.classes.get(clazz);
                    try {
                        for (var _e = (e_13 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var trait = _f.value;
                            if (trait.state !== trait_1.TraitState.RESOLVED) {
                                // Skip traits that haven't been resolved successfully.
                                continue;
                            }
                            else if (trait.handler.index === undefined) {
                                // Skip traits that don't affect indexing.
                                continue;
                            }
                            trait.handler.index(ctx, clazz, trait.analysis, trait.resolution);
                        }
                    }
                    catch (e_13_1) { e_13 = { error: e_13_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_13) throw e_13.error; }
                    }
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_12) throw e_12.error; }
            }
        };
        TraitCompiler.prototype.compile = function (clazz, constantPool) {
            var e_14, _a;
            var original = ts.getOriginalNode(clazz);
            if (!this.reflector.isClass(clazz) || !this.reflector.isClass(original) ||
                !this.classes.has(original)) {
                return null;
            }
            var record = this.classes.get(original);
            var res = [];
            var _loop_2 = function (trait) {
                var e_15, _a;
                if (trait.state !== trait_1.TraitState.RESOLVED) {
                    return "continue";
                }
                var compileSpan = this_1.perf.start('compileClass', original);
                var compileRes = void 0;
                if (this_1.compilationMode === api_1.CompilationMode.PARTIAL &&
                    trait.handler.compilePartial !== undefined) {
                    compileRes = trait.handler.compilePartial(clazz, trait.analysis, trait.resolution);
                }
                else {
                    compileRes =
                        trait.handler.compileFull(clazz, trait.analysis, trait.resolution, constantPool);
                }
                var compileMatchRes = compileRes;
                this_1.perf.stop(compileSpan);
                if (Array.isArray(compileMatchRes)) {
                    var _loop_3 = function (result) {
                        if (!res.some(function (r) { return r.name === result.name; })) {
                            res.push(result);
                        }
                    };
                    try {
                        for (var compileMatchRes_1 = (e_15 = void 0, tslib_1.__values(compileMatchRes)), compileMatchRes_1_1 = compileMatchRes_1.next(); !compileMatchRes_1_1.done; compileMatchRes_1_1 = compileMatchRes_1.next()) {
                            var result = compileMatchRes_1_1.value;
                            _loop_3(result);
                        }
                    }
                    catch (e_15_1) { e_15 = { error: e_15_1 }; }
                    finally {
                        try {
                            if (compileMatchRes_1_1 && !compileMatchRes_1_1.done && (_a = compileMatchRes_1.return)) _a.call(compileMatchRes_1);
                        }
                        finally { if (e_15) throw e_15.error; }
                    }
                }
                else if (!res.some(function (result) { return result.name === compileMatchRes.name; })) {
                    res.push(compileMatchRes);
                }
            };
            var this_1 = this;
            try {
                for (var _b = tslib_1.__values(record.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    _loop_2(trait);
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_14) throw e_14.error; }
            }
            // Look up the .d.ts transformer for the input file and record that at least one field was
            // generated, which will allow the .d.ts to be transformed later.
            this.dtsTransforms.getIvyDeclarationTransform(original.getSourceFile())
                .addFields(original, res);
            // Return the instruction to the transformer so the fields will be added.
            return res.length > 0 ? res : null;
        };
        TraitCompiler.prototype.decoratorsFor = function (node) {
            var e_16, _a;
            var original = ts.getOriginalNode(node);
            if (!this.reflector.isClass(original) || !this.classes.has(original)) {
                return [];
            }
            var record = this.classes.get(original);
            var decorators = [];
            try {
                for (var _b = tslib_1.__values(record.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    if (trait.state !== trait_1.TraitState.RESOLVED) {
                        continue;
                    }
                    if (trait.detected.trigger !== null && ts.isDecorator(trait.detected.trigger)) {
                        decorators.push(trait.detected.trigger);
                    }
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_16) throw e_16.error; }
            }
            return decorators;
        };
        Object.defineProperty(TraitCompiler.prototype, "diagnostics", {
            get: function () {
                var e_17, _a, e_18, _b;
                var diagnostics = [];
                try {
                    for (var _c = tslib_1.__values(this.classes.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var clazz = _d.value;
                        var record = this.classes.get(clazz);
                        if (record.metaDiagnostics !== null) {
                            diagnostics.push.apply(diagnostics, tslib_1.__spread(record.metaDiagnostics));
                        }
                        try {
                            for (var _e = (e_18 = void 0, tslib_1.__values(record.traits)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var trait = _f.value;
                                if (trait.state === trait_1.TraitState.ERRORED) {
                                    diagnostics.push.apply(diagnostics, tslib_1.__spread(trait.diagnostics));
                                }
                            }
                        }
                        catch (e_18_1) { e_18 = { error: e_18_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_18) throw e_18.error; }
                        }
                    }
                }
                catch (e_17_1) { e_17 = { error: e_17_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_17) throw e_17.error; }
                }
                return diagnostics;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(TraitCompiler.prototype, "exportStatements", {
            get: function () {
                return this.reexportMap;
            },
            enumerable: false,
            configurable: true
        });
        return TraitCompiler;
    }());
    exports.TraitCompiler = TraitCompiler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBa0U7SUFNbEUsa0ZBQW9FO0lBRXBFLHlFQUF1STtJQUV2SSw2RUFBd0Q7SUFxQ3hEOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQWlCRSx1QkFDWSxRQUF1RCxFQUN2RCxTQUF5QixFQUFVLElBQWtCLEVBQ3JELGdCQUF3RCxFQUN4RCx5QkFBa0MsRUFBVSxlQUFnQyxFQUM1RSxhQUFtQzs7WUFKbkMsYUFBUSxHQUFSLFFBQVEsQ0FBK0M7WUFDdkQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQ3JELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0M7WUFDeEQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFTO1lBQVUsb0JBQWUsR0FBZixlQUFlLENBQWlCO1lBQzVFLGtCQUFhLEdBQWIsYUFBYSxDQUFzQjtZQXJCL0M7OztlQUdHO1lBQ0ssWUFBTyxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBRTNEOzs7ZUFHRztZQUNPLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7WUFFbEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUUvRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUF1RCxDQUFDOztnQkFRdEYsS0FBc0IsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTtvQkFBM0IsSUFBTSxPQUFPLHFCQUFBO29CQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FB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Q0FBQSxnQkFBQSw0QkFBRTt3QkFBcEMsSUFBTSxLQUFLLFdBQUE7d0JBQ2QsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7d0JBQ3hDLElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxJQUFJLEVBQUU7NEJBQ25DLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsTUFBTSxDQUFDLGVBQWUsR0FBRTt5QkFDN0M7OzRCQUNELEtBQW9CLElBQUEscUJBQUEsaUJBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQSxDQUFBLGdCQUFBLDRCQUFFO2dDQUE5QixJQUFNLEtBQUssV0FBQTtnQ0FDZCxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssa0JBQVUsQ0FBQyxPQUFPLEVBQUU7b0NBQ3RDLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsS0FBSyxDQUFDLFdBQVcsR0FBRTtpQ0FDeEM7NkJBQ0Y7Ozs7Ozs7OztxQkFDRjs7Ozs7Ozs7O2dCQUNELE9BQU8sV0FBVyxDQUFDO1lBQ3JCLENBQUM7OztXQUFBO1FBRUQsc0JBQUksMkNBQWdCO2lCQUFwQjtnQkFDRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDMUIsQ0FBQzs7O1dBQUE7UUFDSCxvQkFBQztJQUFELENBQUMsQUF0ZUQsSUFzZUM7SUF0ZVksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7UGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25Ob2RlLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7UHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIsIFR5cGVDaGVja0NvbnRleHR9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlLCBpc0V4cG9ydGVkfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsYXRpb25Nb2RlLCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBIYW5kbGVyRmxhZ3MsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c1RyYW5zZm9ybVJlZ2lzdHJ5fSBmcm9tICcuL2RlY2xhcmF0aW9uJztcbmltcG9ydCB7UGVuZGluZ1RyYWl0LCBUcmFpdCwgVHJhaXRTdGF0ZX0gZnJvbSAnLi90cmFpdCc7XG5cblxuLyoqXG4gKiBSZWNvcmRzIGluZm9ybWF0aW9uIGFib3V0IGEgc3BlY2lmaWMgY2xhc3MgdGhhdCBoYXMgbWF0Y2hlZCB0cmFpdHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NSZWNvcmQge1xuICAvKipcbiAgICogVGhlIGBDbGFzc0RlY2xhcmF0aW9uYCBvZiB0aGUgY2xhc3Mgd2hpY2ggaGFzIEFuZ3VsYXIgdHJhaXRzIGFwcGxpZWQuXG4gICAqL1xuICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uO1xuXG4gIC8qKlxuICAgKiBBbGwgdHJhaXRzIHdoaWNoIG1hdGNoZWQgb24gdGhlIGNsYXNzLlxuICAgKi9cbiAgdHJhaXRzOiBUcmFpdDx1bmtub3duLCB1bmtub3duLCB1bmtub3duPltdO1xuXG4gIC8qKlxuICAgKiBNZXRhLWRpYWdub3N0aWNzIGFib3V0IHRoZSBjbGFzcywgd2hpY2ggYXJlIHVzdWFsbHkgcmVsYXRlZCB0byB3aGV0aGVyIGNlcnRhaW4gY29tYmluYXRpb25zIG9mXG4gICAqIEFuZ3VsYXIgZGVjb3JhdG9ycyBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICovXG4gIG1ldGFEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfG51bGw7XG5cbiAgLy8gU3Vic2VxdWVudCBmaWVsZHMgYXJlIFwiaW50ZXJuYWxcIiBhbmQgdXNlZCBkdXJpbmcgdGhlIG1hdGNoaW5nIG9mIGBEZWNvcmF0b3JIYW5kbGVyYHMuIFRoaXMgaXNcbiAgLy8gbXV0YWJsZSBzdGF0ZSBkdXJpbmcgdGhlIGBkZXRlY3RgL2BhbmFseXplYCBwaGFzZXMgb2YgY29tcGlsYXRpb24uXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgYHRyYWl0c2AgY29udGFpbnMgdHJhaXRzIG1hdGNoZWQgZnJvbSBgRGVjb3JhdG9ySGFuZGxlcmBzIG1hcmtlZCBhcyBgV0VBS2AuXG4gICAqL1xuICBoYXNXZWFrSGFuZGxlcnM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgYHRyYWl0c2AgY29udGFpbnMgYSB0cmFpdCBmcm9tIGEgYERlY29yYXRvckhhbmRsZXJgIG1hdGNoZWQgYXMgYFBSSU1BUllgLlxuICAgKi9cbiAgaGFzUHJpbWFyeUhhbmRsZXI6IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIEFuZ3VsYXIgY29tcGlsYXRpb24uXG4gKlxuICogVGhlIGBUcmFpdENvbXBpbGVyYCBpcyByZXNwb25zaWJsZSBmb3IgcHJvY2Vzc2luZyBhbGwgY2xhc3NlcyBpbiB0aGUgcHJvZ3JhbS4gQW55IHRpbWUgYVxuICogYERlY29yYXRvckhhbmRsZXJgIG1hdGNoZXMgYSBjbGFzcywgYSBcInRyYWl0XCIgaXMgY3JlYXRlZCB0byByZXByZXNlbnQgdGhhdCBBbmd1bGFyIGFzcGVjdCBvZiB0aGVcbiAqIGNsYXNzIChzdWNoIGFzIHRoZSBjbGFzcyBoYXZpbmcgYSBjb21wb25lbnQgZGVmaW5pdGlvbikuXG4gKlxuICogVGhlIGBUcmFpdENvbXBpbGVyYCB0cmFuc2l0aW9ucyBlYWNoIHRyYWl0IHRocm91Z2ggdGhlIHZhcmlvdXMgcGhhc2VzIG9mIGNvbXBpbGF0aW9uLCBjdWxtaW5hdGluZ1xuICogaW4gdGhlIHByb2R1Y3Rpb24gb2YgYENvbXBpbGVSZXN1bHRgcyBpbnN0cnVjdGluZyB0aGUgY29tcGlsZXIgdG8gYXBwbHkgdmFyaW91cyBtdXRhdGlvbnMgdG8gdGhlXG4gKiBjbGFzcyAobGlrZSBhZGRpbmcgZmllbGRzIG9yIHR5cGUgZGVjbGFyYXRpb25zKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYWl0Q29tcGlsZXIgaW1wbGVtZW50cyBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciB7XG4gIC8qKlxuICAgKiBNYXBzIGNsYXNzIGRlY2xhcmF0aW9ucyB0byB0aGVpciBgQ2xhc3NSZWNvcmRgLCB3aGljaCB0cmFja3MgdGhlIEl2eSB0cmFpdHMgYmVpbmcgYXBwbGllZCB0b1xuICAgKiB0aG9zZSBjbGFzc2VzLlxuICAgKi9cbiAgcHJpdmF0ZSBjbGFzc2VzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc1JlY29yZD4oKTtcblxuICAvKipcbiAgICogTWFwcyBzb3VyY2UgZmlsZXMgdG8gYW55IGNsYXNzIGRlY2xhcmF0aW9uKHMpIHdpdGhpbiB0aGVtIHdoaWNoIGhhdmUgYmVlbiBkaXNjb3ZlcmVkIHRvIGNvbnRhaW5cbiAgICogSXZ5IHRyYWl0cy5cbiAgICovXG4gIHByb3RlY3RlZCBmaWxlVG9DbGFzc2VzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG5cbiAgcHJpdmF0ZSByZWV4cG9ydE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4oKTtcblxuICBwcml2YXRlIGhhbmRsZXJzQnlOYW1lID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj4+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10sXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpbmNyZW1lbnRhbEJ1aWxkOiBJbmNyZW1lbnRhbEJ1aWxkPENsYXNzUmVjb3JkLCB1bmtub3duPixcbiAgICAgIHByaXZhdGUgY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlczogYm9vbGVhbiwgcHJpdmF0ZSBjb21waWxhdGlvbk1vZGU6IENvbXBpbGF0aW9uTW9kZSxcbiAgICAgIHByaXZhdGUgZHRzVHJhbnNmb3JtczogRHRzVHJhbnNmb3JtUmVnaXN0cnkpIHtcbiAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaGFuZGxlcnMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnNCeU5hbWUuc2V0KGhhbmRsZXIubmFtZSwgaGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZVN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLmFuYWx5emUoc2YsIGZhbHNlKTtcbiAgfVxuXG4gIGFuYWx5emVBc3luYyhzZjogdHMuU291cmNlRmlsZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5hbmFseXplKHNmLCB0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogZmFsc2UpOiB2b2lkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IHRydWUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIC8vIFdlIHNob3VsZG4ndCBhbmFseXplIGRlY2xhcmF0aW9uIGZpbGVzLlxuICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBhbmFseXplKCkgcmVhbGx5IHdhbnRzIHRvIHJldHVybiBgUHJvbWlzZTx2b2lkPnx2b2lkYCwgYnV0IFR5cGVTY3JpcHQgY2Fubm90IG5hcnJvdyBhIHJldHVyblxuICAgIC8vIHR5cGUgb2YgJ3ZvaWQnLCBzbyBgdW5kZWZpbmVkYCBpcyB1c2VkIGluc3RlYWQuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgcHJpb3JXb3JrID0gdGhpcy5pbmNyZW1lbnRhbEJ1aWxkLnByaW9yV29ya0ZvcihzZik7XG4gICAgaWYgKHByaW9yV29yayAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBwcmlvclJlY29yZCBvZiBwcmlvcldvcmspIHtcbiAgICAgICAgdGhpcy5hZG9wdChwcmlvclJlY29yZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdGhlIHJlc3Qgb2YgYW5hbHlzaXMsIGFzIHRoaXMgZmlsZSdzIHByaW9yIHRyYWl0cyBhcmUgYmVpbmcgcmV1c2VkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIGlmICh0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG5vZGUpKSB7XG4gICAgICAgIHRoaXMuYW5hbHl6ZUNsYXNzKG5vZGUsIHByZWFuYWx5emUgPyBwcm9taXNlcyA6IG51bGwpO1xuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuXG4gICAgdmlzaXQoc2YpO1xuXG4gICAgaWYgKHByZWFuYWx5emUgJiYgcHJvbWlzZXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpID0+IHVuZGVmaW5lZCBhcyB2b2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZWNvcmRGb3IoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc1JlY29yZHxudWxsIHtcbiAgICBpZiAodGhpcy5jbGFzc2VzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZHNGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCByZWNvcmRzOiBDbGFzc1JlY29yZFtdID0gW107XG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEpIHtcbiAgICAgIHJlY29yZHMucHVzaCh0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSEpO1xuICAgIH1cbiAgICByZXR1cm4gcmVjb3JkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBvcnQgYSBgQ2xhc3NSZWNvcmRgIGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVHJhaXRzIGZyb20gdGhlIGBDbGFzc1JlY29yZGAgaGF2ZSBhY2N1cmF0ZSBtZXRhZGF0YSwgYnV0IHRoZSBgaGFuZGxlcmAgaXMgZnJvbSB0aGUgb2xkIHByb2dyYW1cbiAgICogYW5kIG5lZWRzIHRvIGJlIHVwZGF0ZWQgKG1hdGNoaW5nIGlzIGRvbmUgYnkgbmFtZSkuIEEgbmV3IHBlbmRpbmcgdHJhaXQgaXMgY3JlYXRlZCBhbmQgdGhlblxuICAgKiB0cmFuc2l0aW9uZWQgdG8gYW5hbHl6ZWQgdXNpbmcgdGhlIHByZXZpb3VzIGFuYWx5c2lzLiBJZiB0aGUgdHJhaXQgaXMgaW4gdGhlIGVycm9yZWQgc3RhdGUsXG4gICAqIGluc3RlYWQgdGhlIGVycm9ycyBhcmUgY29waWVkIG92ZXIuXG4gICAqL1xuICBwcml2YXRlIGFkb3B0KHByaW9yUmVjb3JkOiBDbGFzc1JlY29yZCk6IHZvaWQge1xuICAgIGNvbnN0IHJlY29yZDogQ2xhc3NSZWNvcmQgPSB7XG4gICAgICBoYXNQcmltYXJ5SGFuZGxlcjogcHJpb3JSZWNvcmQuaGFzUHJpbWFyeUhhbmRsZXIsXG4gICAgICBoYXNXZWFrSGFuZGxlcnM6IHByaW9yUmVjb3JkLmhhc1dlYWtIYW5kbGVycyxcbiAgICAgIG1ldGFEaWFnbm9zdGljczogcHJpb3JSZWNvcmQubWV0YURpYWdub3N0aWNzLFxuICAgICAgbm9kZTogcHJpb3JSZWNvcmQubm9kZSxcbiAgICAgIHRyYWl0czogW10sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgcHJpb3JUcmFpdCBvZiBwcmlvclJlY29yZC50cmFpdHMpIHtcbiAgICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLmhhbmRsZXJzQnlOYW1lLmdldChwcmlvclRyYWl0LmhhbmRsZXIubmFtZSkhO1xuICAgICAgbGV0IHRyYWl0OiBUcmFpdDx1bmtub3duLCB1bmtub3duLCB1bmtub3duPiA9IFRyYWl0LnBlbmRpbmcoaGFuZGxlciwgcHJpb3JUcmFpdC5kZXRlY3RlZCk7XG5cbiAgICAgIGlmIChwcmlvclRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLkFOQUxZWkVEIHx8IHByaW9yVHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuUkVTT0xWRUQpIHtcbiAgICAgICAgdHJhaXQgPSB0cmFpdC50b0FuYWx5emVkKHByaW9yVHJhaXQuYW5hbHlzaXMpO1xuICAgICAgICBpZiAodHJhaXQuaGFuZGxlci5yZWdpc3RlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdHJhaXQuaGFuZGxlci5yZWdpc3RlcihyZWNvcmQubm9kZSwgdHJhaXQuYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHByaW9yVHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuU0tJUFBFRCkge1xuICAgICAgICB0cmFpdCA9IHRyYWl0LnRvU2tpcHBlZCgpO1xuICAgICAgfSBlbHNlIGlmIChwcmlvclRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLkVSUk9SRUQpIHtcbiAgICAgICAgdHJhaXQgPSB0cmFpdC50b0Vycm9yZWQocHJpb3JUcmFpdC5kaWFnbm9zdGljcyk7XG4gICAgICB9XG5cbiAgICAgIHJlY29yZC50cmFpdHMucHVzaCh0cmFpdCk7XG4gICAgfVxuXG4gICAgdGhpcy5jbGFzc2VzLnNldChyZWNvcmQubm9kZSwgcmVjb3JkKTtcbiAgICBjb25zdCBzZiA9IHJlY29yZC5ub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoIXRoaXMuZmlsZVRvQ2xhc3Nlcy5oYXMoc2YpKSB7XG4gICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuc2V0KHNmLCBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCkpO1xuICAgIH1cbiAgICB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEuYWRkKHJlY29yZC5ub2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkNsYXNzRm9yVHJhaXRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFBlbmRpbmdUcmFpdDx1bmtub3duLCB1bmtub3duLCB1bmtub3duPltdfG51bGwge1xuICAgIGlmICghdGhpcy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICYmICFpc0V4cG9ydGVkKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGNsYXp6KTtcblxuICAgIHJldHVybiB0aGlzLmRldGVjdFRyYWl0cyhjbGF6eiwgZGVjb3JhdG9ycyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZGV0ZWN0VHJhaXRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTpcbiAgICAgIFBlbmRpbmdUcmFpdDx1bmtub3duLCB1bmtub3duLCB1bmtub3duPltdfG51bGwge1xuICAgIGxldCByZWNvcmQ6IENsYXNzUmVjb3JkfG51bGwgPSB0aGlzLnJlY29yZEZvcihjbGF6eik7XG4gICAgbGV0IGZvdW5kVHJhaXRzOiBQZW5kaW5nVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIuZGV0ZWN0KGNsYXp6LCBkZWNvcmF0b3JzKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNQcmltYXJ5SGFuZGxlciA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGNvbnN0IGlzV2Vha0hhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUs7XG4gICAgICBjb25zdCB0cmFpdCA9IFRyYWl0LnBlbmRpbmcoaGFuZGxlciwgcmVzdWx0KTtcblxuICAgICAgZm91bmRUcmFpdHMucHVzaCh0cmFpdCk7XG5cbiAgICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIHBhdGggaXMgYSBmYXN0IHBhdGggdGhyb3VnaCB3aGljaFxuICAgICAgICAvLyBtb3N0IGNsYXNzZXMgd2lsbCBmbG93LlxuICAgICAgICByZWNvcmQgPSB7XG4gICAgICAgICAgbm9kZTogY2xhenosXG4gICAgICAgICAgdHJhaXRzOiBbdHJhaXRdLFxuICAgICAgICAgIG1ldGFEaWFnbm9zdGljczogbnVsbCxcbiAgICAgICAgICBoYXNQcmltYXJ5SGFuZGxlcjogaXNQcmltYXJ5SGFuZGxlcixcbiAgICAgICAgICBoYXNXZWFrSGFuZGxlcnM6IGlzV2Vha0hhbmRsZXIsXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jbGFzc2VzLnNldChjbGF6eiwgcmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2YgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuc2V0KHNmLCBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpIS5hZGQoY2xhenopO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhdCBsZWFzdCB0aGUgc2Vjb25kIGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBpcyBhIHNsb3dlciBwYXRoIHRoYXQgc29tZVxuICAgICAgICAvLyBjbGFzc2VzIHdpbGwgZ28gdGhyb3VnaCwgd2hpY2ggdmFsaWRhdGVzIHRoYXQgdGhlIHNldCBvZiBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlIGNsYXNzXG4gICAgICAgIC8vIGlzIHZhbGlkLlxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGFjY29yZGluZyB0byBydWxlcyBhcyBmb2xsb3dzOlxuICAgICAgICAvL1xuICAgICAgICAvLyAqIFdFQUsgaGFuZGxlcnMgYXJlIHJlbW92ZWQgaWYgYSBub24tV0VBSyBoYW5kbGVyIG1hdGNoZXMuXG4gICAgICAgIC8vICogT25seSBvbmUgUFJJTUFSWSBoYW5kbGVyIGNhbiBtYXRjaCBhdCBhIHRpbWUuIEFueSBvdGhlciBQUklNQVJZIGhhbmRsZXIgbWF0Y2hpbmcgYVxuICAgICAgICAvLyAgIGNsYXNzIHdpdGggYW4gZXhpc3RpbmcgUFJJTUFSWSBoYW5kbGVyIGlzIGFuIGVycm9yLlxuXG4gICAgICAgIGlmICghaXNXZWFrSGFuZGxlciAmJiByZWNvcmQuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBub3QgYSBXRUFLIGhhbmRsZXIsIGJ1dCB0aGUgY2xhc3MgaGFzIG90aGVyIFdFQUsgaGFuZGxlcnMuXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZW0uXG4gICAgICAgICAgcmVjb3JkLnRyYWl0cyA9XG4gICAgICAgICAgICAgIHJlY29yZC50cmFpdHMuZmlsdGVyKGZpZWxkID0+IGZpZWxkLmhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSyk7XG4gICAgICAgICAgcmVjb3JkLmhhc1dlYWtIYW5kbGVycyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzV2Vha0hhbmRsZXIgJiYgIXJlY29yZC5oYXNXZWFrSGFuZGxlcnMpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBoYW5kbGVyIGlzIGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBub24tV0VBSyBoYW5kbGVycyBhbHJlYWR5LlxuICAgICAgICAgIC8vIERyb3AgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzUHJpbWFyeUhhbmRsZXIgJiYgcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyKSB7XG4gICAgICAgICAgLy8gVGhlIGNsYXNzIGFscmVhZHkgaGFzIGEgUFJJTUFSWSBoYW5kbGVyLCBhbmQgYW5vdGhlciBvbmUganVzdCBtYXRjaGVkLlxuICAgICAgICAgIHJlY29yZC5tZXRhRGlhZ25vc3RpY3MgPSBbe1xuICAgICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICAgIGNvZGU6IE51bWJlcignLTk5JyArIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OKSxcbiAgICAgICAgICAgIGZpbGU6IGdldFNvdXJjZUZpbGUoY2xhenopLFxuICAgICAgICAgICAgc3RhcnQ6IGNsYXp6LmdldFN0YXJ0KHVuZGVmaW5lZCwgZmFsc2UpLFxuICAgICAgICAgICAgbGVuZ3RoOiBjbGF6ei5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWVzc2FnZVRleHQ6ICdUd28gaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gY2xhc3MnLFxuICAgICAgICAgIH1dO1xuICAgICAgICAgIHJlY29yZC50cmFpdHMgPSBmb3VuZFRyYWl0cyA9IFtdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpdCdzIHNhZmUgdG8gYWNjZXB0IHRoZSBtdWx0aXBsZSBkZWNvcmF0b3JzIGhlcmUuIFVwZGF0ZSBzb21lIG9mIHRoZSBtZXRhZGF0YVxuICAgICAgICAvLyByZWdhcmRpbmcgdGhpcyBjbGFzcy5cbiAgICAgICAgcmVjb3JkLnRyYWl0cy5wdXNoKHRyYWl0KTtcbiAgICAgICAgcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyID0gcmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyIHx8IGlzUHJpbWFyeUhhbmRsZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZvdW5kVHJhaXRzLmxlbmd0aCA+IDAgPyBmb3VuZFRyYWl0cyA6IG51bGw7XG4gIH1cblxuICBwcm90ZWN0ZWQgYW5hbHl6ZUNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBwcmVhbmFseXplUXVldWU6IFByb21pc2U8dm9pZD5bXXxudWxsKTogdm9pZCB7XG4gICAgY29uc3QgdHJhaXRzID0gdGhpcy5zY2FuQ2xhc3NGb3JUcmFpdHMoY2xhenopO1xuXG4gICAgaWYgKHRyYWl0cyA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUgYXJlIG5vIEl2eSB0cmFpdHMgb24gdGhlIGNsYXNzLCBzbyBpdCBjYW4gc2FmZWx5IGJlIHNraXBwZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiB0cmFpdHMpIHtcbiAgICAgIGNvbnN0IGFuYWx5emUgPSAoKSA9PiB0aGlzLmFuYWx5emVUcmFpdChjbGF6eiwgdHJhaXQpO1xuXG4gICAgICBsZXQgcHJlYW5hbHlzaXM6IFByb21pc2U8dm9pZD58bnVsbCA9IG51bGw7XG4gICAgICBpZiAocHJlYW5hbHl6ZVF1ZXVlICE9PSBudWxsICYmIHRyYWl0LmhhbmRsZXIucHJlYW5hbHl6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEF0dGVtcHQgdG8gcnVuIHByZWFuYWx5c2lzLiBUaGlzIGNvdWxkIGZhaWwgd2l0aCBhIGBGYXRhbERpYWdub3N0aWNFcnJvcmA7IGNhdGNoIGl0IGlmIGl0XG4gICAgICAgIC8vIGRvZXMuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcHJlYW5hbHlzaXMgPSB0cmFpdC5oYW5kbGVyLnByZWFuYWx5emUoY2xhenosIHRyYWl0LmRldGVjdGVkLm1ldGFkYXRhKSB8fCBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgIHRyYWl0LnRvRXJyb3JlZChbZXJyLnRvRGlhZ25vc3RpYygpXSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChwcmVhbmFseXNpcyAhPT0gbnVsbCkge1xuICAgICAgICBwcmVhbmFseXplUXVldWUhLnB1c2gocHJlYW5hbHlzaXMudGhlbihhbmFseXplKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbmFseXplKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVUcmFpdChcbiAgICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCB0cmFpdDogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj4sXG4gICAgICBmbGFncz86IEhhbmRsZXJGbGFncyk6IHZvaWQge1xuICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5QRU5ESU5HKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gYW5hbHl6ZSB0cmFpdCBvZiAke2NsYXp6Lm5hbWUudGV4dH0gaW4gc3RhdGUgJHtcbiAgICAgICAgICBUcmFpdFN0YXRlW3RyYWl0LnN0YXRlXX0gKGV4cGVjdGVkIERFVEVDVEVEKWApO1xuICAgIH1cblxuICAgIC8vIEF0dGVtcHQgYW5hbHlzaXMuIFRoaXMgY291bGQgZmFpbCB3aXRoIGEgYEZhdGFsRGlhZ25vc3RpY0Vycm9yYDsgY2F0Y2ggaXQgaWYgaXQgZG9lcy5cbiAgICBsZXQgcmVzdWx0OiBBbmFseXNpc091dHB1dDx1bmtub3duPjtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gdHJhaXQuaGFuZGxlci5hbmFseXplKGNsYXp6LCB0cmFpdC5kZXRlY3RlZC5tZXRhZGF0YSwgZmxhZ3MpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEZhdGFsRGlhZ25vc3RpY0Vycm9yKSB7XG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9FcnJvcmVkKFtlcnIudG9EaWFnbm9zdGljKCldKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyZXN1bHQuZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHJhaXQgPSB0cmFpdC50b0Vycm9yZWQocmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICB9IGVsc2UgaWYgKHJlc3VsdC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBBbmFseXNpcyB3YXMgc3VjY2Vzc2Z1bC4gVHJpZ2dlciByZWdpc3RyYXRpb24uXG4gICAgICBpZiAodHJhaXQuaGFuZGxlci5yZWdpc3RlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIoY2xhenosIHJlc3VsdC5hbmFseXNpcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFN1Y2Nlc3NmdWxseSBhbmFseXplZCBhbmQgcmVnaXN0ZXJlZC5cbiAgICAgIHRyYWl0ID0gdHJhaXQudG9BbmFseXplZChyZXN1bHQuYW5hbHlzaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cmFpdCA9IHRyYWl0LnRvU2tpcHBlZCgpO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmUoKTogdm9pZCB7XG4gICAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmZyb20odGhpcy5jbGFzc2VzLmtleXMoKSk7XG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiBjbGFzc2VzKSB7XG4gICAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgICBmb3IgKGxldCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0cmFpdC5oYW5kbGVyO1xuICAgICAgICBzd2l0Y2ggKHRyYWl0LnN0YXRlKSB7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlNLSVBQRUQ6XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLkVSUk9SRUQ6XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICBjYXNlIFRyYWl0U3RhdGUuUEVORElORzpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVzb2x2aW5nIGEgdHJhaXQgdGhhdCBoYXNuJ3QgYmVlbiBhbmFseXplZDogJHtjbGF6ei5uYW1lLnRleHR9IC8gJHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YodHJhaXQuaGFuZGxlcikuY29uc3RydWN0b3IubmFtZX1gKTtcbiAgICAgICAgICBjYXNlIFRyYWl0U3RhdGUuUkVTT0xWRUQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlc29sdmluZyBhbiBhbHJlYWR5IHJlc29sdmVkIHRyYWl0YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlci5yZXNvbHZlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBObyByZXNvbHV0aW9uIG9mIHRoaXMgdHJhaXQgbmVlZGVkIC0gaXQncyBjb25zaWRlcmVkIHN1Y2Nlc3NmdWwgYnkgZGVmYXVsdC5cbiAgICAgICAgICB0cmFpdCA9IHRyYWl0LnRvUmVzb2x2ZWQobnVsbCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmVzdWx0OiBSZXNvbHZlUmVzdWx0PHVua25vd24+O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZXIucmVzb2x2ZShjbGF6eiwgdHJhaXQuYW5hbHlzaXMgYXMgUmVhZG9ubHk8dW5rbm93bj4pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9FcnJvcmVkKFtlcnIudG9EaWFnbm9zdGljKCldKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkICYmIHJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdHJhaXQgPSB0cmFpdC50b0Vycm9yZWQocmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHQucmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGNsYXp6LmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgICAgICBpZiAoIXRoaXMucmVleHBvcnRNYXAuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5yZWV4cG9ydE1hcC5zZXQoZmlsZU5hbWUsIG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPigpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZmlsZVJlZXhwb3J0cyA9IHRoaXMucmVleHBvcnRNYXAuZ2V0KGZpbGVOYW1lKSE7XG4gICAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZXN1bHQucmVleHBvcnRzKSB7XG4gICAgICAgICAgICBmaWxlUmVleHBvcnRzLnNldChyZWV4cG9ydC5hc0FsaWFzLCBbcmVleHBvcnQuZnJvbU1vZHVsZSwgcmVleHBvcnQuc3ltYm9sTmFtZV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgaW50byB0aGUgYFR5cGVDaGVja0NvbnRleHRgIGZvciBhbnkgY29tcG9uZW50cyB3aXRoaW4gdGhlIGdpdmVuXG4gICAqIGB0cy5Tb3VyY2VGaWxlYC5cbiAgICovXG4gIHR5cGVDaGVjayhzZjogdHMuU291cmNlRmlsZSwgY3R4OiBUeXBlQ2hlY2tDb250ZXh0KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmZpbGVUb0NsYXNzZXMuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5maWxlVG9DbGFzc2VzLmdldChzZikhKSB7XG4gICAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSE7XG4gICAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgICAgaWYgKHRyYWl0LnN0YXRlICE9PSBUcmFpdFN0YXRlLlJFU09MVkVEKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHJhaXQuaGFuZGxlci50eXBlQ2hlY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRyYWl0LmhhbmRsZXIudHlwZUNoZWNrKGN0eCwgY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbmRleChjdHg6IEluZGV4aW5nQ29udGV4dCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5jbGFzc2VzLmtleXMoKSkge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICAgIC8vIFNraXAgdHJhaXRzIHRoYXQgaGF2ZW4ndCBiZWVuIHJlc29sdmVkIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFpdC5oYW5kbGVyLmluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBTa2lwIHRyYWl0cyB0aGF0IGRvbid0IGFmZmVjdCBpbmRleGluZy5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWl0LmhhbmRsZXIuaW5kZXgoY3R4LCBjbGF6eiwgdHJhaXQuYW5hbHlzaXMsIHRyYWl0LnJlc29sdXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGUoY2xheno6IERlY2xhcmF0aW9uTm9kZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W118bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY2xhenopIGFzIHR5cGVvZiBjbGF6ejtcbiAgICBpZiAoIXRoaXMucmVmbGVjdG9yLmlzQ2xhc3MoY2xhenopIHx8ICF0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG9yaWdpbmFsKSB8fFxuICAgICAgICAhdGhpcy5jbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQob3JpZ2luYWwpITtcblxuICAgIGxldCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUkVTT0xWRUQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbXBpbGVTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdjb21waWxlQ2xhc3MnLCBvcmlnaW5hbCk7XG5cbiAgICAgIGxldCBjb21waWxlUmVzOiBDb21waWxlUmVzdWx0fENvbXBpbGVSZXN1bHRbXTtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uTW9kZSA9PT0gQ29tcGlsYXRpb25Nb2RlLlBBUlRJQUwgJiZcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLmNvbXBpbGVQYXJ0aWFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29tcGlsZVJlcyA9IHRyYWl0LmhhbmRsZXIuY29tcGlsZVBhcnRpYWwoY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGVSZXMgPVxuICAgICAgICAgICAgdHJhaXQuaGFuZGxlci5jb21waWxlRnVsbChjbGF6eiwgdHJhaXQuYW5hbHlzaXMsIHRyYWl0LnJlc29sdXRpb24sIGNvbnN0YW50UG9vbCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbXBpbGVNYXRjaFJlcyA9IGNvbXBpbGVSZXM7XG4gICAgICB0aGlzLnBlcmYuc3RvcChjb21waWxlU3Bhbik7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjb21waWxlTWF0Y2hSZXMpKSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGNvbXBpbGVNYXRjaFJlcykge1xuICAgICAgICAgIGlmICghcmVzLnNvbWUociA9PiByLm5hbWUgPT09IHJlc3VsdC5uYW1lKSkge1xuICAgICAgICAgICAgcmVzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXJlcy5zb21lKHJlc3VsdCA9PiByZXN1bHQubmFtZSA9PT0gY29tcGlsZU1hdGNoUmVzLm5hbWUpKSB7XG4gICAgICAgIHJlcy5wdXNoKGNvbXBpbGVNYXRjaFJlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTG9vayB1cCB0aGUgLmQudHMgdHJhbnNmb3JtZXIgZm9yIHRoZSBpbnB1dCBmaWxlIGFuZCByZWNvcmQgdGhhdCBhdCBsZWFzdCBvbmUgZmllbGQgd2FzXG4gICAgLy8gZ2VuZXJhdGVkLCB3aGljaCB3aWxsIGFsbG93IHRoZSAuZC50cyB0byBiZSB0cmFuc2Zvcm1lZCBsYXRlci5cbiAgICB0aGlzLmR0c1RyYW5zZm9ybXMuZ2V0SXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm0ob3JpZ2luYWwuZ2V0U291cmNlRmlsZSgpKVxuICAgICAgICAuYWRkRmllbGRzKG9yaWdpbmFsLCByZXMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSBpbnN0cnVjdGlvbiB0byB0aGUgdHJhbnNmb3JtZXIgc28gdGhlIGZpZWxkcyB3aWxsIGJlIGFkZGVkLlxuICAgIHJldHVybiByZXMubGVuZ3RoID4gMCA/IHJlcyA6IG51bGw7XG4gIH1cblxuICBkZWNvcmF0b3JzRm9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjb3JhdG9yW10ge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlO1xuICAgIGlmICghdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhvcmlnaW5hbCkgfHwgIXRoaXMuY2xhc3Nlcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChvcmlnaW5hbCkhO1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIgIT09IG51bGwgJiYgdHMuaXNEZWNvcmF0b3IodHJhaXQuZGV0ZWN0ZWQudHJpZ2dlcikpIHtcbiAgICAgICAgZGVjb3JhdG9ycy5wdXNoKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuY2xhc3Nlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopITtcbiAgICAgIGlmIChyZWNvcmQubWV0YURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucmVjb3JkLm1ldGFEaWFnbm9zdGljcyk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgICAgaWYgKHRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLkVSUk9SRUQpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRyYWl0LmRpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXQgZXhwb3J0U3RhdGVtZW50cygpOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4ge1xuICAgIHJldHVybiB0aGlzLnJlZXhwb3J0TWFwO1xuICB9XG59XG4iXX0=