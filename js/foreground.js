const iconURL = document.currentScript?.dataset?.fileLink ?? '';

if (window.location.hostname === 'vrc.tl' && !window.location.pathname.startsWith('/admin/')) {
	if (typeof window.eventData === 'undefined') window.eventData = { events: null, organizersEvents: null };

	// Only observe the top level DOM changes (aka only the events, not their tags or their AddToMainline button)
	const config = { childList: true, attributes: false, subtree: false };
	let observeChangeTimeout = null, observeChangeTimeout2 = null, checkIfFoundInterval = null, checkIfFoundInterval2 = null;
	let reactRoot = null, timelineGrid = null;

	const ourBadgeImage = document.createElement('img');
	ourBadgeImage.className = 'h-full';
	ourBadgeImage.src = iconURL;
	const ourBadgeText = document.createElement('span');
	ourBadgeText.className = 'inline-block text-nowrap';
	ourBadgeText.innerText = 'DMX Event';
	const ourBadgeHolder = document.createElement('div');
	ourBadgeHolder.className = 'flex flex-nowrap items-center space-x-[0.5em] text-white font-medium';
	ourBadgeHolder.dataset.tooltipPlace = 'top';
	ourBadgeHolder.dataset.tooltipId = 'my-tooltip';
	ourBadgeHolder.dataset.tooltipContent = 'Event uses DMX for lights';
	ourBadgeHolder.appendChild(ourBadgeImage);
	ourBadgeHolder.appendChild(ourBadgeText);
	const ourBadge = document.createElement('div');
	ourBadge.className = 'text-[0.6rem] inline-flex flex-grow-0 flex-shrink-0 h-[1em] relative border-[1.5px] border-green-550 rounded-full box-content py-[0.4em] px-[0.7em] group/tag-pill bg-green-550/[0.2]';
	ourBadge.id = 'dmx-event-badge';
	ourBadge.appendChild(ourBadgeHolder);

	const ourBadgeDrawer = ourBadge.cloneNode(true);
	ourBadgeDrawer.className = ourBadgeDrawer.className.replace('text-[0.6rem] ', ''); // needs bigger text ;)

	const ourBadgeClubEventListTag = document.createElement('div');
	ourBadgeClubEventListTag.className = 'text-xs text-gr-250 w-max bg-green-550/[0.2] rounded-full px-2 py-px font-medium';
	ourBadgeClubEventListTag.innerText = 'DMX Event';
	const ourBadgeClubEventList = document.createElement('div');
	ourBadgeClubEventList.id = 'dmx-event-badge';
	ourBadgeClubEventList.appendChild(ourBadgeClubEventListTag);

	function doesEventHaveADescription(event) {
		return !!event?.description;
	}
	function isEventAnDMXEvent(event) {
		if (!doesEventHaveADescription(event)) return false;
		return event.description.toLowerCase().includes('#dmx-event');
	}

	async function updateEventData() {
		if (!timelineGrid) {
			if (checkIfFoundInterval === null)
				checkIfFoundInterval = setInterval(findTimelineGrid, 1e3);
			return;
		}
		let events = undefined;

		if (window.eventData?.events !== null) {
			events = window.eventData.events;
		} else {
			const response = await fetch('/api/v1/events');
			try {
				events = (await response.json())?.eventData?.events;
				window.eventData.events = data;
			} catch {}
		}

		if (events !== undefined) {
			const dmxEvents = events
				.filter(doesEventHaveADescription) // A little less overhead
				.filter(isEventAnDMXEvent)
				;
			console.log(dmxEvents);
			if (dmxEvents.length > 0) {
				for (const event of dmxEvents) {
					const eventElement = timelineGrid.querySelector('div[data-event-id="' + event.id + '"]');
					if (!eventElement) {
						console.error('Could not find the event element for event', event);
						continue;
					}
					const badgeHolderElement = eventElement.querySelector('div.grid div.flex.place-items-center');
					if (!badgeHolderElement) {
						console.error('Could not find the badge holder element in', eventElement, event);
						continue;
					}
					if (!badgeHolderElement.querySelector('#dmx-event-badge'))
						badgeHolderElement.appendChild(ourBadge);
				}
			}
		}
	}

	async function updateDrawer() {
		const drawer = document.querySelector('div[data-cm=drawer-component]');
		if (drawer) {
			observer.observe(drawer, config);
			const key = drawer.dataset?.key;
			if (!key) return;

			if (key.startsWith('event-detail-')) {
				const eventId = Number(key.replace('event-detail-', ''));
				let event = window.eventData?.events?.find?.((event) => event.id === eventId) ?? window.eventData?.organizersEvents?.find?.((event) => event.id === eventId);
				if (!event) {
					const desc = drawer.querySelector('div.px-6.text-gr-200.pointer-events-auto');
					if (desc) {
						// observe to check for the expanded description
						observer.observe(desc, config);
						event = { fromHTML: true, description: desc?.innerText };
					}
				}
				if (isEventAnDMXEvent(event)) {
					console.log(event);
					const badgeHolderElement = drawer.querySelector('div.flex.flex-wrap');
					if (!badgeHolderElement) {
						console.error('Could not find the badge holder element in', eventElement, event);
						return;
					}
					if (!badgeHolderElement.querySelector('#dmx-event-badge'))
						badgeHolderElement.appendChild(ourBadgeDrawer);
				}
			} else if (key.startsWith('organizer-detail-')) {
				const scrollbars = drawer.querySelector('div[data-cm="drawer"] div[data-cm="scrollbars"]');
				clearTimeout(observeChangeTimeout2);
				observeChangeTimeout2 = setTimeout(() => {
					const eventElements = Array.from(scrollbars.querySelectorAll('div.flex.flex-col.gap-y-6 > div.relative > div.relative.overflow-hidden > span'));
					for (const eventElement of eventElements) {
						const prop = Object.entries(eventElement).find(([k]) => k.startsWith('__reactFiber$'))?.[1];
						const event = (prop?.return?.memoizedProps ?? prop?.return?.pendingProps)?.event; // prop.return is the non-visible parentElement of the react element.

						if (isEventAnDMXEvent(event)) {
							const badgeHoldingElement = eventElement.querySelector('div.flex.flex-col.flex-1 > div.text-nowrap.items-center');
							if (!badgeHoldingElement.querySelector('#dmx-event-badge'))
								badgeHoldingElement.appendChild(ourBadgeClubEventList.cloneNode(true));
						}
					}
				}, 1e3);
			}
		}
	}

	const observer = new MutationObserver((mutationList, observer) => {
		for (const mutation of mutationList) {
			if (mutation.type === 'childList') {
				if (mutation.target === timelineGrid) {
					clearTimeout(observeChangeTimeout);
					observeChangeTimeout = setTimeout(updateEventData, 1e3);
				} else if (mutation.target === reactRoot || mutation.target?.dataset?.cm === 'drawer-component') {
					clearTimeout(observeChangeTimeout2);
					updateDrawer();
				} else if (mutation.target?.matches('.px-6.text-gr-200.pointer-events-auto')) {
					// Expanded description
					clearTimeout(observeChangeTimeout2);
					updateDrawer();
				} else {
					console.log('how did this mutation get observed?', mutation);
				}
			} else {
				console.log('how did this mutation get observed?', mutation);
			}
		}
	});

	function findReactRoot() {
		reactRoot = document.querySelector("#react-root > div > div.relative");
		if (!reactRoot) return;

		clearInterval(checkIfFoundInterval);
		observer.observe(reactRoot, config);
		checkIfFoundInterval = null;

		checkIfFoundInterval2 = setInterval(findTimelineGrid, 1e3);
	}

	function findTimelineGrid() {
		timelineGrid = document.querySelector('div[data-cn=grid] > div[data-cn=grid-content] > div.grid.grid-flow-dense');
		if (!timelineGrid) return;

		clearInterval(checkIfFoundInterval2);
		observer.observe(timelineGrid, config);
		checkIfFoundInterval2 = null;

		clearTimeout(observeChangeTimeout);
		observeChangeTimeout = setTimeout(updateEventData, 1e3);

		clearTimeout(observeChangeTimeout2);
		observeChangeTimeout2 = setTimeout(updateDrawer, 2e3);
	}

	checkIfFoundInterval = setInterval(findReactRoot, 1e3);

	// timeline-patched.js has extra code to call this function:
	/*
window.eventData = { events: null, organizersEvents: null };
window.eventsManager = v1.get(a0).events;
const orig = eventsManager.__proto__.getByDay.bind(eventsManager);
eventsManager.__proto__.getByDay = function(...args) {
	const result = orig(...args);
	result.then(response => { window.eventData.events = response?.eventData?.events; });
	return result
}
	*/
}
