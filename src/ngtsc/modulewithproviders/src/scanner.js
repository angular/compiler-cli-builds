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
        define("@angular/compiler-cli/src/ngtsc/modulewithproviders/src/scanner", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ModuleWithProvidersScanner = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var ModuleWithProvidersScanner = /** @class */ (function () {
        function ModuleWithProvidersScanner(host, evaluator, emitter) {
            this.host = host;
            this.evaluator = evaluator;
            this.emitter = emitter;
        }
        ModuleWithProvidersScanner.prototype.scan = function (sf, dts) {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(sf.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var stmt = _c.value;
                    this.visitStatement(dts, stmt);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        ModuleWithProvidersScanner.prototype.visitStatement = function (dts, stmt) {
            var e_2, _a;
            // Detect whether a statement is exported, which is used as one of the hints whether to look
            // more closely at possible MWP functions within. This is a syntactic check, not a semantic
            // check, so it won't detect cases like:
            //
            // var X = ...;
            // export {X}
            //
            // This is intentional, because the alternative is slow and this will catch 99% of the cases we
            // need to handle.
            var isExported = stmt.modifiers !== undefined &&
                stmt.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; });
            if (!isExported) {
                return;
            }
            if (ts.isClassDeclaration(stmt)) {
                try {
                    for (var _b = tslib_1.__values(stmt.members), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var member = _c.value;
                        if (!ts.isMethodDeclaration(member) || !isStatic(member)) {
                            continue;
                        }
                        this.visitFunctionOrMethodDeclaration(dts, member);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else if (ts.isFunctionDeclaration(stmt)) {
                this.visitFunctionOrMethodDeclaration(dts, stmt);
            }
        };
        ModuleWithProvidersScanner.prototype.visitFunctionOrMethodDeclaration = function (dts, decl) {
            // First, some sanity. This should have a method body with a single return statement.
            if (decl.body === undefined || decl.body.statements.length !== 1) {
                return;
            }
            var retStmt = decl.body.statements[0];
            if (!ts.isReturnStatement(retStmt) || retStmt.expression === undefined) {
                return;
            }
            var retValue = retStmt.expression;
            // Now, look at the return type of the method. Maybe bail if the type is already marked, or if
            // it's incompatible with a MWP function.
            var returnType = this.returnTypeOf(decl);
            if (returnType === ReturnType.OTHER || returnType === ReturnType.MWP_WITH_TYPE) {
                // Don't process this declaration, it either already declares the right return type, or an
                // incompatible one.
                return;
            }
            var value = this.evaluator.evaluate(retValue);
            if (!(value instanceof Map) || !value.has('ngModule')) {
                // The return value does not provide sufficient information to be able to add a generic type.
                return;
            }
            if (returnType === ReturnType.INFERRED && !isModuleWithProvidersType(value)) {
                // The return type is inferred but the returned object is not of the correct shape, so we
                // shouldn's modify the return type to become `ModuleWithProviders`.
                return;
            }
            // The return type has been verified to represent the `ModuleWithProviders` type, but either the
            // return type is inferred or the generic type argument is missing. In both cases, a new return
            // type is created where the `ngModule` type is included as generic type argument.
            var ngModule = value.get('ngModule');
            if (!(ngModule instanceof imports_1.Reference) || !ts.isClassDeclaration(ngModule.node)) {
                return;
            }
            var ngModuleExpr = this.emitter.emit(ngModule, decl.getSourceFile(), imports_1.ImportFlags.ForceNewImport);
            var ngModuleType = new compiler_1.ExpressionType(ngModuleExpr);
            var mwpNgType = new compiler_1.ExpressionType(new compiler_1.ExternalExpr(compiler_1.R3Identifiers.ModuleWithProviders), /* modifiers */ null, [ngModuleType]);
            dts.addTypeReplacement(decl, mwpNgType);
        };
        ModuleWithProvidersScanner.prototype.returnTypeOf = function (decl) {
            if (decl.type === undefined) {
                return ReturnType.INFERRED;
            }
            else if (!ts.isTypeReferenceNode(decl.type)) {
                return ReturnType.OTHER;
            }
            // Try to figure out if the type is of a familiar form, something that looks like it was
            // imported.
            var typeId;
            if (ts.isIdentifier(decl.type.typeName)) {
                // def: ModuleWithProviders
                typeId = decl.type.typeName;
            }
            else if (ts.isQualifiedName(decl.type.typeName) && ts.isIdentifier(decl.type.typeName.left)) {
                // def: i0.ModuleWithProviders
                typeId = decl.type.typeName.right;
            }
            else {
                return ReturnType.OTHER;
            }
            var importDecl = this.host.getImportOfIdentifier(typeId);
            if (importDecl === null || importDecl.from !== '@angular/core' ||
                importDecl.name !== 'ModuleWithProviders') {
                return ReturnType.OTHER;
            }
            if (decl.type.typeArguments === undefined || decl.type.typeArguments.length === 0) {
                // The return type is indeed ModuleWithProviders, but no generic type parameter was found.
                return ReturnType.MWP_NO_TYPE;
            }
            else {
                // The return type is ModuleWithProviders, and the user has already specified a generic type.
                return ReturnType.MWP_WITH_TYPE;
            }
        };
        return ModuleWithProvidersScanner;
    }());
    exports.ModuleWithProvidersScanner = ModuleWithProvidersScanner;
    var ReturnType;
    (function (ReturnType) {
        ReturnType[ReturnType["INFERRED"] = 0] = "INFERRED";
        ReturnType[ReturnType["MWP_NO_TYPE"] = 1] = "MWP_NO_TYPE";
        ReturnType[ReturnType["MWP_WITH_TYPE"] = 2] = "MWP_WITH_TYPE";
        ReturnType[ReturnType["OTHER"] = 3] = "OTHER";
    })(ReturnType || (ReturnType = {}));
    /** Whether the resolved value map represents a ModuleWithProviders object */
    function isModuleWithProvidersType(value) {
        var ngModule = value.has('ngModule');
        var providers = value.has('providers');
        return ngModule && (value.size === 1 || (providers && value.size === 2));
    }
    function isStatic(node) {
        return node.modifiers !== undefined &&
            node.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.StaticKeyword; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbW9kdWxld2l0aHByb3ZpZGVycy9zcmMvc2Nhbm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1HO0lBQ25HLCtCQUFpQztJQUVqQyxtRUFBdUU7SUFRdkU7UUFDRSxvQ0FDWSxJQUFvQixFQUFVLFNBQTJCLEVBQ3pELE9BQXlCO1lBRHpCLFNBQUksR0FBSixJQUFJLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFDekQsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7UUFBRyxDQUFDO1FBRXpDLHlDQUFJLEdBQUosVUFBSyxFQUFpQixFQUFFLEdBQWU7OztnQkFDckMsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTdCLElBQU0sSUFBSSxXQUFBO29CQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNoQzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVPLG1EQUFjLEdBQXRCLFVBQXVCLEdBQWUsRUFBRSxJQUFrQjs7WUFDeEQsNEZBQTRGO1lBQzVGLDJGQUEyRjtZQUMzRix3Q0FBd0M7WUFDeEMsRUFBRTtZQUNGLGVBQWU7WUFDZixhQUFhO1lBQ2IsRUFBRTtZQUNGLCtGQUErRjtZQUMvRixrQkFBa0I7WUFDbEIsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO2dCQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQXhDLENBQXdDLENBQUMsQ0FBQztZQUV6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b250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uVHlwZSwgRXh0ZXJuYWxFeHByLCBSM0lkZW50aWZpZXJzIGFzIElkZW50aWZpZXJzLCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtJbXBvcnRGbGFncywgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZU1hcH0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHRzSGFuZGxlciB7XG4gIGFkZFR5cGVSZXBsYWNlbWVudChub2RlOiB0cy5EZWNsYXJhdGlvbiwgdHlwZTogVHlwZSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBob3N0OiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIGVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpIHt9XG5cbiAgc2NhbihzZjogdHMuU291cmNlRmlsZSwgZHRzOiBEdHNIYW5kbGVyKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHNmLnN0YXRlbWVudHMpIHtcbiAgICAgIHRoaXMudmlzaXRTdGF0ZW1lbnQoZHRzLCBzdG10KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0U3RhdGVtZW50KGR0czogRHRzSGFuZGxlciwgc3RtdDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgLy8gRGV0ZWN0IHdoZXRoZXIgYSBzdGF0ZW1lbnQgaXMgZXhwb3J0ZWQsIHdoaWNoIGlzIHVzZWQgYXMgb25lIG9mIHRoZSBoaW50cyB3aGV0aGVyIHRvIGxvb2tcbiAgICAvLyBtb3JlIGNsb3NlbHkgYXQgcG9zc2libGUgTVdQIGZ1bmN0aW9ucyB3aXRoaW4uIFRoaXMgaXMgYSBzeW50YWN0aWMgY2hlY2ssIG5vdCBhIHNlbWFudGljXG4gICAgLy8gY2hlY2ssIHNvIGl0IHdvbid0IGRldGVjdCBjYXNlcyBsaWtlOlxuICAgIC8vXG4gICAgLy8gdmFyIFggPSAuLi47XG4gICAgLy8gZXhwb3J0IHtYfVxuICAgIC8vXG4gICAgLy8gVGhpcyBpcyBpbnRlbnRpb25hbCwgYmVjYXVzZSB0aGUgYWx0ZXJuYXRpdmUgaXMgc2xvdyBhbmQgdGhpcyB3aWxsIGNhdGNoIDk5JSBvZiB0aGUgY2FzZXMgd2VcbiAgICAvLyBuZWVkIHRvIGhhbmRsZS5cbiAgICBjb25zdCBpc0V4cG9ydGVkID0gc3RtdC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcblxuICAgIGlmICghaXNFeHBvcnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgIGZvciAoY29uc3QgbWVtYmVyIG9mIHN0bXQubWVtYmVycykge1xuICAgICAgICBpZiAoIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24obWVtYmVyKSB8fCAhaXNTdGF0aWMobWVtYmVyKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aXNpdEZ1bmN0aW9uT3JNZXRob2REZWNsYXJhdGlvbihkdHMsIG1lbWJlcik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgIHRoaXMudmlzaXRGdW5jdGlvbk9yTWV0aG9kRGVjbGFyYXRpb24oZHRzLCBzdG10KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RnVuY3Rpb25Pck1ldGhvZERlY2xhcmF0aW9uKFxuICAgICAgZHRzOiBEdHNIYW5kbGVyLCBkZWNsOiB0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgLy8gRmlyc3QsIHNvbWUgc2FuaXR5LiBUaGlzIHNob3VsZCBoYXZlIGEgbWV0aG9kIGJvZHkgd2l0aCBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICAgIGlmIChkZWNsLmJvZHkgPT09IHVuZGVmaW5lZCB8fCBkZWNsLmJvZHkuc3RhdGVtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmV0U3RtdCA9IGRlY2wuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQocmV0U3RtdCkgfHwgcmV0U3RtdC5leHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmV0VmFsdWUgPSByZXRTdG10LmV4cHJlc3Npb247XG5cbiAgICAvLyBOb3csIGxvb2sgYXQgdGhlIHJldHVybiB0eXBlIG9mIHRoZSBtZXRob2QuIE1heWJlIGJhaWwgaWYgdGhlIHR5cGUgaXMgYWxyZWFkeSBtYXJrZWQsIG9yIGlmXG4gICAgLy8gaXQncyBpbmNvbXBhdGlibGUgd2l0aCBhIE1XUCBmdW5jdGlvbi5cbiAgICBjb25zdCByZXR1cm5UeXBlID0gdGhpcy5yZXR1cm5UeXBlT2YoZGVjbCk7XG4gICAgaWYgKHJldHVyblR5cGUgPT09IFJldHVyblR5cGUuT1RIRVIgfHwgcmV0dXJuVHlwZSA9PT0gUmV0dXJuVHlwZS5NV1BfV0lUSF9UWVBFKSB7XG4gICAgICAvLyBEb24ndCBwcm9jZXNzIHRoaXMgZGVjbGFyYXRpb24sIGl0IGVpdGhlciBhbHJlYWR5IGRlY2xhcmVzIHRoZSByaWdodCByZXR1cm4gdHlwZSwgb3IgYW5cbiAgICAgIC8vIGluY29tcGF0aWJsZSBvbmUuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyZXRWYWx1ZSk7XG4gICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBNYXApIHx8ICF2YWx1ZS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgIC8vIFRoZSByZXR1cm4gdmFsdWUgZG9lcyBub3QgcHJvdmlkZSBzdWZmaWNpZW50IGluZm9ybWF0aW9uIHRvIGJlIGFibGUgdG8gYWRkIGEgZ2VuZXJpYyB0eXBlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChyZXR1cm5UeXBlID09PSBSZXR1cm5UeXBlLklORkVSUkVEICYmICFpc01vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHZhbHVlKSkge1xuICAgICAgLy8gVGhlIHJldHVybiB0eXBlIGlzIGluZmVycmVkIGJ1dCB0aGUgcmV0dXJuZWQgb2JqZWN0IGlzIG5vdCBvZiB0aGUgY29ycmVjdCBzaGFwZSwgc28gd2VcbiAgICAgIC8vIHNob3VsZG4ncyBtb2RpZnkgdGhlIHJldHVybiB0eXBlIHRvIGJlY29tZSBgTW9kdWxlV2l0aFByb3ZpZGVyc2AuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhlIHJldHVybiB0eXBlIGhhcyBiZWVuIHZlcmlmaWVkIHRvIHJlcHJlc2VudCB0aGUgYE1vZHVsZVdpdGhQcm92aWRlcnNgIHR5cGUsIGJ1dCBlaXRoZXIgdGhlXG4gICAgLy8gcmV0dXJuIHR5cGUgaXMgaW5mZXJyZWQgb3IgdGhlIGdlbmVyaWMgdHlwZSBhcmd1bWVudCBpcyBtaXNzaW5nLiBJbiBib3RoIGNhc2VzLCBhIG5ldyByZXR1cm5cbiAgICAvLyB0eXBlIGlzIGNyZWF0ZWQgd2hlcmUgdGhlIGBuZ01vZHVsZWAgdHlwZSBpcyBpbmNsdWRlZCBhcyBnZW5lcmljIHR5cGUgYXJndW1lbnQuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB2YWx1ZS5nZXQoJ25nTW9kdWxlJyk7XG4gICAgaWYgKCEobmdNb2R1bGUgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24obmdNb2R1bGUubm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBuZ01vZHVsZUV4cHIgPVxuICAgICAgICB0aGlzLmVtaXR0ZXIuZW1pdChuZ01vZHVsZSwgZGVjbC5nZXRTb3VyY2VGaWxlKCksIEltcG9ydEZsYWdzLkZvcmNlTmV3SW1wb3J0KTtcbiAgICBjb25zdCBuZ01vZHVsZVR5cGUgPSBuZXcgRXhwcmVzc2lvblR5cGUobmdNb2R1bGVFeHByKTtcbiAgICBjb25zdCBtd3BOZ1R5cGUgPSBuZXcgRXhwcmVzc2lvblR5cGUoXG4gICAgICAgIG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuTW9kdWxlV2l0aFByb3ZpZGVycyksIC8qIG1vZGlmaWVycyAqLyBudWxsLCBbbmdNb2R1bGVUeXBlXSk7XG5cbiAgICBkdHMuYWRkVHlwZVJlcGxhY2VtZW50KGRlY2wsIG13cE5nVHlwZSk7XG4gIH1cblxuICBwcml2YXRlIHJldHVyblR5cGVPZihkZWNsOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogUmV0dXJuVHlwZSB7XG4gICAgaWYgKGRlY2wudHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gUmV0dXJuVHlwZS5JTkZFUlJFRDtcbiAgICB9IGVsc2UgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlY2wudHlwZSkpIHtcbiAgICAgIHJldHVybiBSZXR1cm5UeXBlLk9USEVSO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byBmaWd1cmUgb3V0IGlmIHRoZSB0eXBlIGlzIG9mIGEgZmFtaWxpYXIgZm9ybSwgc29tZXRoaW5nIHRoYXQgbG9va3MgbGlrZSBpdCB3YXNcbiAgICAvLyBpbXBvcnRlZC5cbiAgICBsZXQgdHlwZUlkOiB0cy5JZGVudGlmaWVyO1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC50eXBlLnR5cGVOYW1lKSkge1xuICAgICAgLy8gZGVmOiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAgICB0eXBlSWQgPSBkZWNsLnR5cGUudHlwZU5hbWU7XG4gICAgfSBlbHNlIGlmICh0cy5pc1F1YWxpZmllZE5hbWUoZGVjbC50eXBlLnR5cGVOYW1lKSAmJiB0cy5pc0lkZW50aWZpZXIoZGVjbC50eXBlLnR5cGVOYW1lLmxlZnQpKSB7XG4gICAgICAvLyBkZWY6IGkwLk1vZHVsZVdpdGhQcm92aWRlcnNcbiAgICAgIHR5cGVJZCA9IGRlY2wudHlwZS50eXBlTmFtZS5yaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFJldHVyblR5cGUuT1RIRVI7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuaG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUlkKTtcbiAgICBpZiAoaW1wb3J0RGVjbCA9PT0gbnVsbCB8fCBpbXBvcnREZWNsLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJyB8fFxuICAgICAgICBpbXBvcnREZWNsLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIFJldHVyblR5cGUuT1RIRVI7XG4gICAgfVxuXG4gICAgaWYgKGRlY2wudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVjbC50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHR5cGUgaXMgaW5kZWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJ1dCBubyBnZW5lcmljIHR5cGUgcGFyYW1ldGVyIHdhcyBmb3VuZC5cbiAgICAgIHJldHVybiBSZXR1cm5UeXBlLk1XUF9OT19UWVBFO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHR5cGUgaXMgTW9kdWxlV2l0aFByb3ZpZGVycywgYW5kIHRoZSB1c2VyIGhhcyBhbHJlYWR5IHNwZWNpZmllZCBhIGdlbmVyaWMgdHlwZS5cbiAgICAgIHJldHVybiBSZXR1cm5UeXBlLk1XUF9XSVRIX1RZUEU7XG4gICAgfVxuICB9XG59XG5cbmVudW0gUmV0dXJuVHlwZSB7XG4gIElORkVSUkVELFxuICBNV1BfTk9fVFlQRSxcbiAgTVdQX1dJVEhfVFlQRSxcbiAgT1RIRVIsXG59XG5cbi8qKiBXaGV0aGVyIHRoZSByZXNvbHZlZCB2YWx1ZSBtYXAgcmVwcmVzZW50cyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0ICovXG5mdW5jdGlvbiBpc01vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHZhbHVlOiBSZXNvbHZlZFZhbHVlTWFwKTogYm9vbGVhbiB7XG4gIGNvbnN0IG5nTW9kdWxlID0gdmFsdWUuaGFzKCduZ01vZHVsZScpO1xuICBjb25zdCBwcm92aWRlcnMgPSB2YWx1ZS5oYXMoJ3Byb3ZpZGVycycpO1xuXG4gIHJldHVybiBuZ01vZHVsZSAmJiAodmFsdWUuc2l6ZSA9PT0gMSB8fCAocHJvdmlkZXJzICYmIHZhbHVlLnNpemUgPT09IDIpKTtcbn1cblxuZnVuY3Rpb24gaXNTdGF0aWMobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG59XG4iXX0=