import AWS from 'aws-sdk';
import { IStorage } from './iStorage';
import { DiskOption } from '../Option';

/**
 * S3Adapter for s3 bucket storage
 */
export class S3Adapter implements IStorage {
  private _config: DiskOption;
  private s3: AWS.S3;

  constructor(config: DiskOption) {
    this._config = config;
    const awsConfig = {
      endpoint: this._config.connection.awsEndpoint,
      region: this._config.connection.awsDefaultRegion,
      credentials: {
        accessKeyId: this._config.connection.awsAccessKeyId,
        secretAccessKey: this._config.connection.awsSecretAccessKey,
      },
    };
    if (this._config.connection.minio) {
      // s3ForcePathStyle: true, // Required for MinIO
      awsConfig['s3ForcePathStyle'] = true;
    }
    this.s3 = new AWS.S3({
      ...awsConfig,
    });
  }

  /**
   * returns object url
   *
   * https://[bucketname].s3.[region].amazonaws.com/[object]
   * and for minio
   * http://[endpoint]/[bucketname]/[object]
   * @param key
   * @returns
   */

  url(key: string): string {
    if (this._config.connection.minio) {
      return `${this._config.connection.awsEndpoint}/${this._config.connection.awsBucket}/${key}`;
    }
    return `${this._config.connection.awsBucket}.s3.${this._config.connection.awsDefaultRegion}.amazonaws.com/${key}`;
  }

  /**
   * check if file exists
   * @param key
   * @returns
   */
  async isExists(key: string): Promise<boolean> {
    try {
      const params = { Bucket: this._config.connection.awsBucket, Key: key };
      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if ((error as AWS.AWSError).code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * get data
   * @param key
   */
  async get(key: string) {
    try {
      const params = { Bucket: this._config.connection.awsBucket, Key: key };
      const data = this.s3.getObject(params).createReadStream();
      return data;
    } catch (error) {
      throw new Error(`Failed to get object ${key}: ${error}`);
    }
  }

  /**
   * put data
   * @param key
   * @param value
   */
  async put(
    key: string,
    value: Buffer | Uint8Array | string,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    try {
      const params = {
        Bucket: this._config.connection.awsBucket,
        Key: key,
        Body: value,
      };
      const upload = await this.s3.upload(params).promise();
      return upload;
    } catch (error) {
      throw error;
    }
  }

  /**
   * delete data
   * @param key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const params = { Bucket: this._config.connection.awsBucket, Key: key };
      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      if ((error as AWS.AWSError).code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * list files in directory
   * @param prefix directory prefix to list
   * @returns Promise<string[]> array of file paths
   */
  async list(prefix: string = ''): Promise<string[]> {
    try {
      const files: string[] = [];
      let continuationToken: string | undefined;

      do {
        const params: AWS.S3.ListObjectsV2Request = {
          Bucket: this._config.connection.awsBucket,
          Prefix: prefix,
          ContinuationToken: continuationToken
        };

        const response = await this.s3.listObjectsV2(params).promise();
        
        if (response.Contents) {
          for (const object of response.Contents) {
            if (object.Key) {
              files.push(object.Key);
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return files;
    } catch (error) {
      console.error('Error in S3Adapter.list:', {
        error: (error as AWS.AWSError).message,
        code: (error as AWS.AWSError).code,
        prefix: prefix,
        bucket: this._config.connection.awsBucket,
      });
      return [];
    }
  }
}
