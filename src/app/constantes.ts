export const CAPAS: { cor: string; nome: string }[] = [
  { cor: '#C98B86', nome: 'Rosa' },
  { cor: '#9CAB8A', nome: 'Verde' },
  { cor: '#D9A85E', nome: 'Amarelo' },
  { cor: '#B5A0C0', nome: 'Lilás' },
  { cor: '#F2E7DA', nome: 'Off-white' },
  { cor: '#C97B5A', nome: 'Terracota' },
  { cor: '#8FA9C4', nome: 'Azul' },
  { cor: '#8B6B5A', nome: 'Marrom' },
  { cor: '#A9A29C', nome: 'Cinza' },
  { cor: '#4A4340', nome: 'Preto' }
];

export const nomeDaCapa = (cor: string): string => CAPAS.find((c) => c.cor.toLowerCase() === cor.toLowerCase())?.nome ?? 'Outras';

export const TIPOS = ['Amigurumi', 'Roupa', 'Decoração', 'Acessório'];

export const AGULHAS = ['2 mm', '2,5 mm', '3 mm', '3,5 mm', '4 mm', '5 mm'];
