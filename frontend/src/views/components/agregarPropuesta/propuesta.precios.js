// frontend/src/views/components/agregarPropuesta/propuesta.precios.js
import { formatCurrency } from '../../../shared/formatters.js';
import { getCuponAplicado } from '../../../shared/cuponesValidator.js';
import { state } from './propuesta.state.js';

/**
 * Actualiza el resumen financiero en la UI basándose en el pricing actual y descuentos manuales.
 */
export function updateSummary(pricing) {
    if (!pricing) pricing = state.currentPricing; 
    state.currentPricing = pricing;
  
    const { totalPriceOriginal, currencyOriginal, nights, totalPriceCLP } = pricing;
    
    const summaryOriginalContainer = document.getElementById('summary-original-currency-container');
    const summaryCLPContainer = document.getElementById('summary-clp-container');
  
    const valorFinalFijoInput = document.getElementById('valor-final-fijo');
    const cuponInput = document.getElementById('cupon-input');
    const pctInput = document.getElementById('descuento-pct');
    const fijoInput = document.getElementById('descuento-fijo-total');
  
    let precioFinalEnMonedaOriginal = 0;
    let descuentoTotalEnMonedaOriginal = 0;
    
    const valorFijo = parseFloat(valorFinalFijoInput.value) || 0;
    const precioLista = totalPriceOriginal || 0;
  
    if (valorFijo > 0) {
      // Modo: Valor Final Fijo (Anula otros descuentos)
      [cuponInput, pctInput, fijoInput].forEach(input => { if(input) input.disabled = true; });
  
      precioFinalEnMonedaOriginal = valorFijo;
      
      if (precioFinalEnMonedaOriginal < precioLista) {
        descuentoTotalEnMonedaOriginal = precioLista - precioFinalEnMonedaOriginal;
      } else {
        descuentoTotalEnMonedaOriginal = 0;
      }
      
    } else {
      // Modo: Descuentos Acumulativos
      [cuponInput, pctInput, fijoInput].forEach(input => { if(input) input.disabled = false; });
  
      const pct = parseFloat(pctInput.value) || 0;
      const fijo = parseFloat(fijoInput.value) || 0;
      
      let descuentoManual = 0;
      if (pct > 0) {
          descuentoManual = precioLista * (pct / 100);
      } else if (fijo > 0) {
          descuentoManual = fijo;
      }
  
      const cuponAplicado = getCuponAplicado();
      const descuentoCupon = cuponAplicado ? precioLista * (cuponAplicado.porcentajeDescuento / 100) : 0;
      
      descuentoTotalEnMonedaOriginal = descuentoManual + descuentoCupon;
      precioFinalEnMonedaOriginal = precioLista - descuentoTotalEnMonedaOriginal;
    }
  
    // Conversión final a CLP
    const precioFinalCLP = currencyOriginal === 'USD' 
      ? Math.round(precioFinalEnMonedaOriginal * state.valorDolarDia) 
      : precioFinalEnMonedaOriginal;
    
    const descuentoTotalCLP = totalPriceCLP - precioFinalCLP;
  
    // Renderizado
    if (currencyOriginal !== 'CLP') {
      summaryOriginalContainer.classList.remove('hidden');
      summaryOriginalContainer.innerHTML = `
        <h4 class="mb-2 text-center text-sm font-bold text-primary-800">Valores en ${currencyOriginal}</h4>
        <div class="flex justify-between text-sm"><span class="text-gray-600">Precio de Lista:</span><span class="font-medium">${formatCurrency(precioLista, currencyOriginal)}</span></div>
        <div class="flex justify-between text-sm text-danger-600"><span class="font-medium">Descuento Total:</span><span class="font-medium">-${formatCurrency(descuentoTotalEnMonedaOriginal, currencyOriginal)}</span></div>
        <div class="mt-3 flex justify-between border-t border-primary-200 pt-3 text-base font-bold text-gray-900"><span>Total (${currencyOriginal})</span><span class="text-primary-600">${formatCurrency(precioFinalEnMonedaOriginal, currencyOriginal)}</span></div>
      `;
      summaryCLPContainer.classList.remove('md:col-span-2');
    } else {
      summaryOriginalContainer.classList.add('hidden');
      summaryOriginalContainer.innerHTML = '';
      summaryCLPContainer.classList.add('md:col-span-2');
    }
    
    summaryCLPContainer.innerHTML = `
      <h4 class="mb-2 text-center text-sm font-bold text-gray-800">Totales en CLP</h4>
      <div class="flex justify-between text-sm"><span class="text-gray-600">Noches Totales:</span><span id="summary-noches" class="font-medium text-gray-900">${nights || 0}</span></div>
      <div class="flex justify-between text-sm"><span class="text-gray-600">Precio Lista (CLP):</span><span id="summary-precio-lista-clp" class="font-medium text-gray-900">${formatCurrency(totalPriceCLP)}</span></div>
      <div class="flex justify-between text-sm text-danger-600"><span class="font-medium">Descuento Total (CLP):</span><span id="summary-descuento-total-clp" class="font-medium">-${formatCurrency(descuentoTotalCLP)}</span></div>
      <div class="mt-4 flex justify-between border-t border-gray-200 pt-3 text-xl font-bold text-gray-900"><span>Precio Final</span><span id="summary-precio-final" class="text-primary-600">${formatCurrency(precioFinalCLP)}</span></div>
    `;
}