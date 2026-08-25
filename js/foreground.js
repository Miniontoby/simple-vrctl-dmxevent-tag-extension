const iconURL = document.currentScript?.dataset?.fileLink ?? '';

if (window.location.hostname === 'vrc.tl' && !window.location.pathname.startsWith('/admin/')) {
	// Only observe the top level DOM changes (aka only the events, not their tags or their AddToMainline button)
	const config = { childList: true, attributes: false, subtree: false };
	let observeChangeTimeout = null, checkIfFoundInterval = null;
	let timelineGrid = null;

	if (typeof window.eventData === 'undefined') window.eventData = null;

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

	async function updateEventData() {
		if (!timelineGrid) {
			if (checkIfFoundInterval === null)
				checkIfFoundInterval = setInterval(findTimelineGrid, 1e3);
			return;
		}
		let data = {};

		if (window.eventData !== null) {
			data = window.eventData;
			window.eventData = null;
		} else {
			const response = await fetch('/api/v1/events');
			try {
				data = await response.json();
			} catch {}
		}

		if (data?.eventData?.events) {
			const dmxEvents = data.eventData.events
				.filter((event) => event.description)
				.filter((event) => event.description.toLowerCase().includes('#dmx-event'))
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

	const observer = new MutationObserver((mutationList, observer) => {
		for (const mutation of mutationList) {
			if (mutation.type === 'childList') {
				if (mutation.target === timelineGrid) {
					clearTimeout(observeChangeTimeout);
					observeChangeTimeout = setTimeout(updateEventData, 1e3);
				} else {
					console.log('how did this mutation get observed?', mutation);
				}
			} else {
				console.log('how did this mutation get observed?', mutation);
			}
		}
	});

	function findTimelineGrid() {
		timelineGrid = document.querySelector('div[data-cn=grid] > div[data-cn=grid-content] > div.grid');
		if (!timelineGrid) return;

		clearInterval(checkIfFoundInterval);
		observer.observe(timelineGrid, config);
		checkIfFoundInterval = null;

		clearTimeout(observeChangeTimeout);
		observeChangeTimeout = setTimeout(updateEventData, 1e3);
	}

	checkIfFoundInterval = setInterval(findTimelineGrid, 1e3);

	// modified.js has extra code to call this function:
	/*
window.eventData = null;
window.eventsManager = v1.get(a0).events;
const orig = eventsManager.__proto__.getByDay.bind(eventsManager);
window.onGetByDay = async function(result) {
	window.eventData = await result;
};
eventsManager.__proto__.getByDay = function(...args) {
	const result = orig(...args);
	window.onGetByDay(result);
	return result
}
	*/
}
