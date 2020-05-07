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
        function TypeCheckContext(config, compilerHost, refEmitter, reflector, typeCheckFilePath) {
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
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
            this.sourceManager = new source_1.TemplateSourceManager();
            this.domSchemaChecker = new dom_1.RegistryDomSchemaChecker(this.sourceManager);
            this.oobRecorder = new oob_1.OutOfBandDiagnosticRecorderImpl(this.sourceManager);
            this.typeCheckFile =
                new type_check_file_1.TypeCheckFile(typeCheckFilePath, config, refEmitter, reflector, compilerHost);
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
                    if (type_constructor_1.requiresInlineTypeCtor(dirNode, this.reflector)) {
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
            ops.push(new TcbOp(ref, tcbMeta, this.config, this.reflector, this.domSchemaChecker, this.oobRecorder));
        };
        return TypeCheckContext;
    }());
    exports.TypeCheckContext = TypeCheckContext;
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
            enumerable: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUdqQyxtRUFBOEU7SUFFOUUseUVBQStDO0lBRy9DLHlGQUEwRTtJQUMxRSx5RUFBaUU7SUFDakUseUZBQTBDO0lBQzFDLDJFQUE0QztJQUM1Qyx5RUFBbUY7SUFDbkYsK0VBQStDO0lBQy9DLG1HQUF3RjtJQUN4RixpR0FBZ0Q7SUFDaEQsbUdBQWtGO0lBSWxGOzs7Ozs7T0FNRztJQUNIO1FBR0UsMEJBQ1ksTUFBMEIsRUFBRSxZQUE2QixFQUN6RCxVQUE0QixFQUFVLFNBQXlCLEVBQ3ZFLGlCQUFpQztZQUZ6QixXQUFNLEdBQU4sTUFBTSxDQUFvQjtZQUMxQixlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBTTNFOzs7ZUFHRztZQUNLLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztZQUUvQzs7O2VBR0c7WUFDSyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1lBRWpELGtCQUFhLEdBQUcsSUFBSSw4QkFBcUIsRUFBRSxDQUFDO1lBRTVDLHFCQUFnQixHQUFHLElBQUksOEJBQXdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRXBFLGdCQUFXLEdBQUcsSUFBSSxxQ0FBK0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFwQjVFLElBQUksQ0FBQyxhQUFhO2dCQUNkLElBQUksK0JBQWEsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN4RixDQUFDO1FBb0JEOzs7Ozs7O1dB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QUFFLEVBQWlCLEVBQUUsVUFBNEIsRUFBRSxPQUFtQjtZQUU3RixJQUFNLEdBQUcsR0FBRyx5Q0FBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0QsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBakJELElBaUJDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLFFBQVEsQ0FBQyxHQUFPLEVBQUUsR0FBTztRQUNoQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxNQUFnQjtRQUN4RCxJQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6QyxLQUFLLEdBQUcsS0FBSyxDQUFDO1NBQ2Y7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBQYXJzZVNvdXJjZUZpbGUsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge3Nob3VsZFJlcG9ydERpYWdub3N0aWMsIHRyYW5zbGF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEb21TY2hlbWFDaGVja2VyLCBSZWdpc3RyeURvbVNjaGVtYUNoZWNrZXJ9IGZyb20gJy4vZG9tJztcbmltcG9ydCB7RW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtUeXBlQ2hlY2tQcm9ncmFtSG9zdH0gZnJvbSAnLi9ob3N0JztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyLCBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsfSBmcm9tICcuL29vYic7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrLCByZXF1aXJlc0lubGluZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuaW1wb3J0IHtUeXBlQ2hlY2tGaWxlfSBmcm9tICcuL3R5cGVfY2hlY2tfZmlsZSc7XG5pbXBvcnQge2dlbmVyYXRlSW5saW5lVHlwZUN0b3IsIHJlcXVpcmVzSW5saW5lVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cblxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuIEl0IGFsc28gYWxsb3dzIGdlbmVyYXRpb24gb2YgbW9kaWZpZWQgYHRzLlNvdXJjZUZpbGVgcyB3aGljaCBjb250YWluIHRoZSB0eXBlXG4gKiBjaGVja2luZyBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrQ29udGV4dCB7XG4gIHByaXZhdGUgdHlwZUNoZWNrRmlsZTogVHlwZUNoZWNrRmlsZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICB0eXBlQ2hlY2tGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLnR5cGVDaGVja0ZpbGUgPVxuICAgICAgICBuZXcgVHlwZUNoZWNrRmlsZSh0eXBlQ2hlY2tGaWxlUGF0aCwgY29uZmlnLCByZWZFbWl0dGVyLCByZWZsZWN0b3IsIGNvbXBpbGVySG9zdCk7XG4gIH1cblxuICAvKipcbiAgICogQSBgTWFwYCBvZiBgdHMuU291cmNlRmlsZWBzIHRoYXQgdGhlIGNvbnRleHQgaGFzIHNlZW4gdG8gdGhlIG9wZXJhdGlvbnMgKGFkZGl0aW9ucyBvZiBtZXRob2RzXG4gICAqIG9yIHR5cGUtY2hlY2sgYmxvY2tzKSB0aGF0IG5lZWQgdG8gYmUgZXZlbnR1YWxseSBwZXJmb3JtZWQgb24gdGhhdCBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBvcE1hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgT3BbXT4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoZW4gYW4gYSBwYXJ0aWN1bGFyIGNsYXNzIGhhcyBhIHBlbmRpbmcgdHlwZSBjb25zdHJ1Y3RvciBwYXRjaGluZyBvcGVyYXRpb24gYWxyZWFkeVxuICAgKiBxdWV1ZWQuXG4gICAqL1xuICBwcml2YXRlIHR5cGVDdG9yUGVuZGluZyA9IG5ldyBTZXQ8dHMuQ2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICBwcml2YXRlIHNvdXJjZU1hbmFnZXIgPSBuZXcgVGVtcGxhdGVTb3VyY2VNYW5hZ2VyKCk7XG5cbiAgcHJpdmF0ZSBkb21TY2hlbWFDaGVja2VyID0gbmV3IFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlcih0aGlzLnNvdXJjZU1hbmFnZXIpO1xuXG4gIHByaXZhdGUgb29iUmVjb3JkZXIgPSBuZXcgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVySW1wbCh0aGlzLnNvdXJjZU1hbmFnZXIpO1xuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0ZW1wbGF0ZSBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudCBgbm9kZWAsIHdpdGggYSBgU2VsZWN0b3JNYXRjaGVyYCBmb3IgZGlyZWN0aXZlXG4gICAqIG1hdGNoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBjbGFzcyBvZiB0aGUgbm9kZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIHRlbXBsYXRlIEFTVCBub2RlcyBvZiB0aGUgdGVtcGxhdGUgYmVpbmcgcmVjb3JkZWQuXG4gICAqIEBwYXJhbSBtYXRjaGVyIGBTZWxlY3Rvck1hdGNoZXJgIHdoaWNoIHRyYWNrcyBkaXJlY3RpdmVzIHRoYXQgYXJlIGluIHNjb3BlIGZvciB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgYWRkVGVtcGxhdGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT4sXG4gICAgICBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PixcbiAgICAgIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10sIHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZyxcbiAgICAgIGZpbGU6IFBhcnNlU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGlkID0gdGhpcy5zb3VyY2VNYW5hZ2VyLmNhcHR1cmVTb3VyY2Uoc291cmNlTWFwcGluZywgZmlsZSk7XG4gICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIHR5cGUgY29uc3RydWN0b3JzIGZvciBhbGwgb2YgdGhlbS5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiBib3VuZFRhcmdldC5nZXRVc2VkRGlyZWN0aXZlcygpKSB7XG4gICAgICBjb25zdCBkaXJSZWYgPSBkaXIucmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PjtcbiAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXJSZWYubm9kZTtcbiAgICAgIGlmIChyZXF1aXJlc0lubGluZVR5cGVDdG9yKGRpck5vZGUsIHRoaXMucmVmbGVjdG9yKSkge1xuICAgICAgICAvLyBBZGQgYSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiBmb3IgdGhlIGRpcmVjdGl2ZS5cbiAgICAgICAgdGhpcy5hZGRJbmxpbmVUeXBlQ3RvcihkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyUmVmLCB7XG4gICAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZlxuICAgICAgICAgIC8vIGl0IGNvbWVzIGZyb20gYSAuZC50cyBmaWxlLiAuZC50cyBkZWNsYXJhdGlvbnMgZG9uJ3QgaGF2ZSBib2RpZXMuXG4gICAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlLFxuICAgICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgaW5wdXRzOiBPYmplY3Qua2V5cyhkaXIuaW5wdXRzKSxcbiAgICAgICAgICAgIG91dHB1dHM6IE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSxcbiAgICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3VwcG9ydCBxdWVyaWVzXG4gICAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZXJjZWRJbnB1dEZpZWxkczogZGlyLmNvZXJjZWRJbnB1dEZpZWxkcyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdGNiTWV0YWRhdGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEgPSB7aWQsIGJvdW5kVGFyZ2V0LCBwaXBlcywgc2NoZW1hc307XG4gICAgaWYgKHJlcXVpcmVzSW5saW5lVHlwZUNoZWNrQmxvY2socmVmLm5vZGUpKSB7XG4gICAgICAvLyBUaGlzIGNsYXNzIGRpZG4ndCBtZWV0IHRoZSByZXF1aXJlbWVudHMgZm9yIGV4dGVybmFsIHR5cGUgY2hlY2tpbmcsIHNvIGdlbmVyYXRlIGFuIGlubGluZVxuICAgICAgLy8gVENCIGZvciB0aGUgY2xhc3MuXG4gICAgICB0aGlzLmFkZElubGluZVR5cGVDaGVja0Jsb2NrKHJlZiwgdGNiTWV0YWRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgY2xhc3MgY2FuIGJlIHR5cGUtY2hlY2tlZCBleHRlcm5hbGx5IGFzIG5vcm1hbC5cbiAgICAgIHRoaXMudHlwZUNoZWNrRmlsZS5hZGRUeXBlQ2hlY2tCbG9jayhcbiAgICAgICAgICByZWYsIHRjYk1ldGFkYXRhLCB0aGlzLmRvbVNjaGVtYUNoZWNrZXIsIHRoaXMub29iUmVjb3JkZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIHdpdGggdGhlIGdpdmVuIGBjdG9yTWV0YWRhdGFgLlxuICAgKi9cbiAgYWRkSW5saW5lVHlwZUN0b3IoXG4gICAgICBzZjogdHMuU291cmNlRmlsZSwgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICBjdG9yTWV0YTogVHlwZUN0b3JNZXRhZGF0YSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnR5cGVDdG9yUGVuZGluZy5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHlwZUN0b3JQZW5kaW5nLmFkZChyZWYubm9kZSk7XG5cbiAgICAvLyBMYXppbHkgY29uc3RydWN0IHRoZSBvcGVyYXRpb24gbWFwLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikhO1xuXG4gICAgLy8gUHVzaCBhIGBUeXBlQ3Rvck9wYCBpbnRvIHRoZSBvcGVyYXRpb24gcXVldWUgZm9yIHRoZSBzb3VyY2UgZmlsZS5cbiAgICBvcHMucHVzaChuZXcgVHlwZUN0b3JPcChyZWYsIGN0b3JNZXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgYHRzLlNvdXJjZUZpbGVgIGludG8gYSB2ZXJzaW9uIHRoYXQgaW5jbHVkZXMgdHlwZSBjaGVja2luZyBjb2RlLlxuICAgKlxuICAgKiBJZiB0aGlzIHBhcnRpY3VsYXIgc291cmNlIGZpbGUgaGFzIG5vIGRpcmVjdGl2ZXMgdGhhdCByZXF1aXJlIHR5cGUgY29uc3RydWN0b3JzLCBvciBjb21wb25lbnRzXG4gICAqIHRoYXQgcmVxdWlyZSB0eXBlIGNoZWNrIGJsb2NrcywgdGhlbiBpdCB3aWxsIGJlIHJldHVybmVkIGRpcmVjdGx5LiBPdGhlcndpc2UsIGEgbmV3XG4gICAqIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXJzZWQgZnJvbSBtb2RpZmllZCB0ZXh0IG9mIHRoZSBvcmlnaW5hbC4gVGhpcyBpcyBuZWNlc3NhcnkgdG8gZW5zdXJlIHRoZVxuICAgKiBhZGRlZCBjb2RlIGhhcyBjb3JyZWN0IHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIGl0LlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIG9wZXJhdGlvbnMgcGVuZGluZyBmb3IgdGhpcyBwYXJ0aWN1bGFyIGZpbGUsIHJldHVybiBpdCBkaXJlY3RseS5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIHNmO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpIS5zb3J0KG9yZGVyT3BzKTtcbiAgICBjb25zdCB0ZXh0UGFydHMgPSBzcGxpdFN0cmluZ0F0UG9pbnRzKHNmLnRleHQsIG9wcy5tYXAob3AgPT4gb3Auc3BsaXRQb2ludCkpO1xuXG4gICAgLy8gVXNlIGEgYHRzLlByaW50ZXJgIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtvbWl0VHJhaWxpbmdTZW1pY29sb246IHRydWV9KTtcblxuICAgIC8vIEJlZ2luIHdpdGggdGhlIGludGlhbCBzZWN0aW9uIG9mIHRoZSBjb2RlIHRleHQuXG4gICAgbGV0IGNvZGUgPSB0ZXh0UGFydHNbMF07XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggb3BlcmF0aW9uIGFuZCB1c2UgdGhlIHByaW50ZXIgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUgZm9yIGl0LCBpbnNlcnRpbmcgaXQgaW50b1xuICAgIC8vIHRoZSBzb3VyY2UgY29kZSBpbiBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjaHVua3MuXG4gICAgb3BzLmZvckVhY2goKG9wLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBvcC5leGVjdXRlKGltcG9ydE1hbmFnZXIsIHNmLCB0aGlzLnJlZkVtaXR0ZXIsIHByaW50ZXIpO1xuICAgICAgY29kZSArPSAnXFxuXFxuJyArIHRleHQgKyB0ZXh0UGFydHNbaWR4ICsgMV07XG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBvdXQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGUuXG4gICAgbGV0IGltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kucXVhbGlmaWVyfSBmcm9tICcke2kuc3BlY2lmaWVyfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJyk7XG4gICAgY29kZSA9IGltcG9ydHMgKyAnXFxuJyArIGNvZGU7XG5cbiAgICAvLyBQYXJzZSB0aGUgbmV3IHNvdXJjZSBmaWxlIGFuZCByZXR1cm4gaXQuXG4gICAgcmV0dXJuIHRzLmNyZWF0ZVNvdXJjZUZpbGUoc2YuZmlsZU5hbWUsIGNvZGUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUsIHRzLlNjcmlwdEtpbmQuVFMpO1xuICB9XG5cbiAgY2FsY3VsYXRlVGVtcGxhdGVEaWFnbm9zdGljcyhcbiAgICAgIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb3JpZ2luYWxIb3N0OiB0cy5Db21waWxlckhvc3QsXG4gICAgICBvcmlnaW5hbE9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHtcbiAgICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sXG4gIH0ge1xuICAgIGNvbnN0IHR5cGVDaGVja1NmID0gdGhpcy50eXBlQ2hlY2tGaWxlLnJlbmRlcigpO1xuICAgIC8vIEZpcnN0LCBidWlsZCB0aGUgbWFwIG9mIG9yaWdpbmFsIHNvdXJjZSBmaWxlcy5cbiAgICBjb25zdCBzZk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGNvbnN0IGludGVyZXN0aW5nRmlsZXM6IHRzLlNvdXJjZUZpbGVbXSA9IFt0eXBlQ2hlY2tTZl07XG4gICAgZm9yIChjb25zdCBvcmlnaW5hbFNmIG9mIG9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBjb25zdCBzZiA9IHRoaXMudHJhbnNmb3JtKG9yaWdpbmFsU2YpO1xuICAgICAgc2ZNYXAuc2V0KHNmLmZpbGVOYW1lLCBzZik7XG4gICAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmIHRoaXMub3BNYXAuaGFzKG9yaWdpbmFsU2YpKSB7XG4gICAgICAgIGludGVyZXN0aW5nRmlsZXMucHVzaChzZik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2ZNYXAuc2V0KHR5cGVDaGVja1NmLmZpbGVOYW1lLCB0eXBlQ2hlY2tTZik7XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICBob3N0OiBuZXcgVHlwZUNoZWNrUHJvZ3JhbUhvc3Qoc2ZNYXAsIG9yaWdpbmFsSG9zdCksXG4gICAgICBvcHRpb25zOiBvcmlnaW5hbE9wdGlvbnMsXG4gICAgICBvbGRQcm9ncmFtOiBvcmlnaW5hbFByb2dyYW0sXG4gICAgICByb290TmFtZXM6IG9yaWdpbmFsUHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKCksXG4gICAgfSk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgY29sbGVjdERpYWdub3N0aWNzID0gKGRpYWdzOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10pOiB2b2lkID0+IHtcbiAgICAgIGZvciAoY29uc3QgZGlhZ25vc3RpYyBvZiBkaWFncykge1xuICAgICAgICBpZiAoc2hvdWxkUmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKSkge1xuICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSB0cmFuc2xhdGVEaWFnbm9zdGljKGRpYWdub3N0aWMsIHRoaXMuc291cmNlTWFuYWdlcik7XG5cbiAgICAgICAgICBpZiAodHJhbnNsYXRlZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCh0cmFuc2xhdGVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBzZiBvZiBpbnRlcmVzdGluZ0ZpbGVzKSB7XG4gICAgICBjb2xsZWN0RGlhZ25vc3RpY3ModHlwZUNoZWNrUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmKSk7XG4gICAgfVxuXG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmRvbVNjaGVtYUNoZWNrZXIuZGlhZ25vc3RpY3MpO1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy5vb2JSZWNvcmRlci5kaWFnbm9zdGljcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZGlhZ25vc3RpY3MsXG4gICAgICBwcm9ncmFtOiB0eXBlQ2hlY2tQcm9ncmFtLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFkZElubGluZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4sXG4gICAgICB0Y2JNZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhKTogdm9pZCB7XG4gICAgY29uc3Qgc2YgPSByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKCF0aGlzLm9wTWFwLmhhcyhzZikpIHtcbiAgICAgIHRoaXMub3BNYXAuc2V0KHNmLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG9wcyA9IHRoaXMub3BNYXAuZ2V0KHNmKSE7XG4gICAgb3BzLnB1c2gobmV3IFRjYk9wKFxuICAgICAgICByZWYsIHRjYk1ldGEsIHRoaXMuY29uZmlnLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZ2VuZXJhdGlvbiBvcGVyYXRpb24gdGhhdCBuZWVkcyB0byBoYXBwZW4gd2l0aGluIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gKi9cbmludGVyZmFjZSBPcCB7XG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgZmlsZSB3aGljaCB3aWxsIGhhdmUgY29kZSBnZW5lcmF0ZWQgZm9yIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj47XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiB3aGljaCBwcm9kdWNlcyB0eXBlIGNoZWNrIGNvZGUgZm9yIGEgcGFydGljdWxhciBjb21wb25lbnQuXG4gKi9cbmNsYXNzIFRjYk9wIGltcGxlbWVudHMgT3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+LFxuICAgICAgcmVhZG9ubHkgbWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSwgcmVhZG9ubHkgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICByZWFkb25seSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCByZWFkb25seSBkb21TY2hlbWFDaGVja2VyOiBEb21TY2hlbWFDaGVja2VyLFxuICAgICAgcmVhZG9ubHkgb29iUmVjb3JkZXI6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcikge31cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kICsgMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgZW52ID0gbmV3IEVudmlyb25tZW50KHRoaXMuY29uZmlnLCBpbSwgcmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIHNmKTtcbiAgICBjb25zdCBmbk5hbWUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGBfdGNiXyR7dGhpcy5yZWYubm9kZS5wb3N9YCk7XG4gICAgY29uc3QgZm4gPSBnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrKFxuICAgICAgICBlbnYsIHRoaXMucmVmLCBmbk5hbWUsIHRoaXMubWV0YSwgdGhpcy5kb21TY2hlbWFDaGVja2VyLCB0aGlzLm9vYlJlY29yZGVyKTtcbiAgICByZXR1cm4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGZuLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+PixcbiAgICAgIHJlYWRvbmx5IG1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9ucyBhcmUgaW5zZXJ0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIGRpcmVjdGl2ZSBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMucmVmLm5vZGUuZW5kIC0gMTtcbiAgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVJbmxpbmVUeXBlQ3Rvcih0aGlzLnJlZi5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=