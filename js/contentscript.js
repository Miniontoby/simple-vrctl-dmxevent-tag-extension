function scriptFromFile(file) {
    var script = document.createElement("script");
    script.src = chrome.runtime.getURL(file);
    return script;
}

function scriptFromUrl(url) {
    var script = document.createElement("script");
    script.src = url;
    return script;
}

function scriptFromSource(source) {
    var script = document.createElement("script");
    script.textContent = source;
    return script;
}

function addFileLinkToScript(script, file) {
    script.dataset.fileLink = chrome.runtime.getURL(file);
    return script;
}

function inject(scripts) {
    if (scripts.length === 0)
        return;
    var otherScripts = scripts.slice(1);
    var script = scripts[0];
    var onload = function() {
        script.parentNode.removeChild(script);
        inject(otherScripts);
    };
    if (script.src != "") {
        script.onload = onload;
        document.head?.appendChild(script);
        if (!document.head) document.getRootNode()?.children[0]?.appendChild(script)
    } else {
        document.head?.appendChild(script);
        if (!document.head) document.getRootNode()?.children[0]?.appendChild(script)
        onload();
    }
}

inject([
	addFileLinkToScript(scriptFromFile("js/foreground.js"), "images/icon-timeline-512.png"),
]);
