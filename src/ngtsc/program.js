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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/annotations/src/base_def", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var nocollapse_hack_1 = require("@angular/compiler-cli/src/transformers/nocollapse_hack");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var base_def_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/base_def");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var resource_loader_1 = require("@angular/compiler-cli/src/ngtsc/resource_loader");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var switch_1 = require("@angular/compiler-cli/src/ngtsc/switch");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, host, oldProgram) {
            var _a;
            var _this = this;
            this.options = options;
            this.compilation = undefined;
            this.factoryToSourceInfo = null;
            this.sourceToFactorySymbols = null;
            this._coreImportsFrom = undefined;
            this._reflector = undefined;
            this._isCore = undefined;
            this.rootDirs = [];
            if (options.rootDirs !== undefined) {
                (_a = this.rootDirs).push.apply(_a, tslib_1.__spread(options.rootDirs));
            }
            else if (options.rootDir !== undefined) {
                this.rootDirs.push(options.rootDir);
            }
            else {
                this.rootDirs.push(host.getCurrentDirectory());
            }
            this.closureCompilerEnabled = !!options.annotateForClosureCompiler;
            this.resourceLoader = host.readResource !== undefined ?
                new resource_loader_1.HostResourceLoader(host.readResource.bind(host)) :
                new resource_loader_1.FileResourceLoader();
            var shouldGenerateShims = options.allowEmptyCodegenFiles || false;
            this.host = host;
            var rootFiles = tslib_1.__spread(rootNames);
            if (shouldGenerateShims) {
                // Summary generation.
                var summaryGenerator = shims_1.SummaryGenerator.forRootFiles(rootNames);
                // Factory generation.
                var factoryGenerator = shims_1.FactoryGenerator.forRootFiles(rootNames);
                var factoryFileMap = factoryGenerator.factoryFileMap;
                this.factoryToSourceInfo = new Map();
                this.sourceToFactorySymbols = new Map();
                factoryFileMap.forEach(function (sourceFilePath, factoryPath) {
                    var moduleSymbolNames = new Set();
                    _this.sourceToFactorySymbols.set(sourceFilePath, moduleSymbolNames);
                    _this.factoryToSourceInfo.set(factoryPath, { sourceFilePath: sourceFilePath, moduleSymbolNames: moduleSymbolNames });
                });
                var factoryFileNames = Array.from(factoryFileMap.keys());
                rootFiles.push.apply(rootFiles, tslib_1.__spread(factoryFileNames, summaryGenerator.getSummaryFileNames()));
                this.host = new shims_1.GeneratedShimsHostWrapper(host, [summaryGenerator, factoryGenerator]);
            }
            this.tsProgram =
                ts.createProgram(rootFiles, options, this.host, oldProgram && oldProgram.getTsProgram());
        }
        NgtscProgram.prototype.getTsProgram = function () { return this.tsProgram; };
        NgtscProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
            return this.tsProgram.getOptionsDiagnostics(cancellationToken);
        };
        NgtscProgram.prototype.getNgOptionDiagnostics = function (cancellationToken) {
            return [];
        };
        NgtscProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
        };
        NgtscProgram.prototype.getNgStructuralDiagnostics = function (cancellationToken) {
            return [];
        };
        NgtscProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
        };
        NgtscProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
            var compilation = this.ensureAnalyzed();
            var diagnostics = tslib_1.__spread(compilation.diagnostics);
            if (!!this.options.fullTemplateTypeCheck) {
                var ctx = new typecheck_1.TypeCheckContext();
                compilation.typeCheck(ctx);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(this.compileTypeCheckProgram(ctx)));
            }
            return diagnostics;
        };
        NgtscProgram.prototype.loadNgStructureAsync = function () {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.compilation === undefined) {
                                this.compilation = this.makeCompilation();
                            }
                            return [4 /*yield*/, Promise.all(this.tsProgram.getSourceFiles()
                                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                                    .map(function (file) { return _this.compilation.analyzeAsync(file); })
                                    .filter(function (result) { return result !== undefined; }))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NgtscProgram.prototype.listLazyRoutes = function (entryRoute) { return []; };
        NgtscProgram.prototype.getLibrarySummaries = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedGeneratedFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedSourceFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.ensureAnalyzed = function () {
            var _this = this;
            if (this.compilation === undefined) {
                this.compilation = this.makeCompilation();
                this.tsProgram.getSourceFiles()
                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                    .forEach(function (file) { return _this.compilation.analyzeSync(file); });
            }
            return this.compilation;
        };
        NgtscProgram.prototype.emit = function (opts) {
            var _this = this;
            var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            this.ensureAnalyzed();
            // Since there is no .d.ts transformation API, .d.ts files are transformed during write.
            var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                if (fileName.endsWith('.d.ts')) {
                    data = sourceFiles.reduce(function (data, sf) { return _this.compilation.transformedDtsFor(sf.fileName, data); }, data);
                }
                else if (_this.closureCompilerEnabled && fileName.endsWith('.ts')) {
                    data = nocollapse_hack_1.nocollapseHack(data);
                }
                _this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
            var transforms = [transform_1.ivyTransformFactory(this.compilation, this.reflector, this.coreImportsFrom)];
            if (this.factoryToSourceInfo !== null) {
                transforms.push(shims_1.generatedFactoryTransform(this.factoryToSourceInfo, this.coreImportsFrom));
            }
            if (this.isCore) {
                transforms.push(switch_1.ivySwitchTransform);
            }
            // Run the emit, including a custom transformer that will downlevel the Ivy decorators in code.
            var emitResult = emitCallback({
                program: this.tsProgram,
                host: this.host,
                options: this.options,
                emitOnlyDtsFiles: false, writeFile: writeFile,
                customTransformers: {
                    before: transforms,
                },
            });
            return emitResult;
        };
        NgtscProgram.prototype.compileTypeCheckProgram = function (ctx) {
            var host = new typecheck_1.TypeCheckProgramHost(this.tsProgram, this.host, ctx);
            var auxProgram = ts.createProgram({
                host: host,
                rootNames: this.tsProgram.getRootFileNames(),
                oldProgram: this.tsProgram,
                options: this.options,
            });
            return auxProgram.getSemanticDiagnostics();
        };
        NgtscProgram.prototype.makeCompilation = function () {
            var checker = this.tsProgram.getTypeChecker();
            var scopeRegistry = new annotations_1.SelectorScopeRegistry(checker, this.reflector);
            var referencesRegistry = new annotations_1.NoopReferencesRegistry();
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new base_def_1.BaseDefDecoratorHandler(checker, this.reflector),
                new annotations_1.ComponentDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore, this.resourceLoader, this.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false),
                new annotations_1.DirectiveDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(checker, this.reflector, scopeRegistry, referencesRegistry, this.isCore),
                new annotations_1.PipeDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
            ];
            return new transform_1.IvyCompilation(handlers, checker, this.reflector, this.coreImportsFrom, this.sourceToFactorySymbols);
        };
        Object.defineProperty(NgtscProgram.prototype, "reflector", {
            get: function () {
                if (this._reflector === undefined) {
                    this._reflector = new metadata_1.TypeScriptReflectionHost(this.tsProgram.getTypeChecker());
                }
                return this._reflector;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "coreImportsFrom", {
            get: function () {
                if (this._coreImportsFrom === undefined) {
                    this._coreImportsFrom = this.isCore && getR3SymbolsFile(this.tsProgram) || null;
                }
                return this._coreImportsFrom;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "isCore", {
            get: function () {
                if (this._isCore === undefined) {
                    this._isCore = isAngularCorePackage(this.tsProgram);
                }
                return this._isCore;
            },
            enumerable: true,
            configurable: true
        });
        return NgtscProgram;
    }());
    exports.NgtscProgram = NgtscProgram;
    var defaultEmitCallback = function (_a) {
        var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
        return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    };
    function mergeEmitResults(emitResults) {
        var e_1, _a;
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        try {
            for (var emitResults_1 = tslib_1.__values(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, tslib_1.__spread(er.diagnostics));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, tslib_1.__spread((er.emittedFiles || [])));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
    /**
     * Find the 'r3_symbols.ts' file in the given `Program`, or return `null` if it wasn't there.
     */
    function getR3SymbolsFile(program) {
        return program.getSourceFiles().find(function (file) { return file.fileName.indexOf('r3_symbols.ts') >= 0; }) || null;
    }
    /**
     * Determine if the given `Program` is @angular/core.
     */
    function isAngularCorePackage(program) {
        // Look for its_just_angular.ts somewhere in the program.
        var r3Symbols = getR3SymbolsFile(program);
        if (r3Symbols === null) {
            return false;
        }
        // Look for the constant ITS_JUST_ANGULAR in that file.
        return r3Symbols.statements.some(function (stmt) {
            // The statement must be a variable declaration statement.
            if (!ts.isVariableStatement(stmt)) {
                return false;
            }
            // It must be exported.
            if (stmt.modifiers === undefined ||
                !stmt.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; })) {
                return false;
            }
            // It must declare ITS_JUST_ANGULAR.
            return stmt.declarationList.declarations.some(function (decl) {
                // The declaration must match the name.
                if (!ts.isIdentifier(decl.name) || decl.name.text !== 'ITS_JUST_ANGULAR') {
                    return false;
                }
                // It must initialize the variable to true.
                if (decl.initializer === undefined || decl.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
                    return false;
                }
                // This definition matches.
                return true;
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBRS9ELDJFQUE4TjtJQUM5TixxRkFBbUU7SUFDbkUscUVBQW9EO0lBQ3BELG1GQUF5RTtJQUN6RSwrREFBOEg7SUFDOUgsaUVBQTRDO0lBQzVDLHVFQUFnRTtJQUNoRSx1RUFBbUU7SUFFbkU7UUFjRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQ3RFLElBQXNCLEVBQUUsVUFBd0I7O1lBRnBELGlCQXdDQztZQXZDNkMsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7WUFabEUsZ0JBQVcsR0FBNkIsU0FBUyxDQUFDO1lBQ2xELHdCQUFtQixHQUFrQyxJQUFJLENBQUM7WUFDMUQsMkJBQXNCLEdBQWtDLElBQUksQ0FBQztZQUU3RCxxQkFBZ0IsR0FBaUMsU0FBUyxDQUFDO1lBQzNELGVBQVUsR0FBdUMsU0FBUyxDQUFDO1lBQzNELFlBQU8sR0FBc0IsU0FBUyxDQUFDO1lBUTdDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLENBQUEsS0FBQSxJQUFJLENBQUMsUUFBUSxDQUFBLENBQUMsSUFBSSw0QkFBSSxPQUFPLENBQUMsUUFBUSxHQUFFO2FBQ3pDO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNyQztpQkFBTTtnQkFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVB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QUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFBLElBQUk7Z0JBQ2hELHVDQUF1QztnQkFDdkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO29CQUN4RSxPQUFPLEtBQUssQ0FBQztpQkFDZDtnQkFDRCwyQ0FBMkM7Z0JBQzNDLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUU7b0JBQ3pGLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELDJCQUEyQjtnQkFDM0IsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtHZW5lcmF0ZWRGaWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7bm9jb2xsYXBzZUhhY2t9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9ub2NvbGxhcHNlX2hhY2snO1xuXG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIE5vb3BSZWZlcmVuY2VzUmVnaXN0cnksIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZXNvdXJjZUxvYWRlciwgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL2Fubm90YXRpb25zJztcbmltcG9ydCB7QmFzZURlZkRlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4vYW5ub3RhdGlvbnMvc3JjL2Jhc2VfZGVmJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7RmlsZVJlc291cmNlTG9hZGVyLCBIb3N0UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vcmVzb3VyY2VfbG9hZGVyJztcbmltcG9ydCB7RmFjdG9yeUdlbmVyYXRvciwgRmFjdG9yeUluZm8sIEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIsIFN1bW1hcnlHZW5lcmF0b3IsIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm19IGZyb20gJy4vc2hpbXMnO1xuaW1wb3J0IHtpdnlTd2l0Y2hUcmFuc2Zvcm19IGZyb20gJy4vc3dpdGNoJztcbmltcG9ydCB7SXZ5Q29tcGlsYXRpb24sIGl2eVRyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vdHJhbnNmb3JtJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNrUHJvZ3JhbUhvc3R9IGZyb20gJy4vdHlwZWNoZWNrJztcblxuZXhwb3J0IGNsYXNzIE5ndHNjUHJvZ3JhbSBpbXBsZW1lbnRzIGFwaS5Qcm9ncmFtIHtcbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmVzb3VyY2VMb2FkZXI6IFJlc291cmNlTG9hZGVyO1xuICBwcml2YXRlIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgZmFjdG9yeVRvU291cmNlSW5mbzogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3Q7XG4gIHByaXZhdGUgX2NvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZXxudWxsfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9pc0NvcmU6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIHJvb3REaXJzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuXG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdDogYXBpLkNvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IGFwaS5Qcm9ncmFtKSB7XG4gICAgdGhpcy5yb290RGlycyA9IFtdO1xuICAgIGlmIChvcHRpb25zLnJvb3REaXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucm9vdERpcnMucHVzaCguLi5vcHRpb25zLnJvb3REaXJzKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnJvb3REaXJzLnB1c2gob3B0aW9ucy5yb290RGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yb290RGlycy5wdXNoKGhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpKTtcbiAgICB9XG4gICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkID0gISFvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuICAgIHRoaXMucmVzb3VyY2VMb2FkZXIgPSBob3N0LnJlYWRSZXNvdXJjZSAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgbmV3IEhvc3RSZXNvdXJjZUxvYWRlcihob3N0LnJlYWRSZXNvdXJjZS5iaW5kKGhvc3QpKSA6XG4gICAgICAgIG5ldyBGaWxlUmVzb3VyY2VMb2FkZXIoKTtcbiAgICBjb25zdCBzaG91bGRHZW5lcmF0ZVNoaW1zID0gb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzIHx8IGZhbHNlO1xuICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgbGV0IHJvb3RGaWxlcyA9IFsuLi5yb290TmFtZXNdO1xuICAgIGlmIChzaG91bGRHZW5lcmF0ZVNoaW1zKSB7XG4gICAgICAvLyBTdW1tYXJ5IGdlbmVyYXRpb24uXG4gICAgICBjb25zdCBzdW1tYXJ5R2VuZXJhdG9yID0gU3VtbWFyeUdlbmVyYXRvci5mb3JSb290RmlsZXMocm9vdE5hbWVzKTtcblxuICAgICAgLy8gRmFjdG9yeSBnZW5lcmF0aW9uLlxuICAgICAgY29uc3QgZmFjdG9yeUdlbmVyYXRvciA9IEZhY3RvcnlHZW5lcmF0b3IuZm9yUm9vdEZpbGVzKHJvb3ROYW1lcyk7XG4gICAgICBjb25zdCBmYWN0b3J5RmlsZU1hcCA9IGZhY3RvcnlHZW5lcmF0b3IuZmFjdG9yeUZpbGVNYXA7XG4gICAgICB0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8gPSBuZXcgTWFwPHN0cmluZywgRmFjdG9yeUluZm8+KCk7XG4gICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgICBmYWN0b3J5RmlsZU1hcC5mb3JFYWNoKChzb3VyY2VGaWxlUGF0aCwgZmFjdG9yeVBhdGgpID0+IHtcbiAgICAgICAgY29uc3QgbW9kdWxlU3ltYm9sTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzICEuc2V0KHNvdXJjZUZpbGVQYXRoLCBtb2R1bGVTeW1ib2xOYW1lcyk7XG4gICAgICAgIHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyAhLnNldChmYWN0b3J5UGF0aCwge3NvdXJjZUZpbGVQYXRoLCBtb2R1bGVTeW1ib2xOYW1lc30pO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTmFtZXMgPSBBcnJheS5mcm9tKGZhY3RvcnlGaWxlTWFwLmtleXMoKSk7XG4gICAgICByb290RmlsZXMucHVzaCguLi5mYWN0b3J5RmlsZU5hbWVzLCAuLi5zdW1tYXJ5R2VuZXJhdG9yLmdldFN1bW1hcnlGaWxlTmFtZXMoKSk7XG4gICAgICB0aGlzLmhvc3QgPSBuZXcgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlcihob3N0LCBbc3VtbWFyeUdlbmVyYXRvciwgZmFjdG9yeUdlbmVyYXRvcl0pO1xuICAgIH1cblxuICAgIHRoaXMudHNQcm9ncmFtID1cbiAgICAgICAgdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIG9wdGlvbnMsIHRoaXMuaG9zdCwgb2xkUHJvZ3JhbSAmJiBvbGRQcm9ncmFtLmdldFRzUHJvZ3JhbSgpKTtcbiAgfVxuXG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHsgcmV0dXJuIHRoaXMudHNQcm9ncmFtOyB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8YXBpLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTxhcGkuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgZmlsZU5hbWU/OiBzdHJpbmd8dW5kZWZpbmVkLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IFsuLi5jb21waWxhdGlvbi5kaWFnbm9zdGljc107XG4gICAgaWYgKCEhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgY29uc3QgY3R4ID0gbmV3IFR5cGVDaGVja0NvbnRleHQoKTtcbiAgICAgIGNvbXBpbGF0aW9uLnR5cGVDaGVjayhjdHgpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmNvbXBpbGVUeXBlQ2hlY2tQcm9ncmFtKGN0eCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBhc3luYyBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICB9XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZmlsZSA9PiB0aGlzLmNvbXBpbGF0aW9uICEuYW5hbHl6ZUFzeW5jKGZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChyZXN1bHQpOiByZXN1bHQgaXMgUHJvbWlzZTx2b2lkPiA9PiByZXN1bHQgIT09IHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10geyByZXR1cm4gW107IH1cblxuICBnZXRMaWJyYXJ5U3VtbWFyaWVzKCk6IE1hcDxzdHJpbmcsIGFwaS5MaWJyYXJ5U3VtbWFyeT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFuYWx5emVkKCk6IEl2eUNvbXBpbGF0aW9uIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpXG4gICAgICAgICAgLmZvckVhY2goZmlsZSA9PiB0aGlzLmNvbXBpbGF0aW9uICEuYW5hbHl6ZVN5bmMoZmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbjtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBTaW5jZSB0aGVyZSBpcyBubyAuZC50cyB0cmFuc2Zvcm1hdGlvbiBBUEksIC5kLnRzIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBkdXJpbmcgd3JpdGUuXG4gICAgY29uc3Qgd3JpdGVGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCxcbiAgICAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KSA9PiB7XG4gICAgICAgICAgaWYgKGZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgICBkYXRhID0gc291cmNlRmlsZXMucmVkdWNlKFxuICAgICAgICAgICAgICAgIChkYXRhLCBzZikgPT4gdGhpcy5jb21waWxhdGlvbiAhLnRyYW5zZm9ybWVkRHRzRm9yKHNmLmZpbGVOYW1lLCBkYXRhKSwgZGF0YSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgJiYgZmlsZU5hbWUuZW5kc1dpdGgoJy50cycpKSB7XG4gICAgICAgICAgICBkYXRhID0gbm9jb2xsYXBzZUhhY2soZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgdHJhbnNmb3JtcyA9XG4gICAgICAgIFtpdnlUcmFuc2Zvcm1GYWN0b3J5KHRoaXMuY29tcGlsYXRpb24gISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY29yZUltcG9ydHNGcm9tKV07XG4gICAgaWYgKHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyAhPT0gbnVsbCkge1xuICAgICAgdHJhbnNmb3Jtcy5wdXNoKGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm0odGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvLCB0aGlzLmNvcmVJbXBvcnRzRnJvbSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHRyYW5zZm9ybXMucHVzaChpdnlTd2l0Y2hUcmFuc2Zvcm0pO1xuICAgIH1cbiAgICAvLyBSdW4gdGhlIGVtaXQsIGluY2x1ZGluZyBhIGN1c3RvbSB0cmFuc2Zvcm1lciB0aGF0IHdpbGwgZG93bmxldmVsIHRoZSBJdnkgZGVjb3JhdG9ycyBpbiBjb2RlLlxuICAgIGNvbnN0IGVtaXRSZXN1bHQgPSBlbWl0Q2FsbGJhY2soe1xuICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICBlbWl0T25seUR0c0ZpbGVzOiBmYWxzZSwgd3JpdGVGaWxlLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB7XG4gICAgICAgIGJlZm9yZTogdHJhbnNmb3JtcyxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgcmV0dXJuIGVtaXRSZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIGNvbXBpbGVUeXBlQ2hlY2tQcm9ncmFtKGN0eDogVHlwZUNoZWNrQ29udGV4dCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGhvc3QgPSBuZXcgVHlwZUNoZWNrUHJvZ3JhbUhvc3QodGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdCwgY3R4KTtcbiAgICBjb25zdCBhdXhQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICBob3N0LFxuICAgICAgcm9vdE5hbWVzOiB0aGlzLnRzUHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKCksXG4gICAgICBvbGRQcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgICByZXR1cm4gYXV4UHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKCk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBJdnlDb21waWxhdGlvbiB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9IG5ldyBTZWxlY3RvclNjb3BlUmVnaXN0cnkoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGNvbnN0IHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5KCk7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzID0gW1xuICAgICAgbmV3IEJhc2VEZWZEZWNvcmF0b3JIYW5kbGVyKGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZUxvYWRlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSwgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UpLFxuICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IsIHNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICBjaGVja2VyLCB0aGlzLnJlZmxlY3Rvciwgc2NvcGVSZWdpc3RyeSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IsIHNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICBdO1xuXG4gICAgcmV0dXJuIG5ldyBJdnlDb21waWxhdGlvbihcbiAgICAgICAgaGFuZGxlcnMsIGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNvcmVJbXBvcnRzRnJvbSwgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlZmxlY3RvcigpOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3Qge1xuICAgIGlmICh0aGlzLl9yZWZsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcmVmbGVjdG9yID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCh0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3JlZmxlY3RvcjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGNvcmVJbXBvcnRzRnJvbSgpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIGlmICh0aGlzLl9jb3JlSW1wb3J0c0Zyb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY29yZUltcG9ydHNGcm9tID0gdGhpcy5pc0NvcmUgJiYgZ2V0UjNTeW1ib2xzRmlsZSh0aGlzLnRzUHJvZ3JhbSkgfHwgbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NvcmVJbXBvcnRzRnJvbTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGlzQ29yZSgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5faXNDb3JlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2lzQ29yZSA9IGlzQW5ndWxhckNvcmVQYWNrYWdlKHRoaXMudHNQcm9ncmFtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2lzQ29yZTtcbiAgfVxufVxuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBhcGkuVHNFbWl0Q2FsbGJhY2sgPVxuICAgICh7cHJvZ3JhbSwgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVyc30pID0+XG4gICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuIl19