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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
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
    var tcb_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util");
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
                                inputs: dir.inputs.classPropertyNames,
                                outputs: dir.outputs.classPropertyNames,
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
            var templateId = fileData.sourceManager.getTemplateId(ref.node);
            shimData.templates.set(templateId, {
                template: template,
                boundTarget: boundTarget,
            });
            var tcbRequiresInline = tcb_util_1.requiresInlineTypeCheckBlock(ref.node);
            // If inlining is not supported, but is required for either the TCB or one of its directive
            // dependencies, then exit here with an error.
            if (this.inlining === InliningMode.Error && (tcbRequiresInline || missingInlines.length > 0)) {
                // This template cannot be supported because the underlying strategy does not support inlining
                // and inlining would be required.
                // Record diagnostics to indicate the issues with this template.
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
                                templates: pendingShimData.templates,
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
                    templates: new Map(),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQXlFO0lBQ3pFLG1FQUE4RTtJQUU5RSx5RUFBK0M7SUFJL0MseUVBQWlFO0lBQ2pFLHlGQUEwQztJQUMxQyx5RUFBbUY7SUFFbkYsbUZBQXdEO0lBQ3hELG1HQUEwRDtJQUMxRCxpR0FBZ0Q7SUFDaEQsbUdBQWtGO0lBK0hsRjs7T0FFRztJQUNILElBQVksWUFVWDtJQVZELFdBQVksWUFBWTtRQUN0Qjs7V0FFRztRQUNILHlEQUFTLENBQUE7UUFFVDs7V0FFRztRQUNILGlEQUFLLENBQUE7SUFDUCxDQUFDLEVBVlcsWUFBWSxHQUFaLG9CQUFZLEtBQVosb0JBQVksUUFVdkI7SUFFRDs7Ozs7T0FLRztJQUNIO1FBR0UsOEJBQ1ksTUFBMEIsRUFDMUIsWUFBMkQsRUFDM0Qsd0JBQXdELEVBQ3hELFVBQTRCLEVBQVUsU0FBeUIsRUFDL0QsSUFBc0IsRUFBVSxRQUFzQjtZQUp0RCxXQUFNLEdBQU4sTUFBTSxDQUFvQjtZQUMxQixpQkFBWSxHQUFaLFlBQVksQ0FBK0M7WUFDM0QsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFnQztZQUN4RCxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQy9ELFNBQUksR0FBSixJQUFJLENBQWtCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBYztZQVAxRCxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7WUFTekU7OztlQUdHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1lBRS9DOzs7ZUFHRztZQUNLLG9CQUFlLEdBQUcs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QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Qm91bmRUYXJnZXQsIFBhcnNlU291cmNlRmlsZSwgUjNUYXJnZXRCaW5kZXIsIFNjaGVtYU1ldGFkYXRhLCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tm9vcEltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtDb21wb25lbnRUb1NoaW1NYXBwaW5nU3RyYXRlZ3ksIFRlbXBsYXRlSWQsIFRlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7VGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7RG9tU2NoZW1hQ2hlY2tlciwgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyfSBmcm9tICcuL2RvbSc7XG5pbXBvcnQge0Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsfSBmcm9tICcuL29vYic7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtyZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3RjYl91dGlsJztcbmltcG9ydCB7Z2VuZXJhdGVUeXBlQ2hlY2tCbG9ja30gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcbmltcG9ydCB7VHlwZUNoZWNrRmlsZX0gZnJvbSAnLi90eXBlX2NoZWNrX2ZpbGUnO1xuaW1wb3J0IHtnZW5lcmF0ZUlubGluZVR5cGVDdG9yLCByZXF1aXJlc0lubGluZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1UeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNoaW0gZmlsZS5cbiAgICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBBbnkgYHRzLkRpYWdub3N0aWNgcyB3aGljaCB3ZXJlIHByb2R1Y2VkIGR1cmluZyB0aGUgZ2VuZXJhdGlvbiBvZiB0aGlzIHNoaW0uXG4gICAqXG4gICAqIFNvbWUgZGlhZ25vc3RpY3MgYXJlIHByb2R1Y2VkIGR1cmluZyBjcmVhdGlvbiB0aW1lIGFuZCBhcmUgdHJhY2tlZCBoZXJlLlxuICAgKi9cbiAgZ2VuZXNpc0RpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcblxuICAvKipcbiAgICogV2hldGhlciBhbnkgaW5saW5lIG9wZXJhdGlvbnMgZm9yIHRoZSBpbnB1dCBmaWxlIHdlcmUgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhpcyBzaGltLlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWFwIG9mIGBUZW1wbGF0ZUlkYCB0byBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgYWJvdXQgdGhlIHRlbXBsYXRlIGR1cmluZyB0aGUgdGVtcGxhdGVcbiAgICogdHlwZS1jaGVja2luZyBwcm9jZXNzLlxuICAgKi9cbiAgdGVtcGxhdGVzOiBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPjtcbn1cblxuLyoqXG4gKiBEYXRhIHRyYWNrZWQgZm9yIGVhY2ggdGVtcGxhdGUgcHJvY2Vzc2VkIGJ5IHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURhdGEge1xuICAvKipcbiAgICogVGVtcGxhdGUgbm9kZXMgZm9yIHdoaWNoIHRoZSBUQ0Igd2FzIGdlbmVyYXRlZC5cbiAgICovXG4gIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBgQm91bmRUYXJnZXRgIHdoaWNoIHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBUQ0IsIGFuZCBjb250YWlucyBiaW5kaW5ncyBmb3IgdGhlIGFzc29jaWF0ZWRcbiAgICogdGVtcGxhdGUgbm9kZXMuXG4gICAqL1xuICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+O1xufVxuXG4vKipcbiAqIERhdGEgZm9yIGFuIGlucHV0IGZpbGUgd2hpY2ggaXMgc3RpbGwgaW4gdGhlIHByb2Nlc3Mgb2YgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgYW55IGlubGluZSBjb2RlIGhhcyBiZWVuIHJlcXVpcmVkIGJ5IHRoZSBzaGltIHlldC5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uIGZvciBtYXBwaW5nIGRpYWdub3N0aWNzIGZyb20gaW5saW5lZCB0eXBlIGNoZWNrIGJsb2NrcyBiYWNrIHRvIHRoZVxuICAgKiBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICovXG4gIHNvdXJjZU1hbmFnZXI6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogTWFwIG9mIGluLXByb2dyZXNzIHNoaW0gZGF0YSBmb3Igc2hpbXMgZ2VuZXJhdGVkIGZyb20gdGhpcyBpbnB1dCBmaWxlLlxuICAgKi9cbiAgc2hpbURhdGE6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgUGVuZGluZ1NoaW1EYXRhPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nU2hpbURhdGEge1xuICAvKipcbiAgICogUmVjb3JkZXIgZm9yIG91dC1vZi1iYW5kIGRpYWdub3N0aWNzIHdoaWNoIGFyZSByYWlzZWQgZHVyaW5nIGdlbmVyYXRpb24uXG4gICAqL1xuICBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgYERvbVNjaGVtYUNoZWNrZXJgIGluIHVzZSBmb3IgdGhpcyB0ZW1wbGF0ZSwgd2hpY2ggcmVjb3JkcyBhbnkgc2NoZW1hLXJlbGF0ZWQgZGlhZ25vc3RpY3MuXG4gICAqL1xuICBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyO1xuXG4gIC8qKlxuICAgKiBTaGltIGZpbGUgaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgZ2VuZXJhdGVkLlxuICAgKi9cbiAgZmlsZTogVHlwZUNoZWNrRmlsZTtcblxuXG4gIC8qKlxuICAgKiBNYXAgb2YgYFRlbXBsYXRlSWRgIHRvIGluZm9ybWF0aW9uIGNvbGxlY3RlZCBhYm91dCB0aGUgdGVtcGxhdGUgYXMgaXQncyBpbmdlc3RlZC5cbiAgICovXG4gIHRlbXBsYXRlczogTWFwPFRlbXBsYXRlSWQsIFRlbXBsYXRlRGF0YT47XG59XG5cbi8qKlxuICogQWRhcHRzIHRoZSBgVHlwZUNoZWNrQ29udGV4dEltcGxgIHRvIHRoZSBsYXJnZXIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBzeXN0ZW0uXG4gKlxuICogVGhyb3VnaCB0aGlzIGludGVyZmFjZSwgYSBzaW5nbGUgYFR5cGVDaGVja0NvbnRleHRJbXBsYCAod2hpY2ggcmVwcmVzZW50cyBvbmUgXCJwYXNzXCIgb2YgdGVtcGxhdGVcbiAqIHR5cGUtY2hlY2tpbmcpIHJlcXVlc3RzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBsYXJnZXIgc3RhdGUgb2YgdHlwZS1jaGVja2luZywgYXMgd2VsbCBhcyByZXBvcnRzXG4gKiBiYWNrIGl0cyByZXN1bHRzIG9uY2UgZmluYWxpemVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDaGVja2luZ0hvc3Qge1xuICAvKipcbiAgICogUmV0cmlldmUgdGhlIGBUZW1wbGF0ZVNvdXJjZU1hbmFnZXJgIHJlc3BvbnNpYmxlIGZvciBjb21wb25lbnRzIGluIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGguXG4gICAqL1xuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgYSBwYXJ0aWN1bGFyIGNvbXBvbmVudCBjbGFzcyBzaG91bGQgYmUgaW5jbHVkZWQgaW4gdGhlIGN1cnJlbnQgdHlwZS1jaGVja2luZyBwYXNzLlxuICAgKlxuICAgKiBOb3QgYWxsIGNvbXBvbmVudHMgb2ZmZXJlZCB0byB0aGUgYFR5cGVDaGVja0NvbnRleHRgIGZvciBjaGVja2luZyBtYXkgcmVxdWlyZSBwcm9jZXNzaW5nLiBGb3JcbiAgICogZXhhbXBsZSwgdGhlIGNvbXBvbmVudCBtYXkgaGF2ZSByZXN1bHRzIGFscmVhZHkgYXZhaWxhYmxlIGZyb20gYSBwcmlvciBwYXNzIG9yIGZyb20gYSBwcmV2aW91c1xuICAgKiBwcm9ncmFtLlxuICAgKi9cbiAgc2hvdWxkQ2hlY2tDb21wb25lbnQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBnaXZlbiBjb21wb25lbnQgaGFzIGhhZCBpdHMgdGVtcGxhdGUgb3ZlcnJpZGRlbiwgYW5kIHJldHJpZXZlIHRoZSBuZXcgdGVtcGxhdGVcbiAgICogbm9kZXMgaWYgc28uXG4gICAqL1xuICBnZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGw7XG5cbiAgLyoqXG4gICAqIFJlcG9ydCBkYXRhIGZyb20gYSBzaGltIGdlbmVyYXRlZCBmcm9tIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGguXG4gICAqL1xuICByZWNvcmRTaGltRGF0YShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBTaGltVHlwZUNoZWNraW5nRGF0YSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlY29yZCB0aGF0IGFsbCBvZiB0aGUgY29tcG9uZW50cyB3aXRoaW4gdGhlIGdpdmVuIGlucHV0IGZpbGUgcGF0aCBoYWQgY29kZSBnZW5lcmF0ZWQgLSB0aGF0XG4gICAqIGlzLCBjb3ZlcmFnZSBmb3IgdGhlIGZpbGUgY2FuIGJlIGNvbnNpZGVyZWQgY29tcGxldGUuXG4gICAqL1xuICByZWNvcmRDb21wbGV0ZShzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZDtcbn1cblxuLyoqXG4gKiBIb3cgYSB0eXBlLWNoZWNraW5nIGNvbnRleHQgc2hvdWxkIGhhbmRsZSBvcGVyYXRpb25zIHdoaWNoIHdvdWxkIHJlcXVpcmUgaW5saW5pbmcuXG4gKi9cbmV4cG9ydCBlbnVtIElubGluaW5nTW9kZSB7XG4gIC8qKlxuICAgKiBVc2UgaW5saW5pbmcgb3BlcmF0aW9ucyB3aGVuIHJlcXVpcmVkLlxuICAgKi9cbiAgSW5saW5lT3BzLFxuXG4gIC8qKlxuICAgKiBQcm9kdWNlIGRpYWdub3N0aWNzIGlmIGFuIG9wZXJhdGlvbiB3b3VsZCByZXF1aXJlIGlubGluaW5nLlxuICAgKi9cbiAgRXJyb3IsXG59XG5cbi8qKlxuICogQSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbnRleHQgZm9yIGEgcHJvZ3JhbS5cbiAqXG4gKiBUaGUgYFR5cGVDaGVja0NvbnRleHRgIGFsbG93cyByZWdpc3RyYXRpb24gb2YgY29tcG9uZW50cyBhbmQgdGhlaXIgdGVtcGxhdGVzIHdoaWNoIG5lZWQgdG8gYmVcbiAqIHR5cGUgY2hlY2tlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVDaGVja0NvbnRleHRJbXBsIGltcGxlbWVudHMgVHlwZUNoZWNrQ29udGV4dCB7XG4gIHByaXZhdGUgZmlsZU1hcCA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICBwcml2YXRlIGNvbXBpbGVySG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDYW5vbmljYWxGaWxlTmFtZSc+LFxuICAgICAgcHJpdmF0ZSBjb21wb25lbnRNYXBwaW5nU3RyYXRlZ3k6IENvbXBvbmVudFRvU2hpbU1hcHBpbmdTdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBob3N0OiBUeXBlQ2hlY2tpbmdIb3N0LCBwcml2YXRlIGlubGluaW5nOiBJbmxpbmluZ01vZGUpIHt9XG5cbiAgLyoqXG4gICAqIEEgYE1hcGAgb2YgYHRzLlNvdXJjZUZpbGVgcyB0aGF0IHRoZSBjb250ZXh0IGhhcyBzZWVuIHRvIHRoZSBvcGVyYXRpb25zIChhZGRpdGlvbnMgb2YgbWV0aG9kc1xuICAgKiBvciB0eXBlLWNoZWNrIGJsb2NrcykgdGhhdCBuZWVkIHRvIGJlIGV2ZW50dWFsbHkgcGVyZm9ybWVkIG9uIHRoYXQgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgb3BNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE9wW10+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGVuIGFuIGEgcGFydGljdWxhciBjbGFzcyBoYXMgYSBwZW5kaW5nIHR5cGUgY29uc3RydWN0b3IgcGF0Y2hpbmcgb3BlcmF0aW9uIGFscmVhZHlcbiAgICogcXVldWVkLlxuICAgKi9cbiAgcHJpdmF0ZSB0eXBlQ3RvclBlbmRpbmcgPSBuZXcgU2V0PHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHRlbXBsYXRlIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50IGBub2RlYCwgd2l0aCBhIGBTZWxlY3Rvck1hdGNoZXJgIGZvciBkaXJlY3RpdmVcbiAgICogbWF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGNsYXNzIG9mIHRoZSBub2RlIGJlaW5nIHJlY29yZGVkLlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgQVNUIG5vZGVzIG9mIHRoZSB0ZW1wbGF0ZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIG1hdGNoZXIgYFNlbGVjdG9yTWF0Y2hlcmAgd2hpY2ggdHJhY2tzIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgYmluZGVyOiBSM1RhcmdldEJpbmRlcjxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdLFxuICAgICAgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdLCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsXG4gICAgICBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaG9zdC5zaG91bGRDaGVja0NvbXBvbmVudChyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgb3ZlcnJpZGVUZW1wbGF0ZSA9IHRoaXMuaG9zdC5nZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aCwgcmVmLm5vZGUpO1xuICAgIGlmIChvdmVycmlkZVRlbXBsYXRlICE9PSBudWxsKSB7XG4gICAgICB0ZW1wbGF0ZSA9IG92ZXJyaWRlVGVtcGxhdGU7XG4gICAgfVxuXG4gICAgLy8gQWNjdW11bGF0ZSBhIGxpc3Qgb2YgYW55IGRpcmVjdGl2ZXMgd2hpY2ggY291bGQgbm90IGhhdmUgdHlwZSBjb25zdHJ1Y3RvcnMgZ2VuZXJhdGVkIGR1ZSB0b1xuICAgIC8vIHVuc3VwcG9ydGVkIGlubGluaW5nIG9wZXJhdGlvbnMuXG4gICAgbGV0IG1pc3NpbmdJbmxpbmVzOiBDbGFzc0RlY2xhcmF0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1EYXRhID0gdGhpcy5wZW5kaW5nU2hpbUZvckNvbXBvbmVudChyZWYubm9kZSk7XG4gICAgY29uc3QgYm91bmRUYXJnZXQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGV9KTtcblxuICAgIC8vIEdldCBhbGwgb2YgdGhlIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIHJlY29yZCB0eXBlIGNvbnN0cnVjdG9ycyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgZm9yIChjb25zdCBkaXIgb2YgYm91bmRUYXJnZXQuZ2V0VXNlZERpcmVjdGl2ZXMoKSkge1xuICAgICAgY29uc3QgZGlyUmVmID0gZGlyLnJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG4gICAgICBjb25zdCBkaXJOb2RlID0gZGlyUmVmLm5vZGU7XG5cbiAgICAgIGlmIChkaXIuaXNHZW5lcmljICYmIHJlcXVpcmVzSW5saW5lVHlwZUN0b3IoZGlyTm9kZSwgdGhpcy5yZWZsZWN0b3IpKSB7XG4gICAgICAgIGlmICh0aGlzLmlubGluaW5nID09PSBJbmxpbmluZ01vZGUuRXJyb3IpIHtcbiAgICAgICAgICBtaXNzaW5nSW5saW5lcy5wdXNoKGRpck5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBhIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgICB0aGlzLmFkZElubGluZVR5cGVDdG9yKGZpbGVEYXRhLCBkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBkaXIuaW5wdXRzLmNsYXNzUHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIG91dHB1dHM6IGRpci5vdXRwdXRzLmNsYXNzUHJvcGVydHlOYW1lcyxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQocmVmLm5vZGUpO1xuICAgIHNoaW1EYXRhLnRlbXBsYXRlcy5zZXQodGVtcGxhdGVJZCwge1xuICAgICAgdGVtcGxhdGUsXG4gICAgICBib3VuZFRhcmdldCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRjYlJlcXVpcmVzSW5saW5lID0gcmVxdWlyZXNJbmxpbmVUeXBlQ2hlY2tCbG9jayhyZWYubm9kZSk7XG5cbiAgICAvLyBJZiBpbmxpbmluZyBpcyBub3Qgc3VwcG9ydGVkLCBidXQgaXMgcmVxdWlyZWQgZm9yIGVpdGhlciB0aGUgVENCIG9yIG9uZSBvZiBpdHMgZGlyZWN0aXZlXG4gICAgLy8gZGVwZW5kZW5jaWVzLCB0aGVuIGV4aXQgaGVyZSB3aXRoIGFuIGVycm9yLlxuICAgIGlmICh0aGlzLmlubGluaW5nID09PSBJbmxpbmluZ01vZGUuRXJyb3IgJiYgKHRjYlJlcXVpcmVzSW5saW5lIHx8IG1pc3NpbmdJbmxpbmVzLmxlbmd0aCA+IDApKSB7XG4gICAgICAvLyBUaGlzIHRlbXBsYXRlIGNhbm5vdCBiZSBzdXBwb3J0ZWQgYmVjYXVzZSB0aGUgdW5kZXJseWluZyBzdHJhdGVneSBkb2VzIG5vdCBzdXBwb3J0IGlubGluaW5nXG4gICAgICAvLyBhbmQgaW5saW5pbmcgd291bGQgYmUgcmVxdWlyZWQuXG5cbiAgICAgIC8vIFJlY29yZCBkaWFnbm9zdGljcyB0byBpbmRpY2F0ZSB0aGUgaXNzdWVzIHdpdGggdGhpcyB0ZW1wbGF0ZS5cbiAgICAgIGlmICh0Y2JSZXF1aXJlc0lubGluZSkge1xuICAgICAgICBzaGltRGF0YS5vb2JSZWNvcmRlci5yZXF1aXJlc0lubGluZVRjYih0ZW1wbGF0ZUlkLCByZWYubm9kZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaXNzaW5nSW5saW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyLnJlcXVpcmVzSW5saW5lVHlwZUNvbnN0cnVjdG9ycyh0ZW1wbGF0ZUlkLCByZWYubm9kZSwgbWlzc2luZ0lubGluZXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVja2luZyB0aGlzIHRlbXBsYXRlIHdvdWxkIGJlIHVuc3VwcG9ydGVkLCBzbyBkb24ndCB0cnkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHtcbiAgICAgIGlkOiBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2UocmVmLm5vZGUsIHNvdXJjZU1hcHBpbmcsIGZpbGUpLFxuICAgICAgYm91bmRUYXJnZXQsXG4gICAgICBwaXBlcyxcbiAgICAgIHNjaGVtYXMsXG4gICAgfTtcbiAgICBpZiAodGNiUmVxdWlyZXNJbmxpbmUpIHtcbiAgICAgIC8vIFRoaXMgY2xhc3MgZGlkbid0IG1lZXQgdGhlIHJlcXVpcmVtZW50cyBmb3IgZXh0ZXJuYWwgdHlwZSBjaGVja2luZywgc28gZ2VuZXJhdGUgYW4gaW5saW5lXG4gICAgICAvLyBUQ0IgZm9yIHRoZSBjbGFzcy5cbiAgICAgIHRoaXMuYWRkSW5saW5lVHlwZUNoZWNrQmxvY2soZmlsZURhdGEsIHNoaW1EYXRhLCByZWYsIG1ldGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgY2xhc3MgY2FuIGJlIHR5cGUtY2hlY2tlZCBleHRlcm5hbGx5IGFzIG5vcm1hbC5cbiAgICAgIHNoaW1EYXRhLmZpbGUuYWRkVHlwZUNoZWNrQmxvY2socmVmLCBtZXRhLCBzaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLCBzaGltRGF0YS5vb2JSZWNvcmRlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHR5cGUgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBgbm9kZWAgd2l0aCB0aGUgZ2l2ZW4gYGN0b3JNZXRhZGF0YWAuXG4gICAqL1xuICBhZGRJbmxpbmVUeXBlQ3RvcihcbiAgICAgIGZpbGVEYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEsIHNmOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sIGN0b3JNZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudHlwZUN0b3JQZW5kaW5nLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy50eXBlQ3RvclBlbmRpbmcuYWRkKHJlZi5ub2RlKTtcblxuICAgIC8vIExhemlseSBjb25zdHJ1Y3QgdGhlIG9wZXJhdGlvbiBtYXAuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHRoaXMub3BNYXAuc2V0KHNmLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSE7XG5cbiAgICAvLyBQdXNoIGEgYFR5cGVDdG9yT3BgIGludG8gdGhlIG9wZXJhdGlvbiBxdWV1ZSBmb3IgdGhlIHNvdXJjZSBmaWxlLlxuICAgIG9wcy5wdXNoKG5ldyBUeXBlQ3Rvck9wKHJlZiwgY3Rvck1ldGEpKTtcbiAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBgdHMuU291cmNlRmlsZWAgaW50byBhIHZlcnNpb24gdGhhdCBpbmNsdWRlcyB0eXBlIGNoZWNraW5nIGNvZGUuXG4gICAqXG4gICAqIElmIHRoaXMgcGFydGljdWxhciBgdHMuU291cmNlRmlsZWAgcmVxdWlyZXMgY2hhbmdlcywgdGhlIHRleHQgcmVwcmVzZW50aW5nIGl0cyBuZXcgY29udGVudHNcbiAgICogd2lsbCBiZSByZXR1cm5lZC4gT3RoZXJ3aXNlLCBhIGBudWxsYCByZXR1cm4gaW5kaWNhdGVzIG5vIGNoYW5nZXMgd2VyZSBuZWNlc3NhcnkuXG4gICAqL1xuICB0cmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmd8bnVsbCB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIG9wZXJhdGlvbnMgcGVuZGluZyBmb3IgdGhpcyBwYXJ0aWN1bGFyIGZpbGUsIHJldHVybiBgbnVsbGAgdG8gaW5kaWNhdGUgbm9cbiAgICAvLyBjaGFuZ2VzLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJbXBvcnRzIG1heSBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBmaWxlIHRvIHN1cHBvcnQgdHlwZS1jaGVja2luZyBvZiBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgd2l0aGluIGl0LlxuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihuZXcgTm9vcEltcG9ydFJld3JpdGVyKCksICdfaScpO1xuXG4gICAgLy8gRWFjaCBPcCBoYXMgYSBzcGxpdFBvaW50IGluZGV4IGludG8gdGhlIHRleHQgd2hlcmUgaXQgbmVlZHMgdG8gYmUgaW5zZXJ0ZWQuIFNwbGl0IHRoZVxuICAgIC8vIG9yaWdpbmFsIHNvdXJjZSB0ZXh0IGludG8gY2h1bmtzIGF0IHRoZXNlIHNwbGl0IHBvaW50cywgd2hlcmUgY29kZSB3aWxsIGJlIGluc2VydGVkIGJldHdlZW5cbiAgICAvLyB0aGUgY2h1bmtzLlxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSEuc29ydChvcmRlck9wcyk7XG4gICAgY29uc3QgdGV4dFBhcnRzID0gc3BsaXRTdHJpbmdBdFBvaW50cyhzZi50ZXh0LCBvcHMubWFwKG9wID0+IG9wLnNwbGl0UG9pbnQpKTtcblxuICAgIC8vIFVzZSBhIGB0cy5QcmludGVyYCB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZS5cbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcih7b21pdFRyYWlsaW5nU2VtaWNvbG9uOiB0cnVlfSk7XG5cbiAgICAvLyBCZWdpbiB3aXRoIHRoZSBpbnRpYWwgc2VjdGlvbiBvZiB0aGUgY29kZSB0ZXh0LlxuICAgIGxldCBjb2RlID0gdGV4dFBhcnRzWzBdO1xuXG4gICAgLy8gUHJvY2VzcyBlYWNoIG9wZXJhdGlvbiBhbmQgdXNlIHRoZSBwcmludGVyIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlIGZvciBpdCwgaW5zZXJ0aW5nIGl0IGludG9cbiAgICAvLyB0aGUgc291cmNlIGNvZGUgaW4gYmV0d2VlbiB0aGUgb3JpZ2luYWwgY2h1bmtzLlxuICAgIG9wcy5mb3JFYWNoKChvcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gb3AuZXhlY3V0ZShpbXBvcnRNYW5hZ2VyLCBzZiwgdGhpcy5yZWZFbWl0dGVyLCBwcmludGVyKTtcbiAgICAgIGNvZGUgKz0gJ1xcblxcbicgKyB0ZXh0ICsgdGV4dFBhcnRzW2lkeCArIDFdO1xuICAgIH0pO1xuXG4gICAgLy8gV3JpdGUgb3V0IHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaWxlLlxuICAgIGxldCBpbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNmLmZpbGVOYW1lKVxuICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllcn0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO2ApXG4gICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIGNvZGUgPSBpbXBvcnRzICsgJ1xcbicgKyBjb2RlO1xuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICBmaW5hbGl6ZSgpOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4ge1xuICAgIC8vIEZpcnN0LCBidWlsZCB0aGUgbWFwIG9mIHVwZGF0ZXMgdG8gc291cmNlIGZpbGVzLlxuICAgIGNvbnN0IHVwZGF0ZXMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBvcmlnaW5hbFNmIG9mIHRoaXMub3BNYXAua2V5cygpKSB7XG4gICAgICBjb25zdCBuZXdUZXh0ID0gdGhpcy50cmFuc2Zvcm0ob3JpZ2luYWxTZik7XG4gICAgICBpZiAobmV3VGV4dCAhPT0gbnVsbCkge1xuICAgICAgICB1cGRhdGVzLnNldChhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG9yaWdpbmFsU2YpLCBuZXdUZXh0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGVuIGdvIHRocm91Z2ggZWFjaCBpbnB1dCBmaWxlIHRoYXQgaGFzIHBlbmRpbmcgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbnMuXG4gICAgZm9yIChjb25zdCBbc2ZQYXRoLCBwZW5kaW5nRmlsZURhdGFdIG9mIHRoaXMuZmlsZU1hcCkge1xuICAgICAgLy8gRm9yIGVhY2ggaW5wdXQgZmlsZSwgY29uc2lkZXIgZ2VuZXJhdGlvbiBvcGVyYXRpb25zIGZvciBlYWNoIG9mIGl0cyBzaGltcy5cbiAgICAgIGZvciAoY29uc3QgcGVuZGluZ1NoaW1EYXRhIG9mIHBlbmRpbmdGaWxlRGF0YS5zaGltRGF0YS52YWx1ZXMoKSkge1xuICAgICAgICB0aGlzLmhvc3QucmVjb3JkU2hpbURhdGEoc2ZQYXRoLCB7XG4gICAgICAgICAgZ2VuZXNpc0RpYWdub3N0aWNzOiBbXG4gICAgICAgICAgICAuLi5wZW5kaW5nU2hpbURhdGEuZG9tU2NoZW1hQ2hlY2tlci5kaWFnbm9zdGljcyxcbiAgICAgICAgICAgIC4uLnBlbmRpbmdTaGltRGF0YS5vb2JSZWNvcmRlci5kaWFnbm9zdGljcyxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGhhc0lubGluZXM6IHBlbmRpbmdGaWxlRGF0YS5oYXNJbmxpbmVzLFxuICAgICAgICAgIHBhdGg6IHBlbmRpbmdTaGltRGF0YS5maWxlLmZpbGVOYW1lLFxuICAgICAgICAgIHRlbXBsYXRlczogcGVuZGluZ1NoaW1EYXRhLnRlbXBsYXRlcyxcbiAgICAgICAgfSk7XG4gICAgICAgIHVwZGF0ZXMuc2V0KHBlbmRpbmdTaGltRGF0YS5maWxlLmZpbGVOYW1lLCBwZW5kaW5nU2hpbURhdGEuZmlsZS5yZW5kZXIoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZXM7XG4gIH1cblxuICBwcml2YXRlIGFkZElubGluZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2hpbURhdGE6IFBlbmRpbmdTaGltRGF0YSxcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuICAgIG9wcy5wdXNoKG5ldyBUY2JPcChcbiAgICAgICAgcmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZsZWN0b3IsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsXG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyKSk7XG4gICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIHBlbmRpbmdTaGltRm9yQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQZW5kaW5nU2hpbURhdGEge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLmNvbXBvbmVudE1hcHBpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChub2RlKTtcbiAgICBpZiAoIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLnNldChzaGltUGF0aCwge1xuICAgICAgICBkb21TY2hlbWFDaGVja2VyOiBuZXcgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyKGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIpLFxuICAgICAgICBvb2JSZWNvcmRlcjogbmV3IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGwoZmlsZURhdGEuc291cmNlTWFuYWdlciksXG4gICAgICAgIGZpbGU6IG5ldyBUeXBlQ2hlY2tGaWxlKFxuICAgICAgICAgICAgc2hpbVBhdGgsIHRoaXMuY29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNvbXBpbGVySG9zdCksXG4gICAgICAgIHRlbXBsYXRlczogbmV3IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZURhdGE+KCksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVEYXRhLnNoaW1EYXRhLmdldChzaGltUGF0aCkhO1xuICB9XG5cbiAgcHJpdmF0ZSBkYXRhRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSk6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBpZiAoIXRoaXMuZmlsZU1hcC5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZGF0YTogUGVuZGluZ0ZpbGVUeXBlQ2hlY2tpbmdEYXRhID0ge1xuICAgICAgICBoYXNJbmxpbmVzOiBmYWxzZSxcbiAgICAgICAgc291cmNlTWFuYWdlcjogdGhpcy5ob3N0LmdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoKSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH07XG4gICAgICB0aGlzLmZpbGVNYXAuc2V0KHNmUGF0aCwgZGF0YSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmlsZU1hcC5nZXQoc2ZQYXRoKSE7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNoZWNrIGNvZGUgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKi9cbmNsYXNzIFRjYk9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICByZWFkb25seSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcikge31cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kICsgMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgZW52ID0gbmV3IEVudmlyb25tZW50KHRoaXMuY29uZmlnLCBpbSwgcmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHNmKTtcbiAgICBjb25zdCBmbk5hbWUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiXyR7dGhpcy5yZWYubm9kZS5wb3N9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=