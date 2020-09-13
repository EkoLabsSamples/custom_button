import FancyButton from './components/FancyButton/FancyButton';

export default {
    onReady: function (player, ctx) {
        player.ui.override(/button_beginning_.*/, FancyButton);
    }
};