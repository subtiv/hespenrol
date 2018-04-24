import React, { Component } from 'react';
import { Alert, Badge, Col, FormControl, Grid, Label, ProgressBar, Row, Tabs, Tab, Thumbnail } from 'react-bootstrap';
import EXIF from 'exif-js';
import rgbHex from 'rgb-hex';
import namer from 'color-namer';
import Geohash from 'latlon-geohash';

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
      geo: [],
      geoFilter: '',
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
      tab: 'colors',
      geoEnabled: false,
    };
    this.imgData = new Map();
    this.allHashes = [];
    this._connection = new Connection(this.state.renderSettings);
    this._handleColorFilterChange = this._handleColorFilterChange.bind(this);
    this._handleGeoFilterChange = this._handleGeoFilterChange.bind(this);
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
          let hex = '#' + rgbHex(cObj.red, cObj.green, cObj.blue);
          let colorObject = namer(hex, { pick: ['html']});
          return colorObject['html'][0];
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
        let hex = this.colorArrToHex(colorArr); 
        let cObj = namer(hex, { pick: ['html']});
        return cObj['html'][0];
      })
      this.setState({ 
        colors: hexColors,
        labels: data.label.average,
        fetching: false
      });
      this._calculateHashes();
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

  getDMS2DD(days, minutes, seconds, direction) {
    direction.toUpperCase();
    var dd = days + minutes/60 + seconds/(60*60);
    //alert(dd);
    if (direction == "S" || direction == "W") {
        dd = dd*-1;
    } // Don't do anything for N or E
    return dd;
  }

  _calculateHashes() {
    let counted = {};
    this.allHashes.forEach(hash => {
      counted[hash] = counted[hash] ? counted[hash] + 1 : 1;
    });
    console.log('HASHES', counted)
  }

  _handleColorFilterChange(e) {
    this.setState({ colorFilter: e.target.value });
  }

  _handleGeoFilterChange(e) {
    this.setState({ geoFilter: e.target.value });
  }

  _handleLabelFilterChange(e) {
    this.setState({ labelFilter: e.target.value });
  }

  _handleSelectTab(tab) {
    console.log('change tab', tab);
    this.setState({ tab : tab});
  }

  _getExifData(img, id) {
    let comp = this;
    let imgDatum = this.imgData.get(id);
    //console.log('getting image data', this.refs , id);
    if(img && !imgDatum.exifdata) {
      EXIF.getData(img, function() {
        imgDatum.exifdata = this.exifdata;
        console.log(this.exifdata);
        //Geo shizzle
        //Lat
        let latArr = this.exifdata.GPSLatitude;
        let latDir = this.exifdata.GPSLatitudeRef;
        let geoBool = false
        if(latArr) {
          let lat = comp.getDMS2DD(latArr[0], latArr[1], latArr[2], latDir);
          //Lon
          let lonArr = this.exifdata.GPSLongitude;
          let lonDir = this.exifdata.GPSLongitudeRef;
          let lon = comp.getDMS2DD(lonArr[0], lonArr[1], lonArr[2], lonDir);
          geoBool = true;
          let hash = Geohash.encode(lat, lon);
          comp.allHashes.push(hash.substr(0, 7));
          imgDatum.geo = [{
          position: {
            lat: lat,
            lon: lon,
          },
          hash: hash,
        }]
        }
        if(geoBool) {
          comp.setState({ geoEnabled: true});
        }
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
      } else {
        filter = this.state.geoFilter;
      }
      let passFilter = true;
      console.log('TYPE', type);
      if(!this.state.fetching) {
        passFilter = false;
        data = this.imgData.get(i);
        content = data[type].map(d => {
          //obj to string
          let toFilter = d;
          if(type == 'colors') {
            toFilter = d.name;
            if (toFilter.includes(filter)) {
              passFilter = true;
            }
            return (
              <h4><Label style={ this.state.tab === 'colors' ? { backgroundColor: `${d.hex}` } : null }>{d.name} - {d.hex}</Label></h4>
            )
          } else if (type == 'labels'){
            toFilter = d;
            if (toFilter.includes(filter)) {
              passFilter = true;
            }
            return (
              <h4><Label>{d}</Label></h4>
            )
          } else if (type === 'geo') {
            toFilter = d.hash;
            if (toFilter.includes(filter)) {
              passFilter = true;
            }
            return (
              <span>
                <h4>{d.position.lat}</h4>
                <h4>{d.position.lon}</h4>
                <h4 className='hash' >Geohash: <Label>{d.hash}</Label></h4>
              </span>
            )
          }
          
        });
      }
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
        <Label style={{ backgroundColor: `${color.hex}` }}>{color.name} - {color.hex}</Label>
      </h3>
    ));

    let labelList = this.state.labels.map((label, i) => (
      <h3 className='label-list label' key={`label${i}`}>
        <Label>{label}</Label>
      </h3>
    ));

    let geoList = this.state.geo.map((geo, i) => {
      <h3 className='label-list geo' key={`geo${i}`}>
        <Label>{geo.hash}</Label>
      </h3>
    })

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
            { this.state.geoEnabled ? (
              <Tab eventKey={'geo'} title="Geolocation">
              <h2>Most common:</h2>
              {geoList}
              <h2>Filter:</h2>
              <FormControl
                type="text"
                value={this.state.geoFilter}
                placeholder="123abcd"
                onChange={this._handleGeoFilterChange}
              />
             </Tab>
            ) : null}
            
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
