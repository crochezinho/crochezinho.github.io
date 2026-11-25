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

def cachinhos(seed, W, raio, op, op_sombra, blur, larg):
    """Felpudo: cachinhos de pelúcia (arcos abertos), com sombra de leve embaixo, tudo desfocado."""
    random.seed(seed)
    pts, luz, sombra = [], [], []
    for _ in range(3000):
        x, y, r = random.uniform(0, W), random.uniform(0, W), random.uniform(*raio)
        if all(min(abs(x-a), W-abs(x-a))**2 + min(abs(y-b), W-abs(y-b))**2 >= (r+rb-.6)**2 for a, b, rb in pts):
            pts.append((x, y, r))
    for x, y, r in pts:
        a0, ext = random.uniform(0, 360), random.uniform(220, 320)
        def arco(cx, cy):
            a1, a2 = math.radians(a0), math.radians(a0 + ext)
            return (f"M{cx+r*math.cos(a1):.1f} {cy+r*math.sin(a1):.1f}"
                    f"A{r:.1f} {r:.1f} 0 1 1 {cx+r*math.cos(a2):.1f} {cy+r*math.sin(a2):.1f}")
        sombra.append(f"<path d='{arco(x+.5, y+.8)}' stroke='#5a3a30' stroke-opacity='{op_sombra}' stroke-width='{larg*1.2:.2f}' fill='none' stroke-linecap='round'/>")
        luz.append(f"<path d='{arco(x, y)}' stroke='#fff' stroke-opacity='{op*random.uniform(.6,1):.2f}' stroke-width='{larg*random.uniform(.8,1.15):.2f}' fill='none' stroke-linecap='round'/>")
    filtro = f"<filter id='f' x='-10%' y='-10%' width='120%' height='120%'><feGaussianBlur stdDeviation='{blur}'/></filter>"
    return ladrilho(W, '', ''.join(sombra) + ''.join(luz), filtro=filtro)

def volume(seed, W, n, raio, op, blur):
    """Manchas de luz grandes e bem desfocadas, que dão a sensação de fofura por baixo dos cachinhos."""
    random.seed(seed)
    corpo = ''.join(f"<circle cx='{random.uniform(0, W):.1f}' cy='{random.uniform(0, W):.1f}' r='{random.uniform(*raio):.1f}' fill='#fff' fill-opacity='{op}'/>" for _ in range(n))
    filtro = f"<filter id='f' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='{blur}'/></filter>"
    return ladrilho(W, '', corpo, filtro=filtro)

FELPUDO = cachinhos(13, 48, (2.2, 3.4), .42, .1, .6, 1.4)
FELPUDO_VOLUME = volume(2, 64, 7, (6, 10), .15, 3.2)

saida = sys.argv[1]
open(saida, 'w', encoding='utf-8', newline='\n').write(
    '// Gerado por scripts/gerar-texturas.py (ladrilhos SVG com posições aleatórias fixas). Não editar à mão.\n'
    '// brilho: estrelinhas de 4 pontas arredondadas e bolinhas com halo, poucas e espalhadas;\n'
    '// felpudo: cachinhos de pelúcia desfocados (48 px) sobre manchas de luz bem suaves (64 px).\n'
    f'export const BRILHO = "{BRILHO}";\n\n'
    f'export const FELPUDO = "{FELPUDO}";\n\n'
    f'export const FELPUDO_VOLUME = "{FELPUDO_VOLUME}";\n')
print(len(BRILHO), len(FELPUDO), len(FELPUDO_VOLUME))
