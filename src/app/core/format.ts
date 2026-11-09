export const num = (v: number) => String(v).replace('.', ',');
export const money = (n: number) => Math.round(n).toLocaleString('cs-CZ').replace(/ | |,/g, ' ') + ' Kč';
export const dim = (L: number, W: number) => `${num(W)} × ${num(L)} m`;
