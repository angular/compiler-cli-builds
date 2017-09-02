/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CollectorOptions, ModuleMetadata } from '@angular/tsc-wrapped';
import * as ts from 'typescript';
export interface LoweringRequest {
    kind: ts.SyntaxKind;
    location: number;
    end: number;
    name: string;
}
export declare type RequestLocationMap = Map<number, LoweringRequest>;
export declare function getExpressionLoweringTransformFactory(requestsMap: RequestsMap): (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => ts.SourceFile;
export interface RequestsMap {
    getRequests(sourceFile: ts.SourceFile): RequestLocationMap;
}
export declare class LowerMetadataCache implements RequestsMap {
    private strict;
    private collector;
    private metadataCache;
    constructor(options: CollectorOptions, strict?: boolean);
    getMetadata(sourceFile: ts.SourceFile): ModuleMetadata | undefined;
    getRequests(sourceFile: ts.SourceFile): RequestLocationMap;
    private ensureMetadataAndRequests(sourceFile);
    private getMetadataAndRequests(sourceFile);
}
