/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ExpressionType, ExternalExpr, R3Identifiers as Identifiers } from '@angular/compiler';
import * as ts from 'typescript';
import { ImportFlags, Reference } from '../../imports';
export class ModuleWithProvidersScanner {
    constructor(host, evaluator, emitter) {
        this.host = host;
        this.evaluator = evaluator;
        this.emitter = emitter;
    }
    scan(sf, dts) {
        for (const stmt of sf.statements) {
            this.visitStatement(dts, stmt);
        }
    }
    visitStatement(dts, stmt) {
        // Detect whether a statement is exported, which is used as one of the hints whether to look
        // more closely at possible MWP functions within. This is a syntactic check, not a semantic
        // check, so it won't detect cases like:
        //
        // var X = ...;
        // export {X}
        //
        // This is intentional, because the alternative is slow and this will catch 99% of the cases we
        // need to handle.
        const isExported = stmt.modifiers !== undefined &&
            stmt.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
        if (!isExported) {
            return;
        }
        if (ts.isClassDeclaration(stmt)) {
            for (const member of stmt.members) {
                if (!ts.isMethodDeclaration(member) || !isStatic(member)) {
                    continue;
                }
                this.visitFunctionOrMethodDeclaration(dts, member);
            }
        }
        else if (ts.isFunctionDeclaration(stmt)) {
            this.visitFunctionOrMethodDeclaration(dts, stmt);
        }
    }
    visitFunctionOrMethodDeclaration(dts, decl) {
        // First, some sanity. This should have a method body with a single return statement.
        if (decl.body === undefined || decl.body.statements.length !== 1) {
            return;
        }
        const retStmt = decl.body.statements[0];
        if (!ts.isReturnStatement(retStmt) || retStmt.expression === undefined) {
            return;
        }
        const retValue = retStmt.expression;
        // Now, look at the return type of the method. Maybe bail if the type is already marked, or if
        // it's incompatible with a MWP function.
        const returnType = this.returnTypeOf(decl);
        if (returnType === ReturnType.OTHER || returnType === ReturnType.MWP_WITH_TYPE) {
            // Don't process this declaration, it either already declares the right return type, or an
            // incompatible one.
            return;
        }
        const value = this.evaluator.evaluate(retValue);
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
        const ngModule = value.get('ngModule');
        if (!(ngModule instanceof Reference) || !ts.isClassDeclaration(ngModule.node)) {
            return;
        }
        const ngModuleExpr = this.emitter.emit(ngModule, decl.getSourceFile(), ImportFlags.ForceNewImport);
        const ngModuleType = new ExpressionType(ngModuleExpr.expression);
        const mwpNgType = new ExpressionType(new ExternalExpr(Identifiers.ModuleWithProviders), [ /* modifiers */], [ngModuleType]);
        dts.addTypeReplacement(decl, mwpNgType);
    }
    returnTypeOf(decl) {
        if (decl.type === undefined) {
            return ReturnType.INFERRED;
        }
        else if (!ts.isTypeReferenceNode(decl.type)) {
            return ReturnType.OTHER;
        }
        // Try to figure out if the type is of a familiar form, something that looks like it was
        // imported.
        let typeId;
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
        const importDecl = this.host.getImportOfIdentifier(typeId);
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
    }
}
var ReturnType;
(function (ReturnType) {
    ReturnType[ReturnType["INFERRED"] = 0] = "INFERRED";
    ReturnType[ReturnType["MWP_NO_TYPE"] = 1] = "MWP_NO_TYPE";
    ReturnType[ReturnType["MWP_WITH_TYPE"] = 2] = "MWP_WITH_TYPE";
    ReturnType[ReturnType["OTHER"] = 3] = "OTHER";
})(ReturnType || (ReturnType = {}));
/** Whether the resolved value map represents a ModuleWithProviders object */
function isModuleWithProvidersType(value) {
    const ngModule = value.has('ngModule');
    const providers = value.has('providers');
    return ngModule && (value.size === 1 || (providers && value.size === 2));
}
function isStatic(node) {
    return node.modifiers !== undefined &&
        node.modifiers.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvbW9kdWxld2l0aHByb3ZpZGVycy9zcmMvc2Nhbm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsY0FBYyxFQUFFLFlBQVksRUFBRSxhQUFhLElBQUksV0FBVyxFQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDbkcsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFakMsT0FBTyxFQUFDLFdBQVcsRUFBRSxTQUFTLEVBQW1CLE1BQU0sZUFBZSxDQUFDO0FBUXZFLE1BQU0sT0FBTywwQkFBMEI7SUFDckMsWUFDWSxJQUFvQixFQUFVLFNBQTJCLEVBQ3pELE9BQXlCO1FBRHpCLFNBQUksR0FBSixJQUFJLENBQWdCO1FBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7UUFDekQsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7SUFBRyxDQUFDO0lBRXpDLElBQUksQ0FBQyxFQUFpQixFQUFFLEdBQWU7UUFDckMsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2hDO0lBQ0gsQ0FBQztJQUVPLGNBQWMsQ0FBQyxHQUFlLEVBQUUsSUFBa0I7UUFDeEQsNEZBQTRGO1FBQzVGLDJGQUEyRjtRQUMzRix3Q0FBd0M7UUFDeEMsRUFBRTtRQUNGLGVBQWU7UUFDZixhQUFhO1FBQ2IsRUFBRTtRQUNGLCtGQUErRjtRQUMvRixrQkFBa0I7UUFDbEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQzNDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFD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QUksSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDakYsMEZBQTBGO1lBQzFGLE9BQU8sVUFBVSxDQUFDLFdBQVcsQ0FBQztTQUMvQjthQUFNO1lBQ0wsNkZBQTZGO1lBQzdGLE9BQU8sVUFBVSxDQUFDLGFBQWEsQ0FBQztTQUNqQztJQUNILENBQUM7Q0FDRjtBQUVELElBQUssVUFLSjtBQUxELFdBQUssVUFBVTtJQUNiLG1EQUFRLENBQUE7SUFDUix5REFBVyxDQUFBO0lBQ1gsNkRBQWEsQ0FBQTtJQUNiLDZDQUFLLENBQUE7QUFDUCxDQUFDLEVBTEksVUFBVSxLQUFWLFVBQVUsUUFLZDtBQUVELDZFQUE2RTtBQUM3RSxTQUFTLHlCQUF5QixDQUFDLEtBQXVCO0lBQ3hELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdkMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUV6QyxPQUFPLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsSUFBYTtJQUM3QixPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUztRQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMzRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvblR5cGUsIEV4dGVybmFsRXhwciwgUjNJZGVudGlmaWVycyBhcyBJZGVudGlmaWVycywgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW1wb3J0RmxhZ3MsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5leHBvcnQgaW50ZXJmYWNlIER0c0hhbmRsZXIge1xuICBhZGRUeXBlUmVwbGFjZW1lbnQobm9kZTogdHMuRGVjbGFyYXRpb24sIHR5cGU6IFR5cGUpOiB2b2lkO1xufVxuXG5leHBvcnQgY2xhc3MgTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBlbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyKSB7fVxuXG4gIHNjYW4oc2Y6IHRzLlNvdXJjZUZpbGUsIGR0czogRHRzSGFuZGxlcik6IHZvaWQge1xuICAgIGZvciAoY29uc3Qgc3RtdCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgICB0aGlzLnZpc2l0U3RhdGVtZW50KGR0cywgc3RtdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFN0YXRlbWVudChkdHM6IER0c0hhbmRsZXIsIHN0bXQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIC8vIERldGVjdCB3aGV0aGVyIGEgc3RhdGVtZW50IGlzIGV4cG9ydGVkLCB3aGljaCBpcyB1c2VkIGFzIG9uZSBvZiB0aGUgaGludHMgd2hldGhlciB0byBsb29rXG4gICAgLy8gbW9yZSBjbG9zZWx5IGF0IHBvc3NpYmxlIE1XUCBmdW5jdGlvbnMgd2l0aGluLiBUaGlzIGlzIGEgc3ludGFjdGljIGNoZWNrLCBub3QgYSBzZW1hbnRpY1xuICAgIC8vIGNoZWNrLCBzbyBpdCB3b24ndCBkZXRlY3QgY2FzZXMgbGlrZTpcbiAgICAvL1xuICAgIC8vIHZhciBYID0gLi4uO1xuICAgIC8vIGV4cG9ydCB7WH1cbiAgICAvL1xuICAgIC8vIFRoaXMgaXMgaW50ZW50aW9uYWwsIGJlY2F1c2UgdGhlIGFsdGVybmF0aXZlIGlzIHNsb3cgYW5kIHRoaXMgd2lsbCBjYXRjaCA5OSUgb2YgdGhlIGNhc2VzIHdlXG4gICAgLy8gbmVlZCB0byBoYW5kbGUuXG4gICAgY29uc3QgaXNFeHBvcnRlZCA9IHN0bXQubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgc3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG5cbiAgICBpZiAoIWlzRXhwb3J0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICBmb3IgKGNvbnN0IG1lbWJlciBvZiBzdG10Lm1lbWJlcnMpIHtcbiAgICAgICAgaWYgKCF0cy5pc01ldGhvZERlY2xhcmF0aW9uKG1lbWJlcikgfHwgIWlzU3RhdGljKG1lbWJlcikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmlzaXRGdW5jdGlvbk9yTWV0aG9kRGVjbGFyYXRpb24oZHRzLCBtZW1iZXIpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICB0aGlzLnZpc2l0RnVuY3Rpb25Pck1ldGhvZERlY2xhcmF0aW9uKGR0cywgc3RtdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEZ1bmN0aW9uT3JNZXRob2REZWNsYXJhdGlvbihcbiAgICAgIGR0czogRHRzSGFuZGxlciwgZGVjbDogdHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25EZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIC8vIEZpcnN0LCBzb21lIHNhbml0eS4gVGhpcyBzaG91bGQgaGF2ZSBhIG1ldGhvZCBib2R5IHdpdGggYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudC5cbiAgICBpZiAoZGVjbC5ib2R5ID09PSB1bmRlZmluZWQgfHwgZGVjbC5ib2R5LnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJldFN0bXQgPSBkZWNsLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgICBpZiAoIXRzLmlzUmV0dXJuU3RhdGVtZW50KHJldFN0bXQpIHx8IHJldFN0bXQuZXhwcmVzc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJldFZhbHVlID0gcmV0U3RtdC5leHByZXNzaW9uO1xuXG4gICAgLy8gTm93LCBsb29rIGF0IHRoZSByZXR1cm4gdHlwZSBvZiB0aGUgbWV0aG9kLiBNYXliZSBiYWlsIGlmIHRoZSB0eXBlIGlzIGFscmVhZHkgbWFya2VkLCBvciBpZlxuICAgIC8vIGl0J3MgaW5jb21wYXRpYmxlIHdpdGggYSBNV1AgZnVuY3Rpb24uXG4gICAgY29uc3QgcmV0dXJuVHlwZSA9IHRoaXMucmV0dXJuVHlwZU9mKGRlY2wpO1xuICAgIGlmIChyZXR1cm5UeXBlID09PSBSZXR1cm5UeXBlLk9USEVSIHx8IHJldHVyblR5cGUgPT09IFJldHVyblR5cGUuTVdQX1dJVEhfVFlQRSkge1xuICAgICAgLy8gRG9uJ3QgcHJvY2VzcyB0aGlzIGRlY2xhcmF0aW9uLCBpdCBlaXRoZXIgYWxyZWFkeSBkZWNsYXJlcyB0aGUgcmlnaHQgcmV0dXJuIHR5cGUsIG9yIGFuXG4gICAgICAvLyBpbmNvbXBhdGlibGUgb25lLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmV0VmFsdWUpO1xuICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgTWFwKSB8fCAhdmFsdWUuaGFzKCduZ01vZHVsZScpKSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHZhbHVlIGRvZXMgbm90IHByb3ZpZGUgc3VmZmljaWVudCBpbmZvcm1hdGlvbiB0byBiZSBhYmxlIHRvIGFkZCBhIGdlbmVyaWMgdHlwZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocmV0dXJuVHlwZSA9PT0gUmV0dXJuVHlwZS5JTkZFUlJFRCAmJiAhaXNNb2R1bGVXaXRoUHJvdmlkZXJzVHlwZSh2YWx1ZSkpIHtcbiAgICAgIC8vIFRoZSByZXR1cm4gdHlwZSBpcyBpbmZlcnJlZCBidXQgdGhlIHJldHVybmVkIG9iamVjdCBpcyBub3Qgb2YgdGhlIGNvcnJlY3Qgc2hhcGUsIHNvIHdlXG4gICAgICAvLyBzaG91bGRuJ3MgbW9kaWZ5IHRoZSByZXR1cm4gdHlwZSB0byBiZWNvbWUgYE1vZHVsZVdpdGhQcm92aWRlcnNgLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZSByZXR1cm4gdHlwZSBoYXMgYmVlbiB2ZXJpZmllZCB0byByZXByZXNlbnQgdGhlIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCB0eXBlLCBidXQgZWl0aGVyIHRoZVxuICAgIC8vIHJldHVybiB0eXBlIGlzIGluZmVycmVkIG9yIHRoZSBnZW5lcmljIHR5cGUgYXJndW1lbnQgaXMgbWlzc2luZy4gSW4gYm90aCBjYXNlcywgYSBuZXcgcmV0dXJuXG4gICAgLy8gdHlwZSBpcyBjcmVhdGVkIHdoZXJlIHRoZSBgbmdNb2R1bGVgIHR5cGUgaXMgaW5jbHVkZWQgYXMgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50LlxuICAgIGNvbnN0IG5nTW9kdWxlID0gdmFsdWUuZ2V0KCduZ01vZHVsZScpO1xuICAgIGlmICghKG5nTW9kdWxlIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5nTW9kdWxlLm5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGVFeHByID1cbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQobmdNb2R1bGUsIGRlY2wuZ2V0U291cmNlRmlsZSgpLCBJbXBvcnRGbGFncy5Gb3JjZU5ld0ltcG9ydCk7XG4gICAgY29uc3QgbmdNb2R1bGVUeXBlID0gbmV3IEV4cHJlc3Npb25UeXBlKG5nTW9kdWxlRXhwci5leHByZXNzaW9uKTtcbiAgICBjb25zdCBtd3BOZ1R5cGUgPSBuZXcgRXhwcmVzc2lvblR5cGUoXG4gICAgICAgIG5ldyBFeHRlcm5hbEV4cHIoSWRlbnRpZmllcnMuTW9kdWxlV2l0aFByb3ZpZGVycyksIFsvKiBtb2RpZmllcnMgKi9dLCBbbmdNb2R1bGVUeXBlXSk7XG5cbiAgICBkdHMuYWRkVHlwZVJlcGxhY2VtZW50KGRlY2wsIG13cE5nVHlwZSk7XG4gIH1cblxuICBwcml2YXRlIHJldHVyblR5cGVPZihkZWNsOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogUmV0dXJuVHlwZSB7XG4gICAgaWYgKGRlY2wudHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gUmV0dXJuVHlwZS5JTkZFUlJFRDtcbiAgICB9IGVsc2UgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGRlY2wudHlwZSkpIHtcbiAgICAgIHJldHVybiBSZXR1cm5UeXBlLk9USEVSO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byBmaWd1cmUgb3V0IGlmIHRoZSB0eXBlIGlzIG9mIGEgZmFtaWxpYXIgZm9ybSwgc29tZXRoaW5nIHRoYXQgbG9va3MgbGlrZSBpdCB3YXNcbiAgICAvLyBpbXBvcnRlZC5cbiAgICBsZXQgdHlwZUlkOiB0cy5JZGVudGlmaWVyO1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC50eXBlLnR5cGVOYW1lKSkge1xuICAgICAgLy8gZGVmOiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAgICB0eXBlSWQgPSBkZWNsLnR5cGUudHlwZU5hbWU7XG4gICAgfSBlbHNlIGlmICh0cy5pc1F1YWxpZmllZE5hbWUoZGVjbC50eXBlLnR5cGVOYW1lKSAmJiB0cy5pc0lkZW50aWZpZXIoZGVjbC50eXBlLnR5cGVOYW1lLmxlZnQpKSB7XG4gICAgICAvLyBkZWY6IGkwLk1vZHVsZVdpdGhQcm92aWRlcnNcbiAgICAgIHR5cGVJZCA9IGRlY2wudHlwZS50eXBlTmFtZS5yaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFJldHVyblR5cGUuT1RIRVI7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuaG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUlkKTtcbiAgICBpZiAoaW1wb3J0RGVjbCA9PT0gbnVsbCB8fCBpbXBvcnREZWNsLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJyB8fFxuICAgICAgICBpbXBvcnREZWNsLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIFJldHVyblR5cGUuT1RIRVI7XG4gICAgfVxuXG4gICAgaWYgKGRlY2wudHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgZGVjbC50eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHR5cGUgaXMgaW5kZWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJ1dCBubyBnZW5lcmljIHR5cGUgcGFyYW1ldGVyIHdhcyBmb3VuZC5cbiAgICAgIHJldHVybiBSZXR1cm5UeXBlLk1XUF9OT19UWVBFO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHR5cGUgaXMgTW9kdWxlV2l0aFByb3ZpZGVycywgYW5kIHRoZSB1c2VyIGhhcyBhbHJlYWR5IHNwZWNpZmllZCBhIGdlbmVyaWMgdHlwZS5cbiAgICAgIHJldHVybiBSZXR1cm5UeXBlLk1XUF9XSVRIX1RZUEU7XG4gICAgfVxuICB9XG59XG5cbmVudW0gUmV0dXJuVHlwZSB7XG4gIElORkVSUkVELFxuICBNV1BfTk9fVFlQRSxcbiAgTVdQX1dJVEhfVFlQRSxcbiAgT1RIRVIsXG59XG5cbi8qKiBXaGV0aGVyIHRoZSByZXNvbHZlZCB2YWx1ZSBtYXAgcmVwcmVzZW50cyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0ICovXG5mdW5jdGlvbiBpc01vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHZhbHVlOiBSZXNvbHZlZFZhbHVlTWFwKTogYm9vbGVhbiB7XG4gIGNvbnN0IG5nTW9kdWxlID0gdmFsdWUuaGFzKCduZ01vZHVsZScpO1xuICBjb25zdCBwcm92aWRlcnMgPSB2YWx1ZS5oYXMoJ3Byb3ZpZGVycycpO1xuXG4gIHJldHVybiBuZ01vZHVsZSAmJiAodmFsdWUuc2l6ZSA9PT0gMSB8fCAocHJvdmlkZXJzICYmIHZhbHVlLnNpemUgPT09IDIpKTtcbn1cblxuZnVuY3Rpb24gaXNTdGF0aWMobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG59XG4iXX0=