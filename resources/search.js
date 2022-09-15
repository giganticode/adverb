; (function () {
    const vscode = acquireVsCodeApi();
    var dataArray = [];

    window.onload = function (evnet) {
        vscode.postMessage({
            command: 'init'
        });
    };

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'init':
                dataArray = message.data;
                drawGraph();
                drawSearchResults();
                $('#input-search').focus();
                break;
            case 'searchResults':
                dataArray = message.data;
                drawSearchResults();
                break;
            case 'indexStatus':
                if (message.data) {
                    let container = document.getElementById('lbl-last-index');
                    container.innerHTML = message.data;
                }
                break;
        }
    });

    $('#container').on('click', '.file:not(.match)', function (e) {
        if (!$(e.target).hasClass('match')) {
            let index = $(this).attr('data-index');
            openFile(index, 0);
        }
    });

    $('#container').on('click', '.match', function (e) {
        let index = $(this).attr('data-index');
        let line = $(this).attr('data-line');
        openFile(index, line);
    });

    // Search query
    $('#input-search').on('keyup', function (e) {
        if (e.keyCode === 13) {
            search();
        }
    });

    $('#btn-search').on('click', function () {
        search();
    });

    function search() {
        let query = $('#input-search').val();
        if (!query || query === "") {
            for (let i in dataArray) {
                dataArray[i].matches = null;
            }
            drawGraph();
        } else {
            for (let i in dataArray) {
                dataArray[i].matches = false;
            }
            vscode.postMessage({
                command: 'search',
                value: query,
            });
            drawSearchResults();
        }
    }

    function openFile(index, line) {
        if (index) {
            vscode.postMessage({
                command: 'openFile',
                path: dataArray.find(x => x.hash == index).path,
                line: line,
            })
        }
    }

    $('#btn-index').on('click', function () {
        vscode.postMessage({ command: 'index' });
    });

    function createDom(e, a) {
        n = document.createElement(e);
        for (var p in a)
            n.setAttribute(p, a[p]);
        return n;
    }

    function drawGraph() {
        let container = document.getElementById('container');
        container.innerHTML = '';

        var maxHeight = 0;
        for (let index in dataArray) {
            let item = dataArray[index];
            maxHeight = Math.max(maxHeight, item.lines);
        }

        // calculate size of graph
        let canvasHeight = maxHeight * 2 + 20;

        var x = 5;
        var width = 75;

        for (let index in dataArray) {
            let item = dataArray[index];
            let fileContainer = createDom("div", { "style": `display: inline-block; position: relative; width: ${width + 40}px; height: ${canvasHeight + 10}px` });
            let rectangle = createDom("div", { "class": "file", "style": `background-repeat: no-repeat; background-color: #333333; left: ${x}px; width: ${width}px; height: auto; background-size: auto 100%;`, "data-index": item.hash });
            fileContainer.appendChild(rectangle);

            let span = createDom("span", { "class": "matches" });
            span.innerHTML = "0 Match(es)";
            fileContainer.appendChild(span);

            // let path = "vscode-resource:" + cachePath + item.hash + ".svg"; //"https://file+.vscode-resource.vscode-webview.net/" + 
            let image = createDom("img", { "src": item.imagePath })
            rectangle.appendChild(image);

            let text = createDom("p", { "style": `transform: rotate(90deg) translateX(100%); position: absolute; right: 25px; top: -15px; transform-origin: 100% 100%; margin: 0;` });
            text.innerHTML = item.name + " (" + item.relativePath + ") " + item.lines;
            fileContainer.appendChild(text);
            container.appendChild(fileContainer);
        }
    }

    function drawSearchResults() {
        for (let index in dataArray) {
            let file = dataArray[index];
            let rectangle = $(`div.file[data-index=${file.hash}]`);
            rectangle.find('div').remove();
            rectangle.parent().removeClass('no-matches');
            if (file.matches === false) {
                // processing
                rectangle.parent().find('span').text('Processing...');
            } else if (file.matches === null) {
                // not set yet after init
                rectangle.parent().find('span').text(' ');
            } else if (file.matches.length === 0) {
                // no results
                rectangle.parent().find('span').text('No matches');
                rectangle.parent().addClass('no-matches');
            } else {
                // results
                let matchesSize = file.matches.length;
                rectangle.parent().find('span').text(matchesSize + (matchesSize === 1 ? ' match' : ' matches'))
                let imageHeight = rectangle.children("img").first().height();
                file.matches.forEach(part => {
                    let partSize = part.end - part.start;
                    let height = imageHeight / file.lines * partSize;
                    let top = imageHeight / file.lines * part.start;
                    let numberOfRanks = 10;
                    let rank = part.rank ? `Rank: ${part.rank}/${numberOfRanks}, ` : "";
                    let score = Math.round(part.score <= 1 ? part.score * 100 : part.score);
                    let opacity = part.rank ? (numberOfRanks - part.rank) / numberOfRanks : score / 100;
                    if (opacity < 0.15)
                        opacity = 0.15;
                    let line = createDom("div", {
                        style: `position: absolute; top: ${top}px; height: ${height}px; width: 100%; opacity: ${opacity};`,
                        "data-index": file.hash,
                        "data-line": part.start,
                        class: "match",
                        "data-tooltip": "",
                        "data-tooltip-label": `Search result: line ${part.start + 1}-${part.end + 1} (${rank}Score: ${score} %)`,
                        "data-tooltip-message": part.code,
                        onmouseout: `this.style.opacity=${opacity}`,
                        onmouseover: `this.style.opacity=1`
                    });
                    rectangle.append(line);
                });
            }
        }
    }

})()