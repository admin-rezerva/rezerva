/**
 * Cálculo de precio público por estadía (canal SSR o fallback por defecto + promos en tarifa.metadata.promo).
 * Extraído de publicWebsiteService para mantener tamaño modular del archivo principal.
 */
const pool = require('../db/postgres');
const { obtenerValorDolar } = require('./dolarService');
const { differenceInDays, addDays, format } = require('date-fns');
const { precioNocheConPromoTarifa } = require('./promocionesDisplayService');
const { obtenerCanalSsrOPorDefecto } = require('./canalesService');

function _extraerPrecioCanal(tarifa, canalId, monedaCanal) {
    const precioBaseObj = tarifa?.precios?.[canalId];
    if (typeof precioBaseObj === 'number') return precioBaseObj;
    if (precioBaseObj && typeof precioBaseObj === 'object') {
        const valor = monedaCanal === 'USD' ? precioBaseObj.valorUSD : precioBaseObj.valorCLP;
        if (Number(valor) > 0) return Number(valor);
    }
    return Number(tarifa?.precioBase) || 0;
}

async function calculatePrice(_db, empresaId, items, startDate, endDate, allTarifas, valorDolarDiaOverride = null) {
    const canalPorDefecto = await obtenerCanalSsrOPorDefecto(empresaId, pool);
    if (!canalPorDefecto) throw new Error('No se ha configurado un canal SSR o canal por defecto.');

    const valorDolarDia = valorDolarDiaOverride ??
        (canalPorDefecto.moneda === 'USD' ? await obtenerValorDolar(_db, empresaId, startDate) : null);

    const totalNights = differenceInDays(endDate, startDate);
    if (totalNights <= 0) {
        return {
            totalPriceCLP: 0,
            totalPriceOriginal: 0,
            totalPrecioListaCLP: 0,
            totalDescuentoPromoCLP: 0,
            promoEtiqueta: null,
            currencyOriginal: canalPorDefecto.moneda,
            valorDolarDia,
            nights: 0,
            details: [],
        };
    }

    let totalPrecioEnMonedaDefecto = 0;
    let totalListaEnMonedaDefecto = 0;
    let promoEtiqueta = null;
    const priceDetails = [];
    const llegStr = format(startDate, 'yyyy-MM-dd');
    const salStr = format(endDate, 'yyyy-MM-dd');
    const monedaCanal = canalPorDefecto.moneda === 'USD' ? 'USD' : 'CLP';

    for (const prop of items) {
        let propPrecioBaseTotal = 0;
        for (let d = new Date(startDate); d < endDate; d = addDays(d, 1)) {
            const currentDate = new Date(d);
            const tarifasDelDia = allTarifas.filter(t =>
                t.alojamientoId === prop.id && t.fechaInicio <= currentDate && t.fechaTermino >= currentDate
            );
            if (tarifasDelDia.length > 0) {
                const tarifa = tarifasDelDia.sort((a, b) => b.fechaInicio - a.fechaInicio)[0];
                const base = _extraerPrecioCanal(tarifa, canalPorDefecto.id, monedaCanal);
                totalListaEnMonedaDefecto += base;
                const conPromo = precioNocheConPromoTarifa(base, tarifa.metadata?.promo, llegStr, salStr);
                propPrecioBaseTotal += conPromo;
                if (base > conPromo && !promoEtiqueta) {
                    const lab = tarifa.metadata?.promo?.etiqueta;
                    promoEtiqueta = (lab && String(lab).trim())
                        ? String(lab).trim().slice(0, 60)
                        : 'Oferta';
                }
            }
        }
        totalPrecioEnMonedaDefecto += propPrecioBaseTotal;
        priceDetails.push({
            nombre: prop.nombre, id: prop.id,
            precioTotal: propPrecioBaseTotal,
            precioPorNoche: totalNights > 0 ? propPrecioBaseTotal / totalNights : 0,
        });
    }

    let totalPriceCLP = totalPrecioEnMonedaDefecto;
    let totalListaCLP = totalListaEnMonedaDefecto;
    if (canalPorDefecto.moneda === 'USD') {
        if (valorDolarDia === null || valorDolarDia <= 0) {
            return {
                totalPriceCLP: 0,
                totalPriceOriginal: totalPrecioEnMonedaDefecto,
                totalPrecioListaCLP: 0,
                totalDescuentoPromoCLP: 0,
                promoEtiqueta,
                currencyOriginal: canalPorDefecto.moneda,
                valorDolarDia,
                nights: totalNights,
                details: priceDetails,
                error: 'Missing dollar value',
            };
        }
        totalPriceCLP = totalPrecioEnMonedaDefecto * valorDolarDia;
        totalListaCLP = totalListaEnMonedaDefecto * valorDolarDia;
    }

    const totalPriceRounded = Math.round(totalPriceCLP);
    const totalListaRounded = Math.round(totalListaCLP);
    const totalDescuentoPromoCLP = Math.max(0, totalListaRounded - totalPriceRounded);

    return {
        totalPriceCLP: totalPriceRounded,
        totalPriceOriginal: totalPrecioEnMonedaDefecto,
        totalPrecioListaCLP: totalListaRounded,
        totalDescuentoPromoCLP,
        promoEtiqueta: totalDescuentoPromoCLP > 0 ? promoEtiqueta : null,
        currencyOriginal: canalPorDefecto.moneda,
        valorDolarDia,
        nights: totalNights,
        details: priceDetails,
    };
}

module.exports = { calculatePrice };
