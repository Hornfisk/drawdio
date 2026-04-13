import { mount } from 'svelte';
import App from './App.svelte';
import { registerAllComponents } from './lib/components/register-all.js';
import './app.css';

registerAllComponents();

const app = mount(App, { target: document.getElementById('app')! });

export default app;
