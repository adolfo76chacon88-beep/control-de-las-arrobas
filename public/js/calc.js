// Cálculos puros (sin DOM). Dinero en CENTAVOS enteros: sin errores de redondeo.
(function (root, f) { if (typeof module === 'object') module.exports = f(); else root.Calc = f(); })(this, function () {
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const cents = p => Math.round(parseFloat(String(p).replace(',', '.')) * 100);
  // arrobas*precio + medias*(precio/2) = (2*arrobas + medias) * precio / 2 ; redondeo a centavo (igual que la BD)
  const money = (full, half, priceC) => Math.round(((2 * full + half) * priceC) / 2);
  const total = (full, half) => full + half * 0.5;
  const half = n => (n === 0 ? '0' : n === 1 ? '½' : n + '×½');
  const fmtC = c => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtD = d => fmtC(Math.round(Number(d) * 100));
  const dia = s => DIAS[new Date(s + 'T12:00:00').getDay()];
  return { cents, money, total, half, fmtC, fmtD, dia };
});
