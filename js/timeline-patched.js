try {
	const scriptRegex = /<script id="tl-script" src="\/(dist\/[^"]+\.js)"/;
	const classRegex = /class ([^ {]+){[^{}]+;events=new /;
	const response = await (await fetch('https://vrc.tl')).text();
	const originalScriptUrl = 'https://vrc.tl/' + scriptRegex.exec(response)[1];
	const originalCode = await (await fetch(originalScriptUrl)).text();
	const className = classRegex.exec(originalCode)?.[1];

	eval(originalCode + (className ? `
try {
	if (typeof window.eventData === 'undefined')
		window.eventData = { events: null, organizersEvents: null };

	window.api = v1.get(` + className + `);
	if (!api) throw new Error('Failed to get api object');

	window.eventsManager = api?.events;
	if (!eventsManager) throw new Error('Failed to get events object from api object');
	const origEvents_getByDay = eventsManager.__proto__.getByDay.bind(eventsManager);
	eventsManager.__proto__.getByDay = function(...args) {
		const result = origEvents_getByDay(...args);
		result.then(response => { window.eventData.events = response?.eventData?.events ?? window.eventData.events; return response; });
		return result;
	}
	const origEvents_getInitialEvents = eventsManager.__proto__.getInitialEvents.bind(eventsManager);
	eventsManager.__proto__.getInitialEvents = function(...args) {
		const result = origEvents_getInitialEvents(...args);
		result.then(response => { window.eventData.events = response?.eventData?.events ?? window.eventData.events; return response; });
		return result;
	}
	const origEvents_get = eventsManager.__proto__.get.bind(eventsManager);
	eventsManager.__proto__.get = function(...args) {
		const result = origEvents_get(...args);
		result.then(response => {
			if (window.eventData.organizersEvents === null) window.eventData.organizersEvents = [];
			window.eventData.organizersEvents = response?.events ?? window.eventData.organizersEvents;
			return response;
		});
		return result;
	}

	window.organizersManager = api?.organizers;
	if (!organizersManager) throw new Error('Failed to get organizers object from api object');
	const origOrganizers = organizersManager.__proto__.getEvents.bind(organizersManager);
	organizersManager.__proto__.getEvents = function(...args) {
		const result = origOrganizers(...args);
		result.then(response => { window.eventData.organizersEvents = response?.data?.events ?? window.eventData.organizersEvents; return response; });
		return result;
	}

	console.log('Patched!');
} catch (e) {
	console.error('Patching failed\\n', e);
}
` : '')
+ `if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));`);

	if (!className) throw new Error('Failed to get className of the api class');
} catch (err) {
	console.error('Patching failed before reaching our code\n', err);
}

