import playerOptions from '../config/playerOptions.json';
import FancyButton from './components/FancyButton/FancyButton';

export default {
    onLoad: function(ctx) { },

    onInit: function(player, ctx) {
        // regex that catches all buttons in the 'Beginning' node
        player.ui.override(/button_beginning_.*/, FancyButton);
    },

    playerOptions
};
