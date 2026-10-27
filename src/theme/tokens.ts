export interface Tokens {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  correct: string;
  correctBg: string;
  wrong: string;
  wrongBg: string;
  selected: string;
  selectedBg: string;
  danger: string;
}

export const light: Tokens = {
  dark: false,
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  text: '#15181D',
  textMuted: '#5F6670',
  border: '#D9DDE3',
  primary: '#2463EB',
  onPrimary: '#FFFFFF',
  correct: '#1E8E4E',
  correctBg: '#E3F5EA',
  wrong: '#C93B32',
  wrongBg: '#FBE7E5',
  selected: '#2463EB',
  selectedBg: '#E6EEFD',
  danger: '#C93B32',
};

export const dark: Tokens = {
  dark: true,
  bg: '#101216',
  surface: '#1A1D23',
  surfaceAlt: '#242830',
  text: '#ECEEF1',
  textMuted: '#9AA1AB',
  border: '#323741',
  primary: '#6B9BFF',
  onPrimary: '#0B1220',
  correct: '#4CC27F',
  correctBg: '#14301F',
  wrong: '#F07167',
  wrongBg: '#3A1A18',
  selected: '#6B9BFF',
  selectedBg: '#1C2A47',
  danger: '#F07167',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12 };
