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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/transform"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var resource_loader_1 = require("@angular/compiler-cli/src/ngtsc/resource_loader");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, host, oldProgram) {
            this.options = options;
            this.host = host;
            this.compilation = undefined;
            this._coreImportsFrom = undefined;
            this._reflector = undefined;
            this._isCore = undefined;
            this.resourceLoader = host.readResource !== undefined ?
                new resource_loader_1.HostResourceLoader(host.readResource.bind(host)) :
                new resource_loader_1.FileResourceLoader();
            this.tsProgram =
                ts.createProgram(rootNames, options, host, oldProgram && oldProgram.getTsProgram());
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
            return [];
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
        NgtscProgram.prototype.emit = function (opts) {
            var _this = this;
            var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            if (this.compilation === undefined) {
                this.compilation = this.makeCompilation();
                this.tsProgram.getSourceFiles()
                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                    .forEach(function (file) { return _this.compilation.analyzeSync(file); });
            }
            // Since there is no .d.ts transformation API, .d.ts files are transformed during write.
            var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                if (fileName.endsWith('.d.ts')) {
                    data = sourceFiles.reduce(function (data, sf) { return _this.compilation.transformedDtsFor(sf.fileName, data); }, data);
                }
                _this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
            // Run the emit, including a custom transformer that will downlevel the Ivy decorators in code.
            var emitResult = emitCallback({
                program: this.tsProgram,
                host: this.host,
                options: this.options,
                emitOnlyDtsFiles: false, writeFile: writeFile,
                customTransformers: {
                    before: [transform_1.ivyTransformFactory(this.compilation, this.reflector, this.coreImportsFrom)],
                },
            });
            return emitResult;
        };
        NgtscProgram.prototype.makeCompilation = function () {
            var checker = this.tsProgram.getTypeChecker();
            var scopeRegistry = new annotations_1.SelectorScopeRegistry(checker, this.reflector);
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new annotations_1.ComponentDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore, this.resourceLoader),
                new annotations_1.DirectiveDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.isCore),
                new annotations_1.NgModuleDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
                new annotations_1.PipeDecoratorHandler(checker, this.reflector, scopeRegistry, this.isCore),
            ];
            return new transform_1.IvyCompilation(handlers, checker, this.reflector, this.coreImportsFrom);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCwrQkFBaUM7SUFJakMsMkVBQXNNO0lBQ3RNLHFFQUFvRDtJQUNwRCxtRkFBeUU7SUFDekUsdUVBQWdFO0lBRWhFO1FBU0Usc0JBQ0ksU0FBZ0MsRUFBVSxPQUE0QixFQUM5RCxJQUFzQixFQUFFLFVBQXdCO1lBRGQsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7WUFDOUQsU0FBSSxHQUFKLElBQUksQ0FBa0I7WUFSMUIsZ0JBQVcsR0FBNkIsU0FBUyxDQUFDO1lBRWxELHFCQUFnQixHQUFpQyxTQUFTLENBQUM7WUFDM0QsZUFBVSxHQUF1QyxTQUFTLENBQUM7WUFDM0QsWUFBTyxHQUFzQixTQUFTLENBQUM7WUFLN0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLG9DQUFrQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxvQ0FBa0IsRUFBRSxDQUFDO1lBRTdCLElBQUksQ0FBQyxTQUFTO2dCQUNWLEVBQUUsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxJQUFJLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLENBQUM7UUFFRCxtQ0FBWSxHQUFaLGNBQTZCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFckQsNkNBQXNCLEdBQXRCLFVBQXVCLGlCQUNTO1lBQzlCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFFRCw2Q0FBc0IsR0FBdEIsVUFBdUIsaUJBQ1M7WUFDOUIsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsZ0RBQXlCLEdBQXpCLFVBQ0ksVUFBb0MsRUFDcEMsaUJBQWtEO1lBQ3BELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMvRSxDQUFDO1FBRUQsaURBQTBCLEdBQTFCLFVBQTJCLGlCQUNTO1lBQ2xDLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELCtDQUF3QixHQUF4QixVQUNJLFVBQW9DLEVBQ3BDLGlCQUFrRDtZQUNwRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUVELCtDQUF3QixHQUF4QixVQUNJLFFBQTJCLEVBQzNCLGlCQUFrRDtZQUNwRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFSywyQ0FBb0IsR0FBMUI7Ozs7Ozs0QkFDRSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFO2dDQUNsQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzs2QkFDM0M7NEJBQ0QscUJBQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRTtxQ0FDMUIsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBaEMsQ0FBZ0MsQ0FBQztxQ0FDaEQsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLFdBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQXJDLENBQXFDLENBQUM7cUNBQ2xELE1BQU0sQ0FBQyxVQUFDLE1BQU0sSUFBOEIsT0FBQSxNQUFNLEtBQUssU0FBUyxFQUFwQixDQUFvQixDQUFDLENBQUMsRUFBQTs7NEJBSHpGLFNBR3lGLENBQUM7Ozs7O1NBQzNGO1FBRUQscUNBQWMsR0FBZCxVQUFlLFVBQTZCLElBQXFCLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RSwwQ0FBbUIsR0FBbkI7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELCtDQUF3QixHQUF4QjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsNENBQXFCLEdBQXJCO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCwyQkFBSSxHQUFKLFVBQUssSUFNSjtZQU5ELGlCQXdDQztZQWpDQyxJQUFNLFlBQVksR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxtQkFBbUIsQ0FBQztZQUV0RSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFO2dCQUNsQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUU7cUJBQzFCLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQWhDLENBQWdDLENBQUM7cUJBQ2hELE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUksQ0FBQyxXQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFwQyxDQUFvQyxDQUFDLENBQUM7YUFDNUQ7WUFFRCx3RkFBd0Y7WUFDeEYsSUFBTSxTQUFTLEdBQ1gsVUFBQyxRQUFnQixFQUFFLElBQVksRUFBRSxrQkFBMkIsRUFDM0QsT0FBZ0QsRUFDaEQsV0FBeUM7Z0JBQ3hDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDOUIsSUFBSSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQ3JCLFVBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSyxPQUFBLEtBQUksQ0FBQyxXQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBdkQsQ0FBdUQsRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDbEY7Z0JBQ0QsS0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDaEYsQ0FBQyxDQUFDO1lBR04sK0ZBQStGO1lBQy9GLElBQU0sVUFBVSxHQUFHLFlBQVksQ0FBQztnQkFDOUIsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsU0FBUyxXQUFBO2dCQUNsQyxrQkFBa0IsRUFBRTtvQkFDbEIsTUFBTSxFQUFFLENBQUMsK0JBQW1CLENBQUMsSUFBSSxDQUFDLFdBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztpQkFDeEY7YUFDRixDQUFDLENBQUM7WUFDSCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRU8sc0NBQWUsR0FBdkI7WUFDRSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hELElBQU0sYUFBYSxHQUFHLElBQUksbUNBQXFCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV6RSwwRUFBMEU7WUFDMUUsSUFBTSxRQUFRLEdBQUc7Z0JBQ2YsSUFBSSx1Q0FBeUIsQ0FDekIsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQztnQkFDN0UsSUFBSSx1Q0FBeUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDbEYsSUFBSSx3Q0FBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQzNELElBQUksc0NBQXdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ2pGLElBQUksa0NBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7YUFDOUUsQ0FBQztZQUVGLE9BQU8sSUFBSSwwQkFBYyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUVELHNCQUFZLG1DQUFTO2lCQUFyQjtnQkFDRSxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO29CQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksbUNBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2lCQUNqRjtnQkFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekIsQ0FBQzs7O1dBQUE7UUFFRCxzQkFBWSx5Q0FBZTtpQkFBM0I7Z0JBQ0UsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO29CQUN2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDO2lCQUNqRjtnQkFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvQixDQUFDOzs7V0FBQTtRQUVELHNCQUFZLGdDQUFNO2lCQUFsQjtnQkFDRSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO29CQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDckQ7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3RCLENBQUM7OztXQUFBO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBOUpELElBOEpDO0lBOUpZLG9DQUFZO0lBZ0t6QixJQUFNLG1CQUFtQixHQUNyQixVQUFDLEVBQ29CO1lBRG5CLG9CQUFPLEVBQUUsc0NBQWdCLEVBQUUsd0JBQVMsRUFBRSx3Q0FBaUIsRUFBRSxzQ0FBZ0IsRUFDekUsMENBQWtCO1FBQ2hCLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FDUixnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLENBQUM7SUFEekYsQ0FDeUYsQ0FBQztJQUVsRywwQkFBMEIsV0FBNEI7O1FBQ3BELElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7UUFDeEMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQzs7WUFDbEMsS0FBaUIsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUEsaUVBQUU7Z0JBQXpCLElBQU0sRUFBRSx3QkFBQTtnQkFDWCxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLEVBQUUsQ0FBQyxXQUFXLEdBQUU7Z0JBQ3BDLFdBQVcsR0FBRyxXQUFXLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDNUMsWUFBWSxDQUFDLElBQUksT0FBakIsWUFBWSxtQkFBUyxDQUFDLEVBQUUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUU7YUFDL0M7Ozs7Ozs7OztRQUNELE9BQU8sRUFBQyxXQUFXLGFBQUEsRUFBRSxXQUFXLGFBQUEsRUFBRSxZQUFZLGNBQUEsRUFBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILDBCQUEwQixPQUFtQjtRQUMzQyxPQUFPLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQTNDLENBQTJDLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDcEcsQ0FBQztJQUVEOztPQUVHO0lBQ0gsOEJBQThCLE9BQW1CO1FBQy9DLHlEQUF5RDtRQUN6RCxJQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELHVEQUF1RDtRQUN2RCxPQUFPLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSTtZQUNuQywwREFBMEQ7WUFDMUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDakMsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELHVCQUF1QjtZQUN2QixJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUztnQkFDNUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQXhDLENBQXdDLENBQUMsRUFBRTtnQkFDekUsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELG9DQUFvQztZQUNwQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFBLElBQUk7Z0JBQ2hELHVDQUF1QztnQkFDdkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFO29CQUN4RSxPQUFPLEtBQUssQ0FBQztpQkFDZDtnQkFDRCwyQ0FBMkM7Z0JBQzNDLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUU7b0JBQ3pGLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELDJCQUEyQjtnQkFDM0IsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtHZW5lcmF0ZWRGaWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVzb3VyY2VMb2FkZXIsIFNlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge0ZpbGVSZXNvdXJjZUxvYWRlciwgSG9zdFJlc291cmNlTG9hZGVyfSBmcm9tICcuL3Jlc291cmNlX2xvYWRlcic7XG5pbXBvcnQge0l2eUNvbXBpbGF0aW9uLCBpdnlUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3RyYW5zZm9ybSc7XG5cbmV4cG9ydCBjbGFzcyBOZ3RzY1Byb2dyYW0gaW1wbGVtZW50cyBhcGkuUHJvZ3JhbSB7XG4gIHByaXZhdGUgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIHByaXZhdGUgX2NvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZXxudWxsfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9pc0NvcmU6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaG9zdDogYXBpLkNvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IGFwaS5Qcm9ncmFtKSB7XG4gICAgdGhpcy5yZXNvdXJjZUxvYWRlciA9IGhvc3QucmVhZFJlc291cmNlICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBuZXcgSG9zdFJlc291cmNlTG9hZGVyKGhvc3QucmVhZFJlc291cmNlLmJpbmQoaG9zdCkpIDpcbiAgICAgICAgbmV3IEZpbGVSZXNvdXJjZUxvYWRlcigpO1xuXG4gICAgdGhpcy50c1Byb2dyYW0gPVxuICAgICAgICB0cy5jcmVhdGVQcm9ncmFtKHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbSAmJiBvbGRQcm9ncmFtLmdldFRzUHJvZ3JhbSgpKTtcbiAgfVxuXG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHsgcmV0dXJuIHRoaXMudHNQcm9ncmFtOyB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8YXBpLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTxhcGkuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgZmlsZU5hbWU/OiBzdHJpbmd8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmaWxlID0+ICFmaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGZpbGUgPT4gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVBc3luYyhmaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigocmVzdWx0KTogcmVzdWx0IGlzIFByb21pc2U8dm9pZD4gPT4gcmVzdWx0ICE9PSB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmd8dW5kZWZpbmVkKTogYXBpLkxhenlSb3V0ZVtdIHsgcmV0dXJuIFtdOyB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZW1pdChvcHRzPzoge1xuICAgIGVtaXRGbGFncz86IGFwaS5FbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBhcGkuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IGFwaS5Uc0VtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBhcGkuVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2tcbiAgfSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRDYWxsYmFjayA9IG9wdHMgJiYgb3B0cy5lbWl0Q2FsbGJhY2sgfHwgZGVmYXVsdEVtaXRDYWxsYmFjaztcblxuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgIC5maWx0ZXIoZmlsZSA9PiAhZmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSlcbiAgICAgICAgICAuZm9yRWFjaChmaWxlID0+IHRoaXMuY29tcGlsYXRpb24gIS5hbmFseXplU3luYyhmaWxlKSk7XG4gICAgfVxuXG4gICAgLy8gU2luY2UgdGhlcmUgaXMgbm8gLmQudHMgdHJhbnNmb3JtYXRpb24gQVBJLCAuZC50cyBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgZHVyaW5nIHdyaXRlLlxuICAgIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCB1bmRlZmluZWQsXG4gICAgICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPikgPT4ge1xuICAgICAgICAgIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgICAgZGF0YSA9IHNvdXJjZUZpbGVzLnJlZHVjZShcbiAgICAgICAgICAgICAgICAoZGF0YSwgc2YpID0+IHRoaXMuY29tcGlsYXRpb24gIS50cmFuc2Zvcm1lZER0c0ZvcihzZi5maWxlTmFtZSwgZGF0YSksIGRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmhvc3Qud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgfTtcblxuXG4gICAgLy8gUnVuIHRoZSBlbWl0LCBpbmNsdWRpbmcgYSBjdXN0b20gdHJhbnNmb3JtZXIgdGhhdCB3aWxsIGRvd25sZXZlbCB0aGUgSXZ5IGRlY29yYXRvcnMgaW4gY29kZS5cbiAgICBjb25zdCBlbWl0UmVzdWx0ID0gZW1pdENhbGxiYWNrKHtcbiAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgZW1pdE9ubHlEdHNGaWxlczogZmFsc2UsIHdyaXRlRmlsZSxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczoge1xuICAgICAgICBiZWZvcmU6IFtpdnlUcmFuc2Zvcm1GYWN0b3J5KHRoaXMuY29tcGlsYXRpb24gISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY29yZUltcG9ydHNGcm9tKV0sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHJldHVybiBlbWl0UmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogSXZ5Q29tcGlsYXRpb24ge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IHNjb3BlUmVnaXN0cnkgPSBuZXcgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnMgPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICBjaGVja2VyLCB0aGlzLnJlZmxlY3Rvciwgc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucmVzb3VyY2VMb2FkZXIpLFxuICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IsIHNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihjaGVja2VyLCB0aGlzLnJlZmxlY3Rvciwgc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gICAgXTtcblxuICAgIHJldHVybiBuZXcgSXZ5Q29tcGlsYXRpb24oaGFuZGxlcnMsIGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNvcmVJbXBvcnRzRnJvbSk7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IHtcbiAgICBpZiAodGhpcy5fcmVmbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3JlZmxlY3RvciA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QodGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWZsZWN0b3I7XG4gIH1cblxuICBwcml2YXRlIGdldCBjb3JlSW1wb3J0c0Zyb20oKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBpZiAodGhpcy5fY29yZUltcG9ydHNGcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9IHRoaXMuaXNDb3JlICYmIGdldFIzU3ltYm9sc0ZpbGUodGhpcy50c1Byb2dyYW0pIHx8IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb3JlSW1wb3J0c0Zyb207XG4gIH1cblxuICBwcml2YXRlIGdldCBpc0NvcmUoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2lzQ29yZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9pc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLnRzUHJvZ3JhbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc0NvcmU7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID1cbiAgICAoe3Byb2dyYW0sIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnN9KSA9PlxuICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiBgUHJvZ3JhbWAgaXMgQGFuZ3VsYXIvY29yZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==