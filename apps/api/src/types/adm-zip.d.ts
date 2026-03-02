// Type declarations for adm-zip
declare module 'adm-zip' {
  class AdmZip {
    constructor(filePath?: string);
    getEntries(): Array<{
      entryName: string;
      getData(): Buffer;
    }>;
    extractAllTo(targetPath: string, overwrite?: boolean): void;
  }
  export = AdmZip;
}
