var fn = function () {
    'use strict';
    if (location.href.indexOf('lobby') === -1) {
        return;
    }

    window._clickLastPlayed = function () {
        $('#joinGame > button').click();
    }

    var autoLobby = _getUrlParameter('auto-lobby', false);
    if (autoLobby) {
        setTimeout(function () {
            _clickLastPlayed();

            setTimeout(function () {
                window.close();
            }, 3000);

        }, 2000);
    }
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

if (location.href.indexOf('lobby') !== -1) {
    script = document.createElement('script');
    script.src = 'https://code.jquery.com/jquery-3.5.1.min.js';
    (document.head || document.documentElement).appendChild(script);
}
