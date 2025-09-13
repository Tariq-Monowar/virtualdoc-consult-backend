import appConfig from 'src/config/app.config';

/**
 * IAdapter interface
 */
export interface IStorage {
  /**
   * check if file exists
   * @param key
   */
  isExists(key: string): Promise<boolean>;

  /**
   * read data
   * @param key
   */
  get(key: string): Promise<any>;

  /**
   * get file url
   * @param key
   */
  url(key: string): string;

  /**
   * put data
   * @param key
   * @param value
   */
  put(key: string, value: any): Promise<any>;

  /**
   * delete data
   * @param key
   */
  delete(key: string): Promise<any>;

  /**
   * list files in directory
   * @param prefix directory prefix to list
   * @returns Promise<string[]> array of file paths
   */
  list(prefix?: string): Promise<string[]>;
}
export const STRIPE_WEBHOOK_SECRET = appConfig().payment.stripe.webhook_secret;
