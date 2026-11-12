import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerLink, origemDoLink } from './receita.ts';

test('lê o link colado', () => {
  const drive = 'https://drive.google.com/file/d/1AbC_x-9/view?usp=sharing';
  assert.equal(lerLink(drive), drive);
  assert.equal(lerLink(`  Receita do urso: ${drive} `), drive);
  assert.equal(lerLink('drive.google.com/file/d/1AbC'), 'https://drive.google.com/file/d/1AbC');
  assert.equal(lerLink('(https://exemplo.com/receita.pdf).'), 'https://exemplo.com/receita.pdf');
  assert.equal(lerLink('urso marrom'), '');
  assert.equal(lerLink('javascript:alert(1)'), '');
  assert.equal(lerLink(''), '');
});

test('nome de onde está a receita', () => {
  assert.equal(origemDoLink('https://drive.google.com/file/d/1/view'), 'Google Drive');
  assert.equal(origemDoLink('https://docs.google.com/document/d/1'), 'Google Drive');
  assert.equal(origemDoLink('https://www.ravelry.com/patterns/x'), 'ravelry.com');
});
