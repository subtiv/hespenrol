import { EventEmitter } from 'events';
import Socket from 'socket.io-client';
//import { FETCHING_INIT_HEATMAP } from '../actions';

const SOCKET_SERVER_URL = `/`;

class Connection extends EventEmitter {
  constructor(renderSettings) {
    super();
    this._socket = new Socket(SOCKET_SERVER_URL);
    //console.log(`Connecting socket to '${SOCKET_SERVER_URL}'`);
    this._retryMSec = 5000;
    this._renderSettings = renderSettings;
    //Setup connection
    this._socket.on('connect', () => {
      this.emit('CONNECTED');
      this._socket.emit('reload', this._renderSettings);
    });

    //Listening 
    this._socket.on('disconnect', () => {
      console.log('Disconnected from the log-event socketApi server');
      setTimeout(() => { this._socket = new Socket(SOCKET_SERVER_URL); }, this._retryMSec);
    });

    this._socket.on('connect_error', (err) => {
      console.error(`Error while connecting with the socket server at ${SOCKET_SERVER_URL}`, err);
      setTimeout(() => { this._socket = new Socket(SOCKET_SERVER_URL); }, this._retryMSec);
    });

    // Receiving events
    this._socket.on('img', (data) => {
      this.emit('images', data);
    });

    this._socket.on('inform', (data) => {
        this.emit('inform', data);
    })

    this._socket.on('parsed', (data) => {
        this.emit('parsed', data);
    })
  }

  //Sending
  sendAnswers(json) {
    console.log('answers send', json);
    this._socket.emit('/client/addAnswer', json);
  }

}

export default Connection;