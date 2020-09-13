import ivds from './auto_generated/ivds';
import nodes from './auto_generated/nodes';
import settings from '../config/settings.json';
import playerOptions from '../config/playerOptions.json';

let introNodesMap;
let head = 'node_beginning_2430df';
let introNodes = [head];
    
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

function addRestOfNodes(ctx, resolve) {
    let player = ctx.player;

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
}

function setEndScreen(ctx) {
    let player = ctx.player;
    if (player.end && !player.end.hasNode() && !player.end.hasOverlay()) {
                    // Set end plugin with end screen overlay.
            player.end.setOverlay('endscreenForEndPlugin');
            }
}

// Project essentials.
export default {
    settings: settings,

    playerOptions: playerOptions,

    onPreInit: function(ctx) {
        return ctx.when();
    },
    loadIntroNodes: function(ctx) {
        let player = ctx.player;

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
        if (Array.isArray(head)) {
            head.forEach(nodeId => {
                introNodesMap[nodeId] = true;
            });
        } else {
            introNodesMap[head] = true;
        }

        // Add queryparam head to intro nodes as well
        if (headNodeIdQP) {
            introNodesMap[headNodeIdQP] = true;
        }
        
        // Add intro nodes to the repository
        player.repository.add(nodes.filter(obj => introNodesMap[obj.id]));

        return ctx.when();
    },

    appendHead: function(ctx, developerApp) {
        let player = ctx.player;
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

    addRtsMappings: function(ctx) {
        let player = ctx.player;
        // RtsPreviewPlugin mapping
            },

    addListeners: function(ctx) {
        let player = ctx.player;
        ctx.intro.addDecisionsPromise = new Promise((resolve, reject) => {
            player.once('canplay', addRestOfNodes.bind(null, ctx, resolve));
        });
        // Register to onready to add end node or overlay according end screen.
        // We do this here and not in the app.js so we don't have to pack the ivds in both artifacts
        player.once('loader.onready', setEndScreen.bind(null, ctx));
    },

    introNodes
};
