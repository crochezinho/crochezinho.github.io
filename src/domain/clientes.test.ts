import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparClientes, buscarClientes, chaveDoNome, grafiaDaCliente, iniciais, lerFichas } from './clientes.ts';

type P = { id: string; cliente: string; criadoEm: number; status: 'fazendo' | 'concluido'; entregueEm: number | null; valor: number };
const p = (id: string, cliente: string, criadoEm: number, o: Partial<P> = {}): P => ({ id, cliente, criadoEm, status: 'fazendo', entregueEm: null, valor: 0, ...o });

test('mesma cliente com grafias diferentes', () => {
  assert.equal(chaveDoNome('  Ana  Júlia '), 'ana julia');
  assert.equal(chaveDoNome('ANA JULIA'), 'ana julia');
});

test('agrupa encomendas por cliente, com o que já foi entregue', () => {
  const lista = [
    p('1', 'Ana', 1, { status: 'concluido', entregueEm: 5, valor: 12000 }),
    p('2', 'ana ', 3, { status: 'concluido', entregueEm: 6, valor: 8000 }),
    p('3', 'Ana', 4),
    p('4', 'Bia', 2, { status: 'concluido', valor: 5000 }),
    p('5', '', 9)
  ];
  const cs = agruparClientes(lista, (x) => x.valor);
  assert.deepEqual(cs.map((c) => c.nome), ['Ana', 'Bia']);
  const ana = cs[0];
  assert.equal(ana.projetos.length, 3);
  assert.equal(ana.entregues, 2);
  assert.equal(ana.emAberto, 1);
  assert.equal(ana.totalCentavos, 20000);
  assert.equal(ana.primeiraEm, 1);
  assert.equal(ana.ultimaEm, 4);
  assert.equal(cs[1].totalCentavos, 0, 'pronta mas não entregue não conta');
});

test('busca por nome ou contato', () => {
  const cs = agruparClientes([p('1', 'Ana', 1), p('2', 'Bia', 2)], () => 0);
  const fichas = new Map([['bia', { contato: '@bia.amigurumi', anotacoes: '' }]]);
  assert.deepEqual(buscarClientes(cs, 'amigu', fichas).map((c) => c.nome), ['Bia']);
  assert.deepEqual(buscarClientes(cs, 'ána', fichas).map((c) => c.nome), ['Ana']);
});

test('usa a grafia que já existe', () => {
  const lista = [p('1', 'Ana Júlia', 1)];
  assert.equal(grafiaDaCliente(lista, ' ana julia '), 'Ana Júlia');
  assert.equal(grafiaDaCliente(lista, 'Carla '), 'Carla');
  assert.equal(grafiaDaCliente(lista, '  '), '');
});

test('fichas: ignora as apagadas (null) e outras chaves', () => {
  const f = lerFichas([
    { chave: 'cliente.ana', valor: { contato: '11 9999', anotacoes: 'gosta de rosa' } },
    { chave: 'cliente.velha', valor: null },
    { chave: 'nome', valor: 'x' }
  ]);
  assert.deepEqual([...f.keys()], ['ana']);
  assert.equal(f.get('ana')!.anotacoes, 'gosta de rosa');
});

test('iniciais', () => {
  assert.equal(iniciais('ana júlia souza'), 'AS');
  assert.equal(iniciais('Bia'), 'B');
  assert.equal(iniciais(' '), '?');
});
