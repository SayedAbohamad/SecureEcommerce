export interface GenerateProductContentRequest {
  name: string;
  categoryName?: string;
  price?: number;
  specs?: string;
  existingDescription?: string;
}

export interface GeneratedProductSpec {
  key: string;
  value: string;
}

export interface GeneratedProductContent {
  description: string;
  shortSeoDescription: string;
  highlights: string[];
  suggestedTags: string[];
  specifications: GeneratedProductSpec[];
  provider: string;
}
