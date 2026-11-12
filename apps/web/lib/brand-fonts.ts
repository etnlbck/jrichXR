import {
  Archivo,
  Cormorant_Garamond,
  DM_Serif_Display,
  Inter,
  Playfair_Display,
  Space_Grotesk,
} from 'next/font/google';

// preload: false keeps unused faces off the network; only the font a page
// actually renders gets downloaded.
const inter = Inter({ subsets: ['latin'], preload: false, variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  preload: false,
  variable: '--font-space-grotesk',
});
const archivo = Archivo({ subsets: ['latin'], preload: false, variable: '--font-archivo' });
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  preload: false,
  variable: '--font-dm-serif',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  preload: false,
  variable: '--font-playfair',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  preload: false,
  variable: '--font-cormorant',
});

/** Class names that define every `--font-*` variable; put on <html>. */
export const brandFontVariables = [
  inter.variable,
  spaceGrotesk.variable,
  archivo.variable,
  dmSerif.variable,
  playfair.variable,
  cormorant.variable,
].join(' ');
