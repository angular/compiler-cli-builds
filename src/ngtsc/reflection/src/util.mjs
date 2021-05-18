/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
export function isNamedClassDeclaration(node) {
    return ts.isClassDeclaration(node) && isIdentifier(node.name);
}
export function isNamedFunctionDeclaration(node) {
    return ts.isFunctionDeclaration(node) && isIdentifier(node.name);
}
export function isNamedVariableDeclaration(node) {
    return ts.isVariableDeclaration(node) && isIdentifier(node.name);
}
function isIdentifier(node) {
    return node !== undefined && ts.isIdentifier(node);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUdqQyxNQUFNLFVBQVUsdUJBQXVCLENBQUMsSUFBYTtJQUVuRCxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsSUFBYTtJQUV0RCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsSUFBYTtJQUV0RCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxJQUF1QjtJQUMzQyxPQUFPLElBQUksS0FBSyxTQUFTLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNyRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuL2hvc3QnO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNOYW1lZENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6XG4gICAgbm9kZSBpcyBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+IHtcbiAgcmV0dXJuIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSAmJiBpc0lkZW50aWZpZXIobm9kZS5uYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbjx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uPiB7XG4gIHJldHVybiB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgJiYgaXNJZGVudGlmaWVyKG5vZGUubmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTpcbiAgICBub2RlIGlzIENsYXNzRGVjbGFyYXRpb248dHMuVmFyaWFibGVEZWNsYXJhdGlvbj4ge1xuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmIGlzSWRlbnRpZmllcihub2RlLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBpc0lkZW50aWZpZXIobm9kZTogdHMuTm9kZXx1bmRlZmluZWQpOiBub2RlIGlzIHRzLklkZW50aWZpZXIge1xuICByZXR1cm4gbm9kZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihub2RlKTtcbn1cbiJdfQ==