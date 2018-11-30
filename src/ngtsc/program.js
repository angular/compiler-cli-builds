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
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new base_def_1.BaseDefDecoratorHandler(checker, this.reflector),
                new annotations_1.ComponentDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore, this.resourceLoader, this.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false),
                new annotations_1.DirectiveDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBRS9ELDJFQUFzTTtJQUN0TSxxRkFBbUU7SUFDbkUscUVBQW9EO0lBQ3BELG1GQUF5RTtJQUN6RSwrREFBOEg7SUFDOUgsaUVBQTRDO0lBQzVDLHVFQUFnRTtJQUNoRSx1RUFBbUU7SUFFbkU7UUFjRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQ3RFLElBQXNCLEVBQUUsVUFBd0I7O1lBRnBELGlCQXdDQztZQXZDNkMsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7WUFabEUsZ0JBQVcsR0FBNkIsU0FBUyxDQUFDO1lBQ2xELHdCQUFtQixHQUFrQyxJQUFJLENBQUM7WUFDMUQsMkJBQXNCLEdBQWtDLElBQUksQ0FBQztZQUU3RCxxQkFBZ0IsR0FBaUMsU0FBUyxDQUFDO1lBQzNELGVBQVUsR0FBdUMsU0FBUyxDQUFDO1lBQzNELFlBQU8sR0FBc0IsU0FBUyxDQUFDO1lBUTdDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLENBQUEsS0FBQSxJQUFJLENBQUMsUUFBUSxDQUFBLENBQUMsSUFBSSw0QkFBSSxPQUFPLENBQUMsUUFBUSxHQUFFO2FBQ3pDO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNyQztpQkFBTTtnQkFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUM7WUFDbkUsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLG9DQUFrQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxvQ0FBa0IsRUFBRSxDQUFDO1lBQzdCLElBQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixJQUFJLEtBQUssQ0FBQztZQUNwRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLFNBQVMsb0JBQU8sU0FBUyxDQUFDLENBQUM7WUFDL0IsSUFBSSxtQkFBbUIsRUFBRTtnQkFDdkIsc0JBQXNCO2dCQUN0QixJQUFNLGdCQUFnQixHQUFHLHdCQUFnQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFFbEUsc0JBQXNCO2dCQUN0QixJQUFNLGdCQUFnQixHQUFHLHdCQUFnQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDbEUsSUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7Z0JBQzFELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztnQkFDN0QsY0FBYyxDQUFDLE9BQU8sQ0FBQyxVQUFDLGNBQWMsRUFBRSxXQUFXO29CQUNqRCxJQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7b0JBQzVDLEtBQUksQ0FBQyxzQkFBd0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUM7b0JBQ3JFLEtBQUksQ0FBQyxtQkFBcUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUMsY0FBYyxnQkFBQSxFQUFFLGlCQUFpQixtQkFBQSxFQUFDLENBQUMsQ0FBQztnQkFDbkYsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsSUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRCxTQUFTLENBQUMsSUFBSSxPQUFkLFNBQVMsbUJBQVMsZ0JBQWdCLEVBQUssZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsR0FBRTtnQkFDL0UsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLGlDQUF5QixDQUFDLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQzthQUN2RjtZQUVELElBQUksQ0FBQyxTQUFTO2dCQUNWLEVBQUUsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsSUFBSSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBRUQsbUNBQVksR0FBWixjQUE2QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRXJELDZDQUFzQixHQUF0QixVQUF1QixpQkFDUztZQUM5QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsNkNBQXNCLEdBQXRCLFVBQXVCLGlCQUNTO1lBQzlCLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELGdEQUF5QixHQUF6QixVQUNJLFVBQW9DLEVBQ3BDLGlCQUFrRDtZQUNwRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDL0UsQ0FBQztRQUVELGlEQUEwQixHQUExQixVQUEyQixpQkFDUztZQUNsQyxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCwrQ0FBd0IsR0FBeEIsVUFDSSxVQUFvQyxFQUNwQyxpQkFBa0Q7WUFDcEQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzlFLENBQUM7UUFFRCwrQ0FBd0IsR0FBeEIsVUFDSSxRQUEyQixFQUFFLGlCQUNTO1lBQ3hDLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQyxJQUFNLFdBQVcsb0JBQU8sV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUU7Z0JBQ3hDLElBQU0sR0FBRyxHQUFHLElBQUksNEJBQWdCLEVBQUUsQ0FBQztnQkFDbkMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLEdBQUU7YUFDeEQ7WUFDRCxPQUFPLFdBQVcsQ0FBQztRQUNyQixDQUFDO1FBRUssMkNBQW9CLEdBQTFCOzs7Ozs7NEJBQ0UsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRTtnQ0FDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7NkJBQzNDOzRCQUNELHFCQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUU7cUNBQzFCLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQWhDLENBQWdDLENBQUM7cUNBQ2hELEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUksQ0FBQyxXQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFyQyxDQUFxQyxDQUFDO3FDQUNsRCxNQUFNLENBQUMsVUFBQyxNQUFNLElBQThCLE9BQUEsTUFBTSxLQUFLLFNBQVMsRUFBcEIsQ0FBb0IsQ0FBQyxDQUFDLEVBQUE7OzRCQUh6RixTQUd5RixDQUFDOzs7OztTQUMzRjtRQUVELHFDQUFjLEdBQWQsVUFBZSxVQUE2QixJQUFxQixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0UsMENBQW1CLEdBQW5CO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCwrQ0FBd0IsR0FBeEI7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELDRDQUFxQixHQUFyQjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRU8scUNBQWMsR0FBdEI7WUFBQSxpQkFRQztZQVBDLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRTtxQkFDMUIsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBaEMsQ0FBZ0MsQ0FBQztxQkFDaEQsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLFdBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQXBDLENBQW9DLENBQUMsQ0FBQzthQUM1RDtZQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUMxQixDQUFDO1FBRUQsMkJBQUksR0FBSixVQUFLLElBTUo7WUFORCxpQkE0Q0M7WUFyQ0MsSUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksbUJBQW1CLENBQUM7WUFFdEUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRXRCLHdGQUF3RjtZQUN4RixJQUFNLFNBQVMsR0FDWCxVQUFDLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUFnRCxFQUNoRCxXQUF5QztnQkFDeEMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUM5QixJQUFJLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FDckIsVUFBQyxJQUFJLEVBQUUsRUFBRSxJQUFLLE9BQUEsS0FBSSxDQUFDLFdBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUF2RCxDQUF1RCxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNsRjtxQkFBTSxJQUFJLEtBQUksQ0FBQyxzQkFBc0IsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNsRSxJQUFJLEdBQUcsZ0NBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0I7Z0JBQ0QsS0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDaEYsQ0FBQyxDQUFDO1lBRU4sSUFBTSxVQUFVLEdBQ1osQ0FBQywrQkFBbUIsQ0FBQyxJQUFJLENBQUMsV0FBYSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDcEYsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEtBQUssSUFBSSxFQUFFO2dCQUNyQyxVQUFVLENBQUMsSUFBSSxDQUFDLGlDQUF5QixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQzthQUM1RjtZQUNELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDZixVQUFVLENBQUMsSUFBSSxDQUFDLDJCQUFrQixDQUFDLENBQUM7YUFDckM7WUFDRCwrRkFBK0Y7WUFDL0YsSUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDO2dCQUM5QixPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLGdCQUFnQixFQUFFLEtBQUssRUFBRSxTQUFTLFdBQUE7Z0JBQ2xDLGtCQUFrQixFQUFFO29CQUNsQixNQUFNLEVBQUUsVUFBVTtpQkFDbkI7YUFDRixDQUFDLENBQUM7WUFDSCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRU8sOENBQXVCLEdBQS9CLFVBQWdDLEdBQXFCO1lBQ25ELElBQU0sSUFBSSxHQUFHLElBQUksZ0NBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RFLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUM7Z0JBQ2xDLElBQUksTUFBQTtnQkFDSixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDNUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUMxQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87YUFDdEIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM3QyxDQUFDO1FBRU8sc0NBQWUsR0FBdkI7WUFDRSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hELElBQU0sYUFBYSxHQUFHLElBQUksbUNBQXFCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV6RSwwRUFBMEU7WUFDMUUsSUFBTSxRQUFRLEdBQUc7Z0JBQ2YsSUFBSSxrQ0FBdUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDcEQsSUFBSSx1Q0FBeUIsQ0FDekIsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUN2RixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixJQUFJLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixLQUFLLEtBQUssQ0FBQztnQkFDekYsSUFBSSx1Q0FBeUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDbEYsSUFBSSx3Q0FBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQzNELElBQUksc0NBQXdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ2pGLElBQUksa0NBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7YUFDOUUsQ0FBQztZQUVGLE9BQU8sSUFBSSwwQkFBYyxDQUNyQixRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM1RixDQUFDO1FBRUQsc0JBQVksbUNBQVM7aUJBQXJCO2dCQUNFLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUU7b0JBQ2pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxtQ0FBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7aUJBQ2pGO2dCQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN6QixDQUFDOzs7V0FBQTtRQUVELHNCQUFZLHlDQUFlO2lCQUEzQjtnQkFDRSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7b0JBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUM7aUJBQ2pGO2dCQUNELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQy9CLENBQUM7OztXQUFBO1FBRUQsc0JBQVksZ0NBQU07aUJBQWxCO2dCQUNFLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7b0JBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUNyRDtnQkFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDdEIsQ0FBQzs7O1dBQUE7UUFDSCxtQkFBQztJQUFELENBQUMsQUFyT0QsSUFxT0M7SUFyT1ksb0NBQVk7SUF1T3pCLElBQU0sbUJBQW1CLEdBQ3JCLFVBQUMsRUFDb0I7WUFEbkIsb0JBQU8sRUFBRSxzQ0FBZ0IsRUFBRSx3QkFBUyxFQUFFLHdDQUFpQixFQUFFLHNDQUFnQixFQUN6RSwwQ0FBa0I7UUFDaEIsT0FBQSxPQUFPLENBQUMsSUFBSSxDQUNSLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsQ0FBQztJQUR6RixDQUN5RixDQUFDO0lBRWxHLFNBQVMsZ0JBQWdCLENBQUMsV0FBNEI7O1FBQ3BELElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7UUFDeEMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQzs7WUFDbEMsS0FBaUIsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUEsaUVBQUU7Z0JBQXpCLElBQU0sRUFBRSx3QkFBQTtnQkFDWCxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLEVBQUUsQ0FBQyxXQUFXLEdBQUU7Z0JBQ3BDLFdBQVcsR0FBRyxXQUFXLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDNUMsWUFBWSxDQUFDLElBQUksT0FBakIsWUFBWSxtQkFBUyxDQUFDLEVBQUUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUU7YUFDL0M7Ozs7Ozs7OztRQUNELE9BQU8sRUFBQyxXQUFXLGFBQUEsRUFBRSxXQUFXLGFBQUEsRUFBRSxZQUFZLGNBQUEsRUFBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsZ0JBQWdCLENBQUMsT0FBbUI7UUFDM0MsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUEzQyxDQUEyQyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ3BHLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsb0JBQW9CLENBQUMsT0FBbUI7UUFDL0MseURBQXlEO1FBQ3pELElBQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsdURBQXVEO1FBQ3ZELE9BQU8sU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxJQUFJO1lBQ25DLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsdUJBQXVCO1lBQ3ZCLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO2dCQUM1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBeEMsQ0FBd0MsQ0FBQyxFQUFFO2dCQUN6RSxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0Qsb0NBQW9DO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSTtnQkFDaEQsdUNBQXVDO2dCQUN2QyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssa0JBQWtCLEVBQUU7b0JBQ3hFLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELDJDQUEyQztnQkFDM0MsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRTtvQkFDekYsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsMkJBQTJCO2dCQUMzQixPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4uL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtub2NvbGxhcHNlSGFja30gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL25vY29sbGFwc2VfaGFjayc7XG5cbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlc291cmNlTG9hZGVyLCBTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9hbm5vdGF0aW9ucy9zcmMvYmFzZV9kZWYnO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtGaWxlUmVzb3VyY2VMb2FkZXIsIEhvc3RSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9yZXNvdXJjZV9sb2FkZXInO1xuaW1wb3J0IHtGYWN0b3J5R2VuZXJhdG9yLCBGYWN0b3J5SW5mbywgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlciwgU3VtbWFyeUdlbmVyYXRvciwgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi9zd2l0Y2gnO1xuaW1wb3J0IHtJdnlDb21waWxhdGlvbiwgaXZ5VHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUeXBlQ2hlY2tDb250ZXh0LCBUeXBlQ2hlY2tQcm9ncmFtSG9zdH0gZnJvbSAnLi90eXBlY2hlY2snO1xuXG5leHBvcnQgY2xhc3MgTmd0c2NQcm9ncmFtIGltcGxlbWVudHMgYXBpLlByb2dyYW0ge1xuICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSByZXNvdXJjZUxvYWRlcjogUmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBmYWN0b3J5VG9Tb3VyY2VJbmZvOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc291cmNlVG9GYWN0b3J5U3ltYm9sczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcbiAgcHJpdmF0ZSBfY29yZUltcG9ydHNGcm9tOiB0cy5Tb3VyY2VGaWxlfG51bGx8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9yZWZsZWN0b3I6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2lzQ29yZTogYm9vbGVhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdO1xuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG5cblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsXG4gICAgICBob3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogYXBpLlByb2dyYW0pIHtcbiAgICB0aGlzLnJvb3REaXJzID0gW107XG4gICAgaWYgKG9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5yb290RGlycy5wdXNoKC4uLm9wdGlvbnMucm9vdERpcnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucm9vdERpcnMucHVzaChvcHRpb25zLnJvb3REaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJvb3REaXJzLnB1c2goaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkpO1xuICAgIH1cbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIW9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG4gICAgdGhpcy5yZXNvdXJjZUxvYWRlciA9IGhvc3QucmVhZFJlc291cmNlICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBuZXcgSG9zdFJlc291cmNlTG9hZGVyKGhvc3QucmVhZFJlc291cmNlLmJpbmQoaG9zdCkpIDpcbiAgICAgICAgbmV3IEZpbGVSZXNvdXJjZUxvYWRlcigpO1xuICAgIGNvbnN0IHNob3VsZEdlbmVyYXRlU2hpbXMgPSBvcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgfHwgZmFsc2U7XG4gICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICBsZXQgcm9vdEZpbGVzID0gWy4uLnJvb3ROYW1lc107XG4gICAgaWYgKHNob3VsZEdlbmVyYXRlU2hpbXMpIHtcbiAgICAgIC8vIFN1bW1hcnkgZ2VuZXJhdGlvbi5cbiAgICAgIGNvbnN0IHN1bW1hcnlHZW5lcmF0b3IgPSBTdW1tYXJ5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhyb290TmFtZXMpO1xuXG4gICAgICAvLyBGYWN0b3J5IGdlbmVyYXRpb24uXG4gICAgICBjb25zdCBmYWN0b3J5R2VuZXJhdG9yID0gRmFjdG9yeUdlbmVyYXRvci5mb3JSb290RmlsZXMocm9vdE5hbWVzKTtcbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTWFwID0gZmFjdG9yeUdlbmVyYXRvci5mYWN0b3J5RmlsZU1hcDtcbiAgICAgIHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4oKTtcbiAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgICAgIGZhY3RvcnlGaWxlTWFwLmZvckVhY2goKHNvdXJjZUZpbGVQYXRoLCBmYWN0b3J5UGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2xOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIS5zZXQoc291cmNlRmlsZVBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzKTtcbiAgICAgICAgdGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvICEuc2V0KGZhY3RvcnlQYXRoLCB7c291cmNlRmlsZVBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzfSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZmFjdG9yeUZpbGVOYW1lcyA9IEFycmF5LmZyb20oZmFjdG9yeUZpbGVNYXAua2V5cygpKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmZhY3RvcnlGaWxlTmFtZXMsIC4uLnN1bW1hcnlHZW5lcmF0b3IuZ2V0U3VtbWFyeUZpbGVOYW1lcygpKTtcbiAgICAgIHRoaXMuaG9zdCA9IG5ldyBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyKGhvc3QsIFtzdW1tYXJ5R2VuZXJhdG9yLCBmYWN0b3J5R2VuZXJhdG9yXSk7XG4gICAgfVxuXG4gICAgdGhpcy50c1Byb2dyYW0gPVxuICAgICAgICB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCBvbGRQcm9ncmFtICYmIG9sZFByb2dyYW0uZ2V0VHNQcm9ncmFtKCkpO1xuICB9XG5cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW0geyByZXR1cm4gdGhpcy50c1Byb2dyYW07IH1cblxuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTxhcGkuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gWy4uLmNvbXBpbGF0aW9uLmRpYWdub3N0aWNzXTtcbiAgICBpZiAoISF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICBjb25zdCBjdHggPSBuZXcgVHlwZUNoZWNrQ29udGV4dCgpO1xuICAgICAgY29tcGlsYXRpb24udHlwZUNoZWNrKGN0eCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuY29tcGlsZVR5cGVDaGVja1Byb2dyYW0oY3R4KSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGFzeW5jIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZmlsZSA9PiAhZmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmaWxlID0+IHRoaXMuY29tcGlsYXRpb24gIS5hbmFseXplQXN5bmMoZmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHJlc3VsdCk6IHJlc3VsdCBpcyBQcm9taXNlPHZvaWQ+ID0+IHJlc3VsdCAhPT0gdW5kZWZpbmVkKSk7XG4gIH1cblxuICBsaXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlPzogc3RyaW5nfHVuZGVmaW5lZCk6IGFwaS5MYXp5Um91dGVbXSB7IHJldHVybiBbXTsgfVxuXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgYXBpLkxpYnJhcnlTdW1tYXJ5PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQW5hbHl6ZWQoKTogSXZ5Q29tcGlsYXRpb24ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgIC5maWx0ZXIoZmlsZSA9PiAhZmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSlcbiAgICAgICAgICAuZm9yRWFjaChmaWxlID0+IHRoaXMuY29tcGlsYXRpb24gIS5hbmFseXplU3luYyhmaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGF0aW9uO1xuICB9XG5cbiAgZW1pdChvcHRzPzoge1xuICAgIGVtaXRGbGFncz86IGFwaS5FbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBhcGkuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IGFwaS5Uc0VtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBhcGkuVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2tcbiAgfSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRDYWxsYmFjayA9IG9wdHMgJiYgb3B0cy5lbWl0Q2FsbGJhY2sgfHwgZGVmYXVsdEVtaXRDYWxsYmFjaztcblxuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIFNpbmNlIHRoZXJlIGlzIG5vIC5kLnRzIHRyYW5zZm9ybWF0aW9uIEFQSSwgLmQudHMgZmlsZXMgYXJlIHRyYW5zZm9ybWVkIGR1cmluZyB3cml0ZS5cbiAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgdW5kZWZpbmVkLFxuICAgICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pID0+IHtcbiAgICAgICAgICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgICAgICAgIGRhdGEgPSBzb3VyY2VGaWxlcy5yZWR1Y2UoXG4gICAgICAgICAgICAgICAgKGRhdGEsIHNmKSA9PiB0aGlzLmNvbXBpbGF0aW9uICEudHJhbnNmb3JtZWREdHNGb3Ioc2YuZmlsZU5hbWUsIGRhdGEpLCBkYXRhKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCAmJiBmaWxlTmFtZS5lbmRzV2l0aCgnLnRzJykpIHtcbiAgICAgICAgICAgIGRhdGEgPSBub2NvbGxhcHNlSGFjayhkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5ob3N0LndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCB0cmFuc2Zvcm1zID1cbiAgICAgICAgW2l2eVRyYW5zZm9ybUZhY3RvcnkodGhpcy5jb21waWxhdGlvbiAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jb3JlSW1wb3J0c0Zyb20pXTtcbiAgICBpZiAodGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvICE9PSBudWxsKSB7XG4gICAgICB0cmFuc2Zvcm1zLnB1c2goZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8sIHRoaXMuY29yZUltcG9ydHNGcm9tKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzQ29yZSkge1xuICAgICAgdHJhbnNmb3Jtcy5wdXNoKGl2eVN3aXRjaFRyYW5zZm9ybSk7XG4gICAgfVxuICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluIGNvZGUuXG4gICAgY29uc3QgZW1pdFJlc3VsdCA9IGVtaXRDYWxsYmFjayh7XG4gICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIGVtaXRPbmx5RHRzRmlsZXM6IGZhbHNlLCB3cml0ZUZpbGUsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgYmVmb3JlOiB0cmFuc2Zvcm1zLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICByZXR1cm4gZW1pdFJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGlsZVR5cGVDaGVja1Byb2dyYW0oY3R4OiBUeXBlQ2hlY2tDb250ZXh0KTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgaG9zdCA9IG5ldyBUeXBlQ2hlY2tQcm9ncmFtSG9zdCh0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0LCBjdHgpO1xuICAgIGNvbnN0IGF1eFByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHtcbiAgICAgIGhvc3QsXG4gICAgICByb290TmFtZXM6IHRoaXMudHNQcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKSxcbiAgICAgIG9sZFByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICAgIHJldHVybiBhdXhQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3MoKTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZUNvbXBpbGF0aW9uKCk6IEl2eUNvbXBpbGF0aW9uIHtcbiAgICBjb25zdCBjaGVja2VyID0gdGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID0gbmV3IFNlbGVjdG9yU2NvcGVSZWdpc3RyeShjaGVja2VyLCB0aGlzLnJlZmxlY3Rvcik7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzID0gW1xuICAgICAgbmV3IEJhc2VEZWZEZWNvcmF0b3JIYW5kbGVyKGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZUxvYWRlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSwgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UpLFxuICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IsIHNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihjaGVja2VyLCB0aGlzLnJlZmxlY3Rvciwgc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gICAgXTtcblxuICAgIHJldHVybiBuZXcgSXZ5Q29tcGlsYXRpb24oXG4gICAgICAgIGhhbmRsZXJzLCBjaGVja2VyLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jb3JlSW1wb3J0c0Zyb20sIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyk7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IHtcbiAgICBpZiAodGhpcy5fcmVmbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3JlZmxlY3RvciA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QodGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWZsZWN0b3I7XG4gIH1cblxuICBwcml2YXRlIGdldCBjb3JlSW1wb3J0c0Zyb20oKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBpZiAodGhpcy5fY29yZUltcG9ydHNGcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9IHRoaXMuaXNDb3JlICYmIGdldFIzU3ltYm9sc0ZpbGUodGhpcy50c1Byb2dyYW0pIHx8IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb3JlSW1wb3J0c0Zyb207XG4gIH1cblxuICBwcml2YXRlIGdldCBpc0NvcmUoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2lzQ29yZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9pc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLnRzUHJvZ3JhbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc0NvcmU7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID1cbiAgICAoe3Byb2dyYW0sIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnN9KSA9PlxuICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiBgUHJvZ3JhbWAgaXMgQGFuZ3VsYXIvY29yZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==