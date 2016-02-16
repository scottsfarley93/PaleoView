/**
 * @author Scott Farley
 */


var tutorial = function(){
	console.log("Running tutorial.js");
	//create a map
	var map = L.map('map').setView([37.82, -122.2], 9);
	//add some tiles
	var mapTiles = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}.{ext}', {
		attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		subdomains: 'abcd',
		minZoom: 4,
		maxZoom: 18,
		ext: 'png',
		bounds: [[22, -132], [70, -56]]
	}); // this creates the tileset instance
	mapTiles.addTo(map) //this adds it to the map
	
	//add a marker
	marker = L.marker([37.862858, -122.259712]).addTo(map) // this creates the marker and adds it to the map
	//add a circle on top of the map
	//how is the radius calculated?
	var circle = L.circle([37.82, -122.2], 500, {
	    color: 'red',
	    fillColor: 'green',
	    fillOpacity: 1
	}).addTo(map); //this creates the circle and adds it to the map
	
	
	//add an arbitrary polygon
	var polygon = L.polygon([
	    [51.509, -0.08],
	    [51.503, -0.06],
	    [51.51, -0.047]
	]).addTo(map); //this creates the polygon and adds it to the map
	
	//add popups on click
	marker.bindPopup("<b>Hello world!</b><br>I used to live here! <br /> 2410 Parker Street").openPopup();
	circle.bindPopup("I am just a circle.");
	polygon.bindPopup("I am just a polygon.");
	
	//this popup opens automatically and is not on a marker
	var popup = L.popup()
	    .setLatLng([37.8, -122])
	    .setContent("I am a standalone popup.")
	    .openOn(map);
	
	
	//add some click events
	function onMapClick(e) {
	    alert("You clicked the map at " + e.latlng);
	}
	
	map.on('click', onMapClick); //fire onMapClick on a click event
	
	//this opens a popup at the point clicked
	var popup = L.popup(); //creates an empty popup

	function onMapClick(e) { //on a map click
	    popup //set some stuff for the popup
	        .setLatLng(e.latlng) //set the location
	        .setContent("You clicked the map at " + e.latlng.toString()) //set the text/content
	        .openOn(map); //open it
	}
	
	map.on('click', onMapClick);
	
	//start the geojson tutorial
	//a basic geojson object
	var geojsonFeature = {
	    "type": "Feature",
	    "properties": {
	        "name": "Coors Field",
	        "amenity": "Baseball Stadium",
	        "popupContent": "This is where the Rockies play!"
	    },
	    "geometry": {
	        "type": "Point",
	        "coordinates": [-104.99404, 39.75621]
	    }
	};
	//add it to a map
	L.geoJson(geojsonFeature).addTo(map);
	
	//lines as an array of geojson objects
	var myLines = [{
	    "type": "LineString",
	    "coordinates": [[-100, 40], [-105, 45], [-110, 55]]
	}, {
	    "type": "LineString",
	    "coordinates": [[-105, 40], [-110, 45], [-115, 55]]
	}];
	
	//create an empty geojson layer, and then populate it as data becomes available
	var myLayer = L.geoJson().addTo(map);
	myLayer.addData(geojsonFeature);
	

	//this styles the lines generically for all lines
	var myStyle = {
	    "color": "#ff7800",
	    "weight": 5,
	    "opacity": 0.65
	};
	
	L.geoJson(myLines, {
	    style: myStyle
	}).addTo(map);
	
	//this styles the line based on a property of the geojson object
	var states = [{
	    "type": "Feature",
	    "properties": {"party": "Republican"},
	    "geometry": {
	        "type": "Polygon",
	        "coordinates": [[
	            [-104.05, 48.99],
	            [-97.22,  48.98],
	            [-96.58,  45.94],
	            [-104.03, 45.94],
	            [-104.05, 48.99]
	        ]]
	    }
	}, {
	    "type": "Feature",
	    "properties": {"party": "Democrat"},
	    "geometry": {
	        "type": "Polygon",
	        "coordinates": [[
	            [-109.05, 41.00],
	            [-102.06, 40.99],
	            [-102.03, 36.99],
	            [-109.04, 36.99],
	            [-109.05, 41.00]
	        ]]
	    }
	}];
	
	L.geoJson(states, {
	    style: function(feature) {
	        switch (feature.properties.party) {
	            case 'Republican': return {color: "#ff0000"};
	            case 'Democrat':   return {color: "#0000ff"};
	        }
	    }
	}).addTo(map);
	
	//onEach --> add popups as they are added to the map
	function onEachFeature(feature, layer) {
	    // does this feature have a property named popupContent?
	    if (feature.properties && feature.properties.popupContent) {
	        layer.bindPopup(feature.properties.popupContent); //if it does, give it a popup
	    }
	}
	
	var geojsonFeature = {
	    "type": "Feature",
	    "properties": {
	        "name": "Coors Field",
	        "amenity": "Baseball Stadium",
	        "popupContent": "This is where the Rockies play!"
	    },
	    "geometry": {
	        "type": "Point",
	        "coordinates": [-122, 37 ]
	    }
	};
	
	L.geoJson(geojsonFeature, {
	    onEachFeature: onEachFeature //add the popups
	}).addTo(map);
	
	//use the filter method to not add certain elements of the returned geojson
	var someFeatures = [{
	    "type": "Feature",
	    "properties": {
	        "name": "Coors Field",
	        "show_on_map": true //boolean to determine whether or not to add to map
	    },
	    "geometry": {
	        "type": "Point",
	        "coordinates": [-104.99404, 39.75621]
	    }
	}, {
	    "type": "Feature",
	    "properties": {
	        "name": "Busch Field",
	        "show_on_map": false
	    },
	    "geometry": {
	        "type": "Point",
	        "coordinates": [-104.98404, 39.74621]
	    }
	}];
	
	L.geoJson(someFeatures, {
	    filter: function(feature, layer) {
	        return feature.properties.show_on_map; // check if we should add it to the map
	    }
	}).addTo(map);
	
	
}


