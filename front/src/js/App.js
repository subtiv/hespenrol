import React, { Component } from 'react';
import { Alert, Badge, Col, FormControl, Grid, Label, ProgressBar, Row, Tabs, Tab, Thumbnail } from 'react-bootstrap';
import EXIF from 'exif-js';
import rgbHex from 'rgb-hex';

import Connection from './components/Connection';
import logo from '../assets/logo.svg';
import '../css/App.css';

class App extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      colors: [],
      colorFilter: '',
      images: [],
      labels: [],
      labelFilter: '',
      message: null,
      fetching: true,
      progress: 0,
      renderSettings: {
        minlabel: 0.6,
        minlabela: 0.9,
        mergecolors: 0.1,
        mixcolors: 0.5,
        iteratecolors: 10,
      },
      tab: 'colors'
    };
    this.imgData = new Map();
    this._connection = new Connection(this.state.renderSettings);
    this._handleColorFilterChange = this._handleColorFilterChange.bind(this);
    this._handleLabelFilterChange = this._handleLabelFilterChange.bind(this);
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

    //Input from google api
    this._connection.on('parsed', (data) => {
      console.log('e: PARSED, d:', data);
      //Individual
      //Color
      data.color.individual.forEach((imgColors, i) => {
        imgColors = imgColors.map(cObj => {
          return '#' + rgbHex(cObj.red, cObj.green, cObj.blue);
        });
        let imgDatum = this.imgData.get(i);
        imgDatum.colors = imgColors;
        this.imgData.set(i, imgDatum);
      })
      //Label
      data.label.individual.forEach((imgLabels, i) => {
        let imgDatum = this.imgData.get(i);
        imgDatum.labels = imgLabels;
        this.imgData.set(i, imgDatum);
      })

      //Average
      let hexColors = data.color.average.map(colorArr => {
        return this.colorArrToHex(colorArr);
      })
      this.setState({ 
        colors: hexColors,
        labels: data.label.average,
        fetching: false
      });
      console.log(this.state);
    });

    //Status update 
    this._connection.on('inform', (data) => {
      this.setState({
        message: data.msg,
        progress: data.progress
      })
    })
  };

  colorArrToHex(arr) {
    let mappedColorArr = arr.map(c => {
      return Math.floor(c*255);
    });
    return '#' + rgbHex(mappedColorArr[0], mappedColorArr[1], mappedColorArr[2]);
  };

  _handleColorFilterChange(e) {
    this.setState({ colorFilter: e.target.value });
  }

  _handleLabelFilterChange(e) {
    this.setState({ labelFilter: e.target.value });
  }

  _handleSelectTab(tab) {
    console.log('change tab', tab);
    this.setState({ tab : tab});
  }

  _getExifData(img, id) {
    let imgDatum = this.imgData.get(id);
    //console.log('getting image data', this.refs , id);
    if(img && !imgDatum.exifdata) {
      EXIF.getData(img, function() {
        imgDatum.exifdata = this.exifdata;
        console.log(this.exifdata);
      });
    }
    this.imgData.set(id, imgDatum);
    console.log(this.imgData);
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
    let renderImages = this.state.images.map((img, i) => {
      let content, data, filter = null;
      let type = this.state.tab;
      //lets go ugly
      if (type == 'colors') {
        filter = this.state.colorFilter;
      } else if (type == 'labels') {
        filter = this.state.labelFilter;
      }
      let passFilter = true;
      if(!this.state.fetching) {
        passFilter = false;
        data = this.imgData.get(i);
        content = data[type].map(d => {
          if (d.includes(filter)) {
            passFilter = true;
          }
          return (
            <h4><Label style={ this.state.tab === 'colors' ? { backgroundColor: `${d}` } : null }>{d}</Label></h4>
          )
          });
      }
      console.log(content);
      if (passFilter) {
        return (
          <Col className='thumbnail' key={`imgage_${i}`} xs={6} md={4}>
            <img  ref={`img_${i}`} src={`${img.url}`} alt={`${img}_${i}`} onLoad={this._getExifData(this.refs[`img_${i}`], img.id)}/>
            <div className='img-content'>{content}</div>
          </Col>
        ) 
      } else {
        return null;
      }
    });

    let colorList = this.state.colors.map((color, i) => (
      <h3 className='label-list color' key={`color_${i}`}>
        <Label style={{ backgroundColor: `${color}` }}>{color}</Label>
      </h3>
    ));

    let labelList = this.state.labels.map((label, i) => (
      <h3 className='label-list label' key={`label${i}`}>
        <Label>{label}</Label>
      </h3>
    ));

    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          { this.state.message ? <h3> {this.state.message} </h3>: null}
          <ProgressBar striped bsStyle="info" now={this.state.progress} />
          <Tabs activeKey={this.state.tab} onSelect={this._handleSelectTab} id="controlled-tab">
            <Tab eventKey={'colors'} title="Color">
              <h2>Most common:</h2>
              {colorList}
              <h2>Filter:</h2>
              <FormControl
                type="text"
                value={this.state.colorFilter}
                placeholder="#AAEEFF"
                onChange={this._handleColorFilterChange}
              />
            </Tab>
            <Tab eventKey={'labels'} title="Labels">
              <h2>Most common:</h2>
              {labelList}
              <h2>Filter:</h2>
              <FormControl
                type="text"
                value={this.state.labelFilter}
                placeholder="hespenrol"
                onChange={this._handleLabelFilterChange}
              />
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
