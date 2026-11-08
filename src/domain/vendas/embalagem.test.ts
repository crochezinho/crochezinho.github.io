import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arranjos, escolherCaixaPadrao, estimarCaixa, estimarEnvelope, pesoCubico, recomendar, validarLimites, type Modalidade, type Nivel } from './embalagem.ts';

function igual(nome: string, obtido: unknown, esperado: unknown, tol = 1e-9) {
  if (Array.isArray(esperado)) {
    const o = obtido as number[];
    assert.ok(Array.isArray(o) && o.length === esperado.length && esperado.every((v, i) => Math.abs(o[i] - v) <= tol), `${nome}: esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`);
  } else if (typeof esperado === 'number') {
    assert.ok(Math.abs((obtido as number) - esperado) <= tol, `${nome}: esperado ${esperado}, obtido ${obtido}`);
  } else assert.equal(obtido, esperado, nome);
}

test('caixa sob medida', () => {
  const caixas: [string, number[], number, number, Nivel, string, number[], number[], number[], number, number, number, string][] = [
    ['A', [15, 10, 5], 300, 1, 'media', 'B', [15, 10, 5], [19.6, 14.6, 9.6], [20, 15, 10], 460, 500, 500, 'tamanho'],
    ['B', [15, 10, 5], 300, 4, 'media', 'C', [20, 15, 10], [24.8, 19.8, 14.8], [25, 20, 15], 1570, 1250, 1570, 'peso'],
    ['C', [8, 8, 8], 150, 1, 'alta', 'C', [8, 8, 8], [16.8, 16.8, 16.8], [17, 17, 17], 370, 819, 819, 'tamanho'],
    ['D', [40, 30, 20], 2500, 1, 'leve', 'C', [40, 30, 20], [42.8, 32.8, 22.8], [43, 33, 23], 3360, 5440, 5440, 'tamanho'],
    ['E', [5, 3, 2], 20, 1, 'nenhuma', 'B', [5, 3, 2], [16, 11, 3.6], [16, 11, 4], 130, 118, 130, 'peso']
  ];
  for (const [id, dims, pesoUn, qtd, protecao, onda, bloco, ext, cad, pc, cub, cons, manda] of caixas) {
    const o = estimarCaixa({ dims, pesoUn, qtd, protecao });
    igual(`${id} onda`, o.onda, onda);
    igual(`${id} arranjo`, o.conteudo, bloco);
    igual(`${id} externas`, o.externasFinais, ext, 1e-6);
    igual(`${id} cadastrar`, o.cadastrar, cad);
    igual(`${id} peso cadastrar`, o.pesos.cadastrar, pc);
    igual(`${id} peso cúbico`, o.cubico, cub);
    igual(`${id} considerado`, o.considerado, cons);
    igual(`${id} manda`, o.manda, manda);
  }
  const A = estimarCaixa({ dims: [15, 10, 5], pesoUn: 300, qtd: 1, protecao: 'media' });
  igual('A caixa', A.pesos.embalagem, 90.5, 0.05);
  igual('A bolha', A.pesos.bolha, 2.475, 1e-6);
  igual('A total', A.pesos.total, 408.0, 0.05);
  const B = estimarCaixa({ dims: [15, 10, 5], pesoUn: 300, qtd: 4, protecao: 'media' });
  igual('B caixa', B.pesos.embalagem, 198.9, 0.05);
  igual('B bolha', B.pesos.bolha, 5.85, 1e-6);
  igual('B total', B.pesos.total, 1419.7, 0.05);
  const E = estimarCaixa({ dims: [5, 3, 2], pesoUn: 20, qtd: 1, protecao: 'nenhuma' });
  igual('E caixa', E.pesos.embalagem, 43.7, 0.05);
  igual('E mínimo aplicado', E.minimoAplicado, true);
  igual('A fora de ordem', estimarCaixa({ dims: [5, 15, 10], pesoUn: 300, protecao: 'media' }).cadastrar, [20, 15, 10]);
});

test('envelopes', () => {
  const envelopes: [string, number[], number, number, Nivel, 'plastico' | 'bolha', number[], number[], number[], number, number, number][] = [
    ['F', [30, 25, 2], 200, 1, 'nenhuma', 'plastico', [30, 25, 2], [32, 40], [40, 32, 3], 270, 640, 640],
    ['G', [30, 25, 2], 200, 2, 'nenhuma', 'plastico', [30, 25, 4], [32, 40], [40, 32, 5], 470, 1067, 1067],
    ['H', [10, 6, 1], 30, 1, 'leve', 'bolha', [10, 6, 1], [14, 19], [19, 14, 2], 100, 89, 100],
    ['J', [5, 3, 2], 20, 1, 'nenhuma', 'plastico', [5, 3, 2], [12, 18], [18, 12, 3], 80, 108, 108]
  ];
  for (const [id, dims, pesoUn, qtd, protecao, tipo, bloco, env, cad, pc, cub, cons] of envelopes) {
    const o = estimarEnvelope({ dims, pesoUn, qtd, protecao }, tipo);
    igual(`${id} serve`, o.serve, true);
    igual(`${id} arranjo`, o.conteudo, bloco);
    igual(`${id} envelope`, [o.envelope!.l, o.envelope!.c], env);
    igual(`${id} cadastrar`, o.cadastrar, cad);
    igual(`${id} peso cadastrar`, o.pesos.cadastrar, pc);
    igual(`${id} peso cúbico`, o.cubico, cub);
    igual(`${id} considerado`, o.considerado, cons);
  }
  const G = estimarEnvelope({ dims: [30, 25, 2], pesoUn: 200, qtd: 2, protecao: 'nenhuma' }, 'plastico');
  const ladoALado = G.candidatos!.find((c) => c.cadastrar.join('x') === '60x50x3');
  igual('G lado a lado', ladoALado?.considerado, 1500);

  const entI = { dims: [30, 25, 2], pesoUn: 200, qtd: 3, protecao: 'nenhuma' as const };
  const I = estimarEnvelope(entI, 'plastico');
  igual('I não serve', I.serve, false);
  igual('I motivo', /empilhado passa de 5 cm e lado a lado não cabe/.test(I.motivo!), true);
  igual('I recomenda caixa', ['caixa', 'catalogo'].includes(recomendar(entI).recomendada!.tipo), true);

  const rJ = recomendar({ dims: [5, 3, 2], pesoUn: 20, qtd: 1, protecao: 'nenhuma' });
  igual('E/J envelope plástico', rJ.recomendada!.tipo, 'plastico');
  igual('E/J considerado', rJ.recomendada!.considerado, 108);
  igual('E/J caixa', rJ.caixa.considerado, 130);
  igual('E/J dica mínimo', rJ.dicas.some((d) => d.id === 'minimo'), true);
  igual('J Mini Envios', rJ.dicas.some((d) => d.id === 'mini' && d.nivel === 'positivo'), true);

  igual('alta nunca envelope', estimarEnvelope({ dims: [10, 6, 1], pesoUn: 30, protecao: 'alta' }, 'bolha').serve, false);
  igual('plástico só sem proteção', estimarEnvelope({ dims: [10, 6, 1], pesoUn: 30, protecao: 'leve' }, 'plastico').serve, false);
  igual('rígido > 3 cm', estimarEnvelope({ dims: [10, 6, 4], pesoUn: 30, protecao: 'leve', tipo: 'rigido' }, 'bolha').serve, false);
  igual('flexível 4 cm', estimarEnvelope({ dims: [10, 6, 4], pesoUn: 30, protecao: 'leve', tipo: 'flexivel' }, 'bolha').serve, true);
  igual('fabricante', recomendar({ dims: [5, 3, 2], pesoUn: 20, protecao: 'nenhuma', fabricante: true }).plastico.serve, false);
});

test('caixa do catálogo', () => {
  const entA = { dims: [15, 10, 5], pesoUn: 300, qtd: 1, protecao: 'media' as const };
  const K = escolherCaixaPadrao(entA);
  igual('K caixa', K.caixa!.nome, 'Grande');
  igual('K cadastrar', K.cadastrar, [34, 27, 14]);
  igual('K peso', K.pesos.cadastrar, 650);
  igual('K cúbico', K.cubico, 2142);
  igual('K considerado', K.considerado, 2142);
  const rA = recomendar(entA);
  igual('dica caixa padrão', rA.dicas.some((d) => d.id === 'caixaPadrao'), true);
  igual('A sob medida', rA.recomendada!.tipo, 'caixa');
  igual('A considerado', rA.recomendada!.considerado, 500);
  igual('A envelopes não', rA.plastico.serve || rA.bolha.serve, false);
  igual('A não cabe Mini', rA.dicas.some((d) => d.id === 'mini'), false);
  igual('A dica tamanho', /cai de 500 g para/.test(rA.dicas.find((d) => d.id === 'tamanho')!.texto), true);
  igual('Média alta não serve', escolherCaixaPadrao({ ...entA, caixas: [{ nome: 'Média alta', c: 27, l: 18, a: 9 }] }).serve, false);
});

test('limites e outros', () => {
  const grande = { dims: [95, 60, 40], pesoUn: 10000, qtd: 1, protecao: 'leve' as const };
  const cx = estimarCaixa(grande);
  for (const mod of ['correios', 'agencia', 'mini'] as Modalidade[]) {
    igual(`excede ${mod}`, validarLimites(cx.cadastrar, cx.pesos.cadastrar, mod).status, 'excede');
    const alerta = recomendar({ ...grande, modalidade: mod }).dicas.find((d) => d.id === 'limite');
    igual(`alerta ${mod}`, alerta?.nivel, 'alerta');
    igual(`multa ${mod}`, /R\$ 50 por pedido/.test(alerta?.texto ?? ''), true);
  }
  igual('soma > 200', validarLimites(cx.cadastrar, 1000, 'correios').itens.find((i) => i.id === 'soma')!.status, 'excede');
  igual('perto soma', validarLimites([90, 60, 35], 1000, 'correios').status, 'perto');
  igual('perto peso', validarLimites([30, 20, 10], 27000, 'correios').status, 'perto');
  igual('dentro', validarLimites([20, 15, 10], 460, 'correios').status, 'ok');
  igual('agência 110', validarLimites([110, 20, 10], 1000, 'agencia').status, 'perto');
  igual('correios 110', validarLimites([110, 20, 10], 1000, 'correios').status, 'excede');
  igual('cúbico', pesoCubico(20, 15, 10), 500);
  igual('arranjo 1', arranjos([15, 10, 5], 1).length, 1);
  igual('arranjo 4', arranjos([15, 10, 5], 4).some((a) => a.bloco.join('x') === '20x15x10'), true);
  igual('kit', recomendar({ dims: [15, 10, 5], pesoUn: 300, qtd: 4, protecao: 'media' }).dicas.some((d) => d.id === 'kit'), true);
  igual('frágil', recomendar({ dims: [8, 8, 8], pesoUn: 150, protecao: 'alta' }).dicas.some((d) => d.id === 'fragil'), true);
});
