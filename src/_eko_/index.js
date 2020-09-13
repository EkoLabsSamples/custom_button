'use strict';

import ekoStudioApp from './js/app';

// In es6 modules you're not supposed to override the variable 
// used as the import target.
import developerCode from '../js/app';

// Normalize developer's app.js in case its a function
let developerApp;
if (typeof developerCode === 'function') {
    developerApp = {
        onReady: developerCode
    };
} else {
    developerApp = developerCode;
}

function safeCall(f) {
    if (typeof f === 'function') {
        const args = Array.prototype.slice.call(arguments, 1);
        return f.apply(null, args);
    }

    return true;
}


// Project essentials.
export default {
    hooks: {
        onReady: function(ctx) {
         	return safeCall(developerApp.onReady, ctx.player, ctx); 
        }
    },

    run: ekoStudioApp.run,

    studioPlayerOptions: ekoStudioApp.playerOptions,
    devPlayerOptions: developerApp.playerOptions
};
