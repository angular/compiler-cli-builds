/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { MetadataObject, MetadataValue } from '../metadata/index';
import { MetadataTransformer, ValueTransform } from './metadata_cache';
export declare type ResourceLoader = {
    loadResource(path: string): Promise<string> | string;
};
export declare class InlineResourcesMetadataTransformer implements MetadataTransformer {
    private host;
    constructor(host: ResourceLoader);
    start(sourceFile: ts.SourceFile): ValueTransform | undefined;
    inlineResource(url: MetadataValue): string | undefined;
    updateDecoratorMetadata(arg: MetadataObject): MetadataObject;
}
export declare function getInlineResourcesTransformFactory(program: ts.Program, host: ResourceLoader): ts.TransformerFactory<ts.SourceFile>;
