import * as ts from 'typescript';
import { Program } from './api';
export declare function getAngularEmitterTransformFactory(program: Program): () => (sourceFile: ts.SourceFile) => ts.SourceFile;
