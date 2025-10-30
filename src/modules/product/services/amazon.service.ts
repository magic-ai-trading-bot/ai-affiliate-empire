import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ProductAdvertisingAPIv1 from 'paapi5-nodejs-sdk';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';

interface AmazonProduct {
  asin: string;
  title: string;
  description?: string;
  price: number;
  commission?: number;
  affiliateUrl: string;
  imageUrl?: string;
  category?: string;
  brand?: string;
}

interface SearchProductsParams {
  keywords?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

@Injectable()
export class AmazonService implements OnModuleInit {
  private client: any = null;
  private partnerTag: string = '';
  private readonly mockMode: boolean;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_MS = 1000; // 1 request per second

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
  ) {
    this.mockMode = this.config.get('AMAZON_MOCK_MODE') === 'true';
  }

  async onModuleInit() {
    if (this.mockMode) {
      console.warn('⚠️  Amazon PA-API running in MOCK MODE');
      return;
    }

    // Retrieve Amazon credentials from Secrets Manager
    const secrets = await this.secretsManager.getSecrets([
      { secretName: 'amazon-access-key', envVarName: 'AMAZON_ACCESS_KEY' },
      { secretName: 'amazon-secret-key', envVarName: 'AMAZON_SECRET_KEY' },
      { secretName: 'amazon-partner-tag', envVarName: 'AMAZON_PARTNER_TAG' },
    ]);

    const accessKey = secrets['amazon-access-key'];
    const secretKey = secrets['amazon-secret-key'];
    this.partnerTag = secrets['amazon-partner-tag'] || '';
    const region = this.config.get('AMAZON_REGION') || 'us-east-1';

    if (accessKey && secretKey && this.partnerTag) {
      const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
      defaultClient.accessKey = accessKey;
      defaultClient.secretKey = secretKey;
      defaultClient.host = `webservices.amazon.${region === 'us-east-1' ? 'com' : region}`;
      defaultClient.region = region;

      this.client = new ProductAdvertisingAPIv1.DefaultApi();
      console.log('✅ Amazon PA-API configured with credentials from Secrets Manager');
    } else {
      console.warn('⚠️  Amazon credentials not found, running in MOCK MODE');
    }
  }

  async searchProducts(params: SearchProductsParams): Promise<AmazonProduct[]> {
    if (!this.client || this.mockMode) {
      return this.getMockProducts(params.limit || 10);
    }

    await this.enforceRateLimit();

    const { keywords = 'trending', category, limit = 10 } = params;

    try {
      const searchItemsRequest = new ProductAdvertisingAPIv1.SearchItemsRequest();
      searchItemsRequest.PartnerTag = this.partnerTag;
      searchItemsRequest.PartnerType = 'Associates';
      searchItemsRequest.Keywords = keywords;
      searchItemsRequest.SearchIndex = category || 'All';
      searchItemsRequest.ItemCount = Math.min(limit, 10);
      searchItemsRequest.Resources = [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price',
        'ItemInfo.ByLineInfo',
      ];

      const response = await new Promise<any>((resolve, reject) => {
        this.client.searchItems(searchItemsRequest, (error: any, data: any) => {
          if (error) reject(error);
          else resolve(data);
        });
      });

      console.log(`✅ Amazon PA-API: Found ${response.SearchResult?.Items?.length || 0} products`);

      return this.mapResponseToProducts(response.SearchResult?.Items || []);
    } catch (error) {
      console.error('❌ Amazon PA-API error:', error);
      // Fallback to mock on error
      return this.getMockProducts(limit);
    }
  }

  async getProductByAsin(asin: string): Promise<AmazonProduct | null> {
    if (!this.client || this.mockMode) {
      return null;
    }

    await this.enforceRateLimit();

    try {
      const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
      getItemsRequest.PartnerTag = this.partnerTag;
      getItemsRequest.PartnerType = 'Associates';
      getItemsRequest.ItemIds = [asin];
      getItemsRequest.Resources = [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price',
        'ItemInfo.ByLineInfo',
      ];

      const response = await new Promise<any>((resolve, reject) => {
        this.client.getItems(getItemsRequest, (error: any, data: any) => {
          if (error) reject(error);
          else resolve(data);
        });
      });

      const items = this.mapResponseToProducts(response.ItemsResult?.Items || []);
      return items[0] || null;
    } catch (error) {
      console.error(`❌ Amazon PA-API error fetching ${asin}:`, error);
      return null;
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const delay = this.RATE_LIMIT_MS - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  private mapResponseToProducts(items: any[]): AmazonProduct[] {
    return items.map((item) => ({
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || 'Unknown',
      description: item.ItemInfo?.Features?.DisplayValues?.[0] || '',
      price: parseFloat(item.Offers?.Listings?.[0]?.Price?.Amount || '0'),
      commission: 4.0, // Default commission rate
      affiliateUrl: this.generateAffiliateUrl(item.ASIN),
      imageUrl: item.Images?.Primary?.Large?.URL || '',
      category: item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue || '',
      brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || '',
    }));
  }

  /**
   * Generate affiliate link with partner tag
   */
  generateAffiliateUrl(asin: string): string {
    return `https://www.amazon.com/dp/${asin}?tag=${this.partnerTag}`;
  }

  /**
   * Mock product data for development/testing
   */
  private getMockProducts(limit: number): AmazonProduct[] {
    const mockProducts: AmazonProduct[] = [
      {
        asin: 'B08N5WRWNW',
        title: 'Apple AirPods Pro (2nd Generation)',
        description: 'Active Noise Cancelling, Adaptive Transparency, Personalized Spatial Audio',
        price: 249.0,
        commission: 4.0,
        affiliateUrl: this.generateAffiliateUrl('B08N5WRWNW'),
        imageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
        category: 'Electronics',
        brand: 'Apple',
      },
      {
        asin: 'B0B3PSRHHN',
        title: 'Ninja BN701 Professional Plus Blender',
        description: '1400 Peak Watts, Auto-iQ, 72 oz Pitcher, 24 oz Smoothie Bowl',
        price: 129.99,
        commission: 8.0,
        affiliateUrl: this.generateAffiliateUrl('B0B3PSRHHN'),
        imageUrl: 'https://m.media-amazon.com/images/I/71Kn7XqP8xL._AC_SL1500_.jpg',
        category: 'Home & Kitchen',
        brand: 'Ninja',
      },
      {
        asin: 'B09B8RXYM8',
        title: 'Anker Portable Charger, 20,000mAh Power Bank',
        description: 'USB-C Fast Charging, PowerIQ Technology, for iPhone, Samsung',
        price: 49.99,
        commission: 6.0,
        affiliateUrl: this.generateAffiliateUrl('B09B8RXYM8'),
        imageUrl: 'https://m.media-amazon.com/images/I/61gZC-1HKML._AC_SL1500_.jpg',
        category: 'Electronics',
        brand: 'Anker',
      },
      {
        asin: 'B0BSHF7WHW',
        title: 'LANEIGE Lip Sleeping Mask - Berry',
        description: 'Overnight Lip Treatment, Moisturizes & Nourishes, 20g',
        price: 24.0,
        commission: 10.0,
        affiliateUrl: this.generateAffiliateUrl('B0BSHF7WHW'),
        imageUrl: 'https://m.media-amazon.com/images/I/71k5YAKkBVL._SL1500_.jpg',
        category: 'Beauty',
        brand: 'LANEIGE',
      },
      {
        asin: 'B0CX23V2ZK',
        title: 'Stanley Quencher H2.0 FlowState Tumbler 40oz',
        description: 'Vacuum Insulated Stainless Steel, Reusable Straw',
        price: 45.0,
        commission: 7.0,
        affiliateUrl: this.generateAffiliateUrl('B0CX23V2ZK'),
        imageUrl: 'https://m.media-amazon.com/images/I/71S4cZj7EyL._AC_SL1500_.jpg',
        category: 'Sports',
        brand: 'Stanley',
      },
      {
        asin: 'B09V3KXJPB',
        title: 'Logitech MX Master 3S Wireless Mouse',
        description: 'Quiet Clicks, 8K DPI, USB-C Charging, Bluetooth, Multi-Device',
        price: 99.99,
        commission: 5.0,
        affiliateUrl: this.generateAffiliateUrl('B09V3KXJPB'),
        imageUrl: 'https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg',
        category: 'Electronics',
        brand: 'Logitech',
      },
      {
        asin: 'B0CRX2D7KR',
        title: 'Molekule Air Mini+ Air Purifier',
        description: 'PECO Technology, Smart Particle Sensor, App Control',
        price: 499.99,
        commission: 6.0,
        affiliateUrl: this.generateAffiliateUrl('B0CRX2D7KR'),
        imageUrl: 'https://m.media-amazon.com/images/I/51sXN8H-eeL._AC_SL1200_.jpg',
        category: 'Home & Kitchen',
        brand: 'Molekule',
      },
      {
        asin: 'B0B2X2FX9J',
        title: 'Therabody TheraGun Prime Massage Gun',
        description: 'Percussive Therapy Device, 16mm Amplitude, 5 Speeds',
        price: 299.0,
        commission: 8.0,
        affiliateUrl: this.generateAffiliateUrl('B0B2X2FX9J'),
        imageUrl: 'https://m.media-amazon.com/images/I/51EKLh7UYAL._AC_SL1500_.jpg',
        category: 'Health & Fitness',
        brand: 'Therabody',
      },
    ];

    return mockProducts.slice(0, limit);
  }

  /**
   * Check if Amazon credentials are configured
   */
  isConfigured(): boolean {
    return !!this.client && !this.mockMode;
  }
}
