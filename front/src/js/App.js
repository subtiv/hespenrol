import React, { Component } from 'react';
import { Alert, Badge, Col, Grid, Label, Row, Tabs, Tab, Thumbnail } from 'react-bootstrap';
import EXIF from 'exif-js';
import Connection from './components/Connection';
import logo from '../assets/logo.svg';
import '../css/App.css';

class App extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      colors: [],
      images: [],
      labels: [],
      message: null,
      fetching: true,
      renderSettings: {
        minlabel: 0.6,
        minlabela: 0.9,
        mergecolors: 0.1,
        mixcolors: 0.5,
        iteratecolors: 10,
      },
      tab: 'color'
    };
    this.imgData = new Map();
    this._connection = new Connection(this.state.renderSettings);
    this._handleSelectTab = this._handleSelectTab.bind(this);
    this._getExifData = this._getExifData.bind(this);
    this._createListeners();
  }

  _createListeners() {
    this._connection.on('images', (images) => {
      //clean map
      console.log('e: IMAGES, d: ', images);
      images = images.map((img, i) => {
        //images for data
        this.imgData.set(i, { url: img });
        //images for render 
        return {
          url: img,
          id: i
        }
      });
      this.setState({ images: images});
      console.log('IMAGE DATA', this.imgData);
    });

    this._connection.on('parsed', (data) => {
      console.log('e: PARSED, d:', data);
      this.setState({ 
        colors: data.color.average,
        labels: data.label.average
      });
      console.log(this.state);
    });

    this._connection.on('inform', (data) => {
      let msg = data.msg
      this.setState({message: msg})
    })
  }

  _handleSelectTab(tab) {
    console.log('change tab', tab);
    this.setState({ tab : tab});
  }

  _getExifData(img, id) {
    let imgDatum = this.imgData.get(id);
    if(img && !imgDatum.exifdata) {
      EXIF.getData(img, function() {
        imgDatum.exifdata = this.exifdata;
        console.log(this.exifdata);
      });
    }
    this.imgData.set(id, imgDatum);
  }

  componentDidMount() {
    /*
    fetch('/api')
      .then(response => {
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        return response.json();
      })
      .then(json => {
        this.setState({
          message: json.message,
          fetching: false
        });
      }).catch(e => {
        this.setState({
          message: `API call failed: ${e}`,
          fetching: false
        });
      })
      */
  }

  render() {
    let renderImages = this.state.images.map((img, i) => (
      <Col key={`imgage_${i}`} xs={6} md={4}>
        <Thumbnail  ref={`img_${i}`} src={`${img.url}`} alt={`${img}_${i}`} onLoad={this._getExifData(this.refs[`img_${i}`], img.id)}>
          <p>test</p>
        </Thumbnail>
      </Col>
    ));

    let colorList = this.state.colors.map((color, i) => (
      <h3>
        <Label style={{ backgroundColor: `${color}` }}>{color}</Label>
      </h3>
    ));
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          { this.state.message ? <Alert bsStyle='info'> {this.state.message} </Alert>: null}
          <Tabs activeKey={this.state.tab} onSelect={this._handleSelectTab} id="controlled-tab">
            <Tab eventKey={'color'} title="Color">
              {colorList}
            </Tab>
            <Tab eventKey={'label'} title="Labels">
              Tab 2 content
            </Tab>
            <Tab eventKey={'geolocation'} title="Geolocation">
            </Tab>
          </Tabs>
        </div>
        <p className="App-intro">
         
        </p>
        <Grid>
          <Row>
            {renderImages}
          </Row>
        </Grid>
      </div>
    );
  }
}

export default App;
