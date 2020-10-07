var fn = function () {
    'use strict';

    window._addMessagesInterval = function _addMessagesInterval() {
        if (document.location.href.indexOf('messages') === -1) {
            return;
        }

        setInterval(function () {

        }, 100);
    };
    window._addMessagesInterval();
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
