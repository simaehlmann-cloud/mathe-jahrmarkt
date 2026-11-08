import { mount } from 'svelte';
import App from './app/App.svelte';
import './app/stil.css';

const ziel = document.getElementById('app');
if (!ziel) throw new Error('Startelement fehlt');

export default mount(App, { target: ziel });
