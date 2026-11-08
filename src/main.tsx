import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';

import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/animations.css';
import './styles/components.css';
import './styles/calculadora.css';
import './styles/projetos.css';
import './styles/novelos.css';
import './styles/config.css';
import './styles/vender.css';

import { App } from './app/App';
import { reportarErro } from './app/erros';
import { db, pedirArmazenamentoPersistente } from './db/db';

registerSW({ immediate: true });
void pedirArmazenamentoPersistente();
db.open().catch((e) => reportarErro(e, 'não foi possível abrir o armazenamento do app'));

render(<App />, document.getElementById('app')!);
