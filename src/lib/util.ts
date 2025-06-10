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
