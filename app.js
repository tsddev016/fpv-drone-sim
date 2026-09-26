const parts = await Promise.all([1,2,3,4].map(i => fetch(new URL('./app.part' + i + '.js', import.meta.url)).then(r => r.text())));
const blob = new Blob([parts.join('')], { type: 'text/javascript' });
await import(URL.createObjectURL(blob));
