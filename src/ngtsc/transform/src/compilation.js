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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBa0U7SUFNbEUsa0ZBQW9FO0lBRXBFLHlFQUF1STtJQUV2SSw2RUFBd0Q7SUFxQ3hEOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQWlCRSx1QkFDWSxRQUF1RCxFQUN2RCxTQUF5QixFQUFVLElBQWtCLEVBQ3JELGdCQUF3RCxFQUN4RCx5QkFBa0MsRUFBVSxlQUFnQyxFQUM1RSxhQUFtQzs7WUFKbkMsYUFBUSxHQUFSLFFBQVEsQ0FBK0M7WUFDdkQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQ3JELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0M7WUFDeEQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFTO1lBQVUsb0JBQWUsR0FBZixlQUFlLENBQWlCO1lBQzVFLGtCQUFhLEdBQWIsYUFBYSxDQUFzQjtZQXJCL0M7OztlQUdHO1lBQ0ssWUFBTyxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBRTNEOzs7ZUFHRztZQUNPLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUM7WUFFbEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUUvRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUF1RCxDQUFDOztnQkFRdEYsS0FBc0IsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTtvQkFBM0IsSUFBTSxPQUFPLHFCQUFBO29CQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FB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Q0FBQSxnQkFBQSw0QkFBRTt3QkFBcEMsSUFBTSxLQUFLLFdBQUE7d0JBQ2QsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7d0JBQ3hDLElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxJQUFJLEVBQUU7NEJBQ25DLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsTUFBTSxDQUFDLGVBQWUsR0FBRTt5QkFDN0M7OzRCQUNELEtBQW9CLElBQUEscUJBQUEsaUJBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQSxDQUFBLGdCQUFBLDRCQUFFO2dDQUE5QixJQUFNLEtBQUssV0FBQTtnQ0FDZCxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssa0JBQVUsQ0FBQyxPQUFPLEVBQUU7b0NBQ3RDLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsS0FBSyxDQUFDLFdBQVcsR0FBRTtpQ0FDeEM7NkJBQ0Y7Ozs7Ozs7OztxQkFDRjs7Ozs7Ozs7O2dCQUNELE9BQU8sV0FBVyxDQUFDO1lBQ3JCLENBQUM7OztXQUFBO1FBRUQsc0JBQUksMkNBQWdCO2lCQUFwQjtnQkFDRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDMUIsQ0FBQzs7O1dBQUE7UUFDSCxvQkFBQztJQUFELENBQUMsQUF0ZUQsSUFzZUM7SUF0ZVksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7UGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1Byb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZSwgaXNFeHBvcnRlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGF0aW9uTW9kZSwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNUcmFuc2Zvcm1SZWdpc3RyeX0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5pbXBvcnQge1BlbmRpbmdUcmFpdCwgVHJhaXQsIFRyYWl0U3RhdGV9IGZyb20gJy4vdHJhaXQnO1xuXG5cbi8qKlxuICogUmVjb3JkcyBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIGNsYXNzIHRoYXQgaGFzIG1hdGNoZWQgdHJhaXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzUmVjb3JkIHtcbiAgLyoqXG4gICAqIFRoZSBgQ2xhc3NEZWNsYXJhdGlvbmAgb2YgdGhlIGNsYXNzIHdoaWNoIGhhcyBBbmd1bGFyIHRyYWl0cyBhcHBsaWVkLlxuICAgKi9cbiAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjtcblxuICAvKipcbiAgICogQWxsIHRyYWl0cyB3aGljaCBtYXRjaGVkIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHRyYWl0czogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXTtcblxuICAvKipcbiAgICogTWV0YS1kaWFnbm9zdGljcyBhYm91dCB0aGUgY2xhc3MsIHdoaWNoIGFyZSB1c3VhbGx5IHJlbGF0ZWQgdG8gd2hldGhlciBjZXJ0YWluIGNvbWJpbmF0aW9ucyBvZlxuICAgKiBBbmd1bGFyIGRlY29yYXRvcnMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAqL1xuICBtZXRhRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsO1xuXG4gIC8vIFN1YnNlcXVlbnQgZmllbGRzIGFyZSBcImludGVybmFsXCIgYW5kIHVzZWQgZHVyaW5nIHRoZSBtYXRjaGluZyBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzLiBUaGlzIGlzXG4gIC8vIG11dGFibGUgc3RhdGUgZHVyaW5nIHRoZSBgZGV0ZWN0YC9gYW5hbHl6ZWAgcGhhc2VzIG9mIGNvbXBpbGF0aW9uLlxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIHRyYWl0cyBtYXRjaGVkIGZyb20gYERlY29yYXRvckhhbmRsZXJgcyBtYXJrZWQgYXMgYFdFQUtgLlxuICAgKi9cbiAgaGFzV2Vha0hhbmRsZXJzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIGEgdHJhaXQgZnJvbSBhIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVkIGFzIGBQUklNQVJZYC5cbiAgICovXG4gIGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiBBbmd1bGFyIGNvbXBpbGF0aW9uLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3NpbmcgYWxsIGNsYXNzZXMgaW4gdGhlIHByb2dyYW0uIEFueSB0aW1lIGFcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVzIGEgY2xhc3MsIGEgXCJ0cmFpdFwiIGlzIGNyZWF0ZWQgdG8gcmVwcmVzZW50IHRoYXQgQW5ndWxhciBhc3BlY3Qgb2YgdGhlXG4gKiBjbGFzcyAoc3VjaCBhcyB0aGUgY2xhc3MgaGF2aW5nIGEgY29tcG9uZW50IGRlZmluaXRpb24pLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgdHJhbnNpdGlvbnMgZWFjaCB0cmFpdCB0aHJvdWdoIHRoZSB2YXJpb3VzIHBoYXNlcyBvZiBjb21waWxhdGlvbiwgY3VsbWluYXRpbmdcbiAqIGluIHRoZSBwcm9kdWN0aW9uIG9mIGBDb21waWxlUmVzdWx0YHMgaW5zdHJ1Y3RpbmcgdGhlIGNvbXBpbGVyIHRvIGFwcGx5IHZhcmlvdXMgbXV0YXRpb25zIHRvIHRoZVxuICogY2xhc3MgKGxpa2UgYWRkaW5nIGZpZWxkcyBvciB0eXBlIGRlY2xhcmF0aW9ucykuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFpdENvbXBpbGVyIGltcGxlbWVudHMgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIge1xuICAvKipcbiAgICogTWFwcyBjbGFzcyBkZWNsYXJhdGlvbnMgdG8gdGhlaXIgYENsYXNzUmVjb3JkYCwgd2hpY2ggdHJhY2tzIHRoZSBJdnkgdHJhaXRzIGJlaW5nIGFwcGxpZWQgdG9cbiAgICogdGhvc2UgY2xhc3Nlcy5cbiAgICovXG4gIHByaXZhdGUgY2xhc3NlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NSZWNvcmQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcHMgc291cmNlIGZpbGVzIHRvIGFueSBjbGFzcyBkZWNsYXJhdGlvbihzKSB3aXRoaW4gdGhlbSB3aGljaCBoYXZlIGJlZW4gZGlzY292ZXJlZCB0byBjb250YWluXG4gICAqIEl2eSB0cmFpdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmlsZVRvQ2xhc3NlcyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgU2V0PENsYXNzRGVjbGFyYXRpb24+PigpO1xuXG4gIHByaXZhdGUgcmVleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+KCk7XG5cbiAgcHJpdmF0ZSBoYW5kbGVyc0J5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+PigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCB1bmtub3duPltdLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgaW5jcmVtZW50YWxCdWlsZDogSW5jcmVtZW50YWxCdWlsZDxDbGFzc1JlY29yZCwgdW5rbm93bj4sXG4gICAgICBwcml2YXRlIGNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXM6IGJvb2xlYW4sIHByaXZhdGUgY29tcGlsYXRpb25Nb2RlOiBDb21waWxhdGlvbk1vZGUsXG4gICAgICBwcml2YXRlIGR0c1RyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5KSB7XG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGhhbmRsZXJzKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzQnlOYW1lLnNldChoYW5kbGVyLm5hbWUsIGhhbmRsZXIpO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVTeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgdGhpcy5hbmFseXplKHNmLCBmYWxzZSk7XG4gIH1cblxuICBhbmFseXplQXN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgdHJ1ZSk7XG4gIH1cblxuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGZhbHNlKTogdm9pZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiB0cnVlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBXZSBzaG91bGRuJ3QgYW5hbHl6ZSBkZWNsYXJhdGlvbiBmaWxlcy5cbiAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gYW5hbHl6ZSgpIHJlYWxseSB3YW50cyB0byByZXR1cm4gYFByb21pc2U8dm9pZD58dm9pZGAsIGJ1dCBUeXBlU2NyaXB0IGNhbm5vdCBuYXJyb3cgYSByZXR1cm5cbiAgICAvLyB0eXBlIG9mICd2b2lkJywgc28gYHVuZGVmaW5lZGAgaXMgdXNlZCBpbnN0ZWFkLlxuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcblxuICAgIGNvbnN0IHByaW9yV29yayA9IHRoaXMuaW5jcmVtZW50YWxCdWlsZC5wcmlvcldvcmtGb3Ioc2YpO1xuICAgIGlmIChwcmlvcldvcmsgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgcHJpb3JSZWNvcmQgb2YgcHJpb3JXb3JrKSB7XG4gICAgICAgIHRoaXMuYWRvcHQocHJpb3JSZWNvcmQpO1xuICAgICAgfVxuXG4gICAgICAvLyBTa2lwIHRoZSByZXN0IG9mIGFuYWx5c2lzLCBhcyB0aGlzIGZpbGUncyBwcmlvciB0cmFpdHMgYXJlIGJlaW5nIHJldXNlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB2aXNpdCA9IChub2RlOiB0cy5Ob2RlKTogdm9pZCA9PiB7XG4gICAgICBpZiAodGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhub2RlKSkge1xuICAgICAgICB0aGlzLmFuYWx5emVDbGFzcyhub2RlLCBwcmVhbmFseXplID8gcHJvbWlzZXMgOiBudWxsKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQgYXMgdm9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkRm9yKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NSZWNvcmR8bnVsbCB7XG4gICAgaWYgKHRoaXMuY2xhc3Nlcy5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICByZWNvcmRzRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogQ2xhc3NSZWNvcmRbXXxudWxsIHtcbiAgICBpZiAoIXRoaXMuZmlsZVRvQ2xhc3Nlcy5oYXMoc2YpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcmVjb3JkczogQ2xhc3NSZWNvcmRbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgdGhpcy5maWxlVG9DbGFzc2VzLmdldChzZikhKSB7XG4gICAgICByZWNvcmRzLnB1c2godGhpcy5jbGFzc2VzLmdldChjbGF6eikhKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlY29yZHM7XG4gIH1cblxuICAvKipcbiAgICogSW1wb3J0IGEgYENsYXNzUmVjb3JkYCBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRyYWl0cyBmcm9tIHRoZSBgQ2xhc3NSZWNvcmRgIGhhdmUgYWNjdXJhdGUgbWV0YWRhdGEsIGJ1dCB0aGUgYGhhbmRsZXJgIGlzIGZyb20gdGhlIG9sZCBwcm9ncmFtXG4gICAqIGFuZCBuZWVkcyB0byBiZSB1cGRhdGVkIChtYXRjaGluZyBpcyBkb25lIGJ5IG5hbWUpLiBBIG5ldyBwZW5kaW5nIHRyYWl0IGlzIGNyZWF0ZWQgYW5kIHRoZW5cbiAgICogdHJhbnNpdGlvbmVkIHRvIGFuYWx5emVkIHVzaW5nIHRoZSBwcmV2aW91cyBhbmFseXNpcy4gSWYgdGhlIHRyYWl0IGlzIGluIHRoZSBlcnJvcmVkIHN0YXRlLFxuICAgKiBpbnN0ZWFkIHRoZSBlcnJvcnMgYXJlIGNvcGllZCBvdmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBhZG9wdChwcmlvclJlY29yZDogQ2xhc3NSZWNvcmQpOiB2b2lkIHtcbiAgICBjb25zdCByZWNvcmQ6IENsYXNzUmVjb3JkID0ge1xuICAgICAgaGFzUHJpbWFyeUhhbmRsZXI6IHByaW9yUmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyLFxuICAgICAgaGFzV2Vha0hhbmRsZXJzOiBwcmlvclJlY29yZC5oYXNXZWFrSGFuZGxlcnMsXG4gICAgICBtZXRhRGlhZ25vc3RpY3M6IHByaW9yUmVjb3JkLm1ldGFEaWFnbm9zdGljcyxcbiAgICAgIG5vZGU6IHByaW9yUmVjb3JkLm5vZGUsXG4gICAgICB0cmFpdHM6IFtdLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IHByaW9yVHJhaXQgb2YgcHJpb3JSZWNvcmQudHJhaXRzKSB7XG4gICAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5oYW5kbGVyc0J5TmFtZS5nZXQocHJpb3JUcmFpdC5oYW5kbGVyLm5hbWUpITtcbiAgICAgIGxldCB0cmFpdDogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj4gPSBUcmFpdC5wZW5kaW5nKGhhbmRsZXIsIHByaW9yVHJhaXQuZGV0ZWN0ZWQpO1xuXG4gICAgICBpZiAocHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5BTkFMWVpFRCB8fCBwcmlvclRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLlJFU09MVkVEKSB7XG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9BbmFseXplZChwcmlvclRyYWl0LmFuYWx5c2lzKTtcbiAgICAgICAgaWYgKHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIocmVjb3JkLm5vZGUsIHRyYWl0LmFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwcmlvclRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLlNLSVBQRUQpIHtcbiAgICAgICAgdHJhaXQgPSB0cmFpdC50b1NraXBwZWQoKTtcbiAgICAgIH0gZWxzZSBpZiAocHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5FUlJPUkVEKSB7XG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9FcnJvcmVkKHByaW9yVHJhaXQuZGlhZ25vc3RpY3MpO1xuICAgICAgfVxuXG4gICAgICByZWNvcmQudHJhaXRzLnB1c2godHJhaXQpO1xuICAgIH1cblxuICAgIHRoaXMuY2xhc3Nlcy5zZXQocmVjb3JkLm5vZGUsIHJlY29yZCk7XG4gICAgY29uc3Qgc2YgPSByZWNvcmQubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKCF0aGlzLmZpbGVUb0NsYXNzZXMuaGFzKHNmKSkge1xuICAgICAgdGhpcy5maWxlVG9DbGFzc2VzLnNldChzZiwgbmV3IFNldDxDbGFzc0RlY2xhcmF0aW9uPigpKTtcbiAgICB9XG4gICAgdGhpcy5maWxlVG9DbGFzc2VzLmdldChzZikhLmFkZChyZWNvcmQubm9kZSk7XG4gIH1cblxuICBwcml2YXRlIHNjYW5DbGFzc0ZvclRyYWl0cyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgICBQZW5kaW5nVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXXxudWxsIHtcbiAgICBpZiAoIXRoaXMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyAmJiAhaXNFeHBvcnRlZChjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihjbGF6eik7XG5cbiAgICByZXR1cm4gdGhpcy5kZXRlY3RUcmFpdHMoY2xhenosIGRlY29yYXRvcnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGRldGVjdFRyYWl0cyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6XG4gICAgICBQZW5kaW5nVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXXxudWxsIHtcbiAgICBsZXQgcmVjb3JkOiBDbGFzc1JlY29yZHxudWxsID0gdGhpcy5yZWNvcmRGb3IoY2xhenopO1xuICAgIGxldCBmb3VuZFRyYWl0czogUGVuZGluZ1RyYWl0PHVua25vd24sIHVua25vd24sIHVua25vd24+W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiB0aGlzLmhhbmRsZXJzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBoYW5kbGVyLmRldGVjdChjbGF6eiwgZGVjb3JhdG9ycyk7XG4gICAgICBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzUHJpbWFyeUhhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gICAgICBjb25zdCBpc1dlYWtIYW5kbGVyID0gaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLO1xuICAgICAgY29uc3QgdHJhaXQgPSBUcmFpdC5wZW5kaW5nKGhhbmRsZXIsIHJlc3VsdCk7XG5cbiAgICAgIGZvdW5kVHJhaXRzLnB1c2godHJhaXQpO1xuXG4gICAgICBpZiAocmVjb3JkID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBwYXRoIGlzIGEgZmFzdCBwYXRoIHRocm91Z2ggd2hpY2hcbiAgICAgICAgLy8gbW9zdCBjbGFzc2VzIHdpbGwgZmxvdy5cbiAgICAgICAgcmVjb3JkID0ge1xuICAgICAgICAgIG5vZGU6IGNsYXp6LFxuICAgICAgICAgIHRyYWl0czogW3RyYWl0XSxcbiAgICAgICAgICBtZXRhRGlhZ25vc3RpY3M6IG51bGwsXG4gICAgICAgICAgaGFzUHJpbWFyeUhhbmRsZXI6IGlzUHJpbWFyeUhhbmRsZXIsXG4gICAgICAgICAgaGFzV2Vha0hhbmRsZXJzOiBpc1dlYWtIYW5kbGVyLFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuY2xhc3Nlcy5zZXQoY2xhenosIHJlY29yZCk7XG4gICAgICAgIGNvbnN0IHNmID0gY2xhenouZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICBpZiAoIXRoaXMuZmlsZVRvQ2xhc3Nlcy5oYXMoc2YpKSB7XG4gICAgICAgICAgdGhpcy5maWxlVG9DbGFzc2VzLnNldChzZiwgbmV3IFNldDxDbGFzc0RlY2xhcmF0aW9uPigpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuZ2V0KHNmKSEuYWRkKGNsYXp6KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYXQgbGVhc3QgdGhlIHNlY29uZCBoYW5kbGVyIHRvIG1hdGNoIHRoaXMgY2xhc3MuIFRoaXMgaXMgYSBzbG93ZXIgcGF0aCB0aGF0IHNvbWVcbiAgICAgICAgLy8gY2xhc3NlcyB3aWxsIGdvIHRocm91Z2gsIHdoaWNoIHZhbGlkYXRlcyB0aGF0IHRoZSBzZXQgb2YgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZSBjbGFzc1xuICAgICAgICAvLyBpcyB2YWxpZC5cblxuICAgICAgICAvLyBWYWxpZGF0ZSBhY2NvcmRpbmcgdG8gcnVsZXMgYXMgZm9sbG93czpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gKiBXRUFLIGhhbmRsZXJzIGFyZSByZW1vdmVkIGlmIGEgbm9uLVdFQUsgaGFuZGxlciBtYXRjaGVzLlxuICAgICAgICAvLyAqIE9ubHkgb25lIFBSSU1BUlkgaGFuZGxlciBjYW4gbWF0Y2ggYXQgYSB0aW1lLiBBbnkgb3RoZXIgUFJJTUFSWSBoYW5kbGVyIG1hdGNoaW5nIGFcbiAgICAgICAgLy8gICBjbGFzcyB3aXRoIGFuIGV4aXN0aW5nIFBSSU1BUlkgaGFuZGxlciBpcyBhbiBlcnJvci5cblxuICAgICAgICBpZiAoIWlzV2Vha0hhbmRsZXIgJiYgcmVjb3JkLmhhc1dlYWtIYW5kbGVycykge1xuICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGhhbmRsZXIgaXMgbm90IGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBvdGhlciBXRUFLIGhhbmRsZXJzLlxuICAgICAgICAgIC8vIFJlbW92ZSB0aGVtLlxuICAgICAgICAgIHJlY29yZC50cmFpdHMgPVxuICAgICAgICAgICAgICByZWNvcmQudHJhaXRzLmZpbHRlcihmaWVsZCA9PiBmaWVsZC5oYW5kbGVyLnByZWNlZGVuY2UgIT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspO1xuICAgICAgICAgIHJlY29yZC5oYXNXZWFrSGFuZGxlcnMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1dlYWtIYW5kbGVyICYmICFyZWNvcmQuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBhIFdFQUsgaGFuZGxlciwgYnV0IHRoZSBjbGFzcyBoYXMgbm9uLVdFQUsgaGFuZGxlcnMgYWxyZWFkeS5cbiAgICAgICAgICAvLyBEcm9wIHRoZSBjdXJyZW50IG9uZS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ByaW1hcnlIYW5kbGVyICYmIHJlY29yZC5oYXNQcmltYXJ5SGFuZGxlcikge1xuICAgICAgICAgIC8vIFRoZSBjbGFzcyBhbHJlYWR5IGhhcyBhIFBSSU1BUlkgaGFuZGxlciwgYW5kIGFub3RoZXIgb25lIGp1c3QgbWF0Y2hlZC5cbiAgICAgICAgICByZWNvcmQubWV0YURpYWdub3N0aWNzID0gW3tcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICBjb2RlOiBOdW1iZXIoJy05OScgKyBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiksXG4gICAgICAgICAgICBmaWxlOiBnZXRTb3VyY2VGaWxlKGNsYXp6KSxcbiAgICAgICAgICAgIHN0YXJ0OiBjbGF6ei5nZXRTdGFydCh1bmRlZmluZWQsIGZhbHNlKSxcbiAgICAgICAgICAgIGxlbmd0aDogY2xhenouZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnVHdvIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGNsYXNzJyxcbiAgICAgICAgICB9XTtcbiAgICAgICAgICByZWNvcmQudHJhaXRzID0gZm91bmRUcmFpdHMgPSBbXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgaXQncyBzYWZlIHRvIGFjY2VwdCB0aGUgbXVsdGlwbGUgZGVjb3JhdG9ycyBoZXJlLiBVcGRhdGUgc29tZSBvZiB0aGUgbWV0YWRhdGFcbiAgICAgICAgLy8gcmVnYXJkaW5nIHRoaXMgY2xhc3MuXG4gICAgICAgIHJlY29yZC50cmFpdHMucHVzaCh0cmFpdCk7XG4gICAgICAgIHJlY29yZC5oYXNQcmltYXJ5SGFuZGxlciA9IHJlY29yZC5oYXNQcmltYXJ5SGFuZGxlciB8fCBpc1ByaW1hcnlIYW5kbGVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmb3VuZFRyYWl0cy5sZW5ndGggPiAwID8gZm91bmRUcmFpdHMgOiBudWxsO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcHJlYW5hbHl6ZVF1ZXVlOiBQcm9taXNlPHZvaWQ+W118bnVsbCk6IHZvaWQge1xuICAgIGNvbnN0IHRyYWl0cyA9IHRoaXMuc2NhbkNsYXNzRm9yVHJhaXRzKGNsYXp6KTtcblxuICAgIGlmICh0cmFpdHMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGFyZSBubyBJdnkgdHJhaXRzIG9uIHRoZSBjbGFzcywgc28gaXQgY2FuIHNhZmVseSBiZSBza2lwcGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgdHJhaXQgb2YgdHJhaXRzKSB7XG4gICAgICBjb25zdCBhbmFseXplID0gKCkgPT4gdGhpcy5hbmFseXplVHJhaXQoY2xhenosIHRyYWl0KTtcblxuICAgICAgbGV0IHByZWFuYWx5c2lzOiBQcm9taXNlPHZvaWQ+fG51bGwgPSBudWxsO1xuICAgICAgaWYgKHByZWFuYWx5emVRdWV1ZSAhPT0gbnVsbCAmJiB0cmFpdC5oYW5kbGVyLnByZWFuYWx5emUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBBdHRlbXB0IHRvIHJ1biBwcmVhbmFseXNpcy4gVGhpcyBjb3VsZCBmYWlsIHdpdGggYSBgRmF0YWxEaWFnbm9zdGljRXJyb3JgOyBjYXRjaCBpdCBpZiBpdFxuICAgICAgICAvLyBkb2VzLlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHByZWFuYWx5c2lzID0gdHJhaXQuaGFuZGxlci5wcmVhbmFseXplKGNsYXp6LCB0cmFpdC5kZXRlY3RlZC5tZXRhZGF0YSkgfHwgbnVsbDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEZhdGFsRGlhZ25vc3RpY0Vycm9yKSB7XG4gICAgICAgICAgICB0cmFpdC50b0Vycm9yZWQoW2Vyci50b0RpYWdub3N0aWMoKV0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocHJlYW5hbHlzaXMgIT09IG51bGwpIHtcbiAgICAgICAgcHJlYW5hbHl6ZVF1ZXVlIS5wdXNoKHByZWFuYWx5c2lzLnRoZW4oYW5hbHl6ZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBhbmFseXplVHJhaXQoXG4gICAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgdHJhaXQ6IFRyYWl0PHVua25vd24sIHVua25vd24sIHVua25vd24+LFxuICAgICAgZmxhZ3M/OiBIYW5kbGVyRmxhZ3MpOiB2b2lkIHtcbiAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUEVORElORykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0IHRvIGFuYWx5emUgdHJhaXQgb2YgJHtjbGF6ei5uYW1lLnRleHR9IGluIHN0YXRlICR7XG4gICAgICAgICAgVHJhaXRTdGF0ZVt0cmFpdC5zdGF0ZV19IChleHBlY3RlZCBERVRFQ1RFRClgKTtcbiAgICB9XG5cbiAgICAvLyBBdHRlbXB0IGFuYWx5c2lzLiBUaGlzIGNvdWxkIGZhaWwgd2l0aCBhIGBGYXRhbERpYWdub3N0aWNFcnJvcmA7IGNhdGNoIGl0IGlmIGl0IGRvZXMuXG4gICAgbGV0IHJlc3VsdDogQW5hbHlzaXNPdXRwdXQ8dW5rbm93bj47XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IHRyYWl0LmhhbmRsZXIuYW5hbHl6ZShjbGF6eiwgdHJhaXQuZGV0ZWN0ZWQubWV0YWRhdGEsIGZsYWdzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICB0cmFpdCA9IHRyYWl0LnRvRXJyb3JlZChbZXJyLnRvRGlhZ25vc3RpYygpXSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocmVzdWx0LmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRyYWl0ID0gdHJhaXQudG9FcnJvcmVkKHJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgfSBlbHNlIGlmIChyZXN1bHQuYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gQW5hbHlzaXMgd2FzIHN1Y2Nlc3NmdWwuIFRyaWdnZXIgcmVnaXN0cmF0aW9uLlxuICAgICAgaWYgKHRyYWl0LmhhbmRsZXIucmVnaXN0ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyKGNsYXp6LCByZXN1bHQuYW5hbHlzaXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBTdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYW5kIHJlZ2lzdGVyZWQuXG4gICAgICB0cmFpdCA9IHRyYWl0LnRvQW5hbHl6ZWQocmVzdWx0LmFuYWx5c2lzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHJhaXQgPSB0cmFpdC50b1NraXBwZWQoKTtcbiAgICB9XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5mcm9tKHRoaXMuY2xhc3Nlcy5rZXlzKCkpO1xuICAgIGZvciAoY29uc3QgY2xhenogb2YgY2xhc3Nlcykge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChsZXQgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBjb25zdCBoYW5kbGVyID0gdHJhaXQuaGFuZGxlcjtcbiAgICAgICAgc3dpdGNoICh0cmFpdC5zdGF0ZSkge1xuICAgICAgICAgIGNhc2UgVHJhaXRTdGF0ZS5TS0lQUEVEOlxuICAgICAgICAgIGNhc2UgVHJhaXRTdGF0ZS5FUlJPUkVEOlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlBFTkRJTkc6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlc29sdmluZyBhIHRyYWl0IHRoYXQgaGFzbid0IGJlZW4gYW5hbHl6ZWQ6ICR7Y2xhenoubmFtZS50ZXh0fSAvICR7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKHRyYWl0LmhhbmRsZXIpLmNvbnN0cnVjdG9yLm5hbWV9YCk7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlJFU09MVkVEOlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZXNvbHZpbmcgYW4gYWxyZWFkeSByZXNvbHZlZCB0cmFpdGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXIucmVzb2x2ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTm8gcmVzb2x1dGlvbiBvZiB0aGlzIHRyYWl0IG5lZWRlZCAtIGl0J3MgY29uc2lkZXJlZCBzdWNjZXNzZnVsIGJ5IGRlZmF1bHQuXG4gICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKG51bGwpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHJlc3VsdDogUmVzb2x2ZVJlc3VsdDx1bmtub3duPjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXN1bHQgPSBoYW5kbGVyLnJlc29sdmUoY2xhenosIHRyYWl0LmFuYWx5c2lzIGFzIFJlYWRvbmx5PHVua25vd24+KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEZhdGFsRGlhZ25vc3RpY0Vycm9yKSB7XG4gICAgICAgICAgICB0cmFpdCA9IHRyYWl0LnRvRXJyb3JlZChbZXJyLnRvRGlhZ25vc3RpYygpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHQuZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQuZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9FcnJvcmVkKHJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHJlc3VsdC5kYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9SZXNvbHZlZChyZXN1bHQuZGF0YSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9SZXNvbHZlZChudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzdWx0LnJlZXhwb3J0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICAgICAgaWYgKCF0aGlzLnJlZXhwb3J0TWFwLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVleHBvcnRNYXAuc2V0KGZpbGVOYW1lLCBuZXcgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4oKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGZpbGVSZWV4cG9ydHMgPSB0aGlzLnJlZXhwb3J0TWFwLmdldChmaWxlTmFtZSkhO1xuICAgICAgICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVzdWx0LnJlZXhwb3J0cykge1xuICAgICAgICAgICAgZmlsZVJlZXhwb3J0cy5zZXQocmVleHBvcnQuYXNBbGlhcywgW3JlZXhwb3J0LmZyb21Nb2R1bGUsIHJlZXhwb3J0LnN5bWJvbE5hbWVdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGludG8gdGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBmb3IgYW55IGNvbXBvbmVudHMgd2l0aGluIHRoZSBnaXZlblxuICAgKiBgdHMuU291cmNlRmlsZWAuXG4gICAqL1xuICB0eXBlQ2hlY2soc2Y6IHRzLlNvdXJjZUZpbGUsIGN0eDogVHlwZUNoZWNrQ29udGV4dCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpISkge1xuICAgICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChjbGF6eikhO1xuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRyYWl0LmhhbmRsZXIudHlwZUNoZWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0cmFpdC5oYW5kbGVyLnR5cGVDaGVjayhjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5kZXgoY3R4OiBJbmRleGluZ0NvbnRleHQpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuY2xhc3Nlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopITtcbiAgICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUkVTT0xWRUQpIHtcbiAgICAgICAgICAvLyBTa2lwIHRyYWl0cyB0aGF0IGhhdmVuJ3QgYmVlbiByZXNvbHZlZCBzdWNjZXNzZnVsbHkuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHJhaXQuaGFuZGxlci5pbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gU2tpcCB0cmFpdHMgdGhhdCBkb24ndCBhZmZlY3QgaW5kZXhpbmcuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFpdC5oYW5kbGVyLmluZGV4KGN0eCwgY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb21waWxlKGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W118bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUoY2xhenopIGFzIHR5cGVvZiBjbGF6ejtcbiAgICBpZiAoIXRoaXMucmVmbGVjdG9yLmlzQ2xhc3MoY2xhenopIHx8ICF0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKG9yaWdpbmFsKSB8fFxuICAgICAgICAhdGhpcy5jbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQob3JpZ2luYWwpITtcblxuICAgIGxldCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICBpZiAodHJhaXQuc3RhdGUgIT09IFRyYWl0U3RhdGUuUkVTT0xWRUQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbXBpbGVTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdjb21waWxlQ2xhc3MnLCBvcmlnaW5hbCk7XG5cbiAgICAgIGxldCBjb21waWxlUmVzOiBDb21waWxlUmVzdWx0fENvbXBpbGVSZXN1bHRbXTtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uTW9kZSA9PT0gQ29tcGlsYXRpb25Nb2RlLlBBUlRJQUwgJiZcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLmNvbXBpbGVQYXJ0aWFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29tcGlsZVJlcyA9IHRyYWl0LmhhbmRsZXIuY29tcGlsZVBhcnRpYWwoY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGVSZXMgPVxuICAgICAgICAgICAgdHJhaXQuaGFuZGxlci5jb21waWxlRnVsbChjbGF6eiwgdHJhaXQuYW5hbHlzaXMsIHRyYWl0LnJlc29sdXRpb24sIGNvbnN0YW50UG9vbCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbXBpbGVNYXRjaFJlcyA9IGNvbXBpbGVSZXM7XG4gICAgICB0aGlzLnBlcmYuc3RvcChjb21waWxlU3Bhbik7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjb21waWxlTWF0Y2hSZXMpKSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIGNvbXBpbGVNYXRjaFJlcykge1xuICAgICAgICAgIGlmICghcmVzLnNvbWUociA9PiByLm5hbWUgPT09IHJlc3VsdC5uYW1lKSkge1xuICAgICAgICAgICAgcmVzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXJlcy5zb21lKHJlc3VsdCA9PiByZXN1bHQubmFtZSA9PT0gY29tcGlsZU1hdGNoUmVzLm5hbWUpKSB7XG4gICAgICAgIHJlcy5wdXNoKGNvbXBpbGVNYXRjaFJlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTG9vayB1cCB0aGUgLmQudHMgdHJhbnNmb3JtZXIgZm9yIHRoZSBpbnB1dCBmaWxlIGFuZCByZWNvcmQgdGhhdCBhdCBsZWFzdCBvbmUgZmllbGQgd2FzXG4gICAgLy8gZ2VuZXJhdGVkLCB3aGljaCB3aWxsIGFsbG93IHRoZSAuZC50cyB0byBiZSB0cmFuc2Zvcm1lZCBsYXRlci5cbiAgICB0aGlzLmR0c1RyYW5zZm9ybXMuZ2V0SXZ5RGVjbGFyYXRpb25UcmFuc2Zvcm0ob3JpZ2luYWwuZ2V0U291cmNlRmlsZSgpKVxuICAgICAgICAuYWRkRmllbGRzKG9yaWdpbmFsLCByZXMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSBpbnN0cnVjdGlvbiB0byB0aGUgdHJhbnNmb3JtZXIgc28gdGhlIGZpZWxkcyB3aWxsIGJlIGFkZGVkLlxuICAgIHJldHVybiByZXMubGVuZ3RoID4gMCA/IHJlcyA6IG51bGw7XG4gIH1cblxuICBkZWNvcmF0b3JzRm9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjb3JhdG9yW10ge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlO1xuICAgIGlmICghdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhvcmlnaW5hbCkgfHwgIXRoaXMuY2xhc3Nlcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5jbGFzc2VzLmdldChvcmlnaW5hbCkhO1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIgIT09IG51bGwgJiYgdHMuaXNEZWNvcmF0b3IodHJhaXQuZGV0ZWN0ZWQudHJpZ2dlcikpIHtcbiAgICAgICAgZGVjb3JhdG9ycy5wdXNoKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuY2xhc3Nlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopITtcbiAgICAgIGlmIChyZWNvcmQubWV0YURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucmVjb3JkLm1ldGFEaWFnbm9zdGljcyk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgICAgaWYgKHRyYWl0LnN0YXRlID09PSBUcmFpdFN0YXRlLkVSUk9SRUQpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRyYWl0LmRpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXQgZXhwb3J0U3RhdGVtZW50cygpOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4ge1xuICAgIHJldHVybiB0aGlzLnJlZXhwb3J0TWFwO1xuICB9XG59XG4iXX0=