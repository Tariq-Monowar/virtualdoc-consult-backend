import { IStorage } from './iStorage';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { DiskOption } from '../Option';
import path from 'path';

/**
 * LocalAdapter for local file storage
 */
export class LocalAdapter implements IStorage {
  private _config: DiskOption;

  constructor(config: DiskOption) {
    this._config = config;
  }

  /**
   * returns file url
   * @param key
   * @returns
   */
  url(key: string): string {
    return `${process.env.APP_URL}${this._config.connection.publicUrl}${key}`;
  }

  /**
   * check if file exists
   * @param key
   * @returns
   */
  async isExists(key: string): Promise<boolean> {
    try {
      if (fsSync.existsSync(`${this._config.connection.rootUrl}/${key}`)) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  /**
   * get data
   * @param key
   */
  async get(key: string) {
    try {
      const data = await fs.readFile(
        `${this._config.connection.rootUrl}/${key}`,
        {
          encoding: 'utf8',
        },
      );
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * put data
   * @param key
   * @param value
   */
  async put(key: string, value: any) {
    try {
      const filePath = path.join(this._config.connection.rootUrl, key);
      const dirPath = path.dirname(filePath);
      // console.log('Storage Put Operation:', {
      //   rootUrl: this._config.connection.rootUrl,
      //   key: key,
      //   filePath: filePath,
      //   dirPath: dirPath,
      //   valueType: typeof value,
      //   valueSize:
      //     value instanceof Buffer ? value.length : String(value).length,
      // });
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, value);
      console.log('File successfully written to:', filePath);
    } catch (err) {
      console.error('Error in LocalAdapter.put:', {
        error: err.message,
        stack: err.stack,
        key: key,
        rootUrl: this._config.connection.rootUrl,
      });
    }
  }
  /**
   * delete data
   * @param key
   */
  async delete(key: string) {
    await fs.unlink(`${this._config.connection.rootUrl}/${key}`);
  }

  /**
   * list files in directory
   * @param prefix directory prefix to list
   * @returns Promise<string[]> array of file paths
   */
  async list(prefix: string = ''): Promise<string[]> {
    try {
      const basePath = path.join(this._config.connection.rootUrl, prefix);
      const files: string[] = [];

      async function walkDir(currentPath: string, basePrefix: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.join(basePrefix, entry.name);
          
          if (entry.isDirectory()) {
            await walkDir(fullPath, relativePath);
          } else {
            files.push(relativePath.replace(/\\/g, '/'));
          }
        }
      }

      await walkDir(basePath, prefix);
      return files;
    } catch (error) {
      console.error('Error in LocalAdapter.list:', {
        error: error.message,
        stack: error.stack,
        prefix: prefix,
        rootUrl: this._config.connection.rootUrl,
      });
      return [];
    }
  }
}
