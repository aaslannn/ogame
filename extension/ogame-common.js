var fn = function () {
    'use strict';

    const LARGE_DEBRIS_KEY = 'zoro-debris';

    $('body').addClass('zoro-skin');

    $('body').removeClass('uv-skin-messages');
    $('body').removeClass('uv-feature-spreading');
    $('body').removeClass('uv-feature-quicksearch');

    window._initZoroPanel = function() {
        var zoroPanelElement = document.createElement('div');
        zoroPanelElement.className = 'zoro-check-debris';
        document.body.appendChild(zoroPanelElement);

        var debrisListElement = document.createElement('ul');
        zoroPanelElement.appendChild(debrisListElement);

        var debrisList = _getLargeDebrisList();
        debrisList.forEach(function (debrisItem) {
            var debrisItemElement = document.createElement('li');
            debrisListElement.appendChild(debrisItemElement);

            var debrisAnchorElement = document.createElement('a');
            debrisAnchorElement.className = 'zoro-debris-item';
            debrisAnchorElement.setAttribute('href', _getGalaxyUrl(debrisItem.galaxy, debrisItem.system));
            debrisAnchorElement.setAttribute('target', 'blank');
            debrisAnchorElement.innerText = _getCoordStr(debrisItem.galaxy, debrisItem.system, debrisItem.planet) + ' ' + (debrisItem.metal / 1000000) + 'M Metal + ' + (debrisItem.kristal / 1000000) + 'M Kristal';
            debrisItemElement.appendChild(debrisAnchorElement);

            var debrisCloseElement = document.createElement('a');
            debrisCloseElement.className = 'zoro-debris-close';
            debrisCloseElement.setAttribute('href','#');
            debrisCloseElement.setAttribute('onclick', '_removeLargeDebris(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ')');
            debrisCloseElement.innerText = 'X';
            debrisItemElement.appendChild(debrisCloseElement);
        });

        var runCheckDebrisElement = document.createElement('div');
        zoroPanelElement.appendChild(runCheckDebrisElement);

        var runCheckDebrisLabelElement = document.createElement('div');
        runCheckDebrisLabelElement.innerHTML = 'Run checker for each galaxy'
        runCheckDebrisElement.appendChild(runCheckDebrisLabelElement);

        for (var i = 1; i < 7; i++) {
            var checkDebrisElement = document.createElement('button');
            checkDebrisElement.innerHTML = "G" + i;
            checkDebrisElement.className = 'zoro-galaxy-run-button';
            checkDebrisElement.setAttribute('onclick', '_startDebrisCheckerForGalaxy(' + i + ')');
            runCheckDebrisElement.appendChild(checkDebrisElement);
        }

        var checkDebrisElement = document.createElement('button');
        checkDebrisElement.innerHTML = "Clean Debris List";
        checkDebrisElement.setAttribute('onclick', '_cleanDebrisList()');
        zoroPanelElement.appendChild(checkDebrisElement);
    };

    window.zoro = window.zoro || {};

    window._getUrlParameter = function (sParam) {
        var sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
            }
        }
    };

    window._addLargeDebris = function (galaxy, system, planet, metal, kristal) {
        var existing = _getLargeDebris(galaxy, system, planet);
        if (!existing) {
            var items = _getLargeDebrisList();

            items.push({galaxy: galaxy, system: system, planet: planet, metal: metal, kristal: kristal});

            localStorage.setItem(LARGE_DEBRIS_KEY, JSON.stringify(items));
        }
    };

    window._getLargeDebrisList = function () {
        var existing = localStorage.getItem(LARGE_DEBRIS_KEY);
        var items = [];
        if (existing) {
            items = JSON.parse(existing);
        }

        return items;
    };

    window._removeLargeDebris = function (event, galaxy, system, planet) {
        var items = _getLargeDebrisList();
        var existing = _getLargeDebris(galaxy, system, planet);
        if (existing) {
            items.splice(items.indexOf(existing) - 1, 1);
            $(event.element).remove();

            localStorage.setItem(LARGE_DEBRIS_KEY, JSON.stringify(items));
        }
    };

    window._cleanDebrisList = function () {
        localStorage.setItem(LARGE_DEBRIS_KEY, JSON.stringify([]));
    };

    window._getLargeDebris = function (galaxy, system, planet) {
        var items = _getLargeDebrisList();

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.galaxy == galaxy && item.system == system && item.planet == planet) {
                return item;
            }
        }

        return null;
    };

    window._getCoordStr = function (galaxy, system, planet) {
        return galaxy + ':' + system + ':' + planet;
    };

    window._getGalaxyUrl = function (galaxy, system, suffix = '') {
        return location.origin + location.pathname + '?page=ingame&component=galaxy&galaxy=' + galaxy + '&system=' + system + suffix;
    };

    window._startDebrisCheckerForGalaxy = function (galaxy) {
        window.open(_getGalaxyUrl(galaxy, 1, '&check-debris=1'));
    };

    _initZoroPanel();
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
