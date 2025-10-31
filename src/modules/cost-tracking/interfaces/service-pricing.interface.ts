export interface TokenPricing {
  input: number;
  output: number;
}

export interface ModelPricing {
  [model: string]: TokenPricing;
}

export interface ServicePricing {
  [key: string]: ModelPricing | number | any;
}

export interface CostCalculation {
  service: string;
  operation: string;
  amount: number;
  details: {
    tokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    duration?: number;
    storageBytes?: bigint;
    computeMinutes?: number;
    model?: string;
    provider?: string;
  };
}
