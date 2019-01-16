import EkoUIComponents from 'EkoUIComponents';
import './FancyButton.scss';

export default class FancyButton extends EkoUIComponents.EkoDecisionButton {
    getContent() {
        return (
            <button className='btn btn-4'>
                <span>{super.getContent()}</span>
            </button>
        );
    }
}