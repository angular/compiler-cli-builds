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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/dom", "@angular/compiler-cli/src/ngtsc/typecheck/src/environment", "@angular/compiler-cli/src/ngtsc/typecheck/src/host", "@angular/compiler-cli/src/ngtsc/typecheck/src/oob", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var dom_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/dom");
    var environment_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/environment");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/host");
    var oob_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/oob");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    /**
     * A template type checking context for a program.
     *
     * The `TypeCheckContext` allows registration of components and their templates which need to be
     * type checked. It also allows generation of modified `ts.SourceFile`s which contain the type
     * checking code.
     */
    var TypeCheckContext = /** @class */ (function () {
        function TypeCheckContext(config, refEmitter, typeCheckFilePath) {
            this.config = config;
            this.refEmitter = refEmitter;
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
            this.sourceManager = new source_1.TcbSourceManager();
            this.domSchemaChecker = new dom_1.RegistryDomSchemaChecker(this.sourceManager);
            this.oobRecorder = new oob_1.OutOfBandDiagnosticRecorderImpl(this.sourceManager);
            this.typeCheckFile = new type_check_file_1.TypeCheckFile(typeCheckFilePath, this.config, this.refEmitter);
        }
        /**
         * Record a template for the given component `node`, with a `SelectorMatcher` for directive
         * matching.
         *
         * @param node class of the node being recorded.
         * @param template AST nodes of the template being recorded.
         * @param matcher `SelectorMatcher` which tracks directives that are in scope for this template.
         */
        TypeCheckContext.prototype.addTemplate = function (ref, boundTarget, pipes, schemas, sourceMapping, file) {
            var e_1, _a;
            var id = this.sourceManager.captureSource(sourceMapping, file);
            try {
                // Get all of the directives used in the template and record type constructors for all of them.
                for (var _b = tslib_1.__values(boundTarget.getUsedDirectives()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var dir = _c.value;
                    var dirRef = dir.ref;
                    var dirNode = dirRef.node;
                    if (type_constructor_1.requiresInlineTypeCtor(dirNode)) {
                        // Add a type constructor operation for the directive.
                        this.addInlineTypeCtor(dirNode.getSourceFile(), dirRef, {
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
            var tcbMetadata = { id: id, boundTarget: boundTarget, pipes: pipes, schemas: schemas };
            if (type_check_block_1.requiresInlineTypeCheckBlock(ref.node)) {
                // This class didn't meet the requirements for external type checking, so generate an inline
                // TCB for the class.
                this.addInlineTypeCheckBlock(ref, tcbMetadata);
            }
            else {
                // The class can be type-checked externally as normal.
                this.typeCheckFile.addTypeCheckBlock(ref, tcbMetadata, this.domSchemaChecker, this.oobRecorder);
            }
        };
        /**
         * Record a type constructor for the given `node` with the given `ctorMetadata`.
         */
        TypeCheckContext.prototype.addInlineTypeCtor = function (sf, ref, ctorMeta) {
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
        };
        /**
         * Transform a `ts.SourceFile` into a version that includes type checking code.
         *
         * If this particular source file has no directives that require type constructors, or components
         * that require type check blocks, then it will be returned directly. Otherwise, a new
         * `ts.SourceFile` is parsed from modified text of the original. This is necessary to ensure the
         * added code has correct positional information associated with it.
         */
        TypeCheckContext.prototype.transform = function (sf) {
            var _this = this;
            // If there are no operations pending for this particular file, return it directly.
            if (!this.opMap.has(sf)) {
                return sf;
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
            // Parse the new source file and return it.
            return ts.createSourceFile(sf.fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        };
        TypeCheckContext.prototype.calculateTemplateDiagnostics = function (originalProgram, originalHost, originalOptions) {
            var e_2, _a, e_3, _b;
            var _this = this;
            var typeCheckSf = this.typeCheckFile.render();
            // First, build the map of original source files.
            var sfMap = new Map();
            var interestingFiles = [typeCheckSf];
            try {
                for (var _c = tslib_1.__values(originalProgram.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var originalSf = _d.value;
                    var sf = this.transform(originalSf);
                    sfMap.set(sf.fileName, sf);
                    if (!sf.isDeclarationFile && this.opMap.has(originalSf)) {
                        interestingFiles.push(sf);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            sfMap.set(typeCheckSf.fileName, typeCheckSf);
            var typeCheckProgram = ts.createProgram({
                host: new host_1.TypeCheckProgramHost(sfMap, originalHost),
                options: originalOptions,
                oldProgram: originalProgram,
                rootNames: originalProgram.getRootFileNames(),
            });
            var diagnostics = [];
            var collectDiagnostics = function (diags) {
                var e_4, _a;
                try {
                    for (var diags_1 = tslib_1.__values(diags), diags_1_1 = diags_1.next(); !diags_1_1.done; diags_1_1 = diags_1.next()) {
                        var diagnostic = diags_1_1.value;
                        if (diagnostics_1.shouldReportDiagnostic(diagnostic)) {
                            var translated = diagnostics_1.translateDiagnostic(diagnostic, _this.sourceManager);
                            if (translated !== null) {
                                diagnostics.push(translated);
                            }
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (diags_1_1 && !diags_1_1.done && (_a = diags_1.return)) _a.call(diags_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            };
            try {
                for (var interestingFiles_1 = tslib_1.__values(interestingFiles), interestingFiles_1_1 = interestingFiles_1.next(); !interestingFiles_1_1.done; interestingFiles_1_1 = interestingFiles_1.next()) {
                    var sf = interestingFiles_1_1.value;
                    collectDiagnostics(typeCheckProgram.getSemanticDiagnostics(sf));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (interestingFiles_1_1 && !interestingFiles_1_1.done && (_b = interestingFiles_1.return)) _b.call(interestingFiles_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            diagnostics.push.apply(diagnostics, tslib_1.__spread(this.domSchemaChecker.diagnostics));
            diagnostics.push.apply(diagnostics, tslib_1.__spread(this.oobRecorder.diagnostics));
            return {
                diagnostics: diagnostics,
                program: typeCheckProgram,
            };
        };
        TypeCheckContext.prototype.addInlineTypeCheckBlock = function (ref, tcbMeta) {
            var sf = ref.node.getSourceFile();
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            ops.push(new TcbOp(ref, tcbMeta, this.config, this.domSchemaChecker, this.oobRecorder));
        };
        return TypeCheckContext;
    }());
    exports.TypeCheckContext = TypeCheckContext;
    /**
     * A type check block operation which produces type check code for a particular component.
     */
    var TcbOp = /** @class */ (function () {
        function TcbOp(ref, meta, config, domSchemaChecker, oobRecorder) {
            this.ref = ref;
            this.meta = meta;
            this.config = config;
            this.domSchemaChecker = domSchemaChecker;
            this.oobRecorder = oobRecorder;
        }
        Object.defineProperty(TcbOp.prototype, "splitPoint", {
            /**
             * Type check blocks are inserted immediately after the end of the component class.
             */
            get: function () { return this.ref.node.end + 1; },
            enumerable: true,
            configurable: true
        });
        TcbOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var env = new environment_1.Environment(this.config, im, refEmitter, sf);
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
            get: function () { return this.ref.node.end - 1; },
            enumerable: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUdqQyxtRUFBOEU7SUFFOUUseUVBQStDO0lBRy9DLHlGQUEwRTtJQUMxRSx5RUFBaUU7SUFDakUseUZBQTBDO0lBQzFDLDJFQUE0QztJQUM1Qyx5RUFBbUY7SUFDbkYsK0VBQTBDO0lBQzFDLG1HQUF3RjtJQUN4RixpR0FBZ0Q7SUFDaEQsbUdBQWtGO0lBSWxGOzs7Ozs7T0FNRztJQUNIO1FBR0UsMEJBQ1ksTUFBMEIsRUFBVSxVQUE0QixFQUN4RSxpQkFBaUM7WUFEekIsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUs1RTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7WUFFL0M7OztlQUdHO1lBQ0ssb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztZQUVqRCxrQkFBYSxHQUFHLElBQUkseUJBQWdCLEVBQUUsQ0FBQztZQUV2QyxxQkFBZ0IsR0FBRyxJQUFJLDhCQUF3QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUVwRSxnQkFBVyxHQUFHLElBQUkscUNBQStCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBbkI1RSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksK0JBQWEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxRixDQUFDO1FBb0JEOzs7Ozs7O1dBT0c7UUFDSCxzQ0FBVyxHQUFYLFVBQ0ksR0FBcUQsRUFDckQsV0FBb0QsRUFDcEQsS0FB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QUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFmRCxJQWVDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLFFBQVEsQ0FBQyxHQUFPLEVBQUUsR0FBTztRQUNoQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxNQUFnQjtRQUN4RCxJQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6QyxLQUFLLEdBQUcsS0FBSyxDQUFDO1NBQ2Y7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBQYXJzZVNvdXJjZUZpbGUsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tpbmdDb25maWcsIFR5cGVDdG9yTWV0YWRhdGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7c2hvdWxkUmVwb3J0RGlhZ25vc3RpYywgdHJhbnNsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RvbVNjaGVtYUNoZWNrZXIsIFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcn0gZnJvbSAnLi9kb20nO1xuaW1wb3J0IHtFbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge1R5cGVDaGVja1Byb2dyYW1Ib3N0fSBmcm9tICcuL2hvc3QnO1xuaW1wb3J0IHtPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIsIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlckltcGx9IGZyb20gJy4vb29iJztcbmltcG9ydCB7VGNiU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrLCByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuaW1wb3J0IHtUeXBlQ2hlY2tGaWxlfSBmcm9tICcuL3R5cGVfY2hlY2tfZmlsZSc7XG5pbXBvcnQge2dlbmVyYXRlSW5saW5lVHlwZUN0b3IsIHJlcXVpcmVzSW5saW5lVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cblxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuIEl0IGFsc28gYWxsb3dzIGdlbmVyYXRpb24gb2YgbW9kaWZpZWQgYHRzLlNvdXJjZUZpbGVgcyB3aGljaCBjb250YWluIHRoZSB0eXBlXG4gKiBjaGVja2luZyBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrQ29udGV4dCB7XG4gIHByaXZhdGUgdHlwZUNoZWNrRmlsZTogVHlwZUNoZWNrRmlsZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHR5cGVDaGVja0ZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHRoaXMudHlwZUNoZWNrRmlsZSA9IG5ldyBUeXBlQ2hlY2tGaWxlKHR5cGVDaGVja0ZpbGVQYXRoLCB0aGlzLmNvbmZpZywgdGhpcy5yZWZFbWl0dGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGBNYXBgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgdGhhdCB0aGUgY29udGV4dCBoYXMgc2VlbiB0byB0aGUgb3BlcmF0aW9ucyAoYWRkaXRpb25zIG9mIG1ldGhvZHNcbiAgICogb3IgdHlwZS1jaGVjayBibG9ja3MpIHRoYXQgbmVlZCB0byBiZSBldmVudHVhbGx5IHBlcmZvcm1lZCBvbiB0aGF0IGZpbGUuXG4gICAqL1xuICBwcml2YXRlIG9wTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBPcFtdPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hlbiBhbiBhIHBhcnRpY3VsYXIgY2xhc3MgaGFzIGEgcGVuZGluZyB0eXBlIGNvbnN0cnVjdG9yIHBhdGNoaW5nIG9wZXJhdGlvbiBhbHJlYWR5XG4gICAqIHF1ZXVlZC5cbiAgICovXG4gIHByaXZhdGUgdHlwZUN0b3JQZW5kaW5nID0gbmV3IFNldDx0cy5DbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIHByaXZhdGUgc291cmNlTWFuYWdlciA9IG5ldyBUY2JTb3VyY2VNYW5hZ2VyKCk7XG5cbiAgcHJpdmF0ZSBkb21TY2hlbWFDaGVja2VyID0gbmV3IFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcih0aGlzLnNvdXJjZU1hbmFnZXIpO1xuXG4gIHByaXZhdGUgb29iUmVjb3JkZXIgPSBuZXcgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVySW1wbCh0aGlzLnNvdXJjZU1hbmFnZXIpO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0ZW1wbGF0ZSBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudCBgbm9kZWAsIHdpdGggYSBgU2VsZWN0b3JNYXRjaGVyYCBmb3IgZGlyZWN0aXZlXG4gICAqIG1hdGNoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBjbGFzcyBvZiB0aGUgbm9kZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIHRlbXBsYXRlIEFTVCBub2RlcyBvZiB0aGUgdGVtcGxhdGUgYmVpbmcgcmVjb3JkZWQuXG4gICAqIEBwYXJhbSBtYXRjaGVyIGBTZWxlY3Rvck1hdGNoZXJgIHdoaWNoIHRyYWNrcyBkaXJlY3RpdmVzIHRoYXQgYXJlIGluIHNjb3BlIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgYWRkVGVtcGxhdGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PixcbiAgICAgIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10sIHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZyxcbiAgICAgIGZpbGU6IFBhcnNlU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGlkID0gdGhpcy5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2Uoc291cmNlTWFwcGluZywgZmlsZSk7XG4gICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIHR5cGUgY29uc3RydWN0b3JzIGZvciBhbGwgb2YgdGhlbS5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiBib3VuZFRhcmdldC5nZXRVc2VkRGlyZWN0aXZlcygpKSB7XG4gICAgICBjb25zdCBkaXJSZWYgPSBkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcbiAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXJSZWYubm9kZTtcbiAgICAgIGlmIChyZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpck5vZGUpKSB7XG4gICAgICAgIC8vIEFkZCBhIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgICB0aGlzLmFkZElubGluZVR5cGVDdG9yKGRpck5vZGUuZ2V0U291cmNlRmlsZSgpLCBkaXJSZWYsIHtcbiAgICAgICAgICBmbk5hbWU6ICduZ1R5cGVDdG9yJyxcbiAgICAgICAgICAvLyBUaGUgY29uc3RydWN0b3Igc2hvdWxkIGhhdmUgYSBib2R5IGlmIHRoZSBkaXJlY3RpdmUgY29tZXMgZnJvbSBhIC50cyBmaWxlLCBidXQgbm90IGlmXG4gICAgICAgICAgLy8gaXQgY29tZXMgZnJvbSBhIC5kLnRzIGZpbGUuIC5kLnRzIGRlY2xhcmF0aW9ucyBkb24ndCBoYXZlIGJvZGllcy5cbiAgICAgICAgICBib2R5OiAhZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUsXG4gICAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgICBpbnB1dHM6IE9iamVjdC5rZXlzKGRpci5pbnB1dHMpLFxuICAgICAgICAgICAgb3V0cHV0czogT2JqZWN0LmtleXMoZGlyLm91dHB1dHMpLFxuICAgICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBzdXBwb3J0IHF1ZXJpZXNcbiAgICAgICAgICAgIHF1ZXJpZXM6IGRpci5xdWVyaWVzLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29lcmNlZElucHV0RmllbGRzOiBkaXIuY29lcmNlZElucHV0RmllbGRzLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB0Y2JNZXRhZGF0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSA9IHtpZCwgYm91bmRUYXJnZXQsIHBpcGVzLCBzY2hlbWFzfTtcbiAgICBpZiAocmVxdWlyZXNJbmxpbmVUeXBlQ2hlY2tCbG9jayhyZWYubm9kZSkpIHtcbiAgICAgIC8vIFRoaXMgY2xhc3MgZGlkbid0IG1lZXQgdGhlIHJlcXVpcmVtZW50cyBmb3IgZXh0ZXJuYWwgdHlwZSBjaGVja2luZywgc28gZ2VuZXJhdGUgYW4gaW5saW5lXG4gICAgICAvLyBUQ0IgZm9yIHRoZSBjbGFzcy5cbiAgICAgIHRoaXMuYWRkSW5saW5lVHlwZUNoZWNrQmxvY2socmVmLCB0Y2JNZXRhZGF0YSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBjbGFzcyBjYW4gYmUgdHlwZS1jaGVja2VkIGV4dGVybmFsbHkgYXMgbm9ybWFsLlxuICAgICAgdGhpcy50eXBlQ2hlY2tGaWxlLmFkZFR5cGVDaGVja0Jsb2NrKFxuICAgICAgICAgIHJlZiwgdGNiTWV0YWRhdGEsIHRoaXMuZG9tU2NoZW1hQ2hlY2tlciwgdGhpcy5vb2JSZWNvcmRlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHR5cGUgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBgbm9kZWAgd2l0aCB0aGUgZ2l2ZW4gYGN0b3JNZXRhZGF0YWAuXG4gICAqL1xuICBhZGRJbmxpbmVUeXBlQ3RvcihcbiAgICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIGN0b3JNZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudHlwZUN0b3JQZW5kaW5nLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy50eXBlQ3RvclBlbmRpbmcuYWRkKHJlZi5ub2RlKTtcblxuICAgIC8vIExhemlseSBjb25zdHJ1Y3QgdGhlIG9wZXJhdGlvbiBtYXAuXG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHRoaXMub3BNYXAuc2V0KHNmLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSAhO1xuXG4gICAgLy8gUHVzaCBhIGBUeXBlQ3Rvck9wYCBpbnRvIHRoZSBvcGVyYXRpb24gcXVldWUgZm9yIHRoZSBzb3VyY2UgZmlsZS5cbiAgICBvcHMucHVzaChuZXcgVHlwZUN0b3JPcChyZWYsIGN0b3JNZXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgYHRzLlNvdXJjZUZpbGVgIGludG8gYSB2ZXJzaW9uIHRoYXQgaW5jbHVkZXMgdHlwZSBjaGVja2luZyBjb2RlLlxuICAgKlxuICAgKiBJZiB0aGlzIHBhcnRpY3VsYXIgc291cmNlIGZpbGUgaGFzIG5vIGRpcmVjdGl2ZXMgdGhhdCByZXF1aXJlIHR5cGUgY29uc3RydWN0b3JzLCBvciBjb21wb25lbnRzXG4gICAqIHRoYXQgcmVxdWlyZSB0eXBlIGNoZWNrIGJsb2NrcywgdGhlbiBpdCB3aWxsIGJlIHJldHVybmVkIGRpcmVjdGx5LiBPdGhlcndpc2UsIGEgbmV3XG4gICAqIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXJzZWQgZnJvbSBtb2RpZmllZCB0ZXh0IG9mIHRoZSBvcmlnaW5hbC4gVGhpcyBpcyBuZWNlc3NhcnkgdG8gZW5zdXJlIHRoZVxuICAgKiBhZGRlZCBjb2RlIGhhcyBjb3JyZWN0IHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIGl0LlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIG9wZXJhdGlvbnMgcGVuZGluZyBmb3IgdGhpcyBwYXJ0aWN1bGFyIGZpbGUsIHJldHVybiBpdCBkaXJlY3RseS5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIHNmO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpICEuc29ydChvcmRlck9wcyk7XG4gICAgY29uc3QgdGV4dFBhcnRzID0gc3BsaXRTdHJpbmdBdFBvaW50cyhzZi50ZXh0LCBvcHMubWFwKG9wID0+IG9wLnNwbGl0UG9pbnQpKTtcblxuICAgIC8vIFVzZSBhIGB0cy5QcmludGVyYCB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZS5cbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcih7b21pdFRyYWlsaW5nU2VtaWNvbG9uOiB0cnVlfSk7XG5cbiAgICAvLyBCZWdpbiB3aXRoIHRoZSBpbnRpYWwgc2VjdGlvbiBvZiB0aGUgY29kZSB0ZXh0LlxuICAgIGxldCBjb2RlID0gdGV4dFBhcnRzWzBdO1xuXG4gICAgLy8gUHJvY2VzcyBlYWNoIG9wZXJhdGlvbiBhbmQgdXNlIHRoZSBwcmludGVyIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlIGZvciBpdCwgaW5zZXJ0aW5nIGl0IGludG9cbiAgICAvLyB0aGUgc291cmNlIGNvZGUgaW4gYmV0d2VlbiB0aGUgb3JpZ2luYWwgY2h1bmtzLlxuICAgIG9wcy5mb3JFYWNoKChvcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gb3AuZXhlY3V0ZShpbXBvcnRNYW5hZ2VyLCBzZiwgdGhpcy5yZWZFbWl0dGVyLCBwcmludGVyKTtcbiAgICAgIGNvZGUgKz0gJ1xcblxcbicgKyB0ZXh0ICsgdGV4dFBhcnRzW2lkeCArIDFdO1xuICAgIH0pO1xuXG4gICAgLy8gV3JpdGUgb3V0IHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaWxlLlxuICAgIGxldCBpbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNmLmZpbGVOYW1lKVxuICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllcn0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO2ApXG4gICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIGNvZGUgPSBpbXBvcnRzICsgJ1xcbicgKyBjb2RlO1xuXG4gICAgLy8gUGFyc2UgdGhlIG5ldyBzb3VyY2UgZmlsZSBhbmQgcmV0dXJuIGl0LlxuICAgIHJldHVybiB0cy5jcmVhdGVTb3VyY2VGaWxlKHNmLmZpbGVOYW1lLCBjb2RlLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgfVxuXG4gIGNhbGN1bGF0ZVRlbXBsYXRlRGlhZ25vc3RpY3MoXG4gICAgICBvcmlnaW5hbFByb2dyYW06IHRzLlByb2dyYW0sIG9yaWdpbmFsSG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgb3JpZ2luYWxPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiB7XG4gICAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSxcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICB9IHtcbiAgICBjb25zdCB0eXBlQ2hlY2tTZiA9IHRoaXMudHlwZUNoZWNrRmlsZS5yZW5kZXIoKTtcbiAgICAvLyBGaXJzdCwgYnVpbGQgdGhlIG1hcCBvZiBvcmlnaW5hbCBzb3VyY2UgZmlsZXMuXG4gICAgY29uc3Qgc2ZNYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4oKTtcbiAgICBjb25zdCBpbnRlcmVzdGluZ0ZpbGVzOiB0cy5Tb3VyY2VGaWxlW10gPSBbdHlwZUNoZWNrU2ZdO1xuICAgIGZvciAoY29uc3Qgb3JpZ2luYWxTZiBvZiBvcmlnaW5hbFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgY29uc3Qgc2YgPSB0aGlzLnRyYW5zZm9ybShvcmlnaW5hbFNmKTtcbiAgICAgIHNmTWFwLnNldChzZi5maWxlTmFtZSwgc2YpO1xuICAgICAgaWYgKCFzZi5pc0RlY2xhcmF0aW9uRmlsZSAmJiB0aGlzLm9wTWFwLmhhcyhvcmlnaW5hbFNmKSkge1xuICAgICAgICBpbnRlcmVzdGluZ0ZpbGVzLnB1c2goc2YpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNmTWFwLnNldCh0eXBlQ2hlY2tTZi5maWxlTmFtZSwgdHlwZUNoZWNrU2YpO1xuXG4gICAgY29uc3QgdHlwZUNoZWNrUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oe1xuICAgICAgaG9zdDogbmV3IFR5cGVDaGVja1Byb2dyYW1Ib3N0KHNmTWFwLCBvcmlnaW5hbEhvc3QpLFxuICAgICAgb3B0aW9uczogb3JpZ2luYWxPcHRpb25zLFxuICAgICAgb2xkUHJvZ3JhbTogb3JpZ2luYWxQcm9ncmFtLFxuICAgICAgcm9vdE5hbWVzOiBvcmlnaW5hbFByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGNvbGxlY3REaWFnbm9zdGljcyA9IChkaWFnczogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdKTogdm9pZCA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGRpYWdub3N0aWMgb2YgZGlhZ3MpIHtcbiAgICAgICAgaWYgKHNob3VsZFJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYykpIHtcbiAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkID0gdHJhbnNsYXRlRGlhZ25vc3RpYyhkaWFnbm9zdGljLCB0aGlzLnNvdXJjZU1hbmFnZXIpO1xuXG4gICAgICAgICAgaWYgKHRyYW5zbGF0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2godHJhbnNsYXRlZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZvciAoY29uc3Qgc2Ygb2YgaW50ZXJlc3RpbmdGaWxlcykge1xuICAgICAgY29sbGVjdERpYWdub3N0aWNzKHR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZikpO1xuICAgIH1cblxuICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy5kb21TY2hlbWFDaGVja2VyLmRpYWdub3N0aWNzKTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMub29iUmVjb3JkZXIuZGlhZ25vc3RpY3MpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRpYWdub3N0aWNzLFxuICAgICAgcHJvZ3JhbTogdHlwZUNoZWNrUHJvZ3JhbSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRJbmxpbmVUeXBlQ2hlY2tCbG9jayhcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikgITtcbiAgICBvcHMucHVzaChuZXcgVGNiT3AocmVmLCB0Y2JNZXRhLCB0aGlzLmNvbmZpZywgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNoZWNrIGNvZGUgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKi9cbmNsYXNzIFRjYk9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcikge31cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7IHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCArIDE7IH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IGVudiA9IG5ldyBFbnZpcm9ubWVudCh0aGlzLmNvbmZpZywgaW0sIHJlZkVtaXR0ZXIsIHNmKTtcbiAgICBjb25zdCBmbk5hbWUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiXyR7dGhpcy5yZWYubm9kZS5wb3N9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7IHJldHVybiB0aGlzLnJlZi5ub2RlLmVuZCAtIDE7IH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IHRjYiA9IGdlbmVyYXRlSW5saW5lVHlwZUN0b3IodGhpcy5yZWYubm9kZSwgdGhpcy5tZXRhKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHRjYiwgc2YpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGFyZSB0d28gb3BlcmF0aW9ucyBhbmQgcmV0dXJuIHRoZWlyIHNwbGl0IHBvaW50IG9yZGVyaW5nLlxuICovXG5mdW5jdGlvbiBvcmRlck9wcyhvcDE6IE9wLCBvcDI6IE9wKTogbnVtYmVyIHtcbiAgcmV0dXJuIG9wMS5zcGxpdFBvaW50IC0gb3AyLnNwbGl0UG9pbnQ7XG59XG5cbi8qKlxuICogU3BsaXQgYSBzdHJpbmcgaW50byBjaHVua3MgYXQgYW55IG51bWJlciBvZiBzcGxpdCBwb2ludHMuXG4gKi9cbmZ1bmN0aW9uIHNwbGl0U3RyaW5nQXRQb2ludHMoc3RyOiBzdHJpbmcsIHBvaW50czogbnVtYmVyW10pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHNwbGl0czogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHN0YXJ0ID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwb2ludCA9IHBvaW50c1tpXTtcbiAgICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0LCBwb2ludCkpO1xuICAgIHN0YXJ0ID0gcG9pbnQ7XG4gIH1cbiAgc3BsaXRzLnB1c2goc3RyLnN1YnN0cmluZyhzdGFydCkpO1xuICByZXR1cm4gc3BsaXRzO1xufVxuIl19