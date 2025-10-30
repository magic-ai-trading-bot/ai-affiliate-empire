declare module 'paapi5-nodejs-sdk' {
  export class ApiClient {
    static instance: ApiClient;
    accessKey: string;
    secretKey: string;
    host: string;
    region: string;
  }

  export class DefaultApi {
    searchItems(
      request: SearchItemsRequest,
      callback: (error: any, data: any) => void,
    ): void;
    getItems(request: GetItemsRequest, callback: (error: any, data: any) => void): void;
  }

  export class SearchItemsRequest {
    PartnerTag?: string;
    PartnerType?: string;
    Keywords?: string;
    SearchIndex?: string;
    ItemCount?: number;
    Resources?: string[];
  }

  export class GetItemsRequest {
    PartnerTag?: string;
    PartnerType?: string;
    ItemIds?: string[];
    Resources?: string[];
  }

  const ProductAdvertisingAPIv1: {
    ApiClient: typeof ApiClient;
    DefaultApi: typeof DefaultApi;
    SearchItemsRequest: typeof SearchItemsRequest;
    GetItemsRequest: typeof GetItemsRequest;
  };

  export default ProductAdvertisingAPIv1;
}
