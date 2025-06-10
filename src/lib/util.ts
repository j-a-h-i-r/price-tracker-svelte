export function formatPrice(price: number): string {
    // en-IN uses 1,23,456.00 format
    return Intl.NumberFormat('en-IN', 
        {
            style: 'currency',
            currency: 'BDT',
            currencyDisplay: 'narrowSymbol',
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
        }
    ).format(price)
}

export function keyValueToQueryString(obj: Record<string, string | number | boolean | undefined | null>): string {
    return Object.entries(obj)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}
