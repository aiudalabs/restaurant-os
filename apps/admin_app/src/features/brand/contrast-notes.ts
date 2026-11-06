import { AA_TEXT, NEUTRAL, contrast } from './theme';

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/**
 * Plain-Spanish note for the contrast guard, or null when the chosen color is used as is.
 * `adjusted` is what derivePalette() returns for that color (brand / accent): the customer
 * app applies the same adjustment, so the owner sees exactly what customers will see.
 */
export function explainColor(role: 'primary' | 'accent', chosen: string, adjusted: string): string | null {
  if (chosen.toUpperCase() === adjusted.toUpperCase()) return null;
  if (role === 'primary') {
    const ratio = fmt(contrast(chosen, NEUTRAL.white));
    return (
      `Con este color el texto blanco de los botones se lee mal (contraste ${ratio}, el mínimo es ${fmt(AA_TEXT)}). ` +
      `Para que tus clientes lean bien, lo oscurecemos un poco y queda ${adjusted.toUpperCase()}. ` +
      `Tu elección se guarda tal cual; el ajuste se aplica al mostrarla.`
    );
  }
  const ratio = fmt(contrast(chosen, NEUTRAL.ink));
  return (
    `Con este color el texto oscuro que va encima se lee mal (contraste ${ratio}, el mínimo es ${fmt(AA_TEXT)}). ` +
    `Para que tus clientes lean bien, lo aclaramos un poco y queda ${adjusted.toUpperCase()}. ` +
    `Tu elección se guarda tal cual; el ajuste se aplica al mostrarla.`
  );
}
