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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/trait"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
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
        function TraitCompiler(handlers, reflector, perf, incrementalBuild, compileNonExportedClasses, dtsTransforms) {
            var e_1, _a;
            this.handlers = handlers;
            this.reflector = reflector;
            this.perf = perf;
            this.incrementalBuild = incrementalBuild;
            this.compileNonExportedClasses = compileNonExportedClasses;
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
        TraitCompiler.prototype.analyzeSync = function (sf) { this.analyze(sf, false); };
        TraitCompiler.prototype.analyzeAsync = function (sf) { return this.analyze(sf, true); };
        TraitCompiler.prototype.analyze = function (sf, preanalyze) {
            var e_2, _a;
            var _this = this;
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
                if (reflection_1.isNamedClassDeclaration(node)) {
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
            var e_5, _a;
            if (!this.compileNonExportedClasses && !typescript_1.isExported(clazz)) {
                return null;
            }
            var decorators = this.reflector.getDecoratorsOfDeclaration(clazz);
            var record = null;
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
                            record.traits = [];
                            return record;
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
            return record;
        };
        TraitCompiler.prototype.analyzeClass = function (clazz, preanalyzeQueue) {
            var e_6, _a;
            var _this = this;
            var record = this.scanClassForTraits(clazz);
            if (record === null) {
                // There are no Ivy traits on the class, so it can safely be skipped.
                return;
            }
            var _loop_1 = function (trait) {
                var analyze = function () { return _this.analyzeTrait(clazz, trait); };
                var preanalysis = null;
                if (preanalyzeQueue !== null && trait.handler.preanalyze !== undefined) {
                    preanalysis = trait.handler.preanalyze(clazz, trait.detected.metadata) || null;
                }
                if (preanalysis !== null) {
                    preanalyzeQueue.push(preanalysis.then(analyze));
                }
                else {
                    analyze();
                }
            };
            try {
                for (var _b = tslib_1.__values(record.traits), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var trait = _c.value;
                    _loop_1(trait);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
        };
        TraitCompiler.prototype.analyzeTrait = function (clazz, trait) {
            if (trait.state !== trait_1.TraitState.PENDING) {
                throw new Error("Attempt to analyze trait of " + clazz.name.text + " in state " + trait_1.TraitState[trait.state] + " (expected DETECTED)");
            }
            // Attempt analysis. This could fail with a `FatalDiagnosticError`; catch it if it does.
            var result;
            try {
                result = trait.handler.analyze(clazz, trait.detected.metadata);
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
        TraitCompiler.prototype.typeCheck = function (ctx) {
            var e_10, _a, e_11, _b;
            try {
                for (var _c = tslib_1.__values(this.classes.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
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
            if (!reflection_1.isNamedClassDeclaration(clazz) || !reflection_1.isNamedClassDeclaration(original) ||
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
                var compileMatchRes = trait.handler.compile(clazz, trait.analysis, trait.resolution, constantPool);
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
            if (!reflection_1.isNamedClassDeclaration(original) || !this.classes.has(original)) {
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
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TraitCompiler.prototype, "exportStatements", {
            get: function () { return this.reexportMap; },
            enumerable: true,
            configurable: true
        });
        return TraitCompiler;
    }());
    exports.TraitCompiler = TraitCompiler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQU1sRSx5RUFBMkY7SUFFM0Ysa0ZBQW9FO0lBRXBFLHlFQUFzSDtJQUV0SCw2RUFBMEM7SUFxQzFDOzs7Ozs7Ozs7O09BVUc7SUFDSDtRQWlCRSx1QkFDWSxRQUF1RCxFQUN2RCxTQUF5QixFQUFVLElBQWtCLEVBQ3JELGdCQUErQyxFQUMvQyx5QkFBa0MsRUFBVSxhQUFtQzs7WUFIL0UsYUFBUSxHQUFSLFFBQVEsQ0FBK0M7WUFDdkQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQ3JELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBK0I7WUFDL0MsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFTO1lBQVUsa0JBQWEsR0FBYixhQUFhLENBQXNCO1lBcEIzRjs7O2VBR0c7WUFDSyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFM0Q7OztlQUdHO1lBQ0ssa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQztZQUVoRSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1lBRS9ELG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQXVELENBQUM7O2dCQU90RixLQUFzQixJQUFBLGFBQUEsaUJBQUEsUUFBUSxDQUFBLGtDQUFBLHdEQUFFO29CQUEzQixJQUFNLE9BQU8scUJBQUE7b0JBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQ2hEOzs7Ozs7Ozs7UUFDSCxD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SyxrQkFBVSxDQUFDLE9BQU8sRUFBRTtvQ0FDdEMsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxLQUFLLENBQUMsV0FBVyxHQUFFO2lDQUN4Qzs2QkFDRjs7Ozs7Ozs7O3FCQUNGOzs7Ozs7Ozs7Z0JBQ0QsT0FBTyxXQUFXLENBQUM7WUFDckIsQ0FBQzs7O1dBQUE7UUFFRCxzQkFBSSwyQ0FBZ0I7aUJBQXBCLGNBQXFFLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBQ2pHLG9CQUFDO0lBQUQsQ0FBQyxBQTVhRCxJQTRhQztJQTVhWSxzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcn0gZnJvbSAnLi4vLi4vbW9kdWxld2l0aHByb3ZpZGVycyc7XG5pbXBvcnQge1BlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0LCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge1R5cGVDaGVja0NvbnRleHR9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGUsIGlzRXhwb3J0ZWR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c1RyYW5zZm9ybVJlZ2lzdHJ5fSBmcm9tICcuL2RlY2xhcmF0aW9uJztcbmltcG9ydCB7VHJhaXQsIFRyYWl0U3RhdGV9IGZyb20gJy4vdHJhaXQnO1xuXG5cbi8qKlxuICogUmVjb3JkcyBpbmZvcm1hdGlvbiBhYm91dCBhIHNwZWNpZmljIGNsYXNzIHRoYXQgaGFzIG1hdGNoZWQgdHJhaXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzUmVjb3JkIHtcbiAgLyoqXG4gICAqIFRoZSBgQ2xhc3NEZWNsYXJhdGlvbmAgb2YgdGhlIGNsYXNzIHdoaWNoIGhhcyBBbmd1bGFyIHRyYWl0cyBhcHBsaWVkLlxuICAgKi9cbiAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjtcblxuICAvKipcbiAgICogQWxsIHRyYWl0cyB3aGljaCBtYXRjaGVkIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHRyYWl0czogVHJhaXQ8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXTtcblxuICAvKipcbiAgICogTWV0YS1kaWFnbm9zdGljcyBhYm91dCB0aGUgY2xhc3MsIHdoaWNoIGFyZSB1c3VhbGx5IHJlbGF0ZWQgdG8gd2hldGhlciBjZXJ0YWluIGNvbWJpbmF0aW9ucyBvZlxuICAgKiBBbmd1bGFyIGRlY29yYXRvcnMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAqL1xuICBtZXRhRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsO1xuXG4gIC8vIFN1YnNlcXVlbnQgZmllbGRzIGFyZSBcImludGVybmFsXCIgYW5kIHVzZWQgZHVyaW5nIHRoZSBtYXRjaGluZyBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzLiBUaGlzIGlzXG4gIC8vIG11dGFibGUgc3RhdGUgZHVyaW5nIHRoZSBgZGV0ZWN0YC9gYW5hbHl6ZWAgcGhhc2VzIG9mIGNvbXBpbGF0aW9uLlxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIHRyYWl0cyBtYXRjaGVkIGZyb20gYERlY29yYXRvckhhbmRsZXJgcyBtYXJrZWQgYXMgYFdFQUtgLlxuICAgKi9cbiAgaGFzV2Vha0hhbmRsZXJzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGB0cmFpdHNgIGNvbnRhaW5zIGEgdHJhaXQgZnJvbSBhIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVkIGFzIGBQUklNQVJZYC5cbiAgICovXG4gIGhhc1ByaW1hcnlIYW5kbGVyOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiBBbmd1bGFyIGNvbXBpbGF0aW9uLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3NpbmcgYWxsIGNsYXNzZXMgaW4gdGhlIHByb2dyYW0uIEFueSB0aW1lIGFcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVzIGEgY2xhc3MsIGEgXCJ0cmFpdFwiIGlzIGNyZWF0ZWQgdG8gcmVwcmVzZW50IHRoYXQgQW5ndWxhciBhc3BlY3Qgb2YgdGhlXG4gKiBjbGFzcyAoc3VjaCBhcyB0aGUgY2xhc3MgaGF2aW5nIGEgY29tcG9uZW50IGRlZmluaXRpb24pLlxuICpcbiAqIFRoZSBgVHJhaXRDb21waWxlcmAgdHJhbnNpdGlvbnMgZWFjaCB0cmFpdCB0aHJvdWdoIHRoZSB2YXJpb3VzIHBoYXNlcyBvZiBjb21waWxhdGlvbiwgY3VsbWluYXRpbmdcbiAqIGluIHRoZSBwcm9kdWN0aW9uIG9mIGBDb21waWxlUmVzdWx0YHMgaW5zdHJ1Y3RpbmcgdGhlIGNvbXBpbGVyIHRvIGFwcGx5IHZhcmlvdXMgbXV0YXRpb25zIHRvIHRoZVxuICogY2xhc3MgKGxpa2UgYWRkaW5nIGZpZWxkcyBvciB0eXBlIGRlY2xhcmF0aW9ucykuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFpdENvbXBpbGVyIHtcbiAgLyoqXG4gICAqIE1hcHMgY2xhc3MgZGVjbGFyYXRpb25zIHRvIHRoZWlyIGBDbGFzc1JlY29yZGAsIHdoaWNoIHRyYWNrcyB0aGUgSXZ5IHRyYWl0cyBiZWluZyBhcHBsaWVkIHRvXG4gICAqIHRob3NlIGNsYXNzZXMuXG4gICAqL1xuICBwcml2YXRlIGNsYXNzZXMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIENsYXNzUmVjb3JkPigpO1xuXG4gIC8qKlxuICAgKiBNYXBzIHNvdXJjZSBmaWxlcyB0byBhbnkgY2xhc3MgZGVjbGFyYXRpb24ocykgd2l0aGluIHRoZW0gd2hpY2ggaGF2ZSBiZWVuIGRpc2NvdmVyZWQgdG8gY29udGFpblxuICAgKiBJdnkgdHJhaXRzLlxuICAgKi9cbiAgcHJpdmF0ZSBmaWxlVG9DbGFzc2VzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG5cbiAgcHJpdmF0ZSByZWV4cG9ydE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPj4oKTtcblxuICBwcml2YXRlIGhhbmRsZXJzQnlOYW1lID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj4+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10sXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpbmNyZW1lbnRhbEJ1aWxkOiBJbmNyZW1lbnRhbEJ1aWxkPENsYXNzUmVjb3JkPixcbiAgICAgIHByaXZhdGUgY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlczogYm9vbGVhbiwgcHJpdmF0ZSBkdHNUcmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1SZWdpc3RyeSkge1xuICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBoYW5kbGVycykge1xuICAgICAgdGhpcy5oYW5kbGVyc0J5TmFtZS5zZXQoaGFuZGxlci5uYW1lLCBoYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplU3luYyhzZjogdHMuU291cmNlRmlsZSk6IHZvaWQgeyB0aGlzLmFuYWx5emUoc2YsIGZhbHNlKTsgfVxuXG4gIGFuYWx5emVBc3luYyhzZjogdHMuU291cmNlRmlsZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgdHJ1ZSk7IH1cblxuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGZhbHNlKTogdm9pZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiB0cnVlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBhbmFseXplKCkgcmVhbGx5IHdhbnRzIHRvIHJldHVybiBgUHJvbWlzZTx2b2lkPnx2b2lkYCwgYnV0IFR5cGVTY3JpcHQgY2Fubm90IG5hcnJvdyBhIHJldHVyblxuICAgIC8vIHR5cGUgb2YgJ3ZvaWQnLCBzbyBgdW5kZWZpbmVkYCBpcyB1c2VkIGluc3RlYWQuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgcHJpb3JXb3JrID0gdGhpcy5pbmNyZW1lbnRhbEJ1aWxkLnByaW9yV29ya0ZvcihzZik7XG4gICAgaWYgKHByaW9yV29yayAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBwcmlvclJlY29yZCBvZiBwcmlvcldvcmspIHtcbiAgICAgICAgdGhpcy5hZG9wdChwcmlvclJlY29yZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdGhlIHJlc3Qgb2YgYW5hbHlzaXMsIGFzIHRoaXMgZmlsZSdzIHByaW9yIHRyYWl0cyBhcmUgYmVpbmcgcmV1c2VkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIGlmIChpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICB0aGlzLmFuYWx5emVDbGFzcyhub2RlLCBwcmVhbmFseXplID8gcHJvbWlzZXMgOiBudWxsKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQgYXMgdm9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcmVjb3Jkc0ZvcihzZjogdHMuU291cmNlRmlsZSk6IENsYXNzUmVjb3JkW118bnVsbCB7XG4gICAgaWYgKCF0aGlzLmZpbGVUb0NsYXNzZXMuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHJlY29yZHM6IENsYXNzUmVjb3JkW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpICEpIHtcbiAgICAgIHJlY29yZHMucHVzaCh0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSAhKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlY29yZHM7XG4gIH1cblxuICAvKipcbiAgICogSW1wb3J0IGEgYENsYXNzUmVjb3JkYCBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRyYWl0cyBmcm9tIHRoZSBgQ2xhc3NSZWNvcmRgIGhhdmUgYWNjdXJhdGUgbWV0YWRhdGEsIGJ1dCB0aGUgYGhhbmRsZXJgIGlzIGZyb20gdGhlIG9sZCBwcm9ncmFtXG4gICAqIGFuZCBuZWVkcyB0byBiZSB1cGRhdGVkIChtYXRjaGluZyBpcyBkb25lIGJ5IG5hbWUpLiBBIG5ldyBwZW5kaW5nIHRyYWl0IGlzIGNyZWF0ZWQgYW5kIHRoZW5cbiAgICogdHJhbnNpdGlvbmVkIHRvIGFuYWx5emVkIHVzaW5nIHRoZSBwcmV2aW91cyBhbmFseXNpcy4gSWYgdGhlIHRyYWl0IGlzIGluIHRoZSBlcnJvcmVkIHN0YXRlLFxuICAgKiBpbnN0ZWFkIHRoZSBlcnJvcnMgYXJlIGNvcGllZCBvdmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBhZG9wdChwcmlvclJlY29yZDogQ2xhc3NSZWNvcmQpOiB2b2lkIHtcbiAgICBjb25zdCByZWNvcmQ6IENsYXNzUmVjb3JkID0ge1xuICAgICAgaGFzUHJpbWFyeUhhbmRsZXI6IHByaW9yUmVjb3JkLmhhc1ByaW1hcnlIYW5kbGVyLFxuICAgICAgaGFzV2Vha0hhbmRsZXJzOiBwcmlvclJlY29yZC5oYXNXZWFrSGFuZGxlcnMsXG4gICAgICBtZXRhRGlhZ25vc3RpY3M6IHByaW9yUmVjb3JkLm1ldGFEaWFnbm9zdGljcyxcbiAgICAgIG5vZGU6IHByaW9yUmVjb3JkLm5vZGUsXG4gICAgICB0cmFpdHM6IFtdLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IHByaW9yVHJhaXQgb2YgcHJpb3JSZWNvcmQudHJhaXRzKSB7XG4gICAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5oYW5kbGVyc0J5TmFtZS5nZXQocHJpb3JUcmFpdC5oYW5kbGVyLm5hbWUpICE7XG4gICAgICBsZXQgdHJhaXQ6IFRyYWl0PHVua25vd24sIHVua25vd24sIHVua25vd24+ID0gVHJhaXQucGVuZGluZyhoYW5kbGVyLCBwcmlvclRyYWl0LmRldGVjdGVkKTtcblxuICAgICAgaWYgKHByaW9yVHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuQU5BTFlaRUQgfHwgcHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICB0cmFpdCA9IHRyYWl0LnRvQW5hbHl6ZWQocHJpb3JUcmFpdC5hbmFseXNpcyk7XG4gICAgICAgIGlmICh0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyKHJlY29yZC5ub2RlLCB0cmFpdC5hbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocHJpb3JUcmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5TS0lQUEVEKSB7XG4gICAgICAgIHRyYWl0ID0gdHJhaXQudG9Ta2lwcGVkKCk7XG4gICAgICB9IGVsc2UgaWYgKHByaW9yVHJhaXQuc3RhdGUgPT09IFRyYWl0U3RhdGUuRVJST1JFRCkge1xuICAgICAgICB0cmFpdCA9IHRyYWl0LnRvRXJyb3JlZChwcmlvclRyYWl0LmRpYWdub3N0aWNzKTtcbiAgICAgIH1cblxuICAgICAgcmVjb3JkLnRyYWl0cy5wdXNoKHRyYWl0KTtcbiAgICB9XG5cbiAgICB0aGlzLmNsYXNzZXMuc2V0KHJlY29yZC5ub2RlLCByZWNvcmQpO1xuICAgIGNvbnN0IHNmID0gcmVjb3JkLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5zZXQoc2YsIG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKSk7XG4gICAgfVxuICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpICEuYWRkKHJlY29yZC5ub2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkNsYXNzRm9yVHJhaXRzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NSZWNvcmR8bnVsbCB7XG4gICAgaWYgKCF0aGlzLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgJiYgIWlzRXhwb3J0ZWQoY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oY2xhenopO1xuXG4gICAgbGV0IHJlY29yZDogQ2xhc3NSZWNvcmR8bnVsbCA9IG51bGw7XG5cbiAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgdGhpcy5oYW5kbGVycykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gaGFuZGxlci5kZXRlY3QoY2xhenosIGRlY29yYXRvcnMpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG5cbiAgICAgIGNvbnN0IGlzUHJpbWFyeUhhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gICAgICBjb25zdCBpc1dlYWtIYW5kbGVyID0gaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLO1xuICAgICAgY29uc3QgdHJhaXQgPSBUcmFpdC5wZW5kaW5nKGhhbmRsZXIsIHJlc3VsdCk7XG5cbiAgICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIHBhdGggaXMgYSBmYXN0IHBhdGggdGhyb3VnaCB3aGljaFxuICAgICAgICAvLyBtb3N0IGNsYXNzZXMgd2lsbCBmbG93LlxuICAgICAgICByZWNvcmQgPSB7XG4gICAgICAgICAgbm9kZTogY2xhenosXG4gICAgICAgICAgdHJhaXRzOiBbdHJhaXRdLFxuICAgICAgICAgIG1ldGFEaWFnbm9zdGljczogbnVsbCxcbiAgICAgICAgICBoYXNQcmltYXJ5SGFuZGxlcjogaXNQcmltYXJ5SGFuZGxlcixcbiAgICAgICAgICBoYXNXZWFrSGFuZGxlcnM6IGlzV2Vha0hhbmRsZXIsXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jbGFzc2VzLnNldChjbGF6eiwgcmVjb3JkKTtcbiAgICAgICAgY29uc3Qgc2YgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghdGhpcy5maWxlVG9DbGFzc2VzLmhhcyhzZikpIHtcbiAgICAgICAgICB0aGlzLmZpbGVUb0NsYXNzZXMuc2V0KHNmLCBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZVRvQ2xhc3Nlcy5nZXQoc2YpICEuYWRkKGNsYXp6KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYXQgbGVhc3QgdGhlIHNlY29uZCBoYW5kbGVyIHRvIG1hdGNoIHRoaXMgY2xhc3MuIFRoaXMgaXMgYSBzbG93ZXIgcGF0aCB0aGF0IHNvbWVcbiAgICAgICAgLy8gY2xhc3NlcyB3aWxsIGdvIHRocm91Z2gsIHdoaWNoIHZhbGlkYXRlcyB0aGF0IHRoZSBzZXQgb2YgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZSBjbGFzc1xuICAgICAgICAvLyBpcyB2YWxpZC5cblxuICAgICAgICAvLyBWYWxpZGF0ZSBhY2NvcmRpbmcgdG8gcnVsZXMgYXMgZm9sbG93czpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gKiBXRUFLIGhhbmRsZXJzIGFyZSByZW1vdmVkIGlmIGEgbm9uLVdFQUsgaGFuZGxlciBtYXRjaGVzLlxuICAgICAgICAvLyAqIE9ubHkgb25lIFBSSU1BUlkgaGFuZGxlciBjYW4gbWF0Y2ggYXQgYSB0aW1lLiBBbnkgb3RoZXIgUFJJTUFSWSBoYW5kbGVyIG1hdGNoaW5nIGFcbiAgICAgICAgLy8gICBjbGFzcyB3aXRoIGFuIGV4aXN0aW5nIFBSSU1BUlkgaGFuZGxlciBpcyBhbiBlcnJvci5cblxuICAgICAgICBpZiAoIWlzV2Vha0hhbmRsZXIgJiYgcmVjb3JkLmhhc1dlYWtIYW5kbGVycykge1xuICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGhhbmRsZXIgaXMgbm90IGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBvdGhlciBXRUFLIGhhbmRsZXJzLlxuICAgICAgICAgIC8vIFJlbW92ZSB0aGVtLlxuICAgICAgICAgIHJlY29yZC50cmFpdHMgPVxuICAgICAgICAgICAgICByZWNvcmQudHJhaXRzLmZpbHRlcihmaWVsZCA9PiBmaWVsZC5oYW5kbGVyLnByZWNlZGVuY2UgIT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspO1xuICAgICAgICAgIHJlY29yZC5oYXNXZWFrSGFuZGxlcnMgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1dlYWtIYW5kbGVyICYmICFyZWNvcmQuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBhIFdFQUsgaGFuZGxlciwgYnV0IHRoZSBjbGFzcyBoYXMgbm9uLVdFQUsgaGFuZGxlcnMgYWxyZWFkeS5cbiAgICAgICAgICAvLyBEcm9wIHRoZSBjdXJyZW50IG9uZS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ByaW1hcnlIYW5kbGVyICYmIHJlY29yZC5oYXNQcmltYXJ5SGFuZGxlcikge1xuICAgICAgICAgIC8vIFRoZSBjbGFzcyBhbHJlYWR5IGhhcyBhIFBSSU1BUlkgaGFuZGxlciwgYW5kIGFub3RoZXIgb25lIGp1c3QgbWF0Y2hlZC5cbiAgICAgICAgICByZWNvcmQubWV0YURpYWdub3N0aWNzID0gW3tcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICBjb2RlOiBOdW1iZXIoJy05OScgKyBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiksXG4gICAgICAgICAgICBmaWxlOiBnZXRTb3VyY2VGaWxlKGNsYXp6KSxcbiAgICAgICAgICAgIHN0YXJ0OiBjbGF6ei5nZXRTdGFydCh1bmRlZmluZWQsIGZhbHNlKSxcbiAgICAgICAgICAgIGxlbmd0aDogY2xhenouZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnVHdvIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGNsYXNzJyxcbiAgICAgICAgICB9XTtcbiAgICAgICAgICByZWNvcmQudHJhaXRzID0gW107XG4gICAgICAgICAgcmV0dXJuIHJlY29yZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgaXQncyBzYWZlIHRvIGFjY2VwdCB0aGUgbXVsdGlwbGUgZGVjb3JhdG9ycyBoZXJlLiBVcGRhdGUgc29tZSBvZiB0aGUgbWV0YWRhdGFcbiAgICAgICAgLy8gcmVnYXJkaW5nIHRoaXMgY2xhc3MuXG4gICAgICAgIHJlY29yZC50cmFpdHMucHVzaCh0cmFpdCk7XG4gICAgICAgIHJlY29yZC5oYXNQcmltYXJ5SGFuZGxlciA9IHJlY29yZC5oYXNQcmltYXJ5SGFuZGxlciB8fCBpc1ByaW1hcnlIYW5kbGVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZWNvcmQ7XG4gIH1cblxuICBwcml2YXRlIGFuYWx5emVDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgcHJlYW5hbHl6ZVF1ZXVlOiBQcm9taXNlPHZvaWQ+W118bnVsbCk6IHZvaWQge1xuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuc2NhbkNsYXNzRm9yVHJhaXRzKGNsYXp6KTtcblxuICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGFyZSBubyBJdnkgdHJhaXRzIG9uIHRoZSBjbGFzcywgc28gaXQgY2FuIHNhZmVseSBiZSBza2lwcGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgY29uc3QgYW5hbHl6ZSA9ICgpID0+IHRoaXMuYW5hbHl6ZVRyYWl0KGNsYXp6LCB0cmFpdCk7XG5cbiAgICAgIGxldCBwcmVhbmFseXNpczogUHJvbWlzZTx2b2lkPnxudWxsID0gbnVsbDtcbiAgICAgIGlmIChwcmVhbmFseXplUXVldWUgIT09IG51bGwgJiYgdHJhaXQuaGFuZGxlci5wcmVhbmFseXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcHJlYW5hbHlzaXMgPSB0cmFpdC5oYW5kbGVyLnByZWFuYWx5emUoY2xhenosIHRyYWl0LmRldGVjdGVkLm1ldGFkYXRhKSB8fCBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKHByZWFuYWx5c2lzICE9PSBudWxsKSB7XG4gICAgICAgIHByZWFuYWx5emVRdWV1ZSAhLnB1c2gocHJlYW5hbHlzaXMudGhlbihhbmFseXplKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbmFseXplKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhbmFseXplVHJhaXQoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHRyYWl0OiBUcmFpdDx1bmtub3duLCB1bmtub3duLCB1bmtub3duPik6IHZvaWQge1xuICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5QRU5ESU5HKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHQgdG8gYW5hbHl6ZSB0cmFpdCBvZiAke2NsYXp6Lm5hbWUudGV4dH0gaW4gc3RhdGUgJHtUcmFpdFN0YXRlW3RyYWl0LnN0YXRlXX0gKGV4cGVjdGVkIERFVEVDVEVEKWApO1xuICAgIH1cblxuICAgIC8vIEF0dGVtcHQgYW5hbHlzaXMuIFRoaXMgY291bGQgZmFpbCB3aXRoIGEgYEZhdGFsRGlhZ25vc3RpY0Vycm9yYDsgY2F0Y2ggaXQgaWYgaXQgZG9lcy5cbiAgICBsZXQgcmVzdWx0OiBBbmFseXNpc091dHB1dDx1bmtub3duPjtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gdHJhaXQuaGFuZGxlci5hbmFseXplKGNsYXp6LCB0cmFpdC5kZXRlY3RlZC5tZXRhZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgdHJhaXQgPSB0cmFpdC50b0Vycm9yZWQoW2Vyci50b0RpYWdub3N0aWMoKV0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0cmFpdCA9IHRyYWl0LnRvRXJyb3JlZChyZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgIH0gZWxzZSBpZiAocmVzdWx0LmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIEFuYWx5c2lzIHdhcyBzdWNjZXNzZnVsLiBUcmlnZ2VyIHJlZ2lzdHJhdGlvbi5cbiAgICAgIGlmICh0cmFpdC5oYW5kbGVyLnJlZ2lzdGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHJhaXQuaGFuZGxlci5yZWdpc3RlcihjbGF6eiwgcmVzdWx0LmFuYWx5c2lzKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGFuZCByZWdpc3RlcmVkLlxuICAgICAgdHJhaXQgPSB0cmFpdC50b0FuYWx5emVkKHJlc3VsdC5hbmFseXNpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyYWl0ID0gdHJhaXQudG9Ta2lwcGVkKCk7XG4gICAgfVxuICB9XG5cbiAgcmVzb2x2ZSgpOiB2b2lkIHtcbiAgICBjb25zdCBjbGFzc2VzID0gQXJyYXkuZnJvbSh0aGlzLmNsYXNzZXMua2V5cygpKTtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIGNsYXNzZXMpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopICE7XG4gICAgICBmb3IgKGxldCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0cmFpdC5oYW5kbGVyO1xuICAgICAgICBzd2l0Y2ggKHRyYWl0LnN0YXRlKSB7XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLlNLSVBQRUQ6XG4gICAgICAgICAgY2FzZSBUcmFpdFN0YXRlLkVSUk9SRUQ6XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICBjYXNlIFRyYWl0U3RhdGUuUEVORElORzpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgUmVzb2x2aW5nIGEgdHJhaXQgdGhhdCBoYXNuJ3QgYmVlbiBhbmFseXplZDogJHtjbGF6ei5uYW1lLnRleHR9IC8gJHtPYmplY3QuZ2V0UHJvdG90eXBlT2YodHJhaXQuaGFuZGxlcikuY29uc3RydWN0b3IubmFtZX1gKTtcbiAgICAgICAgICBjYXNlIFRyYWl0U3RhdGUuUkVTT0xWRUQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlc29sdmluZyBhbiBhbHJlYWR5IHJlc29sdmVkIHRyYWl0YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlci5yZXNvbHZlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBObyByZXNvbHV0aW9uIG9mIHRoaXMgdHJhaXQgbmVlZGVkIC0gaXQncyBjb25zaWRlcmVkIHN1Y2Nlc3NmdWwgYnkgZGVmYXVsdC5cbiAgICAgICAgICB0cmFpdCA9IHRyYWl0LnRvUmVzb2x2ZWQobnVsbCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmVzdWx0OiBSZXNvbHZlUmVzdWx0PHVua25vd24+O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZXIucmVzb2x2ZShjbGF6eiwgdHJhaXQuYW5hbHlzaXMgYXMgUmVhZG9ubHk8dW5rbm93bj4pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgIHRyYWl0ID0gdHJhaXQudG9FcnJvcmVkKFtlcnIudG9EaWFnbm9zdGljKCldKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkICYmIHJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdHJhaXQgPSB0cmFpdC50b0Vycm9yZWQocmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJhaXQgPSB0cmFpdC50b1Jlc29sdmVkKG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXN1bHQucmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGNsYXp6LmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgICAgICBpZiAoIXRoaXMucmVleHBvcnRNYXAuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgICAgICAgdGhpcy5yZWV4cG9ydE1hcC5zZXQoZmlsZU5hbWUsIG5ldyBNYXA8c3RyaW5nLCBbc3RyaW5nLCBzdHJpbmddPigpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZmlsZVJlZXhwb3J0cyA9IHRoaXMucmVleHBvcnRNYXAuZ2V0KGZpbGVOYW1lKSAhO1xuICAgICAgICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVzdWx0LnJlZXhwb3J0cykge1xuICAgICAgICAgICAgZmlsZVJlZXhwb3J0cy5zZXQocmVleHBvcnQuYXNBbGlhcywgW3JlZXhwb3J0LmZyb21Nb2R1bGUsIHJlZXhwb3J0LnN5bWJvbE5hbWVdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB0eXBlQ2hlY2soY3R4OiBUeXBlQ2hlY2tDb250ZXh0KTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBjbGF6eiBvZiB0aGlzLmNsYXNzZXMua2V5cygpKSB7XG4gICAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KGNsYXp6KSAhO1xuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRyYWl0LmhhbmRsZXIudHlwZUNoZWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0cmFpdC5oYW5kbGVyLnR5cGVDaGVjayhjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5kZXgoY3R4OiBJbmRleGluZ0NvbnRleHQpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuY2xhc3Nlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopICE7XG4gICAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgICAgaWYgKHRyYWl0LnN0YXRlICE9PSBUcmFpdFN0YXRlLlJFU09MVkVEKSB7XG4gICAgICAgICAgLy8gU2tpcCB0cmFpdHMgdGhhdCBoYXZlbid0IGJlZW4gcmVzb2x2ZWQgc3VjY2Vzc2Z1bGx5LlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRyYWl0LmhhbmRsZXIuaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFNraXAgdHJhaXRzIHRoYXQgZG9uJ3QgYWZmZWN0IGluZGV4aW5nLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJhaXQuaGFuZGxlci5pbmRleChjdHgsIGNsYXp6LCB0cmFpdC5hbmFseXNpcywgdHJhaXQucmVzb2x1dGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29tcGlsZShjbGF6ejogdHMuRGVjbGFyYXRpb24sIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdfG51bGwge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKGNsYXp6KSBhcyB0eXBlb2YgY2xheno7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikgfHwgIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG9yaWdpbmFsKSB8fFxuICAgICAgICAhdGhpcy5jbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQob3JpZ2luYWwpICE7XG5cbiAgICBsZXQgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgdHJhaXQgb2YgcmVjb3JkLnRyYWl0cykge1xuICAgICAgaWYgKHRyYWl0LnN0YXRlICE9PSBUcmFpdFN0YXRlLlJFU09MVkVEKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb21waWxlU3BhbiA9IHRoaXMucGVyZi5zdGFydCgnY29tcGlsZUNsYXNzJywgb3JpZ2luYWwpO1xuICAgICAgY29uc3QgY29tcGlsZU1hdGNoUmVzID1cbiAgICAgICAgICB0cmFpdC5oYW5kbGVyLmNvbXBpbGUoY2xhenosIHRyYWl0LmFuYWx5c2lzLCB0cmFpdC5yZXNvbHV0aW9uLCBjb25zdGFudFBvb2wpO1xuICAgICAgdGhpcy5wZXJmLnN0b3AoY29tcGlsZVNwYW4pO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY29tcGlsZU1hdGNoUmVzKSkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiBjb21waWxlTWF0Y2hSZXMpIHtcbiAgICAgICAgICBpZiAoIXJlcy5zb21lKHIgPT4gci5uYW1lID09PSByZXN1bHQubmFtZSkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFyZXMuc29tZShyZXN1bHQgPT4gcmVzdWx0Lm5hbWUgPT09IGNvbXBpbGVNYXRjaFJlcy5uYW1lKSkge1xuICAgICAgICByZXMucHVzaChjb21waWxlTWF0Y2hSZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYXQgbGVhc3Qgb25lIGZpZWxkIHdhc1xuICAgIC8vIGdlbmVyYXRlZCwgd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgdGhpcy5kdHNUcmFuc2Zvcm1zLmdldEl2eURlY2xhcmF0aW9uVHJhbnNmb3JtKG9yaWdpbmFsLmdldFNvdXJjZUZpbGUoKSlcbiAgICAgICAgLmFkZEZpZWxkcyhvcmlnaW5hbCwgcmVzKTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5zdHJ1Y3Rpb24gdG8gdGhlIHRyYW5zZm9ybWVyIHNvIHRoZSBmaWVsZHMgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzLmxlbmd0aCA+IDAgPyByZXMgOiBudWxsO1xuICB9XG5cbiAgZGVjb3JhdG9yc0Zvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY29yYXRvcltdIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0eXBlb2Ygbm9kZTtcbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG9yaWdpbmFsKSB8fCAhdGhpcy5jbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLmNsYXNzZXMuZ2V0KG9yaWdpbmFsKSAhO1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHRyYWl0IG9mIHJlY29yZC50cmFpdHMpIHtcbiAgICAgIGlmICh0cmFpdC5zdGF0ZSAhPT0gVHJhaXRTdGF0ZS5SRVNPTFZFRCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIgIT09IG51bGwgJiYgdHMuaXNEZWNvcmF0b3IodHJhaXQuZGV0ZWN0ZWQudHJpZ2dlcikpIHtcbiAgICAgICAgZGVjb3JhdG9ycy5wdXNoKHRyYWl0LmRldGVjdGVkLnRyaWdnZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIHRoaXMuY2xhc3Nlcy5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuY2xhc3Nlcy5nZXQoY2xhenopICE7XG4gICAgICBpZiAocmVjb3JkLm1ldGFEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnJlY29yZC5tZXRhRGlhZ25vc3RpY3MpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB0cmFpdCBvZiByZWNvcmQudHJhaXRzKSB7XG4gICAgICAgIGlmICh0cmFpdC5zdGF0ZSA9PT0gVHJhaXRTdGF0ZS5FUlJPUkVEKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50cmFpdC5kaWFnbm9zdGljcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0IGV4cG9ydFN0YXRlbWVudHMoKTogTWFwPHN0cmluZywgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+IHsgcmV0dXJuIHRoaXMucmVleHBvcnRNYXA7IH1cbn1cbiJdfQ==