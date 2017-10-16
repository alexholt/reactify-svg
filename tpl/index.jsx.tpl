@deps@
import registerServiceWorker from './registerServiceWorker';
import './index.css';

window.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<@rootComp@/>, document.querySelector('#root'));
  registerServiceWorker();
});
