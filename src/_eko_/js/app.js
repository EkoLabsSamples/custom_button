import ivds from './auto_generated/ivds';
import nodes from './auto_generated/nodes';
import ui from '../ui.json';
import subtitlesMap from '../subtitlesMap.json';
import settings from '../config/settings.json';
import playerOptions from '../config/playerOptions.json';

let player;
let introNodesMap;
let head = 'node_beginning_2430df';
let headNodeIdQP;

function isValidHeadNodes(headNodes) {
    if (!headNodes) {
        return false;
    }
    if (typeof headNodes === 'string') {
        return nodes.filter(obj => headNodes === obj.id).length > 0;
    }
    if (typeof headNodes === 'object' && headNodes.id) {
        return nodes.filter(obj => headNodes.id === obj.id).length > 0;
    }
    if (Array.isArray(headNodes)) {
        return headNodes.reduce((acc, head) => acc && isValidHeadNodes(head), true);
    }    
    return false;
}

// Project essentials.
export default {
    settings: settings,

    playerOptions: playerOptions,

    addVariablesToCtx: function(ctx) {
        if (ctx.deepmerge) {
            // Backwards compatibility. We no longer export the playerOptions on the ctx like this way.
            // However, some projects may rely on the studioPlayerOptions being present in the onLoad and onInit hooks
            ctx.playerOptions = ctx.deepmerge(ctx.playerOptions, playerOptions);
        }
        return ctx;
    },

    onPlayerInit: function(ctx, developerApp) {
        player = ctx.player;

        // Get head from developer if exists
        let developerHead = developerApp.head;        

        // Some plugins are async and we need to wait for their promise
        // to resolve before continuing.
        let pluginsPromises = [];
        if (player.rtsPreview && player.rtsPreview.promise) {
            pluginsPromises.push(player.rtsPreview.promise);
        }

        return ctx.when.all(pluginsPromises).then(function() {
            // nodes
            player.repository.add(nodes);

            // decisions
            for (let node of nodes) {
                if (node.data && node.data.decision) {
                    player.decision.add(node.id);
                }
            }
            
            // Get head from developer if exists
            let devHeadPromise = ctx.when.promise((resolve) => {
                if (!developerHead) {
                    resolve(null);
                } else if (typeof developerHead === 'function') {
                    let devHead = developerHead(player, ctx);
                    // check if the function returned a promise
                    if (devHead && devHead.then) {
                        devHead
                            .then(res => { resolve(res); })
                            .catch(err => {
                                console.error(`Head promise rejected with an error ${err}.`);
                                resolve(null);
                            });
                    } else {
                        resolve(devHead);
                    }
                } else {
                    resolve(developerHead);
                }
            });

            return devHeadPromise.then(devHead => {
                // Validate this is legal node(s)
                if (devHead) {
                    if (!isValidHeadNodes(devHead)) {
                        console.error(`Illegal head node ${devHead}.`);
                    } else {
                        // Change the head according to the developer head
                        head = devHead;
                    }
                }

                // Allow overriding the head node using the querystring parameter "headnodeid"
                headNodeIdQP = window.InterludePlayer && 
                                    window.InterludePlayer.environment && 
                                    window.InterludePlayer.environment.queryParams &&
                                    window.InterludePlayer.environment.queryParams.headnodeid;                            

                if (headNodeIdQP && player.repository.has(headNodeIdQP)) {
                    head = headNodeIdQP;
                }

                // replayNode
                player.control.replayNode = head;

                // RtsPreviewPlugin mapping
                
                // UI
                player.ui.createFromConfig(ui);

                // Subtitles
                if (player.subtitles) {
                    const nodesWithSubtitles = Object.keys(subtitlesMap);
                    nodesWithSubtitles.forEach((nodeId) => {
                        player.subtitles.attach(nodeId, subtitlesMap[nodeId]);
                    })
                }

                // Add end node or overlay according end screen.
                if (player.end && !player.end.hasNode() && !player.end.hasOverlay()) {
                                            // Set end plugin with end screen overlay.
                        player.end.setOverlay('endscreenForEndPlugin');
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
                
                // Add notification if there are uncommitted changes in preview
                
                // Append head node to the playlist
                if (Array.isArray(head)) {
                    player.playlist.push.apply(player, head);
                } else {
                    player.append(head);
                }
            });
        });
    },

    // for backwards compatibility
    onStarted: function() {},
    onEnd: function() {},

    onLoad: function(ctx) {
        return ctx.when();
    },

    // New fastload-compatible hooks
    /////////////////////////////////

    loadIntroNodes: function(ctx) {
        player = ctx.player;

        // Allow overriding the head node using the querystring parameter "headnodeid"
        headNodeIdQP = window.InterludePlayer && 
            window.InterludePlayer.environment && 
            window.InterludePlayer.environment.queryParams &&
            window.InterludePlayer.environment.queryParams.headnodeid;

        // Create an associative map of intro nodes so it would be quick to filter
        introNodesMap = {};
        (ctx.introNodes || []).forEach(nodeId => {
            introNodesMap[nodeId] = true;
        });

        // Head node MUST always be included in intro nodes
        introNodesMap[head] = true;
        if (headNodeIdQP) {
            introNodesMap[headNodeIdQP] = true;
        }
        
        // Add intro nodes to the repository
        player.repository.add(nodes.filter(obj => introNodesMap[obj.id]));

        return ctx.when();
    },

    appendHead: function(ctx, developerApp) {
        let finalHead = head;
        // Get head from developer if exists
        let developerHead = developerApp.head;
        let devHeadPromise = ctx.when.promise((resolve) => {
            if (!developerHead) {
                resolve(null);
            } else if (typeof developerHead === 'function') {
                let devHead = developerHead(player, ctx);
                // check if the function returned a promise
                if (devHead && devHead.then) {
                    devHead
                        .then(res => { resolve(res); })
                        .catch(err => {
                            console.error(`Head promise rejected with an error ${err}.`);
                            resolve(null);
                        });
                } else {
                    resolve(devHead);
                }
            } else {
                resolve(developerHead);
            }
        });

        return devHeadPromise.then(devHead => {
            // Validate this is legal node(s)
            if (devHead) {
                if (!isValidHeadNodes(devHead)) {
                    console.error(`Illegal head node ${devHead}.`);
                } else {
                    // Normalize to array of ids
                    let devHeadIdsArray = Array.isArray(devHead) ? devHead : [devHead];
                    devHeadIdsArray = devHeadIdsArray.map(h => {
                        return typeof h === 'string' ? h : h.id;
                    });

                    // Check if head nodes already in repo, otherwise log error that it should be in intro nodes and don't override head 
                    let isDevHeadInRepo = devHeadIdsArray.reduce((acc, head) => acc && player.repository.has(head), true);
                    if (!isDevHeadInRepo) {
                        console.error('Possible head nodes should be included in introNodes.');
                    } else {
                        // Change the head according to the developer head
                        finalHead = devHead;
                    }
                }
            }

            // Change the head according to "headnodeid" query param
            if (headNodeIdQP && player.repository.has(headNodeIdQP)) {
                finalHead = headNodeIdQP;
            }

            // Append head node to the playlist
            if (Array.isArray(finalHead)) {
                player.playlist.push.apply(player, finalHead);
            } else {
                player.append(finalHead);
            }
            return finalHead;
        });
    },

    onIntroReady: function(ctx) {
        return ctx.when.promise((resolve) => {

            // Done at setTimeout to allow playback to start (in case autoplay is set)
            setTimeout(() => {
                // Add all other nodes to the repository
                player.repository.add(nodes.filter(obj => !introNodesMap[obj.id]));
    
                // Add decisions
                for (let node of nodes) {
                    if (node.data && node.data.decision) {
                        player.decision.add(node.id);
                    }
                }

                resolve();
            }, 0);
        });
    },
    loadApp: function(ctx) {
        // Some plugins are async and we need to wait for their promise
        // to resolve before continuing.
        let pluginsPromises = [];
        if (player.rtsPreview && player.rtsPreview.promise) {
            pluginsPromises.push(player.rtsPreview.promise);
        }

        return ctx.when.all(pluginsPromises).then(function() {

            // replayNode
            if (player.control) {
                player.control.replayNode = ctx.app.head;
            }

            // RtsPreviewPlugin mapping
            
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

            // Add end node or overlay according end screen.
            if (player.end && !player.end.hasNode() && !player.end.hasOverlay()) {
                                    // Set end plugin with end screen overlay.
                    player.end.setOverlay('endscreenForEndPlugin');
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
            
            // Add notification if there are uncommitted changes in preview
            
        });
    },
    introNodes: [head]
};
