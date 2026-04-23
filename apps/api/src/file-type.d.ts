declare module 'file-type' {
  export interface FileTypeResult {
    ext: string;
    mime: string;
  }

  export function fileTypeFromBuffer(
    buffer: ArrayBuffer | Uint8Array,
  ): Promise<FileTypeResult | undefined>;

  export function fileTypeFromStream(
    stream: ReadableStream,
  ): Promise<FileTypeResult | undefined>;
}
