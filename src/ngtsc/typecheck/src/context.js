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
                    if (dir.isGeneric && type_constructor_1.requiresInlineTypeCtor(dirNode, this.reflector)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQXlFO0lBQ3pFLG1FQUE4RTtJQUU5RSx5RUFBK0M7SUFJL0MseUVBQWlFO0lBQ2pFLHlGQUEwQztJQUMxQyx5RUFBbUY7SUFFbkYsbUdBQXdGO0lBQ3hGLGlHQUFnRDtJQUNoRCxtR0FBa0Y7SUFtR2xGOztPQUVHO0lBQ0gsSUFBWSxZQVVYO0lBVkQsV0FBWSxZQUFZO1FBQ3RCOztXQUVHO1FBQ0gseURBQVMsQ0FBQTtRQUVUOztXQUVHO1FBQ0gsaURBQUssQ0FBQTtJQUNQLENBQUMsRUFWVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQVV2QjtJQUVEOzs7OztPQUtHO0lBQ0g7UUFHRSw4QkFDWSxNQUEwQixFQUMxQixZQUEyRCxFQUMzRCx3QkFBd0QsRUFDeEQsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxJQUFzQixFQUFVLFFBQXNCO1lBSnRELFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzFCLGlCQUFZLEdBQVosWUFBWSxDQUErQztZQUMzRCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQWdDO1lBQ3hELGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsU0FBSSxHQUFKLElBQUksQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFjO1lBUDFELFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBK0MsQ0FBQztZQVN6RTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFFL0M7OztlQUdHO1lBQ0ssb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFB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RixJQUFNLEdBQUcsR0FBRyx5Q0FBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0QsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBakJELElBaUJDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLFFBQVEsQ0FBQyxHQUFPLEVBQUUsR0FBTztRQUNoQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxNQUFnQjtRQUN4RCxJQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6QyxLQUFLLEdBQUcsS0FBSyxDQUFDO1NBQ2Y7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGFyc2VTb3VyY2VGaWxlLCBSM1RhcmdldEJpbmRlciwgU2NoZW1hTWV0YWRhdGEsIFRtcGxBc3ROb2RlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge0NvbXBvbmVudFRvU2hpbU1hcHBpbmdTdHJhdGVneSwgVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge1RlbXBsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RvbVNjaGVtYUNoZWNrZXIsIFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcn0gZnJvbSAnLi9kb20nO1xuaW1wb3J0IHtFbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge091dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciwgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVySW1wbH0gZnJvbSAnLi9vb2InO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hbmFnZXJ9IGZyb20gJy4vc291cmNlJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ2hlY2tCbG9jaywgcmVxdWlyZXNJbmxpbmVUeXBlQ2hlY2tCbG9ja30gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcbmltcG9ydCB7VHlwZUNoZWNrRmlsZX0gZnJvbSAnLi90eXBlX2NoZWNrX2ZpbGUnO1xuaW1wb3J0IHtnZW5lcmF0ZUlubGluZVR5cGVDdG9yLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1UeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNoaW0gZmlsZS5cbiAgICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBBbnkgYHRzLkRpYWdub3N0aWNgcyB3aGljaCB3ZXJlIHByb2R1Y2VkIGR1cmluZyB0aGUgZ2VuZXJhdGlvbiBvZiB0aGlzIHNoaW0uXG4gICAqXG4gICAqIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGR1cmluZyBjcmVhdGlvbiB0aW1lIGFuZCBhcmUgdHJhY2tlZCBoZXJlLlxuICAgKi9cbiAgZ2VuZXNpc0RpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcblxuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIG9wZXJhdGlvbnMgZm9yIHRoZSBpbnB1dCBmaWxlIHdlcmUgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhpcyBzaGltLlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBEYXRhIGZvciBhbiBpbnB1dCBmaWxlIHdoaWNoIGlzIHN0aWxsIGluIHRoZSBwcm9jZXNzIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIGFueSBpbmxpbmUgY29kZSBoYXMgYmVlbiByZXF1aXJlZCBieSB0aGUgc2hpbSB5ZXQuXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbiBmb3IgbWFwcGluZyBkaWFnbm9zdGljcyBmcm9tIGlubGluZWQgdHlwZSBjaGVjayBibG9ja3MgYmFjayB0byB0aGVcbiAgICogb3JpZ2luYWwgdGVtcGxhdGUuXG4gICAqL1xuICBzb3VyY2VNYW5hZ2VyOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbi1wcm9ncmVzcyBzaGltIGRhdGEgZm9yIHNoaW1zIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFBlbmRpbmdTaGltRGF0YT47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ1NoaW1EYXRhIHtcbiAgLyoqXG4gICAqIFJlY29yZGVyIGZvciBvdXQtb2YtYmFuZCBkaWFnbm9zdGljcyB3aGljaCBhcmUgcmFpc2VkIGR1cmluZyBnZW5lcmF0aW9uLlxuICAgKi9cbiAgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcjtcblxuICAvKipcbiAgICogVGhlIGBEb21TY2hlbWFDaGVja2VyYCBpbiB1c2UgZm9yIHRoaXMgdGVtcGxhdGUsIHdoaWNoIHJlY29yZHMgYW55IHNjaGVtYS1yZWxhdGVkIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcjtcblxuICAvKipcbiAgICogU2hpbSBmaWxlIGluIHRoZSBwcm9jZXNzIG9mIGJlaW5nIGdlbmVyYXRlZC5cbiAgICovXG4gIGZpbGU6IFR5cGVDaGVja0ZpbGU7XG59XG5cbi8qKlxuICogQWRhcHRzIHRoZSBgVHlwZUNoZWNrQ29udGV4dEltcGxgIHRvIHRoZSBsYXJnZXIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBzeXN0ZW0uXG4gKlxuICogVGhyb3VnaCB0aGlzIGludGVyZmFjZSwgYSBzaW5nbGUgYFR5cGVDaGVja0NvbnRleHRJbXBsYCAod2hpY2ggcmVwcmVzZW50cyBvbmUgXCJwYXNzXCIgb2YgdGVtcGxhdGVcbiAqIHR5cGUtY2hlY2tpbmcpIHJlcXVlc3RzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBsYXJnZXIgc3RhdGUgb2YgdHlwZS1jaGVja2luZywgYXMgd2VsbCBhcyByZXBvcnRzXG4gKiBiYWNrIGl0cyByZXN1bHRzIG9uY2UgZmluYWxpemVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDaGVja2luZ0hvc3Qge1xuICAvKipcbiAgICogUmV0cmlldmUgdGhlIGBUZW1wbGF0ZVNvdXJjZU1hbmFnZXJgIHJlc3BvbnNpYmxlIGZvciBjb21wb25lbnRzIGluIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGguXG4gICAqL1xuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgYSBwYXJ0aWN1bGFyIGNvbXBvbmVudCBjbGFzcyBzaG91bGQgYmUgaW5jbHVkZWQgaW4gdGhlIGN1cnJlbnQgdHlwZS1jaGVja2luZyBwYXNzLlxuICAgKlxuICAgKiBOb3QgYWxsIGNvbXBvbmVudHMgb2ZmZXJlZCB0byB0aGUgYFR5cGVDaGVja0NvbnRleHRgIGZvciBjaGVja2luZyBtYXkgcmVxdWlyZSBwcm9jZXNzaW5nLiBGb3JcbiAgICogZXhhbXBsZSwgdGhlIGNvbXBvbmVudCBtYXkgaGF2ZSByZXN1bHRzIGFscmVhZHkgYXZhaWxhYmxlIGZyb20gYSBwcmlvciBwYXNzIG9yIGZyb20gYSBwcmV2aW91c1xuICAgKiBwcm9ncmFtLlxuICAgKi9cbiAgc2hvdWxkQ2hlY2tDb21wb25lbnQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBnaXZlbiBjb21wb25lbnQgaGFzIGhhZCBpdHMgdGVtcGxhdGUgb3ZlcnJpZGRlbiwgYW5kIHJldHJpZXZlIHRoZSBuZXcgdGVtcGxhdGVcbiAgICogbm9kZXMgaWYgc28uXG4gICAqL1xuICBnZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGw7XG5cbiAgLyoqXG4gICAqIFJlcG9ydCBkYXRhIGZyb20gYSBzaGltIGdlbmVyYXRlZCBmcm9tIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGguXG4gICAqL1xuICByZWNvcmRTaGltRGF0YShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBTaGltVHlwZUNoZWNraW5nRGF0YSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlY29yZCB0aGF0IGFsbCBvZiB0aGUgY29tcG9uZW50cyB3aXRoaW4gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aCBoYWQgY29kZSBnZW5lcmF0ZWQgLSB0aGF0XG4gICAqIGlzLCBjb3ZlcmFnZSBmb3IgdGhlIGZpbGUgY2FuIGJlIGNvbnNpZGVyZWQgY29tcGxldGUuXG4gICAqL1xuICByZWNvcmRDb21wbGV0ZShzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZDtcbn1cblxuLyoqXG4gKiBIb3cgYSB0eXBlLWNoZWNraW5nIGNvbnRleHQgc2hvdWxkIGhhbmRsZSBvcGVyYXRpb25zIHdoaWNoIHdvdWxkIHJlcXVpcmUgaW5saW5pbmcuXG4gKi9cbmV4cG9ydCBlbnVtIElubGluaW5nTW9kZSB7XG4gIC8qKlxuICAgKiBVc2UgaW5saW5pbmcgb3BlcmF0aW9ucyB3aGVuIHJlcXVpcmVkLlxuICAgKi9cbiAgSW5saW5lT3BzLFxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIGRpYWdub3N0aWNzIGlmIGFuIG9wZXJhdGlvbiB3b3VsZCByZXF1aXJlIGlubGluaW5nLlxuICAgKi9cbiAgRXJyb3IsXG59XG5cbi8qKlxuICogQSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbnRleHQgZm9yIGEgcHJvZ3JhbS5cbiAqXG4gKiBUaGUgYFR5cGVDaGVja0NvbnRleHRgIGFsbG93cyByZWdpc3RyYXRpb24gb2YgY29tcG9uZW50cyBhbmQgdGhlaXIgdGVtcGxhdGVzIHdoaWNoIG5lZWQgdG8gYmVcbiAqIHR5cGUgY2hlY2tlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVDaGVja0NvbnRleHRJbXBsIGltcGxlbWVudHMgVHlwZUNoZWNrQ29udGV4dCB7XG4gIHByaXZhdGUgZmlsZU1hcCA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICBwcml2YXRlIGNvbXBpbGVySG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDYW5vbmljYWxGaWxlTmFtZSc+LFxuICAgICAgcHJpdmF0ZSBjb21wb25lbnRNYXBwaW5nU3RyYXRlZ3k6IENvbXBvbmVudFRvU2hpbU1hcHBpbmdTdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBob3N0OiBUeXBlQ2hlY2tpbmdIb3N0LCBwcml2YXRlIGlubGluaW5nOiBJbmxpbmluZ01vZGUpIHt9XG5cbiAgLyoqXG4gICAqIEEgYE1hcGAgb2YgYHRzLlNvdXJjZUZpbGVgcyB0aGF0IHRoZSBjb250ZXh0IGhhcyBzZWVuIHRvIHRoZSBvcGVyYXRpb25zIChhZGRpdGlvbnMgb2YgbWV0aG9kc1xuICAgKiBvciB0eXBlLWNoZWNrIGJsb2NrcykgdGhhdCBuZWVkIHRvIGJlIGV2ZW50dWFsbHkgcGVyZm9ybWVkIG9uIHRoYXQgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgb3BNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE9wW10+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGVuIGFuIGEgcGFydGljdWxhciBjbGFzcyBoYXMgYSBwZW5kaW5nIHR5cGUgY29uc3RydWN0b3IgcGF0Y2hpbmcgb3BlcmF0aW9uIGFscmVhZHlcbiAgICogcXVldWVkLlxuICAgKi9cbiAgcHJpdmF0ZSB0eXBlQ3RvclBlbmRpbmcgPSBuZXcgU2V0PHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHRlbXBsYXRlIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50IGBub2RlYCwgd2l0aCBhIGBTZWxlY3Rvck1hdGNoZXJgIGZvciBkaXJlY3RpdmVcbiAgICogbWF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGNsYXNzIG9mIHRoZSBub2RlIGJlaW5nIHJlY29yZGVkLlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgQVNUIG5vZGVzIG9mIHRoZSB0ZW1wbGF0ZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIG1hdGNoZXIgYFNlbGVjdG9yTWF0Y2hlcmAgd2hpY2ggdHJhY2tzIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgYmluZGVyOiBSM1RhcmdldEJpbmRlcjxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdLFxuICAgICAgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdLCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsXG4gICAgICBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaG9zdC5zaG91bGRDaGVja0NvbXBvbmVudChyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgb3ZlcnJpZGVUZW1wbGF0ZSA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aCwgcmVmLm5vZGUpO1xuICAgIGlmIChvdmVycmlkZVRlbXBsYXRlICE9PSBudWxsKSB7XG4gICAgICB0ZW1wbGF0ZSA9IG92ZXJyaWRlVGVtcGxhdGU7XG4gICAgfVxuXG4gICAgLy8gQWNjdW11bGF0ZSBhIGxpc3Qgb2YgYW55IGRpcmVjdGl2ZXMgd2hpY2ggY291bGQgbm90IGhhdmUgdHlwZSBjb25zdHJ1Y3RvcnMgZ2VuZXJhdGVkIGR1ZSB0b1xuICAgIC8vIHVuc3VwcG9ydGVkIGlubGluaW5nIG9wZXJhdGlvbnMuXG4gICAgbGV0IG1pc3NpbmdJbmxpbmVzOiBDbGFzc0RlY2xhcmF0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1EYXRhID0gdGhpcy5wZW5kaW5nU2hpbUZvckNvbXBvbmVudChyZWYubm9kZSk7XG4gICAgY29uc3QgYm91bmRUYXJnZXQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGV9KTtcbiAgICAvLyBHZXQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIGFuZCByZWNvcmQgdHlwZSBjb25zdHJ1Y3RvcnMgZm9yIGFsbCBvZiB0aGVtLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGJvdW5kVGFyZ2V0LmdldFVzZWREaXJlY3RpdmVzKCkpIHtcbiAgICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgICAgY29uc3QgZGlyTm9kZSA9IGRpclJlZi5ub2RlO1xuXG4gICAgICBpZiAoZGlyLmlzR2VuZXJpYyAmJiByZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpck5vZGUsIHRoaXMucmVmbGVjdG9yKSkge1xuICAgICAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yKSB7XG4gICAgICAgICAgbWlzc2luZ0lubGluZXMucHVzaChkaXJOb2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgYSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiBmb3IgdGhlIGRpcmVjdGl2ZS5cbiAgICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ3RvcihmaWxlRGF0YSwgZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCksIGRpclJlZiwge1xuICAgICAgICAgIGZuTmFtZTogJ25nVHlwZUN0b3InLFxuICAgICAgICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBzaG91bGQgaGF2ZSBhIGJvZHkgaWYgdGhlIGRpcmVjdGl2ZSBjb21lcyBmcm9tIGEgLnRzIGZpbGUsIGJ1dCBub3QgaWZcbiAgICAgICAgICAvLyBpdCBjb21lcyBmcm9tIGEgLmQudHMgZmlsZS4gLmQudHMgZGVjbGFyYXRpb25zIGRvbid0IGhhdmUgYm9kaWVzLlxuICAgICAgICAgIGJvZHk6ICFkaXJOb2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSxcbiAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgIGlucHV0czogT2JqZWN0LmtleXMoZGlyLmlucHV0cyksXG4gICAgICAgICAgICBvdXRwdXRzOiBPYmplY3Qua2V5cyhkaXIub3V0cHV0cyksXG4gICAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHN1cHBvcnQgcXVlcmllc1xuICAgICAgICAgICAgcXVlcmllczogZGlyLnF1ZXJpZXMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2VyY2VkSW5wdXRGaWVsZHM6IGRpci5jb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRjYlJlcXVpcmVzSW5saW5lID0gcmVxdWlyZXNJbmxpbmVUeXBlQ2hlY2tCbG9jayhyZWYubm9kZSk7XG5cbiAgICAvLyBJZiBpbmxpbmluZyBpcyBub3Qgc3VwcG9ydGVkLCBidXQgaXMgcmVxdWlyZWQgZm9yIGVpdGhlciB0aGUgVENCIG9yIG9uZSBvZiBpdHMgZGlyZWN0aXZlXG4gICAgLy8gZGVwZW5kZW5jaWVzLCB0aGVuIGV4aXQgaGVyZSB3aXRoIGFuIGVycm9yLlxuICAgIGlmICh0aGlzLmlubGluaW5nID09PSBJbmxpbmluZ01vZGUuRXJyb3IgJiYgKHRjYlJlcXVpcmVzSW5saW5lIHx8IG1pc3NpbmdJbmxpbmVzLmxlbmd0aCA+IDApKSB7XG4gICAgICAvLyBUaGlzIHRlbXBsYXRlIGNhbm5vdCBiZSBzdXBwb3J0ZWQgYmVjYXVzZSB0aGUgdW5kZXJseWluZyBzdHJhdGVneSBkb2VzIG5vdCBzdXBwb3J0IGlubGluaW5nXG4gICAgICAvLyBhbmQgaW5saW5pbmcgd291bGQgYmUgcmVxdWlyZWQuXG5cbiAgICAgIC8vIFJlY29yZCBkaWFnbm9zdGljcyB0byBpbmRpY2F0ZSB0aGUgaXNzdWVzIHdpdGggdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQocmVmLm5vZGUpO1xuICAgICAgaWYgKHRjYlJlcXVpcmVzSW5saW5lKSB7XG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyLnJlcXVpcmVzSW5saW5lVGNiKHRlbXBsYXRlSWQsIHJlZi5ub2RlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1pc3NpbmdJbmxpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgc2hpbURhdGEub29iUmVjb3JkZXIucmVxdWlyZXNJbmxpbmVUeXBlQ29uc3RydWN0b3JzKHRlbXBsYXRlSWQsIHJlZi5ub2RlLCBtaXNzaW5nSW5saW5lcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNraW5nIHRoaXMgdGVtcGxhdGUgd291bGQgYmUgdW5zdXBwb3J0ZWQsIHNvIGRvbid0IHRyeS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0ge1xuICAgICAgaWQ6IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuY2FwdHVyZVNvdXJjZShyZWYubm9kZSwgc291cmNlTWFwcGluZywgZmlsZSksXG4gICAgICBib3VuZFRhcmdldCxcbiAgICAgIHBpcGVzLFxuICAgICAgc2NoZW1hcyxcbiAgICB9O1xuICAgIGlmICh0Y2JSZXF1aXJlc0lubGluZSkge1xuICAgICAgLy8gVGhpcyBjbGFzcyBkaWRuJ3QgbWVldCB0aGUgcmVxdWlyZW1lbnRzIGZvciBleHRlcm5hbCB0eXBlIGNoZWNraW5nLCBzbyBnZW5lcmF0ZSBhbiBpbmxpbmVcbiAgICAgIC8vIFRDQiBmb3IgdGhlIGNsYXNzLlxuICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhmaWxlRGF0YSwgc2hpbURhdGEsIHJlZiwgbWV0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBjbGFzcyBjYW4gYmUgdHlwZS1jaGVja2VkIGV4dGVybmFsbHkgYXMgbm9ybWFsLlxuICAgICAgc2hpbURhdGEuZmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhyZWYsIG1ldGEsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsIHNoaW1EYXRhLm9vYlJlY29yZGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkIGEgdHlwZSBjb25zdHJ1Y3RvciBmb3IgdGhlIGdpdmVuIGBub2RlYCB3aXRoIHRoZSBnaXZlbiBgY3Rvck1ldGFkYXRhYC5cbiAgICovXG4gIGFkZElubGluZVR5cGVDdG9yKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2Y6IHRzLlNvdXJjZUZpbGUsXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgY3Rvck1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ3RvclBlbmRpbmcuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnR5cGVDdG9yUGVuZGluZy5hZGQocmVmLm5vZGUpO1xuXG4gICAgLy8gTGF6aWx5IGNvbnN0cnVjdCB0aGUgb3BlcmF0aW9uIG1hcC5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpITtcblxuICAgIC8vIFB1c2ggYSBgVHlwZUN0b3JPcGAgaW50byB0aGUgb3BlcmF0aW9uIHF1ZXVlIGZvciB0aGUgc291cmNlIGZpbGUuXG4gICAgb3BzLnB1c2gobmV3IFR5cGVDdG9yT3AocmVmLCBjdG9yTWV0YSkpO1xuICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSBhIGB0cy5Tb3VyY2VGaWxlYCBpbnRvIGEgdmVyc2lvbiB0aGF0IGluY2x1ZGVzIHR5cGUgY2hlY2tpbmcgY29kZS5cbiAgICpcbiAgICogSWYgdGhpcyBwYXJ0aWN1bGFyIGB0cy5Tb3VyY2VGaWxlYCByZXF1aXJlcyBjaGFuZ2VzLCB0aGUgdGV4dCByZXByZXNlbnRpbmcgaXRzIG5ldyBjb250ZW50c1xuICAgKiB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGEgYG51bGxgIHJldHVybiBpbmRpY2F0ZXMgbm8gY2hhbmdlcyB3ZXJlIG5lY2Vzc2FyeS5cbiAgICovXG4gIHRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gb3BlcmF0aW9ucyBwZW5kaW5nIGZvciB0aGlzIHBhcnRpY3VsYXIgZmlsZSwgcmV0dXJuIGBudWxsYCB0byBpbmRpY2F0ZSBub1xuICAgIC8vIGNoYW5nZXMuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpIS5zb3J0KG9yZGVyT3BzKTtcbiAgICBjb25zdCB0ZXh0UGFydHMgPSBzcGxpdFN0cmluZ0F0UG9pbnRzKHNmLnRleHQsIG9wcy5tYXAob3AgPT4gb3Auc3BsaXRQb2ludCkpO1xuXG4gICAgLy8gVXNlIGEgYHRzLlByaW50ZXJgIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtvbWl0VHJhaWxpbmdTZW1pY29sb246IHRydWV9KTtcblxuICAgIC8vIEJlZ2luIHdpdGggdGhlIGludGlhbCBzZWN0aW9uIG9mIHRoZSBjb2RlIHRleHQuXG4gICAgbGV0IGNvZGUgPSB0ZXh0UGFydHNbMF07XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggb3BlcmF0aW9uIGFuZCB1c2UgdGhlIHByaW50ZXIgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUgZm9yIGl0LCBpbnNlcnRpbmcgaXQgaW50b1xuICAgIC8vIHRoZSBzb3VyY2UgY29kZSBpbiBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjaHVua3MuXG4gICAgb3BzLmZvckVhY2goKG9wLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBvcC5leGVjdXRlKGltcG9ydE1hbmFnZXIsIHNmLCB0aGlzLnJlZkVtaXR0ZXIsIHByaW50ZXIpO1xuICAgICAgY29kZSArPSAnXFxuXFxuJyArIHRleHQgKyB0ZXh0UGFydHNbaWR4ICsgMV07XG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBvdXQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGUuXG4gICAgbGV0IGltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyfSBmcm9tICcke2kuc3BlY2lmaWVyfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJyk7XG4gICAgY29kZSA9IGltcG9ydHMgKyAnXFxuJyArIGNvZGU7XG5cbiAgICByZXR1cm4gY29kZTtcbiAgfVxuXG4gIGZpbmFsaXplKCk6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPiB7XG4gICAgLy8gRmlyc3QsIGJ1aWxkIHRoZSBtYXAgb2YgdXBkYXRlcyB0byBzb3VyY2UgZmlsZXMuXG4gICAgY29uc3QgdXBkYXRlcyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IG9yaWdpbmFsU2Ygb2YgdGhpcy5vcE1hcC5rZXlzKCkpIHtcbiAgICAgIGNvbnN0IG5ld1RleHQgPSB0aGlzLnRyYW5zZm9ybShvcmlnaW5hbFNmKTtcbiAgICAgIGlmIChuZXdUZXh0ICE9PSBudWxsKSB7XG4gICAgICAgIHVwZGF0ZXMuc2V0KGFic29sdXRlRnJvbVNvdXJjZUZpbGUob3JpZ2luYWxTZiksIG5ld1RleHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZW4gZ28gdGhyb3VnaCBlYWNoIGlucHV0IGZpbGUgdGhhdCBoYXMgcGVuZGluZyBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IFtzZlBhdGgsIHBlbmRpbmdGaWxlRGF0YV0gb2YgdGhpcy5maWxlTWFwKSB7XG4gICAgICAvLyBGb3IgZWFjaCBpbnB1dCBmaWxlLCBjb25zaWRlciBnZW5lcmF0aW9uIG9wZXJhdGlvbnMgZm9yIGVhY2ggb2YgaXRzIHNoaW1zLlxuICAgICAgZm9yIChjb25zdCBwZW5kaW5nU2hpbURhdGEgb2YgcGVuZGluZ0ZpbGVEYXRhLnNoaW1EYXRhLnZhbHVlcygpKSB7XG4gICAgICAgIHRoaXMuaG9zdC5yZWNvcmRTaGltRGF0YShzZlBhdGgsIHtcbiAgICAgICAgICBnZW5lc2lzRGlhZ25vc3RpY3M6IFtcbiAgICAgICAgICAgIC4uLnBlbmRpbmdTaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLmRpYWdub3N0aWNzLFxuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLm9vYlJlY29yZGVyLmRpYWdub3N0aWNzLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgaGFzSW5saW5lczogcGVuZGluZ0ZpbGVEYXRhLmhhc0lubGluZXMsXG4gICAgICAgICAgcGF0aDogcGVuZGluZ1NoaW1EYXRhLmZpbGUuZmlsZU5hbWUsXG4gICAgICAgIH0pO1xuICAgICAgICB1cGRhdGVzLnNldChwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSwgcGVuZGluZ1NoaW1EYXRhLmZpbGUucmVuZGVyKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1cGRhdGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhcbiAgICAgIGZpbGVEYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEsIHNoaW1EYXRhOiBQZW5kaW5nU2hpbURhdGEsXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHRjYk1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBzZiA9IHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpITtcbiAgICBvcHMucHVzaChuZXcgVGNiT3AoXG4gICAgICAgIHJlZiwgdGNiTWV0YSwgdGhpcy5jb25maWcsIHRoaXMucmVmbGVjdG9yLCBzaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLFxuICAgICAgICBzaGltRGF0YS5vb2JSZWNvcmRlcikpO1xuICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBwZW5kaW5nU2hpbUZvckNvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogUGVuZGluZ1NoaW1EYXRhIHtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZGF0YUZvckZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy5jb21wb25lbnRNYXBwaW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKCFmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICBmaWxlRGF0YS5zaGltRGF0YS5zZXQoc2hpbVBhdGgsIHtcbiAgICAgICAgZG9tU2NoZW1hQ2hlY2tlcjogbmV3IFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcihmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyKSxcbiAgICAgICAgb29iUmVjb3JkZXI6IG5ldyBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsKGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIpLFxuICAgICAgICBmaWxlOiBuZXcgVHlwZUNoZWNrRmlsZShcbiAgICAgICAgICAgIHNoaW1QYXRoLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jb21waWxlckhvc3QpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBmaWxlRGF0YS5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcbiAgfVxuXG4gIHByaXZhdGUgZGF0YUZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgaWYgKCF0aGlzLmZpbGVNYXAuaGFzKHNmUGF0aCkpIHtcbiAgICAgIGNvbnN0IGRhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSA9IHtcbiAgICAgICAgaGFzSW5saW5lczogZmFsc2UsXG4gICAgICAgIHNvdXJjZU1hbmFnZXI6IHRoaXMuaG9zdC5nZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aCksXG4gICAgICAgIHNoaW1EYXRhOiBuZXcgTWFwKCksXG4gICAgICB9O1xuICAgICAgdGhpcy5maWxlTWFwLnNldChzZlBhdGgsIGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmZpbGVNYXAuZ2V0KHNmUGF0aCkhO1xuICB9XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQgbmVlZHMgdG8gaGFwcGVuIHdpdGhpbiBhIGdpdmVuIHNvdXJjZSBmaWxlLlxuICovXG5pbnRlcmZhY2UgT3Age1xuICAvKipcbiAgICogVGhlIG5vZGUgaW4gdGhlIGZpbGUgd2hpY2ggd2lsbCBoYXZlIGNvZGUgZ2VuZXJhdGVkIGZvciBpdC5cbiAgICovXG4gIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuXG4gIC8qKlxuICAgKiBJbmRleCBpbnRvIHRoZSBzb3VyY2UgdGV4dCB3aGVyZSB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgdGhlIG9wZXJhdGlvbiBzaG91bGQgYmUgaW5zZXJ0ZWQuXG4gICAqL1xuICByZWFkb25seSBzcGxpdFBvaW50OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhlIG9wZXJhdGlvbiBhbmQgcmV0dXJuIHRoZSBnZW5lcmF0ZWQgY29kZSBhcyB0ZXh0LlxuICAgKi9cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdHlwZSBjaGVjayBibG9jayBvcGVyYXRpb24gd2hpY2ggcHJvZHVjZXMgdHlwZSBjaGVjayBjb2RlIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICovXG5jbGFzcyBUY2JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIHJlYWRvbmx5IGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcmVhZG9ubHkgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcmVhZG9ubHkgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcixcbiAgICAgIHJlYWRvbmx5IG9vYlJlY29yZGVyOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY2hlY2sgYmxvY2tzIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgZW5kIG9mIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCArIDE7XG4gIH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IGVudiA9IG5ldyBFbnZpcm9ubWVudCh0aGlzLmNvbmZpZywgaW0sIHJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCBzZik7XG4gICAgY29uc3QgZm5OYW1lID0gdHMuY3JlYXRlSWRlbnRpZmllcihgX3RjYl8ke3RoaXMucmVmLm5vZGUucG9zfWApO1xuICAgIGNvbnN0IGZuID0gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgZW52LCB0aGlzLnJlZiwgZm5OYW1lLCB0aGlzLm1ldGEsIHRoaXMuZG9tU2NoZW1hQ2hlY2tlciwgdGhpcy5vb2JSZWNvcmRlcik7XG4gICAgcmV0dXJuIHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBmbiwgc2YpO1xuICB9XG59XG5cbi8qKlxuICogQSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNvbnN0cnVjdG9yIGNvZGUgZm9yIGEgcGFydGljdWxhciBkaXJlY3RpdmUuXG4gKi9cbmNsYXNzIFR5cGVDdG9yT3AgaW1wbGVtZW50cyBPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICByZWFkb25seSBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKSB7fVxuXG4gIC8qKlxuICAgKiBUeXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbnMgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBkaXJlY3RpdmUgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCAtIDE7XG4gIH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IHRjYiA9IGdlbmVyYXRlSW5saW5lVHlwZUN0b3IodGhpcy5yZWYubm9kZSwgdGhpcy5tZXRhKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHRjYiwgc2YpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGFyZSB0d28gb3BlcmF0aW9ucyBhbmQgcmV0dXJuIHRoZWlyIHNwbGl0IHBvaW50IG9yZGVyaW5nLlxuICovXG5mdW5jdGlvbiBvcmRlck9wcyhvcDE6IE9wLCBvcDI6IE9wKTogbnVtYmVyIHtcbiAgcmV0dXJuIG9wMS5zcGxpdFBvaW50IC0gb3AyLnNwbGl0UG9pbnQ7XG59XG5cbi8qKlxuICogU3BsaXQgYSBzdHJpbmcgaW50byBjaHVua3MgYXQgYW55IG51bWJlciBvZiBzcGxpdCBwb2ludHMuXG4gKi9cbmZ1bmN0aW9uIHNwbGl0U3RyaW5nQXRQb2ludHMoc3RyOiBzdHJpbmcsIHBvaW50czogbnVtYmVyW10pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHNwbGl0czogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHN0YXJ0ID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwb2ludCA9IHBvaW50c1tpXTtcbiAgICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0LCBwb2ludCkpO1xuICAgIHN0YXJ0ID0gcG9pbnQ7XG4gIH1cbiAgc3BsaXRzLnB1c2goc3RyLnN1YnN0cmluZyhzdGFydCkpO1xuICByZXR1cm4gc3BsaXRzO1xufVxuIl19