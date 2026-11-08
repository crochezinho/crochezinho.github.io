"""Gera os ladrilhos SVG das texturas (brilho e felpudo). Uso: python scripts/gerar-texturas.py src/app/texturas.ts"""
import random, math, sys

def ladrilho(W, defs, corpo, filtro=''):
    uses = ''.join(f"<use href='#p' x='{dx}' y='{dy}'/>" for dx in (-W, 0, W) for dy in (-W, 0, W))
    g = f"<g filter='url(#f)'>{uses}</g>" if filtro else uses
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{W}'><defs>{filtro}{defs}"
           f"<g id='p'>{corpo}</g></defs>{g}</svg>")
    return 'data:image/svg+xml,' + svg.replace('#', '%23').replace('<', '%3C').replace('>', '%3E').replace('"', "'")

random.seed(5)
W = 64
def estrela(x, y, r):
    k = r * 0.28
    return (f"<path d='M{x} {y-r}C{x+k} {y-k} {x+k} {y-k} {x+r} {y}C{x+k} {y+k} {x+k} {y+k} {x} {y+r}"
            f"C{x-k} {y+k} {x-k} {y+k} {x-r} {y}C{x-k} {y-k} {x-k} {y-k} {x} {y-r}Z' fill='#fff' fill-opacity='.95'/>")
pontos = []
def livre(x, y, d):
    return all(math.hypot(x - a, y - b) >= d for a, b in pontos)
corpo = []
halo = "<radialGradient id='h'><stop offset='0' stop-color='#fff' stop-opacity='.85'/><stop offset='.45' stop-color='#fff' stop-opacity='.35'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></radialGradient>"
for r in (4.2, 3.4, 2.8):
    while True:
        x, y = round(random.uniform(6, W - 6), 1), round(random.uniform(6, W - 6), 1)
        if livre(x, y, 16): break
    pontos.append((x, y))
    sombra = estrela(x + .5, y + .7, r).replace("fill='#fff' fill-opacity='.95'", "fill='#5a3a30' fill-opacity='.18'")
    corpo.append(f"<circle cx='{x}' cy='{y}' r='{r*1.5:.1f}' fill='url(#h)' opacity='.6'/>" + sombra + estrela(x, y, r))
for i in range(9):
    while True:
        x, y = round(random.uniform(2, W - 2), 1), round(random.uniform(2, W - 2), 1)
        if livre(x, y, 8): break
    pontos.append((x, y))
    r = random.choice([1.1, 1.3, 1.6])
    cor = random.choice(['#fff', '#fff', '#fff3c4', '#ffe1ef'])
    corpo.append(f"<circle cx='{x}' cy='{y}' r='{r*2.2:.1f}' fill='url(#h)' opacity='.55'/><circle cx='{x+.4}' cy='{y+.5}' r='{r}' fill='#5a3a30' fill-opacity='.15'/><circle cx='{x}' cy='{y}' r='{r}' fill='{cor}'/>")
BRILHO = ladrilho(W, halo, ''.join(corpo))

random.seed(21)
W = 40
corpo = []
bolinhas = []
for i in range(400):
    x, y = random.uniform(0, W), random.uniform(0, W)
    r = random.uniform(2.6, 3.6)
    if all(min(abs(x-a), W-abs(x-a))**2 + min(abs(y-b), W-abs(y-b))**2 >= (r+rb-1.2)**2 for a, b, rb in bolinhas):
        bolinhas.append((x, y, r))
for x, y, r in bolinhas:
    corpo.append(f"<circle cx='{x+.7:.1f}' cy='{y+.9:.1f}' r='{r:.1f}' fill='#5a3a30' fill-opacity='.1'/>")
for x, y, r in bolinhas:
    corpo.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{r*.92:.1f}' fill='url(#b)'/>")
bola = "<radialGradient id='b' cx='.38' cy='.34' r='.7'><stop offset='0' stop-color='#fff' stop-opacity='.42'/><stop offset='.6' stop-color='#fff' stop-opacity='.1'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></radialGradient>"
FELPUDO = ladrilho(W, bola, ''.join(corpo), filtro="<filter id='f' x='-10%' y='-10%' width='120%' height='120%'><feGaussianBlur stdDeviation='.6'/></filter>")
print('bolinhas', len(bolinhas))

saida = sys.argv[1]
open(saida, 'w', encoding='utf-8', newline='\n').write(
    '// Gerado por scripts/gerar-texturas.py (ladrilhos SVG com posições aleatórias fixas). Não editar à mão.\n'
    '// brilho: estrelinhas de 4 pontas arredondadas e bolinhas com halo, poucas e espalhadas;\n'
    '// felpudo: bolinhas de pelúcia/bouclé, cada uma com sombra embaixo e luz em cima.\n'
    f'export const BRILHO = "{BRILHO}";\n\n'
    f'export const FELPUDO = "{FELPUDO}";\n')
print(len(BRILHO), len(FELPUDO))
