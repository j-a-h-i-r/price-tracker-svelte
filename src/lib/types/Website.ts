export interface WebsiteStat {
    total_products: number;
    total_categories: number;
}

export interface Website {
    id: number;
    name: string;
    url: string;
}

export interface WebsiteWithStat extends Website {
    stat?: WebsiteStat;
    newProductsCount?: number;
}