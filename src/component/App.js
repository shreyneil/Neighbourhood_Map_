import React, { Component } from 'react';
import '../App.css';
import ListView from './ListView'
import scriptLoader from 'react-async-script-loader';
import {createFilter} from 'react-search-input';
import { mapStyles } from '../mapStyles.js';

var markers = [];
var infoWindows = [];
var lastOpened;

class App extends Component {
  constructor(props) {
    super(props);
    this.loadMarkers = this.loadMarkers.bind(this);
    this.state = {
      markers: [],
      infoWindows: [],
      places: [],
      map: {},
      query: '',
      requestWasSuccessful: true
    }
  }
  
  componentWillReceiveProps({isScriptLoadSucceed}){
    if (isScriptLoadSucceed) {
      // initiating the map and giving it to the loadMarkers function.
      var map = new window.google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: new window.google.maps.LatLng(40.762026,-73.984096),
        styles: mapStyles
      });
      this.setState({map});
      this.loadMarkers(map)
    }
    else {
      console.log("google maps API couldn't load.");
      this.setState({requestWasSuccessful: false})
    }
  }
  
  // this function takes in the map object and then sends a CORS request to the
  // foursquares API to find the neariest museums and added the markers and
  // inforwindows to the markers
  loadMarkers(map) {
    var CORSRequest = this.createCORSRequest('GET',"https://api.foursquare.com/v2/venues/search?ll=40.762026,-73.984096&query=museum&radius=2500&categoryId=4bf58dd8d48988d181941735&client_id=CFSMRM4YK0LMFIZIOO1ETN50A1TXPJENSO3EUOIEBXK3E5ER&client_secret=YJQZ5FTKIA5UHUDU2BNACLRW14WZBDQLOO0KIWNSBUC2QN4V&v=20201215&limit=50");
    CORSRequest.onload = () => {
      
      let response = JSON.parse(CORSRequest.responseText);
      console.log(response.meta);
      if(response.meta.code === 200) {
        this.setState({ places: JSON.parse(CORSRequest.responseText).response.venues.filter(createFilter(this.state.query, ['name', 'location.address']))});
        markers.forEach(m => { m.setMap(null) });
        // Clearing the markers and the infoWindows arrays so that the old
        // objects wouldn't be stacked below the new objects.
        markers = [];
        infoWindows = [];
        this.state.places.map(place => {
          console.log(place);
          var contentString =
          `<div class="infoWindow">
          <h1>${place.name}</h1>
          <h2>${place.location.address ? place.location.address : place.location.formattedAddress[0]}</h2>
          <h3>${place.contact ? (place.contact.formattedPhone ? place.contact.formattedPhone : "phone number not available") : 'Phone number not available'}</h3>
          <p>${place.stats ? place.stats.checkinsCount : "Stats not available"} people have been here.</p>
          ${place.url ? "<a href=" + place.url + ">Go to official website</a>" : ""}
          </div>`
          
          var infoWindow= new window.google.maps.InfoWindow({
            content: contentString,
            name: place.name
          });
          var marker = new window.google.maps.Marker({
            map: map,
            position: place.location,
            animation: window.google.maps.Animation.DROP,
            name : place.name
          });
          marker.addListener('click', function() {
            infoWindows.map((iw) => {
              iw.close();
            })
            infoWindow.open(map, marker);
            if (marker.getAnimation() !== null) {
              marker.setAnimation(null);
            } else {
              marker.setAnimation(window.google.maps.Animation.BOUNCE);
              setTimeout(() => {marker.setAnimation(null);}, 300)
            }
          });
          
          markers.push(marker);
          
          infoWindows.push(infoWindow);
          this.setState({markers})
          this.setState({infoWindows})
        })
      }
      else {
        document.write(response.meta.errorDetail);
      }
    };
    CORSRequest.onerror = () => {
      this.setState({requestWasSuccessful: false});
    }
    CORSRequest.send();
  }
  
  // Used the tutorial in https://www.html5rocks.com/en/tutorials/cors/ to create a CORS request function.
  createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
      // Check if the XMLHttpRequest object has a "withCredentials" property.
      // "withCredentials" only exists on XMLHTTPRequest2 objects.
      xhr.open(method, url, true);
    } else if (typeof XDomainRequest !== "undefined") {
      // Otherwise, check if XDomainRequest.
      // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
      xhr = new XDomainRequest();
      xhr.open(method, url);
      
    } else {
      // Otherwise, alert the user that CORS is not supported by their browser.
      xhr = null;
      alert("CORS Requests are not supported by your browser please switch to another browser to have access to the website.");
    }
    return xhr;
  }
  
  // queryHandler takes the query from the ListView sets the state and reloads the markers.
  queryHandler(query) {
    this.setState({query});
    this.loadMarkers(this.state.map);
  }
  
  
  render() {
    const {map, places, requestWasSuccessful} = this.state;
    
    return (
      requestWasSuccessful ? (
        <div id="container">
        <div id="map-container" role="application" tabIndex="-1">
        <div id="map" role="application"></div>
        </div>
        <ListView
        places={places}
        settingQuery={(query) => {this.queryHandler(query)}}
        markers={markers}
        infoWindows={infoWindows}
        map={map}/>
        </div>
      ) : (
        <div>
        <h1>loading map's api was unsuccessful. please try again later</h1>
        </div>
      )
    )
  }
}

// Using react-async-script-loader to laod the google maps and google places API.
export default scriptLoader(
  [`https://maps.googleapis.com/maps/api/js?key=AIzaSyD_IeWHOd2g_nP9hz6o2ZdgHTVtfYinxZk&libraries=places`]
)(App);
