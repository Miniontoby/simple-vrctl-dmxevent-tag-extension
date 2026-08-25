try {
	const scriptRegex = /<script id="tl-script" src="\/(dist\/[^"]+\.js)"/;
	const classRegex = /class ([^ {]+){[^{}]+;events=new /;
	const response = await (await fetch('https://vrc.tl')).text();
	const originalScriptUrl = 'https://vrc.tl/' + scriptRegex.exec(response)[1];
	const originalCode = await (await fetch(originalScriptUrl)).text();
	const className = (classRegex.exec(originalCode)?.[1] ?? 'a0');

	eval(originalCode + `
if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
try {
	window.eventData = null;
	window.eventsManager = v1.get(` + className + `).events;
	const orig = eventsManager.__proto__.getByDay.bind(eventsManager);
	window.onGetByDay = async function(result) {
		window.eventData = await result;
	};
	eventsManager.__proto__.getByDay = function(...args) {
		const result = orig(...args);
		window.onGetByDay(result);
		return result
	}
} catch {}
`);

	console.log('Patched!');
} catch (err) {
	console.error('Error patching:', err);
}

