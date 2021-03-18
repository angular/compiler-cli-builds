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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/diagnostics", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeCheckContextImpl = exports.InliningMode = void 0;
    var tslib_1 = require("tslib");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
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
         * Register a template to potentially be type-checked.
         *
         * Implements `TypeCheckContext.addTemplate`.
         */
        TypeCheckContextImpl.prototype.addTemplate = function (ref, binder, template, pipes, schemas, sourceMapping, file, parseErrors) {
            var e_1, _a;
            if (!this.host.shouldCheckComponent(ref.node)) {
                return;
            }
            var fileData = this.dataForFile(ref.node.getSourceFile());
            var shimData = this.pendingShimForComponent(ref.node);
            var templateId = fileData.sourceManager.getTemplateId(ref.node);
            var templateDiagnostics = [];
            if (parseErrors !== null) {
                templateDiagnostics.push.apply(templateDiagnostics, tslib_1.__spreadArray([], tslib_1.__read(this.getTemplateDiagnostics(parseErrors, templateId, sourceMapping))));
            }
            // Accumulate a list of any directives which could not have type constructors generated due to
            // unsupported inlining operations.
            var missingInlines = [];
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
            shimData.templates.set(templateId, {
                template: template,
                boundTarget: boundTarget,
                templateDiagnostics: templateDiagnostics,
            });
            var tcbRequiresInline = tcb_util_1.requiresInlineTypeCheckBlock(ref.node, pipes);
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
                .map(function (i) { return "import * as " + i.qualifier.text + " from '" + i.specifier + "';"; })
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
                                genesisDiagnostics: tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(pendingShimData.domSchemaChecker.diagnostics)), tslib_1.__read(pendingShimData.oobRecorder.diagnostics)),
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
        TypeCheckContextImpl.prototype.getTemplateDiagnostics = function (parseErrors, templateId, sourceMapping) {
            return parseErrors.map(function (error) {
                var span = error.span;
                if (span.start.offset === span.end.offset) {
                    // Template errors can contain zero-length spans, if the error occurs at a single point.
                    // However, TypeScript does not handle displaying a zero-length diagnostic very well, so
                    // increase the ending offset by 1 for such errors, to ensure the position is shown in the
                    // diagnostic.
                    span.end.offset++;
                }
                return diagnostics_2.makeTemplateDiagnostic(templateId, sourceMapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.TEMPLATE_PARSE_ERROR), error.msg);
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwyRUFBbUY7SUFDbkYsK0JBQWlDO0lBRWpDLDJFQUF5RTtJQUN6RSxtRUFBOEU7SUFFOUUseUVBQStDO0lBRS9DLHFGQUEwRTtJQUUxRSx5RUFBaUU7SUFDakUseUZBQTBDO0lBQzFDLHlFQUFtRjtJQUVuRixtRkFBd0Q7SUFDeEQsbUdBQTBEO0lBQzFELGlHQUFnRDtJQUNoRCxtR0FBa0Y7SUE4SGxGOztPQUVHO0lBQ0gsSUFBWSxZQVVYO0lBVkQsV0FBWSxZQUFZO1FBQ3RCOztXQUVHO1FBQ0gseURBQVMsQ0FBQTtRQUVUOztXQUVHO1FBQ0gsaURBQUssQ0FBQTtJQUNQLENBQUMsRUFWVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQVV2QjtJQUVEOzs7OztPQUtHO0lBQ0g7UUFHRSw4QkFDWSxNQUEwQixFQUMxQixZQUEyRCxFQUMzRCx3QkFBd0QsRUFDeEQsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxJQUFzQixFQUFVLFFBQXNCO1lBSnRELFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzFCLGlCQUFZLEdBQVosWUFBWSxDQUErQztZQUMzRCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQWdDO1lBQ3hELGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsU0FBSSxHQUFKLElBQUksQ0FBa0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFjO1lBUDFELFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBK0MsQ0FBQztZQVN6RTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFF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RUFBRSxHQUFPO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsbUJBQW1CLENBQUMsR0FBVyxFQUFFLE1BQWdCO1FBQ3hELElBQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUM1QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN0QyxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssR0FBRyxLQUFLLENBQUM7U0FDZjtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtCb3VuZFRhcmdldCwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VGaWxlLCBSM1RhcmdldEJpbmRlciwgU2NoZW1hTWV0YWRhdGEsIFRlbXBsYXRlUGFyc2VFcnJvciwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5pbXBvcnQge0NvbXBvbmVudFRvU2hpbU1hcHBpbmdTdHJhdGVneSwgVGVtcGxhdGVJZCwgVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyLCBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGx9IGZyb20gJy4vb29iJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge3JlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdGNiX3V0aWwnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuaW1wb3J0IHtUeXBlQ2hlY2tGaWxlfSBmcm9tICcuL3R5cGVfY2hlY2tfZmlsZSc7XG5pbXBvcnQge2dlbmVyYXRlSW5saW5lVHlwZUN0b3IsIHJlcXVpcmVzSW5saW5lVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2hpbVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2hpbSBmaWxlLlxuICAgKi9cbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgLyoqXG4gICAqIEFueSBgdHMuRGlhZ25vc3RpY2BzIHdoaWNoIHdlcmUgcHJvZHVjZWQgZHVyaW5nIHRoZSBnZW5lcmF0aW9uIG9mIHRoaXMgc2hpbS5cbiAgICpcbiAgICogU29tZSBkaWFnbm9zdGljcyBhcmUgcHJvZHVjZWQgZHVyaW5nIGNyZWF0aW9uIHRpbWUgYW5kIGFyZSB0cmFja2VkIGhlcmUuXG4gICAqL1xuICBnZW5lc2lzRGlhZ25vc3RpY3M6IFRlbXBsYXRlRGlhZ25vc3RpY1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGFueSBpbmxpbmUgb3BlcmF0aW9ucyBmb3IgdGhlIGlucHV0IGZpbGUgd2VyZSByZXF1aXJlZCB0byBnZW5lcmF0ZSB0aGlzIHNoaW0uXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgYFRlbXBsYXRlSWRgIHRvIGluZm9ybWF0aW9uIGNvbGxlY3RlZCBhYm91dCB0aGUgdGVtcGxhdGUgZHVyaW5nIHRoZSB0ZW1wbGF0ZVxuICAgKiB0eXBlLWNoZWNraW5nIHByb2Nlc3MuXG4gICAqL1xuICB0ZW1wbGF0ZXM6IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZURhdGE+O1xufVxuXG4vKipcbiAqIERhdGEgdHJhY2tlZCBmb3IgZWFjaCB0ZW1wbGF0ZSBwcm9jZXNzZWQgYnkgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgc3lzdGVtLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRGF0YSB7XG4gIC8qKlxuICAgKiBUZW1wbGF0ZSBub2RlcyBmb3Igd2hpY2ggdGhlIFRDQiB3YXMgZ2VuZXJhdGVkLlxuICAgKi9cbiAgdGVtcGxhdGU6IFRtcGxBc3ROb2RlW107XG5cbiAgLyoqXG4gICAqIGBCb3VuZFRhcmdldGAgd2hpY2ggd2FzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIFRDQiwgYW5kIGNvbnRhaW5zIGJpbmRpbmdzIGZvciB0aGUgYXNzb2NpYXRlZFxuICAgKiB0ZW1wbGF0ZSBub2Rlcy5cbiAgICovXG4gIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT47XG5cbiAgLyoqXG4gICAqIEVycm9ycyBmb3VuZCB3aGlsZSBwYXJzaW5nIHRoZW0gdGVtcGxhdGUsIHdoaWNoIGhhdmUgYmVlbiBjb252ZXJ0ZWQgdG8gZGlhZ25vc3RpY3MuXG4gICAqL1xuICB0ZW1wbGF0ZURpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXTtcbn1cblxuLyoqXG4gKiBEYXRhIGZvciBhbiBpbnB1dCBmaWxlIHdoaWNoIGlzIHN0aWxsIGluIHRoZSBwcm9jZXNzIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBnZW5lcmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIGFueSBpbmxpbmUgY29kZSBoYXMgYmVlbiByZXF1aXJlZCBieSB0aGUgc2hpbSB5ZXQuXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbiBmb3IgbWFwcGluZyBkaWFnbm9zdGljcyBmcm9tIGlubGluZWQgdHlwZSBjaGVjayBibG9ja3MgYmFjayB0byB0aGVcbiAgICogb3JpZ2luYWwgdGVtcGxhdGUuXG4gICAqL1xuICBzb3VyY2VNYW5hZ2VyOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBpbi1wcm9ncmVzcyBzaGltIGRhdGEgZm9yIHNoaW1zIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFBlbmRpbmdTaGltRGF0YT47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVuZGluZ1NoaW1EYXRhIHtcbiAgLyoqXG4gICAqIFJlY29yZGVyIGZvciBvdXQtb2YtYmFuZCBkaWFnbm9zdGljcyB3aGljaCBhcmUgcmFpc2VkIGR1cmluZyBnZW5lcmF0aW9uLlxuICAgKi9cbiAgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcjtcblxuICAvKipcbiAgICogVGhlIGBEb21TY2hlbWFDaGVja2VyYCBpbiB1c2UgZm9yIHRoaXMgdGVtcGxhdGUsIHdoaWNoIHJlY29yZHMgYW55IHNjaGVtYS1yZWxhdGVkIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgZG9tU2NoZW1hQ2hlY2tlcjogRG9tU2NoZW1hQ2hlY2tlcjtcblxuICAvKipcbiAgICogU2hpbSBmaWxlIGluIHRoZSBwcm9jZXNzIG9mIGJlaW5nIGdlbmVyYXRlZC5cbiAgICovXG4gIGZpbGU6IFR5cGVDaGVja0ZpbGU7XG5cblxuICAvKipcbiAgICogTWFwIG9mIGBUZW1wbGF0ZUlkYCB0byBpbmZvcm1hdGlvbiBjb2xsZWN0ZWQgYWJvdXQgdGhlIHRlbXBsYXRlIGFzIGl0J3MgaW5nZXN0ZWQuXG4gICAqL1xuICB0ZW1wbGF0ZXM6IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZURhdGE+O1xufVxuXG4vKipcbiAqIEFkYXB0cyB0aGUgYFR5cGVDaGVja0NvbnRleHRJbXBsYCB0byB0aGUgbGFyZ2VyIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgc3lzdGVtLlxuICpcbiAqIFRocm91Z2ggdGhpcyBpbnRlcmZhY2UsIGEgc2luZ2xlIGBUeXBlQ2hlY2tDb250ZXh0SW1wbGAgKHdoaWNoIHJlcHJlc2VudHMgb25lIFwicGFzc1wiIG9mIHRlbXBsYXRlXG4gKiB0eXBlLWNoZWNraW5nKSByZXF1ZXN0cyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgbGFyZ2VyIHN0YXRlIG9mIHR5cGUtY2hlY2tpbmcsIGFzIHdlbGwgYXMgcmVwb3J0c1xuICogYmFjayBpdHMgcmVzdWx0cyBvbmNlIGZpbmFsaXplZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBgVGVtcGxhdGVTb3VyY2VNYW5hZ2VyYCByZXNwb25zaWJsZSBmb3IgY29tcG9uZW50cyBpbiB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoLlxuICAgKi9cbiAgZ2V0U291cmNlTWFuYWdlcihzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGEgcGFydGljdWxhciBjb21wb25lbnQgY2xhc3Mgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHRoZSBjdXJyZW50IHR5cGUtY2hlY2tpbmcgcGFzcy5cbiAgICpcbiAgICogTm90IGFsbCBjb21wb25lbnRzIG9mZmVyZWQgdG8gdGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBmb3IgY2hlY2tpbmcgbWF5IHJlcXVpcmUgcHJvY2Vzc2luZy4gRm9yXG4gICAqIGV4YW1wbGUsIHRoZSBjb21wb25lbnQgbWF5IGhhdmUgcmVzdWx0cyBhbHJlYWR5IGF2YWlsYWJsZSBmcm9tIGEgcHJpb3IgcGFzcyBvciBmcm9tIGEgcHJldmlvdXNcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBSZXBvcnQgZGF0YSBmcm9tIGEgc2hpbSBnZW5lcmF0ZWQgZnJvbSB0aGUgZ2l2ZW4gaW5wdXQgZmlsZSBwYXRoLlxuICAgKi9cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgdGhhdCBhbGwgb2YgdGhlIGNvbXBvbmVudHMgd2l0aGluIHRoZSBnaXZlbiBpbnB1dCBmaWxlIHBhdGggaGFkIGNvZGUgZ2VuZXJhdGVkIC0gdGhhdFxuICAgKiBpcywgY292ZXJhZ2UgZm9yIHRoZSBmaWxlIGNhbiBiZSBjb25zaWRlcmVkIGNvbXBsZXRlLlxuICAgKi9cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG59XG5cbi8qKlxuICogSG93IGEgdHlwZS1jaGVja2luZyBjb250ZXh0IHNob3VsZCBoYW5kbGUgb3BlcmF0aW9ucyB3aGljaCB3b3VsZCByZXF1aXJlIGlubGluaW5nLlxuICovXG5leHBvcnQgZW51bSBJbmxpbmluZ01vZGUge1xuICAvKipcbiAgICogVXNlIGlubGluaW5nIG9wZXJhdGlvbnMgd2hlbiByZXF1aXJlZC5cbiAgICovXG4gIElubGluZU9wcyxcblxuICAvKipcbiAgICogUHJvZHVjZSBkaWFnbm9zdGljcyBpZiBhbiBvcGVyYXRpb24gd291bGQgcmVxdWlyZSBpbmxpbmluZy5cbiAgICovXG4gIEVycm9yLFxufVxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tDb250ZXh0SW1wbCBpbXBsZW1lbnRzIFR5cGVDaGVja0NvbnRleHQge1xuICBwcml2YXRlIGZpbGVNYXAgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGE+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcHJpdmF0ZSBjb21waWxlckhvc3Q6IFBpY2s8dHMuQ29tcGlsZXJIb3N0LCAnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICAgIHByaXZhdGUgY29tcG9uZW50TWFwcGluZ1N0cmF0ZWd5OiBDb21wb25lbnRUb1NoaW1NYXBwaW5nU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaG9zdDogVHlwZUNoZWNraW5nSG9zdCwgcHJpdmF0ZSBpbmxpbmluZzogSW5saW5pbmdNb2RlKSB7fVxuXG4gIC8qKlxuICAgKiBBIGBNYXBgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgdGhhdCB0aGUgY29udGV4dCBoYXMgc2VlbiB0byB0aGUgb3BlcmF0aW9ucyAoYWRkaXRpb25zIG9mIG1ldGhvZHNcbiAgICogb3IgdHlwZS1jaGVjayBibG9ja3MpIHRoYXQgbmVlZCB0byBiZSBldmVudHVhbGx5IHBlcmZvcm1lZCBvbiB0aGF0IGZpbGUuXG4gICAqL1xuICBwcml2YXRlIG9wTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBPcFtdPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hlbiBhbiBhIHBhcnRpY3VsYXIgY2xhc3MgaGFzIGEgcGVuZGluZyB0eXBlIGNvbnN0cnVjdG9yIHBhdGNoaW5nIG9wZXJhdGlvbiBhbHJlYWR5XG4gICAqIHF1ZXVlZC5cbiAgICovXG4gIHByaXZhdGUgdHlwZUN0b3JQZW5kaW5nID0gbmV3IFNldDx0cy5DbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHRlbXBsYXRlIHRvIHBvdGVudGlhbGx5IGJlIHR5cGUtY2hlY2tlZC5cbiAgICpcbiAgICogSW1wbGVtZW50cyBgVHlwZUNoZWNrQ29udGV4dC5hZGRUZW1wbGF0ZWAuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgYmluZGVyOiBSM1RhcmdldEJpbmRlcjxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdLFxuICAgICAgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdLCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIGZpbGU6IFBhcnNlU291cmNlRmlsZSxcbiAgICAgIHBhcnNlRXJyb3JzOiBQYXJzZUVycm9yW118bnVsbCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5ob3N0LnNob3VsZENoZWNrQ29tcG9uZW50KHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5kYXRhRm9yRmlsZShyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1EYXRhID0gdGhpcy5wZW5kaW5nU2hpbUZvckNvbXBvbmVudChyZWYubm9kZSk7XG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChyZWYubm9kZSk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZURpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgaWYgKHBhcnNlRXJyb3JzICE9PSBudWxsKSB7XG4gICAgICB0ZW1wbGF0ZURpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKHBhcnNlRXJyb3JzLCB0ZW1wbGF0ZUlkLCBzb3VyY2VNYXBwaW5nKSk7XG4gICAgfVxuXG4gICAgLy8gQWNjdW11bGF0ZSBhIGxpc3Qgb2YgYW55IGRpcmVjdGl2ZXMgd2hpY2ggY291bGQgbm90IGhhdmUgdHlwZSBjb25zdHJ1Y3RvcnMgZ2VuZXJhdGVkIGR1ZSB0b1xuICAgIC8vIHVuc3VwcG9ydGVkIGlubGluaW5nIG9wZXJhdGlvbnMuXG4gICAgbGV0IG1pc3NpbmdJbmxpbmVzOiBDbGFzc0RlY2xhcmF0aW9uW10gPSBbXTtcblxuICAgIGNvbnN0IGJvdW5kVGFyZ2V0ID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlfSk7XG5cbiAgICAvLyBHZXQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIGFuZCByZWNvcmQgdHlwZSBjb25zdHJ1Y3RvcnMgZm9yIGFsbCBvZiB0aGVtLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIGJvdW5kVGFyZ2V0LmdldFVzZWREaXJlY3RpdmVzKCkpIHtcbiAgICAgIGNvbnN0IGRpclJlZiA9IGRpci5yZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+O1xuICAgICAgY29uc3QgZGlyTm9kZSA9IGRpclJlZi5ub2RlO1xuXG4gICAgICBpZiAoZGlyLmlzR2VuZXJpYyAmJiByZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpck5vZGUsIHRoaXMucmVmbGVjdG9yKSkge1xuICAgICAgICBpZiAodGhpcy5pbmxpbmluZyA9PT0gSW5saW5pbmdNb2RlLkVycm9yKSB7XG4gICAgICAgICAgbWlzc2luZ0lubGluZXMucHVzaChkaXJOb2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgYSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiBmb3IgdGhlIGRpcmVjdGl2ZS5cbiAgICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ3RvcihmaWxlRGF0YSwgZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCksIGRpclJlZiwge1xuICAgICAgICAgIGZuTmFtZTogJ25nVHlwZUN0b3InLFxuICAgICAgICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBzaG91bGQgaGF2ZSBhIGJvZHkgaWYgdGhlIGRpcmVjdGl2ZSBjb21lcyBmcm9tIGEgLnRzIGZpbGUsIGJ1dCBub3QgaWZcbiAgICAgICAgICAvLyBpdCBjb21lcyBmcm9tIGEgLmQudHMgZmlsZS4gLmQudHMgZGVjbGFyYXRpb25zIGRvbid0IGhhdmUgYm9kaWVzLlxuICAgICAgICAgIGJvZHk6ICFkaXJOb2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSxcbiAgICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgIGlucHV0czogZGlyLmlucHV0cy5jbGFzc1Byb3BlcnR5TmFtZXMsXG4gICAgICAgICAgICBvdXRwdXRzOiBkaXIub3V0cHV0cy5jbGFzc1Byb3BlcnR5TmFtZXMsXG4gICAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHN1cHBvcnQgcXVlcmllc1xuICAgICAgICAgICAgcXVlcmllczogZGlyLnF1ZXJpZXMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2VyY2VkSW5wdXRGaWVsZHM6IGRpci5jb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNoaW1EYXRhLnRlbXBsYXRlcy5zZXQodGVtcGxhdGVJZCwge1xuICAgICAgdGVtcGxhdGUsXG4gICAgICBib3VuZFRhcmdldCxcbiAgICAgIHRlbXBsYXRlRGlhZ25vc3RpY3MsXG4gICAgfSk7XG5cbiAgICBjb25zdCB0Y2JSZXF1aXJlc0lubGluZSA9IHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2socmVmLm5vZGUsIHBpcGVzKTtcblxuICAgIC8vIElmIGlubGluaW5nIGlzIG5vdCBzdXBwb3J0ZWQsIGJ1dCBpcyByZXF1aXJlZCBmb3IgZWl0aGVyIHRoZSBUQ0Igb3Igb25lIG9mIGl0cyBkaXJlY3RpdmVcbiAgICAvLyBkZXBlbmRlbmNpZXMsIHRoZW4gZXhpdCBoZXJlIHdpdGggYW4gZXJyb3IuXG4gICAgaWYgKHRoaXMuaW5saW5pbmcgPT09IElubGluaW5nTW9kZS5FcnJvciAmJiAodGNiUmVxdWlyZXNJbmxpbmUgfHwgbWlzc2luZ0lubGluZXMubGVuZ3RoID4gMCkpIHtcbiAgICAgIC8vIFRoaXMgdGVtcGxhdGUgY2Fubm90IGJlIHN1cHBvcnRlZCBiZWNhdXNlIHRoZSB1bmRlcmx5aW5nIHN0cmF0ZWd5IGRvZXMgbm90IHN1cHBvcnQgaW5saW5pbmdcbiAgICAgIC8vIGFuZCBpbmxpbmluZyB3b3VsZCBiZSByZXF1aXJlZC5cblxuICAgICAgLy8gUmVjb3JkIGRpYWdub3N0aWNzIHRvIGluZGljYXRlIHRoZSBpc3N1ZXMgd2l0aCB0aGlzIHRlbXBsYXRlLlxuICAgICAgaWYgKHRjYlJlcXVpcmVzSW5saW5lKSB7XG4gICAgICAgIHNoaW1EYXRhLm9vYlJlY29yZGVyLnJlcXVpcmVzSW5saW5lVGNiKHRlbXBsYXRlSWQsIHJlZi5ub2RlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1pc3NpbmdJbmxpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgc2hpbURhdGEub29iUmVjb3JkZXIucmVxdWlyZXNJbmxpbmVUeXBlQ29uc3RydWN0b3JzKHRlbXBsYXRlSWQsIHJlZi5ub2RlLCBtaXNzaW5nSW5saW5lcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNraW5nIHRoaXMgdGVtcGxhdGUgd291bGQgYmUgdW5zdXBwb3J0ZWQsIHNvIGRvbid0IHRyeS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0ge1xuICAgICAgaWQ6IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuY2FwdHVyZVNvdXJjZShyZWYubm9kZSwgc291cmNlTWFwcGluZywgZmlsZSksXG4gICAgICBib3VuZFRhcmdldCxcbiAgICAgIHBpcGVzLFxuICAgICAgc2NoZW1hcyxcbiAgICB9O1xuICAgIGlmICh0Y2JSZXF1aXJlc0lubGluZSkge1xuICAgICAgLy8gVGhpcyBjbGFzcyBkaWRuJ3QgbWVldCB0aGUgcmVxdWlyZW1lbnRzIGZvciBleHRlcm5hbCB0eXBlIGNoZWNraW5nLCBzbyBnZW5lcmF0ZSBhbiBpbmxpbmVcbiAgICAgIC8vIFRDQiBmb3IgdGhlIGNsYXNzLlxuICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhmaWxlRGF0YSwgc2hpbURhdGEsIHJlZiwgbWV0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBjbGFzcyBjYW4gYmUgdHlwZS1jaGVja2VkIGV4dGVybmFsbHkgYXMgbm9ybWFsLlxuICAgICAgc2hpbURhdGEuZmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhyZWYsIG1ldGEsIHNoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIsIHNoaW1EYXRhLm9vYlJlY29yZGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkIGEgdHlwZSBjb25zdHJ1Y3RvciBmb3IgdGhlIGdpdmVuIGBub2RlYCB3aXRoIHRoZSBnaXZlbiBgY3Rvck1ldGFkYXRhYC5cbiAgICovXG4gIGFkZElubGluZVR5cGVDdG9yKFxuICAgICAgZmlsZURhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2Y6IHRzLlNvdXJjZUZpbGUsXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PiwgY3Rvck1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ3RvclBlbmRpbmcuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnR5cGVDdG9yUGVuZGluZy5hZGQocmVmLm5vZGUpO1xuXG4gICAgLy8gTGF6aWx5IGNvbnN0cnVjdCB0aGUgb3BlcmF0aW9uIG1hcC5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpITtcblxuICAgIC8vIFB1c2ggYSBgVHlwZUN0b3JPcGAgaW50byB0aGUgb3BlcmF0aW9uIHF1ZXVlIGZvciB0aGUgc291cmNlIGZpbGUuXG4gICAgb3BzLnB1c2gobmV3IFR5cGVDdG9yT3AocmVmLCBjdG9yTWV0YSkpO1xuICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSBhIGB0cy5Tb3VyY2VGaWxlYCBpbnRvIGEgdmVyc2lvbiB0aGF0IGluY2x1ZGVzIHR5cGUgY2hlY2tpbmcgY29kZS5cbiAgICpcbiAgICogSWYgdGhpcyBwYXJ0aWN1bGFyIGB0cy5Tb3VyY2VGaWxlYCByZXF1aXJlcyBjaGFuZ2VzLCB0aGUgdGV4dCByZXByZXNlbnRpbmcgaXRzIG5ldyBjb250ZW50c1xuICAgKiB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGEgYG51bGxgIHJldHVybiBpbmRpY2F0ZXMgbm8gY2hhbmdlcyB3ZXJlIG5lY2Vzc2FyeS5cbiAgICovXG4gIHRyYW5zZm9ybShzZjogdHMuU291cmNlRmlsZSk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gb3BlcmF0aW9ucyBwZW5kaW5nIGZvciB0aGlzIHBhcnRpY3VsYXIgZmlsZSwgcmV0dXJuIGBudWxsYCB0byBpbmRpY2F0ZSBub1xuICAgIC8vIGNoYW5nZXMuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpIS5zb3J0KG9yZGVyT3BzKTtcbiAgICBjb25zdCB0ZXh0UGFydHMgPSBzcGxpdFN0cmluZ0F0UG9pbnRzKHNmLnRleHQsIG9wcy5tYXAob3AgPT4gb3Auc3BsaXRQb2ludCkpO1xuXG4gICAgLy8gVXNlIGEgYHRzLlByaW50ZXJgIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtvbWl0VHJhaWxpbmdTZW1pY29sb246IHRydWV9KTtcblxuICAgIC8vIEJlZ2luIHdpdGggdGhlIGludGlhbCBzZWN0aW9uIG9mIHRoZSBjb2RlIHRleHQuXG4gICAgbGV0IGNvZGUgPSB0ZXh0UGFydHNbMF07XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggb3BlcmF0aW9uIGFuZCB1c2UgdGhlIHByaW50ZXIgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUgZm9yIGl0LCBpbnNlcnRpbmcgaXQgaW50b1xuICAgIC8vIHRoZSBzb3VyY2UgY29kZSBpbiBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjaHVua3MuXG4gICAgb3BzLmZvckVhY2goKG9wLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBvcC5leGVjdXRlKGltcG9ydE1hbmFnZXIsIHNmLCB0aGlzLnJlZkVtaXR0ZXIsIHByaW50ZXIpO1xuICAgICAgY29kZSArPSAnXFxuXFxuJyArIHRleHQgKyB0ZXh0UGFydHNbaWR4ICsgMV07XG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBvdXQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGUuXG4gICAgbGV0IGltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyLnRleHR9IGZyb20gJyR7aS5zcGVjaWZpZXJ9JztgKVxuICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICBjb2RlID0gaW1wb3J0cyArICdcXG4nICsgY29kZTtcblxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgZmluYWxpemUoKTogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+IHtcbiAgICAvLyBGaXJzdCwgYnVpbGQgdGhlIG1hcCBvZiB1cGRhdGVzIHRvIHNvdXJjZSBmaWxlcy5cbiAgICBjb25zdCB1cGRhdGVzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3Qgb3JpZ2luYWxTZiBvZiB0aGlzLm9wTWFwLmtleXMoKSkge1xuICAgICAgY29uc3QgbmV3VGV4dCA9IHRoaXMudHJhbnNmb3JtKG9yaWdpbmFsU2YpO1xuICAgICAgaWYgKG5ld1RleHQgIT09IG51bGwpIHtcbiAgICAgICAgdXBkYXRlcy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShvcmlnaW5hbFNmKSwgbmV3VGV4dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlbiBnbyB0aHJvdWdoIGVhY2ggaW5wdXQgZmlsZSB0aGF0IGhhcyBwZW5kaW5nIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb25zLlxuICAgIGZvciAoY29uc3QgW3NmUGF0aCwgcGVuZGluZ0ZpbGVEYXRhXSBvZiB0aGlzLmZpbGVNYXApIHtcbiAgICAgIC8vIEZvciBlYWNoIGlucHV0IGZpbGUsIGNvbnNpZGVyIGdlbmVyYXRpb24gb3BlcmF0aW9ucyBmb3IgZWFjaCBvZiBpdHMgc2hpbXMuXG4gICAgICBmb3IgKGNvbnN0IHBlbmRpbmdTaGltRGF0YSBvZiBwZW5kaW5nRmlsZURhdGEuc2hpbURhdGEudmFsdWVzKCkpIHtcbiAgICAgICAgdGhpcy5ob3N0LnJlY29yZFNoaW1EYXRhKHNmUGF0aCwge1xuICAgICAgICAgIGdlbmVzaXNEaWFnbm9zdGljczogW1xuICAgICAgICAgICAgLi4ucGVuZGluZ1NoaW1EYXRhLmRvbVNjaGVtYUNoZWNrZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgICAuLi5wZW5kaW5nU2hpbURhdGEub29iUmVjb3JkZXIuZGlhZ25vc3RpY3MsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBoYXNJbmxpbmVzOiBwZW5kaW5nRmlsZURhdGEuaGFzSW5saW5lcyxcbiAgICAgICAgICBwYXRoOiBwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSxcbiAgICAgICAgICB0ZW1wbGF0ZXM6IHBlbmRpbmdTaGltRGF0YS50ZW1wbGF0ZXMsXG4gICAgICAgIH0pO1xuICAgICAgICB1cGRhdGVzLnNldChwZW5kaW5nU2hpbURhdGEuZmlsZS5maWxlTmFtZSwgcGVuZGluZ1NoaW1EYXRhLmZpbGUucmVuZGVyKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1cGRhdGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhcbiAgICAgIGZpbGVEYXRhOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEsIHNoaW1EYXRhOiBQZW5kaW5nU2hpbURhdGEsXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHRjYk1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBzZiA9IHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpITtcbiAgICBvcHMucHVzaChuZXcgVGNiT3AoXG4gICAgICAgIHJlZiwgdGNiTWV0YSwgdGhpcy5jb25maWcsIHRoaXMucmVmbGVjdG9yLCBzaGltRGF0YS5kb21TY2hlbWFDaGVja2VyLFxuICAgICAgICBzaGltRGF0YS5vb2JSZWNvcmRlcikpO1xuICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBwZW5kaW5nU2hpbUZvckNvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogUGVuZGluZ1NoaW1EYXRhIHtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZGF0YUZvckZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy5jb21wb25lbnRNYXBwaW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKCFmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICBmaWxlRGF0YS5zaGltRGF0YS5zZXQoc2hpbVBhdGgsIHtcbiAgICAgICAgZG9tU2NoZW1hQ2hlY2tlcjogbmV3IFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcihmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyKSxcbiAgICAgICAgb29iUmVjb3JkZXI6IG5ldyBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsKGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIpLFxuICAgICAgICBmaWxlOiBuZXcgVHlwZUNoZWNrRmlsZShcbiAgICAgICAgICAgIHNoaW1QYXRoLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jb21waWxlckhvc3QpLFxuICAgICAgICB0ZW1wbGF0ZXM6IG5ldyBNYXA8VGVtcGxhdGVJZCwgVGVtcGxhdGVEYXRhPigpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBmaWxlRGF0YS5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcbiAgfVxuXG4gIHByaXZhdGUgZGF0YUZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiBQZW5kaW5nRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgaWYgKCF0aGlzLmZpbGVNYXAuaGFzKHNmUGF0aCkpIHtcbiAgICAgIGNvbnN0IGRhdGE6IFBlbmRpbmdGaWxlVHlwZUNoZWNraW5nRGF0YSA9IHtcbiAgICAgICAgaGFzSW5saW5lczogZmFsc2UsXG4gICAgICAgIHNvdXJjZU1hbmFnZXI6IHRoaXMuaG9zdC5nZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aCksXG4gICAgICAgIHNoaW1EYXRhOiBuZXcgTWFwKCksXG4gICAgICB9O1xuICAgICAgdGhpcy5maWxlTWFwLnNldChzZlBhdGgsIGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmZpbGVNYXAuZ2V0KHNmUGF0aCkhO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKFxuICAgICAgcGFyc2VFcnJvcnM6IFBhcnNlRXJyb3JbXSwgdGVtcGxhdGVJZDogVGVtcGxhdGVJZCxcbiAgICAgIHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZyk6IFRlbXBsYXRlRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gcGFyc2VFcnJvcnMubWFwKGVycm9yID0+IHtcbiAgICAgIGNvbnN0IHNwYW4gPSBlcnJvci5zcGFuO1xuXG4gICAgICBpZiAoc3Bhbi5zdGFydC5vZmZzZXQgPT09IHNwYW4uZW5kLm9mZnNldCkge1xuICAgICAgICAvLyBUZW1wbGF0ZSBlcnJvcnMgY2FuIGNvbnRhaW4gemVyby1sZW5ndGggc3BhbnMsIGlmIHRoZSBlcnJvciBvY2N1cnMgYXQgYSBzaW5nbGUgcG9pbnQuXG4gICAgICAgIC8vIEhvd2V2ZXIsIFR5cGVTY3JpcHQgZG9lcyBub3QgaGFuZGxlIGRpc3BsYXlpbmcgYSB6ZXJvLWxlbmd0aCBkaWFnbm9zdGljIHZlcnkgd2VsbCwgc29cbiAgICAgICAgLy8gaW5jcmVhc2UgdGhlIGVuZGluZyBvZmZzZXQgYnkgMSBmb3Igc3VjaCBlcnJvcnMsIHRvIGVuc3VyZSB0aGUgcG9zaXRpb24gaXMgc2hvd24gaW4gdGhlXG4gICAgICAgIC8vIGRpYWdub3N0aWMuXG4gICAgICAgIHNwYW4uZW5kLm9mZnNldCsrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgICB0ZW1wbGF0ZUlkLCBzb3VyY2VNYXBwaW5nLCBzcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgbmdFcnJvckNvZGUoRXJyb3JDb2RlLlRFTVBMQVRFX1BBUlNFX0VSUk9SKSwgZXJyb3IubXNnKTtcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0IG5lZWRzIHRvIGhhcHBlbiB3aXRoaW4gYSBnaXZlbiBzb3VyY2UgZmlsZS5cbiAqL1xuaW50ZXJmYWNlIE9wIHtcbiAgLyoqXG4gICAqIFRoZSBub2RlIGluIHRoZSBmaWxlIHdoaWNoIHdpbGwgaGF2ZSBjb2RlIGdlbmVyYXRlZCBmb3IgaXQuXG4gICAqL1xuICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcblxuICAvKipcbiAgICogSW5kZXggaW50byB0aGUgc291cmNlIHRleHQgd2hlcmUgdGhlIGNvZGUgZ2VuZXJhdGVkIGJ5IHRoZSBvcGVyYXRpb24gc2hvdWxkIGJlIGluc2VydGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgc3BsaXRQb2ludDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHRoZSBvcGVyYXRpb24gYW5kIHJldHVybiB0aGUgZ2VuZXJhdGVkIGNvZGUgYXMgdGV4dC5cbiAgICovXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHR5cGUgY2hlY2sgYmxvY2sgb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY2hlY2sgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGNvbXBvbmVudC5cbiAqL1xuY2xhc3MgVGNiT3AgaW1wbGVtZW50cyBPcCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICByZWFkb25seSBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCByZWFkb25seSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHJlYWRvbmx5IHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHJlYWRvbmx5IGRvbVNjaGVtYUNoZWNrZXI6IERvbVNjaGVtYUNoZWNrZXIsXG4gICAgICByZWFkb25seSBvb2JSZWNvcmRlcjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyKSB7fVxuXG4gIC8qKlxuICAgKiBUeXBlIGNoZWNrIGJsb2NrcyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGVuZCBvZiB0aGUgY29tcG9uZW50IGNsYXNzLlxuICAgKi9cbiAgZ2V0IHNwbGl0UG9pbnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5yZWYubm9kZS5lbmQgKyAxO1xuICB9XG5cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nIHtcbiAgICBjb25zdCBlbnYgPSBuZXcgRW52aXJvbm1lbnQodGhpcy5jb25maWcsIGltLCByZWZFbWl0dGVyLCB0aGlzLnJlZmxlY3Rvciwgc2YpO1xuICAgIGNvbnN0IGZuTmFtZSA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoYF90Y2JfJHt0aGlzLnJlZi5ub2RlLnBvc31gKTtcbiAgICBjb25zdCBmbiA9IGdlbmVyYXRlVHlwZUNoZWNrQmxvY2soXG4gICAgICAgIGVudiwgdGhpcy5yZWYsIGZuTmFtZSwgdGhpcy5tZXRhLCB0aGlzLmRvbVNjaGVtYUNoZWNrZXIsIHRoaXMub29iUmVjb3JkZXIpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgZm4sIHNmKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgdHlwZSBjb25zdHJ1Y3RvciBvcGVyYXRpb24gd2hpY2ggcHJvZHVjZXMgdHlwZSBjb25zdHJ1Y3RvciBjb2RlIGZvciBhIHBhcnRpY3VsYXIgZGlyZWN0aXZlLlxuICovXG5jbGFzcyBUeXBlQ3Rvck9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUN0b3JNZXRhZGF0YSkge31cblxuICAvKipcbiAgICogVHlwZSBjb25zdHJ1Y3RvciBvcGVyYXRpb25zIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgZGlyZWN0aXZlIGNsYXNzLlxuICAgKi9cbiAgZ2V0IHNwbGl0UG9pbnQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5yZWYubm9kZS5lbmQgLSAxO1xuICB9XG5cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nIHtcbiAgICBjb25zdCB0Y2IgPSBnZW5lcmF0ZUlubGluZVR5cGVDdG9yKHRoaXMucmVmLm5vZGUsIHRoaXMubWV0YSk7XG4gICAgcmV0dXJuIHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCB0Y2IsIHNmKTtcbiAgfVxufVxuXG4vKipcbiAqIENvbXBhcmUgdHdvIG9wZXJhdGlvbnMgYW5kIHJldHVybiB0aGVpciBzcGxpdCBwb2ludCBvcmRlcmluZy5cbiAqL1xuZnVuY3Rpb24gb3JkZXJPcHMob3AxOiBPcCwgb3AyOiBPcCk6IG51bWJlciB7XG4gIHJldHVybiBvcDEuc3BsaXRQb2ludCAtIG9wMi5zcGxpdFBvaW50O1xufVxuXG4vKipcbiAqIFNwbGl0IGEgc3RyaW5nIGludG8gY2h1bmtzIGF0IGFueSBudW1iZXIgb2Ygc3BsaXQgcG9pbnRzLlxuICovXG5mdW5jdGlvbiBzcGxpdFN0cmluZ0F0UG9pbnRzKHN0cjogc3RyaW5nLCBwb2ludHM6IG51bWJlcltdKTogc3RyaW5nW10ge1xuICBjb25zdCBzcGxpdHM6IHN0cmluZ1tdID0gW107XG4gIGxldCBzdGFydCA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcG9pbnQgPSBwb2ludHNbaV07XG4gICAgc3BsaXRzLnB1c2goc3RyLnN1YnN0cmluZyhzdGFydCwgcG9pbnQpKTtcbiAgICBzdGFydCA9IHBvaW50O1xuICB9XG4gIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQpKTtcbiAgcmV0dXJuIHNwbGl0cztcbn1cbiJdfQ==