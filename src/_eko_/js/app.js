import ui from '../ui.json';
import subtitlesMap from '../subtitlesMap.json';
import settings from '../config/settings.json';
import playerOptions from '../config/playerOptions.json';

let player;

export default {
    settings: settings,

    run: function(ctx) {
        player = ctx.player;

        // Some plugins are async and we need to wait for their promise
        // to resolve before continuing.
        let pluginsPromises = [];
        if (player.rtsPreview && player.rtsPreview.promise) {
            pluginsPromises.push(player.rtsPreview.promise);
        }

        return ctx.when.all(pluginsPromises).then(function() {

            // replayNode
            if (player.control) {
                player.control.replayNode = ctx.intro.head;
            }

            // UI
            if (player.ui && typeof player.ui.createFromConfig === 'function') {
                player.ui.createFromConfig(ui);
            }

            // Subtitles
            if (player.subtitles) {
                const nodesWithSubtitles = Object.keys(subtitlesMap);
                nodesWithSubtitles.forEach((nodeId) => {
                    player.subtitles.attach(nodeId, subtitlesMap[nodeId]);
                })
            }

                        // Set share button visibility in end screen.
                if (player.controlbar) {
                    player.controlbar.setOptions({
                        components: {
                            endOverlay: {
                                ctaButton: true ? { type: 'share' } : false
                            }
                        }
                    });
                }
            
                    });
    }
};