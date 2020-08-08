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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeCheckContextImpl = exports.InliningMode = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var dom_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/dom");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var oob_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/oob");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    /**
     * How a type-checking context should handle operations which would require inlining.
     */
    var InliningMode;
    (function (InliningMode) {
        /**
         * Use inlining operations when required.
         */
        InliningMode[InliningMode["InlineOps"] = 0] = "InlineOps";
        /**
         * Produce diagnostics if an operation would require inlining.
         */
        InliningMode[InliningMode["Error"] = 1] = "Error";
    })(InliningMode = exports.InliningMode || (exports.InliningMode = {}));
    /**
     * A template type checking context for a program.
     *
     * The `TypeCheckContext` allows registration of components and their templates which need to be
     * type checked.
     */
    var TypeCheckContextImpl = /** @class */ (function () {
        function TypeCheckContextImpl(config, compilerHost, componentMappingStrategy, refEmitter, reflector, host, inlining) {
            this.config = config;
            this.compilerHost = compilerHost;
            this.componentMappingStrategy = componentMappingStrategy;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.host = host;
            this.inlining = inlining;
            this.fileMap = new Map();
            /**
             * A `Map` of `ts.SourceFile`s that the context has seen to the operations (additions of methods
             * or type-check blocks) that need to be eventually performed on that file.
             */
            this.opMap = new Map();
            /**
             * Tracks when an a particular class has a pending type constructor patching operation already
             * queued.
             */
            this.typeCtorPending = new Set();
        }
        /**
         * Record a template for the given component `node`, with a `SelectorMatcher` for directive
         * matching.
         *
         * @param node class of the node being recorded.
         * @param template AST nodes of the template being recorded.
         * @param matcher `SelectorMatcher` which tracks directives that are in scope for this template.
         */
        TypeCheckContextImpl.prototype.addTemplate = function (ref, binder, template, pipes, schemas, sourceMapping, file) {
            var e_1, _a;
            if (!this.host.shouldCheckComponent(ref.node)) {
                return;
            }
            var sfPath = file_system_1.absoluteFromSourceFile(ref.node.getSourceFile());
            var overrideTemplate = this.host.getTemplateOverride(sfPath, ref.node);
            if (overrideTemplate !== null) {
                template = overrideTemplate;
            }
            // Accumulate a list of any directives which could not have type constructors generated due to
            // unsupported inlining operations.
            var missingInlines = [];
            var fileData = this.dataForFile(ref.node.getSourceFile());
            var shimData = this.pendingShimForComponent(ref.node);
            var boundTarget = binder.bind({ template: template });
            try {
                // Get all of the directives used in the template and record type constructors for all of them.
                for (var _b = tslib_1.__values(boundTarget.getUsedDirectives()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    var dirRef = dir.ref;
                    var dirNode = dirRef.node;
                    if (type_constructor_1.requiresInlineTypeCtor(dirNode, this.reflector)) {
                        if (this.inlining === InliningMode.Error) {
                            missingInlines.push(dirNode);
                            continue;
                        }
                        // Add a type constructor operation for the directive.
                        this.addInlineTypeCtor(fileData, dirNode.getSourceFile(), dirRef, {
                            fnName: 'ngTypeCtor',
                            // The constructor should have a body if the directive comes from a .ts file, but not if
                            // it comes from a .d.ts file. .d.ts declarations don't have bodies.
                            body: !dirNode.getSourceFile().isDeclarationFile,
                            fields: {
                                inputs: Object.keys(dir.inputs),
                                outputs: Object.keys(dir.outputs),
                                // TODO(alxhub): support queries
                                queries: dir.queries,
                            },
                            coercedInputFields: dir.coercedInputFields,
                        });
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var tcbRequiresInline = type_check_block_1.requiresInlineTypeCheckBlock(ref.node);
            // If inlining is not supported, but is required for either the TCB or one of its directive
            // dependencies, then exit here with an error.
            if (this.inlining === InliningMode.Error && (tcbRequiresInline || missingInlines.length > 0)) {
                // This template cannot be supported because the underlying strategy does not support inlining
                // and inlining would be required.
                // Record diagnostics to indicate the issues with this template.
                var templateId = fileData.sourceManager.getTemplateId(ref.node);
                if (tcbRequiresInline) {
                    shimData.oobRecorder.requiresInlineTcb(templateId, ref.node);
                }
                if (missingInlines.length > 0) {
                    shimData.oobRecorder.requiresInlineTypeConstructors(templateId, ref.node, missingInlines);
                }
                // Checking this template would be unsupported, so don't try.
                return;
            }
            var meta = {
                id: fileData.sourceManager.captureSource(ref.node, sourceMapping, file),
                boundTarget: boundTarget,
                pipes: pipes,
                schemas: schemas,
            };
            if (tcbRequiresInline) {
                // This class didn't meet the requirements for external type checking, so generate an inline
                // TCB for the class.
                this.addInlineTypeCheckBlock(fileData, shimData, ref, meta);
            }
            else {
                // The class can be type-checked externally as normal.
                shimData.file.addTypeCheckBlock(ref, meta, shimData.domSchemaChecker, shimData.oobRecorder);
            }
        };
        /**
         * Record a type constructor for the given `node` with the given `ctorMetadata`.
         */
        TypeCheckContextImpl.prototype.addInlineTypeCtor = function (fileData, sf, ref, ctorMeta) {
            if (this.typeCtorPending.has(ref.node)) {
                return;
            }
            this.typeCtorPending.add(ref.node);
            // Lazily construct the operation map.
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            // Push a `TypeCtorOp` into the operation queue for the source file.
            ops.push(new TypeCtorOp(ref, ctorMeta));
            fileData.hasInlines = true;
        };
        /**
         * Transform a `ts.SourceFile` into a version that includes type checking code.
         *
         * If this particular `ts.SourceFile` requires changes, the text representing its new contents
         * will be returned. Otherwise, a `null` return indicates no changes were necessary.
         */
        TypeCheckContextImpl.prototype.transform = function (sf) {
            var _this = this;
            // If there are no operations pending for this particular file, return `null` to indicate no
            // changes.
            if (!this.opMap.has(sf)) {
                return null;
            }
            // Imports may need to be added to the file to support type-checking of directives used in the
            // template within it.
            var importManager = new translator_1.ImportManager(new imports_1.NoopImportRewriter(), '_i');
            // Each Op has a splitPoint index into the text where it needs to be inserted. Split the
            // original source text into chunks at these split points, where code will be inserted between
            // the chunks.
            var ops = this.opMap.get(sf).sort(orderOps);
            var textParts = splitStringAtPoints(sf.text, ops.map(function (op) { return op.splitPoint; }));
            // Use a `ts.Printer` to generate source code.
            var printer = ts.createPrinter({ omitTrailingSemicolon: true });
            // Begin with the intial section of the code text.
            var code = textParts[0];
            // Process each operation and use the printer to generate source code for it, inserting it into
            // the source code in between the original chunks.
            ops.forEach(function (op, idx) {
                var text = op.execute(importManager, sf, _this.refEmitter, printer);
                code += '\n\n' + text + textParts[idx + 1];
            });
            // Write out the imports that need to be added to the beginning of the file.
            var imports = importManager.getAllImports(sf.fileName)
                .map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';"; })
                .join('\n');
            code = imports + '\n' + code;
            return code;
        };
        TypeCheckContextImpl.prototype.finalize = function () {
            var e_2, _a, e_3, _b, e_4, _c;
            // First, build the map of updates to source files.
            var updates = new Map();
            try {
                for (var _d = tslib_1.__values(this.opMap.keys()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var originalSf = _e.value;
                    var newText = this.transform(originalSf);
                    if (newText !== null) {
                        updates.set(file_system_1.absoluteFromSourceFile(originalSf), newText);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // Then go through each input file that has pending code generation operations.
                for (var _f = tslib_1.__values(this.fileMap), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = tslib_1.__read(_g.value, 2), sfPath = _h[0], pendingFileData = _h[1];
                    try {
                        // For each input file, consider generation operations for each of its shims.
                        for (var _j = (e_4 = void 0, tslib_1.__values(pendingFileData.shimData.values())), _k = _j.next(); !_k.done; _k = _j.next()) {
                            var pendingShimData = _k.value;
                            this.host.recordShimData(sfPath, {
                                genesisDiagnostics: tslib_1.__spread(pendingShimData.domSchemaChecker.diagnostics, pendingShimData.oobRecorder.diagnostics),
                                hasInlines: pendingFileData.hasInlines,
                                path: pendingShimData.file.fileName,
                            });
                            updates.set(pendingShimData.file.fileName, pendingShimData.file.render());
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return updates;
        };
        TypeCheckContextImpl.prototype.addInlineTypeCheckBlock = function (fileData, shimData, ref, tcbMeta) {
            var sf = ref.node.getSourceFile();
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            ops.push(new TcbOp(ref, tcbMeta, this.config, this.reflector, shimData.domSchemaChecker, shimData.oobRecorder));
            fileData.hasInlines = true;
        };
        TypeCheckContextImpl.prototype.pendingShimForComponent = function (node) {
            var fileData = this.dataForFile(node.getSourceFile());
            var shimPath = this.componentMappingStrategy.shimPathForComponent(node);
            if (!fileData.shimData.has(shimPath)) {
                fileData.shimData.set(shimPath, {
                    domSchemaChecker: new dom_1.RegistryDomSchemaChecker(fileData.sourceManager),
                    oobRecorder: new oob_1.OutOfBandDiagnosticRecorderImpl(fileData.sourceManager),
                    file: new type_check_file_1.TypeCheckFile(shimPath, this.config, this.refEmitter, this.reflector, this.compilerHost),
                });
            }
            return fileData.shimData.get(shimPath);
        };
        TypeCheckContextImpl.prototype.dataForFile = function (sf) {
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            if (!this.fileMap.has(sfPath)) {
                var data = {
                    hasInlines: false,
                    sourceManager: this.host.getSourceManager(sfPath),
                    shimData: new Map(),
                };
                this.fileMap.set(sfPath, data);
            }
            return this.fileMap.get(sfPath);
        };
        return TypeCheckContextImpl;
    }());
    exports.TypeCheckContextImpl = TypeCheckContextImpl;
    /**
     * A type check block operation which produces type check code for a particular component.
     */
    var TcbOp = /** @class */ (function () {
        function TcbOp(ref, meta, config, reflector, domSchemaChecker, oobRecorder) {
            this.ref = ref;
            this.meta = meta;
            this.config = config;
            this.reflector = reflector;
            this.domSchemaChecker = domSchemaChecker;
            this.oobRecorder = oobRecorder;
        }
        Object.defineProperty(TcbOp.prototype, "splitPoint", {
            /**
             * Type check blocks are inserted immediately after the end of the component class.
             */
            get: function () {
                return this.ref.node.end + 1;
            },
            enumerable: false,
            configurable: true
        });
        TcbOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var env = new environment_1.Environment(this.config, im, refEmitter, this.reflector, sf);
            var fnName = ts.createIdentifier("_tcb_" + this.ref.node.pos);
            var fn = type_check_block_1.generateTypeCheckBlock(env, this.ref, fnName, this.meta, this.domSchemaChecker, this.oobRecorder);
            return printer.printNode(ts.EmitHint.Unspecified, fn, sf);
        };
        return TcbOp;
    }());
    /**
     * A type constructor operation which produces type constructor code for a particular directive.
     */
    var TypeCtorOp = /** @class */ (function () {
        function TypeCtorOp(ref, meta) {
            this.ref = ref;
            this.meta = meta;
        }
        Object.defineProperty(TypeCtorOp.prototype, "splitPoint", {
            /**
             * Type constructor operations are inserted immediately before the end of the directive class.
             */
            get: function () {
                return this.ref.node.end - 1;
            },
            enumerable: false,
            configurable: true
        });
        TypeCtorOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var tcb = type_constructor_1.generateInlineTypeCtor(this.ref.node, this.meta);
            return printer.printNode(ts.EmitHint.Unspecified, tcb, sf);
        };
        return TypeCtorOp;
    }());
    /**
     * Compare two operations and return their split point ordering.
     */
    function orderOps(op1, op2) {
        return op1.splitPoint - op2.splitPoint;
    }
    /**
     * Split a string into chunks at any number of split points.
     */
    function splitStringAtPoints(str, points) {
        var splits = [];
        var start = 0;
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            splits.push(str.substring(start, point));
            start = point;
        }
        splits.push(str.substring(start));
        return splits;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQXlFO0lBQ3pFLG1FQUE4RTtJQUU5RSx5RUFBK0M7SUFJL0MseUVBQWlFO0lBQ2pFLHlGQUEwQztJQUMxQyx5RUFBbUY7SUFFbkYsbUdBQXdGO0lBQ3hGLGlHQUFnRDtJQUNoRCxtR0FBa0Y7SUFtR2xGOztPQUVHO0lBQ0gsSUFBWSxZQVVYO0lBVkQsV0FBWSxZQUFZO1FBQ3RCOztXQUVHO1FBQ0gseURBQVMsQ0FBQTtRQUVUOztXQUVHO1FBQ0gsaURBQUssQ0FBQTtJQUNQLENBQUMsRUFWVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQVV2QjtJQUVEOzs7OztPQUtHO0lBQ0g7UUFHRSw4QkFDWSxNQUEwQixFQUMxQixZQUEyRCxFQUMzRCx3QkFBd0QsRUFDeEQsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxJQUFzQixFQUFVLFFBQXNCO1lBSnRELFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzFCLGlCQUFZLEdBQVosWUFBWSxDQUErQztZQUMzRCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQWdDO1lBQ3hELGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsU0FBSSxHQUFKLElBQUksQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFjO1lBUDFELFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBK0MsQ0FBQztZQVN6RTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFFL0M7OztlQUdHO1lBQ0ssb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQVpZLENBQUM7UUFjdEU7Ozs7Ozs7V0FPRztRQUNILDBDQUFXLEdBQVgsVUFDSSxHQUFxRCxFQUNyRCxNQUFrRCxFQUFFLFFBQXVCLEVBQzNFLEtBQW9FLEVBQ3BFLE9BQXlCLEVBQUUsYUFBb0MsRUFDL0QsSUFBcUI7O1lBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0MsT0FBTzthQUNSO1lBRUQsSUFBTSxNQUFNLEdBQUcsb0NBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pFLElBQUksZ0JBQWdCLEtBQUssSUFBSSxFQUFFO2dCQUM3QixRQUFRLEdBQUcsZ0JBQWdCLENBQUM7YUFDN0I7WUFFRCw4RkFBOEY7WUFDOUYsbUNBQW1DO1lBQ25DLElBQUksY0FBYyxHQUF1QixFQUFFLENBQUM7WUFFNUMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDNUQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4RCxJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsUUFBUSxVQUFBLEVBQUMsQ0FBQyxDQUFDOztnQkFDNUMsK0ZBQStGO2dCQUMvRixLQUFrQixJQUFBLEtBQUEsaUJBQUEsV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sR0FBRyxXQUFBO29CQUNaLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUF1RCxDQUFDO29CQUMzRSxJQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUM1QixJQUFJLHlDQUFzQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7d0JBQ25ELElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsS0FBSyxFQUFFOzRCQUN4QyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUM3QixTQUFTO3lCQUNWO3dCQUVELHNEQUFzRDt3QkFDdEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsTUFBTSxFQUFFOzRCQUNoRSxNQUFNLEVBQUUsWUFBWTs0QkFDcEIsd0ZBQXdGOzRCQUN4RixvRUFBb0U7NEJBQ3BFLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxpQkFBaUI7NEJBQ2hELE1BQU0sRUFBRTtnQ0FDTixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO2dDQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO2dDQUNqQyxnQ0FBZ0M7Z0NBQ2hDLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTzs2QkFDckI7NEJBQ0Qsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLGtCQUFrQjt5QkFDM0MsQ0FBQyxDQUFDO3FCQUNKO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLGlCQUFpQixHQUFHLCtDQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVqRSwyRkFBMkY7WUFDM0YsOENBQThDO1lBQzlDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsaUJBQWlCLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRTtnQkFDNUYsOEZBQThGO2dCQUM5RixrQ0FBa0M7Z0JBRWxDLGdFQUFnRTtnQkFDaEUsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLGlCQUFpQixFQUFFO29CQUNyQixRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzlEO2dCQUVELElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQzdCLFFBQVEsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBQzNGO2dCQUVELDZEQUE2RDtnQkFDN0QsT0FBTzthQUNSO1lBRUQsSUFBTSxJQUFJLEdBQUc7Z0JBQ1gsRUFBRSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQztnQkFDdkUsV0FBVyxhQUFBO2dCQUNYLEtBQUssT0FBQTtnQkFDTCxPQUFPLFNBQUE7YUFDUixDQUFDO1lBQ0YsSUFBSSxpQkFBaUIsRUFBRTtnQkFDckIsNEZBQTRGO2dCQUM1RixxQkFBcUI7Z0JBQ3JCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUM3RDtpQkFBTTtnQkFDTCxzREFBc0Q7Z0JBQ3RELFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzdGO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0gsZ0RBQWlCLEdBQWpCLFVBQ0ksUUFBcUMsRUFBRSxFQUFpQixFQUN4RCxHQUFxRCxFQUFFLFFBQTBCO1lBQ25GLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN0QyxPQUFPO2FBQ1I7WUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFbkMsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3hCO1lBQ0QsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUM7WUFFaEMsb0VBQW9FO1lBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDeEMsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDN0IsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0gsd0NBQVMsR0FBVCxVQUFVLEVBQWlCO1lBQTNCLGlCQXFDQztZQXBDQyw0RkFBNEY7WUFDNUYsV0FBVztZQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDhGQUE4RjtZQUM5RixzQkFBc0I7WUFDdEIsSUFBTSxhQUFhLEdBQUcsSUFBSSwwQkFBYSxDQUFDLElBQUksNEJBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV4RSx3RkFBd0Y7WUFDeEYsOEZBQThGO1lBQzlGLGNBQWM7WUFDZCxJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0MsSUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxDQUFDLFVBQVUsRUFBYixDQUFhLENBQUMsQ0FBQyxDQUFDO1lBRTdFLDhDQUE4QztZQUM5QyxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUVoRSxrREFBa0Q7WUFDbEQsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXhCLCtGQUErRjtZQUMvRixrREFBa0Q7WUFDbEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQUUsRUFBRSxHQUFHO2dCQUNsQixJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsS0FBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDckUsSUFBSSxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3QyxDQUFDLENBQUMsQ0FBQztZQUVILDRFQUE0RTtZQUM1RSxJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ25DLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLGlCQUFlLENBQUMsQ0FBQyxTQUFTLGVBQVUsQ0FBQyxDQUFDLFNBQVMsT0FBSSxFQUFuRCxDQUFtRCxDQUFDO2lCQUM3RCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsSUFBSSxHQUFHLE9BQU8sR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBRTdCLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELHVDQUFRLEdBQVI7O1lBQ0UsbURBQW1EO1lBQ25ELElBQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDOztnQkFDbEQsS0FBeUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXZDLElBQU0sVUFBVSxXQUFBO29CQUNuQixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMzQyxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7d0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQzFEO2lCQUNGOzs7Ozs7Ozs7O2dCQUVELCtFQUErRTtnQkFDL0UsS0FBd0MsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxPQUFPLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTNDLElBQUEsS0FBQSwyQkFBeUIsRUFBeEIsTUFBTSxRQUFBLEVBQUUsZUFBZSxRQUFBOzt3QkFDakMsNkVBQTZFO3dCQUM3RSxLQUE4QixJQUFBLG9CQUFBLGlCQUFBLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTs0QkFBNUQsSUFBTSxlQUFlLFdBQUE7NEJBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtnQ0FDL0Isa0JBQWtCLG1CQUNiLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQzVDLGVBQWUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUMzQztnQ0FDRCxVQUFVLEVBQUUsZUFBZSxDQUFDLFVBQVU7Z0NBQ3RDLElBQUksRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVE7NkJBQ3BDLENBQUMsQ0FBQzs0QkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQzt5QkFDM0U7Ozs7Ozs7OztpQkFDRjs7Ozs7Ozs7O1lBRUQsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVPLHNEQUF1QixHQUEvQixVQUNJLFFBQXFDLEVBQUUsUUFBeUIsRUFDaEUsR0FBcUQsRUFDckQsT0FBK0I7WUFDakMsSUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN4QjtZQUNELElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1lBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQ2QsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUNwRSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzQixRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUM3QixDQUFDO1FBRU8sc0RBQXVCLEdBQS9CLFVBQWdDLElBQXlCO1lBQ3ZELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDeEQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDcEMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO29CQUM5QixnQkFBZ0IsRUFBRSxJQUFJLDhCQUF3QixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQ3RFLFdBQVcsRUFBRSxJQUFJLHFDQUErQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQ3hFLElBQUksRUFBRSxJQUFJLCtCQUFhLENBQ25CLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDO2lCQUMvRSxDQUFDLENBQUM7YUFDSjtZQUNELE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUM7UUFDMUMsQ0FBQztRQUVPLDBDQUFXLEdBQW5CLFVBQW9CLEVBQWlCO1lBQ25DLElBQU0sTUFBTSxHQUFHLG9DQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRTFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDN0IsSUFBTSxJQUFJLEdBQWdDO29CQUN4QyxVQUFVLEVBQUUsS0FBSztvQkFDakIsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO29CQUNqRCxRQUFRLEVBQUUsSUFBSSxHQUFHLEVBQUU7aUJBQ3BCLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ2hDO1lBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBalFELElBaVFDO0lBalFZLG9EQUFvQjtJQXdSakM7O09BRUc7SUFDSDtRQUNFLGVBQ2EsR0FBcUQsRUFDckQsSUFBNEIsRUFBVyxNQUEwQixFQUNqRSxTQUF5QixFQUFXLGdCQUFrQyxFQUN0RSxXQUF3QztZQUh4QyxRQUFHLEdBQUgsR0FBRyxDQUFrRDtZQUNyRCxTQUFJLEdBQUosSUFBSSxDQUF3QjtZQUFXLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQ2pFLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVcscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtZQUN0RSxnQkFBVyxHQUFYLFdBQVcsQ0FBNkI7UUFBRyxDQUFDO1FBS3pELHNCQUFJLDZCQUFVO1lBSGQ7O2VBRUc7aUJBQ0g7Z0JBQ0UsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQy9CLENBQUM7OztXQUFBO1FBRUQsdUJBQU8sR0FBUCxVQUFRLEVBQWlCLEVBQUUsRUFBaUIsRUFBRSxVQUE0QixFQUFFLE9BQW1CO1lBRTdGLElBQU0sR0FBRyxHQUFHLElBQUkseUJBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RSxJQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFLLENBQUMsQ0FBQztZQUNoRSxJQUFNLEVBQUUsR0FBRyx5Q0FBc0IsQ0FDN0IsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMvRSxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFDSCxZQUFDO0lBQUQsQ0FBQyxBQXRCRCxJQXNCQztJQUVEOztPQUVHO0lBQ0g7UUFDRSxvQkFDYSxHQUFxRCxFQUNyRCxJQUFzQjtZQUR0QixRQUFHLEdBQUgsR0FBRyxDQUFrRDtZQUNyRCxTQUFJLEdBQUosSUFBSSxDQUFrQjtRQUFHLENBQUM7UUFLdkMsc0JBQUksa0NBQVU7WUFIZDs7ZUFFRztpQkFDSDtnQkFDRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDL0IsQ0FBQzs7O1dBQUE7UUFFRCw0QkFBTyxHQUFQLFVBQVEsRUFBaUIsRUFBRSxFQUFpQixFQUFFLFVBQTRCLEVBQUUsT0FBbUI7WUFFN0YsSUFBTSxHQUFHLEdBQUcseUNBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdELE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQWpCRCxJQWlCQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxRQUFRLENBQUMsR0FBTyxFQUFFLEdBQU87UUFDaEMsT0FBTyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxtQkFBbUIsQ0FBQyxHQUFXLEVBQUUsTUFBZ0I7UUFDeEQsSUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLElBQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDekMsS0FBSyxHQUFHLEtBQUssQ0FBQztTQUNmO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1BhcnNlU291cmNlRmlsZSwgUjNUYXJnZXRCaW5kZXIsIFNjaGVtYU1ldGFkYXRhLCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tm9vcEltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtDb21wb25lbnRUb1NoaW1NYXBwaW5nU3RyYXRlZ3ksIFRlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyLCBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGx9IGZyb20gJy4vb29iJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUNoZWNrQmxvY2ssIHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdHlwZV9jaGVja19ibG9jayc7XG5pbXBvcnQge1R5cGVDaGVja0ZpbGV9IGZyb20gJy4vdHlwZV9jaGVja19maWxlJztcbmltcG9ydCB7Z2VuZXJhdGVJbmxpbmVUeXBlQ3RvciwgcmVxdWlyZXNJbmxpbmVUeXBlQ3Rvcn0gZnJvbSAnLi90eXBlX2NvbnN0cnVjdG9yJztcblxuZXhwb3J0IGludGVyZmFjZSBTaGltVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzaGltIGZpbGUuXG4gICAqL1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcblxuICAvKipcbiAgICogQW55IGB0cy5EaWFnbm9zdGljYHMgd2hpY2ggd2VyZSBwcm9kdWNlZCBkdXJpbmcgdGhlIGdlbmVyYXRpb24gb2YgdGhpcyBzaGltLlxuICAgKlxuICAgKiBTb21lIGRpYWdub3N0aWNzIGFyZSBwcm9kdWNlZCBkdXJpbmcgY3JlYXRpb24gdGltZSBhbmQgYXJlIHRyYWNrZWQgaGVyZS5cbiAgICovXG4gIGdlbmVzaXNEaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgYW55IGlubGluZSBvcGVyYXRpb25zIGZvciB0aGUgaW5wdXQgZmlsZSB3ZXJlIHJlcXVpcmVkIHRvIGdlbmVyYXRlIHRoaXMgc2hpbS5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG59XG5cbi8qKlxuICogRGF0YSBmb3IgYW4gaW5wdXQgZmlsZSB3aGljaCBpcyBzdGlsbCBpbiB0aGUgcHJvY2VzcyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIGNvZGUgaGFzIGJlZW4gcmVxdWlyZWQgYnkgdGhlIHNoaW0geWV0LlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogU291cmNlIG1hcHBpbmcgaW5mb3JtYXRpb24gZm9yIG1hcHBpbmcgZGlhZ25vc3RpY3MgZnJvbSBpbmxpbmVkIHR5cGUgY2hlY2sgYmxvY2tzIGJhY2sgdG8gdGhlXG4gICAqIG9yaWdpbmFsIHRlbXBsYXRlLlxuICAgKi9cbiAgc291cmNlTWFuYWdlcjogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgaW4tcHJvZ3Jlc3Mgc2hpbSBkYXRhIGZvciBzaGltcyBnZW5lcmF0ZWQgZnJvbSB0aGlzIGlucHV0IGZpbGUuXG4gICAqL1xuICBzaGltRGF0YTogTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nU2hpbURhdGE+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdTaGltRGF0YSB7XG4gIC8qKlxuICAgKiBSZWNvcmRlciBmb3Igb3V0LW9mLWJhbmQgZGlhZ25vc3RpY3Mgd2hpY2ggYXJlIHJhaXNlZCBkdXJpbmcgZ2VuZXJhdGlvbi5cbiAgICovXG4gIG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgaW4gdXNlIGZvciB0aGlzIHRlbXBsYXRlLCB3aGljaCByZWNvcmRzIGFueSBzY2hlbWEtcmVsYXRlZCBkaWFnbm9zdGljcy5cbiAgICovXG4gIGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXI7XG5cbiAgLyoqXG4gICAqIFNoaW0gZmlsZSBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBnZW5lcmF0ZWQuXG4gICAqL1xuICBmaWxlOiBUeXBlQ2hlY2tGaWxlO1xufVxuXG4vKipcbiAqIEFkYXB0cyB0aGUgYFR5cGVDaGVja0NvbnRleHRJbXBsYCB0byB0aGUgbGFyZ2VyIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgc3lzdGVtLlxuICpcbiAqIFRocm91Z2ggdGhpcyBpbnRlcmZhY2UsIGEgc2luZ2xlIGBUeXBlQ2hlY2tDb250ZXh0SW1wbGAgKHdoaWNoIHJlcHJlc2VudHMgb25lIFwicGFzc1wiIG9mIHRlbXBsYXRlXG4gKiB0eXBlLWNoZWNraW5nKSByZXF1ZXN0cyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgbGFyZ2VyIHN0YXRlIG9mIHR5cGUtY2hlY2tpbmcsIGFzIHdlbGwgYXMgcmVwb3J0c1xuICogYmFjayBpdHMgcmVzdWx0cyBvbmNlIGZpbmFsaXplZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBgVGVtcGxhdGVTb3VyY2VNYW5hZ2VyYCByZXNwb25zaWJsZSBmb3IgY29tcG9uZW50cyBpbiB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoLlxuICAgKi9cbiAgZ2V0U291cmNlTWFuYWdlcihzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGEgcGFydGljdWxhciBjb21wb25lbnQgY2xhc3Mgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHRoZSBjdXJyZW50IHR5cGUtY2hlY2tpbmcgcGFzcy5cbiAgICpcbiAgICogTm90IGFsbCBjb21wb25lbnRzIG9mZmVyZWQgdG8gdGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBmb3IgY2hlY2tpbmcgbWF5IHJlcXVpcmUgcHJvY2Vzc2luZy4gRm9yXG4gICAqIGV4YW1wbGUsIHRoZSBjb21wb25lbnQgbWF5IGhhdmUgcmVzdWx0cyBhbHJlYWR5IGF2YWlsYWJsZSBmcm9tIGEgcHJpb3IgcGFzcyBvciBmcm9tIGEgcHJldmlvdXNcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGUgZ2l2ZW4gY29tcG9uZW50IGhhcyBoYWQgaXRzIHRlbXBsYXRlIG92ZXJyaWRkZW4sIGFuZCByZXRyaWV2ZSB0aGUgbmV3IHRlbXBsYXRlXG4gICAqIG5vZGVzIGlmIHNvLlxuICAgKi9cbiAgZ2V0VGVtcGxhdGVPdmVycmlkZShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVG1wbEFzdE5vZGVbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXBvcnQgZGF0YSBmcm9tIGEgc2hpbSBnZW5lcmF0ZWQgZnJvbSB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoLlxuICAgKi9cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgdGhhdCBhbGwgb2YgdGhlIGNvbXBvbmVudHMgd2l0aGluIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGggaGFkIGNvZGUgZ2VuZXJhdGVkIC0gdGhhdFxuICAgKiBpcywgY292ZXJhZ2UgZm9yIHRoZSBmaWxlIGNhbiBiZSBjb25zaWRlcmVkIGNvbXBsZXRlLlxuICAgKi9cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG59XG5cbi8qKlxuICogSG93IGEgdHlwZS1jaGVja2luZyBjb250ZXh0IHNob3VsZCBoYW5kbGUgb3BlcmF0aW9ucyB3aGljaCB3b3VsZCByZXF1aXJlIGlubGluaW5nLlxuICovXG5leHBvcnQgZW51bSBJbmxpbmluZ01vZGUge1xuICAvKipcbiAgICogVXNlIGlubGluaW5nIG9wZXJhdGlvbnMgd2hlbiByZXF1aXJlZC5cbiAgICovXG4gIElubGluZU9wcyxcblxuICAvKipcbiAgICogUHJvZHVjZSBkaWFnbm9zdGljcyBpZiBhbiBvcGVyYXRpb24gd291bGQgcmVxdWlyZSBpbmxpbmluZy5cbiAgICovXG4gIEVycm9yLFxufVxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tDb250ZXh0SW1wbCBpbXBsZW1lbnRzIFR5cGVDaGVja0NvbnRleHQge1xuICBwcml2YXRlIGZpbGVNYXAgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGE+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcHJpdmF0ZSBjb21waWxlckhvc3Q6IFBpY2s8dHMuQ29tcGlsZXJIb3N0LCAnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICAgIHByaXZhdGUgY29tcG9uZW50TWFwcGluZ1N0cmF0ZWd5OiBDb21wb25lbnRUb1NoaW1NYXBwaW5nU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaG9zdDogVHlwZUNoZWNraW5nSG9zdCwgcHJpdmF0ZSBpbmxpbmluZzogSW5saW5pbmdNb2RlKSB7fVxuXG4gIC8qKlxuICAgKiBBIGBNYXBgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgdGhhdCB0aGUgY29udGV4dCBoYXMgc2VlbiB0byB0aGUgb3BlcmF0aW9ucyAoYWRkaXRpb25zIG9mIG1ldGhvZHNcbiAgICogb3IgdHlwZS1jaGVjayBibG9ja3MpIHRoYXQgbmVlZCB0byBiZSBldmVudHVhbGx5IHBlcmZvcm1lZCBvbiB0aGF0IGZpbGUuXG4gICAqL1xuICBwcml2YXRlIG9wTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBPcFtdPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hlbiBhbiBhIHBhcnRpY3VsYXIgY2xhc3MgaGFzIGEgcGVuZGluZyB0eXBlIGNvbnN0cnVjdG9yIHBhdGNoaW5nIG9wZXJhdGlvbiBhbHJlYWR5XG4gICAqIHF1ZXVlZC5cbiAgICovXG4gIHByaXZhdGUgdHlwZUN0b3JQZW5kaW5nID0gbmV3IFNldDx0cy5DbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0ZW1wbGF0ZSBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudCBgbm9kZWAsIHdpdGggYSBgU2VsZWN0b3JNYXRjaGVyYCBmb3IgZGlyZWN0aXZlXG4gICAqIG1hdGNoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBjbGFzcyBvZiB0aGUgbm9kZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIHRlbXBsYXRlIEFTVCBub2RlcyBvZiB0aGUgdGVtcGxhdGUgYmVpbmcgcmVjb3JkZWQuXG4gICAqIEBwYXJhbSBtYXRjaGVyIGBTZWxlY3Rvck1hdGNoZXJgIHdoaWNoIHRyYWNrcyBkaXJlY3RpdmVzIHRoYXQgYXJlIGluIHNjb3BlIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgYWRkVGVtcGxhdGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIGJpbmRlcjogUjNUYXJnZXRCaW5kZXI8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+LCB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSxcbiAgICAgIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+LFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSwgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nLFxuICAgICAgZmlsZTogUGFyc2VTb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmhvc3Quc2hvdWxkQ2hlY2tDb21wb25lbnQocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IG92ZXJyaWRlVGVtcGxhdGUgPSB0aGlzLmhvc3QuZ2V0VGVtcGxhdGVPdmVycmlkZShzZlBhdGgsIHJlZi5ub2RlKTtcbiAgICBpZiAob3ZlcnJpZGVUZW1wbGF0ZSAhPT0gbnVsbCkge1xuICAgICAgdGVtcGxhdGUgPSBvdmVycmlkZVRlbXBsYXRlO1xuICAgIH1cblxuICAgIC8vIEFjY3VtdWxhdGUgYSBsaXN0IG9mIGFueSBkaXJlY3RpdmVzIHdoaWNoIGNvdWxkIG5vdCBoYXZlIHR5cGUgY29uc3RydWN0b3JzIGdlbmVyYXRlZCBkdWUgdG9cbiAgICAvLyB1bnN1cHBvcnRlZCBpbmxpbmluZyBvcGVyYXRpb25zLlxuICAgIGxldCBtaXNzaW5nSW5saW5lczogQ2xhc3NEZWNsYXJhdGlvbltdID0gW107XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZGF0YUZvckZpbGUocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBzaGltRGF0YSA9IHRoaXMucGVuZGluZ1NoaW1Gb3JDb21wb25lbnQocmVmLm5vZGUpO1xuICAgIGNvbnN0IGJvdW5kVGFyZ2V0ID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlfSk7XG4gICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIHR5cGUgY29uc3RydWN0b3JzIGZvciBhbGwgb2YgdGhlbS5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiBib3VuZFRhcmdldC5nZXRVc2VkRGlyZWN0aXZlcygpKSB7XG4gICAgICBjb25zdCBkaXJSZWYgPSBkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcbiAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXJSZWYubm9kZTtcbiAgICAgIGlmIChyZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpck5vZGUsIHRoaXMucmVmbGVjdG9yKSkge1xuICAgICAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yKSB7XG4gICAgICAgICAgbWlzc2luZ0lubGluZXMucHVzaChkaXJOb2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBhIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgICB0aGlzLmFkZElubGluZVR5cGVDdG9yKGZpbGVEYXRhLCBkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBPYmplY3Qua2V5cyhkaXIuaW5wdXRzKSxcbiAgICAgICAgICAgIG91dHB1dHM6IE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGNiUmVxdWlyZXNJbmxpbmUgPSByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrKHJlZi5ub2RlKTtcblxuICAgIC8vIElmIGlubGluaW5nIGlzIG5vdCBzdXBwb3J0ZWQsIGJ1dCBpcyByZXF1aXJlZCBmb3IgZWl0aGVyIHRoZSBUQ0Igb3Igb25lIG9mIGl0cyBkaXJlY3RpdmVcbiAgICAvLyBkZXBlbmRlbmNpZXMsIHRoZW4gZXhpdCBoZXJlIHdpdGggYW4gZXJyb3IuXG4gICAgaWYgKHRoaXMuaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5FcnJvciAmJiAodGNiUmVxdWlyZXNJbmxpbmUgfHwgbWlzc2luZ0lubGluZXMubGVuZ3RoID4gMCkpIHtcbiAgICAgIC8vIFRoaXMgdGVtcGxhdGUgY2Fubm90IGJlIHN1cHBvcnRlZCBiZWNhdXNlIHRoZSB1bmRlcmx5aW5nIHN0cmF0ZWd5IGRvZXMgbm90IHN1cHBvcnQgaW5saW5pbmdcbiAgICAgIC8vIGFuZCBpbmxpbmluZyB3b3VsZCBiZSByZXF1aXJlZC5cblxuICAgICAgLy8gUmVjb3JkIGRpYWdub3N0aWNzIHRvIGluZGljYXRlIHRoZSBpc3N1ZXMgd2l0aCB0aGlzIHRlbXBsYXRlLlxuICAgICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChyZWYubm9kZSk7XG4gICAgICBpZiAodGNiUmVxdWlyZXNJbmxpbmUpIHtcbiAgICAgICAgc2hpbURhdGEub29iUmVjb3JkZXIucmVxdWlyZXNJbmxpbmVUY2IodGVtcGxhdGVJZCwgcmVmLm5vZGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAobWlzc2luZ0lubGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBzaGltRGF0YS5vb2JSZWNvcmRlci5yZXF1aXJlc0lubGluZVR5cGVDb25zdHJ1Y3RvcnModGVtcGxhdGVJZCwgcmVmLm5vZGUsIG1pc3NpbmdJbmxpbmVzKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2tpbmcgdGhpcyB0ZW1wbGF0ZSB3b3VsZCBiZSB1bnN1cHBvcnRlZCwgc28gZG9uJ3QgdHJ5LlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSB7XG4gICAgICBpZDogZmlsZURhdGEuc291cmNlTWFuYWdlci5jYXB0dXJlU291cmNlKHJlZi5ub2RlLCBzb3VyY2VNYXBwaW5nLCBmaWxlKSxcbiAgICAgIGJvdW5kVGFyZ2V0LFxuICAgICAgcGlwZXMsXG4gICAgICBzY2hlbWFzLFxuICAgIH07XG4gICAgaWYgKHRjYlJlcXVpcmVzSW5saW5lKSB7XG4gICAgICAvLyBUaGlzIGNsYXNzIGRpZG4ndCBtZWV0IHRoZSByZXF1aXJlbWVudHMgZm9yIGV4dGVybmFsIHR5cGUgY2hlY2tpbmcsIHNvIGdlbmVyYXRlIGFuIGlubGluZVxuICAgICAgLy8gVENCIGZvciB0aGUgY2xhc3MuXG4gICAgICB0aGlzLmFkZElubGluZVR5cGVDaGVja0Jsb2NrKGZpbGVEYXRhLCBzaGltRGF0YSwgcmVmLCBtZXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIGNsYXNzIGNhbiBiZSB0eXBlLWNoZWNrZWQgZXh0ZXJuYWxseSBhcyBub3JtYWwuXG4gICAgICBzaGltRGF0YS5maWxlLmFkZFR5cGVDaGVja0Jsb2NrKHJlZiwgbWV0YSwgc2hpbURhdGEuZG9tU2NoZW1hQ2hlY2tlciwgc2hpbURhdGEub29iUmVjb3JkZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIHdpdGggdGhlIGdpdmVuIGBjdG9yTWV0YWRhdGFgLlxuICAgKi9cbiAgYWRkSW5saW5lVHlwZUN0b3IoXG4gICAgICBmaWxlRGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBzZjogdHMuU291cmNlRmlsZSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LCBjdG9yTWV0YTogVHlwZUN0b3JNZXRhZGF0YSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnR5cGVDdG9yUGVuZGluZy5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHlwZUN0b3JQZW5kaW5nLmFkZChyZWYubm9kZSk7XG5cbiAgICAvLyBMYXppbHkgY29uc3RydWN0IHRoZSBvcGVyYXRpb24gbWFwLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuXG4gICAgLy8gUHVzaCBhIGBUeXBlQ3Rvck9wYCBpbnRvIHRoZSBvcGVyYXRpb24gcXVldWUgZm9yIHRoZSBzb3VyY2UgZmlsZS5cbiAgICBvcHMucHVzaChuZXcgVHlwZUN0b3JPcChyZWYsIGN0b3JNZXRhKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgYHRzLlNvdXJjZUZpbGVgIGludG8gYSB2ZXJzaW9uIHRoYXQgaW5jbHVkZXMgdHlwZSBjaGVja2luZyBjb2RlLlxuICAgKlxuICAgKiBJZiB0aGlzIHBhcnRpY3VsYXIgYHRzLlNvdXJjZUZpbGVgIHJlcXVpcmVzIGNoYW5nZXMsIHRoZSB0ZXh0IHJlcHJlc2VudGluZyBpdHMgbmV3IGNvbnRlbnRzXG4gICAqIHdpbGwgYmUgcmV0dXJuZWQuIE90aGVyd2lzZSwgYSBgbnVsbGAgcmV0dXJuIGluZGljYXRlcyBubyBjaGFuZ2VzIHdlcmUgbmVjZXNzYXJ5LlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nfG51bGwge1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBvcGVyYXRpb25zIHBlbmRpbmcgZm9yIHRoaXMgcGFydGljdWxhciBmaWxlLCByZXR1cm4gYG51bGxgIHRvIGluZGljYXRlIG5vXG4gICAgLy8gY2hhbmdlcy5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSW1wb3J0cyBtYXkgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgZmlsZSB0byBzdXBwb3J0IHR5cGUtY2hlY2tpbmcgb2YgZGlyZWN0aXZlcyB1c2VkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIHdpdGhpbiBpdC5cbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIobmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpLCAnX2knKTtcblxuICAgIC8vIEVhY2ggT3AgaGFzIGEgc3BsaXRQb2ludCBpbmRleCBpbnRvIHRoZSB0ZXh0IHdoZXJlIGl0IG5lZWRzIHRvIGJlIGluc2VydGVkLiBTcGxpdCB0aGVcbiAgICAvLyBvcmlnaW5hbCBzb3VyY2UgdGV4dCBpbnRvIGNodW5rcyBhdCB0aGVzZSBzcGxpdCBwb2ludHMsIHdoZXJlIGNvZGUgd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuXG4gICAgLy8gdGhlIGNodW5rcy5cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhLnNvcnQob3JkZXJPcHMpO1xuICAgIGNvbnN0IHRleHRQYXJ0cyA9IHNwbGl0U3RyaW5nQXRQb2ludHMoc2YudGV4dCwgb3BzLm1hcChvcCA9PiBvcC5zcGxpdFBvaW50KSk7XG5cbiAgICAvLyBVc2UgYSBgdHMuUHJpbnRlcmAgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoe29taXRUcmFpbGluZ1NlbWljb2xvbjogdHJ1ZX0pO1xuXG4gICAgLy8gQmVnaW4gd2l0aCB0aGUgaW50aWFsIHNlY3Rpb24gb2YgdGhlIGNvZGUgdGV4dC5cbiAgICBsZXQgY29kZSA9IHRleHRQYXJ0c1swXTtcblxuICAgIC8vIFByb2Nlc3MgZWFjaCBvcGVyYXRpb24gYW5kIHVzZSB0aGUgcHJpbnRlciB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZSBmb3IgaXQsIGluc2VydGluZyBpdCBpbnRvXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlIGluIGJldHdlZW4gdGhlIG9yaWdpbmFsIGNodW5rcy5cbiAgICBvcHMuZm9yRWFjaCgob3AsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgdGV4dCA9IG9wLmV4ZWN1dGUoaW1wb3J0TWFuYWdlciwgc2YsIHRoaXMucmVmRW1pdHRlciwgcHJpbnRlcik7XG4gICAgICBjb2RlICs9ICdcXG5cXG4nICsgdGV4dCArIHRleHRQYXJ0c1tpZHggKyAxXTtcbiAgICB9KTtcblxuICAgIC8vIFdyaXRlIG91dCB0aGUgaW1wb3J0cyB0aGF0IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgZmlsZS5cbiAgICBsZXQgaW1wb3J0cyA9IGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzZi5maWxlTmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAubWFwKGkgPT4gYGltcG9ydCAqIGFzICR7aS5xdWFsaWZpZXJ9IGZyb20gJyR7aS5zcGVjaWZpZXJ9JztgKVxuICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICBjb2RlID0gaW1wb3J0cyArICdcXG4nICsgY29kZTtcblxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgZmluYWxpemUoKTogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+IHtcbiAgICAvLyBGaXJzdCwgYnVpbGQgdGhlIG1hcCBvZiB1cGRhdGVzIHRvIHNvdXJjZSBmaWxlcy5cbiAgICBjb25zdCB1cGRhdGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgb3JpZ2luYWxTZiBvZiB0aGlzLm9wTWFwLmtleXMoKSkge1xuICAgICAgY29uc3QgbmV3VGV4dCA9IHRoaXMudHJhbnNmb3JtKG9yaWdpbmFsU2YpO1xuICAgICAgaWYgKG5ld1RleHQgIT09IG51bGwpIHtcbiAgICAgICAgdXBkYXRlcy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShvcmlnaW5hbFNmKSwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlbiBnbyB0aHJvdWdoIGVhY2ggaW5wdXQgZmlsZSB0aGF0IGhhcyBwZW5kaW5nIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb25zLlxuICAgIGZvciAoY29uc3QgW3NmUGF0aCwgcGVuZGluZ0ZpbGVEYXRhXSBvZiB0aGlzLmZpbGVNYXApIHtcbiAgICAgIC8vIEZvciBlYWNoIGlucHV0IGZpbGUsIGNvbnNpZGVyIGdlbmVyYXRpb24gb3BlcmF0aW9ucyBmb3IgZWFjaCBvZiBpdHMgc2hpbXMuXG4gICAgICBmb3IgKGNvbnN0IHBlbmRpbmdTaGltRGF0YSBvZiBwZW5kaW5nRmlsZURhdGEuc2hpbURhdGEudmFsdWVzKCkpIHtcbiAgICAgICAgdGhpcy5ob3N0LnJlY29yZFNoaW1EYXRhKHNmUGF0aCwge1xuICAgICAgICAgIGdlbmVzaXNEaWFnbm9zdGljczogW1xuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgICAuLi5wZW5kaW5nU2hpbURhdGEub29iUmVjb3JkZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBoYXNJbmxpbmVzOiBwZW5kaW5nRmlsZURhdGEuaGFzSW5saW5lcyxcbiAgICAgICAgICBwYXRoOiBwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHVwZGF0ZXMuc2V0KHBlbmRpbmdTaGltRGF0YS5maWxlLmZpbGVOYW1lLCBwZW5kaW5nU2hpbURhdGEuZmlsZS5yZW5kZXIoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZXM7XG4gIH1cblxuICBwcml2YXRlIGFkZElubGluZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2hpbURhdGE6IFBlbmRpbmdTaGltRGF0YSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuICAgIG9wcy5wdXNoKG5ldyBUY2JPcChcbiAgICAgICAgcmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZsZWN0b3IsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsXG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIHBlbmRpbmdTaGltRm9yQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQZW5kaW5nU2hpbURhdGEge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLmNvbXBvbmVudE1hcHBpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChub2RlKTtcbiAgICBpZiAoIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLnNldChzaGltUGF0aCwge1xuICAgICAgICBkb21TY2hlbWFDaGVja2VyOiBuZXcgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyKGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIpLFxuICAgICAgICBvb2JSZWNvcmRlcjogbmV3IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGwoZmlsZURhdGEuc291cmNlTWFuYWdlciksXG4gICAgICAgIGZpbGU6IG5ldyBUeXBlQ2hlY2tGaWxlKFxuICAgICAgICAgICAgc2hpbVBhdGgsIHRoaXMuY29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNvbXBpbGVySG9zdCksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVEYXRhLnNoaW1EYXRhLmdldChzaGltUGF0aCkhO1xuICB9XG5cbiAgcHJpdmF0ZSBkYXRhRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSk6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBpZiAoIXRoaXMuZmlsZU1hcC5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhID0ge1xuICAgICAgICBoYXNJbmxpbmVzOiBmYWxzZSxcbiAgICAgICAgc291cmNlTWFuYWdlcjogdGhpcy5ob3N0LmdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoKSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH07XG4gICAgICB0aGlzLmZpbGVNYXAuc2V0KHNmUGF0aCwgZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmlsZU1hcC5nZXQoc2ZQYXRoKSE7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNoZWNrIGNvZGUgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKi9cbmNsYXNzIFRjYk9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICByZWFkb25seSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcikge31cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kICsgMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgZW52ID0gbmV3IEVudmlyb25tZW50KHRoaXMuY29uZmlnLCBpbSwgcmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHNmKTtcbiAgICBjb25zdCBmbk5hbWUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiXyR7dGhpcy5yZWYubm9kZS5wb3N9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=